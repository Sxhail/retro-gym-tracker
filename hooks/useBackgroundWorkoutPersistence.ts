import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useWorkoutSession } from '../context/WorkoutSessionContext';
import { backgroundSessionService, type SessionState } from '../services/backgroundSession';

/**
 * Background Persistence Hook
 * Extends existing WorkoutSessionContext with automatic background state persistence
 * DOES NOT MODIFY existing context logic - only adds background save/restore
 */
export function useBackgroundWorkoutPersistence() {
  const session = useWorkoutSession();
  const sessionIdRef = useRef<string | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const lastSaveTime = useRef<number>(0);

  // Generate session ID when workout starts (only once per session)
  const ensureSessionId = useCallback(() => {
    if (!sessionIdRef.current && session.isWorkoutActive) {
      sessionIdRef.current = backgroundSessionService.generateSessionId();
      console.log('🆔 Generated session ID:', sessionIdRef.current);
    }
    return sessionIdRef.current;
  }, [session.isWorkoutActive]);

  // Save current state to background storage
  const saveCurrentState = useCallback(async () => {
    const sessionId = ensureSessionId();
    if (!sessionId || !session.isWorkoutActive || !session.sessionStartTime) {
      return;
    }

    // Throttle saves to avoid excessive database writes (max once per 2 seconds)
    const now = Date.now();
    if (now - lastSaveTime.current < 2000) {
      return;
    }
    lastSaveTime.current = now;

    try {
      // STRICT FIX: Use precise timestamp-based saving that avoids double-counting
      const saveTime = new Date();
      let resumeTime: Date;
      let accumulatedTimeOnly: number; // Only time from completed segments
      
      if (session.isPaused) {
        // If paused, save current accumulated time (completed segments only)
        resumeTime = saveTime; // Doesn't matter as timer is paused
        accumulatedTimeOnly = session.accumulatedTime; // Don't include current segment
      } else {
        // If active, save when current segment started and accumulated time from previous segments
        if (session.lastResumeTime) {
          resumeTime = session.lastResumeTime; // When current active segment started
          accumulatedTimeOnly = session.accumulatedTime; // Time from completed segments only
        } else {
          // Fallback: treat session start as resume time
          resumeTime = session.sessionStartTime || saveTime;
          accumulatedTimeOnly = 0; // No previous completed segments
        }
      }

      const state: SessionState = {
        sessionId,
        name: session.workoutName,
        startTime: resumeTime, // When current segment started (for active restoration calculation)
        elapsedTime: accumulatedTimeOnly, // ONLY accumulated time from completed segments
        isPaused: session.isPaused,
        currentExercises: session.currentExercises,
        sessionMeta: session.sessionMeta,
      };

      await backgroundSessionService.saveSessionState(state);

      // Save timer state - keep this simpler
      await backgroundSessionService.saveTimerState({
        sessionId,
        timerType: 'workout',
        startTime: resumeTime,
        duration: 0,
        elapsedWhenPaused: accumulatedTimeOnly, // Only completed segments
        isActive: !session.isPaused,
      });
      
      console.log('🔄 STRICT SAVE:', {
        isPaused: session.isPaused,
        resumeTime: resumeTime.toISOString(),
        accumulatedOnly: accumulatedTimeOnly,
        currentTotal: session.elapsedTime
      });
    } catch (error) {
      console.error('Failed to save background state:', error);
    }
  }, [session, ensureSessionId]);

  // Restore session state on app launch
  const restoreSessionState = useCallback(async () => {
    try {
      const restoredState = await backgroundSessionService.restoreSessionState();
      if (!restoredState) {
        return false;
      }

      console.log('🔄 Restoring background workout session...');
      
      // STRICT RESTORE: The background service already calculated the correct elapsed time
      // No need to double-calculate here - just use what was returned
      const totalElapsedTime = restoredState.elapsedTime;
      
      // Restore session data using existing context methods
      session.setWorkoutName(restoredState.name);
      session.setCurrentExercises(restoredState.currentExercises);
      session.setSessionMeta(restoredState.sessionMeta);
      
      // For timestamp-based timer, restore timer state properly
      if (restoredState.isPaused) {
        // If was paused, set accumulated time and keep paused
        session.setAccumulatedTime(totalElapsedTime);
        session.setElapsedTime(totalElapsedTime);
        session.setLastResumeTime(null);
        console.log('🔄 RESTORED (PAUSED):', { totalElapsed: totalElapsedTime });
      } else {
        // If was active, we need to figure out accumulated vs current segment
        // Since the background service calculated total elapsed correctly,
        // we can derive accumulated time by subtracting current segment
        const currentTime = new Date();
        const currentSegmentElapsed = Math.floor((currentTime.getTime() - restoredState.startTime.getTime()) / 1000);
        const accumulatedFromPrevious = totalElapsedTime - currentSegmentElapsed;
        
        session.setAccumulatedTime(Math.max(0, accumulatedFromPrevious)); // Ensure non-negative
        session.setLastResumeTime(restoredState.startTime); // When current segment started
        session.setElapsedTime(totalElapsedTime);
        console.log('🔄 RESTORED (ACTIVE):', {
          totalElapsed: totalElapsedTime,
          currentSegment: currentSegmentElapsed,
          accumulated: Math.max(0, accumulatedFromPrevious),
          resumeTime: restoredState.startTime.toISOString()
        });
      }
      
      // Set session ID for future saves
      sessionIdRef.current = restoredState.sessionId;
      
      // Trigger workout active state AFTER setting all data
      if (!session.isWorkoutActive) {
        // Manually set internal state to avoid resetting timer
        session.startWorkout();
        // Restore the timer state values after startWorkout resets them
        session.setElapsedTime(totalElapsedTime);
        session.setAccumulatedTime(Math.max(0, totalElapsedTime - (restoredState.isPaused ? 0 : Math.floor((new Date().getTime() - restoredState.startTime.getTime()) / 1000))));
        if (!restoredState.isPaused) {
          session.setLastResumeTime(restoredState.startTime);
        }
        
        // Restore pause state using proper context methods
        if (restoredState.isPaused) {
          session.pauseWorkout();
        }
      }

      console.log('✅ Workout session restored successfully');
      return true;
    } catch (error) {
      console.error('Failed to restore session state:', error);
      return false;
    }
  }, [session]);

  // Clear background data when workout ends
  const clearBackgroundData = useCallback(async () => {
    if (sessionIdRef.current) {
      try {
        await backgroundSessionService.clearSessionData(sessionIdRef.current);
        sessionIdRef.current = null;
        console.log('🧹 Background session data cleared');
      } catch (error) {
        console.error('Failed to clear background data:', error);
      }
    }
  }, []);

  // Auto-save on state changes (throttled)
  useEffect(() => {
    if (session.isWorkoutActive) {
      saveCurrentState();
    }
  }, [
    session.isWorkoutActive,
    session.elapsedTime,
    session.isPaused,
    session.currentExercises,
    session.workoutName,
    session.accumulatedTime,
    session.lastResumeTime,
    saveCurrentState,
  ]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('📱 App state changed:', appStateRef.current, '→', nextAppState);
      
      if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App going to background - save immediately
        console.log('💾 App backgrounding - saving state...');
        saveCurrentState();
      } else if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App coming to foreground - restore if needed
        console.log('🔄 App foregrounding - checking for active sessions...');
        if (!session.isWorkoutActive) {
          restoreSessionState();
        }
      }
      
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [saveCurrentState, restoreSessionState, session.isWorkoutActive]);

  // Restore session on hook mount (app launch)
  useEffect(() => {
    // Only restore if no active workout
    if (!session.isWorkoutActive) {
      restoreSessionState();
    }
    
    // Cleanup old sessions on app start
    backgroundSessionService.cleanupOldSessions();
  }, []);

  // Clean up when workout ends
  useEffect(() => {
    if (!session.isWorkoutActive && sessionIdRef.current) {
      clearBackgroundData();
    }
  }, [session.isWorkoutActive, clearBackgroundData]);

  return {
    // Expose methods for manual control if needed
    saveCurrentState,
    restoreSessionState,
    clearBackgroundData,
    sessionId: sessionIdRef.current,
  };
}
