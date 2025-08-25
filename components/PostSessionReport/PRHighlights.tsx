import React from 'react';
import { View, Text } from 'react-native';
import theme from '../../styles/theme';
import type { PRItem } from '../../services/workoutReport';

export default function PRHighlights({ prs }: { prs: PRItem[] }) {
  const hasPRs = prs && prs.length > 0;
  return (
    <View style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 12, padding: 12, backgroundColor: 'transparent' }}>
      <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 14, marginBottom: 8 }}>PR HIGHLIGHTS</Text>
      {hasPRs ? (
        prs.map((pr, idx) => (
          <Text key={idx} style={{ color: theme.colors.neon, fontFamily: theme.fonts.heading, fontSize: 16, marginBottom: 6 }}>
            🏆 New {pr.exerciseName} PR: {pr.weight} kg × {pr.reps}{pr.type === 'repsAtWeight' ? ' (reps@weight)' : ''}
          </Text>
        ))
      ) : (
        <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.body, fontSize: 13, opacity: 0.8 }}>
          No PRs today—consistency is king. Keep pushing.
        </Text>
      )}
    </View>
  );
}
