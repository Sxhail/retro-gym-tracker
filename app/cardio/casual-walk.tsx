import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../../styles/theme';

export default function CasualWalkScreen() {
  const router = useRouter();
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [distance, setDistance] = useState(0.00);
  const [pace, setPace] = useState('--:--');
  const [speed, setSpeed] = useState(0.0);
  const [calories, setCalories] = useState(0);
  
  // Lap tracking states
  const [currentLap, setCurrentLap] = useState(1);
  const [totalLaps, setTotalLaps] = useState(1);

  useEffect(() => {
    let interval: any;
    
    if (isRunning) {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
        // Calculate pace and speed based on distance and time
        if (distance > 0) {
          const paceInSeconds = timeElapsed / distance;
          const mins = Math.floor(paceInSeconds / 60);
          const secs = Math.floor(paceInSeconds % 60);
          setPace(`${mins}:${secs.toString().padStart(2, '0')}`);
          setSpeed(Number((distance / (timeElapsed / 3600)).toFixed(1)));
        }
        // Rough calorie calculation (placeholder)
        setCalories(Math.floor(timeElapsed * 0.15)); // Lower rate for walking
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeElapsed, distance]);

  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsRunning(false);
    setIsPaused(true);
  };

  const handleFinish = () => {
    setIsRunning(false);
    // Here you could save the workout data
    router.back();
  };

  const adjustTotalLaps = (increment: boolean) => {
    if (!isRunning) {
      setTotalLaps(prev => increment ? prev + 1 : Math.max(1, prev - 1));
    }
  };

  const handleNextLap = () => {
    if (currentLap < totalLaps) {
      setCurrentLap(prev => prev + 1);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeElapsed(0);
    setCurrentLap(1);
    setDistance(0);
    setPace('--:--');
    setSpeed(0);
    setCalories(0);
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
        <Text style={styles.headerTitle}>CASUAL WALK</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Main Timer */}
      <Text style={styles.mainTimer}>{formatTime(timeElapsed)}</Text>

      {/* Lap Settings Grid */}
      <View style={styles.settingsGrid}>
        {/* Total Laps */}
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>LAPS</Text>
          <Text style={styles.settingValue}>{totalLaps}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.adjustButton} 
              onPress={() => adjustTotalLaps(false)}
              disabled={isRunning}
            >
              <Text style={styles.adjustButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.adjustButton} 
              onPress={() => adjustTotalLaps(true)}
              disabled={isRunning}
            >
              <Text style={styles.adjustButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Current Lap */}
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>LAP</Text>
          <Text style={styles.settingValue}>{currentLap}</Text>
          <TouchableOpacity 
            style={styles.nextLapButton} 
            onPress={handleNextLap}
            disabled={!isRunning || currentLap >= totalLaps}
          >
            <Text style={styles.nextLapButtonText}>NEXT</Text>
          </TouchableOpacity>
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
          style={[styles.controlButton, styles.finishButton]} 
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
  nextLapButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
  },
  nextLapButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
