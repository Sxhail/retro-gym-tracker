# Post-Lift Session Report — Minimal, Retro, Shareable

A simple, retro-styled Post-Session Report shown after a user taps Finish. Focuses on workout stats, PR highlights, and a share-as-image action. Modular so it can be reused in History.

## Goals and scope

- Show a modal or full-screen report immediately after Finish
- Minimal retro UI (consistent with `theme.ts`)
- Sections:
  - Summary (sets, reps, volume, duration)
    - Includes an exercise list with per-exercise sets, reps, and volume for richer share images
  - PR highlights (heaviest lift or most reps at a weight)
  - Actions (Share as Image, Close)
- Pull from saved workout log (by workoutId)
- Handle edge cases (empty, no PRs, partial data)
- Modular components for reuse in History
- Smooth open/close transitions

## Codebase deep-scan (grounding)

Key places to integrate and data sources:

- Finish flow: `app/new.tsx`
  - `handleFinishWorkout()` calls `endWorkout()` then `saveWorkout()` and currently resets session immediately.
  - Intercept here: after `saveWorkout()` returns an id, open the Report modal with that id. Reset session after the modal closes (instead of immediately).
- Workout persistence and queries: `services/workoutHistory.ts`
  - `saveWorkout(sessionData)` returns `workoutId`
  - `getWorkoutDetail(workoutId)` returns exercises and sets; use this to render stats and detect PRs
  - `getExerciseMaxWeights()` returns per-exercise max weight and its reps (all-time); useful for “heaviest lift” PRs
  - `getPreviousSetForExerciseSetNumber()` exists but PR logic needs “max reps at a given weight,” which we’ll add as a tiny helper
- Styling: `styles/theme.ts`
- History detail already computes summary-like stats (good reference): `app/history/[workoutId].tsx`
- Sharing dependencies present in `package.json`:
  - `react-native-view-shot` (capture view)
  - `expo-sharing` (share the image)

No existing report component; we’ll create one under `components/Report/` and a tiny wrapper modal.

## Minimal UX/design

- Show as a full-screen Modal with `animationType="fade"` or a light slide-in + fade via `Animated` for smoothness
- Retro look: borders, neon color, mono fonts from `theme.ts`
- Share button captures a specific container View with `react-native-view-shot` and calls `expo-sharing`
- Close button dismisses modal and returns to main flow

## Data contract for the report component

- Inputs: `workoutId: number`, `visible: boolean`, `onClose: () => void`
- Fetch: `getWorkoutDetail(workoutId)` for exercises/sets + duration/date/name
- Compute:
  - Total sets: count of sets
  - Total reps: sum of `reps`
  - Total volume: sum of `weight * reps` across all sets (treat missing as 0)
  - Duration: use `workout.duration` (already saved as elapsed seconds)
- PR detection:
  - Heaviest lift PR: for each exercise, if any set weight > previous all-time max weight (excluding this workout) then it’s a PR
  - Most reps at a given weight: for each set, if reps > previous max reps for the same exercise at that weight (excluding this workout)

We’ll implement tiny service helpers to keep UI clean.

## Tasks checklist (keep it simple)

-1) Service utilities for PRs (in `services/workoutHistory.ts`)
- [x] Add `getExerciseMaxWeightBefore(workoutId: number): Promise<Record<number, number>>` (added)
  - Query previous max `sets.weight` per exercise excluding `workoutId`
- [x] Add `getMaxRepsForExerciseAtWeightBefore(exerciseId: number, weight: number, workoutId: number): Promise<number>` (added)
  - Query max reps for exact weight for the exercise, excluding `workoutId`
- [x] Export a thin aggregator `getWorkoutPRs(workoutId)` that: (added)
  - Loads `getWorkoutDetail(workoutId)`
  - Uses the two helpers above to produce a list like:
    - `{ type: 'weight' | 'repsAtWeight', exerciseName, weight, reps }`
  - Deduplicate within the workout (if multiple sets tie the same PR)

2) Report UI (new)
- [x] Create `components/Report/WorkoutReportContent.tsx` (added)
  - Pure presentational component (no modal), props: `{ workout: WorkoutDetail, prs: PRItem[], captureRef?: Ref }`
  - Renders three sections:
    - Summary: Total sets, reps, volume, duration (styled card/list)
    - PR Highlights: list of PR items; if none, show “Solid work today!”
    - Actions: Share and Close are not in this file; they live in the wrapper to keep this reusable
- [x] Create `components/Report/PostSessionReportModal.tsx` (added)
  - Modal wrapper that:
    - Accepts `{ visible, workoutId, onClose }`
    - Fetches `getWorkoutDetail(workoutId)` and `getWorkoutPRs(workoutId)`
    - Wraps `WorkoutReportContent` in a `ViewShot` container and wires Share button using `expo-sharing`
    - Adds smooth fade/slide-in opacity/translateY animation on mount/unmount
    - Has two buttons: Share as Image, Close
  - Handle edge cases: loading state, errors, empty workout detail, zero sets → friendly fallback

3) Hook it into Finish flow (`app/new.tsx`)
- [x] On successful `saveWorkout()`, instead of immediately calling `resetSession()`, set report modal state with the returned `workoutId` and show it (done)
- [x] When the report modal closes, then call `resetSession()` and navigate back/home if desired (done)
- [x] Ensure existing rest timer cleanup remains unaffected (no changes to timer code)

4) Reuse in History (optional quick win)
- [ ] In `app/history/[workoutId].tsx`, add a button “OPEN REPORT” that opens the same modal with the current `workoutId` (reusing the component)
- [ ] Or embed `WorkoutReportContent` somewhere on the page (read-only, no share/close) using the fetched data already on that screen

5) Simple transitions
- [x] Use `Modal animationType="fade"` or `Animated` for a 150–250ms opacity + slight translateY to feel smooth and retro (done)
- [x] Ensure Android back dismisses modal via `onRequestClose` (done)

6) Sharing as image
- [x] Use `react-native-view-shot` to capture `WorkoutReportContent` view (done)
- [x] Use `expo-sharing` to share the captured file (PNG) (done)
- [x] Consider iOS/Android permissions (expo handles most; add small error/toast on failure) (handled with Alert)

### Crash-safety notes
- Defensive null checks around `workout`/`prs` loading
- Guarded share flow with `isAvailableAsync` and try/catch Alerts
- Report shows after a successful save only; session resets on Close

### Summary richness
- The Summary now includes exercise names with per-exercise sets, reps, and volume lines to enrich the shared image.

7) Tests and edge cases
- [ ] Empty workout detail (shouldn’t happen due to save validations) → show fallback copy and Close
- [ ] No PRs → show “Solid work today!”
- [ ] Very long workouts → duration formatting HH:MM:SS
- [ ] Missing weights or reps (defensive coding) → treat as 0 for volume
- [ ] Large number of sets → layout scrolls if needed

## PR detection logic (clear and tiny)

- Heaviest lift PR per exercise
  - previousMax = max weight for that exercise across all previous workouts (exclude current `workoutId`)
  - If any set.weight > previousMax → record PR: “New {exercise} PR: {weight} kg × {reps}”
- Most reps at a given weight per exercise
  - previousRepsMax = max reps where exerciseId matches and weight equals the set’s weight (exclude current)
  - If set.reps > previousRepsMax → record PR: “New {exercise} PR: {weight} kg × {reps}”
- Prefer unique entries (if multiple sets hit the same record, show one with highest reps)

Implementation note: keep helpers server-like in `services/workoutHistory.ts` to avoid complex UI queries.

## Minimal props/exports (reusability)

- `WorkoutReportContent`: accepts a `WorkoutDetail` (+ computed stats) and a `prs` array; no modal logic, pure view.
- `PostSessionReportModal`: wraps content with data-loading, animation, and actions; reusable from New and History.

## Styling sketch (retro/minimal)

- Neon borders and text, transparent backgrounds (`rgba(0,255,0,0.05)`) to match other screens
- Use `theme.fonts.code` and `theme.fonts.heading` for labels/values
- Section headers with small caps and borders; cards with `borderWidth: 1` and `borderColor: theme.colors.neon`

## Integration details

- In `app/new.tsx`:
  - Keep current validations and `endWorkout()` → `saveWorkout()`
  - After `saveWorkout()` returns id:
    - set local state `{ reportVisible: true, reportWorkoutId: id }`
    - do NOT call `resetSession()` yet
  - On modal Close:
    - call `resetSession()`
    - navigate back/home

This avoids duplicate saves and preserves the simple flow.

## Deferred/Out of scope (for simplicity)

- Multi-image share or PDF export (we only do PNG image share now)
- Social templates/branding beyond the app’s native style
- Cross-workout comparisons in the report (possible later)

## After implementation — quick manual check

- Start a workout, add sets, tap Finish → report shows with correct stats and any PRs
- Tap Share → share sheet opens with an image of the report
- Close → returns to main flow and session is reset
- Open any saved workout in History and trigger the modal via “OPEN REPORT” (optional)

---

Appendix: data points and references
- Session times: `useWorkoutSession` context manages start/end and elapsed; saved to DB via `saveWorkout`
- Workout detail structure: `getWorkoutDetail(workoutId)` returns exercises/sets with `completed` boolean
- Max weight helper exists: `getExerciseMaxWeights()` — but we’ll add exclude-by-workout helpers for precise PR checks
- Dependencies already installed: `react-native-view-shot`, `expo-sharing`
