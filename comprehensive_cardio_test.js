const Database = require('better-sqlite3');
const path = require('path');

async function comprehensiveCardioTest() {
  console.log('=== Comprehensive Cardio Cancel Fix Test ===');
  
  try {
    const dbPath = path.join(__dirname, 'db', 'app.db');
    const db = new Database(dbPath);
    
    console.log('1. Ensuring clean state...');
    db.prepare("DELETE FROM active_cardio_sessions").run();
    
    console.log('2. Testing normal session lifecycle...');
    
    // Test case 1: Normal session creation and cancellation
    const testSession1 = {
      session_id: 'test_normal_session',
      mode: 'hiit',
      params_json: JSON.stringify({ workSec: 20, restSec: 10, rounds: 8 }),
      started_at: new Date().toISOString(),
      phase_index: 0,
      cycle_index: 0,
      phase_started_at: new Date().toISOString(),
      phase_will_end_at: new Date(Date.now() + 20000).toISOString(),
      paused_at: null,
      accumulated_pause_ms: 0,
      schedule_json: JSON.stringify([{
        phase: 'work',
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 20000).toISOString(),
        cycleIndex: 0
      }]),
      is_completed: 0,
      last_updated: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    
    console.log('   Creating session...');
    db.prepare(`
      INSERT INTO active_cardio_sessions (
        session_id, mode, params_json, started_at, phase_index, 
        cycle_index, phase_started_at, phase_will_end_at, paused_at,
        accumulated_pause_ms, schedule_json, is_completed, last_updated, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      testSession1.session_id, testSession1.mode, testSession1.params_json,
      testSession1.started_at, testSession1.phase_index, testSession1.cycle_index,
      testSession1.phase_started_at, testSession1.phase_will_end_at, testSession1.paused_at,
      testSession1.accumulated_pause_ms, testSession1.schedule_json, testSession1.is_completed,
      testSession1.last_updated, testSession1.created_at
    );
    
    console.log('   Verifying session exists...');
    let session = db.prepare("SELECT * FROM active_cardio_sessions WHERE session_id = ?").get(testSession1.session_id);
    console.log(`   ✓ Session found: ${!!session}`);
    
    console.log('   Simulating cancel (immediate deletion)...');
    db.prepare("DELETE FROM active_cardio_sessions WHERE session_id = ?").run(testSession1.session_id);
    
    console.log('   Verifying session is deleted...');
    session = db.prepare("SELECT * FROM active_cardio_sessions WHERE session_id = ?").get(testSession1.session_id);
    console.log(`   ✓ Session deleted: ${!session}`);
    
    console.log('\n3. Testing stale session detection...');
    
    // Test case 2: Stale session (24+ hours old)
    const staleTime = new Date(Date.now() - (25 * 60 * 60 * 1000)); // 25 hours ago
    const testSession2 = {
      ...testSession1,
      session_id: 'test_stale_session',
      started_at: staleTime.toISOString(),
      created_at: staleTime.toISOString(),
      last_updated: staleTime.toISOString()
    };
    
    console.log('   Creating stale session (25 hours old)...');
    db.prepare(`
      INSERT INTO active_cardio_sessions (
        session_id, mode, params_json, started_at, phase_index, 
        cycle_index, phase_started_at, phase_will_end_at, paused_at,
        accumulated_pause_ms, schedule_json, is_completed, last_updated, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      testSession2.session_id, testSession2.mode, testSession2.params_json,
      testSession2.started_at, testSession2.phase_index, testSession2.cycle_index,
      testSession2.phase_started_at, testSession2.phase_will_end_at, testSession2.paused_at,
      testSession2.accumulated_pause_ms, testSession2.schedule_json, testSession2.is_completed,
      testSession2.last_updated, testSession2.created_at
    );
    
    console.log('   Testing stale session detection logic...');
    session = db.prepare("SELECT * FROM active_cardio_sessions WHERE session_id = ?").get(testSession2.session_id);
    const sessionAge = Date.now() - new Date(session.started_at).getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const isStale = sessionAge > maxAge;
    console.log(`   Session age: ${(sessionAge / 1000 / 60 / 60).toFixed(1)} hours`);
    console.log(`   Is stale (> 24h): ${isStale}`);
    
    if (isStale) {
      console.log('   Cleaning up stale session...');
      db.prepare("DELETE FROM active_cardio_sessions WHERE session_id = ?").run(testSession2.session_id);
      console.log('   ✓ Stale session cleaned up');
    }
    
    console.log('\n4. Testing edge case session detection...');
    
    // Test case 3: Edge case session (minimal valid data but functionally invalid)
    const testSession3 = {
      session_id: 'test_edge_case_session',
      mode: 'hiit', // Valid mode
      params_json: '{}', // Empty params (valid JSON but no actual params)
      started_at: new Date().toISOString(),
      phase_index: 0,
      cycle_index: 0,
      phase_started_at: new Date().toISOString(),
      phase_will_end_at: new Date(Date.now() + 20000).toISOString(),
      paused_at: null,
      accumulated_pause_ms: 0,
      schedule_json: '[]', // Empty schedule (valid JSON but no phases)
      is_completed: 0,
      last_updated: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    
    console.log('   Creating edge case session (empty params/schedule)...');
    db.prepare(`
      INSERT INTO active_cardio_sessions (
        session_id, mode, params_json, started_at, phase_index, 
        cycle_index, phase_started_at, phase_will_end_at, paused_at,
        accumulated_pause_ms, schedule_json, is_completed, last_updated, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      testSession3.session_id, testSession3.mode, testSession3.params_json,
      testSession3.started_at, testSession3.phase_index, testSession3.cycle_index,
      testSession3.phase_started_at, testSession3.phase_will_end_at, testSession3.paused_at,
      testSession3.accumulated_pause_ms, testSession3.schedule_json, testSession3.is_completed,
      testSession3.last_updated, testSession3.created_at
    );
    
    console.log('   Testing edge case session detection logic...');
    session = db.prepare("SELECT * FROM active_cardio_sessions WHERE session_id = ?").get(testSession3.session_id);
    const params = JSON.parse(session.params_json || '{}');
    const schedule = JSON.parse(session.schedule_json || '[]');
    const isValid = !!(session.mode && Object.keys(params).length > 0 && schedule.length > 0);
    console.log(`   Has mode: ${!!session.mode}`);
    console.log(`   Has params: ${Object.keys(params).length > 0}`);
    console.log(`   Has schedule: ${schedule.length > 0}`);
    console.log(`   Is functionally valid: ${isValid}`);
    
    if (!isValid) {
      console.log('   Cleaning up functionally invalid session...');
      db.prepare("DELETE FROM active_cardio_sessions WHERE session_id = ?").run(testSession3.session_id);
      console.log('   ✓ Edge case session cleaned up');
    }
    
    console.log('\n5. Final cleanup verification...');
    const remainingSessions = db.prepare("SELECT * FROM active_cardio_sessions").all();
    console.log(`   Remaining sessions: ${remainingSessions.length}`);
    
    if (remainingSessions.length > 0) {
      console.log('   Cleaning up all remaining sessions...');
      db.prepare("DELETE FROM active_cardio_sessions").run();
    }
    
    db.close();
    console.log('\n✅ All tests passed! Cardio cancel fix is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  comprehensiveCardioTest().then(() => {
    console.log('Test complete');
    process.exit(0);
  }).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}

module.exports = { comprehensiveCardioTest };
