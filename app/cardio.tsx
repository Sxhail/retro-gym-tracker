import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../styles/theme';

export default function CardioScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState('HIIT');

  const cardioTypes = ['HIIT', 'STEADY', 'WALK'];

  const cardioOptions = {
    HIIT: [
      {
        title: 'QUICK HIIT',
        subtitle: '15 MIN • HIGH INTENSITY',
        duration: 15,
        type: 'quick_hiit'
      },
      {
        title: 'CUSTOM HIIT',
        subtitle: 'CUSTOMIZE YOUR INTERVALS',
        duration: null,
        type: 'custom_hiit'
      },
      {
        title: 'TABATA PROTOCOL',
        subtitle: '4 MIN • 20s ON / 10s OFF',
        duration: 4,
        type: 'tabata'
      }
    ],
    STEADY: [
      {
        title: 'DISTANCE RUN',
        subtitle: 'TRACK PACE & DISTANCE',
        duration: null,
        type: 'distance_run'
      },
      {
        title: 'TIME RUN',
        subtitle: 'SET DURATION GOAL',
        duration: null,
        type: 'time_run'
      },
      {
        title: 'CYCLING',
        subtitle: 'INDOOR/OUTDOOR CYCLING',
        duration: null,
        type: 'cycling'
      }
    ],
    WALK: [
      {
        title: 'CASUAL WALK',
        subtitle: 'LOW INTENSITY • RECOVERY',
        duration: null,
        type: 'casual_walk'
      },
      {
        title: 'POWER WALK',
        subtitle: 'MODERATE INTENSITY',
        duration: null,
        type: 'power_walk'
      },
      {
        title: 'INCLINE WALK',
        subtitle: 'TREADMILL • HIGH INCLINE',
        duration: null,
        type: 'incline_walk'
      }
    ]
  };

  const handleCardioSelection = (option: any) => {
    // Navigate to cardio workout screen with the selected option
    console.log('Selected cardio:', option);
    // You can implement navigation to specific cardio workout screens here
  };

  return (
    <SafeAreaView style={styles.container}>
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
    fontSize: 24,
    fontFamily: theme.fonts.code,
  },
  headerTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
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
