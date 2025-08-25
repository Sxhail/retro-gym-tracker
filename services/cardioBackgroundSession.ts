import { db } from '../db/client';
import {
  active_cardio_sessions,
  active_cardio_notifications,
  cardio_sessions,
  type ActiveCardioSession,
  type NewActiveCardioSession,
  type ActiveCardioNotification,
  type NewActiveCardioNotification,
} from '../db/schema';
import { eq } from 'drizzle-orm';
import NotificationService from './notifications';
import * as Notifications from 'expo-notifications';

export type CardioMode = 'hiit' | 'walk_run';

export type HiitParams = {
  workSec: number;
  restSec: number;
  rounds: number;
  includeTrailingRest?: boolean;
};

export type WalkRunParams = {
  runSec: number;
  walkSec: number;
  laps: number;
  includeTrailingWalk?: boolean;
};

export type CardioParams = HiitParams | WalkRunParams;

export type CardioPhase = 'work' | 'rest' | 'run' | 'walk' | 'completed' | 'idle';

export type ScheduleEntry = {
  phase: CardioPhase;
  startAt: string; // ISO UTC
  endAt: string; // ISO UTC
  cycleIndex: number; // round or lap index (0-based)
  label?: string; // e.g., "Work ➜ Rest"
};

export interface CardioSnapshot {
  sessionId: string;
  mode: CardioMode;
  params: CardioParams;
  startedAt: string; // ISO
  phaseIndex: number;
  cycleIndex: number;
  phaseStartedAt: string;
  phaseWillEndAt: string;
  pausedAt: string | null;
  accumulatedPauseMs: number;
  schedule: ScheduleEntry[];
  isCompleted: boolean;
}

class CardioBackgroundSessionService {
  // Prevent overlapping scheduling for the same session to avoid duplicate notifications
  private schedulingLocks = new Set<string>();
  // Upsert active session snapshot
  async saveActiveSession(s: CardioSnapshot): Promise<void> {
    const record: NewActiveCardioSession = {
      session_id: s.sessionId,
      mode: s.mode,
      params_json: JSON.stringify(s.params),
      started_at: s.startedAt,
      phase_index: s.phaseIndex,
      cycle_index: s.cycleIndex,
      phase_started_at: s.phaseStartedAt,
      phase_will_end_at: s.phaseWillEndAt,
      paused_at: s.pausedAt ?? null,
      accumulated_pause_ms: s.accumulatedPauseMs,
      schedule_json: JSON.stringify(s.schedule),
      is_completed: s.isCompleted ? 1 : 0,
      last_updated: new Date().toISOString(),
      created_at: new Date().toISOString(),
    } as any;

    const existing = await db
      .select()
      .from(active_cardio_sessions)
      .where(eq(active_cardio_sessions.session_id, s.sessionId))
      .limit(1);

    if (existing.length) {
      await db
        .update(active_cardio_sessions)
        .set(record)
        .where(eq(active_cardio_sessions.session_id, s.sessionId));
    } else {
      await db.insert(active_cardio_sessions).values(record);
    }
  }

  // Load the single active cardio session (if any)
  async restoreActiveSession(): Promise<CardioSnapshot | null> {
    const rows = await db.select().from(active_cardio_sessions).limit(1);
    if (!rows.length) return null;
    const r = rows[0] as ActiveCardioSession;
    return {
      sessionId: r.session_id,
      mode: (r.mode as CardioMode),
      params: JSON.parse(r.params_json) as CardioParams,
      startedAt: r.started_at,
      phaseIndex: r.phase_index,
      cycleIndex: r.cycle_index,
      phaseStartedAt: r.phase_started_at,
      phaseWillEndAt: r.phase_will_end_at,
      pausedAt: (r.paused_at as string | null) ?? null,
      accumulatedPauseMs: r.accumulated_pause_ms,
      schedule: JSON.parse(r.schedule_json) as ScheduleEntry[],
      isCompleted: r.is_completed === 1,
    };
  }

  // Persist notification IDs for a session
  async saveNotificationId(sessionId: string, notificationId: string, fireAt: string) {
    const rec: NewActiveCardioNotification = {
      session_id: sessionId,
      notification_id: notificationId,
      fire_at: fireAt,
    } as any;
    await db.insert(active_cardio_notifications).values(rec);
  }

  // Cancel and clear all notifications for a session (works after restarts)
  async cancelAllNotifications(sessionId: string): Promise<void> {
    try {
      // Cancel using persisted IDs (works even if NotificationService lost in-memory map)
      const rows = await db
        .select()
        .from(active_cardio_notifications)
        .where(eq(active_cardio_notifications.session_id, sessionId));

      for (const row of rows as ActiveCardioNotification[]) {
        try {
          await Notifications.cancelScheduledNotificationAsync(row.notification_id);
        } catch {}
      }

      // Also clear NotificationService in-memory mapping if present
      try {
        await NotificationService.cancelAllForSession(sessionId);
      } catch {}

      // Remove records
      await db
        .delete(active_cardio_notifications)
        .where(eq(active_cardio_notifications.session_id, sessionId));
    } catch (e) {
      console.warn('Failed to cancel cardio notifications', e);
    }
  }

  // Schedule notifications from a schedule and persist their IDs
  async scheduleNotifications(sessionId: string, schedule: ScheduleEntry[]): Promise<void> {
    if (this.schedulingLocks.has(sessionId)) return; // drop concurrent calls
    this.schedulingLocks.add(sessionId);
    try {
      // Clear any previously queued notifications atomically for this session
      await this.cancelAllNotifications(sessionId);

      const now = Date.now();
      // Exclude the synthetic 'completed' marker from iteration; we will handle completion explicitly
      const realPhases = schedule.filter((e) => e.phase !== 'completed');
      for (let i = 0; i < realPhases.length; i++) {
        const entry = realPhases[i];
        const fire = new Date(entry.endAt);
        if (fire.getTime() <= now) continue;

        // Determine if this is the last real phase
        const isLast = i === realPhases.length - 1;
        let title: string;
        let body: string;
        if (isLast) {
          title = 'Workout complete';
          body = 'Great job!';
        } else {
          const nextLabel = this.getNextPhaseLabel(entry.phase);
          title = nextLabel.title;
          body = nextLabel.body(entry);
        }

        const id = await NotificationService.scheduleAbsolute(sessionId, fire, title, body);
        if (id) {
          await this.saveNotificationId(sessionId, id, fire.toISOString());
        }
        // Note: Removed 3-2-1 pre-cues to ensure only one notification per phase
      }
    } finally {
      this.schedulingLocks.delete(sessionId);
    }
  }

  private getNextPhaseLabel(phase: CardioPhase): { title: string; body: (e: ScheduleEntry) => string } {
    switch (phase) {
      case 'work':
        return { title: 'Work → Rest', body: (e) => `Round ${e.cycleIndex + 1} complete. Rest starts.` };
      case 'rest':
        return { title: 'Rest → Work', body: (e) => `Round ${e.cycleIndex + 1} rest over. Work starts.` };
      case 'run':
        return { title: 'Run → Walk', body: (e) => `Lap ${e.cycleIndex + 1} run over. Walk starts.` };
      case 'walk':
        return { title: 'Walk → Run', body: (e) => `Lap ${e.cycleIndex + 1} walk over. Run starts.` };
      case 'completed':
        return { title: 'Workout complete', body: () => 'Great job!' };
      default:
        return { title: 'Phase complete', body: () => '' };
    }
  }

  // Clear all active data
  async clearActiveSession(sessionId: string): Promise<void> {
    await this.cancelAllNotifications(sessionId);
    await db
      .delete(active_cardio_sessions)
      .where(eq(active_cardio_sessions.session_id, sessionId));
  }

  // Persist a completed/ended cardio session into history table
  async saveHistoricalFromSnapshot(s: CardioSnapshot, endedEarly: boolean = false): Promise<void> {
    try {
      // Compute duration excluding pauses; include any active pause time if finishing while paused
      const startMs = new Date(s.startedAt).getTime();
      const endMs = Date.now();
      const raw = Math.max(0, endMs - startMs);
      const extraPause = s.pausedAt ? Math.max(0, endMs - new Date(s.pausedAt).getTime()) : 0;
      const totalPauseMs = Math.max(0, (s.accumulatedPauseMs || 0) + extraPause);
      const effectiveMs = Math.max(0, raw - totalPauseMs);
      const durationSec = Math.round(effectiveMs / 1000);

      // Determine completed rounds/laps based on current phase/cycle
      let completedCount = 0;
      if (s.mode === 'hiit') {
        // Completed round is counted when a 'work' phase finishes; if currently in 'rest', the round is completed
        const current = s.schedule[Math.min(s.phaseIndex, s.schedule.length - 1)];
        if (current?.phase === 'completed') {
          completedCount = (s.params as HiitParams).rounds;
        } else if (current?.phase === 'rest') {
          completedCount = current.cycleIndex + 1;
        } else {
          completedCount = current?.cycleIndex ?? 0; // in 'work', round not finished yet
        }
      } else {
        // Walk–Run: a lap is complete after 'walk' finishes; if trailing walk excluded, completion occurs at final 'run' end
        const current = s.schedule[Math.min(s.phaseIndex, s.schedule.length - 1)];
        const plannedLaps = (s.params as WalkRunParams).laps;
        if (current?.phase === 'completed') {
          completedCount = plannedLaps;
        } else if (current?.phase === 'walk') {
          completedCount = current.cycleIndex + 1;
        } else {
          completedCount = current?.cycleIndex ?? 0; // in 'run', lap not finished yet
        }
      }

      // Basic fields (store actual start time in 'date')
      const base = {
        type: s.mode === 'hiit' ? 'hiit' : 'walk_run',
        name: s.mode === 'hiit' ? 'Quick HIIT' : 'Walk–Run',
        date: s.startedAt,
        duration: durationSec,
        calories_burned: 0,
        notes: (() => {
          const parts = [] as string[];
          if (endedEarly) parts.push('Ended early');
          parts.push(`pauseMs=${totalPauseMs}`);
          parts.push(`endAt=${new Date(endMs).toISOString()}`);
          parts.push(`completed=${completedCount}`);
          return parts.join(' | ');
        })(),
      } as any;

      // Mode-specific mappings; store completed rounds/laps
      if (s.mode === 'hiit') {
        const p = s.params as HiitParams;
        await db.insert(cardio_sessions).values({
          ...base,
          work_time: p.workSec,
          rest_time: p.restSec,
          rounds: completedCount,
        } as any);
      } else {
        const p = s.params as WalkRunParams;
        await db.insert(cardio_sessions).values({
          ...base,
          run_time: p.runSec,
          walk_time: p.walkSec,
          laps: completedCount,
        } as any);
      }
    } catch (e) {
      console.warn('Failed to save historical cardio session', e);
    }
  }
}

export const cardioBackgroundSessionService = new CardioBackgroundSessionService();
