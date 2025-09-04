import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator, SafeAreaView, TextInput, Modal, FlatList, Alert, Animated, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import theme from '../styles/theme';
import PageTransition from '../components/PageTransition';
import { getWorkoutHistory, getTotalWorkoutStats, formatDuration, formatDate, type WorkoutHistoryItem, getWorkoutsOnDate } from '../services/workoutHistory';
import { getCardioHistory, getTotalCardioStats, formatCardioDate, getCardioTypeDisplayName, type CardioSessionWithStats, getCardioSessionsForDateRange } from '../services/cardioTracking';
import * as DocumentPicker from 'expo-document-picker';
import Papa from 'papaparse';
import * as FileSystem from 'expo-file-system';
import { db } from '../db/client';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import { Picker } from '@react-native-picker/picker';
import AttendanceCalendar from '../components/AttendanceCalendar';
import { BottomNav } from '../components/BottomNav';

const GREEN = '#00FF00';
const LIGHT_GREEN = '#39FF14';
const FONT = 'monospace';
const { width } = Dimensions.get('window');
const CARD_MARGIN = 18;
const CARD_WIDTH = width - CARD_MARGIN * 2;

const MUSCLE_GROUP_OPTIONS = [
  'Chest', 'Back', 'Legs', 'Glutes', 'Shoulders', 'Triceps', 'Biceps', 'Core', 'Arms', 'Unknown'
];
const CATEGORY_OPTIONS = [
  'Barbell', 'Dumbbell', 'Machine', 'Smith Machine', 'Bodyweight', 'Cable', 'Trap Bar', 'Kettlebell', 'Band', 'Other', 'Unknown'
];

// Helper to format duration as hours only (e.g., "5 HRS")
function formatDurationAsHours(seconds: number): string {
  const hours = Math.round(seconds / 3600);
  return `${hours.toString().padStart(3, '0')} HRS`;
}

// Helper to format duration as HR MIN format (e.g., "1HR 30MIN")
function formatDurationAsHrMin(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours === 0) {
    return `${minutes}MIN`;
  } else if (minutes === 0) {
    return `${hours}HR`;
  } else {
    return `${hours}HR ${minutes}MIN`;
  }
}

// Helper to parse duration like '1h 20m', '1hr 20min', '2 hours 5 minutes', etc. to seconds
function parseDurationToSeconds(durationStr: string): number {
  if (!durationStr) return 0;
  let total = 0;
  // Match hours (e.g., 1h, 1hr, 1 hour, 1hours)
  const hourMatch = durationStr.match(/(\d+)\s*(h|hr|hrs|hour|hours)/i);
  // Match minutes (e.g., 19m, 19min, 19 mins, 19minutes)
  const minMatch = durationStr.match(/(\d+)\s*(m|min|mins|minute|minutes)/i);
  if (hourMatch) total += parseInt(hourMatch[1], 10) * 3600;
  if (minMatch) total += parseInt(minMatch[1], 10) * 60;
  // If only a number is present (e.g., '75'), treat as minutes
  if (!hourMatch && !minMatch && /^\d+$/.test(durationStr.trim())) {
    total = parseInt(durationStr.trim(), 10) * 60;
  }
  return total;
}

export default function HistoryListScreen() {
  const [workouts, setWorkouts] = useState<WorkoutHistoryItem[]>([]);
  const [cardioSessions, setCardioSessions] = useState<CardioSessionWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [pendingExercises, setPendingExercises] = useState<any[]>([]);
  const [importInProgress, setImportInProgress] = useState(false);
  const [showImportSummaryModal, setShowImportSummaryModal] = useState(false);
  const [importSummary, setImportSummary] = useState<any>(null);
  const [pendingImportData, setPendingImportData] = useState<any>(null);
  const router = useRouter();
  const params = useLocalSearchParams<{ action?: string }>();
  const [successMessage, setSuccessMessage] = useState('');

  // For editable new exercises
  const [editableExercises, setEditableExercises] = useState<any[]>([]);
  // Add state for exercise lookup map
  const [exerciseLookupMap, setExerciseLookupMap] = useState<any>({});
  


  // Calendar view state
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);

  // Date filter state (when selecting a day on the calendar)
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // YYYY-MM-DD
  const [dateSessions, setDateSessions] = useState<any[]>([]);
  const [dateLoading, setDateLoading] = useState(false);

  // Slider state - now only 2 options
  const sliderPosition = useRef(new Animated.Value(0)).current; // 0 = calendar, 1 = list
  const [activeIndex, setActiveIndex] = useState(0); // Start with calendar (index 0)

  // Total stats state
  const [totalStats, setTotalStats] = useState({
    totalWorkouts: 0,
    totalDuration: 0,
    totalSets: 0,
    averageWorkoutDuration: 0,
    averageSetsPerWorkout: 0,
  });

  const [cardioStats, setCardioStats] = useState({
    totalSessions: 0,
    totalDuration: 0,
    totalCalories: 0,
    formattedDuration: '0:00',
  });

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

  // Load total stats
  const loadTotalStats = async () => {
    try {
      const stats = await getTotalWorkoutStats();
      setTotalStats(stats);
    } catch (err) {
      console.error('Error loading total stats:', err);
    }
  };

  // Load cardio history
  const loadCardioHistory = async (isRefresh = false) => {
    try {
      setError(null);
      const offset = isRefresh ? 0 : Math.floor(cardioSessions.length / ITEMS_PER_PAGE) * ITEMS_PER_PAGE;
      const cardioData = await getCardioHistory(Math.floor(offset / ITEMS_PER_PAGE), ITEMS_PER_PAGE);
      
      if (isRefresh) {
        setCardioSessions(cardioData);
      } else {
        setCardioSessions(prev => [...prev, ...cardioData]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cardio history');
      console.error('Error loading cardio history:', err);
    }
  };

  // Load cardio stats
  const loadCardioStats = async () => {
    try {
      const stats = await getTotalCardioStats();
      setCardioStats(stats);
    } catch (err) {
      console.error('Error loading cardio stats:', err);
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
    loadTotalStats();
    loadCardioHistory(true);
    loadCardioStats();
  };

  // Add import handler
  const handleImportCsv = async () => {
    console.log('handleImportCsv called');
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'text/csv', copyToCacheDirectory: true });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileUri = result.assets[0].uri;
        const fileString = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
        // Parse CSV
        const parsed = Papa.parse(fileString, { header: true });
        // Relevant columns for your app
        const relevantColumns = [
          'Date', 'Workout Name', 'Duration', 'Exercise Name', 'Set Order', 'Weight', 'Reps', 'Distance', 'Seconds'
        ];
        // Normalize and filter data
        const normalizedData = parsed.data.map((row) => {
          const normalizedRow = {};
          relevantColumns.forEach(col => {
            // Try to find a matching column (case-insensitive, ignore extra columns)
            const key = Object.keys(row).find(k => k.trim().toLowerCase() === col.toLowerCase());
            normalizedRow[col] = key ? row[key] : '';
          });
          return normalizedRow;
        });
        // Group by Workout Name + Date
        const workoutMap = {};
        normalizedData.forEach(row => {
          const key = `${row['Workout Name']}|${row['Date']}`;
          if (!workoutMap[key]) {
            workoutMap[key] = {
              name: row['Workout Name'],
              date: row['Date'],
              duration: parseDurationToSeconds(row['Duration']),
              exercises: new Set(),
              setCount: 0,
            };
          }
          if (row['Exercise Name']) workoutMap[key].exercises.add(row['Exercise Name']);
          workoutMap[key].setCount += 1;
        });

        // --- Task 4: Exercise mapping ---
        // Example mapping tables
        const muscleGroupMap = {
          'bench press': 'Chest',
          'squat': 'Legs',
          'deadlift': 'Back',
          'curl': 'Biceps',
          'triceps': 'Triceps',
          'shoulder': 'Shoulders',
          'row': 'Back',
          'crunch': 'Core',
          // ...add more as needed
        };
        const categoryMap = {
          'barbell': 'Barbell',
          'dumbbell': 'Dumbbell',
          'machine': 'Machine',
          'cable': 'Cable',
          'bodyweight': 'Bodyweight',
          // ...add more as needed
        };
        function detectMuscleGroup(name) {
          name = name.toLowerCase();
          for (const [keyword, group] of Object.entries(muscleGroupMap)) {
            if (name.includes(keyword)) return group;
          }
          return 'Unknown';
        }
        function detectCategory(name) {
          name = name.toLowerCase();
          for (const [keyword, cat] of Object.entries(categoryMap)) {
            if (name.includes(keyword)) return cat;
          }
          return 'Unknown';
        }
        // Fetch all current exercises and build a normalized name set
        const allExercises = await db.select().from(schema.exercises);
        const normalizedNameSet = new Set(
          allExercises.map(ex => ex.name.trim().toLowerCase())
        );
        // Map and collect new exercises (using normalized name for duplicate check)
        const newExercises = {};
        normalizedData.forEach(row => {
          const exName = row['Exercise Name'];
          if (!exName) return;
          const normName = exName.trim().toLowerCase();
          if (!normalizedNameSet.has(normName)) {
            if (!newExercises[normName]) {
              newExercises[normName] = {
                name: exName.trim(),
                muscle_group: detectMuscleGroup(exName),
                category: detectCategory(exName),
                is_custom: 1,
              };
            }
          }
        });
        console.log('New exercises to add:', Object.values(newExercises));
        alert('Exercise mapping complete. Check console for new exercises.');
        const newExercisesArr = Object.values(newExercises);
        if (newExercisesArr.length > 0) {
          setPendingExercises(newExercisesArr);
          setEditableExercises((newExercisesArr as any[]).map(ex => Object.assign({}, ex)));
          setShowExerciseModal(true);
        } else {
          alert('No new exercises to add.');
        }

        // --- Prepare import summary for workouts/sets ---
        // Group by Workout Name + Date (reuse previous logic)
        const workoutMapForSummary = {};
        normalizedData.forEach(row => {
          const key = `${row['Workout Name']}|${row['Date']}`;
          if (!workoutMapForSummary[key]) {
            workoutMapForSummary[key] = {
              name: row['Workout Name'],
              date: row['Date'],
              duration: parseDurationToSeconds(row['Duration']),
              exercises: new Set(),
              sets: [],
            };
          }
          if (row['Exercise Name']) workoutMapForSummary[key].exercises.add(row['Exercise Name']);
          workoutMapForSummary[key].sets.push(row);
        });
        const workoutsArr = Object.values(workoutMapForSummary) as any[];
        const allExercisesForSummary = new Set();
        workoutsArr.forEach((w: any) => w.exercises.forEach((ex: string) => allExercisesForSummary.add(ex)));
        const totalSets = workoutsArr.reduce((sum, w: any) => sum + w.sets.length, 0);
        setImportSummary({
          workoutCount: workoutsArr.length,
          exerciseCount: allExercisesForSummary.size,
          setCount: totalSets,
        });
        setPendingImportData(workoutsArr);
        setShowImportSummaryModal(true);
      }
    } catch (err) {
      alert('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error.'));
    }
  };

  // Update editable exercise
  const updateEditableExercise = (index: number, field: string, value: string) => {
    setEditableExercises(prev => prev.map((ex, i) => i === index ? { ...ex, [field]: value } : ex));
  };

  // Confirm insert handler
  const handleConfirmExercises = async () => {
    setImportInProgress(true);
    try {
      // Fetch all current exercises and build a normalized name set
      const allExercises = await db.select().from(schema.exercises);
      const normalizedNameSet = new Set(
        allExercises.map(ex => ex.name.trim().toLowerCase())
      );
      // Insert only non-duplicate exercises
      for (const ex of editableExercises) {
        const normName = ex.name.trim().toLowerCase();
        if (!normalizedNameSet.has(normName)) {
          await db.insert(schema.exercises).values(ex);
          normalizedNameSet.add(normName); // Add to set to prevent further dups in this batch
        } else {
          console.log('Duplicate exercise skipped:', ex.name);
        }
      }
      setShowExerciseModal(false);
      setPendingExercises([]);
      setImportInProgress(false);
      // After all exercises are inserted, fetch all exercises and build lookup map
      const allExercisesAfter = await db.select().from(schema.exercises);
      const lookup: Record<string, any> = {};
      allExercisesAfter.forEach(ex => {
        const normName = ex.name.trim().toLowerCase();
        lookup[normName] = ex;
      });
      // Debug: Log all normalized DB exercise names
      console.log('DB normalized exercise names:', Object.keys(lookup));
      setExerciseLookupMap(lookup);
      setShowImportSummaryModal(true);
    } catch (err) {
      alert('Import failed: Could not insert new exercises.');
      setShowExerciseModal(false);
      setPendingExercises([]);
      setImportInProgress(false);
    }
  };

  // Confirm import handler
  const handleConfirmImport = async () => {
    setImportInProgress(true);
    try {
      // Helper functions for auto-creating exercises
      const muscleGroupMap = {
        'bench': 'Chest', 'press': 'Chest', 'push-up': 'Chest', 'dip': 'Chest', 'fly': 'Chest',
        'row': 'Back', 'pull-up': 'Back', 'chin-up': 'Back', 'lat': 'Back', 'deadlift': 'Back',
        'squat': 'Legs', 'leg': 'Legs', 'calf': 'Legs', 'hamstring': 'Legs', 'quad': 'Legs',
        'curl': 'Arms', 'tricep': 'Arms', 'bicep': 'Arms', 'forearm': 'Arms',
        'shoulder': 'Shoulders', 'deltoid': 'Shoulders', 'lateral': 'Shoulders', 'military': 'Shoulders',
        'crunch': 'Core', 'plank': 'Core', 'sit-up': 'Core', 'ab': 'Core', 'core': 'Core'
      };
      const categoryMap = {
        'dumbbell': 'Dumbbell', 'db': 'Dumbbell',
        'barbell': 'Barbell', 'bb': 'Barbell',
        'machine': 'Machine', 'cable': 'Cable',
        'bodyweight': 'Bodyweight', 'bw': 'Bodyweight', 'push-up': 'Bodyweight', 'pull-up': 'Bodyweight'
      };
      
      function detectMuscleGroup(name: string) {
        name = name.toLowerCase();
        for (const [keyword, group] of Object.entries(muscleGroupMap)) {
          if (name.includes(keyword)) return group;
        }
        return 'Unknown';
      }
      
      function detectCategory(name: string) {
        name = name.toLowerCase();
        for (const [keyword, cat] of Object.entries(categoryMap)) {
          if (name.includes(keyword)) return cat;
        }
        return 'Unknown';
      }
      
      // Always fetch latest exercises and rebuild lookup map before inserting sets
      const allExercises = await db.select().from(schema.exercises);
      const lookup: Record<string, any> = {};
      allExercises.forEach(ex => {
        // Ensure normalization: trim and lowercase
        const normName = ex.name.trim().toLowerCase();
        lookup[normName] = ex;
      });
      console.log('DB normalized exercise names (pre-insert):', Object.keys(lookup));
      setExerciseLookupMap(lookup);
      // Insert workouts, workout_exercises, and sets
      for (const w of pendingImportData) {
        // Insert workout
        const [{ id: workoutId }] = await db.insert(schema.workouts).values({
          name: (w as any).name,
          date: (w as any).date,
          duration: parseInt((w as any).duration) || 0,
        }).returning({ id: schema.workouts.id });
        // For each exercise in this workout
        const exerciseMap = {};
        (w as any).sets.forEach((row: any) => {
          if (!exerciseMap[row['Exercise Name']]) {
            exerciseMap[row['Exercise Name']] = [];
          }
          exerciseMap[row['Exercise Name']].push(row);
        });
        for (const [exName, sets] of Object.entries(exerciseMap)) {
          // Ensure normalization: trim and lowercase
          const normName = (exName as string).trim().toLowerCase();
          // Debug: Log the normalized CSV exercise name being looked up and all keys in the lookup map
          console.log('Looking up exercise:', normName, '| All keys:', Object.keys(lookup));
          let exercise = lookup[normName];
          if (!exercise) {
            console.log('Exercise not found, auto-creating:', exName, 'in workout:', (w as any).name);
            // Auto-create the missing exercise
            const muscleGroup = detectMuscleGroup(exName);
            const category = detectCategory(exName);
            const [newExercise] = await db.insert(schema.exercises).values({
              name: exName.trim(),
              muscle_group: muscleGroup,
              category: category,
              is_custom: 1,
            }).returning();
            exercise = newExercise;
            // Update lookup map for future lookups
            lookup[normName] = exercise;
            console.log('Auto-created exercise:', newExercise);
          }
          // Insert workout_exercise
          const [{ id: workoutExerciseId }] = await db.insert(schema.workout_exercises).values({
            workout_id: workoutId,
            exercise_id: exercise.id,
          }).returning({ id: schema.workout_exercises.id });
          // Insert sets
          for (const setRow of sets as any[]) {
            const weight = parseFloat(setRow['Weight']) || 0;
            const reps = parseInt(setRow['Reps']) || 0;
            // Skip sets where both weight and reps are zero
            if (weight === 0 && reps === 0) continue;
            await db.insert(schema.sets).values({
              workout_exercise_id: workoutExerciseId,
              set_index: parseInt(setRow['Set Order']) || 1,
              weight,
              reps,
              notes: '',
              rest_duration: parseInt(setRow['Seconds']) || 0,
              completed: 1,
            });
          }
        }
      }
      alert('Workouts and sets imported!');
      showImportSuccess('Workouts and sets imported!');
    } catch (err) {
      alert('Import failed: Could not import workouts/sets.');
    } finally {
      setShowImportSummaryModal(false);
      setImportSummary(null);
      setPendingImportData(null);
      setImportInProgress(false);
    }
  };

  // Slider animation functions
  const animateToView = (index: number) => {
    setActiveIndex(index);
    Animated.timing(sliderPosition, {
      toValue: index,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    if (index === 0) {
      setViewMode('calendar');
    } else if (index === 1) {
      setViewMode('list');
    }
  };

  const handleSliderPress = (index: number) => {
    animateToView(index);
  };

  // Load initial data
  useEffect(() => {
    loadWorkoutHistory(true);
    loadTotalStats();
    loadCardioHistory(true);
    loadCardioStats();
  }, []);

  // Refresh when screen gains focus so new sessions appear instantly
  useFocusEffect(
    React.useCallback(() => {
      loadWorkoutHistory(true);
      loadTotalStats();
      loadCardioHistory(true);
      loadCardioStats();
    }, [])
  );

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

  // Merge and filter workouts and cardio sessions
  const mergedSessions = useMemo(() => {
    // Normalize cardio sessions to match workout item shape
    const cardioNormalized = cardioSessions.map(session => ({
      ...session,
      isCardio: true,
      name: session.name || getCardioTypeDisplayName(session.type as any),
      date: session.date,
      duration: session.duration,
      calories_burned: session.calories_burned || 0,
      type: session.type,
      exerciseCount: 1,
      totalSets: session.rounds || session.laps || session.total_laps || 0,
    }));
    const allSessions = [
      ...workouts.map(w => ({
        ...w,
        isCardio: false,
        type: '', // No cardio type
        calories_burned: 0, // No calories for lift
      })),
      ...cardioNormalized
    ];
    // Sort by date descending
    allSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    // If we have an active date filter, filter by local day match
    if (selectedDate) {
      const toLocalYMD = (iso: string) => {
        const d = new Date(iso);
        const y = d.getFullYear();
        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        const dd = d.getDate().toString().padStart(2, '0');
        return `${y}-${m}-${dd}`;
      };
      return allSessions.filter(item => toLocalYMD(item.date) === selectedDate);
    }
    if (!searchQuery.trim()) return allSessions;
    return allSessions.filter(item =>
      (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      formatDate(item.date).includes(searchQuery)
    );
  }, [workouts, cardioSessions, searchQuery]);

  // Calculate filtered stats for search
  const filteredWorkoutsCount = mergedSessions.length;

  // After successful import, refresh history and show message
  const showImportSuccess = (msg: string) => {
    setSuccessMessage(msg);
    loadWorkoutHistory(true); // Refresh history
    loadTotalStats(); // Refresh total stats
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // If navigated with action=import, trigger the import flow once on mount
  useEffect(() => {
    if (params?.action === 'import') {
      // Slight delay to allow screen to mount fully
      setTimeout(() => handleImportCsv(), 150);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Delete all workout history handler
  const handleDeleteAllHistory = () => {
    Alert.alert(
      'Delete All History',
  'Are you sure you want to delete ALL history? This will delete both lift workouts and cardio sessions. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await db.delete(schema.sets);
            await db.delete(schema.workout_exercises);
            await db.delete(schema.workouts);
    await db.delete(schema.cardio_sessions);
            loadWorkoutHistory(true);
            setSuccessMessage('All workout history deleted!');
            loadTotalStats(); // Refresh total stats after deletion
    // Refresh cardio and calendar
    await loadCardioHistory(true);
    await loadCardioStats();
    setCalendarRefreshKey(prev => prev + 1);
          } catch (err) {
            alert('Failed to delete workout history.');
          }
        }},
      ]
    );
  };

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
    <PageTransition>
      <SafeAreaView style={styles.safeArea}>
        {/* Global Rest Timer Display */}
        
        
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={{ width: 36 }} />
          <Text style={styles.pageTitle}>HISTORY</Text>
          <View style={{ width: 36 }} />
        </View>

      {/* Refined Slider Toggle - Now only 2 tabs */}
      <View style={styles.sliderContainer}>
        <View style={styles.sliderTrack}>
          <Animated.View 
            style={[
              styles.sliderIndicator,
              {
                transform: [{
                  translateX: sliderPosition.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, (width - CARD_MARGIN * 2) / 2], // 2 equal sections
                  })
                }]
              }
            ]}
          />
          <TouchableOpacity
            style={styles.sliderOption}
            onPress={() => handleSliderPress(0)}
          >
            <Text style={[
              styles.sliderText,
              activeIndex === 0 && styles.sliderTextActive
            ]}>
              CALENDAR
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sliderOption}
            onPress={() => handleSliderPress(1)}
          >
            <Text style={[
              styles.sliderText,
              activeIndex === 1 && styles.sliderTextActive
            ]}>
              LIST
            </Text>
          </TouchableOpacity>
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

      {/* Content Views - Conditional Rendering */}
      {activeIndex === 0 && (
        <View style={styles.calendarContainer}>
          <AttendanceCalendar
            key={`attendance-${currentYear}-${currentMonth}-${calendarRefreshKey}`}
            year={currentYear}
            month={currentMonth}
            onDatePress={(date) => {
              // Select specific date and load its sessions (lift + cardio)
              setSelectedDate(date);
              setSearchQuery('');
              const loadForDate = async () => {
                setDateLoading(true);
                try {
                  const lift = await getWorkoutsOnDate(date);
                  const [y, m, d] = date.split('-').map(n => parseInt(n, 10));
                  const startIso = new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
                  const endIso = new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
                  const cardio = await getCardioSessionsForDateRange(startIso, endIso);
                  const cardioNormalized = cardio.map(session => ({
                    ...session,
                    isCardio: true,
                    name: session.name || getCardioTypeDisplayName(session.type as any),
                    exerciseCount: 1,
                    totalSets: session.rounds || session.laps || session.total_laps || 0,
                  }));
                  const liftNormalized = lift.map(w => ({ ...w, isCardio: false, type: '', calories_burned: 0 }));
                  const combined = [...liftNormalized, ...cardioNormalized].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  setDateSessions(combined);
                } finally {
                  setDateLoading(false);
                }
              };
              loadForDate();
              animateToView(1); // Switch to list view
            }}
            onMonthChange={(year, month) => {
              setCurrentYear(year);
              setCurrentMonth(month);
            }}
          />
        </View>
      )}

      {activeIndex === 1 && (
        <View style={styles.listContainer}>
          {/* Enhanced Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {selectedDate ? dateSessions.length : (searchQuery ? filteredWorkoutsCount : totalStats.totalWorkouts)}
              </Text>
              <Text style={styles.statLabel}>
                {selectedDate ? 'FOUND' : (searchQuery ? 'FOUND' : 'WORKOUTS')}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{formatDurationAsHours(totalStats.totalDuration)}</Text>
              <Text style={styles.statLabel}>TOTAL TIME</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{totalStats.totalSets}</Text>
              <Text style={styles.statLabel}>TOTAL SETS</Text>
            </View>
          </View>

          {selectedDate && (
            <View style={{
              marginHorizontal: CARD_MARGIN,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: theme.colors.neon,
              borderRadius: 8,
              padding: 10,
              backgroundColor: 'rgba(0,255,0,0.05)'
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.body, fontSize: 12 }}>
                  Showing sessions for {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
                <TouchableOpacity onPress={() => { setSelectedDate(null); setDateSessions([]); animateToView(0); }}>
                  <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.heading, fontSize: 12, fontWeight: 'bold' }}>CLEAR</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

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
              if (selectedDate) return; // disable infinite scroll when date filter active
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

        {successMessage ? (
          <View style={{ backgroundColor: theme.colors.backgroundOverlay, borderColor: theme.colors.neon, borderWidth: 2, borderRadius: 8, margin: 12, padding: 12, alignItems: 'center' }}>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.heading, fontSize: 16 }}>{successMessage}</Text>
          </View>
        ) : null}

        {selectedDate ? (
          dateLoading ? (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color={GREEN} />
              <Text style={styles.loadingMoreText}>LOADING...</Text>
            </View>
          ) : (
            dateSessions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>NO SESSIONS THIS DAY</Text>
                <Text style={styles.emptyText}>Try another date from calendar.</Text>
              </View>
            ) : (
              dateSessions.map((item) => (
                <TouchableOpacity 
                  key={item.id || `${item.name}-${item.date}`}
                  style={[styles.workoutCard, item.isCardio && styles.cardioCard]}
                  activeOpacity={0.8}
                  onPress={() => item.isCardio ? router.push(`/cardio/history/${item.id}`) : handleWorkoutPress(item.id)}
                >
                  <View style={styles.workoutHeader}>
                    <Text style={styles.workoutTitle}>{item.name}</Text>
                    <Text style={styles.workoutDate}>{formatDate(item.date)}</Text>
                  </View>
                  <View style={styles.workoutDetails}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>DURATION</Text>
                      <Text style={styles.detailValue}>{formatDurationAsHrMin(item.duration)}</Text>
                    </View>
                    {item.isCardio ? (
                      <>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>TYPE</Text>
                          <Text style={styles.detailValue}>{getCardioTypeDisplayName(item.type as any)}</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>CALORIES</Text>
                          <Text style={styles.detailValue}>{item.calories_burned}</Text>
                        </View>
                      </>
                    ) : (
                      <>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>EXERCISES</Text>
                          <Text style={styles.detailValue}>{item.exerciseCount}</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>SETS</Text>
                          <Text style={styles.detailValue}>{item.totalSets}</Text>
                        </View>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )
          )
        ) : mergedSessions.length === 0 && !loading && !error ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>NO SESSIONS YET</Text>
            <TouchableOpacity 
              style={styles.newWorkoutButton} 
              onPress={() => router.push('/new')}
            >
              <Text style={styles.newWorkoutButtonText}>START WORKOUT</Text>
            </TouchableOpacity>
          </View>
        ) : searchQuery && mergedSessions.length === 0 ? (
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
          mergedSessions.map((item, index) => (
            <TouchableOpacity 
              key={item.id || `${item.name}-${item.date}`}
              style={[styles.workoutCard, item.isCardio && styles.cardioCard]}
              activeOpacity={0.8}
              onPress={() => item.isCardio ? router.push(`/cardio/history/${item.id}`) : handleWorkoutPress(item.id)}
            >
              <View style={styles.workoutHeader}>
                <Text style={styles.workoutTitle}>{item.name}</Text>
                <Text style={styles.workoutDate}>{formatDate(item.date)}</Text>
              </View>
              <View style={styles.workoutDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>DURATION</Text>
                  <Text style={styles.detailValue}>{formatDurationAsHrMin(item.duration)}</Text>
                </View>
                {item.isCardio ? (
                  <>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>TYPE</Text>
                      <Text style={styles.detailValue}>{getCardioTypeDisplayName(item.type as any)}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>CALORIES</Text>
                      <Text style={styles.detailValue}>{item.calories_burned}</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>EXERCISES</Text>
                      <Text style={styles.detailValue}>{item.exerciseCount}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>SETS</Text>
                      <Text style={styles.detailValue}>{item.totalSets}</Text>
                    </View>
                  </>
                )}
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
        </View>
      )}

      {/* Cardio View */}
      {activeIndex === 2 && (
        <View style={styles.listContainer}>
          {/* Cardio Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{cardioStats.totalSessions}</Text>
              <Text style={styles.statLabel}>SESSIONS</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{formatDurationAsHours(cardioStats.totalDuration)}</Text>
              <Text style={styles.statLabel}>TOTAL TIME</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{cardioStats.totalCalories}</Text>
              <Text style={styles.statLabel}>CALORIES</Text>
            </View>
          </View>

          {/* Cardio List */}
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
          >
            {cardioSessions.length === 0 && !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>NO CARDIO SESSIONS YET</Text>
                <TouchableOpacity 
                  style={styles.newWorkoutButton} 
                  onPress={() => router.push('/cardio')}
                >
                  <Text style={styles.newWorkoutButtonText}>START CARDIO</Text>
                </TouchableOpacity>
              </View>
            ) : (
              cardioSessions.map((session, index) => (
                <TouchableOpacity 
                  key={session.id} 
                  style={[styles.workoutCard, styles.cardioCard]}
                  activeOpacity={0.8}
                >
                  <View style={styles.workoutHeader}>
                    <Text style={styles.workoutTitle}>{session.name}</Text>
                    <Text style={styles.workoutDate}>{formatCardioDate(session.date)}</Text>
                  </View>
                  
                  <View style={styles.cardioTypeContainer}>
                    <Text style={styles.cardioType}>{getCardioTypeDisplayName(session.type as any)}</Text>
                  </View>
                  
                  <View style={styles.workoutDetails}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>DURATION</Text>
                      <Text style={styles.detailValue}>{formatDurationAsHrMin(session.duration)}</Text>
                    </View>
                    
                    {session.type === 'hiit' && (
                      <>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>ROUNDS</Text>
                          <Text style={styles.detailValue}>{session.rounds || 0}</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>WORK/REST</Text>
                          <Text style={styles.detailValue}>{session.work_time}s/{session.rest_time}s</Text>
                        </View>
                      </>
                    )}
                    
                    {session.type === 'walk_run' && (
                      <>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>LAPS</Text>
                          <Text style={styles.detailValue}>{session.laps || 0}</Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailLabel}>RUN/WALK</Text>
                          <Text style={styles.detailValue}>{session.run_time}s/{session.walk_time}s</Text>
                        </View>
                      </>
                    )}
                    
                    {session.type === 'casual_walk' && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>LAPS</Text>
                        <Text style={styles.detailValue}>{session.total_laps || 0}</Text>
                      </View>
                    )}
                    
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>CALORIES</Text>
                      <Text style={styles.detailValue}>{session.calories_burned || 0}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}

            {loading && cardioSessions.length > 0 && (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color={GREEN} />
                <Text style={styles.loadingMoreText}>LOADING MORE...</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}></View>

      {/* Import Summary Modal (moved here to avoid styles hoisting error) */}
      <Modal
        visible={showImportSummaryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowImportSummaryModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: theme.colors.background, borderRadius: 16, padding: 24, width: '90%', maxWidth: 400 }}>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.heading, fontWeight: 'bold', fontSize: 20, marginBottom: 16, textAlign: 'center' }}>Confirm Import</Text>
            {importSummary && (
              <View style={{ marginBottom: 18 }}>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.heading, fontSize: 16, marginBottom: 8 }}>Workouts: {importSummary.workoutCount}</Text>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.heading, fontSize: 16, marginBottom: 8 }}>Unique Exercises: {importSummary.exerciseCount}</Text>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.heading, fontSize: 16 }}>Sets: {importSummary.setCount}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18 }}>
              <TouchableOpacity
                onPress={() => setShowImportSummaryModal(false)}
                style={{ marginRight: 18, paddingVertical: 10, paddingHorizontal: 18 }}
                disabled={importInProgress}
              >
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.body, fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmImport}
                style={{ backgroundColor: theme.colors.neon, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18 }}
                disabled={importInProgress}
              >
                <Text style={{ color: theme.colors.background, fontFamily: theme.fonts.heading, fontWeight: 'bold', fontSize: 16 }}>{importInProgress ? 'Importing...' : 'Confirm Import'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showExerciseModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowExerciseModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: theme.colors.background, borderRadius: 16, padding: 24, width: '90%', maxWidth: 400 }}>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.heading, fontWeight: 'bold', fontSize: 20, marginBottom: 16, textAlign: 'center' }}>Confirm New Exercises</Text>
            {editableExercises.map((item, idx) => (
              <View key={item.name + '-' + idx} style={{ marginBottom: 18 }}>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16 }}>{item.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.body, fontSize: 12, marginRight: 8 }}>Muscle Group:</Text>
                  <View style={{ flex: 1, borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 8, marginRight: 8 }}>
                    <Picker
                      selectedValue={item.muscle_group}
                      onValueChange={val => updateEditableExercise(idx, 'muscle_group', val)}
                      style={{ color: theme.colors.neon, backgroundColor: theme.colors.background, fontFamily: theme.fonts.body, fontSize: 12 }}
                      dropdownIconColor={theme.colors.neon}
                    >
                      {MUSCLE_GROUP_OPTIONS.map(opt => (
                        <Picker.Item key={opt} label={opt} value={opt} color={theme.colors.neon} />
                      ))}
                    </Picker>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.body, fontSize: 12, marginRight: 8 }}>Category:</Text>
                  <View style={{ flex: 1, borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 8 }}>
                    <Picker
                      selectedValue={item.category}
                      onValueChange={val => updateEditableExercise(idx, 'category', val)}
                      style={{ color: theme.colors.neon, backgroundColor: theme.colors.background, fontFamily: theme.fonts.body, fontSize: 12 }}
                      dropdownIconColor={theme.colors.neon}
                    >
                      {CATEGORY_OPTIONS.map(opt => (
                        <Picker.Item key={opt} label={opt} value={opt} color={theme.colors.neon} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>
            ))}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18 }}>
              <TouchableOpacity
                onPress={() => setShowExerciseModal(false)}
                style={{ marginRight: 18, paddingVertical: 10, paddingHorizontal: 18 }}
                disabled={importInProgress}
              >
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.body, fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmExercises}
                style={{ backgroundColor: theme.colors.neon, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18 }}
                disabled={importInProgress}
              >
                <Text style={{ color: theme.colors.background, fontFamily: theme.fonts.heading, fontWeight: 'bold', fontSize: 16 }}>{importInProgress ? 'Adding...' : 'Confirm'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      <BottomNav currentScreen="/history" />
    </SafeAreaView>
    </PageTransition>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
  },
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
  viewToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    marginHorizontal: CARD_MARGIN,
  },
  viewToggleButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.neon,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  viewToggleButtonActive: {
    backgroundColor: theme.colors.neon,
  },
  viewToggleText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  viewToggleTextActive: {
    color: theme.colors.background,
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
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 36,
    fontWeight: 'bold',
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
  list: {
    marginTop: 0,
    marginHorizontal: CARD_MARGIN,
  },
  workoutCard: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
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
    fontFamily: theme.fonts.code,
    fontWeight: 'bold',
    fontSize: 24,
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
  // Refined slider styles
  sliderContainer: {
    marginHorizontal: CARD_MARGIN,
    marginBottom: theme.spacing.sm,
  },
  sliderTrack: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 0, 0.2)',
    position: 'relative',
    overflow: 'hidden',
    height: 36, // Reduced height
  },
  sliderIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '50%', // Half width for 2 tabs - same highlight area for both calendar and list
    height: '100%', // Full height of container
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.neon,
  },
  sliderOption: {
    flex: 1,
    paddingVertical: 8, // Reduced padding
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  sliderText: {
    color: theme.colors.neonDim,
    fontFamily: theme.fonts.code,
    fontSize: 12, // Reduced font size
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  sliderTextActive: {
    color: theme.colors.neon,
  },
  // Content container styles
  calendarContainer: {
    flex: 1,
    paddingHorizontal: 0,
  },
  listContainer: {
    flex: 1,
  },
  // Cardio specific styles
  cardioCard: {
    borderColor: '#FF4444', // Red border for cardio
  },
  cardioTypeContainer: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 68, 68, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  cardioType: {
    color: '#FF4444',
    fontFamily: theme.fonts.code,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
}); 