import * as SQLite from 'expo-sqlite';
import exercises from './exercises.json';

export type ExerciseJson = {
  name: string;
  muscle_groups: string[];
  categories: string[];
};

const db = (SQLite as any).openDatabase('gym.db');

export async function initializeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.transaction((tx: any) => {
      // Atomic schema creation
      tx.executeSql(`PRAGMA foreign_keys = ON;`);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS exercises (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE
        );
      `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS muscle_groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE
        );
      `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE
        );
      `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS exercise_muscle (
          exercise_id INTEGER,
          muscle_group_id INTEGER,
          PRIMARY KEY (exercise_id, muscle_group_id),
          FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
          FOREIGN KEY (muscle_group_id) REFERENCES muscle_groups(id) ON DELETE CASCADE
        );
      `);
      tx.executeSql(`
        CREATE TABLE IF NOT EXISTS exercise_category (
          exercise_id INTEGER,
          category_id INTEGER,
          PRIMARY KEY (exercise_id, category_id),
          FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        );
      `);
      // Indexes for fast lookup
      tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_muscle_group_name ON muscle_groups(name);`);
      tx.executeSql(`CREATE INDEX IF NOT EXISTS idx_category_name ON categories(name);`);
      // Check if seeding is needed
      tx.executeSql(
        `SELECT COUNT(*) as count FROM exercises;`,
        [],
        (_: any, { rows }: any) => {
          if (rows.item(0).count > 0) {
            resolve(); // Already seeded
            return;
          }
          try {
            for (const entry of exercises as ExerciseJson[]) {
              if (
                typeof entry.name !== 'string' ||
                !Array.isArray(entry.muscle_groups) ||
                !Array.isArray(entry.categories)
              ) {
                throw new Error(`Invalid exercise entry: ${JSON.stringify(entry)}`);
              }
              tx.executeSql(
                `INSERT OR IGNORE INTO exercises (name) VALUES (?);`,
                [entry.name]
              );
              for (const mg of entry.muscle_groups) {
                tx.executeSql(
                  `INSERT OR IGNORE INTO muscle_groups (name) VALUES (?);`,
                  [mg]
                );
                tx.executeSql(
                  `INSERT OR IGNORE INTO exercise_muscle (exercise_id, muscle_group_id)
                   SELECT e.id, m.id FROM exercises e, muscle_groups m WHERE e.name = ? AND m.name = ?;`,
                  [entry.name, mg]
                );
              }
              for (const cat of entry.categories) {
                tx.executeSql(
                  `INSERT OR IGNORE INTO categories (name) VALUES (?);`,
                  [cat]
                );
                tx.executeSql(
                  `INSERT OR IGNORE INTO exercise_category (exercise_id, category_id)
                   SELECT e.id, c.id FROM exercises e, categories c WHERE e.name = ? AND c.name = ?;`,
                  [entry.name, cat]
                );
              }
            }
            resolve();
          } catch (err) {
            console.error('Seeding error:', err);
            reject(err);
          }
        },
        (err: any) => {
          console.error('Error checking exercises table:', err);
          reject(err);
          return true;
        }
      );
    },
    (err: any) => {
      console.error('DB transaction error:', err);
      reject(err);
    });
  });
} 