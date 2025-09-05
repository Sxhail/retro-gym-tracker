// Simple SQLite check using expo-sqlite directly
const Database = require('better-sqlite3');
const path = require('path');

try {
  console.log('Connecting to database...');
  const dbPath = path.join(__dirname, 'db', 'app.db');
  const db = new Database(dbPath);
  
  console.log('Database connected successfully');
  
  // Check if tables exist
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables found:', tables.map(t => t.name));
  
  // Check workouts table
  try {
    const workoutCount = db.prepare("SELECT COUNT(*) as count FROM workouts").get();
    console.log('Workouts count:', workoutCount.count);
    
    // Try to fetch some workouts
    const workouts = db.prepare(`
      SELECT w.id, w.name, w.date, w.duration,
             COUNT(DISTINCT we.id) as exerciseCount,
             COUNT(s.id) as totalSets
      FROM workouts w
      LEFT JOIN workout_exercises we ON w.id = we.workout_id
      LEFT JOIN sets s ON we.id = s.workout_exercise_id
      GROUP BY w.id
      ORDER BY w.date DESC
      LIMIT 5
    `).all();
    
    console.log('Sample workouts:', workouts);
    
  } catch (error) {
    console.error('Error querying workouts:', error);
  }
  
  db.close();
  
} catch (error) {
  console.error('Database connection error:', error);
}
