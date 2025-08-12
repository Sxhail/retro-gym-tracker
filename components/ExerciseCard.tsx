import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import theme from '../styles/theme';

export type Exercise = {
  id: number;
  name: string;
  muscle_group: string | null;
  category: string | null;
};

export type MaxWeight = {
  weight: number;
  reps: number;
};

interface ExerciseCardProps {
  exercise: Exercise;
  maxWeight?: MaxWeight;
  onPress?: () => void;
  isAlreadyAdded?: boolean;
  showAction?: boolean;
  disabled?: boolean;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({ 
  exercise, 
  maxWeight, 
  onPress, 
  isAlreadyAdded = false, 
  showAction = false,
  disabled = false 
}) => (
  <TouchableOpacity 
    style={[
      styles.card,
      { opacity: disabled ? 0.5 : 1 }
    ]} 
    onPress={onPress}
    disabled={disabled}
  >
    {/* Exercise Details */}
    <View style={{ flex: 1 }}>
      <Text style={styles.name}>
        {exercise.name}
      </Text>
      <Text style={styles.subtitle}>
        {exercise.muscle_group} • {exercise.category}
      </Text>
    </View>

    {/* Max Weight and Reps */}
    {maxWeight && (
      <View style={[styles.maxWeightContainer, { marginRight: showAction ? 12 : 0 }]}>
        <Text style={styles.maxWeight}>
          {Math.round(maxWeight.weight)}kg
        </Text>
        <Text style={styles.maxReps}>
          {maxWeight.reps} reps
        </Text>
      </View>
    )}

    {/* Action Icons */}
    {showAction && (
      <View style={styles.actionContainer}>
        {isAlreadyAdded ? (
          <Text style={styles.checkIcon}>✔</Text>
        ) : (
          <TouchableOpacity onPress={onPress}>
            <Text style={styles.addIcon}>+</Text>
          </TouchableOpacity>
        )}
      </View>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 8,
    marginBottom: 12,
    padding: 16,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    opacity: 0.7,
    marginBottom: 4,
  },
  maxWeightContainer: {
    alignItems: 'flex-end',
  },
  maxWeight: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 18,
    fontWeight: 'bold',
  },
  maxReps: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    opacity: 0.7,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkIcon: {
    color: theme.colors.success,
    fontFamily: theme.fonts.code,
    fontSize: 20,
    fontWeight: 'bold',
  },
  addIcon: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default ExerciseCard; 