#!/usr/bin/env node

/**
 * Test Script: Debug Countdown Notification Audio
 * 
 * This script helps debug why the countdown notification isn't playing the custom audio
 */

console.log('🔍 Debugging Countdown Notification Audio');
console.log('=========================================');

function debugCustomSoundIssues() {
  console.log('🎵 DEBUGGING: Custom Sound Issues');
  console.log('==================================');
  
  console.log('❌ Possible Issues:');
  console.log('1. Audio file not properly bundled in app');
  console.log('2. Incorrect sound file reference format');
  console.log('3. iOS notification sound requirements not met');
  console.log('4. Notification handler blocking sound playback');
  
  console.log('\n📋 expo-notifications Sound Requirements:');
  console.log('• File must be in app bundle (✅ cardio-countdown.wav is bundled)');
  console.log('• File format: WAV, AIFF, M4A (✅ WAV file exists)');
  console.log('• File duration: < 30 seconds (✅ ~3 seconds)');
  console.log('• Reference by filename only (✅ using "cardio-countdown.wav")');
  
  console.log('\n🔧 Troubleshooting Steps:');
  console.log('1. Verify audio file is properly bundled:');
  console.log('   - Check app/assets/cardio-countdown.wav exists ✅');
  console.log('   - Verify assetBundlePatterns includes "app/assets/**/*" ✅');
  
  console.log('\n2. Test notification sound reference:');
  console.log('   - Should use filename only: "cardio-countdown.wav" ✅');
  console.log('   - NOT full path or asset URI');
  
  console.log('\n3. Check notification handler:');
  console.log('   - shouldPlaySound should return true for countdown notifications ✅');
  console.log('   - Currently set to: shouldShow || isCountdown');
  
  console.log('\n4. iOS Requirements:');
  console.log('   - Custom sounds only work on real device (not simulator)');
  console.log('   - App must have notification permissions');
  console.log('   - Device volume must be up');
  console.log('   - Do Not Disturb should be off');
}

function suggestFixes() {
  console.log('\n🔧 SUGGESTED FIXES:');
  console.log('====================');
  
  console.log('1. Try using the exact filename format that works with expo-notifications:');
  console.log('   sound: "cardio-countdown.wav" (current approach ✅)');
  
  console.log('\n2. Alternative: Move audio file to correct iOS bundle location:');
  console.log('   - iOS apps may require sounds in specific directory');
  console.log('   - Try copying to root level of assets');
  
  console.log('\n3. Test with different audio format:');
  console.log('   - Convert WAV to M4A format');
  console.log('   - Ensure audio file is mono, not stereo');
  console.log('   - Verify sample rate is 16kHz or 44.1kHz');
  
  console.log('\n4. Debug notification delivery:');
  console.log('   - Add console logs in notification handler');
  console.log('   - Verify notifications are being scheduled correctly');
  console.log('   - Check if sound parameter is being passed');
}

function immediateTest() {
  console.log('\n🧪 IMMEDIATE TEST:');
  console.log('==================');
  console.log('1. Start HIIT session with 10-second work phases');
  console.log('2. Keep app in foreground first (should hear expo-av audio)');
  console.log('3. Then background app and test notification audio');
  console.log('4. Compare: does foreground audio work but notification audio fail?');
  
  console.log('\n📱 Expected Behavior:');
  console.log('• Foreground: expo-av plays cardio-countdown.wav ✅');
  console.log('• Background: notification plays cardio-countdown.wav ❌ (currently default sound)');
  
  console.log('\n🎯 The goal is to have the SAME audio in both scenarios');
}

async function main() {
  try {
    debugCustomSoundIssues();
    suggestFixes();
    immediateTest();
    
    console.log('\n🚀 NEXT STEPS:');
    console.log('==============');
    console.log('1. Test on real iOS device (required for notification sounds)');
    console.log('2. Verify countdown notification is scheduled with custom sound');
    console.log('3. Check console logs for sound parameter passing');
    console.log('4. Consider fallback: notification with default sound + foreground audio');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  debugCustomSoundIssues,
  suggestFixes,
  immediateTest
};
