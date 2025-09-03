import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Dimensions } from 'react-native';
import Body from 'react-native-body-highlighter';
import theme from '../../styles/theme';
import ChartCard from './ChartCard';
import { getMuscleActivationMap } from '../../services/muscleAnalytics';
import { mapToBodyHighlighter } from '../../services/bodyHighlighterMapping';
import { VIEW_MODE_CONFIG, TRAINING_LEVEL_CONFIG } from '../anatomy/training-levels';
import type { ViewMode, Gender, AnatomySide } from '../anatomy/muscles';
import type { MuscleActivationResult } from '../../services/muscleAnalytics';

export default function MuscleActivationMapV2() {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const gender = 'male'; // Fixed to male for now
  const [side, setSide] = useState<AnatomySide>('front');
  const [bodyData, setBodyData] = useState([]);
  const [activationData, setActivationData] = useState<MuscleActivationResult | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Slider animation
  const { width } = Dimensions.get('window');
  const CARD_MARGIN = 16;
  const sliderPosition = useRef(new Animated.Value(0)).current; // 0 = front, 1 = back
  const sideIndex = side === 'front' ? 0 : 1;

  useEffect(() => {
    loadMuscleData();
  }, [viewMode]);

  useEffect(() => {
    // Initialize slider position
    animateSlider(sideIndex);
  }, []);

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

  // Slider animation functions
  const animateSlider = (toValue: number) => {
    Animated.timing(sliderPosition, {
      toValue,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleSliderPress = (index: number) => {
    const newSide: AnatomySide = index === 0 ? 'front' : 'back';
    setSide(newSide);
    animateSlider(index);
  };

  if (loading) {
    return (
      <ChartCard 
        title="Muscle Activation Map"
        description={VIEW_MODE_CONFIG[viewMode].description}
        isLoading={true}
      />
    );
  }

  return (
    <ChartCard 
      title="Muscle Activation Map"
      description={VIEW_MODE_CONFIG[viewMode].description}
    >
      <View style={styles.container}>
        {/* Controls */}
        <View style={styles.controls}>
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

          {/* Side Control Slider */}
          <View style={styles.sliderContainer}>
            <View style={styles.sliderTrack}>
              <Animated.View 
                style={[
                  styles.sliderIndicator,
                  {
                    transform: [{
                      translateX: sliderPosition.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, (width - CARD_MARGIN * 4) / 2], // Half width for each option
                      })
                    }]
                  }
                ]}
              />
              <TouchableOpacity
                style={styles.sliderOption}
                onPress={() => handleSliderPress(0)}
              >
                <Text style={[
                  styles.sliderText,
                  sideIndex === 0 && styles.sliderTextActive
                ]}>
                  FRONT
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sliderOption}
                onPress={() => handleSliderPress(1)}
              >
                <Text style={[
                  styles.sliderText,
                  sideIndex === 1 && styles.sliderTextActive
                ]}>
                  BACK
                </Text>
              </TouchableOpacity>
            </View>
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
                  <Text style={styles.legendLevel}>{config.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controls: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  viewModeContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  activeModeButton: {
    backgroundColor: theme.colors.neon,
  },
  modeText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  activeModeText: {
    color: theme.colors.background,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.heading,
    color: theme.colors.neon,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: theme.fonts.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  bodyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    minHeight: 300,
  },
  legend: {
    margin: 16,
    padding: 16,
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: theme.fonts.heading,
    color: theme.colors.neon,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1,
  },
  legendGrid: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  legendColor: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  legendLevel: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: theme.fonts.body,
    color: theme.colors.text,
  },
  // Slider styles
  sliderContainer: {
    marginTop: 12,
  },
  sliderTrack: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 0, 0.2)',
    position: 'relative',
    overflow: 'hidden',
    height: 36,
  },
  sliderIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '50%',
    height: '100%',
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.neon,
  },
  sliderOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  sliderText: {
    color: theme.colors.neonDim,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  sliderTextActive: {
    color: theme.colors.neon,
  },
});
