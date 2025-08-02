import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

// Initialize the Expo SQLite database
const expoDb = openDatabaseSync('app.db', { 
  enableChangeListener: true,
});

// Create Drizzle database instance with schema
const db = drizzle(expoDb, { schema });

// Export the database instances
export { expoDb, db }; 

/**
 * Initialize database tables and ensure they exist
 * This function can be called on app startup to verify database integrity
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Enable foreign key constraints
    await expoDb.execAsync('PRAGMA foreign_keys = ON;');
    
    // Enable WAL mode for better performance
    await expoDb.execAsync('PRAGMA journal_mode = WAL;');
    
    // Create indexes for better query performance
    await expoDb.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date DESC);
      CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);
      CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise_id ON workout_exercises(exercise_id);
      CREATE INDEX IF NOT EXISTS idx_sets_workout_exercise_id ON sets(workout_exercise_id);
      CREATE INDEX IF NOT EXISTS idx_sets_set_index ON sets(set_index);
    `);
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verify database schema integrity
 * Checks if all required tables exist
 */
export async function verifyDatabaseSchema(): Promise<boolean> {
  try {
    const tables = ['exercises', 'workouts', 'workout_exercises', 'sets'];
    
    for (const table of tables) {
      const result = await expoDb.getFirstAsync(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        [table]
      ) as { name: string } | null;
      
      if (!result) {
        console.error(`Missing table: ${table}`);
        return false;
      }
    }
    
    console.log('Database schema verification passed');
    return true;
  } catch (error) {
    console.error('Error verifying database schema:', error);
    return false;
  }
}

/**
 * Get database statistics for debugging
 */
export async function getDatabaseStats(): Promise<{
  exercises: number;
  workouts: number;
  workoutExercises: number;
  sets: number;
}> {
  try {
    const [exercisesCount] = await db.select({ count: schema.exercises.id }).from(schema.exercises);
    const [workoutsCount] = await db.select({ count: schema.workouts.id }).from(schema.workouts);
    const [workoutExercisesCount] = await db.select({ count: schema.workout_exercises.id }).from(schema.workout_exercises);
    const [setsCount] = await db.select({ count: schema.sets.id }).from(schema.sets);
    
    return {
      exercises: exercisesCount?.count || 0,
      workouts: workoutsCount?.count || 0,
      workoutExercises: workoutExercisesCount?.count || 0,
      sets: setsCount?.count || 0,
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return {
      exercises: 0,
      workouts: 0,
      workoutExercises: 0,
      sets: 0,
    };
  }
}

/**
 * Close database connection (useful for cleanup)
 */
export function closeDatabase(): void {
  try {
    expoDb.closeSync();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database:', error);
  }
}

// Export schema for use in other modules
export { schema }; 