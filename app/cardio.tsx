import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../styles/theme';
import { useCardioSession } from '../context/CardioSessionContext';
import { GlobalRestTimerDisplay } from '../components/GlobalRestTimerDisplay';

export default function CardioScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState('HIIT');
  const { isActive: isCardioActive, cardioType: activeCardioType, resetSession } = useCardioSession();

  // Disable STEADY for now (keep routes working for ongoing sessions)
  const cardioTypes = ['HIIT', 'RUN'];

  const cardioOptions = {
    HIIT: [
      {
        title: 'QUICK HIIT',
        subtitle: '15 MIN • HIGH INTENSITY',
        duration: 15,
        type: 'quick_hiit'
      }
    ],
    RUN: [
      {
        title: 'WALK - RUN',
        subtitle: 'INTERVAL TRAINING • WALK & RUN PHASES',
        duration: null,
        type: 'walk_run'
      }
  ],
  // STEADY is disabled for now
  // STEADY: [
  //   {
  //     title: 'CASUAL WALK',
  //     subtitle: 'LOW INTENSITY • RECOVERY',
  //     duration: null,
  //     type: 'casual_walk'
  //   }
  // ]
  };

  const handleCardioSelection = (option: any) => {
    // Check if there's an active cardio session and if it's different from the selected option
    if (isCardioActive && activeCardioType) {
      const currentSessionType = getSessionTypeFromCardioType(activeCardioType);
      const newSessionType = option.type;
      
      // If trying to start a different session type, show confirmation dialog
      if (currentSessionType !== newSessionType) {
        Alert.alert(
          'Active Cardio Session',
          `You have an active ${activeCardioType.toUpperCase()} session running. Would you like to stop it and start a new ${option.title} session?`,
          [
            { 
              text: 'No', 
              style: 'cancel' 
            },
            { 
              text: 'Yes', 
              onPress: () => {
                resetSession();
                navigateToCardioWorkout(option);
              }
            }
          ]
        );
        return;
      }
    }
    
    navigateToCardioWorkout(option);
  };

  const getSessionTypeFromCardioType = (cardioType: string): string => {
    switch (cardioType) {
      case 'hiit':
        return 'quick_hiit';
      case 'walk_run':
        return 'walk_run';
      case 'casual_walk':
        return 'casual_walk';
      default:
        return cardioType;
    }
  };

  const navigateToCardioWorkout = (option: any) => {
    // Navigate to specific cardio workout screens
    switch (option.type) {
      case 'quick_hiit':
        router.push('/cardio/quick-hiit');
        break;
      case 'custom_hiit':
        router.push('/cardio/custom-hiit');
        break;
      case 'walk_run':
        router.push('/cardio/distance-run-new');
        break;
      case 'time_run':
        router.push('/cardio/time-run');
        break;
      case 'casual_walk':
        router.push('/cardio/casual-walk-new');
        break;
      default:
        console.log('Unknown cardio type:', option.type);
    }
  };

  return (
  <SafeAreaView style={styles.container}>
      <GlobalRestTimerDisplay />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SELECT CARDIO TYPE</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Cardio Type Tabs */}
      <View style={styles.tabContainer}>
        {cardioTypes.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.tab,
              selectedType === type && styles.tabActive
            ]}
            onPress={() => setSelectedType(type)}
          >
            <Text style={[
              styles.tabText,
              selectedType === type && styles.tabTextActive
            ]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Cardio Options */}
      <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
        {cardioOptions[selectedType as keyof typeof cardioOptions].map((option, index) => (
          <TouchableOpacity
            key={index}
            style={styles.optionCard}
            onPress={() => handleCardioSelection(option)}
          >
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: theme.colors.neon,
    fontSize: 36,
    fontFamily: theme.fonts.code,
  },
  headerTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  placeholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.neon,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: 'rgba(0, 255, 0, 0.15)',
  },
  tabText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  tabTextActive: {
    color: theme.colors.neon,
  },
  optionsContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  optionCard: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 12,
    marginBottom: theme.spacing.lg,
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
    overflow: 'hidden',
  },
  optionContent: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  optionTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.display,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  optionSubtitle: {
    color: theme.colors.neonDim,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    letterSpacing: 0.5,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
