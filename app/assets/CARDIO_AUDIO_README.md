# Cardio Audio Files

This directory contains the audio files for cardio phase transitions:

## Files Required:

1. **cardio-countdown.wav** ✅ (Already present)
   - Plays during the last 3 seconds of work/run phases
   - Duration: 3 seconds
   - Current location: `app/assets/cardio-countdown.wav`

2. **cardio-rest.wav** ⏳ (To be provided)
   - Plays when rest phase starts (1 second after countdown ends)
   - Suggested duration: 2-3 seconds
   - Should be placed at: `app/assets/cardio-rest.wav`

3. **cardio-work.wav** ⏳ (To be provided)
   - Plays when work phase starts (immediately after rest ends)
   - Suggested duration: 2-3 seconds  
   - Should be placed at: `app/assets/cardio-work.wav`

## Usage Flow:

### HIIT Mode:
```
Work Phase (30s)
├─ Last 3 seconds: countdown audio plays
├─ Work ends: countdown stops
├─ +1 second delay: rest audio plays
├─ Rest Phase (10s)
├─ Rest ends: work audio plays immediately
└─ Next Work Phase starts
```

### Walk-Run Mode:
```
Run Phase (60s)
├─ Last 3 seconds: countdown audio plays
├─ Run ends: countdown stops
├─ +1 second delay: (no audio - continues walking)
├─ Walk Phase (30s)
├─ Walk ends: (no audio - continues running)
└─ Next Run Phase starts
```

## File Format Requirements:
- Format: WAV (recommended for iOS compatibility)
- Sample Rate: 44.1kHz or 48kHz
- Bit Depth: 16-bit or 24-bit
- Channels: Mono or Stereo
- Duration: 2-5 seconds (recommended)

## Setup Instructions:

1. Place your audio files in the `app/assets/` directory
2. Import and setup in your app:

```typescript
import { setupCardioAudio } from '../utils/cardioAudioSetup';

// Setup audio files
await setupCardioAudio(
  require('./assets/cardio-rest.wav'),
  require('./assets/cardio-work.wav')
);
```

The system is now ready and will automatically play the appropriate audio at the right times during cardio sessions!
