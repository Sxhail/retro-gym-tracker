const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const exercisesJsonPath = path.join(__dirname, '..', 'db', 'exercises.json');
const dbPath = path.join(__dirname, '..', 'db', 'app.db');

// Read and parse exercises.json
const exercises = JSON.parse(fs.readFileSync(exercisesJsonPath, 'utf8'));

// Remove old DB if exists
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Create exercises table
  db.run(`CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    muscle_group TEXT,
    is_custom INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create workouts table
  db.run(`CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    duration INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create workout_exercises table
  db.run(`CREATE TABLE IF NOT EXISTS workout_exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER NOT NULL,
    exercise_id INTEGER NOT NULL,
    distance REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
  )`);

  // Create sets table
  db.run(`CREATE TABLE IF NOT EXISTS sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_exercise_id INTEGER NOT NULL,
    set_index INTEGER NOT NULL,
    weight REAL NOT NULL,
    reps INTEGER NOT NULL,
    notes TEXT,
    rest_duration INTEGER NOT NULL,
    completed INTEGER DEFAULT 1 NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE
  )`);

  // Prepare insert statement
  const stmt = db.prepare(
    'INSERT INTO exercises (name, category, muscle_group, is_custom) VALUES (?, ?, ?, 0)'
  );

  for (const ex of exercises) {
    // Flatten categories and muscle_groups to comma-separated strings
    const category = Array.isArray(ex.categories) ? ex.categories.join(', ') : (ex.category || '');
    const muscle_group = Array.isArray(ex.muscle_groups) ? ex.muscle_groups.join(', ') : (ex.muscle_group || '');
    stmt.run(ex.name, category, muscle_group);
  }

  stmt.finalize();

  console.log(`Inserted ${exercises.length} exercises into app.db`);
  console.log('Created tables: exercises, workouts, workout_exercises, sets');
});

db.close(); 