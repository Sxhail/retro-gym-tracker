import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../../styles/theme';

export default function DistanceRunScreen() {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(10); // 10 second get ready
  const [isGetReady, setIsGetReady] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [runTime, setRunTime] = useState(30);
  const [walkTime, setWalkTime] = useState(30);
  const [runLaps, setRunLaps] = useState(4);
  const [currentRound, setCurrentRound] = useState(1);
  const [isRunPhase, setIsRunPhase] = useState(true);

  useEffect(() => {
    let interval: any;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      if (isGetReady) {
        setIsGetReady(false);
        setTimeLeft(runTime);
        setIsRunPhase(true);
      } else if (isRunPhase) {
        if (currentRound < runLaps) {
          setTimeLeft(walkTime);
          setIsRunPhase(false);
        } else {
          // Workout complete
          setIsRunning(false);
        }
      } else {
        setTimeLeft(runTime);
        setIsRunPhase(true);
        setCurrentRound(prev => prev + 1);
      }
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, isGetReady, isRunPhase, currentRound, runLaps, runTime, walkTime]);

  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsRunning(false);
    setIsPaused(true);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsPaused(false);
    setIsGetReady(true);
    setTimeLeft(10);
    setCurrentRound(1);
    setIsRunPhase(true);
  };

  const handleFinish = () => {
    router.back();
  };

  const adjustRunTime = (increment: boolean) => {
    if (!isRunning) {
      setRunTime(prev => increment ? prev + 5 : Math.max(5, prev - 5));
    }
  };

  const adjustWalkTime = (increment: boolean) => {
    if (!isRunning) {
      setWalkTime(prev => increment ? prev + 5 : Math.max(5, prev - 5));
    }
  };

  const adjustRunLaps = (increment: boolean) => {
    if (!isRunning) {
      setRunLaps(prev => increment ? prev + 1 : Math.max(1, prev - 1));
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
                       isRunPhase ? `${((runTime - timeLeft) / runTime) * 100}%` :
                       `${((walkTime - timeLeft) / walkTime) * 100}%`
              }
            ]} 
          />
        </View>
      </View>

      {/* Main Timer */}
      <Text style={styles.mainTimer}>{formatTime(timeLeft)}</Text>

      {/* Settings Grid */}
      <View style={styles.settingsGrid}>
        {/* Run Time */}
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>RUN</Text>
          <Text style={styles.settingValue}>{runTime}s</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.adjustButton} 
              onPress={() => adjustRunTime(false)}
              disabled={isRunning}
            >
              <Text style={styles.adjustButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.adjustButton} 
              onPress={() => adjustRunTime(true)}
              disabled={isRunning}
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
              disabled={isRunning}
            >
              <Text style={styles.adjustButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.adjustButton} 
              onPress={() => adjustWalkTime(true)}
              disabled={isRunning}
            >
              <Text style={styles.adjustButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Run Laps */}
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>LAPS</Text>
          <Text style={styles.settingValue}>{runLaps}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.adjustButton} 
              onPress={() => adjustRunLaps(false)}
              disabled={isRunning}
            >
              <Text style={styles.adjustButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.adjustButton} 
              onPress={() => adjustRunLaps(true)}
              disabled={isRunning}
            >
              <Text style={styles.adjustButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Current Round */}
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>LAP</Text>
          <Text style={styles.settingValue}>{currentRound}</Text>
        </View>
      </View>

      {/* Control Buttons */}
      <View style={styles.controlButtons}>
        <TouchableOpacity 
          style={[styles.controlButton, !isRunning && !isPaused && styles.startButton]} 
          onPress={handleStart}
          disabled={isRunning}
        >
          <Text style={styles.controlButtonText}>START</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.controlButton]} 
          onPress={handlePause}
          disabled={!isRunning}
        >
          <Text style={styles.controlButtonText}>PAUSE</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.controlButton]} 
          onPress={handleReset}
        >
          <Text style={styles.controlButtonText}>RESET</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.controlButton, styles.stopButton]} 
          onPress={handleFinish}
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
