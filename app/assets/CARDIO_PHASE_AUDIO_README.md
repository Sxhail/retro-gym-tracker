# Cardio Phase Audio Files

This directory contains the following audio files for the cardio phase transitions:

## Audio Files:

1. **cardio-countdown.wav** ✅
   - Plays 5 seconds before phase ends
   - Exactly 4 seconds long

2. **cardio-rest.wav** ✅
   - Plays right after cardio-countdown finishes when rest phase begins
   - Plays for its natural duration (no timer controls)

3. **cardio-work.wav** ✅
   - In HIIT only: plays when rest timer finishes and work timer starts
   - Plays for its natural duration (no timer controls)

## Usage Logic:

### 1. Countdown Audio:
- Triggers at 5 seconds remaining in any phase (work/run)
- Plays for exactly 4 seconds (natural file duration)

### 2. Rest Audio:
- Triggers when transitioning from work/run → rest
- Plays right after countdown finishes
- Works for both HIIT and Walk/Run modes

### 3. Work Audio:
- **HIIT only**: triggers when transitioning from rest → work
- Plays when rest timer finishes and work timer starts
- Does NOT play in Walk/Run mode (only rest/walk phases)

## Implementation:
- All audio files use natural duration (no artificial timer controls)
- Audio stops automatically when session is paused, skipped, cancelled, or finished
- All required files are present and ready to use
