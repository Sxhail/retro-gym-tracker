# Cardio Timer Rebuild Task List

## Goal
Implement robust, background-safe timers for Cardio Quick HIIT and Walk–Run modes, with full persistence and notification support, aligned with this repo’s current patterns (Drizzle SQLite, NotificationService, AppState-driven backgrounding).

---

## Repo alignment notes (why this plan)
- Current cardio code was removed; placeholders exist: `CardioSessionContext`, `GlobalCardioTimerBar`, `GlobalCardioPhaseNotification` are no-ops.
- We already have a solid background pattern for workout/rest via `services/backgroundSession.ts` and `NotificationService`.
- The existing `active_session_timers` table is tied to workout sessions (FK to `active_workout_sessions`), so cardio needs its own active-session storage to avoid FK conflicts.
- Notification IDs are only tracked in-memory by `NotificationService`; for cardio we must persist IDs per session to cancel/reschedule after app restarts.

---

## Architecture Modules

### 1. TimerEngine
- [x] Implement a pure TimerEngine that derives state from wall-clock timestamps and precomputed schedule (no long-running setInterval).
- [x] Expose read-only derived state for UI: phase, remainingMs, currentRound/Lap, totalPlannedMs, totalElapsedMs, isPaused, startedAt, phaseStartedAt, phaseWillEndAt, willEndAt.
- [x] Provide two schedule generators/state machines: Quick HIIT and Walk–Run.
- [x] Foreground ticking: optional 250–1000ms UI tick only when app is active; recompute from Date.now() each render to avoid drift.

### 2. SessionPersistence (Drizzle + SQLite)
- [x] Add new tables for cardio active sessions (don’t reuse workout tables):
	- `active_cardio_sessions`: session_id (text, unique), mode ('hiit'|'walk_run'), params_json (text), started_at (text, ISO), phase_index (int), cycle_index (int), phase_started_at (text), phase_will_end_at (text), paused_at (text|null), accumulated_pause_ms (int), schedule_json (text), is_completed (int), last_updated (text), created_at (text).
	- `active_cardio_notifications`: id (PK), session_id (FK→active_cardio_sessions.session_id), notification_id (text), fire_at (text), created_at (text).
- Notes: Added Drizzle schema, migration `0007_cool_cardio.sql`, and wired into migrations.
- [x] Implement save/restore logic for a single active cardio sessionId.
- [x] Persist snapshot immediately on start, pause, resume, edit, skip, reset, finish.
- [x] On finish/reset, delete the active session row and its notification rows.
- [x] On finish, write a historical record into `cardio_sessions` (already exists) with computed totals.

### 3. NotificationScheduler (uses NotificationService)
- [x] Schedule local notifications for each phase boundary using absolute timestamps from schedule via `NotificationService.scheduleAbsolute`.
- [x] Persist returned notification IDs in `active_cardio_notifications` to enable cancellation after restarts.
- [x] Add per-phase messages (e.g., “Work ➜ Rest”, “Run ➜ Walk”, “Session Complete”).
- [ ] Optional pre-cues (3-2-1) for phases ≥4s; skip for very short phases.
- [x] Cancel all notifications for a sessionId using persisted IDs, then reschedule from the persisted schedule.

### 4. CardioSessionManager (Facade)
- [x] Implement as a small service + React hook (no global context required initially) exposing create/start/pause/resume/skip/reset/finish.
- [x] Enforce a single active cardio session; MVP replaces an existing session silently (optional user prompt later).
- [x] Provide lightweight selectors for efficient UI updates (derived state, mm:ss, current lap/round).
- [x] On app launch/foreground, read SQLite and reconstruct state losslessly (no drift).

### 5. BackgroundSync
- [x] Use `AppState` listeners: on background, stop UI ticks, persist snapshot, ensure notifications are scheduled; on foreground, recompute from Date.now() and persisted schedule, reconcile passed boundaries.
- [x] Do not rely on long-running timers. Avoid setInterval in background.
- [x] Expo Task Manager: optional later for sanity-sync; not required for MVP since absolute-time schedule + local notifications + foreground reconciliation are sufficient (matches existing rest/workout approach).

---

## State Machines

### Quick HIIT
- [x] States: Idle, Work, Rest, Completed, Paused.
- [x] Cycle: Work → Rest → next Work, repeat for rounds; complete after final Work (optional trailing Rest excluded by design toggle).
- [x] Show current ROUND (1…rounds).
- [x] TOTAL planned duration = rounds*(workSec+restSec) minus trailing rest if excluded.
- [x] Actions: PAUSE, RESET, FINISH with correct transitions and persistence.
- [x] Optional controls: skip current phase, +10s; rebuild remaining schedule and reschedule notifications.

### Walk–Run
- [x] States: Idle, Run, Walk, Completed, Paused.
- [x] Cycle: Run → Walk, repeat for laps; complete after final Walk (or after final Run if trailing walk excluded).
- [x] Show current LAP (1…laps).
- [x] TOTAL planned duration = laps*(runSec+walkSec), subtract trailing walk if excluded.
- [x] Actions: PAUSE, RESET, FINISH with correct transitions and persistence.

---

## Core Algorithm
- [x] Compute exclusively from absolute time.
- [x] On start, precompute schedule array of absolute phase boundaries in UTC and persist schedule_json.
- [x] Persist: startedAt, phase, cycleIndex, phaseStartedAt, phaseWillEndAt, full schedule.
- [x] Countdown is Date.now() vs phaseWillEndAt; clamp negatives to 0 and advance state as needed.
- [x] Pause/resume without drift: shift all future boundaries by pauseDelta; update phaseWillEndAt; reschedule notifications.
- [x] Edits mid-session: rebuild remaining schedule; keep completed phases intact; update TOTAL and notifications.
- [x] Skip phase/skip rest: advance to next phase; recompute schedule; reschedule notifications.
- [x] Single active session guard: maintain 0/1 row in `active_cardio_sessions`.

---

## Background & Resilience
- [x] On background: persist snapshot, ensure notifications scheduled; on foreground: recompute by walking passed boundaries.
- [x] Force-kill: notifications still fire; on next launch, restore from SQLite and fast-forward to current phase.
- [x] Device restart: restore from SQLite, reschedule pending notifications using persisted IDs.
- [x] Time changes (timezone/DST/manual): store/compare UTC timestamps only; fast-forward if now > boundary.
- [x] Low power/doze/focus modes: rely on absolute schedule + notifications; reconcile on foreground.
- [x] Notification permission/sound/vibration fallbacks handled by `NotificationService`.

---

## Notifications
- [x] For each phase transition, schedule a local notification (title/body includes mode + next phase + round/lap).
- [x] For session completion, schedule “Workout complete”.
- [x] Optional pre-cues (T−3/2/1) for phases ≥4s; configurable.
---

## UI Binding
- [x] Title reflects current phase (“REST”, “RUN”, etc.) via `GlobalCardioPhaseNotification`.
- [x] Large digital timer shows mm:ss remaining (compact global banner + bar implemented; full-screen timer view optional later).
- [x] TOTAL displays planned duration (exposed via hook; UI full view optional later).
- [x] PAUSE toggles to RESUME; RESET/FINISH implemented in hook; UI controls can call actions.
- [x] Home/index CTA reflects CONTINUE/START by reading active state in `app/cardio.tsx`.
- [x] Re-enable `GlobalCardioTimerBar` and `GlobalCardioPhaseNotification` wired to the new hook.

---

## Data to Save on Session End
- [x] Write to `cardio_sessions` on finish via `cardioBackgroundSession.saveHistoricalFromSnapshot`:
	- Mode and display name
	- Actual session start saved in `date`; end time recorded inside notes meta
	- Duration excluding pauses (includes active pause when finishing while paused)
	- Persist total pause ms and endAt inside notes for audit; flag "Ended early" when not completed
	- HIIT: store completed rounds; Walk–Run: store completed laps
	- Optional distance/notes hook-up deferred

---

## Edge Cases
- [x] Edits mid-phase (+seconds/skip) rebuild remaining schedule and reschedule notifications.
- [x] FINISH during a pause: duration excludes paused time and accounts for active pause.
- [x] Manual time/timezone changes mid-session: absolute UTC schedule with foreground fast-forward.
- [x] Rapid multiple starts: debounce (500ms) and enforce single active session.
- [x] Negative remaining due to OS delays: clamp to 0 and advance.
- [x] Very short durations (≤3s): pre-cues auto-skip (only when remaining ≥4s).
- [x] App uninstall/reinstall mid-session: not restorable by design; starts fresh.
- [x] Backgrounded screens do not keep a long-running interval; foreground tick only.

---

## Acceptance Criteria
- [x] Starting a session persists full schedule and schedules notifications; IDs are persisted.
- [x] Leaving/returning always shows correct phase, round/lap, and remaining time with no drift.
- [x] Force-killing app does not break notifications or correctness on restore (restore+reschedule on launch).
- [x] After device restart: pending notifications are rescheduled from persisted schedule; app shows correct state on launch.
- [x] Pause/resume shifts future boundaries by paused duration.
- [x] Reset/Finish clears notifications (via persisted IDs) and removes active session rows.
- [x] Home/index CTA reflects START vs CONTINUE accurately by reading `active_cardio_sessions`.

---

## Implementation checklist (repo-specific wiring)
- [x] Schema: add `active_cardio_sessions` and `active_cardio_notifications` to `db/schema.ts` + migration; keep existing `cardio_sessions` for history.
- [x] Service: create `services/cardioBackgroundSession.ts` mirroring `backgroundSessionService` but using cardio tables and persisted notification IDs.
- [x] Hook: add `hooks/useCardioSession.ts` exporting the facade (start/pause/resume/skip/reset/finish + derived state).
- [x] UI: re-implement `GlobalCardioTimerBar` and `GlobalCardioPhaseNotification` using the hook; update `app/cardio.tsx` to use CONTINUE/START CTA.
- [x] Notifications: integrated `NotificationService`, persisted IDs, cancel/reschedule from storage with pre-cues.
- [x] AppState: wire background/foreground sync in the hook; no long timers in background.
- [ ] Tests/dev scripts: add a small script under `scripts/` to simulate a short HIIT schedule and verify persistence/restore.

Notes:
- Hook `useCardioSession` added; UI components can now consume `state` and actions for rendering and controls.
