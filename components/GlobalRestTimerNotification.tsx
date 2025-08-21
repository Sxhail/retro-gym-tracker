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

  console.log('🎬 GlobalRestTimerNotification mounted');

  useEffect(() => {
    if (!callbackSetRef.current) {
      callbackSetRef.current = true;
  // IMPORTANT: When storing a function in state, wrap it in another function
  // so React doesn't treat it as a state updater. This ensures our callback
  // is actually saved and invoked later by the context.
  setOnRestTimerComplete(() => () => {
        console.log('🔔 GlobalRestTimerNotification: Rest timer completed callback triggered');
        const timeSinceAppStart = Date.now() - appStartTimeRef.current;
        console.log('⏱️ Time since app start:', timeSinceAppStart, 'ms');
        
        if (timeSinceAppStart < 2000) {
          console.log('⚠️ Skipping notification - too soon after app start');
          return;
        }
        
        console.log('✨ Showing rest timer completion notification');
        Vibration.vibrate(500);
        
        // Reset animation value before showing
        fadeAnim.setValue(0);
        setShowNotification(true);
        
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          console.log('📱 Rest notification fade-in complete');
        });
        
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setShowNotification(false);
            console.log('✅ Rest timer notification hidden');
          });
        }, 2000);
      });
    }
    
    return () => {
      if (callbackSetRef.current) {
        setOnRestTimerComplete(null);
        callbackSetRef.current = false;
      }
    };
  }, [setOnRestTimerComplete, fadeAnim]);

  if (!showNotification) {
    return null;
  }

  console.log('📱 Rendering GlobalRestTimerNotification modal');

  return (
    <Modal
      transparent={true}
      visible={showNotification}
      animationType="none"
      pointerEvents="none"
      statusBarTranslucent={true}
      hardwareAccelerated={true}
    >
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 9999,
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
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
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
