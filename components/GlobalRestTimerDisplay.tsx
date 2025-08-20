import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
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
  
  // Animation values for dragging
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  // Debug log for timer state changes
  useEffect(() => {
    if (globalRestTimer?.isActive) {
      console.log('🕐 Global rest timer display updated:', globalRestTimer.timeRemaining, 's remaining');
    }
  }, [globalRestTimer?.isActive, globalRestTimer?.timeRemaining]);

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

  // Handle pan gesture
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    const { oldState } = event.nativeEvent;
    if (oldState === 4) { // State.ACTIVE ended
      // Keep the position where user released it
      translateX.extractOffset();
      translateY.extractOffset();
    }
  };

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
    >
      <Animated.View style={{
        position: 'absolute',
        top: 60, // Below status bar (initial position)
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
        transform: [
          { translateX },
          { translateY }
        ],
      }}>
        {/* Drag indicator */}
        <View style={{
          position: 'absolute',
          top: 4,
          left: '50%',
          marginLeft: -12,
          width: 24,
          height: 3,
          backgroundColor: theme.colors.neon,
          opacity: 0.5,
          borderRadius: 2,
        }} />

        {/* Timer info */}
        <View style={{ flex: 1, marginTop: 4 }}>
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
      </Animated.View>
    </PanGestureHandler>
  );
}
