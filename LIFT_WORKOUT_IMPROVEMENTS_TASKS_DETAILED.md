# LIFT WORKOUT IMPROVEMENTS - DETAILED TASK LIST

---

## 1) LIFT Naming Everywhere

**Goal:**
- When user selects "lift" in select training type, the workout name should be defaulted to `LIFT _number` (not `WORKOUT _number`).
- This change should be implemented everywhere the WORKOUT name is shown when user starts a LIFT session.

**Where to implement:**
- In `new.tsx` (before LIFT starts, after LIFT starts):
  - When user is about to start a lift session, the default name should be `LIFT 1`, `LIFT 2`, etc.
  - After the session starts, anywhere the workout name is displayed, it should show as `LIFT _number`.
- In `history.tsx`:
  - After user saves a workout, the name shown in history for lift sessions should be `LIFT _number`.
- Any other place in the app where the workout name for lift sessions is shown, update to use `LIFT _number`.

**Details:**
- Only apply this change for LIFT sessions. Other training types (cardio, etc.) should keep their current naming.
- The numbering should continue sequentially for each new lift session.
- If there is logic that generates or displays the workout name, update it to check for training type and use `LIFT` prefix for lift sessions.

---

## 2) Remove Pause Button from Main Timer in new.tsx

**Goal:**
- Remove the pause button from the main timer area in `new.tsx` when a lift session starts.
- The pause button is currently next to the main timer. Delete it from the UI and code.

**Where to implement:**
- In `new.tsx`, during an active lift session:
  - Find the code that renders the pause button next to the main timer.
  - Remove the pause button component and any related logic.

**Details:**
- The main timer should only have start/stop (and possibly reset) controls, but no pause button.
- Make sure the UI layout remains clean and nothing breaks visually after removing the button.
- Do not remove pause functionality for other workout types unless specified.

---

## 3) Remove Rest Timer Audio Notification in new.tsx

**Goal:**
- Delete the functionality for the sound to play after the rest timer finishes after a set.
- From now on, do not play any audio after the rest timer finishes.
- Remove all instances of this audio playing after rest timer finishes.

**Where to implement:**
- In `new.tsx`, during a workout session:
  - Find the code that triggers audio playback when the rest timer finishes.
  - Remove the audio playback logic and any audio file imports related to rest timer completion.
- In any audio service or utility files:
  - Remove references to rest timer completion sounds.
- In any components that handle rest timer audio:
  - Remove the code that plays audio after rest timer ends.

**Details:**
- The rest timer should finish silently, with no sound or notification.
- Make sure no errors occur from missing audio files or logic.
- Do not remove other audio notifications unless specified.

---

## 4) Make Rest Timers Fully Background-Persistent (like Main Lift Timer)

**Goal:**
- For the rest timers during a workout session, they need to work exactly like how the main workout timer works:
  1. If user closes the screen, rest timer should still be timing out in the background.
  2. If user force shuts the app, rest timer should still be timing out in the background.
  3. If user restarts phone, rest timer should still be timing out in the background.
- The rest timer should have the exact same running-in-background-for-all-scenarios functionality as the main workout (lift timer).

**Where to implement:**
- In `new.tsx`, during a lift session:
  - Refactor the rest timer logic to use the same context/background persistence system as the main lift timer.
  - Ensure the rest timer state is saved to persistent storage (AsyncStorage or similar) and restored on app resume/restart.
- In `WorkoutSessionContext` (or equivalent):
  - Add state management for the rest timer, including start time, duration, and remaining time.
  - Add logic to persist and restore rest timer state just like the main timer.
- In background persistence hooks/services:
  - Extend the background persistence logic to include rest timer state.
  - Use system time calculations to ensure accuracy after app close/restart.

**Details:**
- The rest timer should never "pause" or reset just because the app is closed, force quit, or device is restarted.
- When the user returns to the app, the rest timer should reflect the correct remaining time (or be finished if the time has elapsed).
- All UI and timer logic for rest timer should be context-based and background-persistent, matching the main lift timer.
- Test all scenarios: screen lock, app switch, force close, device restart.

---

## Summary
- Each task is described with specific goals, implementation locations, and technical details.
- All changes should be tested for edge cases and user experience.
- Only apply changes to lift sessions unless otherwise specified.
- Maintain existing functionality for other workout types.
