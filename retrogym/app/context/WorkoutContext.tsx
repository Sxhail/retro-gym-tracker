import React, { createContext, useContext, useState } from 'react';
import type { Exercise } from '../../db/dataAccess';

type WorkoutContextType = {
  selectedExercises: Exercise[];
  addExercise: (exercise: Exercise) => void;
  removeExercise: (exerciseId: number) => void;
};

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export const WorkoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);

  const addExercise = (exercise: Exercise) => {
    setSelectedExercises((prev) =>
      prev.find((e) => e.id === exercise.id) ? prev : [...prev, exercise]
    );
  };

  const removeExercise = (exerciseId: number) => {
    setSelectedExercises((prev) => prev.filter((e) => e.id !== exerciseId));
  };

  return (
    <WorkoutContext.Provider value={{ selectedExercises, addExercise, removeExercise }}>
      {children}
    </WorkoutContext.Provider>
  );
};

export const useWorkout = () => {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error('useWorkout must be used within a WorkoutProvider');
  return ctx;
}; 