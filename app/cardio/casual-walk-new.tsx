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

  const handleStart = () => {
    startSession('casual_walk', 'CASUAL WALK', {});
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
      'Finish Walk?',
      'Are you sure you want to finish this casual walk? Your progress will be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Finish', 
          onPress: async () => {
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
                      router.replace('/history');
                    } catch (error) {
                      console.error('Error saving workout:', error);
                      const errorMessage = error instanceof Error ? error.message : 'Failed to save walk. Please try again.';
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

      {/* Main Timer Only for Casual Walk */}
      <View style={{ alignItems: 'center', marginVertical: 32 }}>
        <Text style={styles.mainTimer}>{formatTime(elapsedTime)}</Text>
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
