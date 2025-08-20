import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../../styles/theme';
import { useCardioSession } from '../../context/CardioSessionContext';

export default function DistanceRunScreen() {
  const router = useRouter();
  const { 
  isActive, isPaused, elapsedTime, runTime, walkTime, laps, currentLap, isRunPhase, phaseTimeLeft, cardioType,
  isGetReady, getReadyTimeLeft,
  startSession, pauseSession, resumeSession, endSession, resetSession 
  } = useCardioSession();

  // Local configuration state (when not active)
  const [configRunTime, setConfigRunTime] = useState(30);
  const [configWalkTime, setConfigWalkTime] = useState(30);
  const [configLaps, setConfigLaps] = useState(4);

  // No local Get Ready state; rely on CardioSessionContext's isGetReady/getReadyTimeLeft

  const handleStart = () => {
    const config = { runTime: configRunTime, walkTime: configWalkTime, laps: configLaps };
    startSession('walk_run', 'WALK-RUN', config);
  };

  const handlePause = () => {
    pauseSession();
  };

  const handleResume = () => {
    resumeSession();
  };

  const handleReset = () => {
    resetSession();
  };

  const handleFinish = () => {
    Alert.alert(
      'Finish Workout?',
      'Are you sure you want to finish this Walk-Run workout? Your progress will be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Finish', 
          onPress: async () => {
            try {
              await endSession();
              Alert.alert('Workout Complete!', 'Your Walk-Run session has been saved.', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (error) {
              console.error('Error saving workout:', error);
              const errorMessage = error instanceof Error ? error.message : 'Failed to save workout. Please try again.';
              
              // Handle specific error cases like lift workouts
              if (errorMessage.includes('Please enter a session name')) {
                Alert.alert('Invalid Session Name', errorMessage);
              } else if (errorMessage.includes('Please shorten')) {
                Alert.alert('Input Too Long', errorMessage);
              } else if (errorMessage.includes('Please check your')) {
                Alert.alert('Invalid Values', errorMessage);
              } else if (errorMessage.includes('Database is busy')) {
                Alert.alert('Database Busy', errorMessage);
              } else if (errorMessage.includes('Database error')) {
                Alert.alert('Database Error', 'Please restart the app and try again.');
              } else {
                Alert.alert('Save Failed', errorMessage);
              }
            }
          }
        }
      ]
    );
  };

  const adjustRunTime = (increment: boolean) => {
    if (!isActive) {
      setConfigRunTime(prev => increment ? prev + 5 : Math.max(5, prev - 5));
    }
  };

  const adjustWalkTime = (increment: boolean) => {
    if (!isActive) {
      setConfigWalkTime(prev => increment ? prev + 5 : Math.max(5, prev - 5));
    }
  };

  const adjustLaps = (increment: boolean) => {
    if (!isActive) {
      setConfigLaps(prev => increment ? prev + 1 : Math.max(1, prev - 1));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseText = () => {
  if (isGetReady) return 'GET READY';
    return isRunPhase ? 'RUN PHASE' : 'WALK PHASE';
  };

  const getCurrentPhaseTime = () => {
  if (isGetReady) return getReadyTimeLeft;
    if (cardioType === 'walk_run') {
      return phaseTimeLeft;
    }
    return 0;
  };

  // Use config values or active session values
  const displayRunTime = isActive ? runTime : configRunTime;
  const displayWalkTime = isActive ? walkTime : configWalkTime;
  const displayLaps = isActive ? laps : configLaps;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>WALK - RUN</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Phase Title */}
      <Text style={styles.phaseTitle}>{getPhaseText()}</Text>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { 
                width: isGetReady ? '100%' : 
                       isRunPhase ? `${((displayRunTime - getCurrentPhaseTime()) / displayRunTime) * 100}%` :
                       `${((displayWalkTime - getCurrentPhaseTime()) / displayWalkTime) * 100}%`
              }
            ]} 
          />
        </View>
      </View>

      {/* Main Timer */}
      <Text style={styles.mainTimer}>{formatTime(getCurrentPhaseTime())}</Text>

      {/* Elapsed Time Display */}
      {isActive && (
        <Text style={[styles.settingLabel, { textAlign: 'center', marginBottom: theme.spacing.md, fontSize: 14 }]}>
          TOTAL: {formatTime(elapsedTime)}
        </Text>
      )}

      {/* Settings Grid */}
      <View style={styles.settingsGrid}>
        {/* Run Time */}
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>RUN TIME</Text>
          <Text style={styles.settingValue}>{displayRunTime}s</Text>
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
          <Text style={styles.settingLabel}>WALK TIME</Text>
          <Text style={styles.settingValue}>{displayWalkTime}s</Text>
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

        {/* Laps */}
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>LAPS</Text>
          <Text style={styles.settingValue}>{displayLaps}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.adjustButton} 
              onPress={() => adjustLaps(false)}
              disabled={isActive}
            >
              <Text style={styles.adjustButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.adjustButton} 
              onPress={() => adjustLaps(true)}
              disabled={isActive}
            >
              <Text style={styles.adjustButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Current Lap */}
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>LAP</Text>
          <Text style={styles.settingValue}>{isActive ? currentLap : 1}</Text>
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
          style={[styles.controlButton, styles.stopButton]} 
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
  phaseTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  progressContainer: {
    marginBottom: theme.spacing.lg,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.neon,
    borderRadius: 3,
  },
  mainTimer: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  settingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  settingCard: {
    width: '48%',
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 12,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
    alignItems: 'center',
  },
  settingLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: theme.spacing.xs,
  },
  settingValue: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: theme.spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  adjustButton: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
  },
  adjustButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
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
  stopButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.15)',
    borderColor: '#FF0000',
  },
  controlButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
