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
    console.log('🔄 nextPhase called:', { cardioType, isWorkPhase, currentRound, rounds, isRunPhase, currentLap, laps });
    
    if (cardioType === 'hiit') {
      if (isWorkPhase) {
        // Work phase finished, go to rest
        setIsWorkPhase(false);
        setPhaseTimeLeft(restTime);
        console.log(`✅ Work phase ${currentRound}/${rounds} complete, starting rest (${restTime}s)`);
      } else {
        // Rest phase finished
        if (currentRound >= rounds) {
          // All rounds complete
          console.log('🎉 HIIT workout complete!');
          Alert.alert('Workout Complete!', `You completed ${rounds} rounds of HIIT!`, [
            { text: 'Finish', onPress: () => endSession() }
          ]);
          return;
        } else {
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
        setIsRunPhase(false);
        setPhaseTimeLeft(walkTime);
        console.log(`✅ Run phase ${currentLap}/${laps} complete, starting walk (${walkTime}s)`);
      } else {
        // Walk phase finished
        if (currentLap >= laps) {
          // All laps complete
          console.log('🎉 Walk-Run workout complete!');
          Alert.alert('Workout Complete!', `You completed ${laps} laps of Walk-Run!`, [
            { text: 'Finish', onPress: () => endSession() }
          ]);
          return;
        } else {
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
            const newTime = prev - 1;
            console.log(`⏰ Phase time: ${newTime}, Type: ${cardioType}, Phase: ${cardioType === 'hiit' ? (isWorkPhase ? 'WORK' : 'REST') : (isRunPhase ? 'RUN' : 'WALK')}`);
            
            if (newTime <= 0) {
              console.log('🔄 Phase transition triggered');
              // Use setTimeout to ensure state updates are processed
              setTimeout(() => nextPhase(), 100);
              return 0;
            }
            return newTime;
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
  }, [isActive, isPaused, lastResumeTime, cardioType, isWorkPhase, isRunPhase, currentRound, currentLap, workTime, restTime, runTime, walkTime, rounds, laps]);

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
