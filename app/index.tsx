import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../styles/theme';

const workouts = [
  { title: 'UPPER', date: '2025.07.11', exercises: 2 },
  { title: 'LOWER', date: '2025.07.10', exercises: 2 },
  { title: 'PUSH DAY', date: '2025.07.09', exercises: 2 },
  { title: 'PULL DAY', date: '2025.07.08', exercises: 2 },
  { title: 'LEGS DAY', date: '2025.07.07', exercises: 2 },
];

const { width } = Dimensions.get('window');
const CARD_MARGIN = theme.spacing.lg;
const CARD_WIDTH = width - CARD_MARGIN * 2;

export default function HomeScreen() {
  const router = useRouter();
  const [titleOpacity] = useState(new Animated.Value(0));
  const [titleScale] = useState(new Animated.Value(0.8));

  // Loading animation for title
  useEffect(() => {
    Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(titleScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.status}>■ SYSTEM ONLINE</Text>
        <Text style={styles.protocol}>RETRO FITNESS PROTOCOL</Text>
        <View style={styles.divider} />
      </View>

      {/* App Title with Animation */}
      <Animated.View style={[styles.titleContainer, { opacity: titleOpacity, transform: [{ scale: titleScale }] }]}>
        <Text style={styles.title}>GYM.TRACKER</Text>
      </Animated.View>

      {/* Navigation Grid */}
      <View style={styles.navigationGrid}>
        <View style={styles.gridRow}>
          <TouchableOpacity 
            style={styles.navCard} 
            activeOpacity={0.7}
            onPress={() => router.push('/progress')}
          >
            <Text style={styles.navIcon}>→</Text>
            <Text style={styles.navText}>PROGRESS</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.navCard} 
            activeOpacity={0.7}
            onPress={() => router.push('/history')}
          >
            <Text style={styles.navIcon}>📊</Text>
            <Text style={styles.navText}>HISTORY</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.gridRow}>
          <TouchableOpacity 
            style={styles.navCard} 
            activeOpacity={0.7}
            onPress={() => router.push('/templates')}
          >
            <Text style={styles.navIcon}>📋</Text>
            <Text style={styles.navText}>TEMPLATES</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.navCard, styles.newWorkoutCard]} 
            activeOpacity={0.7}
            onPress={() => router.push('/new')}
          >
            <Text style={styles.navIcon}>+</Text>
            <Text style={styles.navText}>NEW WORKOUT</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Workout List */}
      <ScrollView 
        style={styles.list} 
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {workouts.map((w, i) => (
          <TouchableOpacity 
            key={i} 
            style={styles.workoutCard} 
            activeOpacity={0.8} 
            onPress={() => router.push('/history')}
          >
            <View style={styles.workoutInfo}>
              <Text style={styles.workoutTitle}>{w.title}</Text>
              <Text style={styles.workoutDate}>{w.date}</Text>
              <Text style={styles.workoutExercises}>{w.exercises} EXERCISES</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 0,
  },
  header: {
    paddingTop: theme.spacing.xl,
    paddingHorizontal: CARD_MARGIN,
  },
  status: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.mono,
    fontSize: 14,
    marginBottom: theme.spacing.xs,
    letterSpacing: 1,
  },
  protocol: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.mono,
    fontSize: 14,
    marginBottom: theme.spacing.md,
    letterSpacing: 1,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neon,
    marginBottom: theme.spacing.xl,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  title: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.mono,
    fontWeight: 'bold',
    fontSize: 36,
    letterSpacing: 3,
  },
  navigationGrid: {
    paddingHorizontal: CARD_MARGIN,
    marginBottom: theme.spacing.xl,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  navCard: {
    flex: 1,
    backgroundColor: theme.colors.neon,
    borderRadius: theme.borderRadius,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
    ...theme.shadows.button,
  },
  newWorkoutCard: {
    flex: 1, // Equal size for all buttons
  },
  navIcon: {
    color: theme.colors.background,
    fontFamily: theme.fonts.mono,
    fontSize: 18,
    marginBottom: theme.spacing.xs,
  },
  navText: {
    color: theme.colors.background,
    fontFamily: theme.fonts.mono,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  list: {
    flex: 1,
    paddingHorizontal: CARD_MARGIN,
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  workoutCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    backgroundColor: 'transparent',
    ...theme.shadows.card,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.mono,
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: theme.spacing.xs,
    letterSpacing: 1,
  },
  workoutDate: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.mono,
    fontSize: 14,
    marginBottom: theme.spacing.xs,
  },
  workoutExercises: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.mono,
    fontSize: 14,
  },
  arrow: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.mono,
    fontSize: 24,
    marginLeft: theme.spacing.md,
  },
}); 