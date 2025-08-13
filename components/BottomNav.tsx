import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
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
    <SafeAreaView style={styles.bottomNavContainer}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bottomNavContainer: {
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neon,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  navTabLabel: {
    color: theme.colors.neonDim,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  navTabLabelActive: {
    color: theme.colors.neon,
  },
});
