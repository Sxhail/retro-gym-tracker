# Stats Charts Implementation Plan (live status)

A detailed reference to implement four new weightlifting progress charts on the Stats page using RN-SVG and Drizzle SQL aggregations. This file tracks progress as tasks are completed.
## Top-level checklist

- [x] Confirm charting approach: RN-SVG (already used by `ProgressChart`) — no new deps
- [x] Create shared UI and data utilities
  - [x] ChartCard wrapper with title + consistent styling
  - [x] DateRangeFilter (7d / 30d / All)
  - [x] ExercisePicker (dropdown of unique exercises)
  - [x] High-performance SQL aggregations via Drizzle in `services/analytics.ts`
  - [x] Performance helpers: `rollingAverage`, `downsampleLTTB` (stub)
- [x] Implement charts
  - [x] VolumeOverTimeChart (bar; per workout / per week)
  - [x] WorkoutFrequencyChart (bar + optional 4-week rolling avg line)
  - [x] PRTimelineChart (line; markers for new PRs; exercise dropdown)
  - [x] Estimated1RMChart (line; peaks highlighted; exercise dropdown)
- [x] Integrate charts into `app/stats.tsx` in styled cards, responsive and scrollable
- [x] Handle empty states and loading
- [x] Theming consistent with retro Y2K (fonts, neon accents, gridlines)
- [ ] QA: long-history performance, orientation, small screens, tooltips, filters
## Dependencies

- Already in project: `react-native-svg` (v15.x)
- Optional (nice-to-have):
  - `date-fns` for date grouping/formatting
  - `lodash.memoize` or memo via `useMemo`
## Shared components and utilities (done)
4) Data selectors and aggregations (in `services/analytics.ts`)
- SQL-first functions implemented:
  - `getVolumeBySession(range)`
  - `getVolumeByWeek(range)`
  - `getWorkoutFrequencyByWeek(range)`
  - `getDistinctExercises()`
  - `getPRBaseRows(exercise, range)` + `buildPRSeries()`
  - `getEstimated1RMBaseRows(exercise, range)` + `buildEstimated1RMSeries()`
- Helpers implemented: `getDateRange`, ISO week utilities, `rollingAverage`, `downsampleLTTB` (stub)
## Data flow and integration (done)

- Charts query series via `services/analytics.ts` and manage own range/exercise state.
- Integrated into `app/stats.tsx` under existing `ProgressChart`.
## Performance plan

- Data fetching
  - Fetch per-chart series via analytics services on demand; cache by params (range, exercise, groupBy)
  - Expose list of distinct exercises for pickers.
## File structure
- `components/stats/svg/Tooltip.tsx` (in-SVG tooltip)
- `services/analytics.ts` (SQL aggregations + series builders)
- `styles/theme.ts` (extend with neon Y2K tokens if not present)
## Detailed task list (step-by-step)
1) Setup
- [x] Confirm `react-native-svg` is working (already used by `ProgressChart`)
- [x] Add chart scaffolding and verify rendering
2) Data utilities (`services/analytics.ts`)
- [x] Date helpers (range, ISO week)
- [x] Volume per session + week
- [x] Workout count per week + gap fill
- [x] Distinct exercises
- [x] PR base rows + series
- [x] Epley 1RM base rows + series
- [x] Rolling average
- [x] Downsampling stub
- [ ] Unit tests for edge cases
3) Shared UI
- [x] `ChartCard` with title, loading, empty state
- [x] `DateRangeFilter` with presets
- [x] `ExercisePicker` (unique list from DB)
4) Charts (RN-SVG)
- [x] VolumeOverTimeChart: data wiring, groupBy toggle, bars
- [x] WorkoutFrequencyChart: bars + 4-week rolling avg line, zero-week style
- [x] PRTimelineChart: exercise dropdown, line + PR markers
- [x] Estimated1RMChart: exercise dropdown, line + peak markers
- [x] Add tap-to-tooltip for all charts
5) Stats screen integration (`app/stats.tsx`)
- [x] Rendered four ChartCards with respective components under existing content
- [x] Vertical scrolling across all cards
6) Performance and polish
- [ ] Memoize expensive selectors/hooks; verify re-render counts
- [x] Downsample helper; cap points (optional)
- [x] Neon gridlines and consistent fonts
## Acceptance criteria
- Tooltips display correct values and dates on tap (DONE)
### 1) VolumeOverTimeChart (done)

- UI:
  - RN-SVG Bar chart (Rect per bar) inside ChartCard
  - Axis/grid via RN-SVG (Lines + SvgText), horizontal scroll when data exceeds width
- Tasks:
  - [x] SQL aggregations (session/week)
  - [x] Component with groupBy toggle
  - [x] Tooltip on tap showing formatted volume and date
  - [x] Responsiveness + scrolling
  - [x] Empty state handling

### 2) WorkoutFrequencyChart (done)

- UI:
  - RN-SVG bars for weekly counts; RN-SVG line for rolling avg; zero weeks muted
- Tasks:
  - [x] SQL+gap fill; `rollingAverage`
  - [x] Chart with bars + avg line; zero-week style
  - [x] Tooltip on tap (week and count)

### 3) PRTimelineChart (done)

- UI:
  - ExercisePicker above chart; RN-SVG line + PR markers (highlight new PRs)
- Tasks:
  - [x] PR base rows + step-up series
  - [x] Chart with PR markers
  - [x] Tooltip on tap (date, PR)
  - [x] Handle empty data

### 4) Estimated1RMChart (done)

- UI:
  - ExercisePicker above chart; RN-SVG line + peak markers
- Tasks:
  - [x] 1RM base rows + peak series
  - [x] Chart with peaks
  - [x] Tooltip on tap (date, est. 1RM)
  - [x] Handle empty data
