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
      const state: SessionState = {
        sessionId,
        name: session.workoutName,
        startTime: session.sessionStartTime,
        elapsedTime: session.elapsedTime,
        isPaused: session.isPaused,
        currentExercises: session.currentExercises,
        sessionMeta: session.sessionMeta,
      };

      await backgroundSessionService.saveSessionState(state);

      // Save workout timer state
      await backgroundSessionService.saveTimerState({
        sessionId,
        timerType: 'workout',
        startTime: session.sessionStartTime,
        duration: 0, // Open-ended workout timer
        elapsedWhenPaused: session.elapsedTime,
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
      
      // Restore session data using existing context methods
      session.setWorkoutName(restoredState.name);
      session.setCurrentExercises(restoredState.currentExercises);
      session.setSessionMeta(restoredState.sessionMeta);
      session.setElapsedTime(restoredState.elapsedTime);
      session.setIsPaused(restoredState.isPaused);
      
      // Set session ID for future saves
      sessionIdRef.current = restoredState.sessionId;
      
      // Trigger workout active state AFTER setting all data
      if (!session.isWorkoutActive) {
        // Manually set internal state to avoid resetting timer
        session.startWorkout();
        // Override the reset elapsed time from startWorkout
        session.setElapsedTime(restoredState.elapsedTime);
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
