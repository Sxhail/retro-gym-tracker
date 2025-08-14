import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../styles/theme';

interface BottomNavProps {
  activeTab?: string;
  currentScreen?: string;
}

export function BottomNav({ activeTab = 'start', currentScreen }: BottomNavProps) {
  const router = useRouter();

  const handleTabPress = (tab: string) => {
    switch (tab) {
      case 'start':
        router.push('/');
        break;
      case 'program':
        router.push('/program');
        break;
      case 'history':
        router.push('/history');
        break;
      case 'progress':
        router.push('/stats');
        break;
      default:
        break;
    }
  };

  const isActive = (tab: string) => {
    if (currentScreen) {
      // Map current screen paths to tab names
      const screenToTab: { [key: string]: string } = {
        '/': 'start',
        '/program': 'program',
        '/history': 'history',
        '/stats': 'progress',
        '/progress': 'progress',
      };
      return screenToTab[currentScreen] === tab;
    }
    return activeTab === tab;
  };

  return (
    <View style={styles.bottomNavContainer}>
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navTab} onPress={() => handleTabPress('start')}>
          <Text style={[styles.navTabLabel, isActive('start') && styles.navTabLabelActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navTab} onPress={() => handleTabPress('program')}>
          <Text style={[styles.navTabLabel, isActive('program') && styles.navTabLabelActive]}>Program</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navTab} onPress={() => handleTabPress('history')}>
          <Text style={[styles.navTabLabel, isActive('history') && styles.navTabLabelActive]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navTab} onPress={() => handleTabPress('progress')}>
          <Text style={[styles.navTabLabel, isActive('progress') && styles.navTabLabelActive]}>Stats</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNavContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 100,
    // For iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    // For Android elevation
    elevation: 16,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neonDim,
    paddingVertical: 8,
    paddingBottom: 8,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    marginHorizontal: 0,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginHorizontal: 4,
    paddingVertical: 8,
    // Add a subtle border and background for clickable look
    borderWidth: 1,
    borderColor: 'rgba(0,255,0,0.15)',
    backgroundColor: 'rgba(0,255,0,0.04)',
    shadowColor: '#00FF00',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  navTabLabel: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  navTabLabelActive: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    backgroundColor: 'rgba(0,255,0,0.10)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});
