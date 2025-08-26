import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, FlatList, SafeAreaView } from 'react-native';
import ProgressChart from '../components/ProgressChart';
import VolumeOverTimeChart from '../components/stats/VolumeOverTimeChart';
import WorkoutFrequencyChart from '../components/stats/WorkoutFrequencyChart';
import PRTimelineChart from '../components/stats/PRTimelineChart';
import Estimated1RMChart from '../components/stats/Estimated1RMChart';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import theme from '../styles/theme';
import { getExerciseMaxTimeline } from '../services/workoutHistory';
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
        // Pull pre-aggregated per-exercise max series
  const rows = await getExerciseMaxTimeline({ limitPerExercise: 500 });
        // Group into chart-ready series per exercise
        const exerciseMap: Record<string, { title: string; data: number[]; labels: string[]; dates: Date[]; maxGain: string; percentGain: string; sessions: number; }> = {};
        rows.forEach(r => {
          const title = r.exerciseName;
          if (!exerciseMap[title]) {
            exerciseMap[title] = { title, data: [], labels: [], dates: [], maxGain: '', percentGain: '', sessions: 0 };
          }
          exerciseMap[title].data.push(r.maxWeight || 0);
          exerciseMap[title].labels.push(new Date(r.date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.'));
          exerciseMap[title].dates.push(new Date(r.date));
        });
        // Sort each exercise series by date
        Object.values(exerciseMap).forEach(series => {
          const order = series.dates
            .map((d, i) => ({ d, i }))
            .sort((a, b) => a.d.getTime() - b.d.getTime())
            .map(x => x.i);
          series.data = order.map(i => series.data[i]);
          series.labels = order.map(i => series.labels[i]);
          series.dates = order.map(i => series.dates[i]);
        });
        // Compute stats
        Object.values(exerciseMap).forEach(series => {
          series.sessions = series.data.length;
          if (series.data.length > 1) {
            const gain = series.data[series.data.length - 1] - series.data[0];
            series.maxGain = (gain >= 0 ? '+' : '') + gain + 'kg';
            series.percentGain = (series.data[0] !== 0 ? ((gain / series.data[0]) * 100).toFixed(0) : '0') + '%';
          } else {
            series.maxGain = '+0kg';
            series.percentGain = '0%';
          }
        });
        const chartsArray = Object.values(exerciseMap);
        setCharts(chartsArray);
        if (chartsArray.length > 0) {
          setSelectedExercise(chartsArray[0].title);
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
          {/* Weight Progression */}
          <View style={{ marginBottom: 8 }}>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.heading, fontSize: 18, fontWeight: 'bold', letterSpacing: 1.2, marginBottom: 6 }}>Weight Progression</Text>
          </View>
          {charts.filter(c => c.title === selectedExercise).map((c, i) => (
            <ProgressChart key={`pc-${i}`} title={c.title} maxGain={c.maxGain} percentGain={c.percentGain} sessions={c.sessions} data={c.data} labels={c.labels} />
          ))}

          {/* New Stats Charts */}
          <VolumeOverTimeChart initialRange={'30d'} />
          <WorkoutFrequencyChart initialRange={'30d'} showRollingAvg />
          <PRTimelineChart initialRange={'all'} selectedExercise={selectedExercise} />
          <Estimated1RMChart initialRange={'all'} selectedExercise={selectedExercise} />
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