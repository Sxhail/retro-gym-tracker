import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import ProgressChart from '../components/ProgressChart';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import theme from '../styles/theme';

export default function ProgressOverview() {
  const router = useRouter();
  const mockCharts = [
    { title: 'Bench Press', maxGain: '+10kg', percentGain: '+20%', sessions: 5, data: [40, 45, 50, 55, 60], labels: ['07.01', '07.05', '07.10', '07.15', '07.20'] },
    { title: 'Squat', maxGain: '+15kg', percentGain: '+25%', sessions: 6, data: [60, 65, 70, 75, 80, 85], labels: ['07.01', '07.06', '07.11', '07.16', '07.21', '07.26'] },
  ];
  const [charts, setCharts] = useState(mockCharts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Remove useEffect and DB fetching logic.

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.back} onPress={() => router.back()}>{'← BACK'}</Text>
        <Text style={styles.analysis}>PROGRESS.ANALYSIS</Text>
      </View>
      <Text style={styles.title}>LIFTING PROGRESS</Text>
      <Text style={styles.subtitle}>Weight progression over time</Text>
      {loading ? (
        <ActivityIndicator color={theme.colors.neon} size="large" style={{ marginTop: 32 }} />
      ) : error ? (
        <Text style={{ color: theme.colors.error, fontFamily: theme.fonts.mono, marginTop: 32 }}>{error}</Text>
      ) : (
        <ScrollView style={styles.list}>
          {charts.map((c, i) => (
            <ProgressChart key={i} title={c.title} maxGain={c.maxGain} percentGain={c.percentGain} sessions={c.sessions} data={c.data} labels={c.labels} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 18,
    paddingTop: 36,
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
    marginBottom: 12,
  },
  back: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 14,
  },
  analysis: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 11,
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
  list: {
    marginTop: 8,
  },
}); 