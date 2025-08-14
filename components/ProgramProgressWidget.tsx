import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import theme from '../styles/theme';

interface ProgramProgressWidgetProps {
  programName: string;
  currentWeek: number;
  totalWeeks: number;
  progressPercentage: number;
  nextWorkout: string;
  daysSinceLastWorkout: number;
  onStartWorkout: () => void;
}

const ProgramProgressWidget: React.FC<ProgramProgressWidgetProps> = ({
  programName,
  currentWeek,
  totalWeeks,
  progressPercentage,
  nextWorkout,
  daysSinceLastWorkout,
  onStartWorkout
}) => {
  return (
    <View style={styles.container}>
      {/* Program Header */}
      <View style={styles.header}>
        <Text style={styles.currentProgramLabel}>CURRENT PROGRAM:</Text>
        <Text style={styles.weekIndicator}>WEEK {currentWeek}/{totalWeeks}</Text>
      </View>
      
      {/* Program Name */}
      <Text style={styles.programName}>{programName.toUpperCase()}</Text>
      
      {/* Progress Section */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>PROGRAM PROGRESS</Text>
          <Text style={styles.progressPercentage}>{Math.round(progressPercentage)}%</Text>
        </View>
        
        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
        </View>
      </View>
      
      {/* Next Workout */}
      <TouchableOpacity style={styles.nextWorkoutContainer} onPress={onStartWorkout}>
        <Text style={styles.nextWorkoutLabel}>NEXT: {nextWorkout.toUpperCase()}</Text>
      </TouchableOpacity>
      
      {/* Days Since Last Workout */}
      <Text style={styles.daysSinceText}>
        {daysSinceLastWorkout} DAYS SINCE LAST WORKOUT
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentProgramLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  weekIndicator: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  programName: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 16,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  progressPercentage: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.neon,
    borderRadius: 3,
  },
  nextWorkoutContainer: {
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  nextWorkoutLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  daysSinceText: {
    color: 'rgba(0, 255, 0, 0.7)',
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
});

export default ProgramProgressWidget;
