import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../../styles/theme';
import { useCardioSession } from '../../context/CardioSessionContext';

export default function CasualWalkScreen() {
  const router = useRouter();
  const { 
    isActive, isPaused, elapsedTime, totalLaps, cardioType,
    startSession, pauseSession, resumeSession, endSession, resetSession 
  } = useCardioSession();

  // Local configuration state
  const [configTotalLaps, setConfigTotalLaps] = useState(1);

  // Calculated values for casual walk
  const [distance, setDistance] = useState(0.00);
  const [pace, setPace] = useState('--:--');
  const [speed, setSpeed] = useState(0.0);
  const [calories, setCalories] = useState(0);
  const [currentLap, setCurrentLap] = useState(1);

  // Initialize session state
  useEffect(() => {
    if (!isActive && !cardioType) {
      // Reset local states when no session
      setDistance(0);
      setPace('--:--');
      setSpeed(0);
      setCalories(0);
      setCurrentLap(1);
    }
  }, [isActive, cardioType]);

  // Update calculated values based on elapsed time
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
      setCalories(Math.floor(elapsedTime * 0.15)); // Lower rate for walking
    }
  }, [isActive, elapsedTime, distance]);

  const handleStart = () => {
    const config = { totalLaps: configTotalLaps };
    startSession('casual_walk', 'CASUAL WALK', config);
  };

  const handlePause = () => {
    pauseSession();
  };

  const handleResume = () => {
    resumeSession();
  };

  const handleReset = () => {
    resetSession();
    setDistance(0);
    setPace('--:--');
    setSpeed(0);
    setCalories(0);
    setCurrentLap(1);
  };

  const handleFinish = () => {
    Alert.alert(
      'Finish Walk?',
      'Are you sure you want to finish this casual walk? Your progress will be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Finish', 
          onPress: async () => {
            try {
              await endSession();
              Alert.alert('Walk Complete!', 'Your casual walk session has been saved.', [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (error) {
              console.error('Error saving workout:', error);
              Alert.alert('Error', 'Failed to save walk. Please try again.');
            }
          }
        }
      ]
    );
  };

  const adjustDistance = (increment: boolean) => {
    if (isActive) {
      setDistance(prev => increment ? prev + 0.1 : Math.max(0, prev - 0.1));
    }
  };

  const adjustTotalLaps = (increment: boolean) => {
    if (!isActive) {
      setConfigTotalLaps(prev => increment ? prev + 1 : Math.max(1, prev - 1));
    }
  };

  const markLap = () => {
    if (isActive) {
      setCurrentLap(prev => prev + 1);
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

  // Use config values or active session values
  const displayTotalLaps = isActive ? totalLaps : configTotalLaps;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CASUAL WALK</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Main Timer */}
      <Text style={styles.mainTimer}>{formatTime(elapsedTime)}</Text>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {/* Distance */}
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>DISTANCE</Text>
          <Text style={styles.statValue}>{distance.toFixed(2)}</Text>
          <Text style={styles.statUnit}>KM</Text>
          {isActive && (
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={styles.adjustButton} 
                onPress={() => adjustDistance(false)}
              >
                <Text style={styles.adjustButtonText}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.adjustButton} 
                onPress={() => adjustDistance(true)}
              >
                <Text style={styles.adjustButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Pace */}
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>PACE</Text>
          <Text style={styles.statValue}>{pace}</Text>
          <Text style={styles.statUnit}>MIN/KM</Text>
        </View>

        {/* Speed */}
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>SPEED</Text>
          <Text style={styles.statValue}>{speed.toFixed(1)}</Text>
          <Text style={styles.statUnit}>KM/H</Text>
        </View>

        {/* Calories */}
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>CALORIES</Text>
          <Text style={styles.statValue}>{calories}</Text>
          <Text style={styles.statUnit}>KCAL</Text>
        </View>
      </View>

      {/* Lap Section */}
      <View style={styles.lapSection}>
        <View style={styles.lapInfo}>
          <Text style={styles.lapText}>LAP {currentLap} OF {displayTotalLaps}</Text>
          {!isActive && (
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={styles.adjustButton} 
                onPress={() => adjustTotalLaps(false)}
              >
                <Text style={styles.adjustButtonText}>-</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.adjustButton} 
                onPress={() => adjustTotalLaps(true)}
              >
                <Text style={styles.adjustButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {isActive && (
          <TouchableOpacity 
            style={styles.lapButton}
            onPress={markLap}
          >
            <Text style={styles.lapButtonText}>MARK LAP</Text>
          </TouchableOpacity>
        )}
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
  mainTimer: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    marginTop: theme.spacing.lg,
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
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
    alignItems: 'center',
  },
  statLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: theme.spacing.xs,
  },
  statValue: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statUnit: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 8,
    letterSpacing: 1,
    opacity: 0.8,
  },
  lapSection: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 12,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
    alignItems: 'center',
  },
  lapInfo: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  lapText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    letterSpacing: 1,
    marginBottom: theme.spacing.sm,
  },
  lapButton: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 0, 0.15)',
  },
  lapButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  adjustButton: {
    width: 28,
    height: 28,
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
    fontSize: 14,
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
