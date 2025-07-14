import * as SQLite from 'expo-sqlite';
import type { ExerciseJson } from './initDb';

const db = (SQLite as any).openDatabase('gym.db');

// --- TypeScript interfaces ---
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

// --- Data-access utilities ---

// Get exercises filtered by muscle group and/or category
export function getExercisesByFilter(
  muscleGroups: string[] = [],
  categories: string[] = [],
): Promise<Exercise[]> {
  return new Promise((resolve, reject) => {
    let sql = `SELECT e.id, e.name
      FROM exercises e`;
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

    db.transaction((tx: any) => {
      tx.executeSql(
        sql,
        params,
        (_: any, { rows }: any) => {
          const exercises: Exercise[] = [];
          for (let i = 0; i < rows.length; i++) {
            exercises.push({ id: rows.item(i).id, name: rows.item(i).name, muscle_groups: [], categories: [] });
          }
          resolve(exercises);
        },
        (err: any) => {
          console.error('getExercisesByFilter error:', err);
          reject(err);
          return true;
        }
      );
    });
  });
}

// Search exercises by name (case-insensitive, partial match)
export function searchExercisesByName(query: string): Promise<Exercise[]> {
  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      tx.executeSql(
        `SELECT id, name FROM exercises WHERE name LIKE ? COLLATE NOCASE`,
        [`%${query}%`],
        (_: any, { rows }: any) => {
          const exercises: Exercise[] = [];
          for (let i = 0; i < rows.length; i++) {
            exercises.push({ id: rows.item(i).id, name: rows.item(i).name, muscle_groups: [], categories: [] });
          }
          resolve(exercises);
        },
        (err: any) => {
          console.error('searchExercisesByName error:', err);
          reject(err);
          return true;
        }
      );
    });
  });
}

// (Stub) Get sets for a workout session
export function getSetsForSession(sessionId: number): Promise<WorkoutSet[]> {
  // Implement when workout/session tables are defined
  return Promise.resolve([]);
}

// (Stub) Get all workout sessions
export function getWorkoutSessions(): Promise<WorkoutSession[]> {
  // Implement when workout/session tables are defined
  return Promise.resolve([]);
} 