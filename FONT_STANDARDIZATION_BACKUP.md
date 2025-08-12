# Font Standardization Backup - August 11, 2025

This document records the original font usage patterns before standardization changes for potential reverting.

## Original Font Usage Patterns

### Components Using `theme.fonts.mono` (JetBrains Mono)
- `components/FilterChips.tsx`: Filter chip text
- `components/ExerciseCard.tsx`: Exercise names, muscle groups, last workout data
- `components/WorkoutCard.tsx`: Workout names, dates, exercise counts, duration
- `components/ProgressChart.tsx`: Chart labels and axis text
- `components/AttendanceCalendar.tsx`: Calendar text elements

### Mixed Usage Patterns (Before Standardization)
1. **Exercise Names:**
   - Some used `theme.fonts.code` (VT323)
   - Some used `theme.fonts.mono` (JetBrains)

2. **Button Text:**
   - Mix of `theme.fonts.heading`, `theme.fonts.code`, `theme.fonts.body`

3. **Navigation Headers:**
   - Mix of `theme.fonts.code` and `theme.fonts.heading`

4. **Data Display:**
   - Numbers/stats used various fonts

## Standardization Rules Applied
1. **Headers/Titles**: `theme.fonts.heading` (Orbitron)
2. **Body Text**: `theme.fonts.body` (ShareTechMono)
3. **UI Labels/Buttons**: `theme.fonts.code` (VT323)
4. **Data Display/Numbers**: `theme.fonts.mono` (JetBrains)
5. **Special Emphasis**: `theme.fonts.display` (PressStart2P) for main titles only

## Files Modified

### components/ExerciseCard.tsx
- **Exercise names**: Changed from `theme.fonts.mono` to `theme.fonts.code` (follows UI Labels rule)
- **Subtitles**: Changed from `theme.fonts.mono` to `theme.fonts.body` (follows Body Text rule)
- **Icon buttons**: Changed from `theme.fonts.mono` to `theme.fonts.code` (follows UI Labels rule)

### components/WorkoutCard.tsx
- **Workout titles**: Changed from `theme.fonts.mono` to `theme.fonts.heading` (follows Headers/Titles rule)
- **Dates**: Changed from `theme.fonts.mono` to `theme.fonts.body` (follows Body Text rule)
- **Exercise counts**: Changed from `theme.fonts.mono` to `theme.fonts.body` (follows Body Text rule)
- **Arrow icons**: Changed from `theme.fonts.mono` to `theme.fonts.code` (follows UI Labels rule)

### components/FilterChips.tsx
- **Chip text**: Changed from `theme.fonts.mono` to `theme.fonts.code` (follows UI Labels rule)

### app/new.tsx
- **Session timer**: Changed hardcoded `'Orbitron_700Bold'` to `theme.fonts.heading` (follows Headers/Titles rule)

## Revert Instructions
To revert these changes, restore the original font assignments documented above and reverse the specific changes listed in each file section.
