#!/usr/bin/env node

/**
 * Cardio Notifications Test Script
 * 
 * This script tests the enhanced cardio notification system to ensure:
 * 1. Notifications appear at the right time for each phase
 * 2. Notifications are reliable even when app is backgrounded
 * 3. Multiple alerts don't appear at once (proper spacing)
 * 4. Session changes cancel/reschedule notifications correctly
 * 5. No duplicate alerts are created
 * 6. Interruptions are handled smoothly
 * 7. Messages are clear and descriptive
 */

const { cardioBackgroundSessionService } = require('../services/cardioBackgroundSession');
const IOSLocalNotifications = require('../services/iosNotifications').default;

// Test configuration
const TEST_SESSION_ID = 'test_cardio_notifications_' + Date.now();
const TEST_SCENARIOS = {
  HIIT_SHORT: {
    mode: 'hiit',
    params: { workSec: 5, restSec: 3, rounds: 3, includeTrailingRest: false },
    name: 'Short HIIT Test'
  },
  WALKRUN_SHORT: {
    mode: 'walk_run',
    params: { runSec: 6, walkSec: 4, laps: 2, includeTrailingWalk: false },
    name: 'Short Walk/Run Test'
  }
};

function createMockSchedule(startMs, mode, params) {
  const schedule = [];
  let t = startMs;
  
  if (mode === 'hiit') {
    for (let r = 0; r < params.rounds; r++) {
      // Work phase
      const workStart = t;
      const workEnd = workStart + (params.workSec * 1000);
      schedule.push({
        phase: 'work',
        startAt: new Date(workStart).toISOString(),
        endAt: new Date(workEnd).toISOString(),
        cycleIndex: r
      });
      t = workEnd;

      // Rest phase (except possibly last)
      const isLast = r === params.rounds - 1;
      const includeRest = params.includeTrailingRest || !isLast;
      if (includeRest) {
        const restStart = t;
        const restEnd = restStart + (params.restSec * 1000);
        schedule.push({
          phase: 'rest',
          startAt: new Date(restStart).toISOString(),
          endAt: new Date(restEnd).toISOString(),
          cycleIndex: r
        });
        t = restEnd;
      }
    }
  } else if (mode === 'walk_run') {
    for (let l = 0; l < params.laps; l++) {
      // Run phase
      const runStart = t;
      const runEnd = runStart + (params.runSec * 1000);
      schedule.push({
        phase: 'run',
        startAt: new Date(runStart).toISOString(),
        endAt: new Date(runEnd).toISOString(),
        cycleIndex: l
      });
      t = runEnd;

      // Walk phase (except possibly last)
      const isLast = l === params.laps - 1;
      const includeWalk = params.includeTrailingWalk || !isLast;
      if (includeWalk) {
        const walkStart = t;
        const walkEnd = walkStart + (params.walkSec * 1000);
        schedule.push({
          phase: 'walk',
          startAt: new Date(walkStart).toISOString(),
          endAt: new Date(walkEnd).toISOString(),
          cycleIndex: l
        });
        t = walkEnd;
      }
    }
  }

  // Add completion marker
  schedule.push({
    phase: 'completed',
    startAt: new Date(t).toISOString(),
    endAt: new Date(t).toISOString(),
    cycleIndex: mode === 'hiit' ? params.rounds - 1 : params.laps - 1
  });

  return schedule;
}

async function testBasicNotificationScheduling() {
  console.log('\n🧪 Testing Basic Notification Scheduling...');
  
  const scenario = TEST_SCENARIOS.HIIT_SHORT;
  const startMs = Date.now() + 3000; // Start in 3 seconds
  const schedule = createMockSchedule(startMs, scenario.mode, scenario.params);
  
  console.log(`📅 Created schedule with ${schedule.length} phases`);
  schedule.forEach((phase, i) => {
    const startTime = new Date(phase.startAt).toLocaleTimeString();
    const endTime = new Date(phase.endAt).toLocaleTimeString();
    console.log(`  ${i}: ${phase.phase} (cycle ${phase.cycleIndex}) - ${startTime} to ${endTime}`);
  });

  try {
    await cardioBackgroundSessionService.scheduleNotifications(TEST_SESSION_ID, schedule);
    console.log('✅ Notifications scheduled successfully');
    
    // Wait a bit to see if notifications fire
    console.log('⏳ Waiting 30 seconds to observe notifications...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
  } catch (error) {
    console.error('❌ Failed to schedule notifications:', error);
  }
}

async function testNotificationSpacing() {
  console.log('\n🧪 Testing Notification Spacing...');
  
  // Create a schedule with phases very close together
  const startMs = Date.now() + 2000;
  const closeSchedule = [
    {
      phase: 'work',
      startAt: new Date(startMs).toISOString(),
      endAt: new Date(startMs + 1000).toISOString(), // 1 second
      cycleIndex: 0
    },
    {
      phase: 'rest',
      startAt: new Date(startMs + 1000).toISOString(),
      endAt: new Date(startMs + 1500).toISOString(), // 0.5 seconds
      cycleIndex: 0
    },
    {
      phase: 'work',
      startAt: new Date(startMs + 1500).toISOString(),
      endAt: new Date(startMs + 2000).toISOString(), // 0.5 seconds
      cycleIndex: 1
    },
    {
      phase: 'completed',
      startAt: new Date(startMs + 2000).toISOString(),
      endAt: new Date(startMs + 2000).toISOString(),
      cycleIndex: 1
    }
  ];

  console.log('📅 Testing schedule with close phase transitions:');
  closeSchedule.forEach((phase, i) => {
    const endTime = new Date(phase.endAt).toLocaleTimeString();
    console.log(`  ${i}: ${phase.phase} ends at ${endTime}`);
  });

  try {
    const sessionId = TEST_SESSION_ID + '_spacing';
    await cardioBackgroundSessionService.scheduleNotifications(sessionId, closeSchedule);
    console.log('✅ Close notifications scheduled (should be automatically spaced)');
    
    // Wait to observe spacing
    console.log('⏳ Waiting 15 seconds to observe notification spacing...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
  } catch (error) {
    console.error('❌ Failed to test notification spacing:', error);
  }
}

async function testSessionStateChanges() {
  console.log('\n🧪 Testing Session State Changes...');
  
  const scenario = TEST_SCENARIOS.WALKRUN_SHORT;
  const startMs = Date.now() + 2000;
  const schedule = createMockSchedule(startMs, scenario.mode, scenario.params);
  const sessionId = TEST_SESSION_ID + '_state_changes';

  try {
    // Schedule initial notifications
    console.log('📝 Scheduling initial notifications...');
    await cardioBackgroundSessionService.scheduleNotifications(sessionId, schedule);
    
    // Wait 3 seconds, then simulate pause
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('⏸️ Simulating pause...');
    await cardioBackgroundSessionService.handleSessionStateChange(sessionId, 'pause');
    
    // Wait 2 seconds, then simulate resume with shifted schedule
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('▶️ Simulating resume...');
    const shiftMs = 2000; // 2 second pause
    const shiftedSchedule = schedule.map(phase => ({
      ...phase,
      startAt: new Date(new Date(phase.startAt).getTime() + shiftMs).toISOString(),
      endAt: new Date(new Date(phase.endAt).getTime() + shiftMs).toISOString()
    }));
    await cardioBackgroundSessionService.handleSessionStateChange(sessionId, 'resume', shiftedSchedule);
    
    // Wait 5 seconds, then simulate cancel
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('❌ Simulating cancel...');
    await cardioBackgroundSessionService.handleSessionStateChange(sessionId, 'cancel');
    
    console.log('✅ Session state changes tested');
    
  } catch (error) {
    console.error('❌ Failed to test session state changes:', error);
  }
}

async function testDuplicatePrevention() {
  console.log('\n🧪 Testing Duplicate Prevention...');
  
  const scenario = TEST_SCENARIOS.HIIT_SHORT;
  const startMs = Date.now() + 3000;
  const schedule = createMockSchedule(startMs, scenario.mode, scenario.params);
  const sessionId = TEST_SESSION_ID + '_duplicates';

  try {
    // Schedule notifications multiple times rapidly
    console.log('📝 Rapidly scheduling notifications multiple times...');
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(cardioBackgroundSessionService.scheduleNotifications(sessionId, schedule));
    }
    
    await Promise.all(promises);
    console.log('✅ Multiple scheduling attempts completed (should have been deduplicated)');
    
    // Wait to see if duplicates appear
    console.log('⏳ Waiting 20 seconds to check for duplicate notifications...');
    await new Promise(resolve => setTimeout(resolve, 20000));
    
  } catch (error) {
    console.error('❌ Failed to test duplicate prevention:', error);
  }
}

async function testMessageClarity() {
  console.log('\n🧪 Testing Message Clarity...');
  
  console.log('📱 Testing HIIT messages...');
  const hiitSchedule = createMockSchedule(Date.now() + 2000, 'hiit', { workSec: 3, restSec: 2, rounds: 2 });
  await cardioBackgroundSessionService.scheduleNotifications(TEST_SESSION_ID + '_hiit_messages', hiitSchedule);
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('📱 Testing Walk/Run messages...');
  const walkRunSchedule = createMockSchedule(Date.now() + 2000, 'walk_run', { runSec: 3, walkSec: 2, laps: 2 });
  await cardioBackgroundSessionService.scheduleNotifications(TEST_SESSION_ID + '_walkrun_messages', walkRunSchedule);
  
  console.log('✅ Message clarity test completed');
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test notifications...');
  
  const testSessions = [
    TEST_SESSION_ID,
    TEST_SESSION_ID + '_spacing',
    TEST_SESSION_ID + '_state_changes',
    TEST_SESSION_ID + '_duplicates',
    TEST_SESSION_ID + '_hiit_messages',
    TEST_SESSION_ID + '_walkrun_messages'
  ];

  for (const sessionId of testSessions) {
    try {
      await cardioBackgroundSessionService.cancelAllNotifications(sessionId);
      await cardioBackgroundSessionService.clearActiveSession(sessionId);
    } catch (error) {
      console.warn(`⚠️ Failed to cleanup session ${sessionId}:`, error.message);
    }
  }
  
  console.log('✅ Cleanup completed');
}

async function runAllTests() {
  console.log('🚀 Starting Cardio Notification System Tests\n');
  console.log('Note: Make sure your device/simulator has notifications enabled');
  console.log('and the app has notification permissions.\n');

  try {
    await testBasicNotificationScheduling();
    await testNotificationSpacing();
    await testSessionStateChanges();
    await testDuplicatePrevention();
    await testMessageClarity();
  } catch (error) {
    console.error('💥 Test suite failed:', error);
  } finally {
    await cleanup();
  }

  console.log('\n🎉 All tests completed!');
  console.log('\nTo manually test:');
  console.log('1. Start a cardio session in the app');
  console.log('2. Background the app immediately');
  console.log('3. Observe notifications at phase transitions');
  console.log('4. Try pausing/resuming while backgrounded');
  console.log('5. Try canceling the session while backgrounded');
}

// Export for use in other scripts
module.exports = {
  testBasicNotificationScheduling,
  testNotificationSpacing,
  testSessionStateChanges,
  testDuplicatePrevention,
  testMessageClarity,
  cleanup,
  runAllTests
};

// Run tests if called directly
if (require.main === module) {
  runAllTests().catch(console.error);
}
