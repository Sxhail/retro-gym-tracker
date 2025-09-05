import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { cardioBackgroundSessionService as svc } from '../services/cardioBackgroundSession';
import IOSLocalNotifications from '../services/iosNotifications';
import { cardioCountdownAudio } from '../services/cardioCountdownAudio';

export type CardioMode = 'hiit' | 'walk_run';
export type CardioPhase = 'work' | 'rest' | 'run' | 'walk' | 'completed' | 'idle';

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

export type ScheduleEntry = {
  phase: CardioPhase;
  startAt: string; // ISO UTC
  endAt: string; // ISO UTC
  cycleIndex: number; // round or lap index (0-based)
};

export type DerivedState = {
  sessionId: string | null;
  mode: CardioMode | null;
  // Expose original params so UI can reflect correct values on restore/navigation
  params: CardioParams | null;
  phase: CardioPhase;
  isPaused: boolean;
  currentIndex: number;
  cycleIndex: number;
  remainingMs: number;
  totalPlannedMs: number;
  totalElapsedMs: number;
  startedAt: string | null;
  phaseStartedAt: string | null;
  phaseWillEndAt: string | null;
  willEndAt: string | null;
  currentRound: number | null; // 1-based for HIIT
  currentLap: number | null;   // 1-based for Walk–Run
};

function nowUtcIso() {
  return new Date().toISOString();
}

function generateSessionId() {
  return `cardio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function sec(n: number) { return n * 1000; }

function buildHiitSchedule(startMs: number, p: HiitParams): ScheduleEntry[] {
  const out: ScheduleEntry[] = [];
  let t = startMs;
  for (let r = 0; r < p.rounds; r++) {
    const workStart = t;
    const workEnd = workStart + sec(p.workSec);
    out.push({ phase: 'work', startAt: new Date(workStart).toISOString(), endAt: new Date(workEnd).toISOString(), cycleIndex: r });
    t = workEnd;

    const isLast = r === p.rounds - 1;
    const includeRest = p.includeTrailingRest ?? false ? true : !isLast;
    if (includeRest) {
      const restStart = t;
      const restEnd = restStart + sec(p.restSec);
      out.push({ phase: 'rest', startAt: new Date(restStart).toISOString(), endAt: new Date(restEnd).toISOString(), cycleIndex: r });
      t = restEnd;
    }
  }
  // Final completed marker
  out.push({ phase: 'completed', startAt: new Date(t).toISOString(), endAt: new Date(t).toISOString(), cycleIndex: (p.rounds - 1) });
  return out;
}

function buildWalkRunSchedule(startMs: number, p: WalkRunParams): ScheduleEntry[] {
  const out: ScheduleEntry[] = [];
  let t = startMs;
  for (let l = 0; l < p.laps; l++) {
    const runStart = t;
    const runEnd = runStart + sec(p.runSec);
    out.push({ phase: 'run', startAt: new Date(runStart).toISOString(), endAt: new Date(runEnd).toISOString(), cycleIndex: l });
    t = runEnd;

  const isLast = l === p.laps - 1;
  // Default: exclude trailing walk unless explicitly enabled
  const includeWalk = (p.includeTrailingWalk ?? false) ? true : !isLast;
    if (includeWalk) {
      const walkStart = t;
      const walkEnd = walkStart + sec(p.walkSec);
      out.push({ phase: 'walk', startAt: new Date(walkStart).toISOString(), endAt: new Date(walkEnd).toISOString(), cycleIndex: l });
      t = walkEnd;
    }
  }
  out.push({ phase: 'completed', startAt: new Date(t).toISOString(), endAt: new Date(t).toISOString(), cycleIndex: (p.laps - 1) });
  return out;
}

function totalPlannedMs(schedule: ScheduleEntry[]) {
  const first = schedule[0];
  const last = schedule[schedule.length - 1];
  if (!first || !last) return 0;
  const start = new Date(first.startAt).getTime();
  const end = new Date(last.startAt).getTime();
  return Math.max(0, end - start);
}

function shiftSchedule(schedule: ScheduleEntry[], deltaMs: number, fromIndex = 0): ScheduleEntry[] {
  return schedule.map((s, i) => {
    if (i < fromIndex) return s;
    const start = new Date(s.startAt).getTime() + deltaMs;
    const end = new Date(s.endAt).getTime() + deltaMs;
    return { ...s, startAt: new Date(start).toISOString(), endAt: new Date(end).toISOString() };
  });
}

function indexAt(schedule: ScheduleEntry[], tMs: number): number {
  for (let i = 0; i < schedule.length; i++) {
    const start = new Date(schedule[i].startAt).getTime();
    const end = new Date(schedule[i].endAt).getTime();
    if (tMs < end) return i; // current active or just passed
  }
  return schedule.length - 1;
}

export function useCardioSession() {
  // Debounce to avoid rapid multiple starts creating overlapping schedules
  const lastStartRef = useRef<number>(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<CardioMode | null>(null);
  const [params, setParams] = useState<CardioParams | null>(null);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [cycleIndex, setCycleIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedAt, setPausedAt] = useState<string | null>(null);
  const [accumPauseMs, setAccumPauseMs] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const tickRef = useRef<number | null>(null);
  
  // Countdown audio state tracking (following notification patterns)
  const countdownTriggeredRef = useRef<Set<string>>(new Set());
  const lastPhaseRef = useRef<string | null>(null);

  const ensureTick = useCallback(() => {
    // Do not tick while paused or if already ticking
    if (isPaused || tickRef.current) return;
    tickRef.current = setInterval(() => {
      // force a state update via phaseIndex recompute
      if (schedule.length) {
        const now = Date.now();
        const idx = indexAt(schedule, now);
        if (idx !== phaseIndex) setPhaseIndex(idx);
      }
    }, 500);
  }, [schedule, phaseIndex, isPaused]);

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current as unknown as number);
      tickRef.current = null;
    }
  }, []);

  // Derived state
  const derived: DerivedState = useMemo(() => {
    if (!schedule.length) {
      return {
        sessionId,
        mode,
  params,
        phase: 'idle',
        isPaused,
        currentIndex: 0,
        cycleIndex: 0,
        remainingMs: 0,
        totalPlannedMs: 0,
        totalElapsedMs: 0,
        startedAt,
        phaseStartedAt: null,
        phaseWillEndAt: null,
        willEndAt: null,
        currentRound: null,
        currentLap: null,
      };
    }
    // Freeze time-based calculations while paused
    const tNow = (isPaused && pausedAt) ? new Date(pausedAt).getTime() : Date.now();
    const idx = clamp(indexAt(schedule, tNow), 0, schedule.length - 1);
    const current = schedule[idx];
    const endMs = new Date(current.endAt).getTime();
    const start0 = new Date(schedule[0].startAt).getTime();
    const remainingMs = Math.max(0, endMs - tNow);
    const totalPlanned = totalPlannedMs(schedule);
    const totalElapsed = Math.max(0, Math.min(totalPlanned, tNow - start0));
    const isHiit = mode === 'hiit';
    const currentRound = isHiit && current.phase !== 'completed' ? current.cycleIndex + 1 : null;
    const currentLap = !isHiit && current.phase !== 'completed' ? current.cycleIndex + 1 : null;
    return {
      sessionId,
      mode,
  params,
      phase: current.phase,
      isPaused,
      currentIndex: idx,
      cycleIndex: current.cycleIndex,
      remainingMs,
      totalPlannedMs: totalPlanned,
      totalElapsedMs: totalElapsed,
      startedAt,
      phaseStartedAt: current.startAt,
      phaseWillEndAt: current.endAt,
      willEndAt: schedule[schedule.length - 1]?.endAt ?? current.endAt,
      currentRound,
      currentLap,
    };
  }, [sessionId, mode, params, isPaused, startedAt, schedule, pausedAt]);

  // Helper function to determine if countdown audio should play for current phase
  const shouldPlayCountdownAudio = useCallback((phase: CardioPhase): boolean => {
    // Only play for work phases (HIIT) and run phases (Walk-Run)
    return phase === 'work' || phase === 'run';
  }, []);

  // Countdown audio effect - Hybrid approach: foreground audio + background notifications
  useEffect(() => {
    // Early returns for invalid states (following notification patterns)
    if (!sessionId || !schedule.length || isPaused || derived.phase === 'idle' || derived.phase === 'completed') {
      return;
    }

    // Generate unique phase identifier to prevent duplicate triggers
    const phaseId = `${sessionId}-${derived.currentIndex}-${derived.phase}-${derived.cycleIndex}`;
    
    // Check if we should play countdown audio for this phase
    if (!shouldPlayCountdownAudio(derived.phase)) {
      return;
    }

    // Check if countdown audio should trigger (3 seconds remaining)
    const shouldTrigger = derived.remainingMs <= 3000 && derived.remainingMs > 0;
    
    if (shouldTrigger && !countdownTriggeredRef.current.has(phaseId)) {
      // Mark this phase as triggered to prevent duplicates
      countdownTriggeredRef.current.add(phaseId);
      
      console.log(`[useCardioSession] Triggering foreground countdown audio for ${derived.phase} phase (${derived.remainingMs}ms remaining)`);
      
      // Play countdown audio in foreground (async, non-blocking like notifications)
      // Background scenarios are handled by notification system
      cardioCountdownAudio.playCountdown(sessionId, derived.phase as 'work' | 'run').catch((error) => {
        console.warn('[useCardioSession] Failed to play foreground countdown audio:', error);
      });
    }

    // Reset triggered phases when phase changes (following notification state management)
    const currentPhaseKey = `${derived.currentIndex}-${derived.phase}`;
    if (lastPhaseRef.current !== currentPhaseKey) {
      lastPhaseRef.current = currentPhaseKey;
      
      // Stop any countdown audio when phase changes (ensures audio doesn't continue beyond 3 seconds)
      cardioCountdownAudio.stopCountdown().catch((error) => {
        console.warn('[useCardioSession] Failed to stop countdown audio on phase change:', error);
      });
      
      // Clear old triggered phases to free memory (keep only current and recent phases)
      const currentAndNext = new Set([
        phaseId,
        `${sessionId}-${derived.currentIndex + 1}-work-${derived.cycleIndex}`,
        `${sessionId}-${derived.currentIndex + 1}-run-${derived.cycleIndex}`,
      ]);
      
      countdownTriggeredRef.current = new Set(
        Array.from(countdownTriggeredRef.current).filter(id => currentAndNext.has(id))
      );
    }
  }, [sessionId, schedule.length, isPaused, derived.phase, derived.currentIndex, derived.cycleIndex, derived.remainingMs, shouldPlayCountdownAudio]);

  // Persist snapshot
  const persist = useCallback(async () => {
    if (!sessionId || !mode || !params || !schedule.length) return;
    const idx = clamp(derived.currentIndex, 0, schedule.length - 1);
    const cur = schedule[idx];
    await svc.saveActiveSession({
      sessionId,
      mode,
      params,
      startedAt: startedAt!,
      phaseIndex: idx,
      cycleIndex: cur.cycleIndex,
      phaseStartedAt: cur.startAt,
      phaseWillEndAt: cur.endAt,
      pausedAt,
      accumulatedPauseMs: accumPauseMs,
      schedule,
      isCompleted: cur.phase === 'completed',
    });
  }, [sessionId, mode, params, schedule, derived.currentIndex, startedAt, pausedAt, accumPauseMs]);

  // Schedule notifications from entire schedule
  // Debounced scheduler to avoid duplicate schedule calls
  const scheduleNotifications = useCallback(async () => {
    if (!sessionId || !schedule.length) return;
    await svc.scheduleNotifications(sessionId, schedule);
  }, [sessionId, schedule]);

  const startHiit = useCallback(async (p: HiitParams) => {
  const now = Date.now();
  if (now - lastStartRef.current < 500) return; // debounce 0.5s
  lastStartRef.current = now;
    // Single active session guard: remove any stale/previous sessions to avoid duplicate schedules
    const existing = await svc.restoreActiveSession();
    if (existing?.sessionId) {
      await svc.clearActiveSession(existing.sessionId);
    }
    // Clear any other stale rows defensively
    await svc.clearStaleSessions();
    const id = generateSessionId();
  const startMs = Date.now();
    const sched = buildHiitSchedule(startMs, p);
    setSessionId(id);
    setMode('hiit');
    setParams(p);
    setSchedule(sched);
    setStartedAt(new Date(startMs).toISOString());
    setPhaseIndex(0);
    setCycleIndex(0);
    setIsPaused(false);
    setPausedAt(null);
    setAccumPauseMs(0);
    await svc.saveActiveSession({
      sessionId: id,
      mode: 'hiit',
      params: p,
      startedAt: new Date(startMs).toISOString(),
      phaseIndex: 0,
      cycleIndex: 0,
      phaseStartedAt: sched[0].startAt,
      phaseWillEndAt: sched[0].endAt,
      pausedAt: null,
      accumulatedPauseMs: 0,
      schedule: sched,
      isCompleted: false,
    });
  await svc.scheduleNotifications(id, sched);
  try { await IOSLocalNotifications.listScheduledForSession(id); } catch {}
    ensureTick();
  }, [ensureTick]);

  const startWalkRun = useCallback(async (p: WalkRunParams) => {
  const now = Date.now();
  if (now - lastStartRef.current < 500) return; // debounce 0.5s
  lastStartRef.current = now;
    // Single active session guard: remove any stale/previous sessions to avoid duplicate schedules
    const existing = await svc.restoreActiveSession();
    if (existing?.sessionId) {
      await svc.clearActiveSession(existing.sessionId);
    }
    // Clear any other stale rows defensively
    await svc.clearStaleSessions();
    const id = generateSessionId();
    const startMs = Date.now();
    const sched = buildWalkRunSchedule(startMs, p);
    setSessionId(id);
    setMode('walk_run');
    setParams(p);
    setSchedule(sched);
    setStartedAt(new Date(startMs).toISOString());
    setPhaseIndex(0);
    setCycleIndex(0);
    setIsPaused(false);
    setPausedAt(null);
    setAccumPauseMs(0);
    await svc.saveActiveSession({
      sessionId: id,
      mode: 'walk_run',
      params: p,
      startedAt: new Date(startMs).toISOString(),
      phaseIndex: 0,
      cycleIndex: 0,
      phaseStartedAt: sched[0].startAt,
      phaseWillEndAt: sched[0].endAt,
      pausedAt: null,
      accumulatedPauseMs: 0,
      schedule: sched,
      isCompleted: false,
    });
  await svc.scheduleNotifications(id, sched);
  try { await IOSLocalNotifications.listScheduledForSession(id); } catch {}
    ensureTick();
  }, [ensureTick]);

  const pause = useCallback(async () => {
    if (!sessionId || isPaused) return;
    console.log(`[useCardioSession] Pausing session ${sessionId}`);
    setIsPaused(true);
    const pAt = nowUtcIso();
    setPausedAt(pAt);
    
    // Stop foreground countdown audio immediately on pause
    try {
      await cardioCountdownAudio.stopCountdown();
    } catch (error) {
      console.warn('[useCardioSession] Failed to stop foreground countdown audio on pause:', error);
    }
    
    // Use the enhanced session state change handler
    try { 
      await svc.handleSessionStateChange(sessionId, 'pause'); 
    } catch (error) {
      console.warn('Failed to handle pause state change:', error);
    }
    
    await persist();
    // Stop ticking while paused
    clearTick();
  }, [sessionId, isPaused, persist, clearTick]);

  const resume = useCallback(async () => {
    if (!sessionId || !pausedAt) return;
    console.log(`[useCardioSession] Resuming session ${sessionId}`);
    const delta = Date.now() - new Date(pausedAt).getTime();
    const newSched = shiftSchedule(schedule, delta, derived.currentIndex);
    setSchedule(newSched);
    setIsPaused(false);
    setPausedAt(null);
    setAccumPauseMs(accum => accum + delta);
    
    // Reset countdown audio triggers on resume (following notification rescheduling patterns)
    countdownTriggeredRef.current.clear();
    
    await svc.saveActiveSession({
      sessionId,
      mode: mode!,
      params: params!,
      startedAt: startedAt!,
      phaseIndex: derived.currentIndex,
      cycleIndex: newSched[derived.currentIndex].cycleIndex,
      phaseStartedAt: newSched[derived.currentIndex].startAt,
      phaseWillEndAt: newSched[derived.currentIndex].endAt,
      pausedAt: null,
      accumulatedPauseMs: (accumPauseMs + delta),
      schedule: newSched,
      isCompleted: false,
    });
    
    // Use the enhanced session state change handler
    try {
      await svc.handleSessionStateChange(sessionId, 'resume', newSched);
    } catch (error) {
      console.warn('Failed to handle resume state change:', error);
    }
    
    ensureTick();
  }, [sessionId, pausedAt, schedule, derived.currentIndex, mode, params, startedAt, accumPauseMs, ensureTick]);

  const skipPhase = useCallback(async () => {
    if (!sessionId || !schedule.length) return;
    console.log(`[useCardioSession] Skipping phase for session ${sessionId}`);
    
    // Stop foreground countdown audio immediately on skip
    try {
      await cardioCountdownAudio.stopCountdown();
    } catch (error) {
      console.warn('[useCardioSession] Failed to stop foreground countdown audio on skip:', error);
    }
    
    const now = Date.now();
    const idx = clamp(indexAt(schedule, now), 0, schedule.length - 2);
    // Advance to next phase; rebuild remaining schedule from now with same durations
    const remaining = schedule.slice(idx + 1);
    const rebuilt: ScheduleEntry[] = [];
    let t = now;
    for (const e of remaining) {
      const dur = new Date(e.endAt).getTime() - new Date(e.startAt).getTime();
      const start = t;
      const end = start + dur;
      rebuilt.push({ ...e, startAt: new Date(start).toISOString(), endAt: new Date(end).toISOString() });
      t = end;
    }
    const newSched = [...schedule.slice(0, idx + 1), ...rebuilt];
    setSchedule(newSched);
    setPhaseIndex(idx + 1);
    
    // Reset countdown audio triggers for the new schedule (following notification patterns)
    countdownTriggeredRef.current.clear();
    
    await svc.saveActiveSession({
      sessionId,
      mode: mode!,
      params: params!,
      startedAt: startedAt!,
      phaseIndex: idx + 1,
      cycleIndex: newSched[idx + 1].cycleIndex,
      phaseStartedAt: newSched[idx + 1].startAt,
      phaseWillEndAt: newSched[idx + 1].endAt,
      pausedAt,
      accumulatedPauseMs: accumPauseMs,
      schedule: newSched,
      isCompleted: newSched[idx + 1].phase === 'completed',
    });
    
    // Use the enhanced session state change handler
    try {
      await svc.handleSessionStateChange(sessionId, 'skip', newSched);
    } catch (error) {
      console.warn('Failed to handle skip state change:', error);
    }
  }, [sessionId, schedule, mode, params, startedAt, pausedAt, accumPauseMs]);

  // Add seconds to the current phase and shift future phases accordingly
  const addSecondsToCurrentPhase = useCallback(async (seconds: number) => {
    if (!sessionId || !schedule.length || seconds <= 0) return;
    console.log(`[useCardioSession] Adding ${seconds} seconds to current phase for session ${sessionId}`);
    const now = Date.now();
    const idx = clamp(indexAt(schedule, now), 0, schedule.length - 1);
    const cur = schedule[idx];
    if (cur.phase === 'completed') return;

    const delta = sec(seconds);
    const newCurEnd = new Date(new Date(cur.endAt).getTime() + delta).toISOString();
    const updated: ScheduleEntry[] = schedule.map((e, i) => {
      if (i < idx) return e;
      if (i === idx) {
        return { ...e, endAt: newCurEnd };
      } else {
        const start = new Date(e.startAt).getTime() + delta;
        const end = new Date(e.endAt).getTime() + delta;
        return { ...e, startAt: new Date(start).toISOString(), endAt: new Date(end).toISOString() };
      }
    });

    setSchedule(updated);
    await svc.saveActiveSession({
      sessionId,
      mode: mode!,
      params: params!,
      startedAt: startedAt!,
      phaseIndex: idx,
      cycleIndex: updated[idx].cycleIndex,
      phaseStartedAt: updated[idx].startAt,
      phaseWillEndAt: updated[idx].endAt,
      pausedAt,
      accumulatedPauseMs: accumPauseMs,
      schedule: updated,
      isCompleted: false,
    });
    
    // Use the enhanced session state change handler
    try {
      await svc.handleSessionStateChange(sessionId, 'modify', updated);
    } catch (error) {
      console.warn('Failed to handle modify state change:', error);
    }
  }, [sessionId, schedule, mode, params, startedAt, pausedAt, accumPauseMs]);

  const finish = useCallback(async () => {
    if (!sessionId) return;
    console.log(`[useCardioSession] Finishing session ${sessionId}`);
    
    // Stop countdown audio on finish (session complete)
    try {
      await cardioCountdownAudio.stopCountdown();
    } catch (error) {
      console.warn('[useCardioSession] Failed to stop countdown audio on finish:', error);
    }
    
    // Save historical record before clearing
    if (mode && params && startedAt) {
      await svc.saveHistoricalFromSnapshot({
        sessionId,
        mode,
        params: params as any,
        startedAt,
        phaseIndex: derived.currentIndex,
        cycleIndex: derived.cycleIndex,
        phaseStartedAt: derived.phaseStartedAt || startedAt,
        phaseWillEndAt: derived.phaseWillEndAt || startedAt,
        pausedAt: pausedAt,
        accumulatedPauseMs: accumPauseMs,
        schedule,
        isCompleted: derived.phase === 'completed',
      }, derived.phase !== 'completed');
    }
    
    // Use the enhanced session state change handler
    try {
      await svc.handleSessionStateChange(sessionId, 'complete');
    } catch (error) {
      console.warn('Failed to handle complete state change:', error);
    }
  // Aggressively clear any cardio notifications
  try { await IOSLocalNotifications.cancelAllCardio(); } catch {}

    await svc.clearActiveSession(sessionId);
    setSessionId(null);
    setMode(null);
    setParams(null);
    setSchedule([]);
    setIsPaused(false);
    setPausedAt(null);
    setAccumPauseMs(0);
    setStartedAt(null);
    countdownTriggeredRef.current.clear();
    lastPhaseRef.current = null;
    clearTick();
  }, [sessionId, mode, params, startedAt, derived, pausedAt, accumPauseMs, schedule, clearTick]);

  const reset = useCallback(async () => {
    // Reset should NOT save to history; just clear active state
    if (!sessionId) return;
    console.log(`[useCardioSession] Resetting session ${sessionId}`);
    
    // Stop foreground countdown audio immediately on reset
    try {
      await cardioCountdownAudio.stopCountdown();
    } catch (error) {
      console.warn('[useCardioSession] Failed to stop foreground countdown audio on reset:', error);
    }
    
    try {
      // Use the enhanced session state change handler
      await svc.handleSessionStateChange(sessionId, 'cancel');
      await svc.clearActiveSession(sessionId);
    } catch (error) {
      console.warn('Failed to reset session:', error);
    }
    try { await IOSLocalNotifications.cancelAllCardio(); } catch {}
    
    // Clear local state and countdown audio triggers
    setSessionId(null);
    setMode(null);
    setParams(null);
    setSchedule([]);
    setIsPaused(false);
    setPausedAt(null);
    setAccumPauseMs(0);
    setStartedAt(null);
    countdownTriggeredRef.current.clear();
    lastPhaseRef.current = null;
    clearTick();
    
    // Small delay to ensure state changes are processed
    await new Promise(resolve => setTimeout(resolve, 100));
  }, [sessionId, clearTick]);

  // Cancel without saving to history
  const cancel = useCallback(async () => {
    if (!sessionId) return;
    console.log(`[useCardioSession] Cancelling session ${sessionId}`);
    
    // Stop foreground countdown audio immediately on cancel
    try {
      await cardioCountdownAudio.stopCountdown();
    } catch (error) {
      console.warn('[useCardioSession] Failed to stop foreground countdown audio on cancel:', error);
    }
    
    try {
      // Use the enhanced session state change handler
      await svc.handleSessionStateChange(sessionId, 'cancel');
      await svc.clearActiveSession(sessionId);
    } catch (error) {
      console.warn('Failed to cancel session:', error);
    }
    try { await IOSLocalNotifications.cancelAllCardio(); } catch {}
    
    // Clear local state and countdown audio triggers
    setSessionId(null);
    setMode(null);
    setParams(null);
    setSchedule([]);
    setIsPaused(false);
    setPausedAt(null);
    setAccumPauseMs(0);
    setStartedAt(null);
    countdownTriggeredRef.current.clear();
    lastPhaseRef.current = null;
    clearTick();
    
    // Small delay to ensure state changes are processed
    await new Promise(resolve => setTimeout(resolve, 100));
  }, [sessionId, clearTick]);

  // Restore on mount
  useEffect(() => {
    (async () => {
      try {
        const snap = await svc.restoreActiveSession();
        if (!snap) return;
        
        // Defensive validation: ensure the session is valid and not stale
        const now = Date.now();
        const sessionStartTime = new Date(snap.startedAt).getTime();
        const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
        
        // If session is older than 24 hours, consider it stale and clear it
        if (now - sessionStartTime > maxSessionAge) {
          console.log(`[useCardioSession] Clearing stale session ${snap.sessionId} (age: ${(now - sessionStartTime) / 1000 / 60 / 60} hours)`);
          await svc.clearActiveSession(snap.sessionId);
          return;
        }
        
        // Additional validation: check if session has required fields
        if (!snap.mode || !snap.params || !snap.schedule?.length) {
          console.log(`[useCardioSession] Clearing invalid session ${snap.sessionId} (missing required fields)`);
          await svc.clearActiveSession(snap.sessionId);
          return;
        }
        
        console.log(`[useCardioSession] Restoring valid session ${snap.sessionId}`);
        setSessionId(snap.sessionId);
        setMode(snap.mode);
        setParams(snap.params);
        setSchedule(snap.schedule);
        setStartedAt(snap.startedAt);
        setPhaseIndex(snap.phaseIndex);
        setCycleIndex(snap.cycleIndex);
        setPausedAt(snap.pausedAt);
        setIsPaused(!!snap.pausedAt);
        setAccumPauseMs(snap.accumulatedPauseMs);
        // Only tick if not paused
        if (!snap.pausedAt) ensureTick();
      } catch (e) {
        console.warn('[useCardioSession] Failed to restore session:', e);
      }
    })();
    return clearTick;
  }, [ensureTick, clearTick]);

  // AppState handling
  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      const wasActive = appStateRef.current === 'active';
      const nowActive = state === 'active';
      
      if (wasActive && !nowActive) {
        // Backgrounding: persist only; rescheduling handled by BackgroundCardioSessionPersistence
        console.log(`[useCardioSession] App backgrounding, persisting session ${sessionId}`);
        persist();
      } else if (!wasActive && nowActive) {
        // Foregrounding: recompute phase index immediately (but not while paused)
        console.log(`[useCardioSession] App foregrounding, refreshing session ${sessionId}`);
        if (!isPaused && schedule.length) {
          setPhaseIndex(indexAt(schedule, Date.now()));
        }
      }
      
      appStateRef.current = state;
      if (nowActive && !isPaused) ensureTick(); 
      else clearTick();
    };
    
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [persist, schedule, isPaused, sessionId, ensureTick, clearTick]);

  // Stop ticking entirely once session reaches completed state
  useEffect(() => {
    if (derived.phase === 'completed') {
      console.log(`[useCardioSession] Session ${sessionId} completed`);
      clearTick();
      // Auto-finish silently to persist history and clear notifications/state
      // Do this once; if sessionId becomes null finish() no-ops
      finish().catch((error) => {
        console.warn('Failed to auto-finish completed session:', error);
      });
    }
  }, [derived.phase, sessionId, clearTick, finish]);

  // Cleanup foreground countdown audio on unmount
  useEffect(() => {
    return () => {
      cardioCountdownAudio.stopCountdown().catch((error) => {
        console.warn('[useCardioSession] Failed to stop foreground countdown audio on unmount:', error);
      });
    };
  }, []);

  return {
    state: derived,
    startHiit,
    startWalkRun,
    pause,
    resume,
    skipPhase,
  addTenSeconds: () => addSecondsToCurrentPhase(10),
  addSecondsToCurrentPhase,
    reset,
  cancel,
    finish,
    hasActiveSession: !!sessionId,
  };
}
