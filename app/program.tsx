import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { BottomNav } from '../components/BottomNav';
import theme from '../styles/theme';

interface ProgramConfig {
  duration: '6_weeks' | '12_weeks' | null;
  goal: 'strength' | 'hypertrophy' | 'endurance' | 'powerlifting' | null;
  frequency: '3_days' | '4_days' | '5_days' | '6_days' | null;
}

export default function ProgramScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<ProgramConfig>({
    duration: null,
    goal: null,
    frequency: null,
  });

  const isStepComplete = (stepNum: number) => {
    switch (stepNum) {
      case 2:
        return config.duration && config.goal && config.frequency;
      case 3:
      case 4:
        return true; // For now, these steps are always "complete"
      default:
        return false;
    }
  };

  const handleContinue = () => {
    if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backButton}>←</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>TRAINING PROGRAMS</Text>
      <View style={{ width: 36 }} />
    </View>
  );

  const renderProgressIndicator = () => (
    <View style={styles.progressContainer}>
      <Text style={styles.progressLabel}>- BUILDING CUSTOM PROGRAM</Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((step - 1) / 3) * 100}%` }]} />
      </View>
      <Text style={styles.stepIndicator}>
        STEP {step - 1}/3 - {
          step === 2 ? 'CREATION METHOD' :
          step === 3 ? 'PROGRAM BUILDING' :
          'FINAL REVIEW & LAUNCH'
        }
      </Text>
    </View>
  );

  const renderConfigSection = (title: string, status: string, options: any[], selectedValue: any, onSelect: (value: any) => void) => (
    <View style={styles.configSection}>
      <View style={styles.configHeader}>
        <View style={styles.configTitleRow}>
          <Text style={styles.configTitle}>{title}</Text>
        </View>
        <Text style={styles.configStatus}>{status}</Text>
      </View>
      <View style={styles.optionsGrid}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              selectedValue === option.value && styles.optionButtonSelected
            ]}
            onPress={() => onSelect(option.value)}
          >
            <Text style={[
              styles.optionLabel,
              selectedValue === option.value && styles.optionLabelSelected
            ]}>
              {option.label}
            </Text>
            <Text style={[
              styles.optionSubtext,
              selectedValue === option.value && styles.optionSubtextSelected
            ]}>
              {option.subtext}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep1 = () => (
    <ScrollView style={styles.content}>
      {renderConfigSection(
        'DURATION',
        config.duration ? 'SET' : 'NOT SET',
        [
          { value: '6_weeks', label: '6 WEEKS', subtext: 'QUICK BUILD' },
          { value: '12_weeks', label: '12 WEEKS', subtext: 'FULL PROTOCOL' },
        ],
        config.duration,
        (value) => setConfig({ ...config, duration: value })
      )}

      {renderConfigSection(
        'PRIMARY GOAL',
        config.goal ? 'SET' : 'NOT SET',
        [
          { value: 'strength', label: 'STRENGTH', subtext: 'MAX POWER' },
          { value: 'hypertrophy', label: 'HYPERTROPHY', subtext: 'MUSCLE MASS' },
          { value: 'endurance', label: 'ENDURANCE', subtext: 'CONDITIONING' },
          { value: 'powerlifting', label: 'POWERLIFTING', subtext: 'COMP PREP' },
        ],
        config.goal,
        (value) => setConfig({ ...config, goal: value })
      )}

      {renderConfigSection(
        'FREQUENCY',
        config.frequency ? 'SET' : 'NOT SET',
        [
          { value: '3_days', label: '3 DAYS', subtext: 'BEGINNER' },
          { value: '4_days', label: '4 DAYS', subtext: 'INTERMEDIATE' },
          { value: '5_days', label: '5 DAYS', subtext: 'ADVANCED' },
          { value: '6_days', label: '6 DAYS', subtext: 'ELITE' },
        ],
        config.frequency,
        (value) => setConfig({ ...config, frequency: value })
      )}
    </ScrollView>
  );

  const renderStep2 = () => (
    <ScrollView style={styles.content}>
      {/* Program Configuration */}
      {renderConfigSection(
        'DURATION',
        config.duration ? 'SET' : 'NOT SET',
        [
          { value: '6_weeks', label: '6 WEEKS', subtext: 'QUICK GAINS' },
          { value: '12_weeks', label: '12 WEEKS', subtext: 'FULL CYCLE' },
        ],
        config.duration,
        (value) => setConfig({ ...config, duration: value })
      )}

      {renderConfigSection(
        'PRIMARY GOAL',
        config.goal ? 'SET' : 'NOT SET',
        [
          { value: 'strength', label: 'STRENGTH', subtext: 'MAX POWER' },
          { value: 'hypertrophy', label: 'HYPERTROPHY', subtext: 'MUSCLE MASS' },
          { value: 'endurance', label: 'ENDURANCE', subtext: 'CONDITIONING' },
          { value: 'powerlifting', label: 'POWERLIFTING', subtext: 'COMP PREP' },
        ],
        config.goal,
        (value) => setConfig({ ...config, goal: value })
      )}

      {renderConfigSection(
        'FREQUENCY',
        config.frequency ? 'SET' : 'NOT SET',
        [
          { value: '3_days', label: '3 DAYS', subtext: 'BEGINNER' },
          { value: '4_days', label: '4 DAYS', subtext: 'INTERMEDIATE' },
          { value: '5_days', label: '5 DAYS', subtext: 'ADVANCED' },
          { value: '6_days', label: '6 DAYS', subtext: 'ELITE' },
        ],
        config.frequency,
        (value) => setConfig({ ...config, frequency: value })
      )}
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView style={styles.content}>
      <View style={styles.configSection}>
        <View style={styles.configHeader}>
          <Text style={styles.configTitle}>PROGRAM BUILDING</Text>
          <Text style={styles.configStatus}>CUSTOMIZATION</Text>
        </View>
        
        <View style={styles.buildingSection}>
          <Text style={styles.buildingSectionTitle}>WEEK STRUCTURE</Text>
          <View style={styles.weekGrid}>
            {[1, 2, 3, 4, 5, 6].map((week) => (
              <TouchableOpacity key={week} style={styles.weekCard}>
                <Text style={styles.weekNumber}>WEEK {week}</Text>
                <Text style={styles.weekType}>
                  {week % 4 === 0 ? 'DELOAD' : week === 6 ? 'TEST' : 'TRAINING'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.buildingSection}>
          <Text style={styles.buildingSectionTitle}>DAY STRUCTURE</Text>
          <View style={styles.dayGrid}>
            {['PUSH', 'PULL', 'LEGS', 'UPPER'].map((day) => (
              <TouchableOpacity key={day} style={styles.dayCard}>
                <Text style={styles.dayLabel}>{day}</Text>
                <Text style={styles.daySubtext}>4-6 EXERCISES</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.buildingSection}>
          <Text style={styles.buildingSectionTitle}>PROGRESSION SCHEME</Text>
          <View style={styles.progressionGrid}>
            <TouchableOpacity style={styles.progressionCard}>
              <Text style={styles.progressionTitle}>LINEAR</Text>
              <Text style={styles.progressionDesc}>+2.5-5kg weekly</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.progressionCard}>
              <Text style={styles.progressionTitle}>PERIODIZED</Text>
              <Text style={styles.progressionDesc}>Wave loading</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderStep4 = () => (
    <ScrollView style={styles.content}>
      <View style={styles.configSection}>
        <View style={styles.configHeader}>
          <Text style={styles.configTitle}>PROGRAM SUMMARY</Text>
          <Text style={styles.configStatus}>READY TO DEPLOY</Text>
        </View>
        
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>DURATION:</Text>
            <Text style={styles.summaryValue}>
              {config.duration === '6_weeks' ? '6 WEEKS' : '12 WEEKS'}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>GOAL:</Text>
            <Text style={styles.summaryValue}>{config.goal?.toUpperCase()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>FREQUENCY:</Text>
            <Text style={styles.summaryValue}>
              {config.frequency?.replace('_', ' ')?.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>INCLUDED FEATURES</Text>
          {[
            'Progressive overload tracking',
            'Automatic deload weeks',
            'Exercise progression schemes',
            '1RM testing protocols',
            'Volume periodization',
            'Recovery optimization'
          ].map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Text style={styles.featureCheck}>•</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.deployButton}>
          <Text style={styles.deployButtonText}>DEPLOY PROGRAM</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderFooter = () => (
    <View style={styles.footer}>
      <TouchableOpacity 
        style={styles.backButtonFooter}
        onPress={() => step > 1 ? setStep(step - 1) : router.back()}
      >
        <Text style={styles.backButtonText}>← BACK</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[
          styles.continueButton,
          !isStepComplete(step) && styles.continueButtonDisabled
        ]}
        onPress={step === 4 ? () => router.back() : handleContinue}
        disabled={!isStepComplete(step)}
      >
        <Text style={[
          styles.continueButtonText,
          !isStepComplete(step) && styles.continueButtonTextDisabled
        ]}>
          {step === 4 ? 'COMPLETE →' : 'CONTINUE →'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      {/* Show pathway selection only on step 1, otherwise show progress */}
      {step === 1 ? (
        <View style={styles.pathwayContainer}>
          <Text style={styles.pathwayTitle}>CHOOSE YOUR PATH</Text>
          
          {/* Template Path */}
          <TouchableOpacity 
            style={styles.pathwayCard}
            onPress={() => router.push('/templates')}
          >
            <View style={styles.pathwayHeader}>
              <Text style={styles.pathwayCardTitle}>USE TEMPLATES</Text>
              <Text style={styles.pathwayBadge}>QUICK START</Text>
            </View>
            <Text style={styles.pathwayDescription}>
              Browse proven workout templates or create your own
            </Text>
          </TouchableOpacity>
          
          {/* Custom Program Path */}
          <TouchableOpacity 
            style={styles.pathwayCard}
            onPress={() => setStep(2)}
          >
            <View style={styles.pathwayHeader}>
              <Text style={styles.pathwayCardTitle}>BUILD CUSTOM</Text>
              <Text style={styles.pathwayBadge}>ADVANCED</Text>
            </View>
            <Text style={styles.pathwayDescription}>
              Create a personalized program tailored to your goals
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        renderProgressIndicator()
      )}
      
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
      {step > 1 && renderFooter()}
      
      <BottomNav currentScreen="/program" />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neon,
  },
  backButton: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 36,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neon,
  },
  progressLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.neon,
    borderRadius: 2,
  },
  pathwayContainer: {
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  pathwayTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 2,
  },
  pathwayCard: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
  },
  pathwayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pathwayCardTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.display,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  pathwayBadge: {
    color: theme.colors.background,
    backgroundColor: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    letterSpacing: 1,
  },
  pathwayDescription: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    opacity: 0.9,
  },
  pathwayFeatures: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.7,
  },
  stepIndicator: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  configSection: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
  },
  configHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  configTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  configTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    fontWeight: 'bold',
  },
  configStatus: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: theme.colors.neon,
  },
  optionLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: theme.colors.background,
  },
  optionSubtext: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.7,
  },
  optionSubtextSelected: {
    color: theme.colors.background,
    opacity: 1,
  },
  methodGrid: {
    gap: 12,
  },
  methodCard: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  methodTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  methodDescription: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 8,
  },
  methodBadge: {
    color: theme.colors.background,
    backgroundColor: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neon,
  },
  backButtonFooter: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
  },
  continueButton: {
    backgroundColor: theme.colors.neon,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(0, 255, 0, 0.3)',
  },
  continueButtonText: {
    color: theme.colors.background,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
  },
  continueButtonTextDisabled: {
    opacity: 0.5,
  },
  // Step 3 & 4 styles
  buildingSection: {
    marginBottom: 16,
  },
  buildingSectionTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  weekGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  weekCard: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 4,
    padding: 8,
    minWidth: '30%',
    alignItems: 'center',
  },
  weekNumber: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    fontWeight: 'bold',
  },
  weekType: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 8,
    opacity: 0.7,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  dayCard: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 4,
    padding: 12,
    minWidth: '45%',
    alignItems: 'center',
  },
  dayLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
  },
  daySubtext: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 8,
    opacity: 0.7,
  },
  progressionGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  progressionCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
  },
  progressionTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    fontWeight: 'bold',
  },
  progressionDesc: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 8,
    opacity: 0.7,
  },
  summarySection: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
  },
  summaryValue: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 12,
    fontWeight: 'bold',
  },
  featuresSection: {
    marginBottom: 16,
  },
  featuresTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  featureCheck: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    marginRight: 8,
  },
  featureText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    opacity: 0.8,
  },
  deployButton: {
    backgroundColor: theme.colors.neon,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  deployButtonText: {
    color: theme.colors.background,
    fontFamily: theme.fonts.heading,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
