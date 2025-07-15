import * as SQLite from 'expo-sqlite';
import exercises from './exercises.json';

export type ExerciseJson = {
  name: string;
  muscle_groups: string[];
  categories: string[];
};

const DB_NAME = 'gym.db';
const DB_VERSION = 2; // Increment for future migrations

let db: SQLite.SQLiteDatabase | null = null;

export async function initializeDatabase(): Promise<void> {
  try {
    db = await SQLite.openDatabaseAsync({
      name: DB_NAME,
      version: DB_VERSION,
    });

    await db.execAsync([{ sql: `PRAGMA foreign_keys = ON;` }], false);

    // --- Migration logic (add new columns/tables here for future versions) ---
    // Example: if (db.version < 2) { await db.execAsync([{ sql: 'ALTER TABLE ...' }], false); }

    // --- Schema creation and index creation in a single batch ---
    const schemaSQL = `
      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );
      CREATE TABLE IF NOT EXISTS muscle_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );
      CREATE TABLE IF NOT EXISTS exercise_muscle (
        exercise_id INTEGER,
        muscle_group_id INTEGER,
        PRIMARY KEY (exercise_id, muscle_group_id),
        FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
        FOREIGN KEY (muscle_group_id) REFERENCES muscle_groups(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS exercise_category (
        exercise_id INTEGER,
        category_id INTEGER,
        PRIMARY KEY (exercise_id, category_id),
        FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS workout_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        notes TEXT
      );
      CREATE TABLE IF NOT EXISTS workout_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        reps INTEGER NOT NULL,
        weight REAL,
        FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_muscle_group_name ON muscle_groups(name);
      CREATE INDEX IF NOT EXISTS idx_category_name ON categories(name);
    `;
    await db.execAsync([{ sql: schemaSQL }], false);

    // --- Check if seeding is needed and perform bulk insert if so ---
    const countResult = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM exercises;`
    );
    if (countResult && countResult.count === 0) {
      // Prepare bulk insert SQL for exercises, muscle_groups, categories, and join tables
      const seenMuscles = new Set<string>();
      const seenCategories = new Set<string>();
      const exerciseInserts: string[] = [];
      const muscleInserts: string[] = [];
      const categoryInserts: string[] = [];
      const exerciseMuscleInserts: string[] = [];
      const exerciseCategoryInserts: string[] = [];

      for (const entry of exercises as ExerciseJson[]) {
        if (
          typeof entry.name !== 'string' ||
          !Array.isArray(entry.muscle_groups) ||
          !Array.isArray(entry.categories)
        ) {
          throw new Error(`Invalid exercise entry: ${JSON.stringify(entry)}`);
        }
        exerciseInserts.push(`INSERT OR IGNORE INTO exercises (name) VALUES (${escapeSql(entry.name)});`);
        for (const mg of entry.muscle_groups) {
          if (!seenMuscles.has(mg)) {
            muscleInserts.push(`INSERT OR IGNORE INTO muscle_groups (name) VALUES (${escapeSql(mg)});`);
            seenMuscles.add(mg);
          }
          exerciseMuscleInserts.push(`
            INSERT OR IGNORE INTO exercise_muscle (exercise_id, muscle_group_id)
            SELECT e.id, m.id FROM exercises e, muscle_groups m WHERE e.name = ${escapeSql(entry.name)} AND m.name = ${escapeSql(mg)};
          `);
        }
        for (const cat of entry.categories) {
          if (!seenCategories.has(cat)) {
            categoryInserts.push(`INSERT OR IGNORE INTO categories (name) VALUES (${escapeSql(cat)});`);
            seenCategories.add(cat);
          }
          exerciseCategoryInserts.push(`
            INSERT OR IGNORE INTO exercise_category (exercise_id, category_id)
            SELECT e.id, c.id FROM exercises e, categories c WHERE e.name = ${escapeSql(entry.name)} AND c.name = ${escapeSql(cat)};
          `);
        }
      }

      // Combine all seed SQL into a single batch
      const seedSQL = [
        ...muscleInserts,
        ...categoryInserts,
        ...exerciseInserts,
        ...exerciseMuscleInserts,
        ...exerciseCategoryInserts,
      ].join('\n');

      await db.execAsync([{ sql: seedSQL }], false);
      console.log('Database seeded with exercises.');
    }
  } catch (err: any) {
    console.error('Database initialization error:', err?.message || err);
    throw err;
  }
}

// Helper to escape SQL string literals
function escapeSql(str: string): string {
  return `'${str.replace(/'/g, "''")}'`;
}

// Export the async db getter for use in dataAccess and screens
export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    await initializeDatabase();
  }
  return db!;
} 