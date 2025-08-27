import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated, Platform, Alert, Share, NativeModules, ScrollView } from 'react-native';
import theme from '../../styles/theme';
import { getWorkoutDetail, getWorkoutPRs, type WorkoutDetail, type PRItem } from '../../services/workoutHistory';
import { WorkoutReportContent } from './WorkoutReportContent';
// Note: captureRef and Sharing are imported dynamically in the share handler

type Props = {
  visible: boolean;
  workoutId: number | null;
  onClose: () => void;
};

export default function PostSessionReportModal({ visible, workoutId, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [prs, setPrs] = useState<PRItem[]>([]);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const shotRef = useRef<View>(null);

  const buildShareText = (w: WorkoutDetail | null, p: PRItem[]) => {
    if (!w) return 'LIFT — Session Report';
    const exercises = w.exercises ?? [];
    const allSets = exercises.flatMap((ex) => ex.sets ?? []);
    const totalSets = allSets.length;
    const totalReps = allSets.reduce((sum, s) => sum + (Number(s.reps) || 0), 0);
    const totalVolume = allSets.reduce((sum, s) => sum + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0);
    const dd = new Date(w.date);
    const day = dd.getDate().toString().padStart(2, '0');
    const month = (dd.getMonth() + 1).toString().padStart(2, '0');
    const year = dd.getFullYear();
    const dateStr = `${day}/${month}/${year}`;
    const durMinTotal = Math.floor((w.duration ?? 0) / 60);
    const durH = Math.floor(durMinTotal / 60).toString().padStart(2, '0');
    const durM = (durMinTotal % 60).toString().padStart(2, '0');
    const volStr = `${Math.round(totalVolume).toLocaleString()} kg`;
    const exerciseLines = exercises.map((ex) => {
      const sets = ex.sets ?? [];
      if (sets.length === 0) return `\t${ex.exerciseName}: —`;
      const top = sets.reduce((best, s) => {
        const bw = Number(best.weight) || 0;
        const br = Number(best.reps) || 0;
        const cw = Number(s.weight) || 0;
        const cr = Number(s.reps) || 0;
        if (cw > bw) return s;
        if (cw === bw && cr > br) return s;
        return best;
      }, sets[0]);
      const wv = Number(top.weight) || 0;
      const rp = Number(top.reps) || 0;
      return `\t${ex.exerciseName}: ${wv} × ${rp}`;
    });
    const prLines = (() => {
      if (!p || p.length === 0) return [] as string[];
      const byExercise = new Map<number, PRItem>();
      for (const pr of p) {
        const existing = byExercise.get(pr.exerciseId);
        if (!existing || pr.weight > existing.weight) byExercise.set(pr.exerciseId, pr);
      }
      return Array.from(byExercise.values()).map((pr) => `\t•\t${pr.exerciseName}: ${pr.weight} × ${pr.reps}`);
    })();

    return [
      `LIFT ${w.id} — Session Report`,
      '',
      `Date: ${dateStr}`,
      `Duration: ${durH}:${durM}`,
      `Total Volume: ${volStr}`,
      `Total Sets: ${totalSets}`,
      `Total Reps: ${totalReps}`,
      '',
      '⸻',
      '',
      'Exercises',
      ...exerciseLines,
      '',
      '⸻',
      '',
      'Personal Records (PRs)',
      ...prLines,
      '',
      '⸻',
      ''
    ].join('\n');
  };

  useEffect(() => {
    if (visible && workoutId) {
      setLoading(true);
      (async () => {
        try {
          const w = await getWorkoutDetail(workoutId);
          setWorkout(w);
          const p = await getWorkoutPRs(workoutId);
          setPrs(p);
        } catch (e) {
          console.error('Failed to load report data', e);
        } finally {
          setLoading(false);
        }
      })();

      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true })
      ]).start();
    } else {
      opacity.setValue(0);
      translateY.setValue(12);
      setWorkout(null);
      setPrs([]);
    }
  }, [visible, workoutId]);

  const onShare = async () => {
    try {
      if (!shotRef.current) {
        await Share.share({ message: buildShareText(workout, prs) });
        return;
      }

      const hasViewShot = !!(NativeModules as any).RNViewShot;
      if (!hasViewShot) {
        // No native view-shot in this binary (Expo Go or older build): text share only
        await Share.share({ message: buildShareText(workout, prs) });
        return;
      }

      // Dynamic imports to avoid loading native modules before needed
      const { captureRef } = await import('react-native-view-shot');
      const Sharing = await import('expo-sharing');

      const uri = await captureRef(shotRef.current as any, { format: 'png', quality: 1.0 } as any);
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        await Share.share({ message: buildShareText(workout, prs) });
        return;
      }
      await Sharing.shareAsync(uri);
    } catch (e) {
      // If capture or sharing fails (Expo Go/no native module), fallback to text share
      try {
        await Share.share({ message: buildShareText(workout, prs) });
      } catch (err) {
        console.error('Share failed', e, err);
        Alert.alert('Share Failed', 'Could not share the report.');
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.modalCard, { opacity, transform: [{ translateY }] }]}>
          <View ref={shotRef} style={styles.content}>
            {loading ? (
              <Text style={styles.loading}>Loading...</Text>
            ) : workout ? (
              <ScrollView contentContainerStyle={styles.contentInner}>
                <WorkoutReportContent workout={workout} prs={prs} />
              </ScrollView>
            ) : (
              <Text style={styles.loading}>No data available.</Text>
            )}
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.share]} onPress={onShare}>
              <Text style={styles.btnText}>SHARE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.close]} onPress={onClose}>
              <Text style={styles.btnText}>CLOSE</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    borderWidth: 2,
    borderColor: theme.colors.neon,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: 520,
  },
  contentInner: {
    paddingBottom: 12,
  },
  header: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 8,
  },
  loading: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  actions: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neon,
    backgroundColor: 'rgba(0,255,0,0.05)'
  },
  btn: {
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 8,
  },
  btnText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  share: {
    borderColor: theme.colors.neon,
    backgroundColor: 'rgba(0,255,0,0.1)'
  },
  close: {
    borderColor: '#666',
    backgroundColor: 'transparent'
  }
});
