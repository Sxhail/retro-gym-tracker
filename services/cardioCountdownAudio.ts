import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';

type AudioState = 'idle' | 'loading' | 'ready' | 'playing' | 'error';

class CardioCountdownAudioService {
  private sound: Audio.Sound | null = null;
  private state: AudioState = 'idle';
  private audioDurationMs: number = 0;
  private targetDurationMs: number = 4000; // Exactly 4 seconds
  private currentPlaybackId: string | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.initializeAudioSession();
  }

  /**
   * Initialize the audio session for background playback
   * Following the same patterns as notification service initialization
   */
  private async initializeAudioSession(): Promise<void> {
    try {
      if (this.isInitialized) return;

      // Configure audio session for background playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });

      this.isInitialized = true;
      console.log('[CardioCountdownAudio] Audio session initialized for background playback');
    } catch (error) {
      console.warn('[CardioCountdownAudio] Failed to initialize audio session:', error);
      this.state = 'error';
    }
  }

  /**
   * Load and prepare the countdown audio asset
   * Graceful fallback if audio file missing (like notification service)
   */
  async loadAudio(): Promise<boolean> {
    if (this.state === 'ready' || this.state === 'loading') return true;
    
    try {
      this.state = 'loading';
      console.log('[CardioCountdownAudio] Loading countdown audio asset...');

      // Load the audio asset
      const asset = Asset.fromModule(require('../app/assets/cardio-countdown.wav'));
      await asset.downloadAsync();

      // Create and load the sound
      const { sound, status } = await Audio.Sound.createAsync(
        { uri: asset.localUri || asset.uri },
        { 
          shouldPlay: false,
          isLooping: false,
          volume: 1.0,
        }
      );

      if (!status.isLoaded) {
        throw new Error('Audio failed to load');
      }

      this.sound = sound;
      this.audioDurationMs = status.durationMillis || 0;
      this.state = 'ready';

      console.log(`[CardioCountdownAudio] Audio loaded successfully. Duration: ${this.audioDurationMs}ms`);
      
      // Log how we'll handle the duration
      if (this.audioDurationMs < this.targetDurationMs) {
        console.log(`[CardioCountdownAudio] Audio is shorter than 3s, will loop to reach target duration`);
      } else if (this.audioDurationMs > this.targetDurationMs) {
        console.log(`[CardioCountdownAudio] Audio is longer than 3s, will play first 3 seconds only`);
      }

      return true;
    } catch (error) {
      console.warn('[CardioCountdownAudio] Failed to load audio asset:', error);
      this.state = 'error';
      return false;
    }
  }

  /**
   * Play countdown audio - simplified for 4-second audio file
   * Audio file is exactly 4 seconds, so just play it once
   */
  async playCountdown(sessionId: string, phaseType: 'work' | 'run'): Promise<void> {
    try {
      // Ensure audio is loaded
      const isLoaded = await this.loadAudio();
      if (!isLoaded || !this.sound || this.state !== 'ready') {
        console.warn('[CardioCountdownAudio] Cannot play - audio not ready');
        return;
      }

      // Stop any existing playback
      await this.stopCountdown();

      // Generate unique playback ID to track this specific playback
      const playbackId = `${sessionId}-${phaseType}-${Date.now()}`;
      this.currentPlaybackId = playbackId;
      this.state = 'playing';

      console.log(`[CardioCountdownAudio] Playing 4-second countdown audio for ${phaseType} phase (${playbackId})`);
      console.log(`[CardioCountdownAudio] Audio duration: ${this.audioDurationMs}ms`);

      // Simply play the 4-second audio file once
      await this.sound.playAsync();
      
      // Audio will automatically stop when it finishes (4 seconds)
      // The audio file itself controls the duration now

    } catch (error) {
      console.warn('[CardioCountdownAudio] Failed to play countdown audio:', error);
      this.state = 'ready';
      this.currentPlaybackId = null;
    }
  }

  /**
   * Stop countdown audio immediately
   * Used for pause, skip, cancel, and session changes
   */
  async stopCountdown(): Promise<void> {
    try {
      console.log('[CardioCountdownAudio] Stopping countdown audio...');
      
      if (this.sound) {
        // Force stop and reset position regardless of state
        await this.sound.stopAsync();
        await this.sound.setPositionAsync(0);
        console.log('[CardioCountdownAudio] Audio stopped and position reset');
      }
      
      // Clear playback tracking
      this.currentPlaybackId = null;
      this.state = this.sound ? 'ready' : 'idle';
      
      console.log('[CardioCountdownAudio] Countdown audio stopped successfully');
    } catch (error) {
      console.warn('[CardioCountdownAudio] Error stopping countdown audio:', error);
      // Still clear tracking even if stop failed
      this.currentPlaybackId = null;
      this.state = this.sound ? 'ready' : 'idle';
    }
  }

  /**
   * Check if countdown audio is currently playing
   */
  isPlaying(): boolean {
    return this.state === 'playing' && this.currentPlaybackId !== null;
  }

  /**
   * Get current audio state
   */
  getState(): AudioState {
    return this.state;
  }

  /**
   * Cleanup audio resources
   * Called when service is no longer needed
   */
  async cleanup(): Promise<void> {
    try {
      await this.stopCountdown();
      
      if (this.sound) {
        await this.sound.unloadAsync();
        this.sound = null;
      }
      
      this.state = 'idle';
      this.isInitialized = false;
      console.log('[CardioCountdownAudio] Audio service cleaned up');
    } catch (error) {
      console.warn('[CardioCountdownAudio] Error during cleanup:', error);
    }
  }

  /**
   * Handle audio interruptions (calls, other apps)
   * Gracefully handle interruptions like notification system does
   */
  async handleInterruption(shouldPause: boolean): Promise<void> {
    try {
      if (shouldPause && this.isPlaying()) {
        console.log('[CardioCountdownAudio] Handling audio interruption - pausing');
        await this.stopCountdown();
      }
      // Note: We don't resume countdown audio after interruption
      // as it's tied to specific phase timing that may have changed
    } catch (error) {
      console.warn('[CardioCountdownAudio] Error handling interruption:', error);
    }
  }
}

// Export singleton instance
export const cardioCountdownAudio = new CardioCountdownAudioService();

// Export types for use in other files
export type { AudioState };
