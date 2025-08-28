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
import IOSLocalNotifications from './iosNotifications';

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
    // Fetch all and pick the most recently updated to avoid reviving stale rows
    const rows = (await db.select().from(active_cardio_sessions)) as ActiveCardioSession[];
    if (!rows.length) return null;
    const latest = rows.reduce((acc, cur) => {
      const a = new Date((acc as any).last_updated || acc.started_at).getTime();
      const b = new Date((cur as any).last_updated || cur.started_at).getTime();
      return b > a ? cur : acc;
    });
    const r = latest as ActiveCardioSession;
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

  // List all active cardio sessions (may include stale rows if app crashed earlier)
  async listActiveSessions(): Promise<CardioSnapshot[]> {
    const rows = (await db.select().from(active_cardio_sessions)) as ActiveCardioSession[];
    return rows.map((r) => ({
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
    }));
  }

  // Cancel and clear all notifications for a session
  async cancelAllNotifications(sessionId: string): Promise<void> {
    try {
      console.log(`[CardioBackgroundSession] Cancelling all notifications for session ${sessionId}`);
      
      // First: Cancel session-specific notifications
      await IOSLocalNotifications.cancelAllForSession(sessionId);
      
      // Second: Aggressively cancel ALL cardio notifications (safety net)
      await IOSLocalNotifications.cancelAllCardio();
      
      // Third: Cancel all pending notifications (nuclear option)
      await IOSLocalNotifications.cancelAllPending();
      
      // Best-effort: clear any persisted rows if they exist from previous versions
      try {
        await db
          .delete(active_cardio_notifications)
          .where(eq(active_cardio_notifications.session_id, sessionId));
      } catch (error) {
        console.warn('Failed to clear notification records from database:', error);
      }
    } catch (error) {
      console.warn('Failed to cancel notifications:', error);
    }
  }

  // Cancel notifications and immediately reschedule them (useful for session changes)
  async rescheduleNotifications(sessionId: string, schedule: ScheduleEntry[]): Promise<void> {
    console.log(`[CardioBackgroundSession] Rescheduling notifications for session ${sessionId}`);
    
    // Cancel existing notifications first
    await this.cancelAllNotifications(sessionId);
    
    // Small delay to ensure cancellation is processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Schedule new notifications
    await this.scheduleNotifications(sessionId, schedule);
  }

  // Handle session state changes (pause, resume, skip, etc.)
  async handleSessionStateChange(sessionId: string, changeType: 'pause' | 'resume' | 'skip' | 'modify' | 'cancel' | 'complete', schedule?: ScheduleEntry[]): Promise<void> {
    console.log(`[CardioBackgroundSession] Handling session state change: ${changeType} for session ${sessionId}`);
    
    switch (changeType) {
      case 'pause':
        // Cancel all notifications when pausing
        await this.cancelAllNotifications(sessionId);
        break;
        
      case 'resume':
      case 'skip':
      case 'modify':
        // Reschedule all notifications with updated schedule
        if (schedule) {
          await this.rescheduleNotifications(sessionId, schedule);
        }
        break;
        
      case 'cancel':
      case 'complete':
        // Cancel all notifications when session ends
        await this.cancelAllNotifications(sessionId);
        break;
        
      default:
        console.warn(`Unknown session state change type: ${changeType}`);
    }
  }

  // Schedule notifications from a schedule and persist their IDs
  async scheduleNotifications(sessionId: string, schedule: ScheduleEntry[]): Promise<void> {
    try {
      await this.cancelAllNotifications(sessionId);
      const now = Date.now();
      
      for (const entry of schedule) {
        const fireAt = new Date(entry.endAt).getTime();
        if (fireAt > now + 1000) {
          const { title, body } = this.getNotificationContent(entry, false, sessionId);
          await IOSLocalNotifications.scheduleAbsolute(sessionId, new Date(fireAt), title, body);
        }
      }
    } catch (error) {}
  }

  // Get notification content with clear, descriptive messages
  private getNotificationContent(entry: ScheduleEntry, isLast: boolean, sessionId: string): { title: string; body: string } {
    if (entry.phase === 'completed') {
      const isHiit = sessionId.includes('hiit') || entry.cycleIndex >= 0; // determine from context
      return {
        title: isHiit ? 'HIIT FINISHED' : 'WALK-RUN FINISHED',
        body: isHiit ? 'Your HIIT session is complete' : 'Your walk-run session is complete'
      };
    }

    if (isLast) {
      // This is the last phase before completion
      const isHiit = entry.phase === 'work' || entry.phase === 'rest';
      return {
        title: isHiit ? 'HIIT FINISHED' : 'WALK-RUN FINISHED',
        body: isHiit ? 'Your HIIT session is complete' : 'Your walk-run session is complete'
      };
    }

    const nextLabel = this.getNextPhaseLabel(entry.phase);
    return {
      title: nextLabel.title,
      body: nextLabel.body(entry)
    };
  }

  private getNextPhaseLabel(phase: CardioPhase): { title: string; body: (e: ScheduleEntry) => string } {
    switch (phase) {
      case 'work':
        // HIIT: Work phase finished → time to rest
        return { 
          title: 'WORK COMPLETE', 
          body: (e: ScheduleEntry) => `Round ${e.cycleIndex + 1} finished. Time to rest` 
        };
      case 'rest':
        // HIIT: Rest finished → time to work
        return { 
          title: 'REST OVER', 
          body: (e: ScheduleEntry) => `Round ${e.cycleIndex + 1} rest done. Get ready to work` 
        };
      case 'run':
        // Walk/Run: Run finished → start walking
        return { 
          title: 'RUN COMPLETE', 
          body: (e: ScheduleEntry) => `Lap ${e.cycleIndex + 1} run done. Switch to walking` 
        };
      case 'walk':
        // Walk/Run: Walk finished → start running
        return { 
          title: 'WALK COMPLETE', 
          body: (e: ScheduleEntry) => `Lap ${e.cycleIndex + 1} walk done. Time to run` 
        };
      case 'completed':
        return { 
          title: 'SESSION FINISHED', 
          body: () => 'Your cardio workout is complete' 
        };
      default:
        return { 
          title: 'PHASE COMPLETE', 
          body: () => 'Ready for next phase' 
        };
    }
  }

  // Clear all active data
  async clearActiveSession(sessionId: string): Promise<void> {
  await this.cancelAllNotifications(sessionId);
  await IOSLocalNotifications.cancelAllCardio();
    await db
      .delete(active_cardio_sessions)
      .where(eq(active_cardio_sessions.session_id, sessionId));
  }

  // Clear any stale sessions except an optional one to keep
  async clearStaleSessions(keepSessionId?: string): Promise<void> {
    try {
      const rows = (await db.select().from(active_cardio_sessions)) as ActiveCardioSession[];
      for (const r of rows) {
        if (keepSessionId && r.session_id === keepSessionId) continue;
        try {
          await this.clearActiveSession(r.session_id);
        } catch {}
      }
    } catch (e) {
      console.warn('Failed to clear stale cardio sessions', e);
    }
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
