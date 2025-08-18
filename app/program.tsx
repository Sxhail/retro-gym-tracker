import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, Alert, Modal, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { eq } from 'drizzle-orm';
import theme from '../styles/theme';
import { db } from '../db/client';
import * as schema from '../db/schema';
import { ProgramManager, ProgramData } from '../services/programManager';
import ExerciseCard from '../components/ExerciseCard';
import { dbOperations } from '../services/database';
import { getExerciseMaxWeights } from '../services/workoutHistory';

interface ProgramConfig {
  programName: string;
  duration: string;
  goal: 'strength' | 'hypertrophy' | 'endurance' | 'powerlifting' | null;
  frequency: string;
}

interface DayWorkout {
  day: string;
  workoutType: string;
  exercises: Array<{
    id: number;
    name: string;
    sets: number;
    reps: string;
  }>;
}

export default function ProgramScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Clear temp workouts when starting a new program (step 1)
  useEffect(() => {
    if (step === 1) {
      db.delete(schema.temp_program_workouts);
    }
  }, [step]);
  const [config, setConfig] = useState<ProgramConfig>({
    programName: '',
    duration: '',
    goal: null,
    frequency: '',
  });
  const [workouts, setWorkouts] = useState<DayWorkout[]>([]);
  const [assignedDays, setAssignedDays] = useState<Set<string>>(new Set());

  // Exercise picker states (same as new.tsx)
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [pickerExercises, setPickerExercises] = useState<any[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('All');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('A-Z');
  const [maxWeights, setMaxWeights] = useState<Record<number, { weight: number; reps: number }>>({});
  
  // Add exercise modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newMuscleGroups, setNewMuscleGroups] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [adding, setAdding] = useState(false);

  // Program exercises for step 2
  const [programExercises, setProgramExercises] = useState<Array<{
    id: number;
    name: string;
    sets: number;
    reps: string;
  }>>([]);

  const MUSCLE_GROUP_OPTIONS = [
    'Chest', 'Back', 'Legs', 'Glutes', 'Shoulders', 'Triceps', 'Biceps', 'Core', 'Arms'
  ];
  const CATEGORY_OPTIONS = [
    'Barbell', 'Dumbbell', 'Machine', 'Smith Machine', 'Bodyweight', 'Cable', 'Trap Bar', 'Kettlebell', 'Band', 'Other'
  ];

  // Load temp workout data when reaching step 4
  useEffect(() => {
    const loadTempWorkoutData = async () => {
      if (step === 4) {
        try {
          const tempWorkouts = await db.select().from(schema.temp_program_workouts);
          const formattedWorkouts: DayWorkout[] = tempWorkouts.map(tw => ({
            day: tw.day_name,
            workoutType: tw.workout_type,
            exercises: JSON.parse(tw.exercises_json)
          }));
          setWorkouts(formattedWorkouts);
          
          // Update assigned days based on saved workouts
          const savedDays = new Set(tempWorkouts.map(tw => tw.day_name));
          setAssignedDays(savedDays);
        } catch (error) {
          console.error('Error loading temp workout data:', error);
        }
      }
    };

    loadTempWorkoutData();
  }, [step]);

  const isStepComplete = (stepNum: number) => {
    switch (stepNum) {
      case 2:
        return config.programName.trim() && config.duration && config.goal && config.frequency;
      case 3:
        // At least one day must be assigned (can't have a program with all rest days)
        return assignedDays.size >= 1;
      case 4:
        return true; // For now, this step is always "complete"
      default:
        return false;
    }
  };

  const handleDayAssignment = (day: string) => {
    // Navigate to workout editor for this day
    router.push(`/program/editor/${day.toLowerCase()}`);
  };

  // Load assigned days when component mounts or step changes
  useEffect(() => {
    const loadAssignedDays = async () => {
      if (step === 3) {
        try {
          const tempWorkouts = await db.select().from(schema.temp_program_workouts);
          const savedDays = new Set(tempWorkouts.map(tw => tw.day_name));
          setAssignedDays(savedDays);
        } catch (error) {
          console.error('Error loading assigned days:', error);
        }
      }
    };

    loadAssignedDays();
  }, [step]);

  useFocusEffect(
    React.useCallback(() => {
      if (step === 3) {
        (async () => {
          try {
            const tempWorkouts = await db.select().from(schema.temp_program_workouts);
            const savedDays = new Set(tempWorkouts.map(tw => tw.day_name));
            setAssignedDays(savedDays);
          } catch (error) {
            console.error('Error loading assigned days:', error);
          }
        })();
      }
    }, [step])
  );

  const markDayAsAssigned = (day: string) => {
    setAssignedDays(prev => new Set([...prev, day.toUpperCase()]));
  };

  const handleCommitProgram = async () => {
    try {
      // Create array of all 7 days with workout or rest day data
      const allDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
      const programDays = allDays.map((dayName, index) => {
        const workoutForDay = workouts.find(w => w.day.toUpperCase() === dayName);
        if (workoutForDay) {
          return {
            dayName,
            dayOrder: index + 1,
            workoutType: workoutForDay.workoutType,
            exercises: workoutForDay.exercises,
            isRestDay: false,
          };
        } else {
          return {
            dayName,
            dayOrder: index + 1,
            workoutType: 'Rest Day',
            exercises: [],
            isRestDay: true,
          };
        }
      });

      const programData: ProgramData = {
        name: config.programName,
        description: `${config.goal} program with ${config.frequency} frequency`,
        durationWeeks: parseInt(config.duration),
        days: programDays,
      };

      // Create the program in the database (does not overwrite previous)
      const programId = await ProgramManager.createProgram(programData);

      // Only activate the new program, previous programs remain in DB
      await ProgramManager.activateProgram(programId);

      // Clean up temp workout data for next creation
      await db.delete(schema.temp_program_workouts);

      Alert.alert(
        'Program Created!',
        `${config.programName} has been created and activated. You can now track your progress on the home screen.`,
        [{ text: 'OK', onPress: () => router.push('/') }]
      );
    } catch (error) {
      console.error('Error committing program:', error);
      Alert.alert('Error', 'Failed to create program. Please try again.');
    }
  };

  const handleContinue = () => {
    if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  // Load active programs for info box
  const [allPrograms, setAllPrograms] = useState<any[]>([]);
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const programs = await ProgramManager.getUserPrograms();
        setAllPrograms(programs);
      } catch (err) {
        setAllPrograms([]);
      }
    };
    fetchPrograms();
  }, []);

  // Delete program handler
  const handleDeleteProgram = async (programId: number) => {
    try {
      await ProgramManager.deleteProgram(programId);
      setAllPrograms(allPrograms.filter(p => p.id !== programId));
      Alert.alert('Deleted', 'Program deleted.');
    } catch (err) {
      Alert.alert('Error', 'Could not delete program.');
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backButton}>←</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>TRAINING PROGRAMS</Text>
      <View style={{ width: 36 }} />
    </View>
  );

  const renderProgressIndicator = () => (
    <View style={styles.progressContainer}>
      <Text style={styles.progressLabel}>- BUILDING CUSTOM PROGRAM</Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((step - 1) / 3) * 100}%` }]} />
      </View>
      <Text style={styles.stepIndicator}>
        STEP {step - 1}/3 - {
          step === 2 ? 'CREATION METHOD' :
          step === 3 ? 'PROGRAM BUILDING' :
          'FINAL REVIEW & LAUNCH'
        }
      </Text>
    </View>
  );

  const renderConfigSection = (title: string, status: string, options: any[], selectedValue: any, onSelect: (value: any) => void) => (
    <View style={styles.configSection}>
      <View style={styles.configHeader}>
        <View style={styles.configTitleRow}>
          <Text style={styles.configTitle}>{title}</Text>
        </View>
        <Text style={styles.configStatus}>{status}</Text>
      </View>
      <View style={styles.optionsGrid}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              selectedValue === option.value && styles.optionButtonSelected
            ]}
            onPress={() => onSelect(option.value)}
          >
            <Text style={[
              styles.optionLabel,
              selectedValue === option.value && styles.optionLabelSelected
            ]}>
              {option.label}
            </Text>
            <Text style={[
              styles.optionSubtext,
              selectedValue === option.value && styles.optionSubtextSelected
            ]}>
              {option.subtext}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <ScrollView style={styles.content}>
      {/* Program Name */}
      <View style={styles.configSection}>
        <View style={styles.configHeader}>
          <Text style={styles.configTitle}>PROGRAM NAME</Text>
          <Text style={styles.configStatus}>{config.programName ? 'SET' : 'NOT SET'}</Text>
        </View>
        <TextInput
          style={styles.standaloneTextInput}
          placeholderTextColor={theme.colors.neon + '60'}
          value={config.programName}
          onChangeText={(text) => setConfig({ ...config, programName: text })}
        />
      </View>

      {/* Duration */}
      <View style={styles.configSection}>
        <View style={styles.configHeader}>
          <Text style={styles.configTitle}>DURATION</Text>
          <Text style={styles.configStatus}>{config.duration ? 'SET' : 'NOT SET'}</Text>
        </View>
        <View style={styles.inputWithLabel}>
          <TextInput
            style={styles.textInput}
            placeholderTextColor={theme.colors.neon + '60'}
            value={config.duration}
            onChangeText={(text) => {
              // Only allow numbers
              const numericText = text.replace(/[^0-9]/g, '');
              setConfig({ ...config, duration: numericText });
            }}
            keyboardType="numeric"
          />
          <Text style={styles.inputSuffix}>weeks</Text>
        </View>
      </View>

      {renderConfigSection(
        'PRIMARY GOAL',
        config.goal ? 'SET' : 'NOT SET',
        [
          { value: 'strength', label: 'STRENGTH', subtext: 'MAX POWER' },
          { value: 'hypertrophy', label: 'HYPERTROPHY', subtext: 'MUSCLE MASS' },
          { value: 'endurance', label: 'ENDURANCE', subtext: 'CONDITIONING' },
          { value: 'powerlifting', label: 'POWERLIFTING', subtext: 'COMP PREP' },
        ],
        config.goal,
        (value) => setConfig({ ...config, goal: value })
      )}

      {/* Frequency */}
      <View style={styles.configSection}>
        <View style={styles.configHeader}>
          <Text style={styles.configTitle}>FREQUENCY</Text>
          <Text style={styles.configStatus}>{config.frequency ? 'SET' : 'NOT SET'}</Text>
        </View>
        <View style={styles.inputWithLabel}>
          <TextInput
            style={styles.textInput}
            placeholderTextColor={theme.colors.neon + '60'}
            value={config.frequency}
            onChangeText={(text) => {
              // Only allow numbers
              const numericText = text.replace(/[^0-9]/g, '');
              setConfig({ ...config, frequency: numericText });
            }}
            keyboardType="numeric"
          />
          <Text style={styles.inputSuffix}>days/week</Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView style={styles.content}>
      <View style={styles.configSection}>
        <View style={styles.configHeader}>
          <Text style={styles.configTitle}>ASSIGN WORKOUTS TO DAYS</Text>
        </View>
        
        <View style={styles.weekdaysGrid}>
          {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((day) => {
            const isAssigned = assignedDays.has(day);
            return (
              <TouchableOpacity 
                key={day} 
                style={[
                  styles.weekdayCard,
                  isAssigned && styles.weekdayCardAssigned
                ]}
                onPress={() => handleDayAssignment(day)}
              >
                <Text style={[
                  styles.weekdayTitle,
                  isAssigned && styles.weekdayTitleAssigned
                ]}>
                  {day}
                </Text>
                <Text style={[
                  styles.weekdaySubtext,
                  isAssigned && styles.weekdaySubtextAssigned
                ]}>
                  {isAssigned ? 'ASSIGNED' : 'CLICK TO ASSIGN'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );

  const renderStep4 = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.reviewContainer}>
        <Text style={styles.reviewTitle}>PROGRAM REVIEW</Text>
        
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>PROGRAM NAME:</Text>
            <Text style={styles.summaryValue}>{config.programName || 'UNNAMED PROGRAM'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>DURATION:</Text>
            <Text style={styles.summaryValue}>{config.duration ? `${config.duration} weeks` : 'NOT SET'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>GOAL:</Text>
            <Text style={styles.summaryValue}>{config.goal?.toUpperCase() || 'NOT SET'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>FREQUENCY:</Text>
            <Text style={styles.summaryValue}>{config.frequency ? `${config.frequency} days/week` : 'NOT SET'}</Text>
          </View>
        </View>

        <View style={styles.weeklyScheduleSection}>
          <Text style={styles.weeklyScheduleTitle}>WEEKLY SCHEDULE:</Text>
          <View style={styles.scheduleContent}>
            {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((dayName) => {
              const dayWorkout = workouts.find(w => w.day.toUpperCase() === dayName);
              
              return (
                <View key={dayName} style={styles.scheduleDay}>
                  <Text style={styles.scheduleDayName}>{dayName.substring(0, 3).toUpperCase()}:</Text>
                  
                  {dayWorkout ? (
                    <>
                      <Text style={styles.scheduleWorkoutType}>{dayWorkout.workoutType}</Text>
                      {dayWorkout.exercises.length > 0 ? (
                        <>
                          <Text style={styles.scheduleExercises}>
                            {dayWorkout.exercises.map(ex => ex.name).join(', ')}
                          </Text>
                          <Text style={styles.scheduleWeightsSets}>
                            {dayWorkout.exercises.map(ex => `${ex.sets}x${ex.reps}`).join(', ')}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.scheduleExercises}>No exercises assigned</Text>
                      )}
                    </>
                  ) : (
                    <>
                      <Text style={styles.scheduleWorkoutType}>REST</Text>
                      <Text style={styles.scheduleExercises}>Not assigned</Text>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.metricsSection}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>TOTAL WEEKLY SESSIONS:</Text>
            <Text style={styles.metricValue}>{workouts.length}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>EXERCISES PER WEEK:</Text>
            <Text style={styles.metricValue}>
              {workouts.reduce((total, workout) => total + workout.exercises.length, 0)}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderFooter = () => (
    <View style={styles.footer}>
      <TouchableOpacity 
        style={styles.backButtonFooter}
        onPress={() => step > 1 ? setStep(step - 1) : router.back()}
      >
        <Text style={styles.backButtonText}>← BACK</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[
          styles.continueButton,
          !isStepComplete(step) && styles.continueButtonDisabled
        ]}
        onPress={step === 4 ? handleCommitProgram : handleContinue}
        disabled={!isStepComplete(step)}
      >
        <Text style={[
          styles.continueButtonText,
          !isStepComplete(step) && styles.continueButtonTextDisabled
        ]}>
          {step === 4 ? 'COMMIT TO PROGRAM' : 'CONTINUE →'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      {/* Show pathway selection only on step 1, otherwise show progress */}
      {step === 1 ? (
        <View style={styles.pathwayContainer}>
          {/* YOUR PROGRAMS section with improved UI */}
          <View style={styles.programsSection}>
            <Text style={styles.programsSectionTitle}>YOUR PROGRAMS</Text>
            {allPrograms.length === 0 ? (
              <View style={styles.programsEmptyState}>
                <Text style={styles.programsEmptyText}>NO PROGRAMS CREATED</Text>
                <Text style={styles.programsEmptySubtext}>Create your first program below</Text>
              </View>
            ) : (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.programsCarousel}
                contentContainerStyle={styles.programsCarouselContent}
              >
                {allPrograms.map((program, index) => (
                  <TouchableOpacity
                    key={program.id}
                    style={[
                      styles.programCard,
                      program.is_active && styles.programCardActive
                    ]}
                    onPress={() => router.push(`/program/${program.id}`)}
                    activeOpacity={0.8}
                  >
                    {/* Active indicator */}
                    {program.is_active && (
                      <View style={styles.activeIndicator}>
                        <Text style={styles.activeIndicatorText}>● ACTIVE</Text>
                      </View>
                    )}
                    
                    {/* Program name */}
                    <Text style={[
                      styles.programCardName,
                      program.is_active && styles.programCardNameActive
                    ]}>
                      {program.name}
                    </Text>
                    
                    {/* Program meta */}
                    <View style={styles.programCardMeta}>
                      <Text style={[
                        styles.programCardMetaText,
                        program.is_active && styles.programCardMetaTextActive
                      ]}>
                        {program.duration_weeks} WEEKS
                      </Text>
                      <Text style={[
                        styles.programCardMetaText,
                        program.is_active && styles.programCardMetaTextActive
                      ]}>
                        {Math.round(program.completion_percentage || 0)}% DONE
                      </Text>
                    </View>
                    
                    {/* Progress bar */}
                    <View style={styles.programCardProgressBar}>
                      <View 
                        style={[
                          styles.programCardProgressFill,
                          { width: `${program.completion_percentage || 0}%` },
                          program.is_active && styles.programCardProgressFillActive
                        ]} 
                      />
                    </View>
                    
                    {/* Quick actions */}
                    <View style={styles.programCardActions}>
                      <Text style={[
                        styles.programCardActionText,
                        program.is_active && styles.programCardActionTextActive
                      ]}>
                        TAP FOR DETAILS
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
          
          {/* Template Path */}
          <TouchableOpacity 
            style={styles.pathwayCard}
            onPress={() => router.push('/templates')}
          >
            <View style={styles.pathwayHeader}>
              <Text style={styles.pathwayCardTitle}>TEMPLATES</Text>
            </View>
            <Text style={styles.pathwayDescription}>
              One off workout routines, shock the muscle challenges
            </Text>
          </TouchableOpacity>
          
          {/* Programs Path */}
          <TouchableOpacity 
            style={styles.pathwayCard}
            onPress={() => {
              // TODO: Navigate to programs screen when implemented
              console.log('Programs navigation not yet implemented');
            }}
          >
            <View style={styles.pathwayHeader}>
              <Text style={styles.pathwayCardTitle}>PROGRAMS</Text>
            </View>
            <Text style={styles.pathwayDescription}>
              Find, commit and track a pre built program
            </Text>
          </TouchableOpacity>
          
          {/* Custom Program Path */}
          <TouchableOpacity 
            style={styles.pathwayCard}
            onPress={() => setStep(2)}
          >
            <View style={styles.pathwayHeader}>
              <Text style={styles.pathwayCardTitle}>BUILD CUSTOM PROGRAM</Text>
            </View>
            <Text style={styles.pathwayDescription}>
              Build and track a longterm program
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        renderProgressIndicator()
      )}
      
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
      {step > 1 && renderFooter()}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neon,
  },
  backButton: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 36,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neon,
  },
  progressLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.neon,
    borderRadius: 2,
  },
  pathwayContainer: {
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  programsBox: {
    backgroundColor: 'rgba(0,255,0,0.05)',
    borderColor: theme.colors.neon,
    borderWidth: 1,
    borderRadius: 12,
    margin: 16,
    marginBottom: 8,
    padding: 16,
  },
  programsTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.display,
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
    letterSpacing: 1,
  },
  programsEmpty: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    marginBottom: 4,
  },
  programRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neonDim,
    paddingVertical: 8,
  },
  programName: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.display,
    fontWeight: 'bold',
    fontSize: 15,
  },
  programMeta: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 13,
  },
  deleteButton: {
    marginLeft: 12,
    backgroundColor: 'rgba(0,255,0,0.10)',
      borderRadius: 12,
      padding: 2,
    borderWidth: 1,
    borderColor: theme.colors.neon,
  },
  // ...existing code...
  deleteButtonText: {
    color: theme.colors.neon,
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: theme.fonts.display,
  },
  pathwayCard: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
  },
  pathwayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pathwayCardTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.display,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  pathwayBadge: {
    color: theme.colors.background,
    backgroundColor: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    letterSpacing: 1,
  },
  pathwayDescription: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    opacity: 0.9,
  },
  pathwayFeatures: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.7,
  },
  stepIndicator: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  configSection: {
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    backgroundColor: 'rgba(0, 255, 0, 0.06)',
  },
  configHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  configTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  configTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    fontWeight: 'bold',
  },
  configStatus: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 0, 0.08)',
    opacity: 0.7,
  },
  optionButtonSelected: {
    backgroundColor: theme.colors.neon,
    opacity: 1,
  },
  optionLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: theme.colors.background,
  },
  optionSubtext: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.7,
  },
  optionSubtextSelected: {
    color: theme.colors.background,
    opacity: 1,
  },
  methodGrid: {
    gap: 12,
  },
  methodCard: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  methodTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  methodDescription: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 8,
  },
  methodBadge: {
    color: theme.colors.background,
    backgroundColor: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neon,
  },
  backButtonFooter: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
  },
  continueButton: {
    backgroundColor: theme.colors.neon,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(0, 255, 0, 0.3)',
  },
  continueButtonText: {
    color: theme.colors.background,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
  },
  continueButtonTextDisabled: {
    opacity: 0.5,
  },
  // Step 3 & 4 styles
  buildingSection: {
    marginBottom: 16,
  },
  buildingSectionTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  weekGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  weekCard: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 4,
    padding: 8,
    minWidth: '30%',
    alignItems: 'center',
  },
  weekNumber: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    fontWeight: 'bold',
  },
  weekType: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 8,
    opacity: 0.7,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  dayCard: {
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 4,
    padding: 12,
    minWidth: '45%',
    alignItems: 'center',
  },
  dayLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
  },
  daySubtext: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 8,
    opacity: 0.7,
  },
  progressionGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  progressionCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
  },
  progressionTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    fontWeight: 'bold',
  },
  progressionDesc: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 8,
    opacity: 0.7,
  },
  reviewContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  reviewTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 1,
  },
  summarySection: {
    marginBottom: 20,
    backgroundColor: 'rgba(0, 255, 0, 0.08)',
    borderRadius: 8,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    opacity: 0.8,
  },
  summaryValue: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    fontWeight: 'bold',
  },
  featuresSection: {
    marginBottom: 16,
  },
  featuresTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  featureCheck: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    marginRight: 8,
  },
  featureText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    opacity: 0.8,
  },
  deployButton: {
    backgroundColor: theme.colors.neon,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  deployButtonText: {
    color: theme.colors.background,
    fontFamily: theme.fonts.heading,
    fontSize: 14,
    fontWeight: 'bold',
  },
  textInput: {
    flex: 1,
    borderWidth: 0,
    padding: 12,
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    backgroundColor: 'transparent',
  },
  standaloneTextInput: {
    borderRadius: 8,
    padding: 12,
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    backgroundColor: 'rgba(0, 255, 0, 0.08)',
  },
  weekdaysGrid: {
    gap: 16,
  },
  weekdayCard: {
    borderRadius: 8,
    padding: 16,
    backgroundColor: 'rgba(0, 255, 0, 0.08)',
    alignItems: 'center',
  },
  weekdayCardAssigned: {
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
  },
  weekdayTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  weekdayTitleAssigned: {
    color: theme.colors.neon,
  },
  weekdaySubtext: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    opacity: 0.8,
  },
  weekdaySubtextAssigned: {
    opacity: 1,
    fontWeight: 'bold',
  },
  weeklyScheduleSection: {
    marginBottom: 20,
  },
  weeklyScheduleTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    opacity: 0.9,
  },
  scheduleContent: {
    backgroundColor: 'rgba(0, 255, 0, 0.08)',
    borderRadius: 8,
    padding: 16,
  },
  scheduleDay: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 0, 0.2)',
  },
  scheduleDayName: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  scheduleWorkoutType: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    fontWeight: 'bold',
    opacity: 0.9,
    marginBottom: 6,
    letterSpacing: 1,
  },
  scheduleExercises: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 13,
    opacity: 0.8,
    marginBottom: 4,
    lineHeight: 18,
  },
  scheduleWeightsSets: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.heading, // Orbitron font
    fontSize: 12,
    fontWeight: 'bold',
    opacity: 0.9,
    letterSpacing: 0.5,
  },
  metricsSection: {
    marginBottom: 24,
    backgroundColor: 'rgba(0, 255, 0, 0.06)',
    borderRadius: 8,
    padding: 16,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    opacity: 0.8,
  },
  metricValue: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
  },
  commitButton: {
    backgroundColor: theme.colors.neon,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  commitButtonText: {
    color: theme.colors.background,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  inputWithLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 0, 0.08)',
  },
  inputSuffix: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    marginRight: 12,
  },
  // Enhanced YOUR PROGRAMS styles
  programsSection: {
    marginBottom: 20,
  },
  programsSectionTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.display,
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 16,
    textAlign: 'center',
  },
  programsEmptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 0, 0.3)',
    borderRadius: 12,
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
  },
  programsEmptyText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  programsEmptySubtext: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    opacity: 0.7,
  },
  programsCarousel: {
    marginBottom: 8,
  },
  programsCarouselContent: {
    paddingHorizontal: 8,
  },
  programCard: {
    width: 240,
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 0, 0.3)',
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'rgba(0, 255, 0, 0.05)',
    minHeight: 140,
  },
  programCardActive: {
    borderColor: theme.colors.neon,
    borderWidth: 2,
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    shadowColor: theme.colors.neon,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  activeIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: theme.colors.neon,
  },
  activeIndicatorText: {
    color: theme.colors.background,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    fontWeight: 'bold',
  },
  programCardName: {
    color: 'rgba(0, 255, 0, 0.7)',
    fontFamily: theme.fonts.heading,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 8,
  },
  programCardNameActive: {
    color: theme.colors.neon,
  },
  programCardMeta: {
    marginBottom: 12,
  },
  programCardMetaText: {
    color: 'rgba(0, 255, 0, 0.5)',
    fontFamily: theme.fonts.code,
    fontSize: 12,
    marginBottom: 2,
  },
  programCardMetaTextActive: {
    color: 'rgba(0, 255, 0, 0.8)',
  },
  programCardProgressBar: {
    height: 4,
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  programCardProgressFill: {
    height: '100%',
    backgroundColor: 'rgba(0, 255, 0, 0.5)',
    borderRadius: 2,
  },
  programCardProgressFillActive: {
    backgroundColor: theme.colors.neon,
  },
  programCardActions: {
    alignItems: 'center',
  },
  programCardActionText: {
    color: 'rgba(0, 255, 0, 0.4)',
    fontFamily: theme.fonts.code,
    fontSize: 10,
    letterSpacing: 1,
  },
  programCardActionTextActive: {
    color: 'rgba(0, 255, 0, 0.7)',
  },
});
