import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, InteractionManager } from 'react-native';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Use InteractionManager to wait for navigation animations to complete
    const interaction = InteractionManager.runAfterInteractions(() => {
      // Fade in animation when layout mounts
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });

    return () => interaction.cancel();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 