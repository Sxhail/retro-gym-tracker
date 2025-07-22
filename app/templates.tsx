import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, SafeAreaView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../styles/theme';
import { getTemplates, getTemplatesByCategory, searchTemplates, type WorkoutTemplate } from '../services/workoutTemplates';

<<<<<<< HEAD
const GREEN = '#00FF00';
const LIGHT_GREEN = '#39FF14';
const FONT = 'monospace';
=======
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
const { width } = require('react-native').Dimensions.get('window');
const CARD_MARGIN = 18;
const CARD_WIDTH = width - CARD_MARGIN * 2;

const CATEGORIES = [
  { id: 'all', name: 'ALL TEMPLATES' },
  { id: 'strength', name: 'STRENGTH' },
  { id: 'cardio', name: 'CARDIO' },
  { id: 'flexibility', name: 'FLEXIBILITY' },
  { id: 'favorites', name: 'FAVORITES' },
];

export default function TemplatesScreen() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // Load templates
  const loadTemplates = async (category = selectedCategory, search = searchTerm) => {
    try {
      setError(null);
      let templatesData: WorkoutTemplate[] = [];

      if (search.trim()) {
        templatesData = await searchTemplates(search.trim());
      } else if (category === 'favorites') {
        templatesData = await getTemplates(true);
      } else if (category === 'all') {
        templatesData = await getTemplates();
      } else {
        templatesData = await getTemplatesByCategory(category);
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

  // Handle category selection
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setLoading(true);
    loadTemplates(category, searchTerm);
  };

  // Handle search
  const handleSearch = (text: string) => {
    setSearchTerm(text);
    if (text.trim()) {
      setLoading(true);
      loadTemplates(selectedCategory, text);
    } else {
      setLoading(true);
      loadTemplates(selectedCategory, '');
    }
  };

  // Handle template selection
  const handleTemplateSelect = (template: WorkoutTemplate) => {
    Alert.alert(
      'Load Template',
      `Load "${template.name}" into a new workout?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Load Template',
          onPress: () => {
            // Navigate to new workout with template ID
            router.push({
              pathname: '/new',
              params: { templateId: template.id.toString() }
            });
          }
        }
      ]
    );
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

  if (loading && !refreshing) {
    return (
      <View style={styles.root}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>WORKOUT TEMPLATES</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← BACK</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
<<<<<<< HEAD
          <ActivityIndicator size="large" color={GREEN} />
=======
          <ActivityIndicator size="large" color={theme.colors.neon} />
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
          <Text style={styles.loadingText}>LOADING TEMPLATES...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header Section */}
<<<<<<< HEAD
      
=======
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>WORKOUT TEMPLATES</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← BACK</Text>
        </TouchableOpacity>
      </View>
<<<<<<< HEAD

=======
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="SEARCH TEMPLATES..."
<<<<<<< HEAD
          placeholderTextColor={GREEN + '80'}
=======
          placeholderTextColor={theme.colors.neon + '80'}
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
          value={searchTerm}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
<<<<<<< HEAD

      {/* Category Filter */}
      <ScrollView 
        horizontal 
=======
      {/* Category Filter */}
      <ScrollView
        horizontal
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory === category.id && styles.categoryChipActive
            ]}
            onPress={() => handleCategorySelect(category.id)}
          >
            <Text style={[
              styles.categoryText,
              selectedCategory === category.id && styles.categoryTextActive
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
<<<<<<< HEAD

      {/* Templates List */}
      <ScrollView 
        style={styles.templatesList} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <ActivityIndicator 
            size="small" 
            color={GREEN} 
=======
      {/* Templates List */}
      <ScrollView
        style={styles.templatesList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <ActivityIndicator
            size="small"
            color={theme.colors.neon}
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
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
            >
              <View style={styles.templateHeader}>
                <Text style={styles.templateName}>{template.name}</Text>
                {template.is_favorite && (
                  <Text style={styles.favoriteBadge}>★</Text>
                )}
              </View>
<<<<<<< HEAD
              
              {template.description && (
                <Text style={styles.templateDescription}>{template.description}</Text>
              )}
              
=======
              {template.description && (
                <Text style={styles.templateDescription}>{template.description}</Text>
              )}
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
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
<<<<<<< HEAD
              
=======
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
              <View style={styles.templateAction}>
                <Text style={styles.templateActionText}>TAP TO LOAD TEMPLATE</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
<<<<<<< HEAD

=======
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
      {/* + CREATE TEMPLATE Button at bottom */}
      <View style={{ marginTop: 24, marginBottom: 24, alignItems: 'center' }}>
        <TouchableOpacity
          style={{
            backgroundColor: theme.colors.neon,
            borderRadius: 12,
            paddingVertical: theme.spacing.lg,
            alignItems: 'center',
            width: '90%',
          }}
          onPress={() => router.push('/templates/create')}
        >
          <Text style={{
            color: theme.colors.background,
            fontFamily: theme.fonts.heading,
            fontWeight: 'bold',
            fontSize: 18,
            letterSpacing: 1,
            textAlign: 'center',
          }}>+ CREATE TEMPLATE</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
<<<<<<< HEAD
    backgroundColor: 'black',
    padding: 18,
    justifyContent: 'flex-start',
  },
  status: {
    color: GREEN,
=======
    backgroundColor: theme.colors.background,
    padding: 0,
    justifyContent: 'flex-start',
  },
  status: {
    color: theme.colors.neon,
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
    fontFamily: theme.fonts.code,
    fontSize: 12,
    marginTop: 40,
    marginLeft: 18,
    marginBottom: 4,
    letterSpacing: 2,
  },
  protocol: {
<<<<<<< HEAD
    color: GREEN,
=======
    color: theme.colors.neon,
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
    fontFamily: theme.fonts.code,
    fontSize: 10,
    marginLeft: 18,
    marginBottom: 12,
    letterSpacing: 1,
    opacity: 0.7,
  },
  divider: {
    height: 1,
<<<<<<< HEAD
    backgroundColor: GREEN,
=======
    backgroundColor: theme.colors.neon,
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
    marginHorizontal: 18,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginHorizontal: CARD_MARGIN,
  },
  title: {
<<<<<<< HEAD
    color: GREEN,
=======
    color: theme.colors.neon,
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
    fontFamily: theme.fonts.display,
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  backButton: {
<<<<<<< HEAD
    color: GREEN,
=======
    color: theme.colors.neon,
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
    fontFamily: theme.fonts.heading,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  searchContainer: {
    marginBottom: 16,
    marginHorizontal: CARD_MARGIN,
  },
  searchInput: {
    borderWidth: 1,
<<<<<<< HEAD
    borderColor: GREEN,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: GREEN,
    fontFamily: FONT,
    fontSize: 14,
    backgroundColor: 'rgba(0,255,0,0.05)',
=======
    borderColor: theme.colors.neon,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    backgroundColor: 'rgba(22,145,58,0.05)', // theme.colors.neon with opacity
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryContent: {
    paddingHorizontal: CARD_MARGIN,
<<<<<<< HEAD
    gap: 8,
  },
  categoryChip: {
    borderWidth: 1,
    borderColor: GREEN,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  categoryChipActive: {
    backgroundColor: GREEN,
  },
  categoryText: {
    color: GREEN,
    fontFamily: FONT,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  categoryTextActive: {
    color: 'black',
=======
    gap: 6, // slightly reduced gap
  },
  categoryChip: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 10,
    paddingHorizontal: 8, // reduced from 10
    paddingVertical: 4,
    backgroundColor: 'transparent',
    minWidth: 70, // set a tighter min width
    maxWidth: 110, // set a max width to prevent overflow
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipActive: {
    backgroundColor: theme.colors.neon,
  },
  categoryText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
    flexShrink: 1, // allow text to shrink
  },
  categoryTextActive: {
    color: theme.colors.background,
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
  },
  templatesList: {
    flex: 1,
  },
  templateCard: {
    borderWidth: 1,
<<<<<<< HEAD
    borderColor: GREEN,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: CARD_MARGIN,
    backgroundColor: 'rgba(0,255,0,0.05)',
=======
    borderColor: theme.colors.neonDim,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: CARD_MARGIN,
    backgroundColor: 'rgba(22,145,58,0.05)',
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateName: {
<<<<<<< HEAD
    color: GREEN,
=======
    color: theme.colors.neon,
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
    fontFamily: theme.fonts.heading,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
    flex: 1,
  },
  favoriteBadge: {
<<<<<<< HEAD
    color: LIGHT_GREEN,
=======
    color: theme.colors.neonBright,
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
    fontFamily: theme.fonts.code,
    fontSize: 20,
  },
  templateDescription: {
<<<<<<< HEAD
    color: GREEN,
    fontFamily: FONT,
=======
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 12,
    lineHeight: 16,
  },
  templateMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaItem: {
    alignItems: 'center',
    flex: 1,
  },
  metaLabel: {
<<<<<<< HEAD
    color: GREEN,
    fontFamily: FONT,
=======
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.code,
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
    fontSize: 8,
    opacity: 0.6,
    marginBottom: 2,
    textAlign: 'center',
  },
  metaValue: {
<<<<<<< HEAD
    color: GREEN,
    fontFamily: FONT,
=======
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  templateAction: {
    borderTopWidth: 1,
<<<<<<< HEAD
    borderTopColor: GREEN,
=======
    borderTopColor: theme.colors.neon,
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
    paddingTop: 12,
    alignItems: 'center',
  },
  templateActionText: {
<<<<<<< HEAD
    color: GREEN,
    fontFamily: FONT,
=======
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
    fontSize: 12,
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
<<<<<<< HEAD
    color: '#FF4444',
    fontFamily: FONT,
=======
    color: theme.colors.error,
    fontFamily: theme.fonts.heading,
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    borderWidth: 1,
<<<<<<< HEAD
    borderColor: GREEN,
=======
    borderColor: theme.colors.neon,
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
    borderRadius: 6,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
<<<<<<< HEAD
    color: GREEN,
    fontFamily: FONT,
=======
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
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
<<<<<<< HEAD
    color: GREEN,
=======
    color: theme.colors.textSecondary,
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
    fontFamily: theme.fonts.body,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  emptySubtext: {
<<<<<<< HEAD
    color: GREEN,
    fontFamily: FONT,
=======
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
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
<<<<<<< HEAD
    borderColor: GREEN,
  },
  createButtonText: {
    color: GREEN,
    fontFamily: FONT,
=======
    borderColor: theme.colors.neon,
  },
  createButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
}); 