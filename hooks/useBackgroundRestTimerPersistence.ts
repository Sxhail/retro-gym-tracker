import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useWorkoutSession } from '../context/WorkoutSessionContext';
import { backgroundSessionService } from '../services/backgroundSession';

/**
 * Background Rest Timer Persistence Hook
 * Handles rest timer background persistence similar to main workout timer
 */
export function useBackgroundRestTimerPersistence() {
  const session = useWorkoutSession();
  const restSessionIdRef = useRef<string | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const lastSaveTime = useRef<number>(0);
  const [isRestored, setIsRestored] = useState(false);

  // Generate session ID when rest timer starts
  const ensureRestSessionId = useCallback(() => {
    if (!restSessionIdRef.current && session.globalRestTimer?.isActive) {
      restSessionIdRef.current = `rest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('🆔 Generated rest session ID:', restSessionIdRef.current);
    }
    return restSessionIdRef.current;
  }, [session.globalRestTimer?.isActive]);

  // Save current rest timer state to background storage
  const saveRestTimerState = useCallback(async () => {
    const sessionId = ensureRestSessionId();
    if (!sessionId || !session.globalRestTimer?.isActive || !session.globalRestTimer.startTime) {
      return;
    }

    // Throttle saves to avoid excessive database writes
    const now = Date.now();
    if (now - lastSaveTime.current < 1000) {
      return;
    }
    lastSaveTime.current = now;

    try {
      await backgroundSessionService.saveTimerState({
        sessionId,
        timerType: 'rest',
        startTime: session.globalRestTimer.startTime,
        duration: session.globalRestTimer.originalDuration,
        elapsedWhenPaused: 0,
        isActive: true,
      });
      
      console.log('🔄 Rest timer saved to background:', {
        sessionId,
        duration: session.globalRestTimer.originalDuration,
        startTime: session.globalRestTimer.startTime.toISOString()
      });
    } catch (error) {
      console.error('Failed to save rest timer state:', error);
    }
  }, [session.globalRestTimer, ensureRestSessionId]);

  // Restore rest timer state on app launch
  const restoreRestTimerState = useCallback(async () => {
    if (isRestored || session.globalRestTimer?.isActive) {
      return false; // Already restored or timer already active
    }

    // CRITICAL: Only restore if there's actually an active workout session
    if (!session.isWorkoutActive) {
      console.log('🚫 Skipping rest timer restoration - no active workout session');
      setIsRestored(true);
      return false;
    }

    try {
      const { db } = await import('../db/client');
      const { active_session_timers } = await import('../db/schema');
      const { eq } = await import('drizzle-orm');
      
      // Look for any active rest timers
      const activeRestTimers = await db
        .select()
        .from(active_session_timers)
        .where(
          eq(active_session_timers.timer_type, 'rest')
        );
      
      if (activeRestTimers.length > 0) {
        const restTimer = activeRestTimers[0];
        const startTime = new Date(restTimer.start_time);
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        const remaining = Math.max(0, restTimer.duration - elapsed);
        
        // Check if timer is too old (more than 24 hours) - clean it up
        if (elapsed > 24 * 60 * 60) {
          console.log('🧹 Cleaning up old rest timer (> 24 hours)');
          await backgroundSessionService.clearTimerData(restTimer.session_id, 'rest');
          setIsRestored(true);
          return false;
        }
        
        if (remaining > 0) {
          // Set restored flag BEFORE setting timer to prevent completion callback
          setIsRestored(true);
          
          // Calculate the correct start time for continued counting
          const adjustedStartTime = new Date(now.getTime() - (restTimer.duration - remaining) * 1000);
          
          session.setGlobalRestTimer({
            isActive: true,
            timeRemaining: remaining,
            originalDuration: restTimer.duration,
            exerciseId: null,
            setIdx: null,
            startTime: adjustedStartTime, // Use calculated start time for accurate countdown
          });
          restSessionIdRef.current = restTimer.session_id;
          console.log('✅ Rest timer restored from background:', remaining, 'seconds remaining');
          
          // CRITICAL: Do not trigger completion callback during restoration
          return true;
        } else {
          // Timer finished while app was closed, clean up silently WITHOUT triggering callback
          await backgroundSessionService.clearTimerData(restTimer.session_id, 'rest');
          console.log('🔄 Rest timer finished while app was closed, cleaned up silently');
          
          // CRITICAL: Set restored flag to prevent any completion callbacks
          setIsRestored(true);
        }
      }
      
      setIsRestored(true);
      return false;
    } catch (error) {
      console.error('Failed to restore rest timer state:', error);
      setIsRestored(true);
      return false;
    }
  }, [session, isRestored]);

  // Clear background data when rest timer ends
  const clearRestTimerData = useCallback(async () => {
    if (restSessionIdRef.current) {
      try {
        await backgroundSessionService.clearTimerData(restSessionIdRef.current, 'rest');
        restSessionIdRef.current = null;
        console.log('🧹 Rest timer background data cleared');
      } catch (error) {
        console.error('Failed to clear rest timer data:', error);
      }
    }
  }, []);

  // Auto-save on rest timer state changes
  useEffect(() => {
    if (session.globalRestTimer?.isActive && isRestored) {
      saveRestTimerState();
    }
  }, [
    session.globalRestTimer?.isActive,
    session.globalRestTimer?.timeRemaining,
    session.globalRestTimer?.startTime,
    isRestored,
    saveRestTimerState,
  ]);

  // Handle app state changes for rest timer
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App going to background - save rest timer immediately
        if (session.globalRestTimer?.isActive) {
          console.log('💾 App backgrounding - saving rest timer state...');
          saveRestTimerState();
        }
      } else if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App coming to foreground - restore if needed
        console.log('🔄 App foregrounding - checking for active rest timers...');
        if (!session.globalRestTimer?.isActive && !isRestored) {
          restoreRestTimerState();
        }
      }
      
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [saveRestTimerState, restoreRestTimerState, session.globalRestTimer?.isActive, isRestored]);

  // Restore rest timer on hook mount (app launch)
  useEffect(() => {
    if (!isRestored) {
      restoreRestTimerState();
    }
  }, [restoreRestTimerState, isRestored]);

  // Clean up when rest timer ends
  useEffect(() => {
    if (!session.globalRestTimer?.isActive && restSessionIdRef.current) {
      clearRestTimerData();
    }
  }, [session.globalRestTimer?.isActive, clearRestTimerData]);

  return {
    saveRestTimerState,
    restoreRestTimerState,
    clearRestTimerData,
    restSessionId: restSessionIdRef.current,
    isRestored,
  };
}
