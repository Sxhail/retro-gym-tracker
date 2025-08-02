import { db } from '../db/client';
import { workouts, workout_exercises, sets, exercises } from '../db/schema';
import { eq, desc, asc, sql } from 'drizzle-orm';
import type { NewWorkout, NewWorkoutExercise, NewSet } from '../db/schema';

export interface WorkoutSessionData {
  name: string;
  startTime: Date;
  endTime: Date;
  exercises: Array<{
    exerciseId: number;
    distance?: number;
    sets: Array<{
      setIndex: number;
      weight: number;
      reps: number;
      notes?: string;
      restDuration: number;
      completed: boolean;
    }>;
  }>;
}

export interface WorkoutHistoryItem {
  id: number;
  name: string;
  date: string;
  duration: number;
  exerciseCount: number;
  totalSets: number;
}

export interface WorkoutDetail {
  id: number;
  name: string;
  date: string;
  duration: number;
  exercises: Array<{
    id: number;
    exerciseId: number;
    exerciseName: string;
    distance?: number;
    sets: Array<{
      id: number;
      setIndex: number;
      weight: number;
      reps: number;
      notes?: string;
      restDuration: number;
      completed: boolean;
    }>;
  }>;
}

/**
 * Save a complete workout session to the database
 * Wraps all operations in a transaction for data integrity
 */
export async function saveWorkout(sessionData: WorkoutSessionData): Promise<number> {
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      // Calculate total duration in seconds
      const duration = Math.floor((sessionData.endTime.getTime() - sessionData.startTime.getTime()) / 1000);
      
      // Validate session data
      if (!sessionData.name || sessionData.name.trim().length === 0) {
        throw new Error('Workout name cannot be empty');
      }
      
      if (sessionData.name.length > 100) {
        throw new Error('Workout name is too long (max 100 characters)');
      }
      
      if (sessionData.exercises.length === 0) {
        throw new Error('Cannot save workout with no exercises');
      }

      // Validate exercises and sets
      for (const exercise of sessionData.exercises) {
        if (exercise.sets.length === 0) {
          throw new Error('All exercises must have at least one set');
        }
        
        for (const set of exercise.sets) {
          if (set.weight < 0) {
            throw new Error('Weight cannot be negative');
          }
          if (set.reps <= 0) {
            throw new Error('Reps must be greater than 0');
          }
          if (set.restDuration < 0) {
            throw new Error('Rest duration cannot be negative');
          }
          if (set.notes && set.notes.length > 200) {
            throw new Error('Set notes are too long (max 200 characters)');
          }
        }
      }

      // Use a transaction to ensure data integrity
      return await db.transaction(async (tx) => {
        // 1. Insert workout record
        const [workoutResult] = await tx.insert(workouts).values({
          name: sessionData.name.trim(),
          date: sessionData.startTime.toISOString(),
          duration: duration,
        }).returning({ id: workouts.id });

        const workoutId = workoutResult.id;

        // 2. Insert workout exercises and their sets
        for (const exerciseData of sessionData.exercises) {
          // Insert workout exercise
          const [workoutExerciseResult] = await tx.insert(workout_exercises).values({
            workout_id: workoutId,
            exercise_id: exerciseData.exerciseId,
            distance: exerciseData.distance || null,
          }).returning({ id: workout_exercises.id });

          const workoutExerciseId = workoutExerciseResult.id;

          // Insert sets for this exercise
          if (exerciseData.sets.length > 0) {
            const setsToInsert: NewSet[] = exerciseData.sets.map(set => ({
              workout_exercise_id: workoutExerciseId,
              set_index: set.setIndex,
              weight: set.weight,
              reps: set.reps,
              notes: set.notes ? set.notes.trim() : null,
              rest_duration: set.restDuration,
              completed: set.completed ? 1 : 0,
            }));

            await tx.insert(sets).values(setsToInsert);
          }
        }

        return workoutId;
      });

    } catch (error) {
      retryCount++;
      console.error(`Error saving workout (attempt ${retryCount}/${maxRetries}):`, error);
      
      if (error instanceof Error) {
        // Don't retry validation errors
        if (error.message.includes('cannot be empty') || 
            error.message.includes('too long') || 
            error.message.includes('negative') ||
            error.message.includes('greater than 0')) {
          throw error;
        }
      }
      
      if (retryCount >= maxRetries) {
        if (error instanceof Error && error.message.includes('database is locked')) {
          throw new Error('Database is busy. Please try again in a moment.');
        } else if (error instanceof Error && error.message.includes('no such table')) {
          throw new Error('Database schema is missing. Please restart the app.');
        } else {
          throw new Error('Failed to save workout. Please try again.');
        }
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
    }
  }
  
  throw new Error('Failed to save workout after multiple attempts');
}

/**
 * Get workout history with pagination
 */
export async function getWorkoutHistory(limit: number = 10, offset: number = 0): Promise<WorkoutHistoryItem[]> {
  try {
    const workoutHistory = await db
      .select({
        id: workouts.id,
        name: workouts.name,
        date: workouts.date,
        duration: workouts.duration,
      })
      .from(workouts)
      .orderBy(desc(workouts.date))
      .limit(limit)
      .offset(offset);

    // Get exercise and set counts for each workout
    const workoutHistoryWithCounts = await Promise.all(
      workoutHistory.map(async (workout) => {
        const exerciseCount = await db
          .select({ count: workout_exercises.id })
          .from(workout_exercises)
          .where(eq(workout_exercises.workout_id, workout.id));

        const totalSets = await db
          .select({ count: sets.id })
          .from(sets)
          .innerJoin(workout_exercises, eq(sets.workout_exercise_id, workout_exercises.id))
          .where(eq(workout_exercises.workout_id, workout.id));

        return {
          ...workout,
          exerciseCount: exerciseCount.length,
          totalSets: totalSets.length,
        };
      })
    );

    return workoutHistoryWithCounts;

  } catch (error) {
    console.error('Error fetching workout history:', error);
    throw new Error(`Failed to fetch workout history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get detailed workout information including all exercises and sets
 */
export async function getWorkoutDetail(workoutId: number): Promise<WorkoutDetail | null> {
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      // Validate workout ID
      if (!workoutId || workoutId <= 0 || !Number.isInteger(workoutId)) {
        throw new Error('Invalid workout ID provided');
      }

      // Get workout basic info
      const [workout] = await db
        .select({
          id: workouts.id,
          name: workouts.name,
          date: workouts.date,
          duration: workouts.duration,
        })
        .from(workouts)
        .where(eq(workouts.id, workoutId));

      if (!workout) {
        return null;
      }

      // Get workout exercises with exercise names
      const workoutExercises = await db
        .select({
          id: workout_exercises.id,
          exerciseId: workout_exercises.exercise_id,
          exerciseName: exercises.name,
          distance: workout_exercises.distance,
        })
        .from(workout_exercises)
        .innerJoin(exercises, eq(workout_exercises.exercise_id, exercises.id))
        .where(eq(workout_exercises.workout_id, workoutId))
        .orderBy(asc(workout_exercises.id));

      // Get sets for each workout exercise
      const workoutDetail: WorkoutDetail = {
        ...workout,
        exercises: await Promise.all(
          workoutExercises.map(async (exercise) => {
          const exerciseSets = await db
            .select({
              id: sets.id,
              setIndex: sets.set_index,
              weight: sets.weight,
              reps: sets.reps,
              notes: sets.notes,
              restDuration: sets.rest_duration,
              completed: sets.completed,
            })
            .from(sets)
            .where(eq(sets.workout_exercise_id, exercise.id))
            .orderBy(asc(sets.set_index));

          return {
            ...exercise,
            sets: exerciseSets.map(set => ({
              ...set,
              completed: set.completed === 1,
            })),
          };
        })
      ),
    };

      return workoutDetail;

    } catch (error) {
      retryCount++;
      console.error(`Error fetching workout detail (attempt ${retryCount}/${maxRetries}):`, error);
      
      if (retryCount >= maxRetries) {
        if (error instanceof Error && error.message.includes('database is locked')) {
          throw new Error('Database is busy. Please try again in a moment.');
        } else if (error instanceof Error && error.message.includes('no such table')) {
          throw new Error('Database schema is missing. Please restart the app.');
        } else {
          throw new Error('Failed to load workout details. Please try again.');
        }
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
    }
  }
  
  throw new Error('Failed to fetch workout detail after multiple attempts');
}

/**
 * Delete a workout and all related data
 */
export async function deleteWorkout(workoutId: number): Promise<boolean> {
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      // Validate workout ID
      if (!workoutId || workoutId <= 0 || !Number.isInteger(workoutId)) {
        throw new Error('Invalid workout ID provided');
      }

      // Check if workout exists before deleting
      const [existingWorkout] = await db
        .select({ id: workouts.id })
        .from(workouts)
        .where(eq(workouts.id, workoutId));

      if (!existingWorkout) {
        throw new Error('Workout not found');
      }

      // Use transaction to ensure all related data is deleted
      await db.transaction(async (tx) => {
        // Delete sets first (due to foreign key constraints)
        await tx
          .delete(sets)
          .where(
            eq(sets.workout_exercise_id, 
              tx.select({ id: workout_exercises.id })
                .from(workout_exercises)
                .where(eq(workout_exercises.workout_id, workoutId))
            )
          );

        // Delete workout exercises
        await tx
          .delete(workout_exercises)
          .where(eq(workout_exercises.workout_id, workoutId));

        // Delete workout
        await tx
          .delete(workouts)
          .where(eq(workouts.id, workoutId));
      });

      return true;

    } catch (error) {
      retryCount++;
      console.error(`Error deleting workout (attempt ${retryCount}/${maxRetries}):`, error);
      
      if (error instanceof Error) {
        // Don't retry validation errors
        if (error.message.includes('Invalid workout ID') || 
            error.message.includes('Workout not found')) {
          throw error;
        }
      }
      
      if (retryCount >= maxRetries) {
        if (error instanceof Error && error.message.includes('database is locked')) {
          throw new Error('Database is busy. Please try again in a moment.');
        } else if (error instanceof Error && error.message.includes('no such table')) {
          throw new Error('Database schema is missing. Please restart the app.');
        } else {
          throw new Error('Failed to delete workout. Please try again.');
        }
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
    }
  }
  
  throw new Error('Failed to delete workout after multiple attempts');
}

/**
 * Get total workout count for pagination
 */
export async function getWorkoutCount(): Promise<number> {
  try {
    const result = await db
      .select({ count: workouts.id })
      .from(workouts);

    return result.length;

  } catch (error) {
    console.error('Error getting workout count:', error);
    throw new Error(`Failed to get workout count: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get total workout statistics
 */
export async function getTotalWorkoutStats(): Promise<{
  totalWorkouts: number;
  totalDuration: number;
  totalSets: number;
  averageWorkoutDuration: number;
  averageSetsPerWorkout: number;
}> {
  try {
    // Get total workouts
    const workoutCount = await getWorkoutCount();
    
    // Get total duration
    const durationResult = await db
      .select({ totalDuration: sql<number>`SUM(${workouts.duration})` })
      .from(workouts);
    
    const totalDuration = durationResult[0]?.totalDuration || 0;
    
    // Get total sets
    const setsResult = await db
      .select({ totalSets: sql<number>`COUNT(${sets.id})` })
      .from(sets)
      .innerJoin(workout_exercises, eq(sets.workout_exercise_id, workout_exercises.id))
      .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id));
    
    const totalSets = setsResult[0]?.totalSets || 0;
    
    // Calculate averages
    const averageWorkoutDuration = workoutCount > 0 ? Math.round(totalDuration / workoutCount) : 0;
    const averageSetsPerWorkout = workoutCount > 0 ? Math.round(totalSets / workoutCount) : 0;
    
    return {
      totalWorkouts: workoutCount,
      totalDuration,
      totalSets,
      averageWorkoutDuration,
      averageSetsPerWorkout,
    };
  } catch (error) {
    console.error('Error getting total workout stats:', error);
    throw new Error(`Failed to get total workout stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Format duration from seconds to HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * Get the next workout number for automatic naming
 */
export async function getNextWorkoutNumber(): Promise<number> {
  try {
    const result = await db
      .select({ count: workouts.id })
      .from(workouts);

    return result.length + 1;
  } catch (error) {
    console.error('Error getting next workout number:', error);
    // Fallback to 1 if there's an error
    return 1;
  }
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '.');
}

/**
 * Get max weight and associated reps for each exercise
 */
export async function getExerciseMaxWeights(): Promise<Record<number, { weight: number; reps: number }>> {
  try {
    const result = await db
      .select({
        exerciseId: workout_exercises.exercise_id,
        maxWeight: sql<number>`MAX(${sets.weight})`,
        reps: sets.reps
      })
      .from(sets)
      .innerJoin(workout_exercises, eq(sets.workout_exercise_id, workout_exercises.id))
      .where(sql`${sets.weight} > 0`)
      .groupBy(workout_exercises.exercise_id, sets.reps);

    const maxWeights: Record<number, { weight: number; reps: number }> = {};
    
    // Find the set with max weight for each exercise
    result.forEach(row => {
      if (!maxWeights[row.exerciseId] || row.maxWeight > maxWeights[row.exerciseId].weight) {
        maxWeights[row.exerciseId] = {
          weight: row.maxWeight,
          reps: row.reps
        };
      }
    });

    return maxWeights;
  } catch (error) {
    console.error('Error getting exercise max weights:', error);
    return {};
  }
} 

/**
 * Get the most recent previous set (kg, reps) for a given exercise and set number, before the current workout
 */
export async function getPreviousSetForExerciseSetNumber(exerciseId: number, setIndex: number, excludeWorkoutId?: number): Promise<{ weight: number, reps: number } | null> {
  try {
    // Find the most recent set for this exercise and set index, excluding the current workout if provided
    const result = await db
      .select({
        weight: sets.weight,
        reps: sets.reps,
        workoutDate: workouts.date,
        workoutId: workouts.id,
      })
      .from(sets)
      .innerJoin(workout_exercises, eq(sets.workout_exercise_id, workout_exercises.id))
      .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
      .where(
        excludeWorkoutId
          ? sql`${workout_exercises.exercise_id} = ${exerciseId} AND ${sets.set_index} = ${setIndex} AND ${workouts.id} != ${excludeWorkoutId}`
          : sql`${workout_exercises.exercise_id} = ${exerciseId} AND ${sets.set_index} = ${setIndex}`
      )
      .orderBy(desc(workouts.date))
      .limit(1);
    if (result.length > 0) {
      return { weight: result[0].weight, reps: result[0].reps };
    }
    return null;
  } catch (error) {
    console.error('Error fetching previous set for exercise/set number:', error);
    return null;
  }
} 