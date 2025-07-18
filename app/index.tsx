import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import WorkoutCard from '../components/WorkoutCard';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import theme from '../styles/theme';

export default function HomeScreen() {
  const router = useRouter();
  const staticWorkouts = [
    { title: 'UPPER WORKOUT', date: '2025.07.11', exercises: 7 },
    { title: 'LOWER WORKOUT', date: '2025.07.09', exercises: 6 },
    { title: 'PULL DAY', date: '2025.07.06', exercises: 6 },
    { title: 'PUSH DAY', date: '2025.07.04', exercises: 7 },
    { title: 'LEGS DAY', date: '2025.07.14', exercises: 5 },
  ];
  const [workouts, setWorkouts] = useState(staticWorkouts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <Text style={styles.statusBar}>■ SYSTEM ONLINE</Text>
      <Text style={styles.protocol}>RETRO FITNESS PROTOCOL</Text>
      <View style={styles.divider} />
      <View style={styles.headerRow}>
        <Text style={styles.title}>GYM.TRACKER</Text>
        <Text style={styles.version}>v2.0.25</Text>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/progress')}><Text style={styles.buttonText}>↗ PROGRESS</Text></TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => router.push('/new')}><Text style={styles.buttonText}>+ NEW WORKOUT</Text></TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator color={theme.colors.neon} size="large" style={{ marginTop: 32 }} />
      ) : error ? (
        <ScrollView style={styles.list}>
          {/* Custom static workout cards as requested */}
          {staticWorkouts.map((w, i) => (
            <WorkoutCard key={i} title={w.title} date={w.date} exerciseCount={w.exercises} />
          ))}
        </ScrollView>
      ) : (
        <ScrollView style={styles.list}>
          {workouts.map((w, i) => (
            <WorkoutCard key={i} title={w.title} date={w.date} exerciseCount={w.exercises} />
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
    fontFamily: theme.fonts.mono,
    fontSize: 12,
    marginBottom: 2,
  },
  protocol: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.mono,
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
  title: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.mono,
    fontWeight: 'bold',
    fontSize: 24,
    letterSpacing: 2,
  },
  version: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.mono,
    fontSize: 14,
    opacity: 0.8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  button: {
    flex: 1,
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.neon,
    borderRadius: theme.borderRadius,
    marginRight: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 16, 0, 0.85)', // Add a shaded background overlay
    shadowColor: theme.colors.neon,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  buttonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.mono,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  list: {
    marginTop: 8,
  },
}); 