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
   * Play countdown audio for exactly 3 seconds
   * Handles looping for short clips, truncation for long clips
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

      console.log(`[CardioCountdownAudio] Starting countdown audio for ${phaseType} phase (${playbackId})`);

      if (this.audioDurationMs <= this.targetDurationMs) {
        // Audio is shorter than or equal to 4 seconds - play with looping if needed
        await this.playWithLooping(playbackId);
      } else {
        // Audio is longer than 4 seconds - play for exactly 4 seconds then stop
        await this.playWithTruncation(playbackId);
      }

    } catch (error) {
      console.warn('[CardioCountdownAudio] Failed to play countdown audio:', error);
      this.state = 'ready';
      this.currentPlaybackId = null;
    }
  }

  /**
   * Play audio with looping to reach exactly 3 seconds
   */
  private async playWithLooping(playbackId: string): Promise<void> {
    if (!this.sound) return;

    try {
      if (this.audioDurationMs >= this.targetDurationMs) {
        // Single play is enough
        await this.sound.playAsync();
        
        // Stop after target duration
        setTimeout(async () => {
          if (this.currentPlaybackId === playbackId) {
            await this.stopCountdown();
          }
        }, this.targetDurationMs);
      } else {
        // Need to loop - calculate how many loops needed
        const loops = Math.ceil(this.targetDurationMs / this.audioDurationMs);
        console.log(`[CardioCountdownAudio] Will loop ${loops} times to reach 3 seconds`);

        // Set up looping
        await this.sound.setIsLoopingAsync(true);
        await this.sound.playAsync();

        // Stop after exactly 3 seconds
        setTimeout(async () => {
          if (this.currentPlaybackId === playbackId) {
            await this.stopCountdown();
          }
        }, this.targetDurationMs);
      }
    } catch (error) {
      console.warn('[CardioCountdownAudio] Error in playWithLooping:', error);
      throw error;
    }
  }

  /**
   * Play audio for exactly 4 seconds (truncating longer clips)
   */
  private async playWithTruncation(playbackId: string): Promise<void> {
    if (!this.sound) return;

    try {
      await this.sound.playAsync();
      
      // Stop after exactly 4 seconds
      setTimeout(async () => {
        if (this.currentPlaybackId === playbackId) {
          await this.stopCountdown();
        }
      }, this.targetDurationMs);
    } catch (error) {
      console.warn('[CardioCountdownAudio] Error in playWithTruncation:', error);
      throw error;
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
