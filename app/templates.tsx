import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, SafeAreaView, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import theme from '../styles/theme';
import { getTemplates, getTemplatesByCategory, searchTemplates, loadTemplateIntoSession, type WorkoutTemplate } from '../services/workoutTemplates';
import { useWorkoutSession } from '../context/WorkoutSessionContext';

const { width } = require('react-native').Dimensions.get('window');
const CARD_MARGIN = 18;
const CARD_WIDTH = width - CARD_MARGIN * 2;



export default function TemplatesScreen() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  
  // Use workout session context
  const {
    setCurrentExercises,
    setWorkoutName,
    startWorkout,
    resetSession
  } = useWorkoutSession();

  // Load templates
  const loadTemplates = async (search = searchTerm) => {
    try {
      setError(null);
      let templatesData: WorkoutTemplate[] = [];

      if (search.trim()) {
        templatesData = await searchTemplates(search.trim());
      } else {
        templatesData = await getTemplates();
      }

      setTemplates(templatesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle search
  const handleSearch = (text: string) => {
    setSearchTerm(text);
    setLoading(true);
    loadTemplates(text);
  };

  // Handle template selection - directly load template and start workout
  const handleTemplateSelect = async (template: WorkoutTemplate) => {
    try {
      setLoadingTemplate(template.id);
      
      // Reset any existing session
      await resetSession();
      
      // Load template data
      const templateData = await loadTemplateIntoSession(template.id);
      
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
      setLoadingTemplate(null);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadTemplates();
  };

  // Load data on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // In TemplatesScreen, add useFocusEffect to reload templates when the screen is focused or when params change
  useFocusEffect(
    React.useCallback(() => {
      loadTemplates();
    }, [/* dependencies: add any param or navigation state if needed */])
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
              <TouchableOpacity onPress={() => router.back()} style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
        <Text style={styles.backButton}>←</Text>
      </TouchableOpacity>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { marginTop: 24 }]}>WORKOUT TEMPLATES</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.neon} />
          <Text style={styles.loadingText}>LOADING TEMPLATES...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Section */}
      {/* Header Row */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>TEMPLATES</Text>
        <View style={{ width: 36 }} />
      </View>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="SEARCH TEMPLATES..."
          placeholderTextColor={theme.colors.neon + '80'}
          value={searchTerm}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Templates List */}
      <ScrollView
        style={styles.templatesList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <ActivityIndicator
            size="small"
            color={theme.colors.neon}
            animating={refreshing}
          />
        }
        onScrollBeginDrag={() => {
          if (refreshing) return;
          handleRefresh();
        }}
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>ERROR: {error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadTemplates()}>
              <Text style={styles.retryButtonText}>RETRY</Text>
            </TouchableOpacity>
          </View>
        ) : templates.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>NO TEMPLATES FOUND</Text>
            <Text style={styles.emptySubtext}>
              {searchTerm ? 'Try adjusting your search terms' : 'Create your first workout template'}
            </Text>
          </View>
        ) : (
          templates.map((template) => (
            <TouchableOpacity
              key={template.id}
              style={styles.templateCard}
              onPress={() => handleTemplateSelect(template)}
              disabled={loadingTemplate === template.id}
            >
              <View style={styles.templateHeader}>
                <Text style={styles.templateName}>{template.name}</Text>
                {template.is_favorite && (
                  <Text style={styles.favoriteBadge}>★</Text>
                )}
              </View>
              {template.description && (
                <Text style={styles.templateDescription}>{template.description}</Text>
              )}
              <View style={styles.templateMeta}>
                {template.category && (
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>CATEGORY</Text>
                    <Text style={styles.metaValue}>{template.category.toUpperCase()}</Text>
                  </View>
                )}
                {template.difficulty && (
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>DIFFICULTY</Text>
                    <Text style={styles.metaValue}>{template.difficulty.toUpperCase()}</Text>
                  </View>
                )}
                {template.estimated_duration && (
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>DURATION</Text>
                    <Text style={styles.metaValue}>{template.estimated_duration} MIN</Text>
                  </View>
                )}
              </View>
              <View style={styles.templateAction}>
                {loadingTemplate === template.id ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <ActivityIndicator size="small" color={theme.colors.neon} style={{ marginRight: 8 }} />
                    <Text style={styles.templateActionText}>LOADING...</Text>
                  </View>
                ) : (
                  <Text style={styles.templateActionText}>TAP TO LOAD TEMPLATE</Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      {/* + CREATE TEMPLATE Button at bottom */}
      <View style={{ marginTop: 16, marginBottom: 20, alignItems: 'center' }}>
        <TouchableOpacity
          style={{
            backgroundColor: theme.colors.neon,
            borderRadius: 10,
            paddingVertical: 14,
            alignItems: 'center',
            width: '85%',
          }}
          onPress={() => router.push('/templates/create')}
        >
          <Text style={{
            color: theme.colors.background,
            fontFamily: theme.fonts.heading,
            fontWeight: 'bold',
            fontSize: 16,
            letterSpacing: 1,
            textAlign: 'center',
          }}>+ CREATE TEMPLATE</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
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
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 16,
    minHeight: 56,
  },
  backButtonArea: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontFamily: theme.fonts.body,
    fontSize: 36,
    fontWeight: 'bold',
  },
  searchContainer: {
    marginBottom: 12,
    marginHorizontal: CARD_MARGIN,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 13,
    backgroundColor: 'rgba(22,145,58,0.03)',
  },

  templatesList: {
    flex: 1,
  },
  templateCard: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    marginHorizontal: CARD_MARGIN,
    backgroundColor: 'rgba(22,145,58,0.03)',
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  templateName: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    flex: 1,
  },
  favoriteBadge: {
    color: theme.colors.neonBright,
    fontFamily: theme.fonts.code,
    fontSize: 20,
  },
  templateDescription: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 11,
    opacity: 0.8,
    marginBottom: 8,
    lineHeight: 14,
  },
  templateMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metaItem: {
    alignItems: 'center',
    flex: 1,
  },
  metaLabel: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.code,
    fontSize: 8,
    opacity: 0.6,
    marginBottom: 2,
    textAlign: 'center',
  },
  metaValue: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  templateAction: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.neon,
    paddingTop: 8,
    alignItems: 'center',
  },
  templateActionText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textSecondary,
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
    color: theme.colors.error,
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
    fontFamily: theme.fonts.body,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: CARD_MARGIN,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  emptySubtext: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.7,
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
  createButton: {
    backgroundColor: '#0066CC',
    borderColor: theme.colors.neon,
  },
  createButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
}); 