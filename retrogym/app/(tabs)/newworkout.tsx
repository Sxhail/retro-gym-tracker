import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useFonts } from 'expo-font';
import { useRouter } from 'expo-router';

export default function NewWorkoutScreen() {
  const [fontsLoaded] = useFonts({
    VT323: require('../../assets/fonts/VT323-Regular.ttf'),
  });
  const [exercise, setExercise] = useState('');
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
      </View>
      <View style={styles.cardBox}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>{'← BACK'}</Text>
          </TouchableOpacity>
          <Text style={styles.sessionActive}>SESSION ACTIVE</Text>
        </View>
        <Text style={styles.workoutTitle}>New Workout</Text>
        <Text style={styles.workoutDate}>2025.07.14</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Exercise name..."
            placeholderTextColor="#3fa77a"
            value={exercise}
            onChangeText={setExercise}
          />
          <TouchableOpacity style={styles.addButton}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.endWorkoutButton}>
          <Text style={styles.endWorkoutText}>END WORKOUT</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2025 GYM.TRACKER.SYS</Text>
        <Text style={styles.footerText2}>LIFTING.PROTOCOL.ACTIVATED</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050d07',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 24,
  },
  header: {
    width: 420,
    marginBottom: 12,
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
  cardBox: {
    borderColor: '#00ff99',
    borderWidth: 1,
    width: 420,
    padding: 28,
    marginTop: 8,
    marginBottom: 24,
    alignSelf: 'center',
    backgroundColor: 'transparent',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  backText: {
    color: '#00ff99',
    fontFamily: 'VT323',
    fontSize: 18,
    letterSpacing: 2,
  },
  sessionActive: {
    color: '#00ff99',
    fontFamily: 'VT323',
    fontSize: 16,
    letterSpacing: 2,
  },
  workoutTitle: {
    color: '#00ff99',
    fontFamily: 'VT323',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
    marginTop: 2,
  },
  workoutDate: {
    color: '#00ff99',
    fontFamily: 'VT323',
    fontSize: 15,
    marginBottom: 18,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },
  input: {
    flex: 1,
    borderColor: '#00ff99',
    borderWidth: 1,
    fontFamily: 'VT323',
    color: '#00ff99',
    fontSize: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
    marginRight: 8,
    letterSpacing: 1.5,
  },
  addButton: {
    width: 54,
    height: 48,
    backgroundColor: 'transparent',
    borderColor: '#00ff99',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#00ff99',
    fontFamily: 'VT323',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: -2,
  },
  endWorkoutButton: {
    backgroundColor: '#2a0d0d',
    borderColor: '#00ff99',
    borderWidth: 1,
    marginTop: 8,
    paddingVertical: 18,
    alignItems: 'center',
  },
  endWorkoutText: {
    color: '#00ff99',
    fontFamily: 'VT323',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  footer: {
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#00ff99',
    fontFamily: 'VT323',
    fontSize: 14,
    marginBottom: 2,
    letterSpacing: 1.5,
  },
  footerText2: {
    color: '#00ff99',
    fontFamily: 'VT323',
    fontSize: 13,
    letterSpacing: 1.5,
  },
}); 