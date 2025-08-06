import { db } from '../db/client';
import * as schema from '../db/schema';

// Helper functions for common operations
export const dbOperations = {
  async getExercises() {
    return db.select().from(schema.exercises);
  },

  async addExercise(exercise: any) {
    return db.insert(schema.exercises).values(exercise).returning();
  },

  async getWorkouts() {
    return db.select().from(schema.workouts);
  },

  async addWorkout(workout: any) {
    return db.insert(schema.workouts).values(workout).returning();
  },

  async getWorkoutSets() {
    return db.select().from(schema.sets);
  },

  async addWorkoutSet(set: any) {
    return db.insert(schema.sets).values(set).returning();
  }
}; 