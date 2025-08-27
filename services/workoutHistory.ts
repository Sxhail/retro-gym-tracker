import { db } from '../db/client';
import { workouts, workout_exercises, sets, exercises } from '../db/schema';
import { eq, desc, asc, sql, like } from 'drizzle-orm';
import type { NewWorkout, NewWorkoutExercise, NewSet } from '../db/schema';

export interface WorkoutSessionData {
  name: string;
  startTime: Date;
  endTime: Date;
  duration?: number; // Optional: actual elapsed time in seconds (overrides endTime - startTime calculation)
  exercises: Array<{
    exerciseId: number;
    distance?: number;
    sets: Array<{
      setIndex: number;
      weight: number;
      reps: number;
      notes?: string;
      restDuration: number;
      completed?: boolean;
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

// --- Post-Session Report types ---
export type PRItem = {
  type: 'weight' | 'repsAtWeight';
  exerciseId: number;
  exerciseName: string;
  weight: number;
  reps: number;
};

/**
 * Save a complete workout session to the database
 * Wraps all operations in a transaction for data integrity
 */
export async function saveWorkout(sessionData: WorkoutSessionData): Promise<number> {
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      // Calculate total duration in seconds - use provided duration or calculate from timestamps
      const duration = sessionData.duration !== undefined 
        ? sessionData.duration 
        : Math.floor((sessionData.endTime.getTime() - sessionData.startTime.getTime()) / 1000);
      
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
    // Single query with aggregates to avoid N+1 per workout
    const results = await db
      .select({
        id: workouts.id,
        name: workouts.name,
        date: workouts.date,
        duration: workouts.duration,
        exerciseCount: sql<number>`COUNT(DISTINCT ${workout_exercises.id})`,
        totalSets: sql<number>`COUNT(${sets.id})`,
      })
      .from(workouts)
      .leftJoin(workout_exercises, eq(workouts.id, workout_exercises.workout_id))
      .leftJoin(sets, eq(workout_exercises.id, sets.workout_exercise_id))
      .groupBy(workouts.id)
      .orderBy(desc(workouts.date))
      .limit(limit)
      .offset(offset);

    return results.map(r => ({
      id: r.id,
      name: r.name,
      date: r.date,
      duration: r.duration,
      exerciseCount: r.exerciseCount ?? 0,
      totalSets: r.totalSets ?? 0,
    }));
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
 * Get per-exercise max weight before a given workout (exclude that workout)
 */
export async function getExerciseMaxWeightBefore(excludeWorkoutId: number): Promise<Record<number, number>> {
  try {
    const rows = await db
      .select({
        exerciseId: workout_exercises.exercise_id,
        maxWeight: sql<number>`MAX(${sets.weight})`,
      })
      .from(sets)
      .innerJoin(workout_exercises, eq(sets.workout_exercise_id, workout_exercises.id))
      .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
      .where(sql`${workouts.id} != ${excludeWorkoutId}`)
      .groupBy(workout_exercises.exercise_id);

    const out: Record<number, number> = {};
    for (const r of rows) {
      out[r.exerciseId] = r.maxWeight ?? 0;
    }
    return out;
  } catch (e) {
    console.error('Error in getExerciseMaxWeightBefore:', e);
    return {};
  }
}

/**
 * Get the max reps achieved for an exercise at an exact weight before a given workout (exclude that workout)
 */
export async function getMaxRepsForExerciseAtWeightBefore(
  exerciseId: number,
  weight: number,
  excludeWorkoutId: number
): Promise<number> {
  try {
    const rows = await db
      .select({
        maxReps: sql<number>`MAX(${sets.reps})`,
      })
      .from(sets)
      .innerJoin(workout_exercises, eq(sets.workout_exercise_id, workout_exercises.id))
      .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
      .where(sql`${workout_exercises.exercise_id} = ${exerciseId} AND ${sets.weight} = ${weight} AND ${workouts.id} != ${excludeWorkoutId}`);

    if (rows.length > 0 && rows[0].maxReps != null) {
      return rows[0].maxReps;
    }
    return 0;
  } catch (e) {
    console.error('Error in getMaxRepsForExerciseAtWeightBefore:', e);
    return 0;
  }
}

/**
 * Aggregate workout PRs (heaviest weight PR and reps-at-weight PRs)
 */
export async function getWorkoutPRs(workoutId: number): Promise<PRItem[]> {
  try {
    const workout = await getWorkoutDetail(workoutId);
    if (!workout) return [];

    const prevMaxByExercise = await getExerciseMaxWeightBefore(workoutId);
    const byExercise = new Map<number, PRItem>();

    for (const ex of workout.exercises) {
      const prevMax = prevMaxByExercise[ex.exerciseId] ?? 0;
      // Find the top set by weight in this workout for this exercise (tie-breaker: reps)
      const sets = ex.sets ?? [];
      if (sets.length === 0) continue;
      const top = sets.reduce((best, s) => {
        const bw = Number(best.weight) || 0;
        const br = Number(best.reps) || 0;
        const cw = Number(s.weight) || 0;
        const cr = Number(s.reps) || 0;
        if (cw > bw) return s;
        if (cw === bw && cr > br) return s;
        return best;
      }, sets[0]);

      const weight = Number(top.weight) || 0;
      const reps = Number(top.reps) || 0;
      if (weight <= 0 || reps <= 0) continue;

      if (weight > prevMax) {
        const existing = byExercise.get(ex.exerciseId);
        if (!existing || weight > existing.weight) {
          byExercise.set(ex.exerciseId, {
            type: 'weight',
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            weight,
            reps,
          });
        }
      }
    }

    return Array.from(byExercise.values());
  } catch (e) {
    console.error('Error in getWorkoutPRs:', e);
    return [];
  }
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
      .select({ count: sql<number>`COUNT(*)` })
      .from(workouts);

    return result[0]?.count ?? 0;

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
    // Count ALL workouts to get the next sequential number
    const result = await db
      .select({ 
        count: sql<number>`count(*)`.as('count')
      })
      .from(workouts);

    const totalWorkouts = result[0]?.count || 0;
    return totalWorkouts + 1;
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

/**
 * Save a program workout session with program context
 */
export async function saveProgramWorkout(
  sessionData: WorkoutSessionData,
  programId: number,
  programDayId: number
): Promise<number> {
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      // Calculate total duration in seconds
      const duration = Math.floor((sessionData.endTime.getTime() - sessionData.startTime.getTime()) / 1000);
      
      // Validate session data (same as regular workout)
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
        // 1. Insert workout record with program context
        const [workoutResult] = await tx.insert(workouts).values({
          name: sessionData.name.trim(),
          date: sessionData.startTime.toISOString(),
          duration: duration,
          program_id: programId,
          program_day_id: programDayId,
        }).returning({ id: workouts.id });

        const workoutId = workoutResult.id;

        // 2. Insert workout exercises and their sets (same as regular workout)
        for (const exerciseData of sessionData.exercises) {
          // Insert workout exercise
          const [workoutExerciseResult] = await tx.insert(workout_exercises).values({
            workout_id: workoutId,
            exercise_id: exerciseData.exerciseId,
            distance: exerciseData.distance,
          }).returning({ id: workout_exercises.id });

          const workoutExerciseId = workoutExerciseResult.id;

          // Insert sets for this exercise
          for (const setData of exerciseData.sets) {
            await tx.insert(sets).values({
              workout_exercise_id: workoutExerciseId,
              set_index: setData.setIndex,
              weight: setData.weight,
              reps: setData.reps,
              notes: setData.notes,
              rest_duration: setData.restDuration,
              completed: setData.completed ? 1 : 0,
            });
          }
        }

        return workoutId;
      });

    } catch (error) {
      retryCount++;
      console.error(`Error saving program workout (attempt ${retryCount}/${maxRetries}):`, error);
      
      if (retryCount >= maxRetries) {
        if (error instanceof Error && error.message.includes('database is locked')) {
          throw new Error('Database is busy. Please try again in a moment.');
        } else if (error instanceof Error && error.message.includes('no such table')) {
          throw new Error('Database schema is missing. Please restart the app.');
        } else {
          throw new Error(`Failed to save program workout: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
    }
  }

  throw new Error('Failed to save program workout after maximum retries');
}

/**
 * Get workout history for a specific program
 */
export async function getProgramWorkoutHistory(programId: number): Promise<WorkoutHistoryItem[]> {
  try {
    const results = await db
      .select({
        id: workouts.id,
        name: workouts.name,
        date: workouts.date,
        duration: workouts.duration,
        exerciseCount: sql<number>`COUNT(DISTINCT ${workout_exercises.exercise_id})`,
        totalSets: sql<number>`COUNT(${sets.id})`,
      })
      .from(workouts)
      .leftJoin(workout_exercises, eq(workouts.id, workout_exercises.workout_id))
      .leftJoin(sets, eq(workout_exercises.id, sets.workout_exercise_id))
      .where(eq(workouts.program_id, programId))
      .groupBy(workouts.id)
      .orderBy(desc(workouts.date));

    return results;
  } catch (error) {
    console.error('Error fetching program workout history:', error);
    throw new Error('Failed to load program workout history');
  }
} 

/**
 * Get workouts on a specific local date (YYYY-MM-DD), returning history items with counts.
 * Uses date range to avoid loading all workouts and filtering in JS.
 */
export async function getWorkoutsOnDate(dateLocalYYYYMMDD: string): Promise<WorkoutHistoryItem[]> {
  // Compute local day start/end as ISO for comparison with stored ISO strings
  const [y, m, d] = dateLocalYYYYMMDD.split('-').map((n) => parseInt(n, 10));
  const startIso = new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
  const endIso = new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
  try {
    const rows = await db
      .select({
        id: workouts.id,
        name: workouts.name,
        date: workouts.date,
        duration: workouts.duration,
        exerciseCount: sql<number>`COUNT(DISTINCT ${workout_exercises.id})`,
        totalSets: sql<number>`COUNT(${sets.id})`,
      })
      .from(workouts)
      .leftJoin(workout_exercises, eq(workouts.id, workout_exercises.workout_id))
      .leftJoin(sets, eq(workout_exercises.id, sets.workout_exercise_id))
      .where(sql`${workouts.date} >= ${startIso} AND ${workouts.date} <= ${endIso}`)
      .groupBy(workouts.id)
      .orderBy(asc(workouts.date));

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      date: r.date,
      duration: r.duration,
      exerciseCount: r.exerciseCount ?? 0,
      totalSets: r.totalSets ?? 0,
    }));
  } catch (err) {
    console.error('Error fetching workouts for date:', err);
    return [];
  }
}

/**
 * Efficient per-exercise max weight timeline for stats, without loading all workout details.
 * Returns an array of { exerciseName, date, maxWeight } rows for a bounded time range or all-time.
 */
export async function getExerciseMaxTimeline(options?: { startDateIso?: string; endDateIso?: string; limitPerExercise?: number; }): Promise<Array<{ exerciseId: number; exerciseName: string; date: string; maxWeight: number }>> {
  const whereClauses: any[] = [];
  if (options?.startDateIso) {
    whereClauses.push(sql`${workouts.date} >= ${options.startDateIso}`);
  }
  if (options?.endDateIso) {
    whereClauses.push(sql`${workouts.date} <= ${options.endDateIso}`);
  }
  try {
    // For each workout/exercise, compute max weight in that workout, then join exercise name
    const rows = await db
      .select({
        exerciseId: workout_exercises.exercise_id,
        exerciseName: exercises.name,
        date: workouts.date,
        maxWeight: sql<number>`MAX(${sets.weight})`,
      })
      .from(sets)
      .innerJoin(workout_exercises, eq(sets.workout_exercise_id, workout_exercises.id))
      .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
      .innerJoin(exercises, eq(workout_exercises.exercise_id, exercises.id))
      .where(whereClauses.length ? sql.join(whereClauses, sql` AND `) : sql`1=1`)
      .groupBy(workout_exercises.exercise_id, workouts.id)
      .orderBy(asc(workouts.date));

    // Optionally cap per exercise series
    if (options?.limitPerExercise && options.limitPerExercise > 0) {
      const capped: typeof rows = [] as any;
      const counts: Record<number, number> = {};
      for (const r of rows) {
        const c = counts[r.exerciseId] ?? 0;
        if (c < options.limitPerExercise) {
          capped.push(r);
          counts[r.exerciseId] = c + 1;
        }
      }
      return capped as any;
    }
    return rows as any;
  } catch (err) {
    console.error('Error building exercise max timeline:', err);
    return [];
  }
}