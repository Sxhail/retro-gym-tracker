# Rest Timer Background Persistence Implementation

## Problem Statement
Rest timers were not persisting across app force-close and device restart scenarios. Users experienced inconsistent behavior where rest timers would reset to default values and restart when returning to a lift session, instead of continuing to count down in the background.

## Solution Overview
Extended the existing background session persistence infrastructure to support rest timers with the same level of persistence as the main workout timer.

## Technical Implementation

### 1. Background Service Integration
- **Leveraged existing infrastructure**: Used the same `backgroundSessionService` and SQLite database schema that supports both 'workout' and 'rest' timer types
- **No schema changes required**: The `active_session_timers` table already supported `timer_type: 'rest'`

### 2. Rest Timer Persistence Logic
Added comprehensive background persistence to the `SetRow` component:

#### A. Unique Timer Identification
```typescript
const getRestTimerId = () => {
  if (!restTimerIdRef.current) {
    const sessionTime = sessionWorkout.sessionStartTime?.getTime() || Date.now();
    restTimerIdRef.current = `rest_${sessionTime}_${exerciseId}_${setIdx}`;
  }
  return restTimerIdRef.current;
};
```

#### B. State Persistence Functions
- **saveRestTimerState()**: Saves timer state to SQLite with timestamp-based accuracy
- **restoreRestTimerState()**: Restores timer state on component mount if active session exists
- **clearRestTimerState()**: Cleans up background data when timer finishes/is skipped

#### C. Automatic State Management
- **On Mount**: Automatically restores any active rest timer for the specific set
- **On State Change**: Auto-saves timer state when rest timer starts, pauses, or resumes
- **On Completion**: Clears background data when timer finishes or is skipped
- **On Cleanup**: Removes background data if set is no longer completed

### 3. Background Persistence Features

#### Timestamp-Based Accuracy
- Uses the same timestamp-based calculation as main workout timer
- Immune to JavaScript execution delays and app suspension
- Calculates elapsed time based on actual timestamps, not intervals

#### Cross-Session Consistency
- Timer ID includes session start time for consistent identification
- Links rest timers to specific workout sessions
- Prevents timer conflicts between different workout sessions

#### State Preservation Scenarios
- **App Force Close**: Timer continues counting in background via SQLite persistence
- **Device Restart**: Timer state restored from database on app restart
- **App Backgrounding**: Timer maintains accuracy through timestamp calculations
- **Screen Lock**: No impact on timer accuracy or persistence

### 4. Integration Points

#### Background Session Service
```typescript
// Save timer state
await backgroundSessionService.saveTimerState({
  sessionId: timerId,
  timerType: 'rest',
  startTime: resumeTime,
  duration: Number(set.rest ?? 120),
  elapsedWhenPaused: accumulatedTimeOnly,
  isActive: !timerPaused,
});

// Restore timer state
const timerState = await backgroundSessionService.restoreTimerState(timerId, 'rest');
```

#### Workout Session Context
- Uses `useWorkoutSession()` to access main workout session state
- Ensures rest timers only persist during active workout sessions
- Automatically cleans up when workout session ends

## Technical Benefits

### 1. Consistent User Experience
- Rest timers behave identically to main workout timer
- No unexpected timer resets or inconsistencies
- Seamless experience across all app states

### 2. Background Resilience
- **Force App Close**: ✅ Timer persists
- **Device Restart**: ✅ Timer persists  
- **Memory Pressure**: ✅ Timer persists
- **Long Periods Away**: ✅ Timer persists

### 3. Performance Optimization
- Efficient SQLite-based persistence
- Throttled saves to prevent excessive database writes
- Automatic cleanup prevents database bloat

### 4. Data Integrity
- Timestamp-based calculations prevent time drift
- Safety checks prevent unreasonable timer values
- Proper cleanup prevents orphaned timer data

## Files Modified
- `app/new.tsx`: Added rest timer background persistence to SetRow component
- `services/backgroundSession.ts`: No changes required (infrastructure already supported rest timers)

## Testing Scenarios
1. **Force Close Test**: Start rest timer → force close app → reopen app → verify timer continued counting
2. **Device Restart Test**: Start rest timer → restart device → open app → verify timer continued counting
3. **Multiple Timers Test**: Start multiple rest timers → background app → verify all timers persist independently
4. **Cleanup Test**: Complete/skip rest timer → verify background data is cleaned up

## Result
Rest timers now provide the same level of background persistence as the main workout timer, ensuring consistent user experience regardless of app state or device conditions.
