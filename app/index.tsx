import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';

const workouts = [
  { title: 'Evening Workout', date: '2025.07.11', exercises: 2 },
  { title: 'Push Day', date: '2025.07.09', exercises: 2 },
  { title: 'Full Body', date: '2025.07.06', exercises: 2 },
  { title: 'Strength Day', date: '2025.07.04', exercises: 2 },
];

const GREEN = '#00FF00';
const LIGHT_GREEN = '#39FF14';
const FONT = 'monospace';
const { width } = Dimensions.get('window');
const CARD_MARGIN = 18;
const CARD_WIDTH = width - CARD_MARGIN * 2;

export default function HomeScreen() {
  const router = useRouter();
  return (
    <View style={styles.root}>
      {/* Header Section */}
      <Text style={styles.status}>■ SYSTEM ONLINE</Text>
      <Text style={styles.protocol}>RETRO FITNESS PROTOCOL</Text>
      <View style={styles.divider} />
      {/* App Title Row */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>GYM.TRACKER</Text>
        <Text style={styles.version}>v2.0.25</Text>
      </View>
      {/* Navigation Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.button, styles.buttonLeft]} onPress={() => router.push('/progress')}>
          <Text style={styles.buttonText}>→ PROGRESS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.buttonRight]} onPress={() => router.push('/new')}>
          <Text style={styles.buttonText}>+ NEW WORKOUT</Text>
        </TouchableOpacity>
      </View>
      {/* Workout List */}
      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
        {workouts.map((w, i) => (
          <TouchableOpacity key={i} style={styles.workoutCard} activeOpacity={0.8}>
            <View>
              <Text style={styles.workoutTitle}>{w.title}</Text>
              <Text style={styles.workoutDate}>{w.date}</Text>
              <Text style={styles.workoutExercises}>{w.exercises} exercises</Text>
            </View>
            <Text style={styles.arrow}>{'>'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {/* Footer (empty) */}
      <View style={styles.footer}></View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'black',
    padding: 0,
    justifyContent: 'flex-start',
  },
  status: {
    color: GREEN,
    fontFamily: FONT,
    fontSize: 13,
    marginTop: 18,
    marginLeft: CARD_MARGIN,
    marginBottom: 0,
    letterSpacing: 1,
  },
  protocol: {
    color: GREEN,
    fontFamily: FONT,
    fontSize: 13,
    marginLeft: CARD_MARGIN,
    marginBottom: 8,
    letterSpacing: 1,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: GREEN,
    marginHorizontal: CARD_MARGIN,
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 8,
    marginHorizontal: CARD_MARGIN,
  },
  title: {
    color: GREEN,
    fontFamily: FONT,
    fontWeight: 'bold',
    fontSize: 28,
    letterSpacing: 2,
  },
  version: {
    color: GREEN,
    fontFamily: FONT,
    fontSize: 14,
    opacity: 0.8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    marginTop: 8,
    marginHorizontal: CARD_MARGIN,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GREEN,
    borderRadius: 2,
    paddingVertical: 16,
    justifyContent: 'center',
    backgroundColor: LIGHT_GREEN,
    marginHorizontal: 0,
  },
  buttonLeft: {
    marginRight: 10,
  },
  buttonRight: {
    marginLeft: 10,
  },
  buttonText: {
    color: 'black',
    fontFamily: FONT,
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 1.2,
    textAlign: 'center',
    flex: 1,
  },
  list: {
    marginTop: 0,
    marginHorizontal: CARD_MARGIN,
  },
  workoutCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GREEN,
    borderRadius: 2,
    padding: 18,
    marginTop: 0,
    marginBottom: 18,
    backgroundColor: 'transparent',
    width: '100%',
  },
  workoutTitle: {
    color: GREEN,
    fontFamily: FONT,
    fontWeight: 'bold',
    fontSize: 20,
    marginBottom: 2,
    letterSpacing: 1.2,
  },
  workoutDate: {
    color: GREEN,
    fontFamily: FONT,
    fontSize: 15,
    marginBottom: 2,
    opacity: 0.85,
  },
  workoutExercises: {
    color: GREEN,
    fontFamily: FONT,
    fontSize: 15,
    opacity: 0.85,
  },
  arrow: {
    color: GREEN,
    fontFamily: FONT,
    fontSize: 28,
    alignSelf: 'center',
    marginLeft: 12,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 0,
  },
}); 