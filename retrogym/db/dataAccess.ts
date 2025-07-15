import type { ExerciseJson } from './initDb';
import { getDb } from './initDb';

export interface Exercise {
  id: number;
  name: string;
  muscle_groups: string[];
  categories: string[];
}

// Helper to get muscle groups for an exercise
async function getMuscleGroupsForExercise(exerciseId: number): Promise<string[]> {
  const db = await getDb();
  const dbWithTx = db as any;
  return new Promise<string[]>((resolve, reject) => {
    dbWithTx.transaction((tx: any) => {
      tx.executeSql(
        `SELECT mg.name FROM muscle_groups mg
         JOIN exercise_muscle em ON mg.id = em.muscle_group_id
         WHERE em.exercise_id = ?`,
        [exerciseId],
        (_tx: any, result: any) => {
          const groups: string[] = [];
          for (let i = 0; i < result.rows.length; i++) {
            groups.push(result.rows.item(i).name);
          }
          resolve(groups);
        },
        (_tx: any, err: any) => {
          reject(err);
          return true;
        }
      );
    });
  });
}

// Helper to get categories for an exercise
async function getCategoriesForExercise(exerciseId: number): Promise<string[]> {
  const db = await getDb();
  const dbWithTx = db as any;
  return new Promise<string[]>((resolve, reject) => {
    dbWithTx.transaction((tx: any) => {
      tx.executeSql(
        `SELECT c.name FROM categories c
         JOIN exercise_category ec ON c.id = ec.category_id
         WHERE ec.exercise_id = ?`,
        [exerciseId],
        (_tx: any, result: any) => {
          const cats: string[] = [];
          for (let i = 0; i < result.rows.length; i++) {
            cats.push(result.rows.item(i).name);
          }
          resolve(cats);
        },
        (_tx: any, err: any) => {
          reject(err);
          return true;
        }
      );
    });
  });
}

// Get exercises filtered by muscle group and/or category
export async function getExercisesByFilter(
  muscleGroups: string[] = [],
  categories: string[] = [],
): Promise<Exercise[]> {
  const db = await getDb();
  const dbWithTx = db as any;
  let sql = `SELECT DISTINCT e.id, e.name FROM exercises e`;
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
          async (_tx: any, result: any) => {
            const exercises: Exercise[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              const muscle_groups = await getMuscleGroupsForExercise(row.id);
              const categories = await getCategoriesForExercise(row.id);
              exercises.push({
                id: row.id,
                name: row.name,
                muscle_groups,
                categories,
              });
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
  const dbWithTx = db as any;
  return new Promise<Exercise[]>((resolve, reject) => {
    dbWithTx.transaction(
      (tx: any) => {
        tx.executeSql(
          `SELECT id, name FROM exercises WHERE name LIKE ? COLLATE NOCASE`,
          [`%${query}%`],
          async (_tx: any, result: any) => {
            const exercises: Exercise[] = [];
            for (let i = 0; i < result.rows.length; i++) {
              const row = result.rows.item(i);
              const muscle_groups = await getMuscleGroupsForExercise(row.id);
              const categories = await getCategoriesForExercise(row.id);
              exercises.push({
                id: row.id,
                name: row.name,
                muscle_groups,
                categories,
              });
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