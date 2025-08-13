import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';

interface CustomSplashScreenProps {
  onFinish: () => void;
  duration?: number;
}

export default function CustomSplashScreen({ onFinish, duration = 2000 }: CustomSplashScreenProps) {
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto finish after duration
    const timer = setTimeout(() => {
      // Fade out animation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, duration - 300); // Subtract fade out duration

    return () => clearTimeout(timer);
  }, [fadeAnim, duration, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Image
        source={require('../app/assets/splash.png')}
        style={styles.splashImage}
        resizeMode="cover"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashImage: {
    width: '100%',
    height: '100%',
  },
});
