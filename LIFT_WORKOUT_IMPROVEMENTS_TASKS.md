# LIFT WORKOUT IMPROVEMENTS TASK LIST

## 🎯 TASK OVERVIEW
Implementation of 4 key improvements to the lift workout system for better user experience and functionality.

---

## ✅ TASK 1: Update Workout Names from "WORKOUT" to "LIFT"
**Status**: 🔴 Pending

### Description
When user selects "lift" in training type selection, the workout name should default to "LIFT _number" instead of "WORKOUT _number".

### Implementation Areas
- **new.tsx** - Before lift session starts (workout creation)
- **new.tsx** - After lift session starts (active session display)  
- **history.tsx** - After user saves workout (completed session display)
- **All other locations** where lift workout names are displayed

### Requirements
- Replace all instances of "WORKOUT _number" with "LIFT _number" for lift sessions
- Ensure numbering continues sequentially (LIFT 1, LIFT 2, LIFT 3, etc.)
- Maintain existing functionality for other workout types

---

## ✅ TASK 2: Remove Pause Button from Main Timer
**Status**: 🔴 Pending

### Description
Remove the pause button that appears next to the main timer in new.tsx during an active lift session.

### Implementation Areas
- **new.tsx** - Main timer section during active workout session

### Requirements
- Delete pause button component from main timer area
- Maintain start/stop functionality for main workout timer
- Ensure UI layout remains clean without the pause button

---

## ✅ TASK 3: Remove Rest Timer Audio Notification
**Status**: 🔴 Pending

### Description
Remove the audio notification that plays when the rest timer finishes after completing a set.

### Implementation Areas
- **new.tsx** - Rest timer completion logic
- **Audio service files** - Remove rest timer audio references
- **All components** that handle rest timer audio

### Requirements
- Remove all instances of audio playing after rest timer completion
- Remove audio file imports related to rest timer sounds
- Remove audio playback code from rest timer logic
- Maintain silent rest timer functionality

---

## ✅ TASK 4: Implement Background-Persistent Rest Timers  
**Status**: 🔴 Pending

### Description
Make rest timers work exactly like the main workout timer with full background persistence across all scenarios.

### Background Persistence Requirements
1. **Screen Lock** - Rest timer continues when user locks device screen
2. **App Force Close** - Rest timer continues when user force closes the app
3. **Device Restart** - Rest timer persists when user restarts phone
4. **App Switching** - Rest timer continues when user switches to other apps

### Implementation Areas
- **WorkoutSessionContext** - Add rest timer state management
- **Background persistence hooks** - Extend for rest timer support
- **new.tsx** - Update rest timer to use context-based state
- **AsyncStorage** - Persist rest timer state and timestamps

### Technical Requirements
- Use same architecture as main workout timer background persistence
- Implement system time-based calculations for accuracy
- Add rest timer state to WorkoutSessionContext
- Update useBackgroundWorkoutPersistence hook
- Ensure rest timer restoration on app resume
- Maintain existing rest timer UI and functionality

---

## 📋 IMPLEMENTATION PRIORITY
1. **Task 1** - Update workout naming (Low complexity)
2. **Task 2** - Remove pause button (Low complexity)  
3. **Task 3** - Remove rest timer audio (Medium complexity)
4. **Task 4** - Background-persistent rest timers (High complexity)

## 🎯 SUCCESS CRITERIA
- All lift workouts display "LIFT _number" instead of "WORKOUT _number"
- Main timer area has no pause button during active sessions
- No audio plays when rest timers complete
- Rest timers continue running in background across all scenarios identical to main workout timer
- All changes maintain existing functionality for other features

---

## 📝 NOTES
- Task 4 requires the most development time due to context integration
- Tasks 1-3 can be completed quickly as UI/naming changes
- All tasks should be tested thoroughly before deployment
- Consider EAS Update deployment after completion
