import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Animated } from 'react-native';
import { useWorkoutSession } from '../context/WorkoutSessionContext';
import theme from '../styles/theme';

export function GlobalRestTimerNotification() {
  const { globalRestTimer, setOnRestTimerComplete } = useWorkoutSession();
  const [showNotification, setShowNotification] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Set up the callback for when rest timer completes
    setOnRestTimerComplete(() => {
      // Show notification
      setShowNotification(true);
      
      // Animate in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto-hide after 3 seconds
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowNotification(false);
        });
      }, 3000);
    });

    // Cleanup
    return () => {
      setOnRestTimerComplete(null);
    };
  }, [setOnRestTimerComplete, fadeAnim]);

  if (!showNotification) {
    return null;
  }

  return (
    <Modal
      transparent={true}
      visible={showNotification}
      animationType="none"
      pointerEvents="none"
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
          }}>
            REST COMPLETED
          </Text>
          <Text style={{
            color: theme.colors.neon,
            fontFamily: theme.fonts.code,
            fontSize: 14,
            opacity: 0.8,
          }}>
            BACK TO LIFT
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}
