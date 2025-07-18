const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const exercisesJsonPath = path.join(__dirname, 'exercises.json');
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
});

db.close(); 