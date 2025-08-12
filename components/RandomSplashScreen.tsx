import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';
import theme from '../styles/theme';

const SPLASH_SCREENS = [
  {
    id: 1,
    title: 'GYM.TRACKER',
    subtitle: 'RETRO FITNESS PROTOCOL',
    image: require('../app/assets/bodybuilder.jpeg'),
  },
  {
    id: 2,
    title: 'IRON.FORGE',
    subtitle: 'MUSCLE MEMORY SYSTEM',
    image: require('../app/assets/splash2.png'),
  },
  {
    id: 3,
    title: 'STRENGTH.NET',
    subtitle: 'POWER ACQUISITION MODULE',
    image: require('../app/assets/bodybuilder.jpeg'),
  },
  {
    id: 4,
    title: 'LIFT.PROTOCOL',
    subtitle: 'BIOMECHANICAL ENHANCEMENT',
    image: require('../app/assets/splash2.png'),
  },
  {
    id: 5,
    title: 'MUSCLE.CORE',
    subtitle: 'NEURAL ADAPTATION MATRIX',
    image: require('../app/assets/bodybuilder.jpeg'),
  },
  {
    id: 6,
    title: 'POWER.GRID',
    subtitle: 'KINETIC FORCE AMPLIFIER',
    image: require('../app/assets/splash2.png'),
  },
  // You can add more splash variations here with either image
];

interface RandomSplashScreenProps {
  onFinish: () => void;
  duration?: number;
}

export default function RandomSplashScreen({ onFinish, duration = 2000 }: RandomSplashScreenProps) {
  const [currentSplash] = useState(() => {
    // Randomly select a splash screen
    const randomIndex = Math.floor(Math.random() * SPLASH_SCREENS.length);
    return SPLASH_SCREENS[randomIndex];
  });

  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Auto finish after duration
    const timer = setTimeout(() => {
      // Fade out animation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, duration - 500); // Subtract fade out duration

    return () => clearTimeout(timer);
  }, [fadeAnim, duration, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* System Status Header */}
      <View style={styles.statusHeader}>
        <View style={styles.statusRow}>
          <View style={styles.statusIndicatorRed} />
          <Text style={styles.statusTextRed}>SYSTEM ONLINE</Text>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        <Text style={styles.title}>{currentSplash.title}</Text>
        
        <View style={styles.imageContainer}>
          <Image
            source={currentSplash.image}
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        <View style={styles.loadingContainer}>
          <View style={styles.loadingBar}>
            <Animated.View 
              style={[
                styles.loadingProgress,
                {
                  width: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                }
              ]} 
            />
          </View>
          <Text style={styles.loadingText}>INITIALIZING...</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  statusHeader: {
    paddingTop: 60,
    paddingBottom: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    backgroundColor: theme.colors.neon,
    borderRadius: 2,
  },
  statusIndicatorRed: {
    width: 10,
    height: 10,
    backgroundColor: '#FF0000',
    borderRadius: 2,
  },
  statusText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    letterSpacing: 1,
    flex: 1,
    marginLeft: 8,
  },
  statusTextRed: {
    color: '#FF0000',
    fontFamily: theme.fonts.code,
    fontSize: 12,
    letterSpacing: 1,
    flex: 1,
    marginLeft: 8,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.display,
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 40,
  },
  imageContainer: {
    width: 200,
    height: 200,
    marginBottom: 60,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  loadingBar: {
    width: 200,
    height: 3,
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: theme.colors.neon,
    borderRadius: 2,
  },
  loadingText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    letterSpacing: 1,
    opacity: 0.8,
  },
});
