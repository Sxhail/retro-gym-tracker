import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';

type AudioState = 'idle' | 'loading' | 'ready' | 'playing' | 'error';
type AudioType = 'countdown' | 'rest' | 'work';

class CardioPhaseAudioService {
  private sounds: Record<AudioType, Audio.Sound | null> = {
    countdown: null,
    rest: null,
    work: null
  };
  
  private states: Record<AudioType, AudioState> = {
    countdown: 'idle',
    rest: 'idle',
    work: 'idle'
  };
  
  private audioDurations: Record<AudioType, number> = {
    countdown: 0,
    rest: 0,
    work: 0
  };
  
  private currentPlaybackIds: Record<AudioType, string | null> = {
    countdown: null,
    rest: null,
    work: null
  };
  
  private isInitialized: boolean = false;

  constructor() {
    this.initializeAudioSession();
  }

  /**
   * Initialize the audio session for background playback
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
      console.log('[CardioPhaseAudio] Audio session initialized for background playback');
    } catch (error) {
      console.warn('[CardioPhaseAudio] Failed to initialize audio session:', error);
      this.markAsError('countdown');
      this.markAsError('rest');
      this.markAsError('work');
    }
  }

  /**
   * Get the audio asset path for each audio type
   */
  private getAudioAsset(type: AudioType): any {
    switch (type) {
      case 'countdown':
        return require('../app/assets/cardio-countdown.wav');
      case 'rest':
        return require('../app/assets/cardio-rest.wav');
      case 'work':
        return require('../app/assets/cardio-work.wav');
      default:
        throw new Error(`Unknown audio type: ${type}`);
    }
  }

  /**
   * Load and prepare a specific audio asset
   */
  async loadAudio(type: AudioType): Promise<boolean> {
    if (this.states[type] === 'ready' || this.states[type] === 'loading') return true;
    
    try {
      this.states[type] = 'loading';
      console.log(`[CardioPhaseAudio] Loading ${type} audio asset...`);

      // Load the audio asset
      const asset = Asset.fromModule(this.getAudioAsset(type));
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
        throw new Error(`${type} audio failed to load`);
      }

      this.sounds[type] = sound;
      this.audioDurations[type] = status.durationMillis || 0;
      this.states[type] = 'ready';

      console.log(`[CardioPhaseAudio] ${type} audio loaded successfully. Duration: ${this.audioDurations[type]}ms`);
      return true;
    } catch (error) {
      console.warn(`[CardioPhaseAudio] Failed to load ${type} audio asset:`, error);
      this.states[type] = 'error';
      return false;
    }
  }

  /**
   * Play countdown audio (5 seconds before phase ends)
   */
  async playCountdown(sessionId: string, phaseType: 'work' | 'run'): Promise<void> {
    await this.playAudio('countdown', sessionId, `${phaseType}-countdown`);
  }

  /**
   * Play rest audio (when cardio countdown finishes and rest phase begins)
   */
  async playRest(sessionId: string): Promise<void> {
    await this.playAudio('rest', sessionId, 'rest-start');
  }

  /**
   * Play work audio (in HIIT only, when rest timer finishes and work timer starts)
   */
  async playWork(sessionId: string): Promise<void> {
    await this.playAudio('work', sessionId, 'work-start');
  }

  /**
   * Generic method to play any audio type
   */
  private async playAudio(type: AudioType, sessionId: string, context: string): Promise<void> {
    try {
      // Ensure audio is loaded
      const isLoaded = await this.loadAudio(type);
      if (!isLoaded || !this.sounds[type] || this.states[type] !== 'ready') {
        console.warn(`[CardioPhaseAudio] Cannot play ${type} - audio not ready`);
        return;
      }

      // Stop any existing playback for this audio type
      await this.stopAudio(type);

      // Generate unique playback ID to track this specific playback
      const playbackId = `${sessionId}-${context}-${Date.now()}`;
      this.currentPlaybackIds[type] = playbackId;
      this.states[type] = 'playing';

      console.log(`[CardioPhaseAudio] Playing ${type} audio for ${context} (${playbackId})`);
      console.log(`[CardioPhaseAudio] ${type} audio duration: ${this.audioDurations[type]}ms`);

      // Play the audio file once (natural duration controls how long it plays)
      await this.sounds[type]!.playAsync();
      
      // Audio will automatically stop when it finishes (natural file duration)
      
    } catch (error) {
      console.warn(`[CardioPhaseAudio] Failed to play ${type} audio:`, error);
      this.states[type] = 'ready';
      this.currentPlaybackIds[type] = null;
    }
  }

  /**
   * Stop specific audio type
   */
  async stopAudio(type: AudioType): Promise<void> {
    try {
      console.log(`[CardioPhaseAudio] Stopping ${type} audio...`);
      
      if (this.sounds[type]) {
        // Force stop and reset position regardless of state
        await this.sounds[type]!.stopAsync();
        await this.sounds[type]!.setPositionAsync(0);
        console.log(`[CardioPhaseAudio] ${type} audio stopped and position reset`);
      }
      
      // Clear playback tracking
      this.currentPlaybackIds[type] = null;
      this.states[type] = this.sounds[type] ? 'ready' : 'idle';
      
    } catch (error) {
      console.warn(`[CardioPhaseAudio] Error stopping ${type} audio:`, error);
      // Still clear tracking even if stop failed
      this.currentPlaybackIds[type] = null;
      this.states[type] = this.sounds[type] ? 'ready' : 'idle';
    }
  }

  /**
   * Stop countdown audio specifically (for backward compatibility)
   */
  async stopCountdown(): Promise<void> {
    await this.stopAudio('countdown');
  }

  /**
   * Stop all audio playback
   */
  async stopAllAudio(): Promise<void> {
    console.log('[CardioPhaseAudio] Stopping all audio...');
    await Promise.all([
      this.stopAudio('countdown'),
      this.stopAudio('rest'),
      this.stopAudio('work')
    ]);
    console.log('[CardioPhaseAudio] All audio stopped successfully');
  }

  /**
   * Check if specific audio type is currently playing
   */
  isPlaying(type: AudioType): boolean {
    return this.states[type] === 'playing' && this.currentPlaybackIds[type] !== null;
  }

  /**
   * Check if any audio is currently playing
   */
  isAnyPlaying(): boolean {
    return this.isPlaying('countdown') || this.isPlaying('rest') || this.isPlaying('work');
  }

  /**
   * Get current audio state for specific type
   */
  getState(type: AudioType): AudioState {
    return this.states[type];
  }

  /**
   * Mark audio type as error state
   */
  private markAsError(type: AudioType): void {
    this.states[type] = 'error';
  }

  /**
   * Cleanup audio resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.stopAllAudio();
      
      for (const type of ['countdown', 'rest', 'work'] as AudioType[]) {
        if (this.sounds[type]) {
          await this.sounds[type]!.unloadAsync();
          this.sounds[type] = null;
        }
        this.states[type] = 'idle';
      }
      
      this.isInitialized = false;
      console.log('[CardioPhaseAudio] Audio service cleaned up');
    } catch (error) {
      console.warn('[CardioPhaseAudio] Error during cleanup:', error);
    }
  }

  /**
   * Handle audio interruptions (calls, other apps)
   */
  async handleInterruption(shouldPause: boolean): Promise<void> {
    try {
      if (shouldPause && this.isAnyPlaying()) {
        console.log('[CardioPhaseAudio] Handling audio interruption - stopping all audio');
        await this.stopAllAudio();
      }
      // Note: We don't resume audio after interruption
      // as it's tied to specific phase timing that may have changed
    } catch (error) {
      console.warn('[CardioPhaseAudio] Error handling interruption:', error);
    }
  }
}

// Export singleton instance
export const cardioPhaseAudio = new CardioPhaseAudioService();

// Export types for use in other files
export type { AudioState, AudioType };
