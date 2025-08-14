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
    borderWidth: 1, // Restored thin outline
    borderColor: 'rgba(22, 145, 58, 0.3)', // Subtle border color
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 16,
    marginVertical: 16,
    minHeight: 200,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentProgramLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body, // Consistent with app (ShareTechMono for labels)
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  weekIndicator: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading, // Orbitron for numbers/important data
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  programName: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading, // Orbitron for main titles (consistent with app)
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 20,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body, // Consistent body text font
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  progressPercentage: {
    color: theme.colors.neonBright,
    fontFamily: theme.fonts.heading, // Orbitron for numbers
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.neonBright,
    borderRadius: 6,
    shadowColor: theme.colors.neonBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  nextWorkoutContainer: {
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    borderWidth: 1, // Restored thin border
    borderColor: 'rgba(22, 145, 58, 0.4)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  nextWorkoutLabel: {
    color: theme.colors.neonBright,
    fontFamily: theme.fonts.body, // Consistent button/label font
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  daysSinceText: {
    color: 'rgba(0, 255, 0, 0.8)',
    fontFamily: theme.fonts.code, // VT323 for data display (consistent with app)
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
});

export default ProgramProgressWidget;
