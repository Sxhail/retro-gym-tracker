import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
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
  
  // Methods
  startSession: (type: CardioType, name: string, config: any) => void;
  pauseSession: () => void;
  resumeSession: () => void;
  endSession: () => Promise<void>;
  resetSession: () => void;
  nextPhase: () => void;
  
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
  
  // Timer refs
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accumulatedTimeRef = useRef(0);

  // Start a cardio session
  const startSession = (type: CardioType, name: string, config: any) => {
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
    
    // Reset phase state
    setCurrentRound(1);
    setCurrentLap(1);
    
    // Set up type-specific configuration
    if (type === 'hiit') {
      setWorkTime(config.workTime || 20);
      setRestTime(config.restTime || 10);
      setRounds(config.rounds || 8);
      setIsWorkPhase(true);
      setPhaseTimeLeft(config.workTime || 20);
    } else if (type === 'walk_run') {
      setRunTime(config.runTime || 30);
      setWalkTime(config.walkTime || 30);
      setLaps(config.laps || 4);
      setIsRunPhase(true);
      setPhaseTimeLeft(config.runTime || 30);
    } else if (type === 'casual_walk') {
      setTotalLaps(config.totalLaps || 1);
      setPhaseTimeLeft(0); // Free running timer
    }
    
    console.log('🚀 Cardio session started:', { type, name, config });
  };

  // Pause session
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
  };

  // Resume session
  const resumeSession = () => {
    const now = new Date();
    setLastResumeTime(now);
    setIsPaused(false);
    
    console.log('▶️ Cardio session resumed at:', now.toISOString());
  };

  // Move to next phase (for HIIT and Walk-Run)
  const nextPhase = () => {
    if (cardioType === 'hiit') {
      if (isWorkPhase) {
        if (currentRound < rounds) {
          setIsWorkPhase(false);
          setPhaseTimeLeft(restTime);
        } else {
          // Workout complete
          endSession();
          return;
        }
      } else {
        setIsWorkPhase(true);
        setCurrentRound(prev => prev + 1);
        setPhaseTimeLeft(workTime);
      }
    } else if (cardioType === 'walk_run') {
      if (isRunPhase) {
        if (currentLap < laps) {
          setIsRunPhase(false);
          setPhaseTimeLeft(walkTime);
        } else {
          // Workout complete
          endSession();
          return;
        }
      } else {
        setIsRunPhase(true);
        setCurrentLap(prev => prev + 1);
        setPhaseTimeLeft(runTime);
      }
    }
  };

  // End session and save to database
  const endSession = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Calculate final elapsed time
    let finalElapsedTime = accumulatedTimeRef.current;
    if (lastResumeTime && !isPaused) {
      finalElapsedTime += Math.floor((Date.now() - lastResumeTime.getTime()) / 1000);
    }
    
    if (finalElapsedTime > 0 && cardioType && sessionName) {
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
      
      try {
        await saveCardioSession(sessionData);
        console.log('💾 Cardio session saved:', sessionData);
      } catch (error) {
        console.error('❌ Failed to save cardio session:', error);
        throw error;
      }
    }
    
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
    
    console.log('🔄 Cardio session reset');
  };

  // Timer effect - similar to lift workout timer
  useEffect(() => {
    if (!isActive || isPaused) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Start/resume timer
    timerRef.current = setInterval(() => {
      if (lastResumeTime) {
        const currentSegmentTime = Math.floor((Date.now() - lastResumeTime.getTime()) / 1000);
        const totalElapsed = accumulatedTimeRef.current + currentSegmentTime;
        setElapsedTime(totalElapsed);
        
        // Handle phase transitions for HIIT and Walk-Run
        if (cardioType === 'hiit' || cardioType === 'walk_run') {
          setPhaseTimeLeft(prev => {
            if (prev <= 1) {
              nextPhase();
              return 0;
            }
            return prev - 1;
          });
        }
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive, isPaused, lastResumeTime, cardioType, accumulatedTime]);

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
    
    // Methods
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    resetSession,
    nextPhase,
    
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
