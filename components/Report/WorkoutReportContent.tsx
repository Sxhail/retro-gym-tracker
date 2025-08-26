import React, { forwardRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '../../styles/theme';
import type { WorkoutDetail, PRItem } from '../../services/workoutHistory';

type Props = {
  workout: WorkoutDetail;
  prs: PRItem[];
};

export const WorkoutReportContent = forwardRef<View, Props>(({ workout, prs }, ref) => {
  const exercises = workout?.exercises ?? [];
  const allSets = exercises.flatMap((ex) => ex.sets ?? []);
  const totalSets = allSets.length;
  const totalReps = allSets.reduce((sum, s) => sum + (Number(s.reps) || 0), 0);
  const totalVolume = allSets.reduce((sum, s) => sum + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);

  const dd = new Date(workout.date);
  const day = dd.getDate().toString().padStart(2, '0');
  const month = (dd.getMonth() + 1).toString().padStart(2, '0');
  const year = dd.getFullYear();
  const dateStr = `${day}/${month}/${year}`;

  const durationSec = workout?.duration ?? 0;
  const durMinTotal = Math.floor(durationSec / 60);
  const durH = Math.floor(durMinTotal / 60).toString().padStart(2, '0');
  const durM = (durMinTotal % 60).toString().padStart(2, '0');

  const exerciseLines = exercises.map((ex, idx) => {
    const sets = ex.sets ?? [];
    const setCount = sets.length;
    const repCount = sets.reduce((sum, s) => sum + (Number(s.reps) || 0), 0);
    const volume = Math.round(sets.reduce((sum, s) => sum + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0));
    const maxWeight = sets.reduce((mx, s) => Math.max(mx, Number(s.weight) || 0), 0);
    return `${idx + 1}.\t${ex.exerciseName} — ${setCount} × ${repCount} @ ${maxWeight} → ${volume}`;
  });

  return (
    <View ref={ref} style={styles.container}>
      <Text style={styles.line}>{`LIFT ${workout.id} — Session Report`}</Text>
      <Text style={styles.line}>{`\nDate: ${dateStr}`}</Text>
      <Text style={styles.line}>{`Duration: ${durH}:${durM}`}</Text>
      <Text style={styles.line}>{`Total Volume: ${Math.round(totalVolume).toLocaleString()} kg`}</Text>
      <Text style={styles.line}>{`Total Sets: ${totalSets}`}</Text>
      <Text style={styles.line}>{`Total Reps: ${totalReps}`}</Text>

      <Text style={styles.line}>{`\n⸻\n`}</Text>

      <Text style={styles.line}>Exercises</Text>
      {exerciseLines.map((l, i) => (
        <Text key={i} style={styles.lineIndented}>{l}</Text>
      ))}

      <Text style={styles.line}>{`\n⸻\n`}</Text>
      <Text style={styles.line}>Personal Records (PRs)</Text>
      {prs.map((pr, i) => (
        <Text key={i} style={styles.lineIndented}>{`•\t${pr.exerciseName}: ${pr.weight} × ${pr.reps} (New PR!)`}</Text>
      ))}

  <Text style={styles.line}>{`\n⸻\n`}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  line: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    marginBottom: 2,
  },
  lineIndented: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    marginBottom: 2,
    paddingLeft: 8,
  },
});

export default WorkoutReportContent;
