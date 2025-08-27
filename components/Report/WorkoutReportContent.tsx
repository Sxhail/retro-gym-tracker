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

  const exerciseLines = exercises.map((ex) => {
    const sets = ex.sets ?? [];
    if (sets.length === 0) return `${ex.exerciseName}: —`;
    // Top set: choose the set with highest weight; tie-breaker by highest reps
    const top = sets.reduce((best, s) => {
      const bw = Number(best.weight) || 0;
      const br = Number(best.reps) || 0;
      const cw = Number(s.weight) || 0;
      const cr = Number(s.reps) || 0;
      if (cw > bw) return s;
      if (cw === bw && cr > br) return s;
      return best;
    }, sets[0]);
    const w = Number(top.weight) || 0;
    const r = Number(top.reps) || 0;
    return `${ex.exerciseName}: ${w} × ${r}`;
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
      {(() => {
        // Ensure only one PR per exercise, keeping the highest weight
        const byExercise = new Map<number, PRItem>();
        for (const pr of prs) {
          const existing = byExercise.get(pr.exerciseId);
          if (!existing || pr.weight > existing.weight) byExercise.set(pr.exerciseId, pr);
        }
        return Array.from(byExercise.values()).map((pr, i) => (
          <Text key={i} style={styles.lineIndented}>{`•\t${pr.exerciseName}: ${pr.weight} × ${pr.reps}`}</Text>
        ));
      })()}

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
