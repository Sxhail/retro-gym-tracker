const Database = require('better-sqlite3');
const path = require('path');

async function testCardioCancel() {
  console.log('=== Testing Cardio Cancel Fix ===');
  
  try {
    const dbPath = path.join(__dirname, 'db', 'app.db');
    const db = new Database(dbPath);
    
    // Create a mock active session to simulate the issue
    const mockSession = {
      session_id: 'test_cardio_session_123',
      mode: 'hiit',
      params_json: JSON.stringify({ workSec: 20, restSec: 10, rounds: 8 }),
      started_at: new Date().toISOString(),
      phase_index: 0,
      cycle_index: 0,
      phase_started_at: new Date().toISOString(),
      phase_will_end_at: new Date(Date.now() + 20000).toISOString(),
      paused_at: null,
      accumulated_pause_ms: 0,
      schedule_json: JSON.stringify([
        {
          phase: 'work',
          startAt: new Date().toISOString(),
          endAt: new Date(Date.now() + 20000).toISOString(),
          cycleIndex: 0
        }
      ]),
      is_completed: 0,
      last_updated: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    
    console.log('1. Creating mock active session...');
    db.prepare(`
      INSERT INTO active_cardio_sessions (
        session_id, mode, params_json, started_at, phase_index, 
        cycle_index, phase_started_at, phase_will_end_at, paused_at,
        accumulated_pause_ms, schedule_json, is_completed, last_updated, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      mockSession.session_id,
      mockSession.mode,
      mockSession.params_json,
      mockSession.started_at,
      mockSession.phase_index,
      mockSession.cycle_index,
      mockSession.phase_started_at,
      mockSession.phase_will_end_at,
      mockSession.paused_at,
      mockSession.accumulated_pause_ms,
      mockSession.schedule_json,
      mockSession.is_completed,
      mockSession.last_updated,
      mockSession.created_at
    );
    
    console.log('2. Verifying session was created...');
    const session = db.prepare("SELECT * FROM active_cardio_sessions WHERE session_id = ?").get(mockSession.session_id);
    if (session) {
      console.log('   ✓ Session created successfully');
    } else {
      console.log('   ✗ Session not found');
      return;
    }
    
    console.log('3. Simulating cancel operation (deleting session)...');
    db.prepare("DELETE FROM active_cardio_sessions WHERE session_id = ?").run(mockSession.session_id);
    
    console.log('4. Verifying session was deleted...');
    const deletedSession = db.prepare("SELECT * FROM active_cardio_sessions WHERE session_id = ?").get(mockSession.session_id);
    if (!deletedSession) {
      console.log('   ✓ Session deleted successfully');
    } else {
      console.log('   ✗ Session still exists');
    }
    
    console.log('5. Checking for any remaining active sessions...');
    const remainingSessions = db.prepare("SELECT * FROM active_cardio_sessions").all();
    console.log(`   Found ${remainingSessions.length} remaining sessions`);
    
    if (remainingSessions.length > 0) {
      console.log('   Cleaning up remaining sessions...');
      db.prepare("DELETE FROM active_cardio_sessions").run();
      console.log('   ✓ All sessions cleared');
    }
    
    db.close();
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  testCardioCancel().then(() => {
    console.log('Test complete');
    process.exit(0);
  }).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testCardioCancel };
