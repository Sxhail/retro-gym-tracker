# Post-Session Report — Implementation Plan

This plan adds a Post-Session Report shown right after finishing a lift workout. It’s modular, re-usable from History, and styled with the app’s retro theme.

## Requirements checklist

- Modal or full-screen report shown immediately after user taps “Finish”.
- Retro styling aligned with theme; dismissible; report saved to history.
- Sections: Summary, PR Highlights, Body Overlay Heatmap, Actions.
- Summary: total sets, total reps, total volume (sum weight×reps), session duration.
- PR highlights: detect new PR per exercise (heaviest lift OR most reps at a given weight); friendly fallback if none.
- Heatmap: front-only anatomy overlay; intensity by training volume; optional tap shows exercises for that muscle.
- Actions: Share Report (image or PDF) [functional], Close.
- Modular components for reuse (e.g., in History view).
- All numbers from existing saved workout data.
- Edge cases: empty session, incomplete logs, no PRs.
- Smooth open/close transitions.

Status: matched to current architecture and data. See “Why this is the best fit” at the end.

---

## Architecture overview

- Data source: saved workouts in `workouts`, `workout_exercises`, `sets`, `exercises` (drizzle/SQLite). We’ll load by `workoutId` via `getWorkoutDetail(workoutId)`.
- Services: add a small report service to compute summary, PRs, and per-muscle volumes from the saved workout.
- UI: new modular components under `components/PostSessionReport/` with a single `PostSessionReportModal` wrapper.
- Flow: on finish in `app/new.tsx`, after save returns `workoutId`, show the modal with that `workoutId` (session can be reset safely, we read from DB).
- Reuse: open the same report from `app/history.tsx` for any past workout.
- Sharing: capture the report view as an image (PNG) and optionally generate a PDF.

---

## Data model and computations

Inputs: `WorkoutDetail` from `getWorkoutDetail(workoutId)` plus `exercises.muscle_group`.

Derived metrics:
- Total sets: count of `sets` across all exercises.
- Total reps: sum of `reps` across all sets.
- Total volume: sum of `weight * reps` across completed sets (ignore weight <= 0 or reps <= 0).
- Session duration: `workouts.duration` (already tracked precisely with pause/resume).

PR detection:
- For each exercise in the workout, consider each completed set.
- Heaviest lift PR: if set.weight > historical max weight for that exercise (strictly greater).
- Most reps at weight PR: for a given weight (rounded to 0.5 if you use plates), if set.reps > historical best reps at that exact weight. Ignore current workout’s sets when computing historical baselines.
- Return a list like: `{ exerciseId, exerciseName, type: 'weight'|'repsAtWeight', weight, reps }`.

Per-muscle volume:
- Parse `exercises.muscle_group` (comma- or slash-separated). Map common names: Chest, Back, Legs, Glutes, Shoulders, Triceps, Biceps, Core, Arms (fallback to Unknown).
- Distribute a set’s volume equally across all listed muscles for that exercise.
- Heatmap intensity is normalized to [0..1] by dividing by the max muscle volume in this session.

---

## New service: `services/workoutReport.ts`

Add pure functions so UI stays thin:
- `getWorkoutReportData(workoutId: number)`
  - Loads `WorkoutDetail` (existing API) and computes summary, PRs, and per-muscle intensity map.
  - Returns `{ workout, summary, prs, muscleVolumes, muscleIntensity }`.
- `getHistoricalMaxWeight(exerciseId: number, excludeWorkoutId?: number)`
- `getHistoricalMaxRepsAtWeight(exerciseId: number, weight: number, excludeWorkoutId?: number)`
- Utility: `normalizeMuscleName(input: string): MuscleKey` and `splitMuscleGroups(string): MuscleKey[]`.

Notes:
- Favor drizzle SQL with `MAX(sets.weight)` and filtered queries per exercise/weight.
- Exclude the current workout id to avoid self-comparison for PRs.

---

## UI components (modular)

Create directory: `components/PostSessionReport/`

- `PostSessionReportModal.tsx`
  - Props: `{ workoutId: number; visible: boolean; onClose: () => void; onShare: (format: 'image'|'pdf') => Promise<void> }`.
  - Loads report data via the service, shows sections, and exposes a ref for capture.
  - Animated fade/scale in; `Modal` with `transparent` backdrop.

- `SummaryCard.tsx`
  - Displays total sets, reps, volume, duration. Retro card style, consistent with theme.

- `PRHighlights.tsx`
  - Shows list of PR badges like “🏆 New Squat PR: 120 kg × 5”.
  - If none, show motivational message (e.g., “No PRs today—progress is progress.”).

- `BodyOverlayHeatmap.tsx`
  - Uses `react-native-svg` (already in deps) to render a front-view simplified anatomy.
  - Accepts `{ muscleIntensity: Record<MuscleKey, number>, onMusclePress?: (muscle: MuscleKey) => void }`.
  - Uses fixed SVG paths for the main muscle groups; fill color from low to high intensity.

- `ActionsBar.tsx`
  - Buttons: Share (image), Share (PDF), Close.

Optional reuse:
- `PostSessionReportScreen.tsx` to open as full screen, for History deep-link.

---

## Hook-in points

- `app/new.tsx` `handleFinishWorkout()`
  - After successful `saveWorkout()` returns `workoutId`, stop showing the Alert.
  - Set state to show `PostSessionReportModal` with that `workoutId`.
  - Keep `resetSession()` (already called) since the modal uses saved data, not session state.
  - On Close: navigate back to Home or stay, per current flow. Provide quick actions (e.g., “View in History”).

- `app/history.tsx`
  - Add “View Report” action on a workout card to open the same report modal/screen with the selected `workoutId`.

---

## Sharing implementation

- Image sharing:
  - Add `react-native-view-shot` for `captureRef` of the report container.
  - Add `expo-sharing` to open the native share sheet with the captured PNG.

- PDF sharing:
  - Add `expo-print` and generate a simple HTML or use the captured image embedded in a PDF via `printToFileAsync`.

- File handling:
  - Use `expo-file-system` (already present) to manage temporary files if needed.

Dependencies to add:
- `react-native-view-shot`
- `expo-sharing`
- `expo-print`

Expo config: none special beyond install.

---

## Edge cases

- Empty session: current flow prevents saving; modal won’t be shown.
- Incomplete logs / invalid data: current validations prevent save; still guard against zero/negative values when computing volume.
- No PRs: render motivational fallback.
- Very long sessions: duration already computed via accurate timestamp-based timer.
- Unknown muscle groups: map to `Unknown` and either hide or show minimal tint.

---

## Animations and UX

- Use `Modal` with `animationType="fade"` for the backdrop and an `Animated` scale+fade for the content card.
- Keep transitions ~150–200ms for snappy feel.
- Ensure report fetch occurs quickly; show a small neon loader while computing.

---

## Styling notes

- Reuse `theme` (neon borders, dark background, code/display fonts).
- Keep sections in bordered cards with neon outlines.
- Titles use `theme.fonts.code`, values use `theme.fonts.heading/display`.

---

## File-by-file task list

1) Services
- Create `services/workoutReport.ts`
  - Implement: `getWorkoutReportData`, `getHistoricalMaxWeight`, `getHistoricalMaxRepsAtWeight`, helpers.
  - Unit-like sanity via quick calls from History screen (manual test).

2) Components
- Create `components/PostSessionReport/PostSessionReportModal.tsx`
- Create `components/PostSessionReport/SummaryCard.tsx`
- Create `components/PostSessionReport/PRHighlights.tsx`
- Create `components/PostSessionReport/BodyOverlayHeatmap.tsx`
- Create `components/PostSessionReport/ActionsBar.tsx`

3) Hook-in
- Update `app/new.tsx`:
  - Add state: `reportVisible`, `lastSavedWorkoutId`.
  - In `handleFinishWorkout`, on success: set those states and show modal instead of Alert.
  - Wire `onShare` to capture and share.

Progress update (2025-08-25):
- Implemented service `services/workoutReport.ts` [Done]
- Added components under `components/PostSessionReport/` (SummaryCard, PRHighlights, BodyOverlayHeatmap, ActionsBar, PostSessionReportModal) [Done]
- Wired `PostSessionReportModal` into `app/new.tsx` to show after save [Done]
- Added sharing deps (expo-sharing, expo-print, react-native-view-shot) and implemented image/PDF sharing [Done]
- Next: optional history integration and polish

4) History integration (optional but recommended)
- Update `app/history.tsx` items to include a “View Report” button to open the same modal/screen.

5) Sharing infra
- Install deps: `react-native-view-shot`, `expo-sharing`, `expo-print`.
- Implement `onShare('image')` using `captureRef` and `Sharing.shareAsync`.
- Implement `onShare('pdf')` using `Print.printToFileAsync` and share the file.

6) Tests / QA manual
- Finish a workout with mixed sets and confirm:
  - Summary totals match the session.
  - PR detection triggers only when appropriate.
  - Heatmap shades expected muscles (e.g., Chest day lights Chest/Triceps/Shoulders if tagged).
  - Share as image works; PDF file opens/shares.
  - Modal opens smoothly and closes back to main flow.
- Open a past workout’s report from History.

---

## Pseudo contracts (for services)

- Input: `workoutId: number` (must exist)
- Output: `{ summary: { sets, reps, volume, duration }, prs: PR[], muscleIntensity: Record<MuscleKey, number>, workout: WorkoutDetail }`
- Errors: if workout not found → return null or throw; callers show a toast and close modal.

Edge cases tested: empty, zero weights, missing `muscle_group` strings, duplicate muscles in string.

---

## Why this is the best fit for the repo

- Data availability: All data needed is already stored (`workouts`, `workout_exercises`, `sets`, `exercises`). `getWorkoutDetail()` exists and is reliable.
- Finish flow: `app/new.tsx` currently shows an Alert on save success. Replacing that with a modal aligns with the requirement (immediate report) and keeps the user in context.
- Styling: The project has consistent theme primitives; `CardioCompletionModal` shows an established modal pattern to mirror.
- Heatmap: `react-native-svg` is already present, so an SVG overlay is straightforward.
- Sharing: Adding `react-native-view-shot` + `expo-sharing`/`expo-print` is standard in Expo apps and keeps complexity low.

---

## Next steps (ordered)

1) Implement `services/workoutReport.ts`.
2) Build `components/PostSessionReport/*` with stub content.
3) Wire to `app/new.tsx` and show modal after save.
4) Add sharing via image; then add PDF.
5) Add History “View Report”.
6) Polish styles and animations.

---

## Open questions (assumptions made)

- Assumption: `exercises.muscle_group` contains comma-separated groups; we’ll split on commas and slashes and trim.
- Assumption: PR is per-exercise global best (not per set index). If you want per-set-index PRs, adjust queries to filter by `sets.set_index`.
- Assumption: Volume contribution for multi-muscle exercises is equally distributed across listed groups.

If these differ from your intent, we can tweak the service functions quickly.
