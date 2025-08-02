import React, { createContext, useContext, useEffect, useState } from 'react';
import { dbOperations } from '../services/database';

interface DatabaseContextType {
  exercises: any[];
  workouts: any[];
  workoutSets: any[];
  loading: boolean;
  addExercise: (exercise: any) => Promise<void>;
  addWorkout: (workout: any) => Promise<void>;
  addWorkoutSet: (set: any) => Promise<void>;
  refreshData: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [exercises, setExercises] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [workoutSets, setWorkoutSets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    try {
      setLoading(true);
      
      // Load exercises
      const exercisesData = await dbOperations.getExercises();
      setExercises(Array.isArray(exercisesData) ? exercisesData : []);

      // Load workouts
      const workoutsData = await dbOperations.getWorkouts();
      setWorkouts(Array.isArray(workoutsData) ? workoutsData : []);

      // Load workout sets
      const setsData = await dbOperations.getWorkoutSets();
      setWorkoutSets(Array.isArray(setsData) ? setsData : []);
    } catch (error) {
      console.error('Error loading data:', error);
      // Set empty arrays on error to prevent undefined issues
      setExercises([]);
      setWorkouts([]);
      setWorkoutSets([]);
    } finally {
      setLoading(false);
    }
  };

  const addExercise = async (exercise: any) => {
    try {
      await dbOperations.addExercise(exercise);
      await refreshData();
    } catch (error) {
      console.error('Error adding exercise:', error);
    }
  };

  const addWorkout = async (workout: any) => {
    try {
      await dbOperations.addWorkout(workout);
      await refreshData();
    } catch (error) {
      console.error('Error adding workout:', error);
    }
  };

  const addWorkoutSet = async (set: any) => {
    try {
      await dbOperations.addWorkoutSet(set);
      await refreshData();
    } catch (error) {
      console.error('Error adding workout set:', error);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const value: DatabaseContextType = {
    exercises,
    workouts,
    workoutSets,
    loading,
    addExercise,
    addWorkout,
    addWorkoutSet,
    refreshData,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}; 