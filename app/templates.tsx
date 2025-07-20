import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, SafeAreaView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../styles/theme';
import { getTemplates, getTemplatesByCategory, searchTemplates, type WorkoutTemplate } from '../services/workoutTemplates';

const GREEN = '#00FF00';
const LIGHT_GREEN = '#39FF14';
const FONT = 'monospace';
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
        <Text style={styles.status}>■ SYSTEM ONLINE</Text>
        <Text style={styles.protocol}>RETRO FITNESS PROTOCOL</Text>
        <View style={styles.divider} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>WORKOUT TEMPLATES</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← BACK</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.loadingText}>LOADING TEMPLATES...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header Section */}
      <Text style={styles.status}>■ SYSTEM ONLINE</Text>
      <Text style={styles.protocol}>RETRO FITNESS PROTOCOL</Text>
      <View style={styles.divider} />
      
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>WORKOUT TEMPLATES</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← BACK</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="SEARCH TEMPLATES..."
          placeholderTextColor={GREEN + '80'}
          value={searchTerm}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Category Filter */}
      <ScrollView 
        horizontal 
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

      {/* Templates List */}
      <ScrollView 
        style={styles.templatesList} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <ActivityIndicator 
            size="small" 
            color={GREEN} 
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
                <Text style={styles.templateActionText}>TAP TO LOAD TEMPLATE</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Action Buttons */}
      <SafeAreaView style={styles.actionContainer}>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.createButton]} 
            onPress={() => {
              // Navigate to template creation
              Alert.alert('Create Template', 'Template creation coming soon!');
            }}
          >
            <Text style={styles.createButtonText}>📝 CREATE TEMPLATE</Text>
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
    padding: 18,
    justifyContent: 'flex-start',
  },
  status: {
    color: GREEN,
    fontFamily: FONT,
    fontSize: 12,
    marginTop: 40,
    marginLeft: 18,
    marginBottom: 4,
    letterSpacing: 2,
  },
  protocol: {
    color: GREEN,
    fontFamily: FONT,
    fontSize: 10,
    marginLeft: 18,
    marginBottom: 12,
    letterSpacing: 1,
    opacity: 0.7,
  },
  divider: {
    height: 1,
    backgroundColor: GREEN,
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
    color: GREEN,
    fontFamily: FONT,
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  backButton: {
    color: GREEN,
    fontFamily: FONT,
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
    borderColor: GREEN,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: GREEN,
    fontFamily: FONT,
    fontSize: 14,
    backgroundColor: 'rgba(0,255,0,0.05)',
  },
  categoryContainer: {
    marginBottom: 16,
  },
  categoryContent: {
    paddingHorizontal: CARD_MARGIN,
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
  },
  templatesList: {
    flex: 1,
  },
  templateCard: {
    borderWidth: 1,
    borderColor: GREEN,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: CARD_MARGIN,
    backgroundColor: 'rgba(0,255,0,0.05)',
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateName: {
    color: GREEN,
    fontFamily: FONT,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
    flex: 1,
  },
  favoriteBadge: {
    color: LIGHT_GREEN,
    fontFamily: FONT,
    fontSize: 20,
  },
  templateDescription: {
    color: GREEN,
    fontFamily: FONT,
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
    color: GREEN,
    fontFamily: FONT,
    fontSize: 8,
    opacity: 0.6,
    marginBottom: 2,
    textAlign: 'center',
  },
  metaValue: {
    color: GREEN,
    fontFamily: FONT,
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  templateAction: {
    borderTopWidth: 1,
    borderTopColor: GREEN,
    paddingTop: 12,
    alignItems: 'center',
  },
  templateActionText: {
    color: GREEN,
    fontFamily: FONT,
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
    color: GREEN,
    fontFamily: FONT,
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
    fontFamily: FONT,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    borderWidth: 1,
    borderColor: GREEN,
    borderRadius: 6,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: GREEN,
    fontFamily: FONT,
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
    color: GREEN,
    fontFamily: FONT,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  emptySubtext: {
    color: GREEN,
    fontFamily: FONT,
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
    borderColor: GREEN,
  },
  createButtonText: {
    color: GREEN,
    fontFamily: FONT,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
}); 