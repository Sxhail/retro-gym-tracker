import { cardioAudioService } from '../services/cardioAudioService';

/**
 * Setup function to configure cardio audio files
 * Call this once when the app starts or when user provides audio files
 */
export async function setupCardioAudio(
  restAudioFile: any,   // require('./path/to/cardio-rest.wav')
  workAudioFile: any    // require('./path/to/cardio-work.wav')
): Promise<void> {
  try {
    console.log('[CardioAudioSetup] Setting up cardio audio files...');
    
    // Configure the audio files in the service
    await cardioAudioService.setAudioFiles(restAudioFile, workAudioFile);
    
    console.log('[CardioAudioSetup] Cardio audio files configured successfully');
    console.log('✅ cardio-countdown.wav: Pre-loaded (3 seconds before work/run ends)');
    console.log('✅ cardio-rest.wav: Ready (plays 1 second after countdown ends)');
    console.log('✅ cardio-work.wav: Ready (plays when rest ends and work begins)');
    
  } catch (error) {
    console.error('[CardioAudioSetup] Failed to setup cardio audio files:', error);
    throw error;
  }
}

/**
 * Test function to verify all audio files are working
 * Useful for debugging audio setup
 */
export async function testCardioAudio(): Promise<void> {
  const testSessionId = 'test-session-' + Date.now();
  
  try {
    console.log('[CardioAudioTest] Testing all cardio audio files...');
    
    // Test countdown audio
    console.log('🔊 Testing countdown audio...');
    await cardioAudioService.playCountdown(testSessionId, 'work');
    await new Promise(resolve => setTimeout(resolve, 4000)); // Wait 4 seconds
    
    // Test rest audio
    console.log('🔊 Testing rest audio...');
    await cardioAudioService.playRest(testSessionId);
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
    
    // Test work audio
    console.log('🔊 Testing work audio...');
    await cardioAudioService.playWork(testSessionId);
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
    
    // Stop all audio
    await cardioAudioService.stopAllAudio();
    
    console.log('✅ All cardio audio tests completed successfully');
    
  } catch (error) {
    console.error('[CardioAudioTest] Audio test failed:', error);
    await cardioAudioService.stopAllAudio(); // Cleanup on error
    throw error;
  }
}

/**
 * Example usage:
 * 
 * import { setupCardioAudio } from './utils/cardioAudioSetup';
 * 
 * // When app starts or user provides files
 * await setupCardioAudio(
 *   require('./assets/cardio-rest.wav'),
 *   require('./assets/cardio-work.wav')
 * );
 * 
 * // Optional: test the setup
 * await testCardioAudio();
 */
