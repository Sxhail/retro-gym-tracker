import type { ExerciseJson } from './initDb';
import { getDb } from './initDb';

export interface Exercise {
  id: number;
  name: string;
  muscle_groups: string[];
  categories: string[];
}

export interface WorkoutSession {
  id: number;
  date: string;
  // Add more fields as needed
}

export interface WorkoutSet {
  id: number;
  session_id: number;
  exercise_id: number;
  reps: number;
  weight: number;
  // Add more fields as needed
}

// Get exercises filtered by muscle group and/or category
export async function getExercisesByFilter(
  muscleGroups: string[] = [],
  categories: string[] = [],
): Promise<Exercise[]> {
  const db = await getDb();
  // @ts-ignore: transaction is available on the db instance
  const dbWithTx = db as any;
  let sql = `SELECT e.id, e.name FROM exercises e`;
  const joins: string[] = [];
  const wheres: string[] = [];
  const params: any[] = [];

  if (muscleGroups.length > 0) {
    joins.push('JOIN exercise_muscle em ON e.id = em.exercise_id');
    joins.push('JOIN muscle_groups mg ON em.muscle_group_id = mg.id');
    wheres.push(`mg.name IN (${muscleGroups.map(() => '?').join(',')})`);
    params.push(...muscleGroups);
  }
  if (categories.length > 0) {
    joins.push('JOIN exercise_category ec ON e.id = ec.exercise_id');
    joins.push('JOIN categories c ON ec.category_id = c.id');
    wheres.push(`c.name IN (${categories.map(() => '?').join(',')})`);
    params.push(...categories);
  }
  if (joins.length > 0) sql += ' ' + joins.join(' ');
  if (wheres.length > 0) sql += ' WHERE ' + wheres.join(' AND ');
  sql += ' GROUP BY e.id, e.name';

  return new Promise<Exercise[]>((resolve, reject) => {
    dbWithTx.transaction(
      (tx: any) => {
        tx.executeSql(
          sql,
          params,
          (_tx: any, result: any) => {
            const exercises: Exercise[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              exercises.push({ id: result.rows.item(i).id, name: result.rows.item(i).name, muscle_groups: [], categories: [] });
            }
            resolve(exercises);
          },
          (_tx: any, err: any) => {
            console.error('getExercisesByFilter error:', err);
            reject(err);
            return true;
          }
        );
      },
      (err: any) => {
        console.error('getExercisesByFilter transaction error:', err);
        reject(err);
      }
    );
  });
}

// Search exercises by name (case-insensitive, partial match)
export async function searchExercisesByName(query: string): Promise<Exercise[]> {
  const db = await getDb();
  // @ts-ignore: transaction is available on the db instance
  const dbWithTx = db as any;
  return new Promise<Exercise[]>((resolve, reject) => {
    dbWithTx.transaction(
      (tx: any) => {
        tx.executeSql(
          `SELECT id, name FROM exercises WHERE name LIKE ? COLLATE NOCASE`,
          [`%${query}%`],
          (_tx: any, result: any) => {
            const exercises: Exercise[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              exercises.push({ id: result.rows.item(i).id, name: result.rows.item(i).name, muscle_groups: [], categories: [] });
            }
            resolve(exercises);
          },
          (_tx: any, err: any) => {
            console.error('searchExercisesByName error:', err);
            reject(err);
            return true;
          }
        );
      },
      (err: any) => {
        console.error('searchExercisesByName transaction error:', err);
        reject(err);
      }
    );
  });
}

// (Stub) Get sets for a workout session
export async function getSetsForSession(sessionId: number): Promise<WorkoutSet[]> {
  // Implement when workout/session tables are defined
  return [];
}

// (Stub) Get all workout sessions
export async function getWorkoutSessions(): Promise<WorkoutSession[]> {
  // Implement when workout/session tables are defined
  return [];
} 