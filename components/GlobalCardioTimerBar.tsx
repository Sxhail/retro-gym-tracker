import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../styles/theme';
import { useCardioSession } from '../context/CardioSessionContext';

/**
 * Global Cardio Timer Display - Slim Top Bar
 * Mirrors LIFT line bar but for cardio countdown phases (HIIT, Walk-Run) and Get Ready.
 */
export default function GlobalCardioTimerBar() {
  const insets = useSafeAreaInsets();
  const {
    isActive,
    cardioType,
    isGetReady,
    getReadyTimeLeft,
    phaseTimeLeft,
    workTime,
    restTime,
    isWorkPhase,
    runTime,
    walkTime,
    isRunPhase,
  } = useCardioSession();

  if (!isActive || !cardioType) return null;

  // Determine current and total for bar
  let total = 0;
  let remaining = 0;
  if (isGetReady) {
    total = 10;
    remaining = getReadyTimeLeft;
  } else if (cardioType === 'hiit') {
    total = isWorkPhase ? Math.max(1, workTime) : Math.max(1, restTime);
    remaining = phaseTimeLeft;
  } else if (cardioType === 'walk_run') {
    total = isRunPhase ? Math.max(1, runTime) : Math.max(1, walkTime);
    remaining = phaseTimeLeft;
  } else {
    // casual_walk and others have no phase countdown
    return null;
  }

  if (!total || remaining <= 0) return null;

  const pct = Math.max(0, Math.min(1, remaining / total));
  const top = Math.max(0, insets.top);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        zIndex: 2000,
      }}
    >
      <View
        style={{
          height: '100%',
          width: `${pct * 100}%`,
          backgroundColor: theme.colors.neon,
        }}
      />
    </View>
  );
}
