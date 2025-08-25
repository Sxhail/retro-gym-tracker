import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../styles/theme';
import { GlobalRestTimerDisplay } from '../components/GlobalRestTimerDisplay';
import { useCardioSession } from '../hooks/useCardioSession';

export default function CardioScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState('HIIT');
  const cardio = useCardioSession();

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
    const active = !!cardio.state.sessionId && cardio.state.phase !== 'completed' && cardio.state.phase !== 'idle';
    if (active) {
      // If a cardio session is running, navigate directly back to it
      if (cardio.state.mode === 'hiit') router.push('/cardio/quick-hiit');
      else if (cardio.state.mode === 'walk_run') router.push('/cardio/walk-run');
      else router.push('/cardio');
      return;
    }
    // No active session: go to requested option
    if (option.type === 'quick_hiit') router.push('/cardio/quick-hiit');
    else if (option.type === 'walk_run') router.push('/cardio/walk-run');
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
