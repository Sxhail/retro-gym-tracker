import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Animated, Vibration } from 'react-native';
import { useWorkoutSession } from '../context/WorkoutSessionContext';
import theme from '../styles/theme';

export function GlobalRestTimerNotification() {
  const { setOnRestTimerComplete } = useWorkoutSession();
  const [showNotification, setShowNotification] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  
  useEffect(() => {
    // Set up the callback for when rest timer completes
    setOnRestTimerComplete(() => {
      console.log('🔔 Rest timer completed - showing notification');
      
      // Vibrate for tactile feedback
      Vibration.vibrate([0, 500, 200, 500]);
      
      // Show notification
      setShowNotification(true);
      
      // Animate in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      // Auto-hide after 4 seconds
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          setShowNotification(false);
        });
      }, 4000);
    });

    // Cleanup callback on unmount
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
      statusBarTranslucent={true}
    >
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 9999,
      }}>
        <Animated.View style={{
          opacity: fadeAnim,
          backgroundColor: theme.colors.background,
          borderWidth: 3,
          borderColor: theme.colors.neon,
          borderRadius: 12,
          paddingVertical: 24,
          paddingHorizontal: 32,
          alignItems: 'center',
          shadowColor: theme.colors.neon,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 20,
          elevation: 20,
        }}>
          <Text style={{
            color: theme.colors.neon,
            fontFamily: theme.fonts.heading,
            fontSize: 22,
            fontWeight: 'bold',
            marginBottom: 8,
            textAlign: 'center',
          }}>
            ⏰ REST COMPLETED
          </Text>
          <Text style={{
            color: theme.colors.neon,
            fontFamily: theme.fonts.code,
            fontSize: 16,
            opacity: 0.9,
            textAlign: 'center',
          }}>
            BACK TO LIFT
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}
