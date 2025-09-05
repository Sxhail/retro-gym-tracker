const Database = require('better-sqlite3');
const path = require('path');

async function debugCardioCancel() {
  console.log('=== Debugging Cardio Cancel Issue ===');
  
  try {
    const dbPath = path.join(__dirname, 'db', 'app.db');
    const db = new Database(dbPath);
    
    console.log('Database connected successfully');
    
    // First, check what migrations have been applied
    try {
      const migrations = db.prepare("SELECT name FROM __drizzle_migrations ORDER BY id").all();
      console.log('Applied migrations:');
      migrations.forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.name}`);
      });
      console.log('');
    } catch (error) {
      console.log('Migration table not found:', error.message);
    }
    
    // Check what tables exist
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Available tables:', tables.map(t => t.name));
    
    // Try to create the cardio tables if they don't exist
    const cardioTables = tables.filter(t => t.name.toLowerCase().includes('cardio'));
    if (cardioTables.length === 0) {
      console.log('\nCardio tables not found. Attempting to create them...');
      
      try {
        // Create the cardio tables using the migration SQL
        const createActiveCardioSessions = `
          CREATE TABLE IF NOT EXISTS active_cardio_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL UNIQUE,
            mode TEXT NOT NULL,
            params_json TEXT NOT NULL,
            started_at TEXT NOT NULL,
            phase_index INTEGER NOT NULL DEFAULT 0,
            cycle_index INTEGER NOT NULL DEFAULT 0,
            phase_started_at TEXT NOT NULL,
            phase_will_end_at TEXT NOT NULL,
            paused_at TEXT,
            accumulated_pause_ms INTEGER NOT NULL DEFAULT 0,
            schedule_json TEXT NOT NULL,
            is_completed INTEGER NOT NULL DEFAULT 0,
            last_updated TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          );
        `;
        
        const createActiveCardioNotifications = `
          CREATE TABLE IF NOT EXISTS active_cardio_notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            notification_id TEXT NOT NULL,
            fire_at TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
          );
        `;
        
        const createCardioSessions = `
          CREATE TABLE IF NOT EXISTS cardio_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            name TEXT NOT NULL,
            date TEXT NOT NULL,
            duration INTEGER NOT NULL,
            calories_burned INTEGER DEFAULT 0,
            notes TEXT,
            work_time INTEGER,
            rest_time INTEGER,
            rounds INTEGER,
            run_time INTEGER,
            walk_time INTEGER,
            laps INTEGER
          );
        `;
        
        db.exec(createActiveCardioSessions);
        db.exec(createActiveCardioNotifications);
        db.exec(createCardioSessions);
        
        // Create indexes
        db.exec("CREATE INDEX IF NOT EXISTS idx_active_cardio_sessions_session_id ON active_cardio_sessions(session_id);");
        db.exec("CREATE INDEX IF NOT EXISTS idx_active_cardio_notifications_session_id ON active_cardio_notifications(session_id);");
        db.exec("CREATE INDEX IF NOT EXISTS idx_active_cardio_notifications_fire_at ON active_cardio_notifications(fire_at);");
        
        console.log('Cardio tables created successfully!');
        
      } catch (error) {
        console.error('Error creating cardio tables:', error);
      }
    }
    
    // Now check for active sessions
    try {
      const activeSessions = db.prepare("SELECT * FROM active_cardio_sessions").all();
      console.log('\nCurrent active cardio sessions:', activeSessions.length);
      
      if (activeSessions.length > 0) {
        console.log('Active sessions:');
        activeSessions.forEach((session, i) => {
          console.log(`  ${i + 1}. Session ID: ${session.session_id}`);
          console.log(`     Mode: ${session.mode}`);
          console.log(`     Started: ${session.started_at}`);
          console.log(`     Phase: ${session.phase_index}`);
          console.log(`     Paused: ${session.paused_at || 'No'}`);
          console.log(`     Completed: ${session.is_completed ? 'Yes' : 'No'}`);
          console.log(`     Last Updated: ${session.last_updated}`);
          console.log('');
        });
      } else {
        console.log('No active cardio sessions found.');
      }
    } catch (error) {
      console.log('Error checking active sessions:', error.message);
    }
    
    db.close();
    
  } catch (error) {
    console.error('Error checking cardio sessions:', error);
  }
}

if (require.main === module) {
  debugCardioCancel().then(() => {
    console.log('Debug complete');
    process.exit(0);
  }).catch(error => {
    console.error('Debug failed:', error);
    process.exit(1);
  });
}

module.exports = { debugCardioCancel };
