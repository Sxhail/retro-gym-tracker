import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Exercise {
  id: number;
  name: string;
  sets?: Array<{ reps: number; weight: number; notes?: string; completed?: boolean }>;
}

export interface SessionMeta {
  id?: number;
  date: string;
}

interface WorkoutSessionContextType {
  currentExercises: Exercise[];
  setCurrentExercises: (exercises: Exercise[]) => void;
  sessionMeta: SessionMeta;
  setSessionMeta: (meta: SessionMeta) => void;
  resetSession: () => void;
}

const WorkoutSessionContext = createContext<WorkoutSessionContextType | undefined>(undefined);

export const WorkoutSessionProvider = ({ children }: { children: ReactNode }) => {
  const [currentExercises, setCurrentExercises] = useState<Exercise[]>([]);
  const [sessionMeta, setSessionMeta] = useState<SessionMeta>({ date: new Date().toISOString().slice(0, 10) });

  const resetSession = () => {
    setCurrentExercises([]);
    setSessionMeta({ date: new Date().toISOString().slice(0, 10) });
  };

  return (
    <WorkoutSessionContext.Provider value={{ currentExercises, setCurrentExercises, sessionMeta, setSessionMeta, resetSession }}>
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