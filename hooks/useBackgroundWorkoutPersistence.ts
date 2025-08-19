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
      // For timestamp-based timer, we need to calculate the correct resume time
      let resumeTime: Date;
      let currentElapsed: number;
      
      if (session.isPaused) {
        // If paused, use accumulated time as stored elapsed time
        resumeTime = new Date(); // Doesn't matter as timer is paused
        currentElapsed = session.accumulatedTime;
      } else {
        // If active, use lastResumeTime and calculate current elapsed
        if (session.lastResumeTime) {
          resumeTime = session.lastResumeTime;
          const currentSegmentElapsed = Math.floor((Date.now() - session.lastResumeTime.getTime()) / 1000);
          currentElapsed = session.accumulatedTime + currentSegmentElapsed;
        } else {
          // Fallback to session start time
          resumeTime = session.sessionStartTime || new Date();
          currentElapsed = session.elapsedTime;
        }
      }

      const state: SessionState = {
        sessionId,
        name: session.workoutName,
        startTime: resumeTime, // When current segment started (for active) or any time (for paused)
        elapsedTime: currentElapsed, // Current total elapsed time
        isPaused: session.isPaused,
        currentExercises: session.currentExercises,
        sessionMeta: session.sessionMeta,
      };

      await backgroundSessionService.saveSessionState(state);

      // Save workout timer state with accurate timestamp info
      await backgroundSessionService.saveTimerState({
        sessionId,
        timerType: 'workout',
        startTime: resumeTime, // When current active segment started
        duration: 0, // Open-ended workout timer
        elapsedWhenPaused: session.isPaused ? currentElapsed : session.accumulatedTime, // Accumulated time from completed segments
        isActive: !session.isPaused,
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
      
      // Calculate current elapsed time based on stored state
      let currentTotalElapsed: number;
      if (restoredState.isPaused) {
        // If was paused, use stored elapsed time
        currentTotalElapsed = restoredState.elapsedTime;
      } else {
        // If was active, calculate time elapsed since startTime
        const currentTime = new Date();
        const segmentElapsed = Math.floor((currentTime.getTime() - restoredState.startTime.getTime()) / 1000);
        currentTotalElapsed = restoredState.elapsedTime + segmentElapsed;
      }
      
      // Restore session data using existing context methods
      session.setWorkoutName(restoredState.name);
      session.setCurrentExercises(restoredState.currentExercises);
      session.setSessionMeta(restoredState.sessionMeta);
      
      // For timestamp-based timer, restore timer state properly
      if (restoredState.isPaused) {
        session.setAccumulatedTime(restoredState.elapsedTime);
        session.setElapsedTime(restoredState.elapsedTime);
        session.setLastResumeTime(null);
        // Don't call setIsPaused directly - let the context handle it
      } else {
        session.setAccumulatedTime(restoredState.elapsedTime); // Time from previous segments
        session.setLastResumeTime(restoredState.startTime); // When current segment started
        session.setElapsedTime(currentTotalElapsed);
        // Don't call setIsPaused directly - let the context handle it
      }
      
      // Set session ID for future saves
      sessionIdRef.current = restoredState.sessionId;
      
      // Trigger workout active state AFTER setting all data
      if (!session.isWorkoutActive) {
        // Manually set internal state to avoid resetting timer
        session.startWorkout();
        // Restore the timer state values after startWorkout resets them
        session.setElapsedTime(currentTotalElapsed);
        session.setAccumulatedTime(restoredState.elapsedTime);
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
