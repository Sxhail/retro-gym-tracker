import React, { useRef, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { usePathname } from 'expo-router';
import { useWorkoutSession } from '../context/WorkoutSessionContext';
import theme from '../styles/theme';

// Get screen dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
  
  // Collapsed state
  const [isCollapsed, setIsCollapsed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Timer component dimensions (for boundary calculations)
  const TIMER_HEIGHT = 60; // Approximate height when expanded
  const TIMER_WIDTH = screenWidth - 32; // Full width minus margins
  const COLLAPSED_SIZE = 40; // Size when collapsed

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
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    } else {
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
  };

  // Handle skip timer
  const handleSkip = () => {
    setGlobalRestTimer(null);
  };

  // Handle collapse/expand toggle
  const handleToggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    
    // Animate scale change - keep collapsed state more visible
    Animated.spring(scaleAnim, {
      toValue: newCollapsed ? 0.6 : 1, // Changed from 0.1 to 0.6 for better visibility
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  // Constrain position to screen bounds
  const constrainPosition = (x: number, y: number) => {
    const currentSize = isCollapsed ? COLLAPSED_SIZE : TIMER_HEIGHT;
    const currentWidth = isCollapsed ? COLLAPSED_SIZE : TIMER_WIDTH;
    
    // Define safe boundaries (accounting for status bar and navigation)
    const minX = -currentWidth / 2; // Allow partial off-screen on left
    const maxX = screenWidth - currentWidth / 2; // Allow partial off-screen on right
    const minY = 40; // Below status bar
    const maxY = screenHeight - currentSize - 100; // Above navigation area
    
    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y))
    };
  };

  // Handle pan gesture with boundary constraints
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    const { oldState, translationX, translationY } = event.nativeEvent;
    if (oldState === 4) { // State.ACTIVE ended
      // Apply constraints only after drag ends
      const constrained = constrainPosition(translationX, translationY);
      
      // Smoothly animate to constrained position if needed
      if (constrained.x !== translationX || constrained.y !== translationY) {
        Animated.parallel([
          Animated.spring(translateX, {
            toValue: constrained.x,
            useNativeDriver: true,
            tension: 150,
            friction: 7,
          }),
          Animated.spring(translateY, {
            toValue: constrained.y,
            useNativeDriver: true,
            tension: 150,
            friction: 7,
          })
        ]).start(() => {
          // Extract offset to reset translation values to 0
          translateX.extractOffset();
          translateY.extractOffset();
        });
      } else {
        // No constraint needed, just extract offset
        translateX.extractOffset();
        translateY.extractOffset();
      }
    }
  };

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
      shouldCancelWhenOutside={false}
      activeOffsetX={[-10, 10]}
      activeOffsetY={[-10, 10]}
    >
      <Animated.View style={{
        position: 'absolute',
        top: 60, // Below status bar (initial position)
        left: 16,
        right: isCollapsed ? undefined : 16, // Remove right constraint when collapsed
        width: isCollapsed ? COLLAPSED_SIZE : undefined, // Fixed width when collapsed
        height: isCollapsed ? COLLAPSED_SIZE : undefined, // Fixed height when collapsed
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderWidth: 1,
        borderColor: theme.colors.neon,
        borderRadius: isCollapsed ? COLLAPSED_SIZE / 2 : 8, // Circular when collapsed
        paddingVertical: isCollapsed ? 0 : 12,
        paddingHorizontal: isCollapsed ? 0 : 16,
        flexDirection: isCollapsed ? 'column' : 'row',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        transform: [
          { translateX },
          { translateY },
          { scale: scaleAnim }
        ],
      }}>
        
        {/* Collapsed state - just show minus sign */}
        {isCollapsed ? (
          <TouchableOpacity 
            onPress={handleToggleCollapse}
            style={{
              width: COLLAPSED_SIZE,
              height: COLLAPSED_SIZE,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0, 255, 0, 0.1)', // Add subtle background for visibility
            }}
          >
            <Text style={{
              color: theme.colors.neon,
              fontSize: 24, // Increased from 20 to 24 for better visibility
              fontWeight: 'bold',
            }}>
              −
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            {/* Expanded state - show full timer */}
            
            {/* Clickable minus sign in top middle */}
            <TouchableOpacity
              onPress={handleToggleCollapse}
              style={{
                position: 'absolute',
                top: 2,
                left: '50%',
                marginLeft: -15, // Increased touch area
                width: 30, // Increased from 24 to 30 for better touch target
                height: 20, // Increased from 16 to 20
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1001,
              }}
            >
              <Text style={{
                color: theme.colors.neon,
                fontSize: 18, // Increased from 16 to 18
                fontWeight: 'bold',
                opacity: 0.9, // Increased from 0.8 for better visibility
              }}>
                −
              </Text>
            </TouchableOpacity>

            {/* Removed drag indicator to eliminate the other highlight */}

            {/* Timer info */}
            <View style={{ flex: 1, marginTop: 8 }}>
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
          </>
        )}
      </Animated.View>
    </PanGestureHandler>
  );
}
