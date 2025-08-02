import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import ProgressChart from '../../components/ProgressChart';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import theme from '../../styles/theme';

export default function ProgressAnalysis() {
  const router = useRouter();
  const { exerciseId } = useLocalSearchParams();
  const mockChart = {
    title: 'Bench Press',
    maxGain: '+10kg',
    percentGain: '+20%',
    sessions: 5,
    data: [40, 45, 50, 55, 60],
    labels: ['07.01', '07.05', '07.10', '07.15', '07.20'],
  };
  const [chart, setChart] = useState<any>(mockChart);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.back} onPress={() => router.back()}>{'←'}</Text>
        <Text style={styles.analysis}>PROGRESS.ANALYSIS</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={theme.colors.neon} size="large" style={{ marginTop: 32 }} />
      ) : error ? (
        <Text style={{ color: theme.colors.error, fontFamily: theme.fonts.mono, marginTop: 32 }}>{error}</Text>
      ) : (
        chart && <ProgressChart {...(chart || {})} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 12,
    paddingTop: 8,
  },
  statusBar: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    marginBottom: 2,
  },
  protocol: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    marginBottom: 8,
  },
  divider: {
    borderBottomWidth: theme.borderWidth,
    borderBottomColor: theme.colors.neon,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  back: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 36,
  },
  analysis: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 14,
    fontWeight: 'bold',
  },
  title: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.display,
    fontWeight: 'bold',
    fontSize: 22,
    marginBottom: 2,
    letterSpacing: 1.5,
  },
  subtitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    marginBottom: 18,
    opacity: 0.85,
  },
}); 