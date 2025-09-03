import { db } from '../db/client';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { workouts, workout_exercises, sets, exercises as exerciseTable } from '../db/schema';
import { MUSCLE_GROUPS, DATABASE_TO_MUSCLE_MAP } from '../components/anatomy/muscles';
import { VIEW_MODE_CONFIG } from '../components/anatomy/training-levels';
import type { MuscleId, TrainingLevel, ViewMode } from '../components/anatomy/muscles';

export interface MuscleVolumeData {
  muscleId: MuscleId;
  volume: number;
  sets: number;
  workouts: number;
}

export interface MuscleActivationResult {
  muscleStates: Partial<Record<MuscleId, TrainingLevel>>;
  muscleVolumes: Partial<Record<MuscleId, number>>;
  totalVolume: number;
  analysisDate: Date;
  viewMode: ViewMode;
}

/**
 * Calculate training volume for specific muscles over a time period
 */
export async function calculateMuscleVolume(
  viewMode: ViewMode = 'week',
  targetDate: Date = new Date()
): Promise<MuscleVolumeData[]> {
  const config = VIEW_MODE_CONFIG[viewMode];
  
  // Calculate date range
  const endDate = new Date(targetDate);
  const startDate = new Date(targetDate);
  startDate.setDate(startDate.getDate() - config.daysBack);

  try {
    // Get all workout data with exercises and sets
    const workoutResults = await db
      .select({
        workoutId: workouts.id,
        date: workouts.date,
        exerciseName: exerciseTable.name,
        muscleGroup: exerciseTable.muscle_group,
        weight: sets.weight,
        reps: sets.reps,
      })
      .from(workouts)
      .innerJoin(workout_exercises, eq(workouts.id, workout_exercises.workout_id))
      .innerJoin(exerciseTable, eq(workout_exercises.exercise_id, exerciseTable.id))
      .innerJoin(sets, eq(workout_exercises.id, sets.workout_exercise_id))
      .where(
        and(
          gte(workouts.date, startDate.toISOString()),
          lte(workouts.date, endDate.toISOString()),
          eq(sets.completed, 1) // Only count completed sets
        )
      )
      .orderBy(desc(workouts.date));

    // Group by muscle groups and calculate volumes
    const muscleVolumeMap = new Map<MuscleId, MuscleVolumeData>();
    const workoutTracker = new Map<MuscleId, Set<number>>();

    for (const row of workoutResults) {
      const muscleGroup = row.muscleGroup;
      // Split comma-separated muscle groups and get muscle IDs for each
      const muscleGroups = muscleGroup ? muscleGroup.split(',').map(g => g.trim()) : [];
      const allMuscleIds = muscleGroups.flatMap(group => DATABASE_TO_MUSCLE_MAP[group] || []);
      
      for (const muscleId of allMuscleIds) {
        // Calculate volume (1 set × reps × weight)
        const volume = (row.reps || 0) * (row.weight || 0);
        
        if (!muscleVolumeMap.has(muscleId)) {
          muscleVolumeMap.set(muscleId, {
            muscleId,
            volume: 0,
            sets: 0,
            workouts: 0
          });
          workoutTracker.set(muscleId, new Set());
        }

        const current = muscleVolumeMap.get(muscleId)!;
        current.volume += volume;
        current.sets += 1; // Count individual sets
        
        // Track unique workouts per muscle
        workoutTracker.get(muscleId)!.add(row.workoutId);
      }
    }

    // Update workout counts
    for (const [muscleId, data] of muscleVolumeMap) {
      data.workouts = workoutTracker.get(muscleId)?.size || 0;
    }

    return Array.from(muscleVolumeMap.values());
  } catch (error) {
    console.error('Error calculating muscle volume:', error);
    return [];
  }
}

/**
 * Analyze muscle activation levels based on volume data
 */
export function analyzeMuscleActivation(
  volumeData: MuscleVolumeData[],
  viewMode: ViewMode = 'week'
): MuscleActivationResult {
  const config = VIEW_MODE_CONFIG[viewMode];
  const muscleStates: Partial<Record<MuscleId, TrainingLevel>> = {};
  const muscleVolumes: Partial<Record<MuscleId, number>> = {};
  
  let totalVolume = 0;
  
  for (const data of volumeData) {
    totalVolume += data.volume;
    muscleVolumes[data.muscleId] = data.volume;
    
    // Determine training level based on volume thresholds
    let trainingLevel: TrainingLevel;
    
    if (data.volume === 0) {
      trainingLevel = 'untrained';
    } else if (data.volume < config.minVolume) {
      trainingLevel = 'undertrained';
    } else if (data.volume <= config.maxVolume) {
      trainingLevel = 'optimal';
    } else {
      trainingLevel = 'overtrained';
    }
    
    muscleStates[data.muscleId] = trainingLevel;
  }
  
  return {
    muscleStates,
    muscleVolumes,
    totalVolume,
    analysisDate: new Date(),
    viewMode
  };
}

/**
 * Get muscle activation map for display
 */
export async function getMuscleActivationMap(
  viewMode: ViewMode = 'week',
  targetDate: Date = new Date()
): Promise<MuscleActivationResult> {
  const volumeData = await calculateMuscleVolume(viewMode, targetDate);
  return analyzeMuscleActivation(volumeData, viewMode);
}

/**
 * Get detailed muscle statistics for a specific muscle
 */
export async function getMuscleStatistics(
  muscleId: MuscleId,
  viewMode: ViewMode = 'week',
  targetDate: Date = new Date()
): Promise<{
  muscleId: MuscleId;
  muscleName: string;
  databaseGroup: string;
  volume: number;
  sets: number;
  workouts: number;
  trainingLevel: TrainingLevel;
  exercises: Array<{
    name: string;
    volume: number;
    sets: number;
    workouts: number;
  }>;
}> {
  const config = VIEW_MODE_CONFIG[viewMode];
  const databaseGroup = MUSCLE_GROUPS[muscleId];
  
  // Calculate date range
  const endDate = new Date(targetDate);
  const startDate = new Date(targetDate);
  startDate.setDate(startDate.getDate() - config.daysBack);

  try {
    // Get exercise data for this muscle group
    const exerciseResults = await db
      .select({
        exerciseName: exerciseTable.name,
        weight: sets.weight,
        reps: sets.reps,
        workoutId: workout_exercises.workout_id,
      })
      .from(sets)
      .innerJoin(workout_exercises, eq(sets.workout_exercise_id, workout_exercises.id))
      .innerJoin(exerciseTable, eq(workout_exercises.exercise_id, exerciseTable.id))
      .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
      .where(
        and(
          eq(exerciseTable.muscle_group, databaseGroup),
          gte(workouts.date, startDate.toISOString()),
          lte(workouts.date, endDate.toISOString()),
          eq(sets.completed, 1)
        )
      );

    // Aggregate by exercise
    const exerciseMap = new Map<string, {
      name: string;
      volume: number;
      sets: number;
      workouts: Set<string>;
    }>();

    let totalVolume = 0;
    let totalSets = 0;
    const allWorkouts = new Set<string>();

    for (const row of exerciseResults) {
      const volume = (row.reps || 0) * (row.weight || 0);
      
      if (!exerciseMap.has(row.exerciseName)) {
        exerciseMap.set(row.exerciseName, {
          name: row.exerciseName,
          volume: 0,
          sets: 0,
          workouts: new Set()
        });
      }

      const exercise = exerciseMap.get(row.exerciseName)!;
      exercise.volume += volume;
      exercise.sets += 1; // Count individual sets
      exercise.workouts.add(row.workoutId.toString());

      totalVolume += volume;
      totalSets += 1;
      allWorkouts.add(row.workoutId.toString());
    }

    // Determine training level
    let trainingLevel: TrainingLevel;
    if (totalVolume === 0) {
      trainingLevel = 'untrained';
    } else if (totalVolume < config.minVolume) {
      trainingLevel = 'undertrained';
    } else if (totalVolume <= config.maxVolume) {
      trainingLevel = 'optimal';
    } else {
      trainingLevel = 'overtrained';
    }

    // Convert exercises to final format
    const exercises = Array.from(exerciseMap.values()).map(ex => ({
      name: ex.name,
      volume: ex.volume,
      sets: ex.sets,
      workouts: ex.workouts.size
    }));

    return {
      muscleId,
      muscleName: muscleId.charAt(0).toUpperCase() + muscleId.slice(1),
      databaseGroup,
      volume: totalVolume,
      sets: totalSets,
      workouts: allWorkouts.size,
      trainingLevel,
      exercises: exercises.sort((a, b) => b.volume - a.volume)
    };
  } catch (error) {
    console.error('Error getting muscle statistics:', error);
    return {
      muscleId,
      muscleName: muscleId.charAt(0).toUpperCase() + muscleId.slice(1),
      databaseGroup,
      volume: 0,
      sets: 0,
      workouts: 0,
      trainingLevel: 'untrained',
      exercises: []
    };
  }
}

/**
 * Compare muscle activation between two time periods
 */
export async function compareMuscleActivation(
  currentDate: Date,
  previousDate: Date,
  viewMode: ViewMode = 'week'
): Promise<{
  current: MuscleActivationResult;
  previous: MuscleActivationResult;
  changes: Array<{
    muscleId: MuscleId;
    currentLevel: TrainingLevel;
    previousLevel: TrainingLevel;
    volumeChange: number;
    percentChange: number;
  }>;
}> {
  const [current, previous] = await Promise.all([
    getMuscleActivationMap(viewMode, currentDate),
    getMuscleActivationMap(viewMode, previousDate)
  ]);

  const changes: Array<{
    muscleId: MuscleId;
    currentLevel: TrainingLevel;
    previousLevel: TrainingLevel;
    volumeChange: number;
    percentChange: number;
  }> = [];

  // Get volume data for comparison
  const [currentVolume, previousVolume] = await Promise.all([
    calculateMuscleVolume(viewMode, currentDate),
    calculateMuscleVolume(viewMode, previousDate)
  ]);

  const currentVolumeMap = new Map(currentVolume.map(v => [v.muscleId, v.volume]));
  const previousVolumeMap = new Map(previousVolume.map(v => [v.muscleId, v.volume]));

  // Compare all muscle groups
  const allMuscles = new Set([
    ...Object.keys(current.muscleStates) as MuscleId[],
    ...Object.keys(previous.muscleStates) as MuscleId[]
  ]);

  for (const muscleId of allMuscles) {
    const currentLevel = current.muscleStates[muscleId] || 'untrained';
    const previousLevel = previous.muscleStates[muscleId] || 'untrained';
    const currentVol = currentVolumeMap.get(muscleId) || 0;
    const previousVol = previousVolumeMap.get(muscleId) || 0;
    
    const volumeChange = currentVol - previousVol;
    const percentChange = previousVol > 0 ? (volumeChange / previousVol) * 100 : 0;

    changes.push({
      muscleId,
      currentLevel,
      previousLevel,
      volumeChange,
      percentChange
    });
  }

  return {
    current,
    previous,
    changes: changes.sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange))
  };
}
