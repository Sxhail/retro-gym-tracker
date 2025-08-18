import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../../styles/theme';

export default function DistanceRunScreen() {
  const router = useRouter();
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [distance, setDistance] = useState(0.00);
  const [pace, setPace] = useState('--:--');
  const [speed, setSpeed] = useState(0.0);
  const [calories, setCalories] = useState(0);
  const [runTime, setRunTime] = useState(30);
  const [walkTime, setWalkTime] = useState(30);
  
  // New lap tracking states
  const [currentRunLaps, setCurrentRunLaps] = useState(0);
  const [totalRunLaps, setTotalRunLaps] = useState(4);
  const [currentWalkLaps, setCurrentWalkLaps] = useState(0);
  const [totalWalkLaps, setTotalWalkLaps] = useState(2);
  
  // Phase tracking
  const [isRunPhase, setIsRunPhase] = useState(true);
  const [phaseTimeLeft, setPhaseTimeLeft] = useState(30);
  
  // Initialize phase time
  useEffect(() => {
    setPhaseTimeLeft(isRunPhase ? runTime : walkTime);
  }, [runTime, walkTime, isRunPhase]);

  useEffect(() => {
    let interval: any;
    
    if (isRunning) {
      interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
        setPhaseTimeLeft(prev => {
          if (prev <= 1) {
            // Phase complete, switch phases or laps
            if (isRunPhase) {
              const newRunLaps = currentRunLaps + 1;
              setCurrentRunLaps(newRunLaps);
              
              if (newRunLaps < totalRunLaps) {
                // More run laps to go, switch to walk
                setIsRunPhase(false);
                return walkTime;
              } else {
                // All run laps complete, check walk laps
                if (currentWalkLaps < totalWalkLaps) {
                  setIsRunPhase(false);
                  return walkTime;
                } else {
                  // All laps complete
                  setIsRunning(false);
                  return 0;
                }
              }
            } else {
              const newWalkLaps = currentWalkLaps + 1;
              setCurrentWalkLaps(newWalkLaps);
              
              if (newWalkLaps < totalWalkLaps) {
                // More walk laps, but check if we need more run laps
                if (currentRunLaps < totalRunLaps) {
                  setIsRunPhase(true);
                  return runTime;
                } else {
                  // Continue walk
                  return walkTime;
                }
              } else {
                // All walk laps complete
                if (currentRunLaps < totalRunLaps) {
                  setIsRunPhase(true);
                  return runTime;
                } else {
                  // Workout complete
                  setIsRunning(false);
                  return 0;
                }
              }
            }
          }
          return prev - 1;
        });
        
        // Calculate pace and speed based on distance and time
        if (distance > 0) {
          const paceInSeconds = timeElapsed / distance;
          const mins = Math.floor(paceInSeconds / 60);
          const secs = Math.floor(paceInSeconds % 60);
          setPace(`${mins}:${secs.toString().padStart(2, '0')}`);
          setSpeed(Number((distance / (timeElapsed / 3600)).toFixed(1)));
        }
        // Rough calorie calculation (placeholder)
        setCalories(Math.floor(timeElapsed * 0.2));
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeElapsed, distance, isRunPhase, currentRunLaps, totalRunLaps, currentWalkLaps, totalWalkLaps, runTime, walkTime]);

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

  const adjustRunTime = (increment: boolean) => {
    if (!isRunning) {
      setRunTime(prev => {
        const newTime = increment ? prev + 5 : Math.max(5, prev - 5);
        if (isRunPhase) {
          setPhaseTimeLeft(newTime);
        }
        return newTime;
      });
    }
  };

  const adjustWalkTime = (increment: boolean) => {
    if (!isRunning) {
      setWalkTime(prev => {
        const newTime = increment ? prev + 5 : Math.max(5, prev - 5);
        if (!isRunPhase) {
          setPhaseTimeLeft(newTime);
        }
        return newTime;
      });
    }
  };

  const adjustRunLaps = (increment: boolean) => {
    if (!isRunning) {
      setTotalRunLaps(prev => increment ? prev + 1 : Math.max(1, prev - 1));
    }
  };

  const adjustWalkLaps = (increment: boolean) => {
    if (!isRunning) {
      setTotalWalkLaps(prev => increment ? prev + 1 : Math.max(1, prev - 1));
    }
  };

  const getPhaseText = () => {
    return isRunPhase ? 'RUN PHASE' : 'WALK PHASE';
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
                width: `${((isRunPhase ? runTime - phaseTimeLeft : walkTime - phaseTimeLeft) / (isRunPhase ? runTime : walkTime)) * 100}%`
              }
            ]} 
          />
        </View>
      </View>

      {/* Main Timer */}
      <Text style={styles.mainTimer}>{formatTime(timeElapsed)}</Text>
      
      {/* Phase Timer */}
      <Text style={styles.phaseTimer}>{formatTime(phaseTimeLeft)}</Text>

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
          <Text style={styles.settingValue}>{totalRunLaps}</Text>
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

        {/* Walk Laps */}
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>LAP</Text>
          <Text style={styles.settingValue}>{totalWalkLaps}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.adjustButton} 
              onPress={() => adjustWalkLaps(false)}
              disabled={isRunning}
            >
              <Text style={styles.adjustButtonText}>-</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.adjustButton} 
              onPress={() => adjustWalkLaps(true)}
              disabled={isRunning}
            >
              <Text style={styles.adjustButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Lap Progress */}
      <View style={styles.lapProgress}>
        <Text style={styles.lapText}>
          RUN LAPS: {currentRunLaps}/{totalRunLaps} | WALK LAPS: {currentWalkLaps}/{totalWalkLaps}
        </Text>
      </View>

  {/* Stats Grid removed: distance, pace, speed, calories */}

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
  phaseTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    letterSpacing: 1,
  },
  progressContainer: {
    paddingHorizontal: theme.spacing.lg,
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
  phaseTimer: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    letterSpacing: 2,
  },
  lapProgress: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  lapText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
});
