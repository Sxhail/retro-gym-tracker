#!/usr/bin/env node

/**
 * Cardio Notification Demo Script
 * 
 * This script demonstrates the enhanced cardio notification system
 * by creating a quick demo session that showcases all the key features.
 * 
 * Note: This is a demonstration script that shows the notification system logic.
 * To test actual notifications, use the app interface and background the app
 * during a cardio session to see notifications in action.
 */

// Demo configuration - This shows the structure but cannot import actual services in Node.js
const DEMO_SESSION_ID = 'demo_cardio_' + Date.now();

// This function demonstrates the schedule structure that the notification system uses
function createDemoSchedule() {
  const startMs = Date.now() + 5000; // Start in 5 seconds
  const schedule = [];
  let t = startMs;

  // Create a quick HIIT demo: 2 rounds of 8 seconds work, 4 seconds rest
  for (let round = 0; round < 2; round++) {
    // Work phase
    const workStart = t;
    const workEnd = workStart + 8000; // 8 seconds
    schedule.push({
      phase: 'work',
      startAt: new Date(workStart).toISOString(),
      endAt: new Date(workEnd).toISOString(),
      cycleIndex: round
    });
    t = workEnd;

    // Rest phase (except for last round)
    if (round < 1) {
      const restStart = t;
      const restEnd = restStart + 4000; // 4 seconds
      schedule.push({
        phase: 'rest',
        startAt: new Date(restStart).toISOString(),
        endAt: new Date(restEnd).toISOString(),
        cycleIndex: round
      });
      t = restEnd;
    }
  }

  // Completion phase
  schedule.push({
    phase: 'completed',
    startAt: new Date(t).toISOString(),
    endAt: new Date(t).toISOString(),
    cycleIndex: 1
  });

  return schedule;
}

async function demonstrateBasicNotifications() {
  console.log('🎯 DEMO: Basic Notification Scheduling');
  console.log('======================================');
  
  const schedule = createDemoSchedule();
  
  console.log('📅 Demo Schedule:');
  schedule.forEach((phase, i) => {
    const startTime = new Date(phase.startAt);
    const endTime = new Date(phase.endAt);
    const duration = (endTime.getTime() - startTime.getTime()) / 1000;
    console.log(`  ${i + 1}. ${phase.phase.toUpperCase()} (Round ${phase.cycleIndex + 1}) - ${duration}s - ends at ${endTime.toLocaleTimeString()}`);
  });

  console.log('\n🔔 This schedule would be passed to cardioBackgroundSessionService.scheduleNotifications()');
  console.log('✅ In the actual app, notifications would be scheduled at these times!');
  console.log('📱 To test real notifications, use the app interface and background it during a cardio session.\n');
}

async function demonstrateSessionStateChanges() {
  console.log('🎯 DEMO: Session State Changes');
  console.log('==============================');
  
  const sessionId = DEMO_SESSION_ID + '_state_demo';
  const schedule = createDemoSchedule();

  console.log('🔔 In the app, initial notifications would be scheduled...');
  console.log('⏸️ When user pauses: handleSessionStateChange(sessionId, "pause") cancels all notifications');
  console.log('▶️ When user resumes: handleSessionStateChange(sessionId, "resume", newSchedule) reschedules with shifted times');
  console.log('✅ This ensures notifications only appear when the session is actually running!\n');
}

async function demonstrateNotificationSpacing() {
  console.log('🎯 DEMO: Notification Spacing');
  console.log('=============================');
  
  const sessionId = DEMO_SESSION_ID + '_spacing_demo';
  
  // Create a schedule with phases very close together
  const startMs = Date.now() + 3000;
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

  console.log('📅 Close Schedule (before spacing):');
  closeSchedule.forEach((phase, i) => {
    const endTime = new Date(phase.endAt);
    console.log(`  ${i + 1}. ${phase.phase.toUpperCase()} ends at ${endTime.toLocaleTimeString()}`);
  });

  console.log('\n🔔 The spaceOutNotifications() function would automatically space these apart by 2+ seconds');
  console.log('✅ This prevents iOS from grouping notifications together!');
  console.log('📱 In the app, notifications would appear spaced properly, not all at once.\n');
}

async function demonstrateMessageClarity() {
  console.log('🎯 DEMO: Message Clarity');
  console.log('========================');
  
  console.log('📝 Sample notification messages:');
  
  const sampleMessages = [
    {
      phase: 'work',
      title: 'Work Phase Complete! ✅',
      body: 'Round 1 work done. Time to rest and recover.',
      context: 'HIIT work → rest transition'
    },
    {
      phase: 'rest', 
      title: 'Rest Time Over! 💥',
      body: 'Round 1 rest complete. Get ready to work!',
      context: 'HIIT rest → work transition'
    },
    {
      phase: 'run',
      title: 'Run Phase Done! 🏃‍♂️',
      body: 'Lap 1 run complete. Switch to walking pace.',
      context: 'Walk/Run run → walk transition'
    },
    {
      phase: 'walk',
      title: 'Walk Phase Done! 🚶‍♂️',
      body: 'Lap 1 walk complete. Time to pick up the pace!',
      context: 'Walk/Run walk → run transition'
    },
    {
      phase: 'completed',
      title: 'HIIT Session Complete! 🎉',
      body: 'Excellent work! Your HIIT session is finished.',
      context: 'Session completion'
    }
  ];

  sampleMessages.forEach(msg => {
    console.log(`\n📱 ${msg.context}:`);
    console.log(`   Title: "${msg.title}"`);
    console.log(`   Body: "${msg.body}"`);
  });

  console.log('\n✅ All messages include clear context and encouraging language!\n');
}

async function cleanup() {
  console.log('🧹 Demo completed - no actual cleanup needed since this is a demonstration script');
  console.log('✅ In the real app, notifications are automatically cleaned up when sessions end');
}

async function runDemo() {
  console.log('🚀 Enhanced Cardio Notification System Demo');
  console.log('===========================================\n');
  
  console.log('📱 This demo shows the notification system logic and structure.');
  console.log('� To test actual notifications, use the app interface!\n');

  try {
    await demonstrateMessageClarity();
    await demonstrateBasicNotifications();
    await demonstrateNotificationSpacing();
    await demonstrateSessionStateChanges();
    
  } catch (error) {
    console.error('💥 Demo failed:', error);
  } finally {
    await cleanup();
  }

  console.log('\n🎉 Demo completed!');
  console.log('\nKey features demonstrated:');
  console.log('✅ Timely phase transition notifications');  
  console.log('✅ Proper spacing to avoid notification grouping');
  console.log('✅ Session state change handling (pause/resume)');
  console.log('✅ Clear, contextual notification messages');
  console.log('✅ Automatic cleanup of notifications');
  
  console.log('\n🧪 TO TEST REAL NOTIFICATIONS:');
  console.log('1. Open the app and start a cardio session (HIIT or Walk/Run)');
  console.log('2. Immediately background the app or lock your phone');
  console.log('3. Wait for phase transitions to see notifications');
  console.log('4. Try pausing/resuming while backgrounded');
  
  console.log('\n📖 For more details, see docs/CARDIO_NOTIFICATIONS.md');
}

// Export for use in other scripts
module.exports = {
  demonstrateBasicNotifications,
  demonstrateSessionStateChanges,
  demonstrateNotificationSpacing,
  demonstrateMessageClarity,
  cleanup,
  runDemo
};

// Run demo if called directly
if (require.main === module) {
  runDemo().catch(console.error);
}
