import React from 'react';
import { View, Text } from 'react-native';
import { usePathname } from 'expo-router';
import theme from '../styles/theme';
import { useCardioSession } from '../hooks/useCardioSession';

function formatMs(ms: number) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export default function GlobalCardioPhaseNotification() {
  const { state } = useCardioSession();
  const pathname = usePathname();

  const active = !!state.sessionId && state.phase !== 'idle' && state.phase !== 'completed';
  if (!active) return null;
  if (pathname === '/cardio') return null;

  const label = state.phase.toUpperCase();

  return (
    <View style={{
      position: 'absolute',
      top: 28,
      left: 12,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderWidth: 1,
      borderColor: theme.colors.neon,
      borderRadius: 6,
      zIndex: 2000,
    }}>
      <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 12 }}>
        {label} • {formatMs(state.remainingMs)}
      </Text>
    </View>
  );
}
