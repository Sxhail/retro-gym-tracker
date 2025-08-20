import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GlobalRestTimerDisplay } from './GlobalRestTimerDisplay';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <View style={styles.container}>
  {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 