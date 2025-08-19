const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db', 'app.db');

console.log('Creating cardio sessions table...');

try {
  const db = new Database(dbPath);
  
  // Create cardio_sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS cardio_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      duration INTEGER NOT NULL,
      calories_burned INTEGER DEFAULT 0,
      work_time INTEGER,
      rest_time INTEGER,
      rounds INTEGER,
      run_time INTEGER,
      walk_time INTEGER,
      laps INTEGER,
      total_laps INTEGER,
      distance REAL,
      average_heart_rate INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✓ cardio_sessions table created successfully');
  
  db.close();
  console.log('✓ Database migration completed');
  
} catch (error) {
  console.error('Error during migration:', error);
  process.exit(1);
}
