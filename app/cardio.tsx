import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../styles/theme';

export default function CardioScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState('HIIT');
  const [runPercentage, setRunPercentage] = useState(70);
  const [walkPercentage, setWalkPercentage] = useState(30);

  const adjustRunPercentage = (increment: boolean) => {
    setRunPercentage(prev => {
      const newValue = increment ? Math.min(100, prev + 5) : Math.max(0, prev - 5);
      setWalkPercentage(100 - newValue);
      return newValue;
    });
  };

  const adjustWalkPercentage = (increment: boolean) => {
    setWalkPercentage(prev => {
      const newValue = increment ? Math.min(100, prev + 5) : Math.max(0, prev - 5);
      setRunPercentage(100 - newValue);
      return newValue;
    });
  };

  const cardioTypes = ['HIIT', 'RUN', 'STEADY'];

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
      }
    ],
    RUN: [
      {
        title: 'DISTANCE RUN',
        subtitle: 'TRACK PACE & DISTANCE',
        duration: null,
        type: 'distance_run'
      },
      {
        title: 'CUSTOM RUN',
        subtitle: 'SET YOUR OWN GOALS',
        duration: null,
        type: 'time_run'
      }
    ],
    STEADY: [
      {
        title: 'CASUAL WALK',
        subtitle: 'LOW INTENSITY • RECOVERY',
        duration: null,
        type: 'casual_walk'
      },
      {
        title: 'CUSTOM WALK',
        subtitle: 'SET YOUR OWN PACE',
        duration: null,
        type: 'power_walk'
      }
    ]
  };

  const handleCardioSelection = (option: any) => {
    // Navigate to specific cardio workout screens
    switch (option.type) {
      case 'quick_hiit':
        router.push('/cardio/quick-hiit');
        break;
      case 'custom_hiit':
        router.push('/cardio/custom-hiit');
        break;
      case 'distance_run':
        router.push('/cardio/distance-run');
        break;
      case 'time_run':
        router.push('/cardio/time-run');
        break;
      case 'casual_walk':
        router.push('/cardio/casual-walk');
        break;
      case 'power_walk':
        router.push('/cardio/power-walk');
        break;
      default:
        console.log('Unknown cardio type:', option.type);
    }
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

      {/* RUN/WALK Controls - Only show for RUN type */}
      {selectedType === 'RUN' && (
        <View style={styles.settingsContainer}>
          <View style={styles.settingCard}>
            <Text style={styles.settingLabel}>RUN</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => adjustRunPercentage(false)}
              >
                <Text style={styles.adjustButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.settingValue}>{runPercentage}%</Text>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => adjustRunPercentage(true)}
              >
                <Text style={styles.adjustButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.settingCard}>
            <Text style={styles.settingLabel}>WALK</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => adjustWalkPercentage(false)}
              >
                <Text style={styles.adjustButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.settingValue}>{walkPercentage}%</Text>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => adjustWalkPercentage(true)}
              >
                <Text style={styles.adjustButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

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
  settingsContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  settingCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 8,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
    alignItems: 'center',
  },
  settingLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
  },
  settingValue: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    minWidth: 60,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  adjustButton: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
  },
  adjustButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
  },
});
