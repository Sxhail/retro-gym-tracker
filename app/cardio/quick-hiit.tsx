import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../../styles/theme';
import { useCardioSession } from '../../context/CardioSessionContext';

export default function QuickHiitScreen() {
  const router = useRouter();
  const { 
    isActive, isPaused, elapsedTime, workTime, restTime, rounds, currentRound, isWorkPhase, phaseTimeLeft, cardioType,
    startSession, pauseSession, resumeSession, endSession, resetSession 
  } = useCardioSession();
  
  // Local state for configuration
  const [configWorkTime, setConfigWorkTime] = useState(20);
  const [configRestTime, setConfigRestTime] = useState(10);
  const [configRounds, setConfigRounds] = useState(8);
  const [showGetReady, setShowGetReady] = useState(true);
  const [getReadyTime, setGetReadyTime] = useState(10);

  // Initialize or restore session
  useEffect(() => {
    if (!isActive && !cardioType) {
      // Session not active, show config screen
      setShowGetReady(true);
      setGetReadyTime(10);
    } else if (cardioType === 'hiit') {
      // Session already active, hide get ready
      setShowGetReady(false);
    }
  }, [isActive, cardioType]);

  // Get ready countdown
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (showGetReady && isActive && getReadyTime > 0) {
      interval = setInterval(() => {
        setGetReadyTime(prev => {
          if (prev <= 1) {
            setShowGetReady(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [showGetReady, isActive, getReadyTime]);

  const handleStart = () => {
    const config = {
      workTime: configWorkTime,
      restTime: configRestTime,
      rounds: configRounds,
    };
    
    startSession('hiit', 'QUICK HIIT', config);
    setShowGetReady(true);
    setGetReadyTime(10);
  };

  const handlePause = () => {
    pauseSession();
  };

  const handleResume = () => {
    resumeSession();
  };

  const handleReset = () => {
    resetSession();
    setShowGetReady(true);
    setGetReadyTime(10);
  };

  const handleFinish = () => {
    Alert.alert(
      'Finish Workout?',
      'Are you sure you want to finish this HIIT workout? Your progress will be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Finish', 
          onPress: async () => {
            try {
              await endSession();
              Alert.alert('Workout Complete!', 'Your HIIT session has been saved.', [
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

  const adjustWorkTime = (increment: boolean) => {
    if (!isActive) {
      setConfigWorkTime(prev => increment ? prev + 5 : Math.max(5, prev - 5));
    }
  };

  const adjustRestTime = (increment: boolean) => {
    if (!isActive) {
      setConfigRestTime(prev => increment ? prev + 5 : Math.max(5, prev - 5));
    }
  };

  const adjustRounds = (increment: boolean) => {
    if (!isActive) {
      setConfigRounds(prev => increment ? prev + 1 : Math.max(1, prev - 1));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseText = () => {
    if (showGetReady) return 'GET READY';
    return isWorkPhase ? 'WORK TIME' : 'REST TIME';
  };

  const getCurrentPhaseTime = () => {
    if (showGetReady) return getReadyTime;
    if (cardioType === 'hiit') {
      return phaseTimeLeft;
    }
    return 0;
  };

  // Use config values or active session values
  const displayWorkTime = isActive ? workTime : configWorkTime;
  const displayRestTime = isActive ? restTime : configRestTime;
  const displayRounds = isActive ? rounds : configRounds;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QUICK HIIT</Text>
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
                width: showGetReady ? '100%' : 
                       isWorkPhase ? `${((displayWorkTime - getCurrentPhaseTime()) / displayWorkTime) * 100}%` :
                       `${((displayRestTime - getCurrentPhaseTime()) / displayRestTime) * 100}%`
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
        {/* Work Time */}
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>WORK TIME</Text>
          <Text style={styles.settingValue}>{displayWorkTime}s</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.adjustButton} 
              onPress={() => adjustWorkTime(false)}
              disabled={isActive}
            >
              <Text style={styles.adjustButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.adjustButton} 
              onPress={() => adjustWorkTime(true)}
              disabled={isActive}
            >
              <Text style={styles.adjustButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Rest Time */}
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>REST TIME</Text>
          <Text style={styles.settingValue}>{displayRestTime}s</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.adjustButton} 
              onPress={() => adjustRestTime(false)}
              disabled={isActive}
            >
              <Text style={styles.adjustButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.adjustButton} 
              onPress={() => adjustRestTime(true)}
              disabled={isActive}
            >
              <Text style={styles.adjustButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Rounds */}
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>ROUNDS</Text>
          <Text style={styles.settingValue}>{displayRounds}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.adjustButton} 
              onPress={() => adjustRounds(false)}
              disabled={isActive}
            >
              <Text style={styles.adjustButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.adjustButton} 
              onPress={() => adjustRounds(true)}
              disabled={isActive}
            >
              <Text style={styles.adjustButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Current Round */}
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>ROUND</Text>
          <Text style={styles.settingValue}>{isActive ? currentRound : 1}</Text>
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
