import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useSmoothNavigation } from '../hooks/useSmoothNavigation';
import theme from '../styles/theme';

interface BottomNavProps {
  activeTab?: string;
  currentScreen?: string;
}

export function BottomNav({ activeTab = 'home', currentScreen }: BottomNavProps) {
  const router = useRouter();
  const { navigate } = useSmoothNavigation();

  const handleTabPress = (tab: string) => {
    // Don't navigate if already on the target screen
    if (isActive(tab)) {
      return;
    }

    switch (tab) {
      case 'home':
        navigate('/');
        break;
      case 'settings':
        navigate('/settings');
        break;
      case 'program':
        navigate('/program');
        break;
      case 'history':
        navigate('/history');
        break;
      case 'stats':
        navigate('/stats');
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

  const NavButton = ({ tab, icon, iconFamily = 'MaterialIcons' }: { tab: string; icon: string; iconFamily?: string }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const active = isActive(tab);

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.85,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    };

    const IconComponent = iconFamily === 'Ionicons' ? Ionicons : MaterialIcons;

    return (
      <TouchableOpacity
        style={styles.navTab}
        onPress={() => handleTabPress(tab)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <IconComponent
            name={icon as any}
            size={24}
            color={active ? theme.colors.neonBright : theme.colors.textSecondary}
          />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.bottomNavContainer}>
      <View style={styles.bottomNav}>
        <NavButton tab="settings" icon="settings" />
        <NavButton tab="program" icon="fitness-center" />
        <NavButton tab="home" icon="home" />
        <NavButton tab="history" icon="history" />
        <NavButton tab="stats" icon="stats-chart" iconFamily="Ionicons" />
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
});
