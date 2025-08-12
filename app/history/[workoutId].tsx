import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import theme from '../../styles/theme';
import { getWorkoutDetail, formatDuration, formatDate, deleteWorkout, type WorkoutDetail } from '../../services/workoutHistory';

const GREEN = '#00FF00';
const LIGHT_GREEN = '#39FF14';
const FONT = 'monospace';
const { width } = require('react-native').Dimensions.get('window');
const CARD_MARGIN = 18;
const CARD_WIDTH = width - CARD_MARGIN * 2;

export default function WorkoutDetailScreen() {
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();

  // Load workout details
  const loadWorkoutDetail = async () => {
    if (!workoutId) {
      setError('No workout ID provided');
      setLoading(false);
      return;
    }

    // Validate workout ID format
    const workoutIdNum = parseInt(workoutId);
    if (isNaN(workoutIdNum) || workoutIdNum <= 0) {
      setError('Invalid workout ID format');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const workoutData = await getWorkoutDetail(workoutIdNum);
      
      if (!workoutData) {
        setError('Workout not found');
      } else {
        // Handle edge case: workout with no exercises
        if (workoutData.exercises.length === 0) {
          setError('This workout has no exercises');
          return;
        }
        
        // Handle edge case: workout with no completed sets
        const hasCompletedSets = workoutData.exercises.some(exercise => 
          exercise.sets.some(set => set.completed)
        );
        
        if (!hasCompletedSets) {
          // Still show the workout but with a warning
          console.warn('Workout has no completed sets');
        }
        
        setWorkout(workoutData);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load workout details';
      
      // Handle specific error cases
      if (errorMessage.includes('Invalid workout ID')) {
        setError('Invalid workout ID provided');
      } else if (errorMessage.includes('Database is busy')) {
        setError('Database is busy. Please try again in a moment.');
      } else if (errorMessage.includes('Database schema is missing')) {
        setError('Database error. Please restart the app.');
      } else if (errorMessage.includes('Workout not found')) {
        setError('Workout not found or has been deleted');
      } else {
        setError(errorMessage);
      }
      
      console.error('Error loading workout detail:', err);
    } finally {
      setLoading(false);
    }
  };



  // Load data on mount
  useEffect(() => {
    loadWorkoutDetail();
  }, [workoutId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButtonArea}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>WORKOUT DETAIL</Text>
          <View style={styles.backButtonArea} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.loadingText}>LOADING WORKOUT...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !workout) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButtonArea}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>WORKOUT DETAIL</Text>
          <View style={styles.backButtonArea} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>ERROR: {error || 'Workout not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadWorkoutDetail}>
            <Text style={styles.retryButtonText}>RETRY</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate enhanced workout statistics
  const totalSets = workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  const completedSets = workout.exercises.reduce((sum, exercise) => 
    sum + exercise.sets.filter(set => set.completed).length, 0
  );
  const totalWeight = workout.exercises.reduce((sum, exercise) => 
    sum + exercise.sets.reduce((setSum, set) => setSum + (set.weight * set.reps), 0), 0
  );
  const averageWeight = totalSets > 0 ? totalWeight / totalSets : 0;
  const completionPercentage = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
  const totalReps = workout.exercises.reduce((sum, exercise) => 
    sum + exercise.sets.reduce((setSum, set) => setSum + set.reps, 0), 0
  );
  const averageReps = totalSets > 0 ? Math.round(totalReps / totalSets) : 0;
  
  // Get notes summary
  const setsWithNotes = workout.exercises.reduce((sum, exercise) => 
    sum + exercise.sets.filter(set => set.notes && set.notes.trim()).length, 0
  );
  const hasNotes = setsWithNotes > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonArea}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>WORKOUT DETAIL</Text>
        <View style={styles.backButtonArea} />
      </View>

      {/* Workout Header */}
      <View style={styles.workoutHeader}>
        <Text style={styles.workoutName}>{workout.name}</Text>
        <Text style={styles.workoutDate}>{formatDate(workout.date)}</Text>
        <Text style={styles.workoutDuration}>Duration: {formatDuration(workout.duration)}</Text>
      </View>



      {/* Workout Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{workout.exercises.length}</Text>
          <Text style={styles.statLabel}>EXERCISES</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalSets}</Text>
          <Text style={styles.statLabel}>TOTAL SETS</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{completedSets}</Text>
          <Text style={styles.statLabel}>COMPLETED</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{Math.round(averageWeight)}</Text>
          <Text style={styles.statLabel}>AVG KG</Text>
        </View>
      </View>

      {/* Exercises List */}
      <ScrollView style={styles.exercisesList} showsVerticalScrollIndicator={false}>
        {workout.exercises.map((exercise, exerciseIndex) => (
          <View key={exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
              {exercise.distance && (
                <Text style={styles.exerciseDistance}>{exercise.distance}m</Text>
              )}
            </View>
            
            {/* Sets List */}
            <View style={styles.setsContainer}>
              {exercise.sets.map((set, setIndex) => (
                <View key={set.id} style={styles.setRow}>
                  <View style={styles.setHeader}>
                    <Text style={styles.setNumber}>SET {setIndex + 1}</Text>
                    {set.completed && (
                      <Text style={styles.completedBadge}>COMPLETED</Text>
                    )}
                  </View>
                  
                  <View style={styles.setDetails}>
                    <View style={styles.setDetailItem}>
                      <Text style={styles.setDetailLabel}>WEIGHT</Text>
                      <Text style={styles.setDetailValue}>{set.weight} kg</Text>
                    </View>
                    <View style={styles.setDetailItem}>
                      <Text style={styles.setDetailLabel}>REPS</Text>
                      <Text style={styles.setDetailValue}>{set.reps}</Text>
                    </View>
                    <View style={styles.setDetailItem}>
                      <Text style={styles.setDetailLabel}>REST</Text>
                      <Text style={styles.setDetailValue}>{formatDuration(set.restDuration)}</Text>
                    </View>
                  </View>
                  
                  {set.notes && (
                    <View style={styles.notesContainer}>
                      <Text style={styles.notesLabel}>NOTES:</Text>
                      <Text style={styles.notesText}>{set.notes}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'black',
    paddingHorizontal: 16,
  },
  backButtonArea: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  status: {
    color: GREEN,
    fontFamily: theme.fonts.code,
    fontSize: 13,
    marginTop: 18,
    marginLeft: CARD_MARGIN,
    marginBottom: 0,
    letterSpacing: 1,
  },
  protocol: {
    color: GREEN,
    fontFamily: theme.fonts.code,
    fontSize: 13,
    marginLeft: CARD_MARGIN,
    marginBottom: 8,
    letterSpacing: 1,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: GREEN,
    marginHorizontal: CARD_MARGIN,
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  pageTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontWeight: 'bold',
    fontSize: 28,
    letterSpacing: 1.5,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  title: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.display,
    fontWeight: 'bold',
    fontSize: 20,
    letterSpacing: 2,
  },
  backButton: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 36,
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: 'transparent',
  },
  workoutHeader: {
    marginHorizontal: CARD_MARGIN,
    marginBottom: 18,
    alignItems: 'center',
  },
  workoutName: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontWeight: 'bold',
    fontSize: 24,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  workoutDate: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    opacity: 0.8,
    marginBottom: 4,
  },
  workoutDuration: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    opacity: 0.8,
  },
  performanceSummary: {
    marginHorizontal: CARD_MARGIN,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 8,
    padding: 16,
    backgroundColor: 'rgba(0,255,0,0.05)',
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  performanceTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  completionBadge: {
    backgroundColor: LIGHT_GREEN,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 48,
    alignItems: 'center',
  },
  completionText: {
    color: 'black',
    fontFamily: theme.fonts.body,
    fontSize: 14,
    fontWeight: 'bold',
  },
  performanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  performanceStat: {
    alignItems: 'center',
    flex: 1,
  },
  performanceLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 10,
    opacity: 0.7,
    marginBottom: 2,
    textAlign: 'center',
  },
  performanceValue: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
  },
  notesSummary: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.neon,
    paddingTop: 8,
    alignItems: 'center',
  },
  notesSummaryText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 12,
    opacity: 0.8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    marginHorizontal: CARD_MARGIN,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 10,
    opacity: 0.8,
    textAlign: 'center',
  },
  exercisesList: {
    marginHorizontal: CARD_MARGIN,
    flex: 1,
  },
  exerciseCard: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 8,
    padding: 16,
    marginBottom: 18,
    backgroundColor: 'transparent',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseName: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1,
    flex: 1,
  },
  exerciseDistance: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    opacity: 0.8,
  },
  setsContainer: {
    gap: 8,
  },
  setRow: {
    borderRadius: 6,
    padding: 12,
    backgroundColor: 'rgba(0,255,0,0.03)',
    opacity: 0.7,
  },
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  setNumber: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    fontWeight: 'bold',
  },
  completedBadge: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,255,0,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  setDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  setDetailItem: {
    alignItems: 'center',
    flex: 1,
  },
  setDetailLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 10,
    opacity: 0.7,
    marginBottom: 2,
  },
  setDetailValue: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 14,
    fontWeight: 'bold',
  },
  notesContainer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.neon,
    paddingTop: 8,
  },
  notesLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 10,
    opacity: 0.7,
    marginBottom: 2,
  },
  notesText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 12,
    fontStyle: 'italic',
  },
  actionContainer: {
    paddingHorizontal: CARD_MARGIN,
    paddingVertical: 12,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    borderRadius: 6,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
  },
  shareButton: {
    backgroundColor: '#0066CC',
    borderColor: theme.colors.neon,
  },
  shareButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  deleteButton: {
    backgroundColor: '#CC0000',
    borderColor: theme.colors.neon,
  },
  deleteButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  errorText: {
    color: '#FF4444',
    fontFamily: FONT,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    borderWidth: 1,
    borderColor: '#FF4444',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryButtonText: {
    color: '#FF4444',
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: 'bold',
  },
}); 