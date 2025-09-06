import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';

type AudioType = 'countdown' | 'rest' | 'work';
type AudioState = 'idle' | 'loading' | 'ready' | 'playing' | 'error';

interface AudioConfig {
  file: any; // require() result
  targetDurationMs: number;
  description: string;
}

class CardioAudioService {
  private sounds: Map<AudioType, Audio.Sound | null> = new Map();
  private states: Map<AudioType, AudioState> = new Map();
  private audioDurations: Map<AudioType, number> = new Map();
  private currentPlaybackId: string | null = null;
  private isInitialized: boolean = false;
  private playbackTimers: Map<AudioType, NodeJS.Timeout> = new Map();

  // Audio configuration
  private audioConfigs: Map<AudioType, AudioConfig> = new Map([
    ['countdown', {
      file: require('../app/assets/cardio-countdown.wav'),
      targetDurationMs: 3000, // Exactly 3 seconds
      description: 'Countdown audio (last 3 seconds of work/run)'
    }],
    ['rest', {
      file: null, // Will be set when user provides file
      targetDurationMs: 2000, // Configurable duration for rest audio
      description: 'Rest phase start audio (1 second after countdown ends)'
    }],
    ['work', {
      file: null, // Will be set when user provides file
      targetDurationMs: 2000, // Configurable duration for work audio
      description: 'Work phase start audio (when rest ends and work begins)'
    }]
  ]);

  constructor() {
    this.initializeAudioSession();
    this.initializeStates();
  }

  /**
   * Initialize states for all audio types
   */
  private initializeStates(): void {
    for (const audioType of this.audioConfigs.keys()) {
      this.states.set(audioType, 'idle');
      this.sounds.set(audioType, null);
      this.audioDurations.set(audioType, 0);
    }
  }

  /**
   * Set audio files for rest and work phases
   * Call this method when user provides the audio files
   */
  async setAudioFiles(restFile: any, workFile: any): Promise<void> {
    const restConfig = this.audioConfigs.get('rest')!;
    const workConfig = this.audioConfigs.get('work')!;
    
    restConfig.file = restFile;
    workConfig.file = workFile;
    
    console.log('[CardioAudioService] Audio files set for rest and work phases');
    
    // Preload the new audio files
    await this.loadAudio('rest');
    await this.loadAudio('work');
  }

  /**
   * Initialize the audio session for background playback
   */
  private async initializeAudioSession(): Promise<void> {
    try {
      if (this.isInitialized) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });

      this.isInitialized = true;
      console.log('[CardioAudioService] Audio session initialized for background playback');
    } catch (error) {
      console.warn('[CardioAudioService] Failed to initialize audio session:', error);
    }
  }

  /**
   * Load and prepare a specific audio asset
   */
  async loadAudio(audioType: AudioType): Promise<boolean> {
    const currentState = this.states.get(audioType);
    if (currentState === 'ready' || currentState === 'loading') return true;
    
    const config = this.audioConfigs.get(audioType);
    if (!config || !config.file) {
      console.warn(`[CardioAudioService] No audio file configured for ${audioType}`);
      return false;
    }
    
    try {
      this.states.set(audioType, 'loading');
      console.log(`[CardioAudioService] Loading ${config.description}...`);

      // Load the audio asset
      const asset = Asset.fromModule(config.file);
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

      this.sounds.set(audioType, sound);
      this.audioDurations.set(audioType, status.durationMillis || 0);
      this.states.set(audioType, 'ready');

      const duration = this.audioDurations.get(audioType) || 0;
      console.log(`[CardioAudioService] ${config.description} loaded successfully. Duration: ${duration}ms`);
      
      return true;
    } catch (error) {
      console.warn(`[CardioAudioService] Failed to load ${audioType} audio:`, error);
      this.states.set(audioType, 'error');
      return false;
    }
  }

  /**
   * Play specific audio type with precise duration control
   */
  async playAudio(audioType: AudioType, sessionId: string, phaseType?: 'work' | 'run' | 'rest'): Promise<void> {
    try {
      // Ensure audio is loaded
      const loaded = await this.loadAudio(audioType);
      if (!loaded) {
        console.warn(`[CardioAudioService] Cannot play ${audioType}: audio not loaded`);
        return;
      }

      const sound = this.sounds.get(audioType);
      const config = this.audioConfigs.get(audioType);
      const audioDuration = this.audioDurations.get(audioType) || 0;
      
      if (!sound || !config) {
        console.warn(`[CardioAudioService] Cannot play ${audioType}: sound or config missing`);
        return;
      }

      // Stop any currently playing audio
      await this.stopAllAudio();

      // Generate unique playback ID
      const playbackId = `${sessionId}-${audioType}-${Date.now()}`;
      this.currentPlaybackId = playbackId;
      this.states.set(audioType, 'playing');

      console.log(`[CardioAudioService] Playing ${config.description} for ${phaseType || 'unknown'} phase`);

      // Play the audio
      await sound.replayAsync();

      // Set timer to stop audio after target duration
      const timer = setTimeout(async () => {
        if (this.currentPlaybackId === playbackId) {
          await this.stopAudio(audioType);
          console.log(`[CardioAudioService] Auto-stopped ${audioType} after ${config.targetDurationMs}ms`);
        }
      }, config.targetDurationMs);

      this.playbackTimers.set(audioType, timer);

    } catch (error) {
      console.warn(`[CardioAudioService] Failed to play ${audioType} audio:`, error);
      this.states.set(audioType, 'error');
    }
  }

  /**
   * Stop specific audio type
   */
  async stopAudio(audioType: AudioType): Promise<void> {
    try {
      const sound = this.sounds.get(audioType);
      if (sound) {
        await sound.stopAsync();
        this.states.set(audioType, 'ready');
      }

      // Clear timer for this audio type
      const timer = this.playbackTimers.get(audioType);
      if (timer) {
        clearTimeout(timer);
        this.playbackTimers.delete(audioType);
      }

      // Clear current playback if it matches this audio type
      if (this.currentPlaybackId?.includes(audioType)) {
        this.currentPlaybackId = null;
      }

    } catch (error) {
      console.warn(`[CardioAudioService] Failed to stop ${audioType} audio:`, error);
    }
  }

  /**
   * Stop all audio types
   */
  async stopAllAudio(): Promise<void> {
    for (const audioType of this.audioConfigs.keys()) {
      await this.stopAudio(audioType);
    }
    this.currentPlaybackId = null;
  }

  /**
   * Convenience methods for specific audio types
   */
  async playCountdown(sessionId: string, phaseType: 'work' | 'run'): Promise<void> {
    return this.playAudio('countdown', sessionId, phaseType);
  }

  async playRest(sessionId: string): Promise<void> {
    return this.playAudio('rest', sessionId, 'rest');
  }

  async playWork(sessionId: string): Promise<void> {
    return this.playAudio('work', sessionId, 'work');
  }

  async stopCountdown(): Promise<void> {
    return this.stopAudio('countdown');
  }

  /**
   * Play sequence: countdown -> 1 second delay -> rest audio
   * Used when work/run phase ends and rest phase begins
   */
  async playCountdownToRestSequence(sessionId: string, phaseType: 'work' | 'run'): Promise<void> {
    try {
      console.log(`[CardioAudioService] Starting countdown-to-rest sequence for ${phaseType} phase`);
      
      // Play countdown audio (will auto-stop after 3 seconds)
      await this.playCountdown(sessionId, phaseType);
      
      // Schedule rest audio to play 1 second after countdown ends (4 seconds total)
      setTimeout(async () => {
        if (this.currentPlaybackId?.includes(sessionId)) {
          await this.playRest(sessionId);
        }
      }, 4000); // 3 seconds countdown + 1 second delay
      
    } catch (error) {
      console.warn('[CardioAudioService] Failed to play countdown-to-rest sequence:', error);
    }
  }

  /**
   * Get current state of specific audio type
   */
  getAudioState(audioType: AudioType): AudioState {
    return this.states.get(audioType) || 'idle';
  }

  /**
   * Check if any audio is currently playing
   */
  isAnyAudioPlaying(): boolean {
    return Array.from(this.states.values()).some(state => state === 'playing');
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    console.log('[CardioAudioService] Cleaning up all audio resources');
    
    // Stop all audio
    await this.stopAllAudio();
    
    // Clear all timers
    for (const timer of this.playbackTimers.values()) {
      clearTimeout(timer);
    }
    this.playbackTimers.clear();
    
    // Unload all sounds
    for (const [audioType, sound] of this.sounds.entries()) {
      if (sound) {
        try {
          await sound.unloadAsync();
        } catch (error) {
          console.warn(`[CardioAudioService] Failed to unload ${audioType} sound:`, error);
        }
      }
    }
    
    this.sounds.clear();
    this.initializeStates();
    this.currentPlaybackId = null;
  }
}

// Export singleton instance
export const cardioAudioService = new CardioAudioService();
export default cardioAudioService;
