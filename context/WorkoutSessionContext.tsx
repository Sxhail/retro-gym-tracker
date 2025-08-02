import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { saveWorkout, getNextWorkoutNumber, type WorkoutSessionData } from '../services/workoutHistory';

export interface Exercise {
  id: number;
  name: string;
  sets?: Array<{ 
    reps: number; 
    weight: number; 
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
  endWorkout: () => void;
  saveWorkout: () => Promise<number | null>;
  resetSession: () => void;
}

const WorkoutSessionContext = createContext<WorkoutSessionContextType | undefined>(undefined);

export const WorkoutSessionProvider = ({ children }: { children: ReactNode }) => {
  // Function to get next workout number and set default name
  const getNextWorkoutName = async () => {
    try {
      const nextNumber = await getNextWorkoutNumber();
      return `WORKOUT ${nextNumber}`;
    } catch (error) {
      console.error('Error getting next workout number:', error);
      return 'WORKOUT 1';
    }
  };

  const [currentExercises, setCurrentExercises] = useState<Exercise[]>([]);
  const [sessionMeta, setSessionMeta] = useState<SessionMeta>({ 
    date: new Date().toISOString().slice(0, 10),
    name: 'WORKOUT 1'
  });
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionEndTime, setSessionEndTime] = useState<Date | null>(null);
  const [isWorkoutActive, setIsWorkoutActive] = useState<boolean>(false);
  const [workoutName, setWorkoutName] = useState<string>('WORKOUT 1');
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const timerRef = useRef<any>(null);

  // Timer effect - runs when workout is active and not paused
  useEffect(() => {
    if (isWorkoutActive && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
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
  }, [isWorkoutActive, isPaused]);

  const startWorkout = () => {
    if (!isWorkoutActive) {
      setSessionStartTime(new Date());
      setIsWorkoutActive(true);
      setElapsedTime(0); // Reset timer when starting new workout
      setIsPaused(false);
      console.log('Workout session started');
    }
  };

  const endWorkout = () => {
    if (isWorkoutActive) {
      setSessionEndTime(new Date());
      setIsWorkoutActive(false);
      console.log('Workout session ended');
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

      // Prepare session data for saving
      const sessionData: WorkoutSessionData = {
        name: workoutName,
        startTime: sessionStartTime,
        endTime: sessionEndTime || new Date(), // Use current time if not ended
        exercises: currentExercises.map(exercise => ({
          exerciseId: exercise.id,
          sets: exercise.sets?.map((set, index) => ({
            setIndex: index + 1,
            weight: set.weight,
            reps: set.reps,
            notes: set.notes,
            restDuration: set.restDuration || 0,
            completed: set.completed || false,
          })) || [],
        })),
      };

      // Save to database
      const workoutId = await saveWorkout(sessionData);
      console.log(`Workout saved successfully with ID: ${workoutId}`);
      
      return workoutId;
    } catch (error) {
      console.error('Error saving workout:', error);
      throw error;
    }
  };

  const resetSession = async () => {
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
    console.log('Workout session reset');
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
      endWorkout,
      saveWorkout: saveWorkoutToDatabase,
      resetSession 
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