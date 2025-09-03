import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import theme from '../../styles/theme';
// import AnatomyViewer from '../anatomy/AnatomyViewer'; // REMOVED - Will be replaced with Body Highlighter
import { getMuscleActivationMap, getMuscleStatistics, compareMuscleActivation } from '../../services/muscleAnalytics';
import { VIEW_MODE_CONFIG, TRAINING_LEVEL_CONFIG } from '../anatomy/training-levels';
import type { MuscleActivationResult } from '../../services/muscleAnalytics';
import type { ViewMode, MuscleId, TrainingLevel, Gender, AnatomySide } from '../anatomy/muscles';

export interface MuscleActivationStatsProps {
  className?: string;
}

export const MuscleActivationStats: React.FC<MuscleActivationStatsProps> = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [activationData, setActivationData] = useState<MuscleActivationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonData, setComparisonData] = useState<any>(null);
  
  // Anatomy viewer state
  const [anatomyGender, setAnatomyGender] = useState<Gender>('male');
  const [anatomySide, setAnatomySide] = useState<AnatomySide>('front');

  // Load muscle activation data
  const loadActivationData = async (date: Date = new Date(), mode: ViewMode = viewMode) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getMuscleActivationMap(mode, date);
      setActivationData(data);
      
      // Also load comparison data if enabled
      if (showComparison) {
        const config = VIEW_MODE_CONFIG[mode];
        const previousDate = new Date(date);
        previousDate.setDate(previousDate.getDate() - config.daysBack);
        
        const comparison = await compareMuscleActivation(date, previousDate, mode);
        setComparisonData(comparison);
      }
    } catch (err) {
      console.error('Error loading activation data:', err);
      setError('Failed to load muscle activation data');
    } finally {
      setLoading(false);
    }
  };

  // Handle muscle press for detailed stats
  const handleMusclePress = async (muscleId: MuscleId) => {
    try {
      const stats = await getMuscleStatistics(muscleId, viewMode, selectedDate);
      
      Alert.alert(
        `${stats.muscleName} Stats`,
        `Training Level: ${stats.trainingLevel.toUpperCase()}\\n` +
        `Total Volume: ${stats.volume.toLocaleString()}\\n` +
        `Sets: ${stats.sets}\\n` +
        `Workouts: ${stats.workouts}\\n\\n` +
        `Top Exercises:\\n${stats.exercises.slice(0, 3).map(ex => `• ${ex.name} (${ex.volume.toLocaleString()})`).join('\\n')}`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.error('Error getting muscle stats:', err);
      Alert.alert('Error', 'Failed to load muscle statistics');
    }
  };

  // Handle view mode change
  const handleViewModeChange = (newMode: ViewMode) => {
    setViewMode(newMode);
    loadActivationData(selectedDate, newMode);
  };

  // Toggle comparison view
  const toggleComparison = () => {
    const newShowComparison = !showComparison;
    setShowComparison(newShowComparison);
    
    if (newShowComparison) {
      loadActivationData(selectedDate, viewMode);
    } else {
      setComparisonData(null);
    }
  };

  // Anatomy view handlers
  const handleGenderToggle = (gender: Gender) => {
    setAnatomyGender(gender);
  };

  const handleSideToggle = () => {
    setAnatomySide(prev => prev === 'front' ? 'back' : 'front');
  };

  // Load data on component mount and when dependencies change
  useEffect(() => {
    loadActivationData();
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Muscle Activation Map</Text>
        <Text style={styles.subtitle}>
          {VIEW_MODE_CONFIG[viewMode].description}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {/* View Mode Selector */}
        <View style={styles.viewModeContainer}>
          {(Object.keys(VIEW_MODE_CONFIG) as ViewMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.viewModeButton,
                viewMode === mode && styles.viewModeButtonActive
              ]}
              onPress={() => handleViewModeChange(mode)}
            >
              <Text style={[
                styles.viewModeText,
                viewMode === mode && styles.viewModeTextActive
              ]}>
                {VIEW_MODE_CONFIG[mode].label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Comparison Toggle */}
        <TouchableOpacity
          style={[styles.comparisonButton, showComparison && styles.comparisonButtonActive]}
          onPress={toggleComparison}
        >
          <Text style={[
            styles.comparisonText,
            showComparison && styles.comparisonTextActive
          ]}>
            Compare Periods
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.neon} />
            <Text style={styles.loadingText}>Analyzing muscle activation...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => loadActivationData()}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : activationData ? (
          <>
            {/* Summary Stats */}
            <View style={styles.summaryContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {activationData.totalVolume.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>Total Volume</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {Object.keys(activationData.muscleStates).length}
                </Text>
                <Text style={styles.statLabel}>Muscles Trained</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {Object.values(activationData.muscleStates).filter(level => level === 'optimal').length}
                </Text>
                <Text style={styles.statLabel}>Optimal</Text>
              </View>
            </View>

            {/* Anatomy Viewer */}
            <View style={styles.anatomyContainer}>
              {/* PLACEHOLDER: AnatomyViewer will be replaced with React Native Body Highlighter */}
              <View style={styles.placeholderContainer}>
                <Text style={styles.placeholderTitle}>🚧 Anatomy View - Under Refactoring</Text>
                <Text style={styles.placeholderText}>
                  The anatomy viewer is being upgraded to use React Native Body Highlighter
                </Text>
                <Text style={styles.placeholderStats}>
                  Total muscles tracked: {Object.keys(activationData.muscleStates).length}
                </Text>
                <Text style={styles.placeholderStats}>
                  Training volume: {activationData.totalVolume.toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Training Level Legend */}
            <View style={styles.legendContainer}>
              <Text style={styles.legendTitle}>Training Levels</Text>
              <View style={styles.legendGrid}>
                {(Object.keys(TRAINING_LEVEL_CONFIG) as TrainingLevel[]).map((level) => {
                  const config = TRAINING_LEVEL_CONFIG[level];
                  return (
                    <View key={level} style={styles.legendItem}>
                      <View
                        style={[
                          styles.legendColor,
                          { backgroundColor: config.color }
                        ]}
                      />
                      <View style={styles.legendTextContainer}>
                        <Text style={styles.legendLevel}>{level.toUpperCase()}</Text>
                        <Text style={styles.legendDescription}>
                          {config.description}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Comparison Data */}
            {showComparison && comparisonData && (
              <View style={styles.comparisonContainer}>
                <Text style={styles.comparisonTitle}>Period Comparison</Text>
                <Text style={styles.comparisonSubtitle}>
                  Current vs Previous {VIEW_MODE_CONFIG[viewMode].label.toLowerCase()}
                </Text>
                
                <View style={styles.comparisonStats}>
                  <View style={styles.comparisonStat}>
                    <Text style={styles.comparisonValue}>
                      {((comparisonData.current.totalVolume - comparisonData.previous.totalVolume) / 
                        (comparisonData.previous.totalVolume || 1) * 100).toFixed(1)}%
                    </Text>
                    <Text style={styles.comparisonLabel}>Volume Change</Text>
                  </View>
                  
                  <View style={styles.comparisonStat}>
                    <Text style={styles.comparisonValue}>
                      {comparisonData.changes.filter((c: any) => c.currentLevel !== c.previousLevel).length}
                    </Text>
                    <Text style={styles.comparisonLabel}>Level Changes</Text>
                  </View>
                </View>

                <View style={styles.changesContainer}>
                  <Text style={styles.changesTitle}>Biggest Changes</Text>
                  {comparisonData.changes.slice(0, 5).map((change: any) => (
                    <View key={change.muscleId} style={styles.changeItem}>
                      <Text style={styles.changeMuscleName}>
                        {change.muscleId.charAt(0).toUpperCase() + change.muscleId.slice(1)}
                      </Text>
                      <Text style={styles.changeDetails}>
                        {change.previousLevel} → {change.currentLevel} ({change.percentChange.toFixed(1)}%)
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No workout data available</Text>
            <Text style={styles.emptySubtext}>
              Complete some workouts to see your muscle activation map
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.backgroundOverlay,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.neon,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  controls: {
    padding: 20,
    paddingBottom: 10,
  },
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundOverlay,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderRadius: 8,
  },
  viewModeButtonActive: {
    backgroundColor: theme.colors.neon,
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  viewModeTextActive: {
    color: theme.colors.background,
  },
  comparisonButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.neon,
    alignItems: 'center',
  },
  comparisonButtonActive: {
    backgroundColor: theme.colors.neon,
  },
  comparisonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.neon,
  },
  comparisonTextActive: {
    color: theme.colors.background,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.neon,
    borderRadius: 8,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.background,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: theme.colors.backgroundOverlay,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.neon,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  anatomyContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  legendContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: theme.colors.backgroundOverlay,
    borderRadius: 12,
  },
  legendTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  legendGrid: {
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendLevel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  legendDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  comparisonContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: theme.colors.backgroundOverlay,
    borderRadius: 12,
  },
  comparisonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  comparisonSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  comparisonStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  comparisonStat: {
    alignItems: 'center',
  },
  comparisonValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.neon,
    marginBottom: 4,
  },
  comparisonLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  changesContainer: {
    gap: 8,
  },
  changesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  changeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
  },
  changeMuscleName: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  changeDetails: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  // Placeholder styles for anatomy refactor
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: theme.colors.backgroundOverlay,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.neon,
    borderStyle: 'dashed',
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.neon,
    marginBottom: 12,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  placeholderStats: {
    fontSize: 12,
    color: theme.colors.text,
    marginBottom: 4,
  },
});
