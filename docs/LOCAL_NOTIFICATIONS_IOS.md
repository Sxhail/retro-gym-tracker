# iOS Local Notifications – Workout Scenarios

This document captures the requirements and design for implementing iOS-only local notifications that continue to work when the app is backgrounded or even force-quit.

## General Requirements

- Use local notifications only (no remote push).
- Pre-schedule notifications at the start of a workout session to guarantee delivery if the app is force quit.
- When a workout is canceled or ended early, cancel all pending notifications.
- All notifications include title, body, and sound (ting).
- Configure the iOS notification handler to ensure alerts show when needed.
- Foreground handling is not required (focus on background/force quit).

## Scenarios

### Lift Session – Rest Timer

1) Rest timer between sets finished
   - Schedule at the start of each rest.
   - Fires at rest end, even if app is force quit.
   - Message: “Rest over  Time for your next set!”

### Cardio – HIIT Sessions

2) Work time finished → time to rest  
   - Pre-schedule notifications for every work interval end.  
   - Message: “Work phase done  Time to rest.”

3) Rest time finished → time to work  
   - Pre-schedule notifications for every rest interval end.  
   - Message: “Rest over, Get moving!”

4) HIIT session finished  
   - Pre-schedule a final notification for session completion.  
   - Message: “HIIT session complete  Well done!”

### Cardio – Walk/Run Sessions

5) Run time finished → start walking  
   - Pre-schedule notifications for each run interval end.  
   - Message: “Run done Switch to walking.”

6) Walk time finished → start running  
   - Pre-schedule notifications for each walk interval end.  
   - Message: “Walk done  Time to run!”

7) Walk/Run session finished  
   - Pre-schedule a final notification at session end.  
   - Message: “Walk/Run session complete  Great job!”

## Constraints & Edge Cases

- iOS foreground handling not required — only background and force quit behavior matter.
- If the app is force quit:
  - Already scheduled notifications will still fire on time.
  - New notifications cannot be scheduled until the app is reopened.
- Must ensure the entire workout session’s notifications are queued at session start.
- If user ends/cancels session early → cancel pending notifications to avoid irrelevant alerts.
- Overlapping workouts should be prevented — only one active session’s notifications should be queued.

## Example Timelines

### HIIT Example

Setup: 5 rounds, Work 40s, Rest 20s. Total 5 minutes.

At t=0 (Start Session) → Pre-schedule all 11 notifications (10 transitions + 1 completion).  
Timeline:

- 0:40 — Work finished → rest — “Work phase done ✅ Time to rest.”
- 1:00 — Rest finished → work — “Rest over 💥 Get moving!”
- 1:40 — Work finished → rest — “Work phase done ✅ Time to rest.”
- 2:00 — Rest finished → work — “Rest over 💥 Get moving!”
- 2:40 — Work finished → rest — “Work phase done ✅ Time to rest.”
- 3:00 — Rest finished → work — “Rest over 💥 Get moving!”
- 3:40 — Work finished → rest — “Work phase done ✅ Time to rest.”
- 4:00 — Rest finished → work — “Rest over 💥 Get moving!”
- 4:40 — Work finished → rest — “Work phase done ✅ Time to rest.”
- 5:00 — HIIT session finished — “HIIT session complete 🎉 Well done!”

Behavior if app is killed (swipe up): pre-scheduled notifications still fire in sequence.

### Walk/Run Example

Setup: Run 2 min, Walk 1 min, Repeat 2 times. Total 6 minutes.

- 2:00 — Run finished → walk — “Run done 🏃 Switch to walking.”
- 3:00 — Walk finished → run — “Walk done 🚶 Time to run!”
- 5:00 — Run finished → walk — “Run done 🏃 Switch to walking.”
- 6:00 — Session finished — “Walk/Run session complete 🎉 Great job!”

## Implementation Notes

- Use `expo-notifications` with Date-based triggers for reliability after force quit.
- Request permissions and set a handler to always show alert and play sound for background notifications on iOS.
- Pre-schedule entire cardio session at start; schedule lift rest notification at rest start.
- Cancel all pending notifications for the current session when the session ends or is canceled.
- Prevent overlapping sessions by clearing previously scheduled notifications when a new session starts.
