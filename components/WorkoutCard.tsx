import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import theme from '../styles/theme';

interface WorkoutCardProps {
  title: string;
  date: string;
  exerciseCount: number;
  onPress?: () => void;
}

const WorkoutCard: React.FC<WorkoutCardProps> = ({ title, date, exerciseCount, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
    <View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.date}>{date}</Text>
      <Text style={styles.exercises}>{exerciseCount} exercises</Text>
    </View>
    <Text style={styles.arrow}>{'>'}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.neon,
    borderRadius: theme.borderRadius,
    padding: 16,
    marginBottom: 12,
    backgroundColor: theme.colors.backgroundOverlay,
  },
  title: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.mono,
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 2,
    letterSpacing: 1.5,
  },
  date: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.mono,
    fontSize: 14,
    marginBottom: 2,
    opacity: 0.85,
  },
  exercises: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.mono,
    fontSize: 14,
    opacity: 0.85,
  },
  arrow: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.mono,
    fontSize: 24,
    alignSelf: 'center',
    marginLeft: 12,
  },
});

export default WorkoutCard; 