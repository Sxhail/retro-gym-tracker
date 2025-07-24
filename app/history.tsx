import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, SafeAreaView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../styles/theme';
import { getWorkoutHistory, formatDuration, formatDate, type WorkoutHistoryItem } from '../services/workoutHistory';

const GREEN = '#00FF00';
const LIGHT_GREEN = '#39FF14';
const FONT = 'monospace';
const { width } = require('react-native').Dimensions.get('window');
const CARD_MARGIN = 18;
const CARD_WIDTH = width - CARD_MARGIN * 2;

export default function HistoryListScreen() {
  const [workouts, setWorkouts] = useState<WorkoutHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const router = useRouter();

  const ITEMS_PER_PAGE = 10;

  // Load workout history
  const loadWorkoutHistory = async (isRefresh = false) => {
    try {
      setError(null);
      const offset = isRefresh ? 0 : page * ITEMS_PER_PAGE;
      const limit = ITEMS_PER_PAGE;
      
      const workoutData = await getWorkoutHistory(limit, offset);
      
      if (isRefresh) {
        setWorkouts(workoutData);
        setPage(0);
      } else {
        setWorkouts(prev => [...prev, ...workoutData]);
      }
      
      setHasMore(workoutData.length === limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workout history');
      console.error('Error loading workout history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load more workouts
  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
      loadWorkoutHistory();
    }
  };

  // Refresh workout history
  const onRefresh = () => {
    setRefreshing(true);
    loadWorkoutHistory(true);
  };

  // Load initial data
  useEffect(() => {
    loadWorkoutHistory(true);
  }, []);

  // Load more when page changes
  useEffect(() => {
    if (page > 0) {
      loadWorkoutHistory();
    }
  }, [page]);

  // Navigate to workout detail
  const handleWorkoutPress = (workoutId: number) => {
    router.push(`/history/${workoutId}`);
  };

  // Filter workouts based on search query
  const filteredWorkouts = useMemo(() => {
    if (!searchQuery.trim()) return workouts;
    return workouts.filter(workout => 
      workout.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      formatDate(workout.date).includes(searchQuery)
    );
  }, [workouts, searchQuery]);

  // Calculate total stats
  const totalWorkouts = workouts.length;
  const filteredWorkoutsCount = filteredWorkouts.length;
  const totalDuration = workouts.reduce((sum, workout) => sum + workout.duration, 0);
  const totalSets = workouts.reduce((sum, workout) => sum + workout.totalSets, 0);
  const averageWorkoutDuration = totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0;
  const averageSetsPerWorkout = totalWorkouts > 0 ? Math.round(totalSets / totalWorkouts) : 0;

  if (loading && workouts.length === 0) {
    return (
      <View style={styles.root}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>WORKOUT HISTORY</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.loadingText}>LOADING HISTORY...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Back Button at Top */}
      <View style={{ marginTop: 12, marginLeft: 8, marginBottom: 0, alignItems: 'flex-start' }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backButton, { color: theme.colors.neon, fontSize: 12, paddingVertical: 2, paddingHorizontal: 6 }]}>← BACK</Text>
        </TouchableOpacity>
      </View>
      {/* Header Section */}
      
      {/* App Title Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>WORKOUT HISTORY</Text>
          {totalWorkouts > 0 && (
            <View style={styles.workoutCountBadge}>
              <Text style={styles.workoutCountText}>{totalWorkouts}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerButtons}>
          {/* Removed extra back button from right side */}
        </View>
      </View>

      {/* Search Bar - left aligned below title */}
      {showSearch && (
        <View style={[styles.searchContainer, { alignSelf: 'flex-start', marginLeft: CARD_MARGIN, marginRight: CARD_MARGIN, width: '90%' }]}> 
          <TextInput
            style={styles.searchInput}
            placeholder="SEARCH WORKOUTS..."
            placeholderTextColor={theme.colors.neon}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Enhanced Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {searchQuery ? filteredWorkoutsCount : totalWorkouts}
          </Text>
          <Text style={styles.statLabel}>
            {searchQuery ? 'FOUND' : 'WORKOUTS'}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{formatDuration(totalDuration)}</Text>
          <Text style={styles.statLabel}>TOTAL TIME</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalSets}</Text>
          <Text style={styles.statLabel}>TOTAL SETS</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{formatDuration(averageWorkoutDuration)}</Text>
          <Text style={styles.statLabel}>AVG TIME</Text>
        </View>
      </View>

      {/* Workout List */}
      <ScrollView 
        style={styles.list} 
        contentContainerStyle={{ paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GREEN}
            colors={[GREEN]}
          />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 20;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
            loadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>ERROR: {error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => loadWorkoutHistory(true)}>
              <Text style={styles.retryButtonText}>RETRY</Text>
            </TouchableOpacity>
          </View>
        )}

        {workouts.length === 0 && !loading && !error ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>NO WORKOUTS YET</Text>
            <TouchableOpacity 
              style={styles.newWorkoutButton} 
              onPress={() => router.push('/new')}
            >
              <Text style={styles.newWorkoutButtonText}>+ START WORKOUT</Text>
            </TouchableOpacity>
          </View>
        ) : searchQuery && filteredWorkouts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>NO MATCHES FOUND</Text>
            <Text style={styles.emptyText}>Try a different search term.</Text>
            <TouchableOpacity 
              style={styles.clearSearchButton}
              onPress={() => setSearchQuery('')}
            >
              <Text style={styles.clearSearchText}>CLEAR SEARCH</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredWorkouts.map((workout, index) => (
            <TouchableOpacity 
              key={workout.id} 
              style={styles.workoutCard} 
              activeOpacity={0.8}
              onPress={() => handleWorkoutPress(workout.id)}
            >
              <View style={styles.workoutHeader}>
                <Text style={styles.workoutTitle}>{workout.name}</Text>
                <Text style={styles.workoutDate}>{formatDate(workout.date)}</Text>
              </View>
              
              <View style={styles.workoutDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>DURATION</Text>
                  <Text style={styles.detailValue}>{formatDuration(workout.duration)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>EXERCISES</Text>
                  <Text style={styles.detailValue}>{workout.exerciseCount}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>SETS</Text>
                  <Text style={styles.detailValue}>{workout.totalSets}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        {loading && workouts.length > 0 && (
          <View style={styles.loadingMoreContainer}>
            <ActivityIndicator size="small" color={GREEN} />
            <Text style={styles.loadingMoreText}>LOADING MORE...</Text>
          </View>
        )}

        {!hasMore && workouts.length > 0 && (
          <View style={styles.endContainer}>
            <Text style={styles.endText}>END OF HISTORY</Text>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}></View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'black',
    padding: 0,
    justifyContent: 'flex-start',
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
    marginTop: 18,
    marginBottom: 8,
    marginHorizontal: CARD_MARGIN,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.display,
    fontWeight: 'bold',
    fontSize: 28,
    letterSpacing: 2,
  },
  workoutCountBadge: {
    backgroundColor: LIGHT_GREEN,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 24,
    alignItems: 'center',
  },
  workoutCountText: {
    color: 'black',
    fontFamily: theme.fonts.heading,
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchButton: {
    // removed search button style
    // borderWidth: 1,
    // borderColor: GREEN,
    // borderRadius: 6,
    // paddingVertical: 4,
    // paddingHorizontal: 8,
    // backgroundColor: 'transparent',
  },
  searchButtonText: {
    // removed search button text style
    // color: GREEN,
    // fontFamily: theme.fonts.body,
    // fontSize: 16,
  },
  backButton: {
    color: GREEN,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    borderWidth: 1,
    borderColor: GREEN,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: CARD_MARGIN,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: GREEN,
    borderRadius: 6,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  searchInput: {
    flex: 1,
    color: GREEN,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    paddingVertical: 8,
  },
  clearSearchButton: {
    borderWidth: 1,
    borderColor: GREEN,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  clearSearchText: {
    color: GREEN,
    fontFamily: theme.fonts.heading,
    fontSize: 12,
    fontWeight: 'bold',
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
  list: {
    marginTop: 0,
    marginHorizontal: CARD_MARGIN,
  },
  workoutCard: {
    borderWidth: 1,
    borderColor: GREEN,
    borderRadius: 8,
    padding: 18,
    marginBottom: 18,
    backgroundColor: 'transparent',
    width: '100%',
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  workoutTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontWeight: 'bold',
    fontSize: 20,
    letterSpacing: 1.2,
    flex: 1,
  },
  workoutDate: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    opacity: 0.8,
  },
  workoutDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 10,
    opacity: 0.7,
    textAlign: 'center',
  },
  detailValue: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 16,
    fontWeight: 'bold',
  },
  arrow: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 24,
    position: 'absolute',
    right: 18,
    top: '50%',
    marginTop: -12,
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
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingMoreText: {
    color: GREEN,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    marginLeft: 12,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    color: '#FF4444',
    fontFamily: theme.fonts.body,
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
    fontFamily: theme.fonts.body,
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 1,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    marginTop: 8,
  },
  newWorkoutButton: {
    backgroundColor: theme.colors.neon,
    borderRadius: 12,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    width: '100%',
  },
  newWorkoutButtonText: {
    color: theme.colors.background,
    fontFamily: theme.fonts.heading,
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1,
  },
  endContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  endText: {
    color: GREEN,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    opacity: 0.6,
    letterSpacing: 1,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 0,
  },
}); 