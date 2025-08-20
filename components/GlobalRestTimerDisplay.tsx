import React from 'react';
import { View } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWorkoutSession } from '../context/WorkoutSessionContext';
import theme from '../styles/theme';

/**
 * Global Rest Timer Display - Slim Top Bar
 * A minimal horizontal bar that visually decreases with the rest timer.
 * - On home screen (/): Shows as part of the header replacement (handled by index.tsx)
 * - On other screens: Shows as a slim bar above the back arrow/title
 */
export function GlobalRestTimerDisplay() {
  const { globalRestTimer, isWorkoutActive } = useWorkoutSession();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // Hide when no active rest or not in a workout
  if (!globalRestTimer?.isActive || globalRestTimer.timeRemaining <= 0 || !isWorkoutActive) {
    return null;
  }

  // Do not show the global rest bar on the workout screen itself (/new)
  if (pathname === '/new') {
    return null;
  }

  const pct = Math.max(0, Math.min(1, globalRestTimer.timeRemaining / Math.max(1, globalRestTimer.originalDuration)));

  // For home screen, render a special version that replaces the header
  if (pathname === '/') {
    return (
      <View style={{ 
        width: '100%', 
        height: 24, 
        marginHorizontal: 16,
        marginTop: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        borderRadius: 2,
        overflow: 'hidden'
      }}>
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

  // For other screens, show as slim top bar above header
  const top = Math.max(0, insets.top);
  const height = 4;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        left: 0,
        right: 0,
        height,
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
