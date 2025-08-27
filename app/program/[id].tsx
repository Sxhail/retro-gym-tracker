import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import theme from '../../styles/theme';
import { ProgramManager } from '../../services/programManager';

interface ProgramStats {
  totalWorkouts: number;
  completedWorkouts: number;
  completionPercentage: number;
  currentWeek: number;
  totalWeeks: number;
  nextWorkout: string;
  daysSinceLastWorkout: number | null;
  programDays: any[];
}

export default function ProgramDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [program, setProgram] = useState<any>(null);
  const [stats, setStats] = useState<ProgramStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgramDetails();
  }, [id]);

  const loadProgramDetails = async () => {
    try {
      setLoading(true);
      const programId = parseInt(id as string);
      
      // Load program data
      const programData = await ProgramManager.getProgramById(programId);
      if (!programData) {
        Alert.alert('Error', 'Program not found');
        router.back();
        return;
      }
      
      setProgram(programData);
      
      // Calculate stats
      const programStats = await ProgramManager.calculateProgramStats(programId);
      setStats(programStats);
      
    } catch (error) {
      console.error('Error loading program details:', error);
      Alert.alert('Error', 'Failed to load program details');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProgram = () => {
    // Navigate to program editor
    router.push(`/program/edit/${id}`);
  };

  const handleDeleteProgram = () => {
    Alert.alert(
      'Delete Program',
      'Are you sure you want to delete this program? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ProgramManager.deleteProgram(parseInt(id as string));
              Alert.alert('Success', 'Program deleted successfully');
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete program');
            }
          },
        },
      ]
    );
  };

  const handleActivateProgram = async () => {
    try {
      await ProgramManager.activateProgram(parseInt(id as string));
      Alert.alert('Success', 'Program activated successfully');
      loadProgramDetails(); // Reload to update status
    } catch (error) {
      Alert.alert('Error', 'Failed to activate program');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>LOADING...</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>LOADING PROGRAM...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!program) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ERROR</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>PROGRAM NOT FOUND</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2000 }}>
      </View>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PROGRAM DETAILS</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Program Header */}
        <View style={styles.programHeader}>
          <Text style={styles.programName}>{program.name}</Text>
          <View style={styles.statusBadge}>
            <Text style={[
              styles.statusText,
              { color: program.is_active ? '#00FF00' : '#FF6B6B' }
            ]}>
              {program.is_active ? '● ACTIVE' : '○ INACTIVE'}
            </Text>
          </View>
        </View>

        {/* Quick Stats */}
        {stats && (
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>QUICK STATS</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.completionPercentage}%</Text>
                <Text style={styles.statLabel}>COMPLETED</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.currentWeek}/{stats.totalWeeks}</Text>
                <Text style={styles.statLabel}>WEEKS</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.completedWorkouts}/{stats.totalWorkouts}</Text>
                <Text style={styles.statLabel}>WORKOUTS</Text>
              </View>
            </View>

            {stats.daysSinceLastWorkout !== null && (
              <View style={styles.lastWorkoutSection}>
                <Text style={styles.lastWorkoutText}>
                  {stats.daysSinceLastWorkout} DAYS SINCE LAST WORKOUT
                </Text>
              </View>
            )}

            {stats.nextWorkout && (
              <View style={styles.nextWorkoutSection}>
                <Text style={styles.nextWorkoutLabel}>NEXT WORKOUT:</Text>
                <Text style={styles.nextWorkoutValue}>{stats.nextWorkout}</Text>
              </View>
            )}
          </View>
        )}

        {/* Program Info */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>PROGRAM INFO</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>DURATION:</Text>
            <Text style={styles.infoValue}>{program.duration_weeks} WEEKS</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>DESCRIPTION:</Text>
            <Text style={styles.infoValue}>{program.description || 'NO DESCRIPTION'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>CREATED:</Text>
            <Text style={styles.infoValue}>
              {new Date(program.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Program Schedule */}
        {stats?.programDays && (
          <View style={styles.scheduleSection}>
            <Text style={styles.sectionTitle}>WEEKLY SCHEDULE</Text>
            {stats.programDays.map((day, index) => (
              <View key={index} style={styles.scheduleDay}>
                <Text style={styles.scheduleDayName}>{day.day_name}</Text>
                <Text style={styles.scheduleWorkoutType}>
                  {day.is_rest_day ? 'REST DAY' : day.template_name || 'CUSTOM WORKOUT'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          {!program.is_active && (
            <TouchableOpacity style={styles.activateButton} onPress={handleActivateProgram}>
              <Text style={styles.activateButtonText}>ACTIVATE PROGRAM</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.editButton} onPress={handleEditProgram}>
            <Text style={styles.editButtonText}>EDIT PROGRAM</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteProgram}>
            <Text style={styles.deleteButtonText}>DELETE PROGRAM</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neon,
  },
  backButton: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 36,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF6B6B',
    fontFamily: theme.fonts.code,
    fontSize: 16,
  },
  programHeader: {
    paddingVertical: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 0, 0.2)',
    marginBottom: 20,
  },
  programName: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    borderWidth: 1,
    borderColor: theme.colors.neon,
  },
  statusText: {
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
  },
  statValue: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    opacity: 0.7,
  },
  lastWorkoutSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  lastWorkoutText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    opacity: 0.8,
  },
  nextWorkoutSection: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'rgba(0, 255, 0, 0.08)',
  },
  nextWorkoutLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    marginBottom: 4,
  },
  nextWorkoutValue: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoSection: {
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 0, 0.1)',
  },
  infoLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    opacity: 0.7,
  },
  infoValue: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
  },
  scheduleSection: {
    marginBottom: 24,
  },
  scheduleDay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 0, 0.1)',
  },
  scheduleDayName: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    fontWeight: 'bold',
  },
  scheduleWorkoutType: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    opacity: 0.7,
  },
  actionsSection: {
    paddingBottom: 40,
  },
  activateButton: {
    backgroundColor: theme.colors.neon,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  activateButtonText: {
    color: theme.colors.background,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
  },
  editButton: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
  },
  editButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  deleteButtonText: {
    color: '#FF6B6B',
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
