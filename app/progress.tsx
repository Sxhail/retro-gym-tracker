import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, FlatList } from 'react-native';
import ProgressChart from '../components/ProgressChart';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import theme from '../styles/theme';
import { getWorkoutHistory, getWorkoutDetail, formatDate } from '../services/workoutHistory';

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
        // Aggregate by exercise name
        const exerciseMap: Record<string, { title: string; data: number[]; labels: string[]; maxGain: string; percentGain: string; sessions: number; }> = {};
        details.forEach((workout, idx) => {
          if (!workout) return;
          const dateLabel = formatDate(workout.date);
          workout.exercises.forEach(ex => {
            // Find max weight for this exercise in this workout
            const maxWeight = Math.max(...ex.sets.map(s => s.weight));
            if (!exerciseMap[ex.exerciseName]) {
              exerciseMap[ex.exerciseName] = { title: ex.exerciseName, data: [], labels: [], maxGain: '', percentGain: '', sessions: 0 };
            }
            exerciseMap[ex.exerciseName].data.push(maxWeight);
            exerciseMap[ex.exerciseName].labels.push(dateLabel);
          });
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
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.back} onPress={() => router.back()}>{'← BACK'}</Text>
        <Text style={styles.analysis}>PROGRESS.ANALYSIS</Text>
      </View>
      <Text style={styles.title}>LIFTING PROGRESS</Text>
      <Text style={styles.subtitle}>Weight progression over time</Text>
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
      ) : (
        <ScrollView style={styles.list}>
          {charts.filter(c => c.title === selectedExercise).map((c, i) => (
            <ProgressChart key={i} title={c.title} maxGain={c.maxGain} percentGain={c.percentGain} sessions={c.sessions} data={c.data} labels={c.labels} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 18,
    paddingTop: 36,
  },
  statusBar: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    marginBottom: 2,
  },
  protocol: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    marginBottom: 8,
  },
  divider: {
    borderBottomWidth: theme.borderWidth,
    borderBottomColor: theme.colors.neon,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  back: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 14,
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
}); 