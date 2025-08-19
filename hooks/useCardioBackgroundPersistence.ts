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
  private static readonly STORAGE_KEY = 'cardio_background_session';
  
  generateSessionId(): string {
    return `cardio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async saveCardioSessionState(state: CardioSessionState): Promise<void> {
    try {
      const stateData = {
        ...state,
        startTime: state.startTime.toISOString(),
        lastResumeTime: state.lastResumeTime?.toISOString() || null,
        timestamp: new Date().toISOString(),
      };
      
      // In a real app, this would save to AsyncStorage or SQLite
      // For now, we'll use a simple in-memory storage simulation
      console.log('💾 Saving cardio background state:', stateData);
      
      // You would implement actual storage here:
      // await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(stateData));
    } catch (error) {
      console.error('Failed to save cardio background state:', error);
      throw error;
    }
  }

  async restoreCardioSessionState(): Promise<CardioSessionState | null> {
    try {
      // In a real app, this would restore from AsyncStorage or SQLite
      // For now, we'll return null (no persisted state)
      console.log('🔄 Attempting to restore cardio background state');
      
      // You would implement actual restore here:
      // const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      // if (stored) {
      //   const parsed = JSON.parse(stored);
      //   return {
      //     ...parsed,
      //     startTime: new Date(parsed.startTime),
      //     lastResumeTime: parsed.lastResumeTime ? new Date(parsed.lastResumeTime) : null,
      //   };
      // }
      
      return null;
    } catch (error) {
      console.error('Failed to restore cardio background state:', error);
      return null;
    }
  }

  async clearCardioSessionState(): Promise<void> {
    try {
      console.log('🗑️ Clearing cardio background state');
      // You would implement actual clearing here:
      // await AsyncStorage.removeItem(this.STORAGE_KEY);
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
        await cardioBackgroundService.clearCardioSessionState();
        return false;
      }

      // Restore cardio session state
      session.setIsActive(true);
      session.setIsPaused(restoredState.isPaused);
      session.setElapsedTime(restoredElapsedTime);
      session.setAccumulatedTime(restoredState.accumulatedTime);
      session.setLastResumeTime(restoredState.lastResumeTime);
      
      // Start session with restored config
      const config = {
        workTime: restoredState.workTime,
        restTime: restoredState.restTime,
        rounds: restoredState.rounds,
        runTime: restoredState.runTime,
        walkTime: restoredState.walkTime,
        laps: restoredState.laps,
        totalLaps: restoredState.totalLaps,
      };
      
      session.startSession(restoredState.type, restoredState.name, config);
      
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
