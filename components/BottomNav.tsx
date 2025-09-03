import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import theme from '../styles/theme';

interface BottomNavProps {
  activeTab?: string;
  currentScreen?: string;
}

export function BottomNav({ activeTab = 'home', currentScreen }: BottomNavProps) {
  const router = useRouter();

  const handleTabPress = (tab: string) => {
    switch (tab) {
      case 'home':
        router.push('/');
        break;
      case 'settings':
        router.push('/settings');
        break;
      case 'program':
        router.push('/program');
        break;
      case 'history':
        router.push('/history');
        break;
      case 'stats':
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
        '/': 'home',
        '/settings': 'settings',
        '/program': 'program',
        '/history': 'history',
        '/stats': 'stats',
        '/progress': 'stats',
        '/new': 'home', // New workout page goes to home tab
        '/cardio': 'home', // Cardio selection page goes to home tab
      };
      return screenToTab[currentScreen] === tab;
    }
    return activeTab === tab;
  };

  return (
    <View style={styles.bottomNavContainer}>
      <View style={styles.bottomNav}>
        {/* Settings Tab */}
        <TouchableOpacity style={styles.navTab} onPress={() => handleTabPress('settings')}>
          <MaterialIcons 
            name="settings" 
            size={24} 
            color={isActive('settings') ? theme.colors.neonBright : theme.colors.textSecondary} 
          />
          <Text style={[styles.navTabLabel, isActive('settings') && styles.navTabLabelActive]}>
            Settings
          </Text>
        </TouchableOpacity>

        {/* Program Tab */}
        <TouchableOpacity style={styles.navTab} onPress={() => handleTabPress('program')}>
          <MaterialIcons 
            name="fitness-center" 
            size={24} 
            color={isActive('program') ? theme.colors.neonBright : theme.colors.textSecondary} 
          />
          <Text style={[styles.navTabLabel, isActive('program') && styles.navTabLabelActive]}>
            Program
          </Text>
        </TouchableOpacity>

        {/* Home Tab - Middle Position */}
        <TouchableOpacity style={styles.navTab} onPress={() => handleTabPress('home')}>
          <MaterialIcons 
            name="home" 
            size={24} 
            color={isActive('home') ? theme.colors.neonBright : theme.colors.textSecondary} 
          />
          <Text style={[styles.navTabLabel, isActive('home') && styles.navTabLabelActive]}>
            Home
          </Text>
        </TouchableOpacity>

        {/* History Tab */}
        <TouchableOpacity style={styles.navTab} onPress={() => handleTabPress('history')}>
          <MaterialIcons 
            name="history" 
            size={24} 
            color={isActive('history') ? theme.colors.neonBright : theme.colors.textSecondary} 
          />
          <Text style={[styles.navTabLabel, isActive('history') && styles.navTabLabelActive]}>
            History
          </Text>
        </TouchableOpacity>

        {/* Stats Tab */}
        <TouchableOpacity style={styles.navTab} onPress={() => handleTabPress('stats')}>
          <Ionicons 
            name="stats-chart" 
            size={24} 
            color={isActive('stats') ? theme.colors.neonBright : theme.colors.textSecondary} 
          />
          <Text style={[styles.navTabLabel, isActive('stats') && styles.navTabLabelActive]}>
            Stats
          </Text>
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
    bottom: 20, // Moved up from bottom to avoid system swipe indicator
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
    alignItems: 'flex-end',
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neonDim,
    paddingVertical: 8,
    paddingBottom: 8,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    marginHorizontal: 0,
    paddingHorizontal: 8,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  navTabLabel: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.display,
    fontSize: 8,
    fontWeight: '400',
    marginTop: 4,
    textAlign: 'center',
  },
  navTabLabelActive: {
    color: theme.colors.neonBright,
    fontFamily: theme.fonts.display,
  },
});
