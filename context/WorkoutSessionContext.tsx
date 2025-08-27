import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { saveWorkout, saveProgramWorkout, getNextWorkoutNumber, type WorkoutSessionData } from '../services/workoutHistory';
import { ProgramManager } from '../services/programManager';

export interface Exercise {
  id: number;
  name: string;
  sets?: Array<{ 
    reps: number; 
  weight: number | string; 
    notes?: string; 
    completed?: boolean;
    restDuration?: number;
  }>;
}

export interface SessionMeta {
  id?: number;
  date: string;
  name: string;
}

interface WorkoutSessionContextType {
  currentExercises: Exercise[];
  setCurrentExercises: (exercises: Exercise[]) => void;
  sessionMeta: SessionMeta;
  setSessionMeta: (meta: SessionMeta) => void;
  sessionStartTime: Date | null;
  sessionEndTime: Date | null;
  isWorkoutActive: boolean;
  workoutName: string;
  setWorkoutName: (name: string) => void;
  elapsedTime: number;
  setElapsedTime: (time: number) => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  startWorkout: () => void;
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  endWorkout: () => Promise<void>;
  saveWorkout: () => Promise<number | null>;
  resetSession: () => void;
  // Program context
  currentProgramId: number | null;
  currentProgramDayId: number | null;
  isProgramWorkout: boolean;
  startProgramWorkout: (programId: number, dayName: string) => Promise<void>;
  // Timer state for background persistence
  lastResumeTime: Date | null;
  setLastResumeTime: (time: Date | null) => void;
  // Global Rest Timer State
  globalRestTimer: {
    isActive: boolean;
    timeRemaining: number;
    originalDuration: number;
    exerciseId: number | null;
    setIdx: number | null;
    startTime: Date | null;
  } | null;
  setGlobalRestTimer: (timer: {
    isActive: boolean;
    timeRemaining: number;
    originalDuration: number;
    exerciseId: number | null;
    setIdx: number | null;
    startTime: Date | null;
  } | null) => void;
  // Callback for when rest timer completes
  onRestTimerComplete: (() => void) | null;
  setOnRestTimerComplete: (callback: (() => void) | null) => void;
  accumulatedTime: number;
  setAccumulatedTime: (time: number) => void;
  // Track scheduled iOS notification session id for rest timer (for cancelation)
  restNotificationSessionId: string | null;
  setRestNotificationSessionId: (id: string | null) => void;
}

const WorkoutSessionContext = createContext<WorkoutSessionContextType | undefined>(undefined);

export const WorkoutSessionProvider = ({ children }: { children: ReactNode }) => {
  // Function to get next workout number and set default name
  const getNextWorkoutName = async () => {
    try {
      const nextNumber = await getNextWorkoutNumber();
      return `LIFT ${nextNumber}`;
    } catch (error) {
      console.error('Error getting next workout number:', error);
      return 'LIFT 1';
    }
  };

  const [currentExercises, setCurrentExercises] = useState<Exercise[]>([]);
  const [sessionMeta, setSessionMeta] = useState<SessionMeta>({ 
    date: new Date().toISOString().slice(0, 10),
    name: 'LIFT 1'
  });
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionEndTime, setSessionEndTime] = useState<Date | null>(null);
  const [isWorkoutActive, setIsWorkoutActive] = useState<boolean>(false);
  const [workoutName, setWorkoutName] = useState<string>('LIFT 1');
  // Timer state
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [lastResumeTime, setLastResumeTime] = useState<Date | null>(null); // Track when timer was last resumed
  const [accumulatedTime, setAccumulatedTime] = useState<number>(0); // Total time when paused segments ended

  // Global Rest Timer State
  const [globalRestTimer, setGlobalRestTimer] = useState<{
    isActive: boolean;
    timeRemaining: number;
    originalDuration: number;
    exerciseId: number | null;
    setIdx: number | null;
    startTime: Date | null;
  } | null>(null);
  const [onRestTimerComplete, setOnRestTimerComplete] = useState<(() => void) | null>(null);
  const [restNotificationSessionId, setRestNotificationSessionId] = useState<string | null>(null);

  const timerRef = useRef<any>(null);

  // Program context state
  const [currentProgramId, setCurrentProgramId] = useState<number | null>(null);
  const [currentProgramDayId, setCurrentProgramDayId] = useState<number | null>(null);
  const [isProgramWorkout, setIsProgramWorkout] = useState<boolean>(false);

  // Accurate timestamp-based timer effect with validation
  useEffect(() => {
    // Determine the anchor for the active segment: prefer lastResumeTime, fall back to sessionStartTime
    const activeAnchor = (!isPaused && isWorkoutActive) ? (lastResumeTime || sessionStartTime) : null;

    if (isWorkoutActive && !isPaused && activeAnchor) {
      // Immediate tick so UI updates instantly on resume/start
      const tick = () => {
        const now = new Date();
        const currentSegmentElapsed = Math.floor((now.getTime() - activeAnchor.getTime()) / 1000);
        const totalElapsed = accumulatedTime + currentSegmentElapsed;

        // SAFETY CHECK: Prevent unreasonable timer values
        const maxReasonableWorkout = 12 * 60 * 60; // 12 hours max workout
        if (totalElapsed > maxReasonableWorkout) {
          console.warn('⚠️ Timer exceeded reasonable workout duration, pausing for safety');
          setIsPaused(true);
          setLastResumeTime(null);
          return;
        }

        setElapsedTime(totalElapsed);
      };

      // Run one immediate tick
      tick();

      // Use timestamp-based calculation for accuracy
      timerRef.current = setInterval(tick, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isWorkoutActive, isPaused, lastResumeTime, accumulatedTime, sessionStartTime]);

  // Global rest timer effect - simplified, background persistence handled by hook
  const globalRestTimerRef = useRef<any>(null);
  
  useEffect(() => {
    if (globalRestTimer?.isActive && globalRestTimer.startTime) {
      const tick = () => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - globalRestTimer.startTime!.getTime()) / 1000);
        const remaining = Math.max(0, globalRestTimer.originalDuration - elapsed);

        // Update time remaining
        setGlobalRestTimer(prev => prev ? {
          ...prev,
          timeRemaining: remaining
        } : null);

        // Timer finished - check for 0 or less
        if (remaining <= 0) {
          if (globalRestTimerRef.current) {
            clearInterval(globalRestTimerRef.current);
            globalRestTimerRef.current = null;
          }

          // Update to show 00:00 first
          setGlobalRestTimer(prev => prev ? {
            ...prev,
            timeRemaining: 0
          } : null);

          // Show 00:00 briefly, then clear timer and show completion popup
          setTimeout(() => {
            // Reset timer state - this will hide the timer display
            setGlobalRestTimer(null);

            // CRITICAL: Immediately clear background storage data when timer completes
            setTimeout(async () => {
              try {
                const { backgroundSessionService } = await import('../services/backgroundSession');
                const { db } = await import('../db/client');
                const { active_session_timers } = await import('../db/schema');
                const { eq } = await import('drizzle-orm');

                // Clear all active rest timers from background storage
                const restTimers = await db
                  .select()
                  .from(active_session_timers)
                  .where(eq(active_session_timers.timer_type, 'rest'));

                for (const timer of restTimers) {
                  await backgroundSessionService.clearTimerData(timer.session_id, 'rest');
                }

                if (restTimers.length > 0) {
                  console.log('🧹 Cleared', restTimers.length, 'rest timers from background after completion');
                }
              } catch (error) {
                console.error('Failed to clear rest timer background data after completion:', error);
              }
            }, 100); // Small delay to ensure timer state is updated first

            // Trigger completion callback after clearing the timer
            if (onRestTimerComplete) {
              console.log('🔔 Rest timer completed naturally at 00:00');
              onRestTimerComplete();
            }
            // We rely on the pre-scheduled notification; no fallback to avoid duplicates.
          }, 300); // Show 00:00 for 300ms before clearing
        }
      };

      // Run one immediate tick for instant UI update
      tick();

      globalRestTimerRef.current = setInterval(tick, 1000);
    } else if (!globalRestTimer?.isActive) {
      // Clear interval when timer becomes inactive
      if (globalRestTimerRef.current) {
        clearInterval(globalRestTimerRef.current);
        globalRestTimerRef.current = null;
      }
    }

    return () => {
      if (globalRestTimerRef.current) {
        clearInterval(globalRestTimerRef.current);
        globalRestTimerRef.current = null;
      }
    };
  }, [globalRestTimer?.isActive, globalRestTimer?.startTime, globalRestTimer?.originalDuration, onRestTimerComplete]);

  const startWorkout = () => {
    if (!isWorkoutActive) {
      const now = new Date();
      setSessionStartTime(now);
      setLastResumeTime(now); // Start timing from now
      setAccumulatedTime(0); // Reset accumulated time
      setElapsedTime(0); // Reset timer when starting new workout
      setIsWorkoutActive(true);
      setIsPaused(false);
      console.log('Workout session started with timestamp-based timer');
    }
  };

  const pauseWorkout = () => {
    if (isWorkoutActive && !isPaused) {
      // Calculate current total elapsed time and save as accumulated
      if (lastResumeTime) {
        const now = new Date();
        const currentSegmentElapsed = Math.floor((now.getTime() - lastResumeTime.getTime()) / 1000);
        const newAccumulated = accumulatedTime + currentSegmentElapsed;
        setAccumulatedTime(newAccumulated);
        setElapsedTime(newAccumulated);
      }
      setIsPaused(true);
      setLastResumeTime(null);
      console.log('Workout paused, accumulated time saved:', accumulatedTime);
    }
  };

  const resumeWorkout = () => {
    if (isWorkoutActive && isPaused) {
      setLastResumeTime(new Date()); // Resume timing from now
      setIsPaused(false);
      console.log('Workout resumed with fresh timestamp');
    }
  };

  const endWorkout = async () => {
    if (isWorkoutActive) {
      // Finalize elapsed time calculation
      if (!isPaused && lastResumeTime) {
        const now = new Date();
        const currentSegmentElapsed = Math.floor((now.getTime() - lastResumeTime.getTime()) / 1000);
        const finalElapsed = accumulatedTime + currentSegmentElapsed;
        setElapsedTime(finalElapsed);
      }
      
      setSessionEndTime(new Date());
      setIsWorkoutActive(false);
      setLastResumeTime(null);
      
      // Clear global rest timer when workout ends
      setGlobalRestTimer(null);
      setOnRestTimerComplete(null);

      // iOS: cancel all pending local notifications
      try {
        const NotificationService = (await import('../services/notifications')).default;
        if (restNotificationSessionId) {
          await NotificationService.cancelAllForSession(restNotificationSessionId);
          setRestNotificationSessionId(null);
        }
        await NotificationService.cancelAllPending();
      } catch {}
      
      // Clear any background rest timer data as well
      try {
        const { backgroundSessionService } = await import('../services/backgroundSession');
        const { db } = await import('../db/client');
        const { active_session_timers, active_workout_sessions } = await import('../db/schema');
        const { eq } = await import('drizzle-orm');
        
        // Clear all active rest timers from background storage
        const restTimers = await db
          .select()
          .from(active_session_timers)
          .where(eq(active_session_timers.timer_type, 'rest'));
        
        for (const timer of restTimers) {
          await backgroundSessionService.clearTimerData(timer.session_id, 'rest');
        }
        
        if (restTimers.length > 0) {
          console.log('🧹 Cleared', restTimers.length, 'active rest timers during workout end');
        }

        // Also clear any lingering active workout session records to avoid accidental restoration
        const sessions = await db.select().from(active_workout_sessions);
        for (const s of sessions) {
          await backgroundSessionService.clearSessionData(s.session_id);
        }
        if (sessions.length > 0) {
          console.log('🧹 Cleared', sessions.length, 'active workout background sessions during workout end');
        }
      } catch (error) {
        console.error('Failed to clear rest timer background data during end workout:', error);
      }
      
      console.log('Workout session ended with final elapsed time and rest timers cleared:', elapsedTime);
    }
  };

  const saveWorkoutToDatabase = async (): Promise<number | null> => {
    try {
      if (!sessionStartTime) {
        throw new Error('No workout session started');
      }

      if (currentExercises.length === 0) {
        throw new Error('Cannot save workout with no exercises');
      }

      // Validate workout name
      if (!workoutName || workoutName.trim().length === 0) {
        throw new Error('Workout name cannot be empty');
      }

      console.log('Starting workout save process...', {
        isProgramWorkout,
        currentProgramId,
        currentProgramDayId,
        exerciseCount: currentExercises.length
      });

      // Prepare session data for saving
      const sessionData: WorkoutSessionData = {
        name: workoutName.trim(),
        startTime: sessionStartTime,
        endTime: sessionEndTime || new Date(), // Use current time if not ended
        duration: elapsedTime, // Use actual elapsed time accounting for pauses
        exercises: currentExercises.map(exercise => ({
          exerciseId: exercise.id,
          sets: exercise.sets?.map((set, index) => ({
            setIndex: index + 1,
            weight: Number(set.weight) || 0,
            reps: Number(set.reps) || 0,
            notes: set.notes || '',
            restDuration: set.restDuration || 0,
            completed: set.completed || false,
          })) || [],
        })),
      };

      let workoutId: number;

      // Save as program workout or regular workout
      if (isProgramWorkout && currentProgramId && currentProgramDayId) {
        console.log('Saving as program workout...', { programId: currentProgramId, dayId: currentProgramDayId });
        workoutId = await saveProgramWorkout(sessionData, currentProgramId, currentProgramDayId);
        
        // Update program progress
        try {
          await ProgramManager.completeProgramWorkout(currentProgramId, workoutId);
          console.log('Program progress updated successfully');
        } catch (progressError) {
          console.warn('Failed to update program progress:', progressError);
          // Don't fail the save if progress update fails
        }
        
        console.log(`Program workout saved successfully with ID: ${workoutId}`);
      } else {
        console.log('Saving as regular workout...');
        workoutId = await saveWorkout(sessionData);
        console.log(`Workout saved successfully with ID: ${workoutId}`);
      }
      
      if (!workoutId || workoutId <= 0) {
        throw new Error('Invalid workout ID returned from save operation');
      }
      
      return workoutId;
    } catch (error) {
      console.error('Error saving workout:', error);
      throw error;
    }
  };

  const startProgramWorkout = async (programId: number, dayName: string): Promise<void> => {
    try {
      // Get the workout template for this program day
      const template = await ProgramManager.getProgramWorkoutTemplate(programId, dayName);
      
      if (!template) {
        throw new Error('No workout template found for this day');
      }

      // Set program context
      setCurrentProgramId(programId);
      setCurrentProgramDayId(template.programDay.id);
      setIsProgramWorkout(true);

      // Set workout name and exercises from template
      setWorkoutName(template.template.name || `${dayName} Workout`);
      
      // Convert template exercises to session exercises format
      const sessionExercises: Exercise[] = template.exercises.map(ex => ({
        id: ex.exerciseId,
        name: ex.name,
        sets: Array.from({ length: ex.sets }, () => ({
          reps: 0,
          weight: 0,
          notes: '',
          completed: false,
          restDuration: 60,
        })),
      }));

      setCurrentExercises(sessionExercises);
      
      console.log(`Starting program workout: ${template.template.name}`);
    } catch (error) {
      console.error('Error starting program workout:', error);
      throw error;
    }
  };

  const resetSession = async () => {
    // Clear global rest timer first to stop any active timers
    setGlobalRestTimer(null);
    setOnRestTimerComplete(null);
    
    // iOS: cancel all pending local notifications
    try {
      const NotificationService = (await import('../services/notifications')).default;
      if (restNotificationSessionId) {
        await NotificationService.cancelAllForSession(restNotificationSessionId);
        setRestNotificationSessionId(null);
      }
      await NotificationService.cancelAllPending();
    } catch {}

    // Clear any background rest timer data as well
    try {
      const { backgroundSessionService } = await import('../services/backgroundSession');
      const { db } = await import('../db/client');
      const { active_session_timers, active_workout_sessions } = await import('../db/schema');
      const { eq } = await import('drizzle-orm');
      
      // Clear all active rest timers from background storage
      const restTimers = await db
        .select()
        .from(active_session_timers)
        .where(eq(active_session_timers.timer_type, 'rest'));
      
      for (const timer of restTimers) {
        await backgroundSessionService.clearTimerData(timer.session_id, 'rest');
      }
      
      if (restTimers.length > 0) {
        console.log('🧹 Cleared', restTimers.length, 'active rest timers during session reset');
      }

      // Clear any lingering active workout sessions to prevent restore racing a fresh session
      const sessions = await db.select().from(active_workout_sessions);
      for (const s of sessions) {
        await backgroundSessionService.clearSessionData(s.session_id);
      }
      if (sessions.length > 0) {
        console.log('🧹 Cleared', sessions.length, 'active workout background sessions during session reset');
      }
    } catch (error) {
      console.error('Failed to clear rest timer background data during reset:', error);
    }
    
    setCurrentExercises([]);
    const nextWorkoutName = await getNextWorkoutName();
    setSessionMeta({ 
      date: new Date().toISOString().slice(0, 10),
      name: nextWorkoutName
    });
    setSessionStartTime(null);
    setSessionEndTime(null);
    setIsWorkoutActive(false);
    setWorkoutName(nextWorkoutName);
    setElapsedTime(0);
    setIsPaused(false);
    setLastResumeTime(null);
    setAccumulatedTime(0);
    
    // Reset program context
    setCurrentProgramId(null);
    setCurrentProgramDayId(null);
    setIsProgramWorkout(false);
    
    console.log('Workout session reset with timer state and background data cleared');
  };

  return (
    <WorkoutSessionContext.Provider value={{ 
      currentExercises, 
      setCurrentExercises, 
      sessionMeta, 
      setSessionMeta,
      sessionStartTime,
      sessionEndTime,
      isWorkoutActive,
      workoutName,
      setWorkoutName,
      elapsedTime,
      setElapsedTime,
      isPaused,
      setIsPaused,
      startWorkout,
      pauseWorkout,
      resumeWorkout,
      endWorkout,
      saveWorkout: saveWorkoutToDatabase,
      resetSession,
      // Program context
      currentProgramId,
      currentProgramDayId,
      isProgramWorkout,
      startProgramWorkout,
      // Timer state for background persistence
      lastResumeTime,
      setLastResumeTime,
      accumulatedTime,
      setAccumulatedTime,
      // Global Rest Timer State
      globalRestTimer,
      setGlobalRestTimer,
      onRestTimerComplete,
      setOnRestTimerComplete,
  restNotificationSessionId,
  setRestNotificationSessionId,
    }}>
      {children}
    </WorkoutSessionContext.Provider>
  );
};

export function useWorkoutSession() {
  const context = useContext(WorkoutSessionContext);
  if (!context) {
    throw new Error('useWorkoutSession must be used within a WorkoutSessionProvider');
  }
  return context;
} 