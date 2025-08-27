
iOS Local Notifications – Workout Scenarios (TestFlight / Expo)

This document captures the design for implementing iOS-only local notifications using Expo that continue to work when the app is backgrounded. Note that force-quit behavior is limited by iOS and cannot be fully controlled without Xcode.


General Requirements

1. Use local notifications only (no remote push).
2. Notifications must fire while the app is backgrounded (screen off or app switched out).
3. Pre-schedule all notifications at workout start to maximize reliability.
4. Cancel all pending notifications if the session ends or is canceled early.
5. Notifications include title, body, and default sound.
6. Foreground notifications are ignored; only background behavior is relevant.


iOS force-quit behavior:

1. Already scheduled notifications may still fire.
2. New notifications cannot be scheduled until the app is reopened.
3. Overlapping sessions are prevented by clearing previous session notifications before starting a new session.


Changes / rationale:

1. Removed “force-quit notifications always work” claim — iOS TestFlight/Expo cannot guarantee delivery when app is fully killed.
2. Emphasized pre-scheduling as the reliable strategy.
3. Removed Xcode / capability references (since you have no Mac).

Scenarios


Lift Session – Rest Timer

1. Rest timer between sets finished
   1. Schedule at rest start.
   2. Fires at rest end while app is backgrounded.
   3. Message: “Rest over ⏱ Time for your next set!”


Cardio – HIIT Sessions

1. Work phase finished → time to rest
   1. Pre-schedule notifications for every work interval end.
   2. Message: “Work phase done ✅ Time to rest.”

2. Rest phase finished → time to work
   1. Pre-schedule notifications for every rest interval end.
   2. Message: “Rest over 💥 Get moving!”

3. HIIT session complete
   1. Pre-schedule final notification at session end.
   2. Message: “HIIT session complete 🎉 Well done!”


Cardio – Walk/Run Sessions

1. Run finished → start walking
   1. Pre-schedule notifications for each run interval end.
   2. Message: “Run done 🏃 Switch to walking.”

2. Walk finished → start running
   1. Pre-schedule notifications for each walk interval end.
   2. Message: “Walk done 🚶 Time to run!”

3. Walk/Run session complete
   1. Pre-schedule final notification at session end.
   2. Message: “Walk/Run session complete 🎉 Great job!”


Constraints & Edge Cases

1. Foreground handling is ignored.
2. Force-quit limitations: new notifications cannot be scheduled until the app is reopened; only already scheduled notifications may fire.
3. Pre-schedule the entire session at start to ensure reliability.
4. Cancel pending notifications when session ends or is canceled early.
5. Prevent overlapping sessions by clearing previous session notifications.


Changes / rationale:

1. Explicitly mentions TestFlight / Expo limitations.
2. Removed references to Xcode background modes.

Example Timelines

HIIT Example

Setup: 5 rounds, Work 40s, Rest 20s.

At t=0 (Start Session) → Pre-schedule all 11 notifications (10 transitions + 1 completion).

Time	Event	Notification
0:40	Work → Rest	“Work phase done ✅ Time to rest.”
1:00	Rest → Work	“Rest over 💥 Get moving!”
1:40	Work → Rest	“Work phase done ✅ Time to rest.”
2:00	Rest → Work	“Rest over 💥 Get moving!”
2:40	Work → Rest	“Work phase done ✅ Time to rest.”
3:00	Rest → Work	“Rest over 💥 Get moving!”
3:40	Work → Rest	“Work phase done ✅ Time to rest.”
4:00	Rest → Work	“Rest over 💥 Get moving!”
4:40	Work → Rest	“Work phase done ✅ Time to rest.”
5:00	HIIT complete	“HIIT session complete 🎉 Well done!”

Walk/Run Example

Setup: Run 2 min, Walk 1 min, Repeat 2 times.

Time	Event	Notification
2:00	Run → Walk	“Run done 🏃 Switch to walking.”
3:00	Walk → Run	“Walk done 🚶 Time to run!”
5:00	Run → Walk	“Run done 🏃 Switch to walking.”
6:00	Session complete	“Walk/Run session complete 🎉 Great job!”


Implementation Notes

1. Use expo-notifications with Date-based triggers for background reliability.
2. Request permissions on app start; confirm alerts are allowed in iOS Settings.
3. Pre-schedule all notifications at workout start:
   1. Cardio: pre-schedule entire session.
   2. Lift: schedule rest notification at start of rest.
4. Cancel all notifications for the session if ended or canceled early.
5. Prevent overlapping sessions by clearing previously scheduled notifications when starting a new session.
6. Use sound: 'default' to ensure notifications play reliably on iOS.
7. Expand scheduling catch-up window to 5–10s to handle minor delays when the device is asleep.


Changes / rationale:

1. Added sound: 'default' recommendation.
2. Added catch-up window suggestion for background reliability.
3. Removed Xcode/force-quit guarantees.
4. Emphasized pre-scheduling at session start as the main reliability mechanism.

This version is fully aligned with your iOS-only, TestFlight, Expo setup, and reflects what will reliably work under these constraints.
