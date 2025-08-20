import React from 'react';
import { View } from 'react-native';
import { useWorkoutSession } from '../context/WorkoutSessionContext';
import theme from '../styles/theme';

/**
 * Global Rest Timer Display - Slim Top Bar
 * A minimal horizontal bar fixed at the very top of the app that visually decreases
 * with the rest timer. No text, no interactions.
 */
export function GlobalRestTimerDisplay() {
  const { globalRestTimer, isWorkoutActive } = useWorkoutSession();

  // Hide when no active rest or not in a workout
  if (!globalRestTimer?.isActive || globalRestTimer.timeRemaining <= 0 || !isWorkoutActive) {
    return null;
  }

  const pct = Math.max(0, Math.min(1, globalRestTimer.timeRemaining / Math.max(1, globalRestTimer.originalDuration)));

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 6,
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
