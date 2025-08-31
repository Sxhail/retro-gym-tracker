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
  const ensureRestSessionId = useCallback(async () => {
    if (!session.globalRestTimer?.isActive) {
      restSessionIdRef.current = null;
      return null;
    }
    
    if (!restSessionIdRef.current) {
      // MINIMAL CLEANUP: Only clean up clearly expired timers to avoid race conditions
      // with the notification system. Don't clean up all timers blindly.
      try {
        const { db } = await import('../db/client');
        const { active_session_timers } = await import('../db/schema');
        const { eq } = await import('drizzle-orm');
        
        const existingRestTimers = await db
          .select()
          .from(active_session_timers)
          .where(eq(active_session_timers.timer_type, 'rest'));
        
        const now = Date.now();
        let cleanedCount = 0;
        
        // Only clean up timers that are clearly expired (more than 30 minutes old)
        // to avoid interfering with recently scheduled notifications
        for (const timer of existingRestTimers) {
          const startTime = new Date(timer.start_time).getTime();
          const age = Math.floor((now - startTime) / 1000);
          const remaining = Math.max(0, timer.duration - age);
          
          // Clean up if expired for more than 10 minutes or absurdly old (24h)
          if (age > timer.duration + 600 || age > 24 * 60 * 60) {
            await backgroundSessionService.clearTimerData(timer.session_id, 'rest');
            cleanedCount++;
          }
        }
        
        if (cleanedCount > 0) {
          console.log('🧹 Cleaned up', cleanedCount, 'expired rest timer records (preserving active ones)');
        }
      } catch (error) {
        console.error('Failed to cleanup expired rest timers in ensureRestSessionId:', error);
      }
      
      restSessionIdRef.current = `rest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('🆔 Generated new rest session ID:', restSessionIdRef.current);
    }
    return restSessionIdRef.current;
  }, [session.globalRestTimer?.isActive]);

  // Save current rest timer state to background storage
  const saveRestTimerState = useCallback(async () => {
    const sessionId = await ensureRestSessionId();
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
      
      // CRITICAL: Clean up all old rest timers before restoring any
      const now = new Date();
      let validRestTimers = [];
      
    let expiredFound = false;
    for (const restTimer of activeRestTimers) {
        const startTime = new Date(restTimer.start_time);
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        const remaining = Math.max(0, restTimer.duration - elapsed);
        
        // ENHANCED: More aggressive cleanup - if timer is more than 10 minutes old or finished
        if (elapsed > 10 * 60 || remaining <= 0) {
          console.log('🧹 Cleaning up old/finished rest timer:', {
            elapsed: elapsed,
            remaining: remaining,
            sessionId: restTimer.session_id,
            age: `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`
          });
          await backgroundSessionService.clearTimerData(restTimer.session_id, 'rest');
      if (remaining <= 0) expiredFound = true;
        } else {
          validRestTimers.push({ restTimer, remaining, elapsed });
        }
      }
      
      // ENHANCED: Only restore the MOST RECENT timer (prevent conflicts)
      if (validRestTimers.length === 1) {
        const { restTimer, remaining } = validRestTimers[0];
        
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
      } else if (validRestTimers.length > 1) {
        // ENHANCED: Multiple timers found - this is an error state, clean ALL up to prevent conflicts
        console.warn('🚨 Multiple rest timers found (' + validRestTimers.length + '), cleaning ALL up to prevent conflicts');
        
        // Find most recent timer by start time
        validRestTimers.sort((a, b) => new Date(b.restTimer.start_time).getTime() - new Date(a.restTimer.start_time).getTime());
        const mostRecent = validRestTimers[0];
        
        // Clean up ALL timers (including the most recent one to avoid conflicts)
        for (const { restTimer } of validRestTimers) {
          await backgroundSessionService.clearTimerData(restTimer.session_id, 'rest');
        }
        
        console.log('🧹 All conflicting rest timers cleaned up. Most recent was:', {
          remaining: mostRecent.remaining,
          sessionId: mostRecent.restTimer.session_id
        });
      }
      
      // If a rest timer expired while we were away, trigger the completion callback for UX
      if (expiredFound && session.onRestTimerComplete) {
        try {
          // Defer slightly so UI is ready
          setTimeout(() => {
            session.onRestTimerComplete && session.onRestTimerComplete();
          }, 300);
        } catch {}
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

  // Auto-save on rest timer state changes (do not require isRestored)
  useEffect(() => {
    if (session.globalRestTimer?.isActive) {
      saveRestTimerState();
    }
  }, [
    session.globalRestTimer?.isActive,
    session.globalRestTimer?.timeRemaining,
    session.globalRestTimer?.startTime,
    saveRestTimerState,
  ]);

  // Save immediately when a rest timer starts (first frame)
  // BUT delay it to allow notification system to schedule first
  useEffect(() => {
    if (session.globalRestTimer?.isActive && session.globalRestTimer.startTime) {
      // Add a small delay to ensure notification scheduling completes first
      const timeout = setTimeout(() => {
        saveRestTimerState();
      }, 200); // 200ms delay to avoid race condition
      return () => clearTimeout(timeout);
    }
  }, [session.globalRestTimer?.isActive]);

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
        // App coming to foreground - restore if needed, but only if timer isn't already active
        console.log('🔄 App foregrounding - checking for active rest timers...');
        if (!session.globalRestTimer?.isActive && !isRestored) {
          // Add a small delay to ensure app state is stable before restoration
          setTimeout(() => {
            if (!session.globalRestTimer?.isActive && !isRestored) {
              restoreRestTimerState();
            }
          }, 1000);
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
      // Try immediately
      restoreRestTimerState();
      // Try again shortly after to allow workout restoration to complete
      const t = setTimeout(() => {
        if (!isRestored && !session.globalRestTimer?.isActive) {
          restoreRestTimerState();
        }
      }, 800);
      return () => clearTimeout(t);
    }
  }, [restoreRestTimerState, isRestored]);

  // If workout becomes active after launch, attempt rest timer restore once
  useEffect(() => {
    if (!isRestored && session.isWorkoutActive && !session.globalRestTimer?.isActive) {
      restoreRestTimerState();
    }
  }, [session.isWorkoutActive, session.globalRestTimer?.isActive, isRestored, restoreRestTimerState]);

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
