import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../../styles/theme';
import { useCardioSession } from '../../context/CardioSessionContext';

export default function TimeRunScreen() {
  const router = useRouter();
  const { 
    isActive, isPaused, elapsedTime, cardioType,
    startSession, pauseSession, resumeSession, endSession, resetSession 
  } = useCardioSession();
  
  const [distance, setDistance] = useState(0.00);
  const [pace, setPace] = useState('--:--');
  const [speed, setSpeed] = useState(0.0);
  const [calories, setCalories] = useState(0);
  const [runTime, setRunTime] = useState(30);
  const [walkTime, setWalkTime] = useState(30);

  useEffect(() => {
    if (isActive && elapsedTime > 0) {
      // Calculate pace and speed based on distance and time
      if (distance > 0) {
        const paceInSeconds = elapsedTime / distance;
        const mins = Math.floor(paceInSeconds / 60);
        const secs = Math.floor(paceInSeconds % 60);
        setPace(`${mins}:${secs.toString().padStart(2, '0')}`);
        setSpeed(Number((distance / (elapsedTime / 3600)).toFixed(1)));
      }
      // Rough calorie calculation (placeholder)
      setCalories(Math.floor(elapsedTime * 0.2));
    }
  }, [isActive, elapsedTime, distance]);

  const handleStart = () => {
    const config = { runTime, walkTime };
    startSession('walk_run', 'TIME RUN', config);
  };

  const handlePause = () => {
    pauseSession();
  };

  const handleResume = () => {
    resumeSession();
  };

  const handleFinish = () => {
    Alert.alert(
      'Finish Run?',
      'Are you sure you want to finish this time run? Your progress will be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Finish', 
          onPress: async () => {
            try {
              await endSession();
              Alert.alert('Run Complete!', 'Your time run session has been saved.', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to save run. Please try again.';
              Alert.alert('Save Failed', errorMessage);
            }
          }
        }
      ]
    );
  };

  const handleReset = () => {
    resetSession();
    setDistance(0.00);
    setPace('--:--');
    setSpeed(0.0);
    setCalories(0);
  };

  const adjustRunTime = (increment: boolean) => {
    if (!isActive) {
      setRunTime(prev => increment ? prev + 5 : Math.max(5, prev - 5));
    }
  };

  const adjustWalkTime = (increment: boolean) => {
    if (!isActive) {
      setWalkTime(prev => increment ? prev + 5 : Math.max(5, prev - 5));
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TIME RUN</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Main Timer */}
      <Text style={styles.mainTimer}>{formatTime(elapsedTime)}</Text>

      {/* RUN/WALK Settings */}
      <View style={styles.settingsGrid}>
        {/* Run Time */}
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>RUN</Text>
          <Text style={styles.settingValue}>{runTime}s</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.adjustButton} 
              onPress={() => adjustRunTime(false)}
              disabled={isActive}
            >
              <Text style={styles.adjustButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.adjustButton} 
              onPress={() => adjustRunTime(true)}
              disabled={isActive}
            >
              <Text style={styles.adjustButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Walk Time */}
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>WALK</Text>
          <Text style={styles.settingValue}>{walkTime}s</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.adjustButton} 
              onPress={() => adjustWalkTime(false)}
              disabled={isActive}
            >
              <Text style={styles.adjustButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.adjustButton} 
              onPress={() => adjustWalkTime(true)}
              disabled={isActive}
            >
              <Text style={styles.adjustButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {/* Distance */}
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>DISTANCE</Text>
          <Text style={styles.statValue}>{distance.toFixed(2)} KM</Text>
        </View>

        {/* Pace */}
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>PACE</Text>
          <Text style={styles.statValue}>{pace}</Text>
        </View>

        {/* Speed */}
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>SPEED</Text>
          <Text style={styles.statValue}>{speed.toFixed(1)} KM/H</Text>
        </View>

        {/* Calories */}
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>CALORIES</Text>
          <Text style={styles.statValue}>{calories}</Text>
        </View>
      </View>

      {/* Control Buttons */}
      <View style={styles.controlButtons}>
        {!isActive ? (
          <TouchableOpacity 
            style={[styles.controlButton, styles.startButton]} 
            onPress={handleStart}
          >
            <Text style={styles.controlButtonText}>START</Text>
          </TouchableOpacity>
        ) : isPaused ? (
          <TouchableOpacity 
            style={[styles.controlButton, styles.startButton]} 
            onPress={handleResume}
          >
            <Text style={styles.controlButtonText}>RESUME</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.controlButton]} 
            onPress={handlePause}
          >
            <Text style={styles.controlButtonText}>PAUSE</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={[styles.controlButton]} 
          onPress={handleReset}
        >
          <Text style={styles.controlButtonText}>RESET</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.controlButton, styles.finishButton]} 
          onPress={handleFinish}
          disabled={!isActive}
        >
          <Text style={styles.controlButtonText}>FINISH</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: theme.colors.neon,
    fontSize: 24,
    fontFamily: theme.fonts.code,
  },
  headerTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  placeholder: {
    width: 40,
  },
  mainTimer: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  statCard: {
    width: '48%',
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 12,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
    alignItems: 'center',
  },
  statLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: theme.spacing.xs,
  },
  statValue: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
    marginBottom: theme.spacing.xl,
  },
  controlButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: 'rgba(0, 255, 0, 0.15)',
  },
  finishButton: {
    backgroundColor: 'rgba(0, 255, 0, 0.15)',
  },
  controlButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  settingsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  settingCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 8,
    padding: theme.spacing.md,
    marginHorizontal: 8,
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
    alignItems: 'center',
  },
  settingLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
  },
  settingValue: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  adjustButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
  },
  adjustButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
  },
});
