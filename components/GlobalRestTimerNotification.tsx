import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Modal, Animated } from 'react-native';
import { useWorkoutSession } from '../context/WorkoutSessionContext';
import { useRouter, usePathname } from 'expo-router';
import theme from '../styles/theme';

export function GlobalRestTimerNotification() {
  const { globalRestTimer, setOnRestTimerComplete } = useWorkoutSession();
  const [showNotification, setShowNotification] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const pathname = usePathname();
  const callbackSetRef = useRef(false);
  
  useEffect(() => {
    // Only set up callback once to prevent multiple triggers
    if (!callbackSetRef.current) {
      callbackSetRef.current = true;
      
      setOnRestTimerComplete(() => {
        // Only show notification if user is NOT on the workout page
        const currentPath = window?.location?.pathname || pathname;
        const isOnWorkoutPage = currentPath === '/new' || pathname === '/new';
        
        console.log('🔔 Rest timer completed callback triggered:', {
          currentPath,
          pathname,
          isOnWorkoutPage,
          willShowNotification: !isOnWorkoutPage
        });
        
        if (!isOnWorkoutPage) {
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
        }
      });
    }

    // Cleanup callback on unmount
    return () => {
      if (callbackSetRef.current) {
        setOnRestTimerComplete(null);
        callbackSetRef.current = false;
      }
    };
  }, []); // Empty dependency array to run only once

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
