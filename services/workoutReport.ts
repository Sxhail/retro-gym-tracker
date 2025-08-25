import { db } from '../db/client';
import { workouts, workout_exercises, sets, exercises } from '../db/schema';
import { eq, and, sql, inArray, desc } from 'drizzle-orm';
import { getWorkoutDetail, type WorkoutDetail } from './workoutHistory';

export type MuscleKey = 'Chest' | 'Back' | 'Legs' | 'Glutes' | 'Shoulders' | 'Triceps' | 'Biceps' | 'Core' | 'Arms' | 'Unknown';

export type PRItem = {
  exerciseId: number;
  exerciseName: string;
  type: 'weight' | 'repsAtWeight';
  weight: number;
  reps: number;
};

export type MuscleExerciseEntry = { exerciseId: number; exerciseName: string; volume: number };

export type WorkoutReport = {
  workout: WorkoutDetail;
  summary: { totalSets: number; totalReps: number; totalVolume: number; duration: number };
  prs: PRItem[];
  muscleVolumes: Record<MuscleKey, number>;
  muscleIntensity: Record<MuscleKey, number>;
  muscleExercises: Record<MuscleKey, MuscleExerciseEntry[]>;
};

function normalizeMuscleName(input?: string | null): MuscleKey {
  if (!input) return 'Unknown';
  const name = input.trim().toLowerCase();
  if (name.includes('chest') || name.includes('pec')) return 'Chest';
  if (name.includes('back') || name.includes('lat') || name.includes('lats')) return 'Back';
  if (name.includes('leg') || name.includes('quad') || name.includes('ham')) return 'Legs';
  if (name.includes('glute')) return 'Glutes';
  if (name.includes('shoulder') || name.includes('deltoid') || name.includes('delts')) return 'Shoulders';
  if (name.includes('tricep')) return 'Triceps';
  if (name.includes('bicep')) return 'Biceps';
  if (name.includes('core') || name.includes('ab') || name.includes('oblique')) return 'Core';
  if (name.includes('arm')) return 'Arms';
  return 'Unknown';
}

function splitMuscleGroups(group?: string | null): MuscleKey[] {
  if (!group) return ['Unknown'];
  const parts = group.split(/[,&/]/).map(p => normalizeMuscleName(p));
  const unique = Array.from(new Set(parts));
  return unique.length > 0 ? unique : ['Unknown'];
}

export async function getHistoricalMaxWeight(exerciseId: number, excludeWorkoutId?: number): Promise<number> {
  // Max historical weight for exercise, excluding the current workout id if provided
  const rows = await db
    .select({ maxW: sql<number>`MAX(${sets.weight})` })
    .from(sets)
    .innerJoin(workout_exercises, eq(sets.workout_exercise_id, workout_exercises.id))
    .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
    .where(
      excludeWorkoutId
        ? and(eq(workout_exercises.exercise_id, exerciseId), sql`${workouts.id} != ${excludeWorkoutId}`)
        : eq(workout_exercises.exercise_id, exerciseId)
    );
  return rows[0]?.maxW || 0;
}

export async function getHistoricalMaxRepsAtWeight(exerciseId: number, weight: number, excludeWorkoutId?: number): Promise<number> {
  // Max historical reps at EXACT weight for exercise
  const rows = await db
    .select({ maxReps: sql<number>`MAX(${sets.reps})` })
    .from(sets)
    .innerJoin(workout_exercises, eq(sets.workout_exercise_id, workout_exercises.id))
    .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
    .where(
      excludeWorkoutId
        ? and(eq(workout_exercises.exercise_id, exerciseId), sql`${sets.weight} = ${weight}`, sql`${workouts.id} != ${excludeWorkoutId}`)
        : and(eq(workout_exercises.exercise_id, exerciseId), sql`${sets.weight} = ${weight}`)
    );
  return rows[0]?.maxReps || 0;
}

export async function getWorkoutReportData(workoutId: number): Promise<WorkoutReport | null> {
  const workout = await getWorkoutDetail(workoutId);
  if (!workout) return null;

  // Summary
  let totalSets = 0;
  let totalReps = 0;
  let totalVolume = 0;
  for (const ex of workout.exercises) {
    for (const s of ex.sets) {
      totalSets += 1;
      const reps = Number(s.reps) || 0;
      const weight = Number(s.weight) || 0;
      totalReps += reps;
      if (reps > 0 && weight > 0) totalVolume += weight * reps;
    }
  }
  const summary = { totalSets, totalReps, totalVolume, duration: workout.duration };

  // Lookup muscle groups for involved exercises
  const exerciseIds = workout.exercises.map(e => e.exerciseId);
  const uniqueIds = Array.from(new Set(exerciseIds));
  const muscleRows = uniqueIds.length
    ? await db
        .select({ id: exercises.id, muscle_group: exercises.muscle_group })
        .from(exercises)
        .where(inArray(exercises.id, uniqueIds))
    : [];
  const muscleMap = new Map<number, string | null>();
  muscleRows.forEach(r => muscleMap.set(r.id, r.muscle_group));

  // Per-muscle volume
  const muscleVolumes: Record<MuscleKey, number> = {
    Chest: 0, Back: 0, Legs: 0, Glutes: 0, Shoulders: 0, Triceps: 0, Biceps: 0, Core: 0, Arms: 0, Unknown: 0,
  };
  const muscleExerciseMap: Record<MuscleKey, Map<number, { name: string; volume: number }>> = {
    Chest: new Map(), Back: new Map(), Legs: new Map(), Glutes: new Map(), Shoulders: new Map(), Triceps: new Map(), Biceps: new Map(), Core: new Map(), Arms: new Map(), Unknown: new Map(),
  };
  for (const ex of workout.exercises) {
    const mg = muscleMap.get(ex.exerciseId) ?? null;
    const muscles = splitMuscleGroups(mg);
    const divisor = muscles.length || 1;
    for (const s of ex.sets) {
      const reps = Number(s.reps) || 0;
      const weight = Number(s.weight) || 0;
      const vol = reps > 0 && weight > 0 ? weight * reps : 0;
      if (vol <= 0) continue;
      const share = vol / divisor;
      muscles.forEach(m => {
        muscleVolumes[m] = (muscleVolumes[m] || 0) + share;
        // accumulate per-muscle exercise volume for tooltip
        const map = muscleExerciseMap[m];
        const prev = map.get(ex.exerciseId)?.volume ?? 0;
        map.set(ex.exerciseId, { name: ex.exerciseName, volume: prev + share });
      });
    }
  }
  const maxVol = Math.max(...Object.values(muscleVolumes));
  const muscleIntensity: Record<MuscleKey, number> = Object.fromEntries(
    (Object.entries(muscleVolumes) as [MuscleKey, number][]) .map(([k, v]) => [k, maxVol > 0 ? v / maxVol : 0])
  ) as Record<MuscleKey, number>;
  const muscleExercises: Record<MuscleKey, MuscleExerciseEntry[]> = Object.fromEntries(
    (Object.entries(muscleExerciseMap) as [MuscleKey, Map<number, { name: string; volume: number }>][]) .map(([k, map]) => {
      const arr: MuscleExerciseEntry[] = Array.from(map.entries()).map(([id, v]) => ({ exerciseId: id, exerciseName: v.name, volume: v.volume }));
      arr.sort((a, b) => b.volume - a.volume);
      return [k, arr];
    })
  ) as Record<MuscleKey, MuscleExerciseEntry[]>;

  // PRs
  const prs: PRItem[] = [];
  // For each exercise, consider completed sets
  for (const ex of workout.exercises) {
    for (const s of ex.sets) {
      const reps = Number(s.reps) || 0;
      const weight = Number(s.weight) || 0;
      if (reps <= 0 || weight <= 0) continue;

      // Heaviest lift PR
      const histMaxW = await getHistoricalMaxWeight(ex.exerciseId, workout.id);
      if (weight > histMaxW) {
        prs.push({ exerciseId: ex.exerciseId, exerciseName: ex.exerciseName, type: 'weight', weight, reps });
        continue; // Prefer record by weight first for this set
      }

      // Most reps at weight PR
      const histMaxRepsAtW = await getHistoricalMaxRepsAtWeight(ex.exerciseId, weight, workout.id);
      if (reps > histMaxRepsAtW) {
        prs.push({ exerciseId: ex.exerciseId, exerciseName: ex.exerciseName, type: 'repsAtWeight', weight, reps });
      }
    }
  }

  return { workout, summary, prs, muscleVolumes, muscleIntensity, muscleExercises };
}
