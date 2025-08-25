import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../../styles/theme';
import { useCardioSession } from '../../hooks/useCardioSession';

function formatMs(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function QuickHiitScreen() {
  const router = useRouter();
  const cardio = useCardioSession();
  const [workSec, setWorkSec] = useState(20);
  const [restSec, setRestSec] = useState(10);
  const [rounds, setRounds] = useState(8);

  const isActiveHiit = cardio.state.mode === 'hiit' && cardio.state.phase !== 'idle' && cardio.state.phase !== 'completed';

  const totalPlannedMs = useMemo(() => {
    // If active, use derived; else compute from controls
    if (cardio.state.mode === 'hiit' && cardio.state.totalPlannedMs > 0) return cardio.state.totalPlannedMs;
    const includeTrailingRest = false;
    let total = 0;
    for (let r = 0; r < rounds; r++) {
      total += workSec * 1000;
      const isLast = r === rounds - 1;
      const includeRest = includeTrailingRest ? true : !isLast;
      if (includeRest) total += restSec * 1000;
    }
    return total;
  }, [cardio.state.mode, cardio.state.totalPlannedMs, workSec, restSec, rounds]);

  const phaseLabel = useMemo(() => {
    if (cardio.state.mode !== 'hiit' || cardio.state.phase === 'idle') return 'SETUP';
    if (cardio.state.phase === 'work') return 'WORK TIME';
    if (cardio.state.phase === 'rest') return 'REST TIME';
    if (cardio.state.phase === 'completed') return 'COMPLETED';
    return cardio.state.phase.toUpperCase();
  }, [cardio.state.mode, cardio.state.phase]);

  const currentPhasePct = useMemo(() => {
    const start = cardio.state.phaseStartedAt ? new Date(cardio.state.phaseStartedAt).getTime() : 0;
    const end = cardio.state.phaseWillEndAt ? new Date(cardio.state.phaseWillEndAt).getTime() : 0;
    if (!start || !end || end <= start) return 0;
    const total = end - start;
    const remaining = clamp(cardio.state.remainingMs, 0, total);
    return Math.max(0, Math.min(1, 1 - remaining / total));
  }, [cardio.state.phaseStartedAt, cardio.state.phaseWillEndAt, cardio.state.remainingMs]);

  const onPrimary = async () => {
    // Start → Reset behavior
    if (isActiveHiit) {
      // Reset timers: clear session and return to setup (button becomes START again)
      await cardio.reset();
      return;
    }
    // No active session: start fresh
    await cardio.startHiit({ workSec, restSec, rounds, includeTrailingRest: false });
  };

  const onSecondary = async () => {
    // Cancel: remove any active cardio and stop notifications, then go home
    await cardio.cancel();
    router.push('/');
  };

  const finish = async () => {
    if (!cardio.hasActiveSession) return;
    const isCompleted = cardio.state.phase === 'completed';
    const doFinish = async () => {
      await cardio.finish();
      Alert.alert(
        'Cardio Saved!',
        'Your cardio session has been saved successfully.',
        [
          { text: 'View History', onPress: () => router.push('/history') },
          { text: 'Start New Cardio', onPress: () => router.push('/cardio') },
        ]
      );
    };
    if (!isCompleted) {
      Alert.alert('Finish early?', 'Are you sure you want to finish before completing all rounds?', [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', style: 'destructive', onPress: doFinish }
      ]);
    } else {
      await doFinish();
    }
  };

  const totalLabel = cardio.state.mode === 'hiit'
    ? formatMs(cardio.state.totalElapsedMs)
    : '00:00';

  const timerLabel = cardio.state.mode === 'hiit'
    ? formatMs(cardio.state.remainingMs)
    : '00:00';

  const adjustDisabled = isActiveHiit; // Disable adjustments while active

  const adj = (setter: (n: number) => void, val: number, delta: number, min: number, max: number) => {
    if (adjustDisabled) return;
    const next = Math.max(min, Math.min(max, val + delta));
    setter(next);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QUICK HIIT</Text>
        <View style={styles.placeholder} />
      </View>

      <Text style={styles.phaseTitle}>{phaseLabel}</Text>

      <View style={styles.progressBarOuter}>
        <View style={[styles.progressFill, { width: `${currentPhasePct * 100}%` }]} />
      </View>

      <Text style={styles.mainTimer}>{timerLabel}</Text>
      <Text style={styles.totalText}>TOTAL: {totalLabel}</Text>

      <View style={styles.settingsGrid}>
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>WORK TIME</Text>
          <Text style={styles.settingValue}>{workSec}s</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.adjustButton} disabled={adjustDisabled} onPress={() => adj(setWorkSec, workSec, -5, 5, 600)}>
              <Text style={styles.adjustButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.adjustButton} disabled={adjustDisabled} onPress={() => adj(setWorkSec, workSec, +5, 5, 600)}>
              <Text style={styles.adjustButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>REST TIME</Text>
          <Text style={styles.settingValue}>{restSec}s</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.adjustButton} disabled={adjustDisabled} onPress={() => adj(setRestSec, restSec, -5, 5, 600)}>
              <Text style={styles.adjustButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.adjustButton} disabled={adjustDisabled} onPress={() => adj(setRestSec, restSec, +5, 5, 600)}>
              <Text style={styles.adjustButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>ROUNDS</Text>
          <Text style={styles.settingValue}>{rounds}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.adjustButton} disabled={adjustDisabled} onPress={() => adj(setRounds, rounds, -1, 1, 100)}>
              <Text style={styles.adjustButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.adjustButton} disabled={adjustDisabled} onPress={() => adj(setRounds, rounds, +1, 1, 100)}>
              <Text style={styles.adjustButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>ROUND</Text>
          <Text style={styles.settingValue}>{cardio.state.currentRound ?? 1}</Text>
        </View>
      </View>

      <View style={styles.controlsRow}>
    <TouchableOpacity style={styles.controlButton} onPress={onPrimary}>
          <Text style={styles.controlButtonText}>
      {isActiveHiit ? 'RESET' : 'START'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlButton} onPress={onSecondary}>
          <Text style={styles.controlButtonText}>
      CANCEL
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlButton, styles.finishButton]} onPress={finish}>
          <Text style={styles.controlButtonText}>FINISH</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: theme.colors.neon,
    fontSize: 24,
    fontFamily: theme.fonts.code,
  },
  headerTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  placeholder: {
    width: 40,
  },
  phaseTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  progressBarOuter: {
    height: 6,
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.neon,
  },
  mainTimer: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 72,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  totalText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  settingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  settingCard: {
    width: '48%',
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 12,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
    alignItems: 'center',
  },
  settingLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: theme.spacing.xs,
  },
  settingValue: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: theme.spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  adjustButton: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
  },
  adjustButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
    marginBottom: theme.spacing.xl,
  },
  controlButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
    alignItems: 'center',
  },
  finishButton: {
    backgroundColor: 'rgba(255,0,0,0.08)',
    borderColor: '#FF0000',
  },
  controlButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
