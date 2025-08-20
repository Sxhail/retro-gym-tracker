import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { usePathname } from 'expo-router';
import { useWorkoutSession } from '../context/WorkoutSessionContext';
import theme from '../styles/theme';

/**
 * Global Rest Timer Display
 * Shows the active rest timer on all app screens EXCEPT the workout page
 */
export function GlobalRestTimerDisplay() {
  const pathname = usePathname();
  const { globalRestTimer, setGlobalRestTimer } = useWorkoutSession();

  // Don't show anything if there's no active rest timer
  if (!globalRestTimer?.isActive || globalRestTimer.timeRemaining <= 0) {
    return null;
  }

  // Don't show on the workout/new page since it has its own timer display
  const isOnWorkoutPage = pathname === '/new' || pathname.includes('/new');
  
  if (isOnWorkoutPage) {
    return null;
  }

  // Format timer display
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Handle skip timer
  const handleSkip = () => {
    setGlobalRestTimer(null);
  };

  return (
    <View style={{
      position: 'absolute',
      top: 60, // Below status bar
      left: 16,
      right: 16,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      borderWidth: 1,
      borderColor: theme.colors.neon,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      {/* Timer info */}
      <View style={{ flex: 1 }}>
        <Text style={{
          color: theme.colors.neon,
          fontFamily: theme.fonts.code,
          fontSize: 12,
          marginBottom: 2,
        }}>
          REST TIMER
        </Text>
        <Text style={{
          color: theme.colors.neon,
          fontFamily: theme.fonts.heading,
          fontSize: 18,
          fontWeight: 'bold',
          letterSpacing: 1,
        }}>
          {formatTime(globalRestTimer.timeRemaining)}
        </Text>
      </View>

      {/* Skip button */}
      <TouchableOpacity 
        onPress={handleSkip}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderWidth: 1,
          borderColor: '#FF4444',
          borderRadius: 4,
          backgroundColor: 'transparent',
        }}
      >
        <Text style={{
          color: '#FF4444',
          fontFamily: theme.fonts.code,
          fontSize: 10,
          fontWeight: 'bold',
        }}>
          SKIP
        </Text>
      </TouchableOpacity>
    </View>
  );
}
