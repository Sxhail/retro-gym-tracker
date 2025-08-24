import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { saveCardioSession, type CardioSessionData, type CardioType } from '../services/cardioTracking';

interface CardioSessionContextType {
  // Session state
  isActive: boolean;
  isPaused: boolean;
  cardioType: CardioType | null;
  sessionName: string;
  sessionStartTime: Date | null;
  elapsedTime: number;
  accumulatedTime: number; // Time from completed segments
  lastResumeTime: Date | null;
  
  // HIIT specific
  workTime: number;
  restTime: number;
  rounds: number;
  currentRound: number;
  isWorkPhase: boolean;
  
  // Walk-Run specific
  runTime: number;
  walkTime: number;
  laps: number;
  currentLap: number;
  isRunPhase: boolean;
  
  // Casual Walk specific
  totalLaps: number;
  
  // Common timer state
  phaseTimeLeft: number;
  isGetReady: boolean;
  getReadyTimeLeft: number;
  
  // Methods
  startSession: (type: CardioType, name: string, config: any, options?: { skipGetReady?: boolean }) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => Promise<void>;
  resetSession: () => void;
  nextPhase: () => void;
  restoreFromPersistence: (restored: Partial<CardioSessionContextType> & { cardioType: CardioType; sessionName: string }) => void;
  // Phase completion callback (for global notifications)
  onPhaseComplete: ((event: 'hiit_work_complete' | 'hiit_rest_complete' | 'walk_run_run_complete' | 'walk_run_walk_complete') => void) | null;
  setOnPhaseComplete: (cb: ((event: 'hiit_work_complete' | 'hiit_rest_complete' | 'walk_run_run_complete' | 'walk_run_walk_complete') => void) | null) => void;
  
  // Background persistence
  setElapsedTime: (time: number) => void;
  setAccumulatedTime: (time: number) => void;
  setLastResumeTime: (time: Date | null) => void;
  setIsPaused: (paused: boolean) => void;
  setIsActive: (active: boolean) => void;
}

const CardioSessionContext = createContext<CardioSessionContextType | undefined>(undefined);

export function useCardioSession() {
  const context = useContext(CardioSessionContext);
  if (context === undefined) {
    throw new Error('useCardioSession must be used within a CardioSessionProvider');
  }
  return context;
}

interface CardioSessionProviderProps {
  children: ReactNode;
}

export function CardioSessionProvider({ children }: CardioSessionProviderProps) {
  // Session state
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [cardioType, setCardioType] = useState<CardioType | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [accumulatedTime, setAccumulatedTime] = useState(0); // For background persistence
  const [lastResumeTime, setLastResumeTime] = useState<Date | null>(null);
  
  // HIIT specific
  const [workTime, setWorkTime] = useState(20);
  const [restTime, setRestTime] = useState(10);
  const [rounds, setRounds] = useState(8);
  const [currentRound, setCurrentRound] = useState(1);
  const [isWorkPhase, setIsWorkPhase] = useState(true);
  
  // Walk-Run specific
  const [runTime, setRunTime] = useState(30);
  const [walkTime, setWalkTime] = useState(30);
  const [laps, setLaps] = useState(4);
  const [currentLap, setCurrentLap] = useState(1);
  const [isRunPhase, setIsRunPhase] = useState(true);
  
  // Casual Walk specific
  const [totalLaps, setTotalLaps] = useState(1);
  
  // Common timer state
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(10); // Get ready time
  const [isGetReady, setIsGetReady] = useState(false);
  const [getReadyTimeLeft, setGetReadyTimeLeft] = useState(10);
  
  // Timer refs
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accumulatedTimeRef = useRef(0);
  const completionAlertShownRef = useRef(false);
  // Guard to prevent multiple rapid phase transitions in the same tick/window
  const phaseTransitioningRef = useRef(false);
  const [onPhaseComplete, setOnPhaseComplete] = useState<((event: 'hiit_work_complete' | 'hiit_rest_complete' | 'walk_run_run_complete' | 'walk_run_walk_complete') => void) | null>(null);

  // Start a cardio session (simplified)
  const startSession = (type: CardioType, name: string, config: any, options?: { skipGetReady?: boolean }) => {
    const now = new Date();
    
    setCardioType(type);
    setSessionName(name);
    setSessionStartTime(now);
    setLastResumeTime(now);
    setElapsedTime(0);
    setAccumulatedTime(0);
    accumulatedTimeRef.current = 0;
    setIsPaused(false);
    setIsActive(true);
    completionAlertShownRef.current = false;
    
    // Reset phase state
    setCurrentRound(1);
    setCurrentLap(1);
    
    // Set up type-specific configuration
    if (type === 'hiit') {
      setWorkTime(config.workTime || 20);
      setRestTime(config.restTime || 10);
      setRounds(config.rounds || 8);
      setIsWorkPhase(true);
      const initialWork = config.workTime || 20;
      setPhaseTimeLeft(initialWork);
      if (options?.skipGetReady) {
        setIsGetReady(false);
        setGetReadyTimeLeft(0);
      } else {
        setIsGetReady(true);
        setGetReadyTimeLeft(10);
      }
    } else if (type === 'walk_run') {
      setRunTime(config.runTime || 30);
      setWalkTime(config.walkTime || 30);
      setLaps(config.laps || 4);
      setIsRunPhase(true);
      const initialRun = config.runTime || 30;
      setPhaseTimeLeft(initialRun);
      if (options?.skipGetReady) {
        setIsGetReady(false);
        setGetReadyTimeLeft(0);
      } else {
        setIsGetReady(true);
        setGetReadyTimeLeft(10);
      }
    } else if (type === 'casual_walk') {
      setTotalLaps(config.totalLaps || 1);
      setPhaseTimeLeft(0);
      setIsGetReady(false);
      setGetReadyTimeLeft(0);
    }
    
    console.log('🚀 Cardio session started:', { type, name, config });

    // Persist initial state
    setTimeout(() => {
      try {
        const { saveCurrentState } = (require('../hooks/useCardioBackgroundPersistence') as any);
        if (typeof saveCurrentState === 'function') saveCurrentState();
      } catch {}
    }, 100);

    // Pre-schedule iOS local notifications for the entire session
    (async () => {
      try {
        const NotificationService = (await import('../services/notifications')).default;
        // Cancel any previous queued items to avoid overlap
        await NotificationService.cancelAllPending();

        const sessionId = `cardio-${type}-${now.getTime()}`;
        let cursorMs = 0;
        const work = type === 'hiit' ? (config.workTime || 20) : (type === 'walk_run' ? (config.runTime || 30) : 0);
        const rest = type === 'hiit' ? (config.restTime || 10) : (type === 'walk_run' ? (config.walkTime || 30) : 0);
        const count = type === 'hiit' ? (config.rounds || 8) : (type === 'walk_run' ? (config.laps || 4) : 0);

        const getReady = options?.skipGetReady ? 0 : 10;
        cursorMs += getReady * 1000; // start after get-ready, if any

        if (type === 'hiit') {
          for (let r = 1; r <= count; r++) {
            // Work phase ends → Scenario 2
            cursorMs += work * 1000;
            await NotificationService.scheduleAbsolute(
              sessionId,
              new Date(now.getTime() + cursorMs),
              'Work phase done',
              'Time to rest.'
            );
            // Last rest completion leads to completion instead of next
            if (r === count) break;
            // Rest phase ends → Scenario 3
            cursorMs += rest * 1000;
            await NotificationService.scheduleAbsolute(
              sessionId,
              new Date(now.getTime() + cursorMs),
              'Rest over',
              'Get moving!'
            );
          }
          // Final completion → Scenario 4
          if (rest > 0) {
            // If count>0, the loop ended after adding last work end; add final rest to reach session total
            cursorMs += rest * 1000;
          }
          await NotificationService.scheduleAbsolute(
            sessionId,
            new Date(now.getTime() + cursorMs),
            'HIIT session complete',
            'Well done!'
          );
        } else if (type === 'walk_run') {
          for (let lap = 1; lap <= count; lap++) {
            // Run ends → Scenario 5
            cursorMs += work * 1000;
            await NotificationService.scheduleAbsolute(
              sessionId,
              new Date(now.getTime() + cursorMs),
              'Run done',
              'Switch to walking.'
            );
            if (lap === count) break;
            // Walk ends → Scenario 6
            cursorMs += rest * 1000;
            await NotificationService.scheduleAbsolute(
              sessionId,
              new Date(now.getTime() + cursorMs),
              'Walk done',
              'Time to run!'
            );
          }
          // Final completion → Scenario 7
          if (rest > 0) {
            cursorMs += rest * 1000;
          }
          await NotificationService.scheduleAbsolute(
            sessionId,
            new Date(now.getTime() + cursorMs),
            'Walk/Run session complete',
            'Great job!'
          );
        }
      } catch (e) {
        console.warn('Failed to pre-schedule cardio iOS notifications', e);
      }
    })();
  };

  // Pause session (simplified)
  const pauseSession = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Add current segment time to accumulated time
    if (lastResumeTime) {
      const segmentDuration = Math.floor((Date.now() - lastResumeTime.getTime()) / 1000);
      accumulatedTimeRef.current += segmentDuration;
      setAccumulatedTime(accumulatedTimeRef.current);
    }
    
    setIsPaused(true);
    setLastResumeTime(null);
    
    console.log('⏸️ Cardio session paused - accumulated:', accumulatedTimeRef.current);
    // Persist on pause
    (async () => {
      try {
        const hook = await import('../hooks/useCardioBackgroundPersistence');
        (hook as any)?.saveCurrentState?.();
      } catch {}
    })();
  };

  // Resume session (simplified)
  const resumeSession = () => {
    const now = new Date();
    setLastResumeTime(now);
    setIsPaused(false);
    
    console.log('▶️ Cardio session resumed at:', now.toISOString());
    // Persist on resume
    (async () => {
      try {
        const hook = await import('../hooks/useCardioBackgroundPersistence');
        (hook as any)?.saveCurrentState?.();
      } catch {}
    })();
  };

  // Move to next phase (simplified for HIIT and Walk-Run)
  const nextPhase = () => {
    console.log('🔄 nextPhase called:', { cardioType, isWorkPhase, currentRound, rounds, isRunPhase, currentLap, laps });

    // Debounce/guard to avoid cascading transitions in the same second
    if (phaseTransitioningRef.current) {
      console.log('⏱️ Skipping nextPhase due to transition guard');
      return;
    }
    phaseTransitioningRef.current = true;
    setTimeout(() => { phaseTransitioningRef.current = false; }, 400);
    // Anchor the new phase start immediately
    setLastResumeTime(new Date());
    
    if (cardioType === 'hiit') {
      if (isWorkPhase) {
        // Work phase finished, go to rest
        if (onPhaseComplete) onPhaseComplete('hiit_work_complete');
        setIsWorkPhase(false);
        setPhaseTimeLeft(restTime);
        console.log(`✅ Work phase ${currentRound}/${rounds} complete, starting rest (${restTime}s)`);
      } else {
        // Rest phase finished
        if (currentRound >= rounds) {
          // All rounds complete
          console.log('🎉 HIIT workout complete!');
          if (!completionAlertShownRef.current) {
            completionAlertShownRef.current = true;
            Alert.alert('Workout Complete!', `You completed ${rounds} rounds of HIIT!`, [
              { text: 'Finish', onPress: () => endSession() }
            ]);
          }
          return;
        } else {
          if (onPhaseComplete) onPhaseComplete('hiit_rest_complete');
          // Start next work phase
          setIsWorkPhase(true);
          setCurrentRound(prev => prev + 1);
          setPhaseTimeLeft(workTime);
          console.log(`✅ Rest complete, starting work phase ${currentRound + 1}/${rounds} (${workTime}s)`);
        }
      }
    } else if (cardioType === 'walk_run') {
      if (isRunPhase) {
        // Run phase finished, go to walk
        if (onPhaseComplete) onPhaseComplete('walk_run_run_complete');
        setIsRunPhase(false);
        setPhaseTimeLeft(walkTime);
        console.log(`✅ Run phase ${currentLap}/${laps} complete, starting walk (${walkTime}s)`);
      } else {
        // Walk phase finished
        if (currentLap >= laps) {
          // All laps complete
          console.log('🎉 Walk-Run workout complete!');
          if (!completionAlertShownRef.current) {
            completionAlertShownRef.current = true;
            Alert.alert('Workout Complete!', `You completed ${laps} laps of Walk-Run!`, [
              { text: 'Finish', onPress: () => endSession() }
            ]);
          }
          return;
        } else {
          if (onPhaseComplete) onPhaseComplete('walk_run_walk_complete');
          // Start next run phase
          setIsRunPhase(true);
          setCurrentLap(prev => prev + 1);
          setPhaseTimeLeft(runTime);
          console.log(`✅ Walk complete, starting run phase ${currentLap + 1}/${laps} (${runTime}s)`);
        }
      }
    }
  };

  // End session and save to database
  const endSession = async () => {
    console.log('🏁 endSession called');
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Calculate final elapsed time
    let finalElapsedTime = accumulatedTimeRef.current;
    if (lastResumeTime && !isPaused) {
      const currentSegmentTime = Math.floor((Date.now() - lastResumeTime.getTime()) / 1000);
      finalElapsedTime += currentSegmentTime;
      console.log(`📊 Adding current segment: ${currentSegmentTime}s, total: ${finalElapsedTime}s`);
    }
    
    // If no accumulated time, use elapsed time as fallback
    if (finalElapsedTime === 0 && elapsedTime > 0) {
      finalElapsedTime = elapsedTime;
      console.log(`📊 Using elapsedTime as fallback: ${finalElapsedTime}s`);
    }
    
    console.log('💾 Attempting to save cardio session:', {
      cardioType,
      sessionName,
      finalElapsedTime,
      isActive,
      accumulatedTime: accumulatedTimeRef.current,
      elapsedTime
    });
    
    // Ensure minimum session duration (at least 5 seconds for a meaningful workout)
    if (finalElapsedTime < 5) {
      finalElapsedTime = 5;
      console.log('⚠️ Minimum session time applied: 5 seconds');
    }
    
    if (cardioType && sessionName) {
      const sessionData: CardioSessionData = {
        type: cardioType,
        name: sessionName,
        duration: finalElapsedTime,
        work_time: cardioType === 'hiit' ? workTime : undefined,
        rest_time: cardioType === 'hiit' ? restTime : undefined,
        rounds: cardioType === 'hiit' ? rounds : undefined,
        run_time: cardioType === 'walk_run' ? runTime : undefined,
        walk_time: cardioType === 'walk_run' ? walkTime : undefined,
        laps: cardioType === 'walk_run' ? laps : undefined,
        total_laps: cardioType === 'casual_walk' ? totalLaps : undefined,
      };
      
      console.log('💾 Session data prepared:', sessionData);
      
      try {
        const savedId = await saveCardioSession(sessionData);
        console.log('✅ Cardio session saved successfully with ID:', savedId);
      } catch (error) {
        console.error('❌ Failed to save cardio session:', error);
        
        // Provide specific error handling like lift workouts
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        // Handle specific error cases
        if (errorMessage.includes('Session name cannot be empty')) {
          throw new Error('Please enter a session name.');
        } else if (errorMessage.includes('too long')) {
          throw new Error('Please shorten your session name or notes.');
        } else if (errorMessage.includes('must be greater than 0')) {
          throw new Error('Please check your session duration and configuration values.');
        } else if (errorMessage.includes('cannot be negative')) {
          throw new Error('Please check your time values - they cannot be negative.');
        } else if (errorMessage.includes('Database is busy')) {
          throw new Error('Database is busy. Please try again in a moment.');
        } else if (errorMessage.includes('Database schema is missing')) {
          throw new Error('Database error. Please restart the app and try again.');
        } else {
          throw new Error(`Failed to save workout: ${errorMessage}`);
        }
      }
    } else {
      console.warn('⚠️ Cardio session not saved - missing required data:', {
        cardioType,
        sessionName,
        finalElapsedTime
      });
      throw new Error('Failed to save workout: Missing session data (type or name)');
    }
    
    // Cancel pending notifications when ending early or finishing
    try {
      const NotificationService = (await import('../services/notifications')).default;
      await NotificationService.cancelAllPending();
    } catch {}

    resetSession();
  };

  // Reset session state
  const resetSession = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setIsActive(false);
    setIsPaused(false);
  setCardioType(null);
    setSessionName('');
    setSessionStartTime(null);
    setElapsedTime(0);
    setAccumulatedTime(0);
    accumulatedTimeRef.current = 0;
    setLastResumeTime(null);
    
    // Reset phase states
    setCurrentRound(1);
    setCurrentLap(1);
    setIsWorkPhase(true);
    setIsRunPhase(true);
    setPhaseTimeLeft(10);
    setIsGetReady(false);
    setGetReadyTimeLeft(10);
    completionAlertShownRef.current = false; // clear completion guard
    
    // Clear any pending notifications
    (async () => {
      try {
        const NotificationService = (await import('../services/notifications')).default;
        await NotificationService.cancelAllPending();
      } catch {}
    })();

    console.log('🔄 Cardio session reset');
    // Clear persisted state
    (async () => {
      try {
        const { cardioBackgroundService } = await import('../hooks/useCardioBackgroundPersistence');
        await cardioBackgroundService.clearCardioSessionState();
      } catch {}
    })();
  };

  // Timer effect - simplified timestamp-based like lift workout timer (accurate across background/app restarts)
  useEffect(() => {
    if (!isActive || isPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Start/resume timer - simplified approach like lift workout
    timerRef.current = setInterval(() => {
      if (lastResumeTime) {
        const now = new Date();
        const currentSegmentTime = Math.floor((now.getTime() - lastResumeTime.getTime()) / 1000);
        const totalElapsed = accumulatedTimeRef.current + currentSegmentTime;
        setElapsedTime(totalElapsed);

        // Handle get-ready countdown first (simplified)
        if ((cardioType === 'hiit' || cardioType === 'walk_run') && isGetReady) {
          const getReadyElapsed = Math.floor((now.getTime() - lastResumeTime.getTime()) / 1000);
          const getReadyRemaining = Math.max(0, 10 - getReadyElapsed);
          setGetReadyTimeLeft(getReadyRemaining);
          
          if (getReadyRemaining <= 0) {
            // End get-ready and start actual phase
            setIsGetReady(false);
            // Update accumulated time
            accumulatedTimeRef.current += 10;
            setAccumulatedTime(accumulatedTimeRef.current);
            setLastResumeTime(now);
            
            // Start first phase
            if (cardioType === 'hiit') {
              setIsWorkPhase(true);
              setPhaseTimeLeft(workTime);
            } else if (cardioType === 'walk_run') {
              setIsRunPhase(true);
              setPhaseTimeLeft(runTime);
            }
            
            // Persist state change
            try {
              const { saveCurrentState } = (require('../hooks/useCardioBackgroundPersistence') as any);
              if (typeof saveCurrentState === 'function') saveCurrentState();
            } catch {}
          }
          return;
        }

        // Handle phase timers (simplified like lift workout timer)
        if ((cardioType === 'hiit' || cardioType === 'walk_run') && !isGetReady) {
          let phaseDuration = 0;

          if (cardioType === 'hiit') {
            // Clamp to at least 1s to avoid zero-length phases
            phaseDuration = isWorkPhase ? Math.max(1, workTime) : Math.max(1, restTime);
          } else if (cardioType === 'walk_run') {
            phaseDuration = isRunPhase ? Math.max(1, runTime) : Math.max(1, walkTime);
          }

          const phaseElapsed = Math.floor((now.getTime() - lastResumeTime.getTime()) / 1000);
          const phaseRemaining = Math.max(0, phaseDuration - phaseElapsed);
          setPhaseTimeLeft(phaseRemaining);

          // Phase completed - trigger next phase
          if (phaseElapsed >= phaseDuration) {
            console.log('🔄 Phase transition triggered');
            // Update accumulated time for completed phase
            accumulatedTimeRef.current += phaseDuration;
            setAccumulatedTime(accumulatedTimeRef.current);
            setLastResumeTime(now);
            
            nextPhase();
            
            // Persist state change
            try {
              const { saveCurrentState } = (require('../hooks/useCardioBackgroundPersistence') as any);
              if (typeof saveCurrentState === 'function') saveCurrentState();
            } catch {}
          }
        }
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive, isPaused, lastResumeTime, cardioType, workTime, restTime, runTime, walkTime, isWorkPhase, isRunPhase, isGetReady]);

  const restoreFromPersistence = (restored: Partial<CardioSessionContextType> & { cardioType: CardioType; sessionName: string }) => {
    // Basic identifiers
    setIsActive(true);
    setCardioType(restored.cardioType);
    setSessionName(restored.sessionName);
    setIsPaused(!!restored.isPaused);
    setElapsedTime(restored.elapsedTime ?? 0);
    setAccumulatedTime(restored.accumulatedTime ?? 0);
    accumulatedTimeRef.current = restored.accumulatedTime ?? 0;
    setLastResumeTime(restored.lastResumeTime ?? new Date());
    setSessionStartTime(restored.sessionStartTime ?? new Date());

    // Type-specific fields
    if (restored.cardioType === 'hiit') {
      if (typeof restored.workTime === 'number') setWorkTime(restored.workTime);
      if (typeof restored.restTime === 'number') setRestTime(restored.restTime);
      if (typeof restored.rounds === 'number') setRounds(restored.rounds);
      if (typeof restored.currentRound === 'number') setCurrentRound(restored.currentRound);
      if (typeof restored.isWorkPhase === 'boolean') setIsWorkPhase(restored.isWorkPhase);
    } else if (restored.cardioType === 'walk_run') {
      if (typeof restored.runTime === 'number') setRunTime(restored.runTime);
      if (typeof restored.walkTime === 'number') setWalkTime(restored.walkTime);
      if (typeof restored.laps === 'number') setLaps(restored.laps);
      if (typeof restored.currentLap === 'number') setCurrentLap(restored.currentLap);
      if (typeof restored.isRunPhase === 'boolean') setIsRunPhase(restored.isRunPhase);
    } else if (restored.cardioType === 'casual_walk') {
      if (typeof restored.totalLaps === 'number') setTotalLaps(restored.totalLaps);
    }

    // Timers
    if (typeof restored.phaseTimeLeft === 'number') setPhaseTimeLeft(restored.phaseTimeLeft);
    if (typeof restored.isGetReady === 'boolean') {
      setIsGetReady(restored.isGetReady);
      if (typeof restored.getReadyTimeLeft === 'number') {
        setGetReadyTimeLeft(restored.getReadyTimeLeft);
      } else if (restored.isGetReady) {
        setGetReadyTimeLeft(10);
      } else {
        setGetReadyTimeLeft(0);
      }
    } else {
      setIsGetReady(false);
      setGetReadyTimeLeft(0);
    }
  };

  const contextValue: CardioSessionContextType = {
    // Session state
    isActive,
    isPaused,
    cardioType,
    sessionName,
    sessionStartTime,
    elapsedTime,
    accumulatedTime,
    lastResumeTime,
    
    // HIIT specific
    workTime,
    restTime,
    rounds,
    currentRound,
    isWorkPhase,
    
    // Walk-Run specific
    runTime,
    walkTime,
    laps,
    currentLap,
    isRunPhase,
    
    // Casual Walk specific
    totalLaps,
    
    // Common timer state
    phaseTimeLeft,
    isGetReady,
    getReadyTimeLeft,    // Methods
  startSession,
    pauseSession,
    resumeSession,
    endSession,
    resetSession,
    nextPhase,
  restoreFromPersistence,
  onPhaseComplete,
  setOnPhaseComplete,
    
    // Background persistence setters
    setElapsedTime,
    setAccumulatedTime,
    setLastResumeTime,
    setIsPaused,
    setIsActive,
  };

  return (
    <CardioSessionContext.Provider value={contextValue}>
      {children}
    </CardioSessionContext.Provider>
  );
}
