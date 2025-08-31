import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Image, Modal } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useWorkoutSession } from '../context/WorkoutSessionContext';
import { useCardioSession } from '../hooks/useCardioSession';
// Removed Alert-based popups for cardio continue/cancel flow
import theme from '../styles/theme';
import ProgramProgressWidget from '../components/ProgramProgressWidget';
import { ProgramManager } from '../services/programManager';
import { useFocusEffect } from '@react-navigation/native';
import { BottomNav } from '../components/BottomNav';

export default function HomeScreen() {
  const router = useRouter();
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
  const cardio = useCardioSession();

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
  let nextWorkoutDetail: string | null = null;
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
          // If cardio, try to parse params for a compact detail string
          if (template?.template?.category?.toLowerCase() === 'cardio') {
            try {
              const desc = template.template.description || '';
              const parsed = JSON.parse(desc);
              if (parsed?.cardio?.mode === 'hiit') {
                const p = parsed.cardio;
                nextWorkoutDetail = `HIIT ${p.workSec}s/${p.restSec}s x${p.rounds}`;
              } else if (parsed?.cardio?.mode === 'walk_run') {
                const p = parsed.cardio;
                nextWorkoutDetail = `WALK-RUN ${p.runSec}s/${p.walkSec}s x${p.laps}`;
              }
            } catch {}
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
          nextWorkoutDetail,
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
        // Parse params and start appropriate cardio session
        try {
          const desc = template.template.description || '';
          const parsed = JSON.parse(desc);
          if (parsed?.cardio?.mode === 'hiit') {
            await cardio.startHiit({ workSec: parsed.cardio.workSec, restSec: parsed.cardio.restSec, rounds: parsed.cardio.rounds });
            router.push('/cardio/quick-hiit');
            return;
          } else if (parsed?.cardio?.mode === 'walk_run') {
            await cardio.startWalkRun({ runSec: parsed.cardio.runSec, walkSec: parsed.cardio.walkSec, laps: parsed.cardio.laps });
            router.push('/cardio/walk-run');
            return;
          }
        } catch {}
        // Fallback to cardio hub
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
                  nextWorkoutDetail={progress.nextWorkoutDetail}
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
      {(() => {
        const cardioActive = !!cardio.state.sessionId && cardio.state.phase !== 'completed' && cardio.state.phase !== 'idle';
        if (cardioActive) {
          return (
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => {
                if (cardio.state.mode === 'hiit') router.push('/cardio/quick-hiit');
                else if (cardio.state.mode === 'walk_run') router.push('/cardio/walk-run');
                else router.push('/cardio');
              }}
            >
              <Text style={styles.startButtonText}>CONTINUE CARDIO</Text>
            </TouchableOpacity>
          );
        }
        if (isWorkoutActive && (currentExercises?.length ?? 0) > 0) {
          return (
            <TouchableOpacity style={styles.startButton} onPress={() => router.push('/new')}>
              <Text style={styles.startButtonText}>CONTINUE LIFT</Text>
            </TouchableOpacity>
          );
        }
        return (
          <TouchableOpacity style={styles.startButton} onPress={() => setShowTrainingModal(true)}>
            <Text style={styles.startButtonText}>START TRAINING</Text>
          </TouchableOpacity>
        );
      })()}
    </View>

      {/* Bottom Navigation */}
      <BottomNav currentScreen="/" />

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
});