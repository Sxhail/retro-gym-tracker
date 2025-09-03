import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Body from 'react-native-body-highlighter';
import theme from '../../styles/theme';
import { getMuscleActivationMap } from '../../services/muscleAnalytics';
import { mapToBodyHighlighter } from '../../services/bodyHighlighterMapping';
import { VIEW_MODE_CONFIG, TRAINING_LEVEL_CONFIG } from '../anatomy/training-levels';
import type { ViewMode, Gender, AnatomySide } from '../anatomy/muscles';
import type { MuscleActivationResult } from '../../services/muscleAnalytics';

export default function MuscleActivationMapV2() {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [gender, setGender] = useState<Gender>('male');
  const [side, setSide] = useState<AnatomySide>('front');
  const [bodyData, setBodyData] = useState([]);
  const [activationData, setActivationData] = useState<MuscleActivationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMuscleData();
  }, [viewMode]);

  const loadMuscleData = async () => {
    try {
      setLoading(true);
      const data = await getMuscleActivationMap(viewMode);
      setActivationData(data);
      const mappedData = mapToBodyHighlighter(
        data.muscleStates,
        data.muscleVolumes
      );
      setBodyData(mappedData);
    } catch (error) {
      console.error('Failed to load muscle data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBodyPartPress = (bodyPart: any, pressedSide?: string) => {
    console.log('Pressed body part:', bodyPart, 'side:', pressedSide);
    // TODO: Show detailed muscle statistics modal
    // You can implement a modal here to show detailed stats for the pressed muscle
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.neon} />
        <Text style={styles.loadingText}>Loading muscle data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Controls */}
      <View style={styles.controls}>
        <Text style={styles.title}>Muscle Activation Map</Text>
        <Text style={styles.subtitle}>
          {VIEW_MODE_CONFIG[viewMode].description}
        </Text>
        
        {/* View Mode Selector */}
        <View style={styles.viewModeContainer}>
          {(Object.keys(VIEW_MODE_CONFIG) as ViewMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.modeButton, viewMode === mode && styles.activeModeButton]}
              onPress={() => setViewMode(mode as ViewMode)}
            >
              <Text style={[styles.modeText, viewMode === mode && styles.activeModeText]}>
                {VIEW_MODE_CONFIG[mode].label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Gender/Side Controls */}
        <View style={styles.bodyControls}>
          <TouchableOpacity
            style={[styles.controlButton, gender === 'male' && styles.activeControlButton]}
            onPress={() => setGender('male')}
          >
            <Text style={[styles.controlText, gender === 'male' && styles.activeControlText]}>
              MALE
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, gender === 'female' && styles.activeControlButton]}
            onPress={() => setGender('female')}
          >
            <Text style={[styles.controlText, gender === 'female' && styles.activeControlText]}>
              FEMALE
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton]}
            onPress={() => setSide(side === 'front' ? 'back' : 'front')}
          >
            <Text style={styles.controlText}>
              {side.toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Stats */}
      {activationData && (
        <View style={styles.summaryContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {activationData.totalVolume.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Total Volume</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {Object.keys(activationData.muscleStates).length}
            </Text>
            <Text style={styles.statLabel}>Muscles Trained</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {Object.values(activationData.muscleStates).filter(level => level === 'optimal').length}
            </Text>
            <Text style={styles.statLabel}>Optimal</Text>
          </View>
        </View>
      )}

      {/* Body Highlighter */}
      <View style={styles.bodyContainer}>
        <Body
          data={bodyData}
          onBodyPartPress={handleBodyPartPress}
          colors={[
            theme.colors.textDisabled,  // untrained (dark green)
            '#FF9500',                  // undertrained (orange) 
            theme.colors.neon,          // optimal (main green)
            '#FF0033'                   // overtrained (red)
          ]}
          side={side}
          gender={gender}
          scale={1.0}
          border={theme.colors.border}
        />
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Training Levels</Text>
        <Text style={styles.legendSubtitle}>
          {VIEW_MODE_CONFIG[viewMode].description}
        </Text>
        <View style={styles.legendGrid}>
          {(Object.keys(TRAINING_LEVEL_CONFIG) as Array<keyof typeof TRAINING_LEVEL_CONFIG>).map((level) => {
            const config = TRAINING_LEVEL_CONFIG[level];
            return (
              <View key={level} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendColor,
                    { backgroundColor: config.color }
                  ]}
                />
                <View style={styles.legendTextContainer}>
                  <Text style={styles.legendLevel}>{config.label}</Text>
                  <Text style={styles.legendDescription}>{config.description}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  controls: {
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.neon,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  viewModeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'transparent',
  },
  activeModeButton: {
    backgroundColor: theme.colors.neon,
    borderColor: theme.colors.neon,
  },
  modeText: {
    color: theme.colors.neon,
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeModeText: {
    color: theme.colors.background,
  },
  bodyControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  controlButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'transparent',
  },
  activeControlButton: {
    backgroundColor: theme.colors.neon,
    borderColor: theme.colors.neon,
  },
  controlText: {
    color: theme.colors.neon,
    fontSize: 10,
    fontWeight: 'bold',
  },
  activeControlText: {
    color: theme.colors.background,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.neon,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  bodyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  legend: {
    margin: 20,
    padding: 16,
    backgroundColor: theme.colors.backgroundOverlay,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.neon,
    textAlign: 'center',
    marginBottom: 4,
  },
  legendSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  legendGrid: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendLevel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  legendDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    color: theme.colors.neon,
    fontSize: 16,
    marginTop: 12,
  },
});
