import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
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
      case 1:
        return config.duration && config.goal && config.frequency;
      default:
        return false;
    }
  };

  const handleContinue = () => {
    if (step === 1 && isStepComplete(1)) {
      setStep(2);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backButton}>←</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>BUILD PROTOCOL</Text>
      <View style={{ width: 36 }} />
    </View>
  );

  const renderProgressIndicator = () => (
    <View style={styles.progressContainer}>
      <Text style={styles.progressLabel}>- MAIN</Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(step / 4) * 100}%` }]} />
      </View>
      <Text style={styles.stepIndicator}>STEP {step}/4 - PROGRAM CONFIGURATION</Text>
    </View>
  );

  const renderConfigSection = (title: string, icon: string, status: string, options: any[], selectedValue: any, onSelect: (value: any) => void) => (
    <View style={styles.configSection}>
      <View style={styles.configHeader}>
        <View style={styles.configTitleRow}>
          <Text style={styles.configIcon}>{icon}</Text>
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
        '⚡',
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
        '💊',
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
        '📅',
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
      <View style={styles.configSection}>
        <View style={styles.configHeader}>
          <Text style={styles.configTitle}>CREATION METHOD</Text>
          <Text style={styles.configStatus}>SELECT APPROACH</Text>
        </View>
        <View style={styles.methodGrid}>
          <TouchableOpacity style={styles.methodCard}>
            <Text style={styles.methodIcon}>🤖</Text>
            <Text style={styles.methodTitle}>AUTO-GENERATE</Text>
            <Text style={styles.methodDescription}>AI creates optimized program with periodization</Text>
            <Text style={styles.methodBadge}>RECOMMENDED</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.methodCard}>
            <Text style={styles.methodIcon}>📋</Text>
            <Text style={styles.methodTitle}>TEMPLATE-BASED</Text>
            <Text style={styles.methodDescription}>Start with proven programs (5/3/1, nSuns, etc.)</Text>
            <Text style={styles.methodBadge}>PROVEN</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.methodCard}>
            <Text style={styles.methodIcon}>⚙️</Text>
            <Text style={styles.methodTitle}>MANUAL BUILD</Text>
            <Text style={styles.methodDescription}>Complete custom control over every aspect</Text>
            <Text style={styles.methodBadge}>ADVANCED</Text>
          </TouchableOpacity>
        </View>
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
        onPress={handleContinue}
        disabled={!isStepComplete(step)}
      >
        <Text style={[
          styles.continueButtonText,
          !isStepComplete(step) && styles.continueButtonTextDisabled
        ]}>
          CONTINUE →
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderProgressIndicator()}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {renderFooter()}
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
  configIcon: {
    fontSize: 16,
    marginRight: 8,
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
  methodIcon: {
    fontSize: 24,
    marginBottom: 8,
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
});
