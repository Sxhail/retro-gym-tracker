import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Image, Modal } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useWorkoutSession } from '../context/WorkoutSessionContext';
import theme from '../styles/theme';
import { GlobalRestTimerDisplay } from '../components/GlobalRestTimerDisplay';
import ProgramProgressWidget from '../components/ProgramProgressWidget';
import { ProgramManager } from '../services/programManager';
import { useFocusEffect } from '@react-navigation/native';

const BottomNav = ({ activeTab, onTabPress }: { activeTab: string, onTabPress: (tab: string) => void }) => (
  <SafeAreaView style={styles.bottomNavContainer}>
    <View style={styles.bottomNav}>
      <TouchableOpacity style={styles.navTab} onPress={() => onTabPress('program')}>
        <Text style={[styles.navTabLabel, activeTab === 'program' && styles.navTabLabelActive]}>Program</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.navTab} onPress={() => onTabPress('history')}>
        <Text style={[styles.navTabLabel, activeTab === 'history' && styles.navTabLabelActive]}>History</Text>
      </TouchableOpacity>
      {/* <TouchableOpacity style={styles.navTab} onPress={() => onTabPress('exercises')}>
        <Text style={[styles.navTabLabel, activeTab === 'exercises' && styles.navTabLabelActive]}>Exercises</Text>
      </TouchableOpacity> */}
      <TouchableOpacity style={styles.navTab} onPress={() => onTabPress('progress')}>
        <Text style={[styles.navTabLabel, activeTab === 'progress' && styles.navTabLabelActive]}>Stats</Text>
      </TouchableOpacity>
    </View>
  </SafeAreaView>
);

export default function HomeScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('start');
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [programs, setPrograms] = useState<any[]>([]);
  // Handler for deleting a program from dashboard
  const handleDeleteProgram = async (programId: number) => {
    try {
      // Remove from DB
      await ProgramManager.deleteProgram(programId);
      // Remove from local state
      setPrograms(prev => prev.filter(p => p.id !== programId));
      // Optionally, reload progress
      loadAllProgramsWithProgress();
    } catch (error) {
      console.error('Failed to delete program:', error);
    }
  };
  const [programProgress, setProgramProgress] = useState<any>({});
  const { isWorkoutActive, currentExercises, startProgramWorkout, globalRestTimer } = useWorkoutSession();

  useEffect(() => {
    loadAllProgramsWithProgress();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadAllProgramsWithProgress();
    }, [])
  );

  const loadAllProgramsWithProgress = async () => {
    try {
      const allPrograms = await ProgramManager.getUserPrograms();
      const progressData: any = {};
      for (const program of allPrograms) {
  let nextWorkout = '';
  let nextWorkoutDayName = '';
        let daysSinceLastWorkout = null;
        let currentWeek = program.current_week;
        let totalWeeks = program.duration_weeks;
        let progressPercentage = program.completion_percentage;

        // Get program days and completed workouts
        const programDays = await ProgramManager.getProgramDays(program.id);
        const workoutDays = programDays.filter(day => !day.is_rest_day);
        const totalWorkouts = workoutDays.length * program.duration_weeks;
        // Get completed workouts for this program
        // Use direct DB query for completed workouts
        // For simplicity, use program.current_day and current_week for now

        // Find next workout day
        const completedCount = (program.current_week - 1) * workoutDays.length + (program.current_day - 1);
        const workoutsPerWeek = workoutDays.length;
        const currentDayInWeek = (completedCount % workoutsPerWeek);
        let nextDay = workoutDays[currentDayInWeek];
        if (completedCount >= totalWorkouts) {
          nextWorkout = 'Program Complete';
          nextWorkoutDayName = '';
        } else if (nextDay && nextDay.template_id) {
          // Get workout template name, but only show the workout name (not program name)
          let workoutName = nextDay.day_name;
          nextWorkoutDayName = nextDay.day_name;
          const template = nextDay.template_id && nextDay.day_name ? await ProgramManager.getProgramWorkoutTemplate(program.id, nextDay.day_name) : null;
          if (template && template.template && template.template.name) {
            // If template name is "ProgramName - WorkoutName", extract only WorkoutName
            const parts = template.template.name.split(' - ');
            workoutName = parts.length > 1 ? parts[1] : template.template.name;
          }
          nextWorkout = workoutName;
        } else {
          nextWorkout = nextDay ? nextDay.day_name : 'Next Workout';
          nextWorkoutDayName = nextDay ? nextDay.day_name : '';
        }

        // Days since last workout (use last_workout_date if available)
        if (program.last_workout_date) {
          const lastWorkoutDate = new Date(program.last_workout_date);
          daysSinceLastWorkout = Math.floor((Date.now() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24));
        } else if (program.start_date) {
          const startDate = new Date(program.start_date);
          daysSinceLastWorkout = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        }

        // Calculate progress percentage
        progressPercentage = totalWorkouts > 0 ? Math.round((completedCount / totalWorkouts) * 100) : 0;
        currentWeek = Math.min(Math.floor(completedCount / workoutsPerWeek) + 1, totalWeeks);

        progressData[program.id] = {
          nextWorkout,
          nextWorkoutDayName,
          daysSinceLastWorkout,
          currentWeek,
          totalWeeks,
          progressPercentage,
        };
      }
      setPrograms(allPrograms);
      setProgramProgress(progressData);
    } catch (error) {
      console.error('Error loading programs:', error);
    }
  };

  // Handler for starting the correct program workout
  const handleStartProgramWorkout = async (program) => {
    try {
      // Only allow if program is active and not complete
      const progress = programProgress[program.id];
      if (!program.is_active || !progress || progress.nextWorkout === 'Program Complete' || progress.nextWorkout === 'Rest Day') return;
      // Use the actual day name for the session loader
      const template = await ProgramManager.getProgramWorkoutTemplate(program.id, progress.nextWorkoutDayName);
      // If the next day is a cardio day (category marked as 'cardio'), route to cardio
      // If next day is a cardio day, just route to cardio selection (timers removed for now)
      if (template?.template?.category && template.template.category.toLowerCase() === 'cardio') {
        router.push('/cardio');
        return;
      }
      await startProgramWorkout(program.id, progress.nextWorkoutDayName);
      router.push('/new');
    } catch (error) {
      console.error('Failed to start program workout:', error);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header block: show rest bar here when active, else show protocol text and outline */}
        <View style={{ width: '100%', marginTop: theme.spacing.xs, marginBottom: 0, minHeight: 24 }}>
          {(isWorkoutActive && globalRestTimer?.isActive && (globalRestTimer.timeRemaining ?? 0) > 0)
            ? <View style={{ width: '100%', height: 4, marginHorizontal: 16, marginTop: 4, backgroundColor: 'rgba(0, 0, 0, 0.35)', borderRadius: 2, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${globalRestTimer.timeRemaining / Math.max(1, globalRestTimer.originalDuration) * 100}%`, backgroundColor: theme.colors.neon }} />
              </View>
            : <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, marginHorizontal: 16, marginTop: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 10, height: 10, backgroundColor: theme.colors.neon, borderRadius: 2, marginRight: 6 }} />
                    <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 12, letterSpacing: 1 }}>
                      SYSTEM ONLINE
                    </Text>
                  </View>
                  <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 11, letterSpacing: 1 }}>
                    RETRO FITNESS PROTOCOL
                  </Text>
                </View>
                <View style={{ height: 1, backgroundColor: theme.colors.neon, width: '100%', opacity: 0.7, marginTop: 4 }} />
              </>
          }
        </View>

        {/* Program Progress Widgets for all existing programs */}
        {programs.filter(p => p != null && p.id).map((program) => {
          const progress = programProgress[program.id] || {};
          if (!program.name || !program.duration_weeks) return null;
          return (
            <Swipeable
              key={program.id}
              renderRightActions={() => (
                <TouchableOpacity
                  style={{ backgroundColor: 'red', justifyContent: 'center', alignItems: 'center', width: 100, height: '100%' }}
                  onPress={() => handleDeleteProgram(program.id)}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>Delete</Text>
                </TouchableOpacity>
              )}
            >
              <View style={{ marginBottom: 24 }}>
                <ProgramProgressWidget
                  programName={program.name}
                  currentWeek={progress.currentWeek || program.current_week}
                  totalWeeks={progress.totalWeeks || program.duration_weeks}
                  progressPercentage={progress.progressPercentage || program.completion_percentage}
                  nextWorkout={progress.nextWorkout || 'Inactive'}
                  daysSinceLastWorkout={progress.daysSinceLastWorkout ?? null}
                  onStartWorkout={() => handleStartProgramWorkout(program)}
                />
              </View>
            </Swipeable>
          );
        })}

        {/* Header */}
        <View style={styles.headerSection}>
        </View>
      </ScrollView>

      {/* Action Buttons - moved to bottom */}
    <View style={styles.bottomActionSection}>
  {isWorkoutActive && (currentExercises?.length ?? 0) > 0 ? (
          <TouchableOpacity style={styles.startButton} onPress={() => router.push('/new')}>
            <Text style={styles.startButtonText}>CONTINUE LIFT</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.startButton} onPress={() => setShowTrainingModal(true)}>
            <Text style={styles.startButtonText}>START TRAINING</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabPress={(tab) => {
          setActiveTab(tab);
          if (tab === 'program') router.push('/program');
          if (tab === 'history') router.push('/history');
          // if (tab === 'exercises') router.push('/exercises');
          if (tab === 'progress') router.push('/stats');
        }}
      />

      {/* Training Selection Modal */}
      <Modal
        visible={showTrainingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTrainingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowTrainingModal(false)}>
                <Text style={styles.modalCloseButton}>←</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>SELECT TRAINING TYPE</Text>
              <View style={{ width: 36 }} />
            </View>

            <View style={styles.modalBody}>
              <TouchableOpacity
                style={styles.modalTrainingButton}
                onPress={() => {
                  setShowTrainingModal(false);
                  router.push('/new');
                }}
              >
                <Text style={styles.modalTrainingTitle}>LIFT</Text>
                <Text style={styles.modalTrainingDescription}>Weight training with sets and reps</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalTrainingButton}
                onPress={() => {
                  setShowTrainingModal(false);
                  router.push('/cardio');
                }}
              >
                <Text style={styles.modalTrainingTitle}>CARDIO</Text>
                <Text style={styles.modalTrainingDescription}>Cardio sessions and HIIT workouts</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flex: 1,
    paddingBottom: 20, // Reduced padding since button is outside
  },
  headerSection: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  title: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.display,
    fontWeight: 'bold',
    fontSize: 28,
    letterSpacing: 2,
  },
  pageTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1.5,
    marginTop: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: theme.colors.neonDim,
    fontFamily: theme.fonts.body,
    fontSize: 13,
    marginTop: 2,
    marginBottom: 0,
  },
  section: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
  },
  bottomActionSection: {
    marginHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.xl + 80, // Add extra margin to prevent overlap with nav bar
    marginTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md, // Additional padding for spacing
  },
  sectionTitle: {
    color: '#fff',
    fontFamily: theme.fonts.heading,
    fontWeight: 'bold',
    fontSize: 22,
    marginBottom: 2,
  },
  sectionSub: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    marginBottom: theme.spacing.sm,
  },
  startButton: {
    backgroundColor: 'rgba(0, 255, 0, 0.15)',
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 12,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    width: '100%',
  },
  startButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.display,
    fontWeight: 'bold',
    fontSize: 18,
    letterSpacing: 1,
  },
  templatesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  templatesScroll: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  templateCard: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.neonDim,
    borderWidth: 2,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginRight: theme.spacing.md,
    minWidth: 160,
    maxWidth: 200,
  },
  templateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  templateCardTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading,
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1,
  },
  menuButton: {
    marginLeft: 8,
    padding: 2,
  },
  menuButtonText: {
    color: theme.colors.neon,
    fontSize: 18,
    fontWeight: 'bold',
  },
  templateCardPreview: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 13,
    marginTop: 2,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    marginTop: 8,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    marginTop: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: theme.colors.neon,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neon,
  },
  modalCloseButton: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 36,
    fontWeight: 'bold',
  },
  modalTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  modalBody: {
    padding: 16,
    gap: 12,
  },
  modalTrainingButton: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
  },
  modalTrainingTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.display,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  modalTrainingDescription: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
  bottomNavContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 100,
    // For iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    // For Android elevation
    elevation: 16,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neonDim,
    paddingVertical: 8,
    paddingBottom: 8,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    marginHorizontal: 0,
  },
  navTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginHorizontal: 4,
    paddingVertical: 8,
    // Add a subtle border and background for clickable look
    borderWidth: 1,
    borderColor: 'rgba(0,255,0,0.15)',
    backgroundColor: 'rgba(0,255,0,0.04)',
    shadowColor: '#00FF00',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  navTabIcon: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.code,
    fontSize: 22,
    marginBottom: 2,
  },
  navTabIconActive: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
  },
  navTabLabel: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  navTabLabelActive: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    backgroundColor: 'rgba(0,255,0,0.10)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});