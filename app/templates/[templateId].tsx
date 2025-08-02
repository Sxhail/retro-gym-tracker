import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import theme from '../../styles/theme';
import { getTemplateDetail, deleteTemplate, toggleFavorite, loadTemplateIntoSession, type TemplateDetail } from '../../services/workoutTemplates';
import { useWorkoutSession } from '../../context/WorkoutSessionContext';

const { width } = require('react-native').Dimensions.get('window');
const CARD_MARGIN = 18;
const CARD_WIDTH = width - CARD_MARGIN * 2;

export default function TemplateDetailScreen() {
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const router = useRouter();
  const { templateId } = useLocalSearchParams<{ templateId: string }>();
  
  // Use workout session context
  const {
    setCurrentExercises,
    setWorkoutName,
    startWorkout,
    resetSession
  } = useWorkoutSession();

  // Load template details
  const loadTemplateDetail = async () => {
    if (!templateId) {
      setError('No template ID provided');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const templateData = await getTemplateDetail(parseInt(templateId));
      
      if (!templateData) {
        setError('Template not found');
      } else {
        setTemplate(templateData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template details');
      console.error('Error loading template detail:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle favorite toggle
  const handleToggleFavorite = async () => {
    if (!template || !templateId) return;

    try {
      await toggleFavorite(parseInt(templateId));
      // Reload template to get updated favorite status
      await loadTemplateDetail();
    } catch (err) {
      Alert.alert('Error', 'Failed to update favorite status. Please try again.');
    }
  };



  // Handle load template into workout - directly load template and start workout
  const handleLoadTemplate = async () => {
    if (!template) return;

    try {
      setLoadingTemplate(true);
      
      // Reset any existing session
      await resetSession();
      
      // Load template data
      const templateData = await loadTemplateIntoSession(parseInt(templateId));
      
      // Convert template data to session format
      const templateExercises = templateData.exercises.map(exercise => ({
        id: exercise.id,
        name: exercise.name,
        category: exercise.category,
        muscle_group: exercise.muscle_group,
        distance: exercise.distance,
        sets: exercise.sets.map(set => ({
          weight: Number(set.weight) || 0,
          reps: Number(set.reps) || 0,
          rest: Number(set.rest) || 120,
          notes: set.notes || '',
          completed: false,
        }))
      }));

      // Set workout name to template name
      setWorkoutName(template.name);
      
      // Set exercises in session
      setCurrentExercises(templateExercises);
      
      // Start the workout
      startWorkout();
      
      // Navigate to new workout screen (which will now show active workout)
      router.push('/new');
      
    } catch (error) {
      console.error('Error loading template:', error);
      Alert.alert('Error', 'Failed to load template. Please try again.');
    } finally {
      setLoadingTemplate(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadTemplateDetail();
  }, [templateId]);

  if (loading) {
    return (
      <View style={styles.root}>
        <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: 'flex-start', marginBottom: 12, marginLeft: CARD_MARGIN }}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { marginTop: 24 }]}>TEMPLATE DETAIL</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.neon} />
          <Text style={styles.loadingText}>LOADING TEMPLATE...</Text>
        </View>
      </View>
    );
  }

  if (error || !template) {
    return (
      <View style={styles.root}>
              <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: 'flex-start', marginBottom: 12, marginLeft: CARD_MARGIN }}>
        <Text style={[styles.backButton, { fontWeight: 'bold' }]}>←</Text>
      </TouchableOpacity>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { marginTop: 24 }]}>TEMPLATE DETAIL</Text>
      </View>
      <View style={styles.errorContainer}>
          <Text style={styles.errorText}>ERROR: {error || 'Template not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTemplateDetail}>
            <Text style={styles.retryButtonText}>RETRY</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Calculate template statistics
  const totalExercises = template.exercises.length;
  const totalSets = template.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0);
  const estimatedDuration = template.estimated_duration || 0;

  return (
    <View style={styles.root}>
      {/* Header Section */}
      
      {/* Header Row */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backButton, { fontWeight: 'bold' }]}>←</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>TEMPLATE DETAIL</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Template Header */}
      <View style={styles.templateHeader}>
        <View style={styles.templateTitleRow}>
          <Text style={styles.templateName}>{template.name}</Text>
          <TouchableOpacity onPress={handleToggleFavorite}>
            <Text style={[
              styles.favoriteIcon,
              template.is_favorite && styles.favoriteIconActive
            ]}>
              {template.is_favorite ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {template.description && (
          <Text style={styles.templateDescription}>{template.description}</Text>
        )}
      </View>

      {/* Template Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalExercises}</Text>
          <Text style={styles.statLabel}>EXERCISES</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalSets}</Text>
          <Text style={styles.statLabel}>TOTAL SETS</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{estimatedDuration}</Text>
          <Text style={styles.statLabel}>MINUTES</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{template.difficulty?.toUpperCase() || 'N/A'}</Text>
          <Text style={styles.statLabel}>LEVEL</Text>
        </View>
      </View>

      {/* Template Meta */}
      {template.category && (
        <View style={styles.metaContainer}>
          <Text style={styles.metaLabel}>CATEGORY</Text>
          <Text style={styles.metaValue}>{template.category.toUpperCase()}</Text>
        </View>
      )}

      {/* Exercises List */}
      <ScrollView style={styles.exercisesList} showsVerticalScrollIndicator={false}>
        {template.exercises.map((exercise, exerciseIndex) => (
          <View key={exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseNumber}>{exercise.exercise_order + 1}.</Text>
              <Text style={styles.exerciseName}>{exercise.exercise.name}</Text>
              {exercise.distance && (
                <Text style={styles.exerciseDistance}>{exercise.distance}m</Text>
              )}
            </View>
            
            {/* Sets List */}
            <View style={styles.setsContainer}>
              {exercise.sets.map((set, setIndex) => (
                <View key={set.id} style={styles.setRow}>
                  <View style={styles.setHeader}>
                    <Text style={styles.setNumber}>SET {set.set_index}</Text>
                  </View>
                  
                  <View style={styles.setDetails}>
                    <View style={styles.setDetailItem}>
                      <Text style={styles.setDetailLabel}>TARGET WEIGHT</Text>
                      <Text style={styles.setDetailValue}>
                        {set.target_weight ? `${set.target_weight} kg` : 'Body Weight'}
                      </Text>
                    </View>
                    <View style={styles.setDetailItem}>
                      <Text style={styles.setDetailLabel}>TARGET REPS</Text>
                      <Text style={styles.setDetailValue}>{set.target_reps}</Text>
                    </View>
                    <View style={styles.setDetailItem}>
                      <Text style={styles.setDetailLabel}>REST</Text>
                      <Text style={styles.setDetailValue}>{set.target_rest}s</Text>
                    </View>
                  </View>
                  
                  {set.notes && (
                    <View style={styles.notesContainer}>
                      <Text style={styles.notesLabel}>NOTES</Text>
                      <Text style={styles.notesText}>{set.notes}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Action Buttons */}
      <SafeAreaView style={styles.actionContainer}>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={{
              backgroundColor: loadingTemplate ? theme.colors.neonDim : theme.colors.neon,
              borderRadius: 12,
              paddingVertical: theme.spacing.lg,
              alignItems: 'center',
              width: '100%',
              marginTop: 8,
            }}
            onPress={handleLoadTemplate}
            disabled={loadingTemplate}
          >
            {loadingTemplate ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator size="small" color={theme.colors.background} style={{ marginRight: 8 }} />
                <Text style={{
                  color: theme.colors.background,
                  fontFamily: theme.fonts.heading,
                  fontWeight: 'bold',
                  fontSize: 18,
                  letterSpacing: 1,
                  textAlign: 'center',
                }}>LOADING...</Text>
              </View>
            ) : (
              <Text style={{
                color: theme.colors.background,
                fontFamily: theme.fonts.heading,
                fontWeight: 'bold',
                fontSize: 18,
                letterSpacing: 1,
                textAlign: 'center',
              }}>LOAD TEMPLATE</Text>
            )}
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'black',
    padding: 12,
    justifyContent: 'flex-start',
  },
  status: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    marginTop: 40,
    marginLeft: 18,
    marginBottom: 4,
    letterSpacing: 2,
  },
  protocol: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    marginLeft: 18,
    marginBottom: 12,
    letterSpacing: 1,
    opacity: 0.7,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.neon,
    marginHorizontal: 18,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginHorizontal: CARD_MARGIN,
    paddingTop: 16,
    paddingBottom: 8,
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
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  backButton: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  templateHeader: {
    marginBottom: 18,
    marginHorizontal: CARD_MARGIN,
  },
  templateTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateName: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
    flex: 1,
  },
  favoriteIcon: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 24,
    marginLeft: 12,
  },
  favoriteIconActive: {
    color: theme.colors.neonBright,
  },
  templateDescription: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 12,
    opacity: 0.8,
    lineHeight: 16,
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
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 8,
    opacity: 0.6,
    textAlign: 'center',
  },
  metaContainer: {
    marginBottom: 18,
    marginHorizontal: CARD_MARGIN,
    alignItems: 'center',
  },
  metaLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 8,
    opacity: 0.6,
    marginBottom: 2,
  },
  metaValue: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 12,
    fontWeight: 'bold',
  },
  exercisesList: {
    flex: 1,
  },
  exerciseCard: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: CARD_MARGIN,
    backgroundColor: 'rgba(0,255,0,0.05)',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseNumber: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 8,
    opacity: 0.7,
  },
  exerciseName: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  exerciseDistance: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    opacity: 0.8,
  },
  setsContainer: {
    gap: 8,
  },
  setRow: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 6,
    padding: 12,
    backgroundColor: 'rgba(0,255,0,0.03)',
  },
  setHeader: {
    marginBottom: 8,
  },
  setNumber: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    opacity: 0.8,
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
    fontFamily: theme.fonts.code,
    fontSize: 8,
    opacity: 0.6,
    marginBottom: 2,
    textAlign: 'center',
  },
  setDetailValue: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  notesContainer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.neon,
    paddingTop: 8,
  },
  notesLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 8,
    opacity: 0.6,
    marginBottom: 2,
  },
  notesText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    opacity: 0.8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    marginTop: 16,
    letterSpacing: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: CARD_MARGIN,
  },
  errorText: {
    color: '#FF4444',
    fontFamily: theme.fonts.heading,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 6,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  actionContainer: {
    marginTop: 16,
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
  loadButton: {
    backgroundColor: '#0066CC',
    borderColor: theme.colors.neon,
  },
  loadButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
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
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
}); 