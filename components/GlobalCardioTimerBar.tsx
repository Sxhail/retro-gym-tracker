import React from 'react';
import { View } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../styles/theme';
import { useCardioSession } from '../hooks/useCardioSession';

export default function GlobalCardioTimerBar() {
  const { state } = useCardioSession();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const active = !!state.sessionId && state.phase !== 'idle' && state.phase !== 'completed';
  if (!active) return null;

  // Do not show the global cardio bar on the cardio screen itself
  if (pathname === '/cardio') return null;

  const phaseStart = state.phaseStartedAt ? new Date(state.phaseStartedAt).getTime() : 0;
  const phaseEnd = state.phaseWillEndAt ? new Date(state.phaseWillEndAt).getTime() : 1;
  const now = Date.now();
  const total = Math.max(1, phaseEnd - phaseStart);
  const remaining = Math.max(0, phaseEnd - now);
  const pct = Math.max(0, Math.min(1, remaining / total));

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
