import React, { useEffect, useMemo, useState } from 'react';
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

export default function WalkRunScreen() {
  const router = useRouter();
  const cardio = useCardioSession();
  const [runSec, setRunSec] = useState(30);
  const [walkSec, setWalkSec] = useState(30);
  const [laps, setLaps] = useState(4);

  const isActive = cardio.state.mode === 'walk_run' && cardio.state.phase !== 'idle' && cardio.state.phase !== 'completed';

  const totalPlannedMs = useMemo(() => {
    if (cardio.state.mode === 'walk_run' && cardio.state.totalPlannedMs > 0) return cardio.state.totalPlannedMs;
    const includeTrailingWalk = false;
    let total = 0;
    for (let l = 0; l < laps; l++) {
      total += runSec * 1000;
      const isLast = l === laps - 1;
      const include = includeTrailingWalk ? true : !isLast;
      if (include) total += walkSec * 1000;
    }
    return total;
  }, [cardio.state.mode, cardio.state.totalPlannedMs, runSec, walkSec, laps]);

  // Sync controls from active session params when applicable
  useEffect(() => {
    if (cardio.state.mode !== 'walk_run') return;
    const p = cardio.state.params as any;
    if (!p) return;
    if (typeof p.runSec === 'number' && p.runSec !== runSec) setRunSec(p.runSec);
    if (typeof p.walkSec === 'number' && p.walkSec !== walkSec) setWalkSec(p.walkSec);
    if (typeof p.laps === 'number' && p.laps !== laps) setLaps(p.laps);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardio.state.mode, cardio.state.params]);

  const phaseLabel = useMemo(() => {
    if (cardio.state.mode !== 'walk_run' || cardio.state.phase === 'idle') return 'RUN PHASE';
    if (cardio.state.phase === 'run') return 'RUN PHASE';
    if (cardio.state.phase === 'walk') return 'WALK PHASE';
    if (cardio.state.phase === 'completed') return 'COMPLETED';
    return cardio.state.phase.toUpperCase();
  }, [cardio.state.mode, cardio.state.phase]);

  const currentPhasePct = useMemo(() => {
    const start = cardio.state.phaseStartedAt ? new Date(cardio.state.phaseStartedAt).getTime() : 0;
    const end = cardio.state.phaseWillEndAt ? new Date(cardio.state.phaseWillEndAt).getTime() : 0;
    if (!start || !end || end <= start) return 0;
    const total = end - start;
    const remaining = Math.max(0, Math.min(total, cardio.state.remainingMs));
    return Math.max(0, Math.min(1, 1 - remaining / total));
  }, [cardio.state.phaseStartedAt, cardio.state.phaseWillEndAt, cardio.state.remainingMs]);

  const onPrimary = async () => {
    // Start → Reset behavior
    if (isActive) {
      await cardio.reset();
      return;
    }
    await cardio.startWalkRun({ runSec, walkSec, laps, includeTrailingWalk: false });
  };

  const onSecondary = async () => {
    // Confirm cancel before ending the session
    Alert.alert(
      'Cancel cardio?',
      'Are you sure you want to cancel the current session?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => { 
            try {
              // Wait for cancel to complete before navigating
              await cardio.cancel(); 
              
              // Double-check that session is cleared
              if (cardio.state.sessionId) {
                console.warn('Session still exists after cancel, forcing cleanup...');
                await cardio.reset(); // fallback cleanup
              }
              
              router.push('/');
            } catch (error) {
              console.error('Error cancelling cardio session:', error);
              // Still navigate even if cancel fails to avoid stuck state
              router.push('/');
            }
          }
        }
      ]
    );
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
      Alert.alert('Finish early?', 'Are you sure you want to finish before completing all laps?', [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', style: 'destructive', onPress: doFinish }
      ]);
    } else {
      await doFinish();
    }
  };

  const totalLabel = cardio.state.mode === 'walk_run'
    ? formatMs(cardio.state.totalElapsedMs)
    : '00:00';

  const timerLabel = cardio.state.mode === 'walk_run'
    ? formatMs(cardio.state.remainingMs)
    : '00:00';

  const adjustDisabled = isActive; // Disable adjustments while active
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
        <Text style={styles.headerTitle}>WALK - RUN</Text>
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
          <Text style={styles.settingLabel}>RUN TIME</Text>
          <Text style={styles.settingValue}>{runSec}s</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.adjustButton} disabled={adjustDisabled} onPress={() => adj(setRunSec, runSec, -5, 5, 600)}>
              <Text style={styles.adjustButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.adjustButton} disabled={adjustDisabled} onPress={() => adj(setRunSec, runSec, +5, 5, 600)}>
              <Text style={styles.adjustButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>WALK TIME</Text>
          <Text style={styles.settingValue}>{walkSec}s</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.adjustButton} disabled={adjustDisabled} onPress={() => adj(setWalkSec, walkSec, -5, 5, 600)}>
              <Text style={styles.adjustButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.adjustButton} disabled={adjustDisabled} onPress={() => adj(setWalkSec, walkSec, +5, 5, 600)}>
              <Text style={styles.adjustButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>LAPS</Text>
          <Text style={styles.settingValue}>{laps}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.adjustButton} disabled={adjustDisabled} onPress={() => adj(setLaps, laps, -1, 1, 100)}>
              <Text style={styles.adjustButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.adjustButton} disabled={adjustDisabled} onPress={() => adj(setLaps, laps, +1, 1, 100)}>
              <Text style={styles.adjustButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>LAP</Text>
          <Text style={styles.settingValue}>{cardio.state.currentLap ?? 1}</Text>
        </View>
      </View>

      <View style={styles.controlsRow}>
    <TouchableOpacity style={styles.controlButton} onPress={onPrimary}>
          <Text style={styles.controlButtonText}>
      {isActive ? 'RESET' : 'START'}
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
  placeholder: { width: 40 },
  phaseTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.display,
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
  progressFill: { height: '100%', backgroundColor: theme.colors.neon },
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
  buttonRow: { flexDirection: 'row', gap: theme.spacing.sm },
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
  adjustButtonText: { color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16, fontWeight: 'bold' },
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
  finishButton: { backgroundColor: 'rgba(255,0,0,0.08)', borderColor: '#FF0000' },
  controlButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
