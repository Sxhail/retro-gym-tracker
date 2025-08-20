import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, FlatList, SafeAreaView } from 'react-native';
import ProgressChart from '../components/ProgressChart';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import theme from '../styles/theme';
import { getWorkoutHistory, getWorkoutDetail, formatDate } from '../services/workoutHistory';
import { GlobalRestTimerDisplay } from '../components/GlobalRestTimerDisplay';

export default function ProgressOverview() {
  const router = useRouter();
  const [charts, setCharts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchProgress() {
      setLoading(true);
      setError(null);
      try {
        // Fetch all workouts (increase limit as needed)
        const workouts = await getWorkoutHistory(1000, 0);
        // For each workout, get details
        const details = await Promise.all(workouts.map(w => getWorkoutDetail(w.id)));
        // Aggregate by exercise name with proper date sorting
        const exerciseMap: Record<string, { title: string; data: number[]; labels: string[]; dates: Date[]; maxGain: string; percentGain: string; sessions: number; }> = {};
        
        // First pass: collect all data with dates
        details.forEach((workout, idx) => {
          if (!workout) return;
          const workoutDate = new Date(workout.date);
          workout.exercises.forEach(ex => {
            // Find max weight for this exercise in this workout
            const maxWeight = Math.max(...ex.sets.map(s => s.weight));
            if (!exerciseMap[ex.exerciseName]) {
              exerciseMap[ex.exerciseName] = { 
                title: ex.exerciseName, 
                data: [], 
                labels: [], 
                dates: [],
                maxGain: '', 
                percentGain: '', 
                sessions: 0 
              };
            }
            exerciseMap[ex.exerciseName].data.push(maxWeight);
            exerciseMap[ex.exerciseName].labels.push(formatDate(workout.date));
            exerciseMap[ex.exerciseName].dates.push(workoutDate);
          });
        });
        
        // Second pass: sort each exercise's data by date (oldest to newest)
        Object.values(exerciseMap).forEach(exercise => {
          // Create array of indices sorted by date
          const sortedIndices = exercise.dates
            .map((date, index) => ({ date, index }))
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .map(item => item.index);
          
          // Reorder data, labels, and dates based on sorted indices
          exercise.data = sortedIndices.map(i => exercise.data[i]);
          exercise.labels = sortedIndices.map(i => exercise.labels[i]);
          exercise.dates = sortedIndices.map(i => exercise.dates[i]);
        });
        // Calculate stats for each exercise
        Object.values(exerciseMap).forEach(chart => {
          chart.sessions = chart.data.length;
          if (chart.data.length > 1) {
            const gain = chart.data[chart.data.length - 1] - chart.data[0];
            chart.maxGain = (gain >= 0 ? '+' : '') + gain + 'kg';
            chart.percentGain = (chart.data[0] !== 0 ? ((gain / chart.data[0]) * 100).toFixed(0) : '0') + '%';
          } else {
            chart.maxGain = '+0kg';
            chart.percentGain = '0%';
          }
        });
        setCharts(Object.values(exerciseMap));
        // Set default selected exercise
        if (Object.values(exerciseMap).length > 0) {
          setSelectedExercise(Object.values(exerciseMap)[0].title);
        }
      } catch (err) {
        setError('Failed to load progress data');
      } finally {
        setLoading(false);
      }
    }
    fetchProgress();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlobalRestTimerDisplay />
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>STATS</Text>
        <View style={{ width: 36 }} />
      </View>
      {/* Exercise Selection Dropdown with Search */}
      {charts.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <TouchableOpacity
            style={{
              borderWidth: theme.borderWidth,
              borderColor: theme.colors.neon,
              borderRadius: theme.borderRadius,
              paddingVertical: 10,
              paddingHorizontal: 16,
              backgroundColor: theme.colors.backgroundOverlay,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            onPress={() => setDropdownVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16 }}>
              {selectedExercise || 'Select Exercise'}
            </Text>
            <Text style={{ color: theme.colors.neon, fontSize: 18, marginLeft: 8 }}>▼</Text>
          </TouchableOpacity>
          <Modal
            visible={dropdownVisible}
            animationType="fade"
            transparent={true}
            onRequestClose={() => setDropdownVisible(false)}
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ backgroundColor: theme.colors.background, borderRadius: 12, padding: 18, width: '90%', maxWidth: 400 }}>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.heading, fontSize: 18, marginBottom: 8 }}>Select Exercise</Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.neon,
                    borderRadius: 8,
                    color: theme.colors.neon,
                    fontFamily: theme.fonts.code,
                    fontSize: 16,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    backgroundColor: 'transparent',
                    marginBottom: 12,
                  }}
                  placeholder="Search exercise..."
                  placeholderTextColor={theme.colors.neon}
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  autoFocus
                />
                <FlatList
                  data={charts.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()))}
                  keyExtractor={item => item.title}
                  style={{ maxHeight: 250, marginBottom: 8 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 8,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.colors.neonDim,
                        backgroundColor: item.title === selectedExercise ? theme.colors.neon : 'transparent',
                      }}
                      onPress={() => {
                        setSelectedExercise(item.title);
                        setDropdownVisible(false);
                        setSearchTerm('');
                      }}
                    >
                      <Text style={{
                        color: item.title === selectedExercise ? theme.colors.background : theme.colors.neon,
                        fontFamily: theme.fonts.code,
                        fontSize: 16,
                        fontWeight: item.title === selectedExercise ? 'bold' : 'normal',
                      }}>{item.title}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={<Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.code, fontSize: 14, textAlign: 'center', marginTop: 16 }}>No exercises found.</Text>}
                />
                <TouchableOpacity onPress={() => setDropdownVisible(false)} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
                  <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.body, fontSize: 14 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      )}
      {loading ? (
        <ActivityIndicator color={theme.colors.neon} size="large" style={{ marginTop: 32 }} />
      ) : error ? (
        <Text style={{ color: theme.colors.error, fontFamily: theme.fonts.mono, marginTop: 32 }}>{error}</Text>
      ) : charts.length === 0 ? (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataTitle}>NO WORKOUTS FOUND</Text>
          <Text style={styles.noDataSubtitle}>Start tracking your workouts to see progress analysis</Text>
        </View>
      ) : (
        <ScrollView style={styles.list}>
          {charts.filter(c => c.title === selectedExercise).map((c, i) => (
            <ProgressChart key={i} title={c.title} maxGain={c.maxGain} percentGain={c.percentGain} sessions={c.sessions} data={c.data} labels={c.labels} />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
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
  back: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 36,
    fontWeight: 'bold',
  },
  analysis: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 11,
    fontWeight: 'bold',
  },
  title: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.display,
    fontWeight: 'bold',
    fontSize: 22,
    marginBottom: 2,
    letterSpacing: 1.5,
  },
  subtitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    marginBottom: 18,
    opacity: 0.85,
  },
  list: {
    marginTop: 8,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  noDataTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1,
  },
  noDataSubtitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.9,
  },
}); 