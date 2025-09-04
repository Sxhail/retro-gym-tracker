const { drizzle } = require('drizzle-orm/better-sqlite3');
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Read exercises data
const exercisesData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'db', 'exercises.json'), 'utf8'));

// Connect to the project database
const sqlite = new Database('./db/app.db');
const db = drizzle(sqlite);

console.log('Forcing update of exercises table with latest data...');

// Clear existing exercises
sqlite.exec('DELETE FROM exercises');

// Insert all exercises from exercises.json
const stmt = sqlite.prepare(
  'INSERT INTO exercises (name, category, muscle_group, is_custom) VALUES (?, ?, ?, 0)'
);

let insertedCount = 0;
for (const ex of exercisesData.exercises) {
  // Skip exercises with 'variation' in the name (case-insensitive)
  if (ex.name && ex.name.toLowerCase().includes('variation')) continue;
  
  // Flatten categories and muscle_groups to comma-separated strings
  const category = Array.isArray(ex.categories) ? ex.categories.join(', ') : (ex.category || '');
  const muscle_group = Array.isArray(ex.muscle_groups) ? ex.muscle_groups.join(', ') : (ex.muscle_group || '');
  
  stmt.run(ex.name, category, muscle_group);
  insertedCount++;
}

console.log(`Successfully inserted ${insertedCount} exercises`);
console.log('Database updated. Please restart your app to see the new exercises.');

sqlite.close();
