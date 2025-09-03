import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Svg } from 'react-native-svg';
import theme from '../../styles/theme';
import { TRAINING_LEVEL_CONFIG } from './training-levels';
import type { MuscleId, TrainingLevel, Gender, AnatomySide } from './muscles';

// Import anatomy components
import MaleAnatomyFront from './svg/MaleAnatomyFront';
import MaleAnatomyBack from './svg/MaleAnatomyBack';
// TODO: Implement female anatomy components with new SVG assets
// import FemaleAnatomyFront from './svg/FemaleAnatomyFront';
// import FemaleAnatomyBack from './svg/FemaleAnatomyBack';

interface Props {
  muscleStates: Partial<Record<MuscleId, TrainingLevel>>;
  gender: Gender;
  anatomySide: AnatomySide;
  onMusclePress?: (muscleId: MuscleId) => void;
  onGenderToggle?: (gender: Gender) => void;
  onSideToggle?: () => void;
  width?: number;
  height?: number;
}

export default function AnatomyViewer({
  muscleStates,
  gender,
  anatomySide,
  onMusclePress,
  onGenderToggle,
  onSideToggle,
  width = 400,
  height = 600
}: Props) {
  const getMuscleStyle = (muscleId: MuscleId) => {
    const trainingLevel = muscleStates[muscleId];
    if (!trainingLevel) {
      return {
        fill: theme.colors.backgroundOverlay,
        opacity: 0.3,
        stroke: theme.colors.neon,
        strokeWidth: 1
      };
    }

    const config = TRAINING_LEVEL_CONFIG[trainingLevel];
    return {
      fill: config.color,
      opacity: config.opacity,
      stroke: theme.colors.neon,
      strokeWidth: 1.5
    };
  };

  const renderAnatomyComponent = () => {
    const commonProps = {
      muscleStates,
      onMusclePress,
      getMuscleStyle
    };

    if (gender === 'male') {
      return anatomySide === 'front' 
        ? <MaleAnatomyFront {...commonProps} />
        : <MaleAnatomyBack {...commonProps} />;
    } else {
      return anatomySide === 'front'
        ? <Text style={styles.placeholderText}>Female Front - Coming Soon</Text>
        : <Text style={styles.placeholderText}>Female Back - Coming Soon</Text>;
    }
  };

  return (
    <View style={styles.container}>
      {/* Toggle Controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.toggleButton, gender === 'male' && styles.activeButton]}
          onPress={() => onGenderToggle?.('male')}
        >
        <Text style={[styles.toggleText, gender === 'male' && styles.activeText]}>
          MALE
        </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.toggleButton, gender === 'female' && styles.activeButton]}
          onPress={() => onGenderToggle?.('female')}
        >
        <Text style={[styles.toggleText, gender === 'female' && styles.activeText]}>
          FEMALE
        </Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity 
          style={[styles.toggleButton, anatomySide === 'front' && styles.activeButton]}
          onPress={() => onSideToggle?.()}
        >
        <Text style={[styles.toggleText, anatomySide === 'front' && styles.activeText]}>
          FRONT
        </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.toggleButton, anatomySide === 'back' && styles.activeButton]}
          onPress={() => onSideToggle?.()}
        >
        <Text style={[styles.toggleText, anatomySide === 'back' && styles.activeText]}>
          BACK
        </Text>
        </TouchableOpacity>
      </View>

      {/* Anatomy SVG */}
      <View style={styles.anatomyContainer}>
        <Svg 
          width={width} 
          height={height} 
          viewBox="0 0 525 950"
          style={styles.svg}
        >
          {renderAnatomyComponent()}
        </Svg>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
      <Text style={styles.legendTitle}>TRAINING LEVELS</Text>
        <View style={styles.legendGrid}>
          {Object.entries(TRAINING_LEVEL_CONFIG).map(([level, config]) => (
            <View key={level} style={styles.legendItem}>
              <View 
                style={[
                  styles.legendColor,
                  { 
                    backgroundColor: config.color,
                    opacity: config.opacity 
                  }
                ]} 
              />
            <Text style={styles.legendLabel}>
              {config.label}
            </Text>
            </View>
          ))}
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.backgroundOverlay,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neon,
    gap: 12,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  activeButton: {
    backgroundColor: theme.colors.neon,
  },
  toggleText: {
    fontSize: 12,
    fontFamily: 'VT323',
    color: theme.colors.neon,
    letterSpacing: 1,
  },
  activeText: {
    color: theme.colors.background,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: theme.colors.neon,
    opacity: 0.5,
    marginHorizontal: 8,
  },
  anatomyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  svg: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 8,
  },
  legend: {
    backgroundColor: theme.colors.backgroundOverlay,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neon,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  legendTitle: {
    fontSize: 14,
    fontFamily: 'VT323',
    color: theme.colors.neon,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 2,
  },
  legendGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: '45%',
  },
  legendColor: {
    width: 12,
    height: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.neon,
  },
  legendLabel: {
    fontSize: 11,
    fontFamily: 'ShareTechMono',
    color: theme.colors.text,
    textTransform: 'uppercase',
  },
  placeholderText: {
    fontSize: 16,
    fontFamily: 'VT323',
    color: theme.colors.neon,
    textAlign: 'center',
    padding: 40,
  },
});
