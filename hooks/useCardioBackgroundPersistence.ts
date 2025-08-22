import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useCardioSession } from '../context/CardioSessionContext';
import { type CardioType } from '../services/cardioTracking';

// Extend background session service to handle cardio sessions
interface CardioSessionState {
  sessionId: string;
  type: CardioType;
  name: string;
  startTime: Date;
  elapsedTime: number;
  accumulatedTime: number;
  isPaused: boolean;
  lastResumeTime: Date | null;
  
  // HIIT specific
  workTime?: number;
  restTime?: number;
  rounds?: number;
  currentRound?: number;
  isWorkPhase?: boolean;
  
  // Walk-Run specific
  runTime?: number;
  walkTime?: number;
  laps?: number;
  currentLap?: number;
  isRunPhase?: boolean;
  
  // Casual Walk specific
  totalLaps?: number;
  
  // Phase timer
  phaseTimeLeft?: number;
}

class CardioBackgroundService {
  generateSessionId(): string {
    return `cardio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async saveCardioSessionState(state: CardioSessionState): Promise<void> {
    try {
      const { db } = await import('../db/client');
      const { active_workout_sessions, active_session_timers } = await import('../db/schema');
      const { eq, and } = await import('drizzle-orm');

      const sessionPayload = {
        session_id: state.sessionId,
        name: state.name,
        start_time: state.startTime.toISOString(),
        elapsed_time: state.elapsedTime, // accumulated only
        is_paused: state.isPaused ? 1 : 0,
        current_exercise_index: 0,
        session_data: JSON.stringify({
          isCardio: true,
          type: state.type,
          cardio: {
            workTime: state.workTime ?? null,
            restTime: state.restTime ?? null,
            rounds: state.rounds ?? null,
            currentRound: state.currentRound ?? null,
            isWorkPhase: state.isWorkPhase ?? null,
            runTime: state.runTime ?? null,
            walkTime: state.walkTime ?? null,
            laps: state.laps ?? null,
            currentLap: state.currentLap ?? null,
            isRunPhase: state.isRunPhase ?? null,
            totalLaps: state.totalLaps ?? null,
            phaseTimeLeft: state.phaseTimeLeft ?? null,
            lastResumeTime: state.lastResumeTime ? state.lastResumeTime.toISOString() : null,
          },
        }),
        last_updated: new Date().toISOString(),
      };

      // Upsert by session_id
      const existing = await db.select().from(active_workout_sessions).where(eq(active_workout_sessions.session_id, state.sessionId)).limit(1);
      if (existing.length > 0) {
        await db.update(active_workout_sessions).set(sessionPayload).where(eq(active_workout_sessions.session_id, state.sessionId));
      } else {
        await db.insert(active_workout_sessions).values(sessionPayload);
      }

      // Save a timer state for accurate elapsed when active
      await db
        .delete(active_session_timers)
        .where(and(eq(active_session_timers.session_id, state.sessionId), eq(active_session_timers.timer_type, 'workout')));

      await db.insert(active_session_timers).values({
        session_id: state.sessionId,
        timer_type: 'workout',
        start_time: state.startTime.toISOString(),
        duration: 0,
        elapsed_when_paused: state.elapsedTime,
        is_active: state.isPaused ? 0 : 1,
      });

      console.log('✅ Saved cardio background state to SQLite');
    } catch (error) {
      console.error('Failed to save cardio background state:', error);
      throw error;
    }
  }

  async restoreCardioSessionState(): Promise<CardioSessionState | null> {
    try {
      const { db } = await import('../db/client');
      const { active_workout_sessions } = await import('../db/schema');
      // Get most recent session that looks like cardio (session_id prefix or session_data flag)
      const rows = await db.select().from(active_workout_sessions).limit(10);
      const cardioRow = rows.find(r => r.session_id.startsWith('cardio_') || (r.session_data && (() => { try { const d = JSON.parse(r.session_data); return d.isCardio; } catch { return false; } })()));
      if (!cardioRow) return null;

      const parsed = cardioRow.session_data ? JSON.parse(cardioRow.session_data) : {};
      const cardio = parsed.cardio || {};
      const startTime = new Date(cardioRow.start_time);
      const lastResumeTime = cardio.lastResumeTime ? new Date(cardio.lastResumeTime) : null;

      const restored: CardioSessionState = {
        sessionId: cardioRow.session_id,
        type: parsed.type,
        name: cardioRow.name,
        startTime,
        elapsedTime: cardioRow.elapsed_time,
        accumulatedTime: cardioRow.elapsed_time,
        isPaused: cardioRow.is_paused === 1,
        lastResumeTime,
        workTime: cardio.workTime ?? undefined,
        restTime: cardio.restTime ?? undefined,
        rounds: cardio.rounds ?? undefined,
        currentRound: cardio.currentRound ?? undefined,
        isWorkPhase: cardio.isWorkPhase ?? undefined,
        runTime: cardio.runTime ?? undefined,
        walkTime: cardio.walkTime ?? undefined,
        laps: cardio.laps ?? undefined,
        currentLap: cardio.currentLap ?? undefined,
        isRunPhase: cardio.isRunPhase ?? undefined,
        totalLaps: cardio.totalLaps ?? undefined,
        phaseTimeLeft: cardio.phaseTimeLeft ?? undefined,
      };

      console.log('✅ Restored cardio background state from SQLite');
      return restored;
    } catch (error) {
      console.error('Failed to restore cardio background state:', error);
      return null;
    }
  }

  async clearCardioSessionState(sessionId?: string): Promise<void> {
    try {
      const { db } = await import('../db/client');
      const { active_workout_sessions, active_session_timers } = await import('../db/schema');
      const { eq } = await import('drizzle-orm');
      if (sessionId) {
        await db.delete(active_session_timers).where(eq(active_session_timers.session_id, sessionId));
        await db.delete(active_workout_sessions).where(eq(active_workout_sessions.session_id, sessionId));
      } else {
        // Clear all cardio_* sessions as a fallback
        const rows = await db.select().from(active_workout_sessions);
        for (const r of rows) {
          if (r.session_id.startsWith('cardio_')) {
            await db.delete(active_session_timers).where(eq(active_session_timers.session_id, r.session_id));
            await db.delete(active_workout_sessions).where(eq(active_workout_sessions.session_id, r.session_id));
          }
        }
      }
      console.log('🗑️ Cleared cardio background state');
    } catch (error) {
      console.error('Failed to clear cardio background state:', error);
    }
  }

  calculateRestoredElapsedTime(
    sessionStartTime: Date,
    lastResumeTime: Date | null,
    accumulatedTime: number,
    isPaused: boolean,
    maxSessionHours: number = 12,
    maxGapHours: number = 24
  ): number {
    const now = new Date();
    const sessionAge = (now.getTime() - sessionStartTime.getTime()) / (1000 * 60 * 60); // hours
    
    // Safety check: reject sessions older than maxSessionHours
    if (sessionAge > maxSessionHours) {
      console.warn(`⚠️ Session too old (${sessionAge.toFixed(1)}h), rejecting restore`);
      return 0;
    }
    
    // If paused, return only accumulated time (no current segment)
    if (isPaused || !lastResumeTime) {
      return accumulatedTime;
    }
    
    // Calculate gap between last resume and now
    const gapDuration = (now.getTime() - lastResumeTime.getTime()) / (1000 * 60 * 60); // hours
    
    // Safety check: reject unreasonable gaps
    if (gapDuration > maxGapHours) {
      console.warn(`⚠️ Gap too large (${gapDuration.toFixed(1)}h), using accumulated time only`);
      return accumulatedTime;
    }
    
    // Add gap to accumulated time
    const gapInSeconds = Math.floor(gapDuration * 3600);
    const restoredTime = accumulatedTime + gapInSeconds;
    
    console.log(`🔄 CARDIO RESTORE: accumulated=${accumulatedTime}s + gap=${gapInSeconds}s = ${restoredTime}s`);
    
    return restoredTime;
  }
}

export const cardioBackgroundService = new CardioBackgroundService();

/**
 * Background Persistence Hook for Cardio Sessions
 * Provides the same reliable background persistence as lift workouts
 */
export function useCardioBackgroundPersistence() {
  const session = useCardioSession();
  const sessionIdRef = useRef<string | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const lastSaveTime = useRef<number>(0);

  // Generate session ID when cardio starts
  const ensureSessionId = useCallback(() => {
    if (!sessionIdRef.current && session.isActive) {
      sessionIdRef.current = cardioBackgroundService.generateSessionId();
      console.log('🆔 Generated cardio session ID:', sessionIdRef.current);
    }
    return sessionIdRef.current;
  }, [session.isActive]);

  // Save current cardio state to background storage
  const saveCurrentState = useCallback(async () => {
    const sessionId = ensureSessionId();
    if (!sessionId || !session.isActive || !session.sessionStartTime) {
      return;
    }

    // Throttle saves to avoid excessive writes
    const now = Date.now();
    if (now - lastSaveTime.current < 2000) {
      return;
    }
    lastSaveTime.current = now;

    try {
      const saveTime = new Date();
      let resumeTime: Date;
      let accumulatedTimeOnly: number;
      
      if (session.isPaused) {
        resumeTime = saveTime;
        accumulatedTimeOnly = session.accumulatedTime;
      } else {
        if (session.lastResumeTime) {
          resumeTime = session.lastResumeTime;
          accumulatedTimeOnly = session.accumulatedTime;
        } else {
          resumeTime = session.sessionStartTime || saveTime;
          accumulatedTimeOnly = 0;
        }
      }

      const state: CardioSessionState = {
        sessionId,
        type: session.cardioType!,
        name: session.sessionName,
        startTime: resumeTime,
        elapsedTime: accumulatedTimeOnly,
        accumulatedTime: accumulatedTimeOnly,
        isPaused: session.isPaused,
        lastResumeTime: session.lastResumeTime,
        
        // HIIT specific
        workTime: session.workTime,
        restTime: session.restTime,
        rounds: session.rounds,
        currentRound: session.currentRound,
        isWorkPhase: session.isWorkPhase,
        
        // Walk-Run specific
        runTime: session.runTime,
        walkTime: session.walkTime,
        laps: session.laps,
        currentLap: session.currentLap,
        isRunPhase: session.isRunPhase,
        
        // Casual Walk specific
        totalLaps: session.totalLaps,
        
        // Phase timer
        phaseTimeLeft: session.phaseTimeLeft,
      };

      await cardioBackgroundService.saveCardioSessionState(state);
      
      console.log('🔄 CARDIO SAVE:', {
        type: session.cardioType,
        isPaused: session.isPaused,
        resumeTime: resumeTime.toISOString(),
        accumulatedOnly: accumulatedTimeOnly,
        currentTotal: session.elapsedTime
      });
    } catch (error) {
      console.error('Failed to save cardio background state:', error);
    }
  }, [session, ensureSessionId]);

  // Restore cardio session state on app launch
  const restoreSessionState = useCallback(async () => {
    try {
      const restoredState = await cardioBackgroundService.restoreCardioSessionState();
      if (!restoredState) {
        return false;
      }

      console.log('🔄 Restoring cardio session:', restoredState);

      // Calculate accurate elapsed time with safety checks
  const restoredElapsedTime = cardioBackgroundService.calculateRestoredElapsedTime(
        restoredState.startTime,
        restoredState.lastResumeTime,
        restoredState.accumulatedTime,
        restoredState.isPaused
      );

      if (restoredElapsedTime === 0) {
        // Session was rejected, clear it
        await cardioBackgroundService.clearCardioSessionState(restoredState.sessionId);
        return false;
      }

      // Calculate gap since last resume (for active sessions)
      const gapSeconds = restoredState.isPaused || !restoredState.lastResumeTime
        ? 0
        : Math.max(0, Math.floor((Date.now() - restoredState.lastResumeTime.getTime()) / 1000));

      // Advance phase timers based on gap
      let nextCurrentRound = restoredState.currentRound ?? 1;
      let nextIsWork = restoredState.isWorkPhase ?? true;
      let nextCurrentLap = restoredState.currentLap ?? 1;
      let nextIsRun = restoredState.isRunPhase ?? true;
      let nextPhaseLeft = restoredState.phaseTimeLeft ?? 0;

      const clampPositive = (n: number) => Math.max(0, n);

      const advanceHiit = (gap: number) => {
        const work = Math.max(1, restoredState.workTime ?? 20);
        const rest = Math.max(1, restoredState.restTime ?? 10);
        const totalRounds = Math.max(1, restoredState.rounds ?? 8);
        let g = gap;
        let round = Math.max(1, nextCurrentRound);
        let isWork = nextIsWork;
        let left = nextPhaseLeft > 0 ? nextPhaseLeft : (isWork ? work : rest);
        while (g > 0) {
          if (g < left) {
            left -= g;
            g = 0;
            break;
          }
          // consume current phase completely
          g -= left;
          if (isWork) {
            // switch to rest
            isWork = false;
            left = rest;
          } else {
            // finished a rest; increment round or finish
            if (round >= totalRounds) {
              // session completed during background; set to end state
              left = 0;
              g = 0;
              break;
            }
            round += 1;
            isWork = true;
            left = work;
          }
        }
        nextCurrentRound = round;
        nextIsWork = isWork;
        nextPhaseLeft = clampPositive(left);
      };

      const advanceWalkRun = (gap: number) => {
        const run = Math.max(1, restoredState.runTime ?? 30);
        const walk = Math.max(1, restoredState.walkTime ?? 30);
        const laps = Math.max(1, restoredState.laps ?? 4);
        let g = gap;
        let lap = Math.max(1, nextCurrentLap);
        let isRun = nextIsRun;
        let left = nextPhaseLeft > 0 ? nextPhaseLeft : (isRun ? run : walk);
        while (g > 0) {
          if (g < left) {
            left -= g;
            g = 0;
            break;
          }
          g -= left;
          if (isRun) {
            // run finished → walk
            isRun = false;
            left = walk;
          } else {
            // walk finished → next lap or finish
            if (lap >= laps) {
              left = 0;
              g = 0;
              break;
            }
            lap += 1;
            isRun = true;
            left = run;
          }
        }
        nextCurrentLap = lap;
        nextIsRun = isRun;
        nextPhaseLeft = clampPositive(left);
      };

      if (!restoredState.isPaused && gapSeconds > 0) {
        if (restoredState.type === 'hiit') {
          advanceHiit(gapSeconds);
        } else if (restoredState.type === 'walk_run') {
          advanceWalkRun(gapSeconds);
        } else {
          // casual_walk: nothing to advance
        }
      }

      // Restore cardio session state without re-triggering get-ready, with advanced phase state
      session.restoreFromPersistence({
        cardioType: restoredState.type,
        sessionName: restoredState.name,
        isPaused: restoredState.isPaused,
        elapsedTime: restoredElapsedTime,
        accumulatedTime: restoredState.accumulatedTime,
        lastResumeTime: restoredState.lastResumeTime,
        workTime: restoredState.workTime,
        restTime: restoredState.restTime,
        rounds: restoredState.rounds,
        currentRound: nextCurrentRound,
        isWorkPhase: nextIsWork,
        runTime: restoredState.runTime,
        walkTime: restoredState.walkTime,
        laps: restoredState.laps,
        currentLap: nextCurrentLap,
        isRunPhase: nextIsRun,
        totalLaps: restoredState.totalLaps,
        phaseTimeLeft: nextPhaseLeft,
      } as any);
      
      sessionIdRef.current = restoredState.sessionId;

      console.log(`✅ CARDIO RESTORED: ${restoredState.type} session - ${Math.floor(restoredElapsedTime/60)}min ${restoredElapsedTime%60}sec`);
      
      return true;
    } catch (error) {
      console.error('Failed to restore cardio session state:', error);
      return false;
    }
  }, [session]);

  // Clear session state when workout ends
  const clearSessionState = useCallback(async () => {
    try {
      await cardioBackgroundService.clearCardioSessionState();
      sessionIdRef.current = null;
      console.log('🗑️ Cleared cardio background state');
    } catch (error) {
      console.error('Failed to clear cardio session state:', error);
    }
  }, []);

  // Handle app state changes (background/foreground)
  const handleAppStateChange = useCallback(
    (nextAppState: AppStateStatus) => {
      console.log(`📱 CARDIO App state: ${appStateRef.current} → ${nextAppState}`);
      
      if (appStateRef.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        // App going to background - save state
        saveCurrentState();
      } else if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App coming to foreground - restore state if needed
        if (!session.isActive) {
          restoreSessionState();
        }
      }
      
      appStateRef.current = nextAppState;
    },
    [saveCurrentState, restoreSessionState, session.isActive]
  );

  // Set up app state listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Try to restore session on mount
    restoreSessionState();
    
    return () => subscription?.remove();
  }, [handleAppStateChange, restoreSessionState]);

  // Auto-save during active sessions
  useEffect(() => {
    if (!session.isActive) {
      return;
    }

    const saveInterval = setInterval(() => {
      saveCurrentState();
    }, 5000); // Save every 5 seconds during active session

    return () => clearInterval(saveInterval);
  }, [session.isActive, saveCurrentState]);

  // Clear state when session ends
  useEffect(() => {
    if (!session.isActive && sessionIdRef.current) {
      clearSessionState();
    }
  }, [session.isActive, clearSessionState]);

  return {
    saveCurrentState,
    restoreSessionState,
    clearSessionState,
  };
}
