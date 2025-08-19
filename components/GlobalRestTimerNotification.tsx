import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Modal, Animated, Vibration } from 'react-native';
import { useWorkoutSession } from '../context/WorkoutSessionContext';
import theme from '../styles/theme';

export function GlobalRestTimerNotification() {
  const { globalRestTimer, setOnRestTimerComplete } = useWorkoutSession();
  const [showNotification, setShowNotification] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const callbackSetRef = useRef(false);
  const appStartTimeRef = useRef(Date.now());
  
  useEffect(() => {
    // Only set up callback once and not immediately on mount (to avoid restoration triggers)
    const timer = setTimeout(() => {
      if (!callbackSetRef.current) {
        callbackSetRef.current = true;
        
        setOnRestTimerComplete(() => {
          // Additional safety: Don't show notification if app just started (within 5 seconds)
          const timeSinceAppStart = Date.now() - appStartTimeRef.current;
          if (timeSinceAppStart < 5000) {
            console.log('🚫 Suppressing rest timer notification - app just started');
            return;
          }
          
          console.log('🔔 Rest timer completed - showing notification');
          
          // Vibrate for tactile feedback
          Vibration.vibrate(500);
          
          // Show notification
          setShowNotification(true);
          
          // Animate in
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();

          // Auto-hide after 2.5 seconds
          setTimeout(() => {
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }).start(() => {
              setShowNotification(false);
            });
          }, 2500);
        });
      }
    }, 2000); // Increased delay from 1 second to 2 seconds

    // Cleanup callback on unmount
    return () => {
      clearTimeout(timer);
      if (callbackSetRef.current) {
        setOnRestTimerComplete(null);
        callbackSetRef.current = false;
      }
    };
  }, []);

  if (!showNotification) {
    return null;
  }

  return (
    <Modal
      transparent={true}
      visible={showNotification}
      animationType="none"
      pointerEvents="none"
      statusBarTranslucent={true}
    >
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}>
        <Animated.View style={{
          opacity: fadeAnim,
          backgroundColor: theme.colors.background,
          borderWidth: 2,
          borderColor: theme.colors.neon,
          borderRadius: 8,
          paddingVertical: 16,
          paddingHorizontal: 24,
          alignItems: 'center',
        }}>
          <Text style={{
            color: theme.colors.neon,
            fontFamily: theme.fonts.heading,
            fontSize: 18,
            fontWeight: 'bold',
            marginBottom: 4,
            textAlign: 'center',
          }}>
            REST COMPLETED
          </Text>
          <Text style={{
            color: theme.colors.neon,
            fontFamily: theme.fonts.code,
            fontSize: 14,
            opacity: 0.8,
            textAlign: 'center',
          }}>
            BACK TO LIFT
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}
