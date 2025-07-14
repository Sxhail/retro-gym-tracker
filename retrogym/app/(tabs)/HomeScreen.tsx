import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';

const workouts = [
  { title: 'UPPER WORKOUT', date: '2025.07.11', exercises: 7 },
  { title: 'LOWER WORKOUT', date: '2025.07.09', exercises: 6 },
  { title: 'PULL DAY', date: '2025.07.06', exercises: 6 },
  { title: 'PUSH DAY', date: '2025.07.04', exercises: 7 },
  { title: 'LEGS DAY', date: '2025.07.14', exercises: 5 },
];

export default function HomeScreen() {
  const [fontsLoaded] = useFonts({
    VT323: require('../../assets/fonts/VT323-Regular.ttf'),
  });
  const router = useRouter();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>SYSTEM ONLINE</Text>
        </View>
        <Text style={styles.protocolText}>RETRO FITNESS PROTOCOL</Text>
        <View style={styles.divider} />
        <View style={styles.titleRow}>
          <Text style={styles.title}>GYM.TRACKER</Text>
          <Text style={styles.version}></Text>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.buttonLeft}>
            <Text style={styles.buttonText}>↗ PROGRESS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buttonRight} onPress={() => router.push('/(tabs)/newworkout')}>
            <Text style={styles.buttonText}>+ NEW WORKOUT</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView style={styles.list}>
        {workouts.map((workout, idx) => (
          <TouchableOpacity key={idx} style={styles.card}>
            <View>
              <Text style={styles.cardTitle}>{workout.title}</Text>
              <Text style={styles.cardDate}>{workout.date}</Text>
              <Text style={styles.cardExercises}>{workout.exercises} exercises</Text>
            </View>
            <Text style={styles.cardArrow}>{'>'}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050d07',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  header: {
    width: '100%',
    maxWidth: 400,
    marginTop: 24,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00ff99',
    marginRight: 8,
  },
  statusText: {
    color: '#00ff99',
    fontSize: 12,
    fontFamily: 'VT323',
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  protocolText: {
    color: '#00ff99',
    fontSize: 12,
    fontFamily: 'VT323',
    marginBottom: 8,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  divider: {
    borderBottomColor: '#00ff99',
    borderBottomWidth: 1,
    opacity: 0.2,
    marginVertical: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#00ff99',
    fontSize: 26,
    fontFamily: 'VT323',
    fontWeight: 'bold',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  version: {
    color: '#00ff99',
    fontSize: 12,
    fontFamily: 'VT323',
    opacity: 0.7,
    letterSpacing: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  buttonLeft: {
    flex: 1,
    backgroundColor: 'rgba(0,255,153,0.05)',
    borderColor: '#00ff99',
    borderWidth: 1,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 2,
  },
  buttonRight: {
    flex: 1,
    backgroundColor: 'rgba(0,255,153,0.05)',
    borderColor: '#00ff99',
    borderWidth: 1,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 2,
  },
  buttonText: {
    color: '#00ff99',
    fontFamily: 'VT323',
    fontSize: 16,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  list: {
    width: '100%',
    maxWidth: 400,
  },
  card: {
    backgroundColor: 'rgba(0,255,153,0.03)',
    borderColor: '#00ff99',
    borderWidth: 1,
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: '#00ff99',
    fontFamily: 'VT323',
    fontSize: 18,
    marginBottom: 2,
    letterSpacing: 2,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  cardDate: {
    color: '#00ff99',
    fontFamily: 'VT323',
    fontSize: 13,
    opacity: 0.8,
    marginBottom: 2,
    letterSpacing: 1.5,
  },
  cardExercises: {
    color: '#00ff99',
    fontFamily: 'VT323',
    fontSize: 13,
    opacity: 0.8,
    letterSpacing: 1.5,
  },
  cardArrow: {
    color: '#00ff99',
    fontSize: 28,
    fontFamily: 'VT323',
    opacity: 0.7,
  },
}); 