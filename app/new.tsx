import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator, PanResponder, Animated, SafeAreaView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import theme from '../styles/theme';
import { db } from '../db/client';
import * as schema from '../db/schema';
import { useWorkoutSession } from '../context/WorkoutSessionContext';
import { loadTemplateIntoSession } from '../services/workoutTemplates';

export type Exercise = typeof schema.exercises.$inferSelect;

// --- SetRow component for swipe-to-remove ---
function SetRow({ set, setIdx, exerciseId, handleSetFieldChange, handleToggleSetComplete, handleRemoveSet, theme }: any) {
  const pan = useRef(new Animated.Value(0)).current;
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_: any, gestureState: any) => Math.abs(gestureState.dx) > 20,
    onPanResponderMove: Animated.event([
      null,
      { dx: pan }
    ], { useNativeDriver: false }),
    onPanResponderRelease: (_: any, gestureState: any) => {
      if (Math.abs(gestureState.dx) > 80) {
        handleRemoveSet(exerciseId, setIdx);
      } else {
        Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
      }
    },
    onPanResponderTerminate: () => {
      Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
    }
  }), [exerciseId, setIdx]);

  // Only allow marking as complete if both KG and REPS are positive numbers
  const canComplete = !!set.weight && !!set.reps && Number(set.weight) > 0 && Number(set.reps) > 0;

  // Rest timer state (per set)
  const [restTime, setRestTime] = useState(set.rest ?? 120);
  const [restActive, setRestActive] = useState(false);
  const restInterval = useRef<any>(null);

  // Update rest duration handler
  const handleRestChange = (delta: number) => {
    let newRest = Math.max(15, Math.min(Number(set.rest ?? 120) + delta, 600));
    handleSetFieldChange(exerciseId, setIdx, 'rest', String(newRest));
    // If timer is running, reset timer to new value
    if (restActive) {
      setRestTime(newRest);
    }
  };

  // Start/stop rest timer when set is marked/unmarked as complete
  useEffect(() => {
    if (set.completed && canComplete) {
      setRestActive(true);
      setRestTime(Number(set.rest ?? 120));
      if (restInterval.current) clearInterval(restInterval.current);
      restInterval.current = setInterval(() => {
        setRestTime((prev) => {
          if (prev > 0) return prev - 1;
          clearInterval(restInterval.current);
          return 0;
        });
      }, 1000);
    } else {
      setRestActive(false);
      setRestTime(Number(set.rest ?? 120));
      if (restInterval.current) clearInterval(restInterval.current);
    }
    return () => {
      if (restInterval.current) clearInterval(restInterval.current);
    };
  }, [set.completed, canComplete, set.restActive, set.rest]);

  // Format rest timer mm:ss
  function formatRestTimer(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <>
      <Animated.View
        style={{
          transform: [{ translateX: pan }],
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 10,
          padding: 6,
          borderWidth: 1,
          borderColor: theme.colors.neon,
          borderRadius: 6,
          backgroundColor: 'rgba(0,255,0,0.05)',
        }}
        {...panResponder.panHandlers}
      >
        <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 14, marginRight: 8, minWidth: 48 }}>SET {setIdx + 1}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {/* KG label and input */}
          <View style={{ alignItems: 'center', marginRight: 6 }}>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 10, marginBottom: 2 }}>KG</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 4, color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 14, width: 48, padding: 2, backgroundColor: 'transparent', textAlign: 'center' }}
              value={set.weight?.toString() || ''}
              onChangeText={v => handleSetFieldChange(exerciseId, setIdx, 'weight', v)}
              placeholder=""
              placeholderTextColor={theme.colors.neon}
              keyboardType="numeric"
            />
          </View>
          {/* REPS label and input */}
          <View style={{ alignItems: 'center', marginRight: 6 }}>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 10, marginBottom: 2 }}>REPS</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 4, color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 14, width: 48, padding: 2, backgroundColor: 'transparent', textAlign: 'center' }}
              value={set.reps?.toString() || ''}
              onChangeText={v => handleSetFieldChange(exerciseId, setIdx, 'reps', v)}
              placeholder=""
              placeholderTextColor={theme.colors.neon}
              keyboardType="numeric"
            />
          </View>
          {/* NOTES label and input */}
          <View style={{ justifyContent: 'center', alignItems: 'center', marginRight: 6, flex: 1 }}>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 10, marginBottom: 2 }}>NOTES</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 4, color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 12, padding: 2, backgroundColor: 'transparent', textAlign: 'left', width: '100%' }}
              value={set.notes || ''}
              onChangeText={v => {
                // Limit notes to 200 characters
                if (v.length <= 200) {
                  handleSetFieldChange(exerciseId, setIdx, 'notes', v);
                }
              }}
              placeholder="-"
              placeholderTextColor={theme.colors.neon}
              multiline={false}
              maxLength={200}
            />
          </View>
        </View>
        {/* Done toggle */}
        <TouchableOpacity
          onPress={() => canComplete && handleToggleSetComplete(exerciseId, setIdx)}
          style={{ marginLeft: 'auto' }}
          disabled={!canComplete}
        >
          <Text style={{
            color: canComplete
              ? (set.completed ? theme.colors.success : theme.colors.neon)
              : '#444',
            fontFamily: theme.fonts.code,
            fontSize: 24,
            fontWeight: 'bold',
            borderWidth: set.completed && canComplete ? 2 : 1,
            borderColor: canComplete
              ? (set.completed ? theme.colors.success : theme.colors.neon)
              : '#444',
            borderRadius: 16,
            paddingHorizontal: 8,
            paddingVertical: 2,
            backgroundColor: set.completed && canComplete ? 'rgba(0,255,0,0.15)' : 'transparent',
            overflow: 'hidden',
            textAlign: 'center',
            minWidth: 32,
            opacity: canComplete ? 1 : 0.4,
          }}>{set.completed ? '✓' : '○'}</Text>
        </TouchableOpacity>
      </Animated.View>
      {/* Rest timer below set row */}
      {restActive && restTime > 0 && (
        <View style={{ alignItems: 'center', marginBottom: 8, flexDirection: 'row', justifyContent: 'center' }}>
          <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16, fontWeight: 'bold', letterSpacing: 1.2, marginRight: 12 }}>
            REST: {formatRestTimer(restTime)}
          </Text>
          <TouchableOpacity onPress={() => handleRestChange(-15)} style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 4, paddingHorizontal: 8, marginRight: 4 }}>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 18 }}>-</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 14, marginHorizontal: 2 }}>{Math.max(15, set.rest ?? 120)}s</Text>
          <TouchableOpacity onPress={() => handleRestChange(15)} style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 4, paddingHorizontal: 8, marginLeft: 4 }}>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 18 }}>+</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

export default function NewWorkoutScreen() {
  const [exercise, setExercise] = useState('');
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [pickerExercises, setPickerExercises] = useState<Exercise[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('All');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('A-Z');
  const router = useRouter();
  const { templateId } = useLocalSearchParams<{ templateId?: string }>();
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<any>(null);
  const [workoutDate, setWorkoutDate] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  // Add state for pause
  const [isPaused, setIsPaused] = useState(false);

  // Add state for custom exercise modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newMuscleGroups, setNewMuscleGroups] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [adding, setAdding] = useState(false);

  const MUSCLE_GROUP_OPTIONS = [
    'Chest', 'Back', 'Legs', 'Glutes', 'Shoulders', 'Triceps', 'Biceps', 'Core', 'Arms'
  ];
  const CATEGORY_OPTIONS = [
    'Barbell', 'Dumbbell', 'Machine', 'Smith Machine', 'Bodyweight', 'Cable', 'Trap Bar', 'Kettlebell', 'Band', 'Other'
  ];

  // Use workout session context
  const {
    currentExercises: sessionExercises,
    setCurrentExercises,
    workoutName,
    setWorkoutName,
    sessionStartTime,
    isWorkoutActive,
    startWorkout,
    endWorkout,
    saveWorkout,
    resetSession
  } = useWorkoutSession();

  // Load exercises for modal (search-aware with filters)
  useEffect(() => {
    let isActive = true;
    setPickerLoading(true);
    const fetch = search.trim()
      ? db.select().from(schema.exercises).then(results => results.filter(ex => 
          ex.name.toLowerCase().includes(search.trim().toLowerCase()) ||
          ex.muscle_group?.toLowerCase().includes(search.trim().toLowerCase()) ||
          ex.category?.toLowerCase().includes(search.trim().toLowerCase())
        ))
      : db.select().from(schema.exercises);
    fetch
      .then((results) => {
        if (isActive) {
          // Apply muscle group filter
          let filtered = results;
          if (selectedMuscleGroup !== 'All') {
            filtered = filtered.filter(ex => 
              ex.muscle_group?.toLowerCase().includes(selectedMuscleGroup.toLowerCase())
            );
          }
          
          // Apply equipment filter
          if (selectedEquipment !== 'All') {
            filtered = filtered.filter(ex => 
              ex.category?.toLowerCase().includes(selectedEquipment.toLowerCase())
            );
          }
          
          // Apply sorting
          filtered.sort((a, b) => {
            switch (sortBy) {
              case 'A-Z':
                return a.name.localeCompare(b.name);
              case 'Z-A':
                return b.name.localeCompare(a.name);
              default:
                return a.name.localeCompare(b.name);
            }
          });
          
          setPickerExercises(filtered);
          console.log('[DB] Picker exercises loaded:', filtered);
        }
      })
      .catch((err) => {
        console.error('[DB] Error loading exercises:', err);
        if (isActive) setPickerExercises([]);
      })
      .finally(() => {
        if (isActive) setPickerLoading(false);
      });
    return () => { isActive = false; };
  }, [search, modalVisible, selectedMuscleGroup, selectedEquipment, sortBy]);

  // Add exercise from picker
  const handleAddExerciseFromPicker = (ex: any) => {
    setPickerLoading(true);
    try {
      if (!sessionExercises.some(e => e.id === ex.id)) {
        setCurrentExercises([
          ...sessionExercises,
          { ...ex, sets: [{ reps: '', weight: '', completed: false, restDuration: 120 }] }
        ]);
      }
      setModalVisible(false);
      // Start workout timer when first exercise is added
      if (!isWorkoutActive) {
        startWorkout();
      }
    } catch (err) {
      console.error('Error adding exercise:', err);
    } finally {
      setPickerLoading(false);
    }
  };

  // Remove exercise from session
  const handleRemoveExercise = (exerciseId: number) => {
    setCurrentExercises(sessionExercises.filter((ex) => ex.id !== exerciseId));
  };

  // Add helper to format seconds as mm:ss
  function formatRest(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // Add set to an exercise
  const handleAddSet = (exerciseId: number) => {
    setCurrentExercises(sessionExercises.map((ex) => {
      if (ex.id === exerciseId) {
        const lastRest = ex.sets && ex.sets.length > 0 ? ex.sets[ex.sets.length - 1].restDuration ?? 120 : 120;
        const newSet = { reps: '', weight: '', completed: false, restDuration: lastRest };
        return { ...ex, sets: ex.sets ? [...ex.sets, newSet] : [newSet] };
      }
      return ex;
    }));
  };

  // Toggle set completion
  const handleToggleSetComplete = (exerciseId: number, setIdx: number) => {
    setCurrentExercises(sessionExercises.map((ex) => {
      if (ex.id === exerciseId) {
        const updatedSets = (ex.sets || []).map((set: any, idx: number) =>
          idx === setIdx ? { ...set, completed: !set.completed } : set
        );
        return { ...ex, sets: updatedSets };
      }
      return ex;
    }));
  };

  // Update handleSetFieldChange to support 'notes' field
  const handleSetFieldChange = (exerciseId: number, setIdx: number, field: 'weight' | 'reps' | 'notes', value: string) => {
    setCurrentExercises(sessionExercises.map((ex) => {
      if (ex.id === exerciseId) {
        const updatedSets = (ex.sets || []).map((set: any, idx: number) =>
          idx === setIdx ? { ...set, [field]: field === 'notes' ? value : value.replace(/[^0-9]/g, '') } : set
        );
        return { ...ex, sets: updatedSets };
      }
      return ex;
    }));
  };

  // Add handler to update rest
  const handleSetRestChange = (exerciseId: number, setIdx: number, delta: number) => {
    setCurrentExercises(sessionExercises.map((ex) => {
      if (ex.id === exerciseId) {
        const updatedSets = (ex.sets || []).map((set: any, idx: number) =>
          idx === setIdx ? { ...set, restDuration: Math.max(0, (set.restDuration ?? 120) + delta) } : set
        );
        return { ...ex, sets: updatedSets };
      }
      return ex;
    }));
  };

  // Add handler to remove a set from an exercise
  const handleRemoveSet = (exerciseId: number, setIdx: number) => {
    setCurrentExercises(sessionExercises.map((ex) => {
      if (ex.id === exerciseId) {
        const updatedSets = (ex.sets || []).filter((_, idx) => idx !== setIdx);
        return { ...ex, sets: updatedSets };
      }
      return ex;
    }));
  };

  // Start timer and set date when first exercise is added
  useEffect(() => {
    if (sessionExercises.length > 0 && !isWorkoutActive) {
      startWorkout();
      setElapsed(0);
      // Set the workout date to today
      const now = new Date();
      const formatted = `${now.getFullYear()}.${(now.getMonth()+1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')}`;
      setWorkoutDate(formatted);

    }
    // Reset timer and date if all exercises are removed
    if (sessionExercises.length === 0 && isWorkoutActive) {
      endWorkout();
      setElapsed(0);
      setWorkoutDate("");
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [sessionExercises.length, isWorkoutActive]);

  // In the timer effect, ensure timer only runs when not paused
  useEffect(() => {
    if (!sessionStartTime || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [sessionStartTime, isPaused]);

  // Format timer mm:ss
  function formatElapsed(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // When modal closes, always clear loading
  useEffect(() => {
    if (!modalVisible) {
      setPickerLoading(false);
    }
  }, [modalVisible]);



  // Load template if templateId is provided
  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  // Load template into session
  const loadTemplate = async () => {
    if (!templateId) return;
    
    try {
      setTemplateLoading(true);
      const templateData = await loadTemplateIntoSession(parseInt(templateId));
      
      // Convert template data to session format
      const templateExercises = templateData.exercises.map(exercise => ({
        id: exercise.id,
        name: exercise.name,
        category: exercise.category,
        muscle_group: exercise.muscle_group,
        distance: exercise.distance,
        sets: exercise.sets.map(set => ({
          weight: Number(set.weight) || 0,
          reps: Number(set.reps) || 0,
          rest: Number(set.rest) || 120,
          notes: set.notes || '',
          completed: false,
        }))
      }));

      // Set exercises in session
      setCurrentExercises(templateExercises);
      
      Alert.alert('Template Loaded', 'Workout template has been loaded successfully!');
    } catch (error) {
      console.error('Error loading template:', error);
      Alert.alert('Error', 'Failed to load template. Please try again.');
    } finally {
      setTemplateLoading(false);
    }
  };

  // Handle cancel workout
  const handleCancelWorkout = () => {
    Alert.alert(
      'Cancel Workout',
      'Are you sure you want to cancel this workout? All progress will be lost.',
      [
        {
          text: 'Keep Working Out',
          style: 'cancel'
        },
        {
          text: 'Cancel Workout',
          style: 'destructive',
          onPress: () => {
            resetSession();
            router.push('/');
          }
        }
      ]
    );
  };

  // Handle finish workout
  const handleFinishWorkout = async () => {
    // Validate workout name
    if (!workoutName || workoutName.trim().length === 0) {
      Alert.alert('Invalid Workout Name', 'Please enter a workout name before finishing.');
      return;
    }

    if (workoutName.length > 100) {
      Alert.alert('Workout Name Too Long', 'Workout name must be 100 characters or less.');
      return;
    }

    // Validate exercises
    if (sessionExercises.length === 0) {
      Alert.alert('No Exercises', 'Cannot finish workout with no exercises.');
      return;
    }

    // Validate that all exercises have at least one set
    const exercisesWithoutSets = sessionExercises.filter(exercise => 
      !exercise.sets || exercise.sets.length === 0
    );

    if (exercisesWithoutSets.length > 0) {
      Alert.alert(
        'Incomplete Exercises', 
        'All exercises must have at least one set. Please add sets to all exercises.'
      );
      return;
    }

    // Validate sets have valid data
    const invalidSets = sessionExercises.flatMap(exercise => 
      exercise.sets.filter(set => {
        const weight = Number(set.weight);
        const reps = Number(set.reps);
        return isNaN(weight) || weight < 0 || isNaN(reps) || reps <= 0;
      })
    );

    if (invalidSets.length > 0) {
      Alert.alert(
        'Invalid Set Data', 
        'All sets must have valid weight (≥ 0) and reps (> 0) values.'
      );
      return;
    }

    try {
      setIsSaving(true);
      endWorkout(); // End the workout session
      const workoutId = await saveWorkout(); // Save to database
      
      if (workoutId) {
        Alert.alert(
          'Workout Saved!', 
          `Workout "${workoutName.trim()}" has been saved successfully.`,
          [
            {
              text: 'View History',
              onPress: () => router.push('/history')
            },
            {
              text: 'New Workout',
              onPress: () => {
                resetSession();
                router.push('/new');
              }
            }
          ]
        );
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Handle specific error cases
      if (errorMessage.includes('Workout name cannot be empty')) {
        Alert.alert('Invalid Workout Name', 'Please enter a workout name.');
      } else if (errorMessage.includes('too long')) {
        Alert.alert('Input Too Long', 'Please shorten your workout name or notes.');
      } else if (errorMessage.includes('negative') || errorMessage.includes('greater than 0')) {
        Alert.alert('Invalid Values', 'Please check your weight and reps values.');
      } else if (errorMessage.includes('Database is busy')) {
        Alert.alert('Database Busy', 'Please try again in a moment.');
      } else if (errorMessage.includes('Database schema is missing')) {
        Alert.alert('Database Error', 'Please restart the app and try again.');
      } else {
        Alert.alert('Save Failed', `Failed to save workout: ${errorMessage}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: 0, paddingTop: 0 }}>
      {/* Top status and protocol */}
      {/* Header row: BACK (top left), DATE (below), TIMER (right) */}
      {sessionExercises.length > 0 && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginHorizontal: 16, marginBottom: 8, marginTop: 40 }}>
          <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <Text 
              style={{ 
                color: theme.colors.neon, 
                fontFamily: theme.fonts.code, 
                fontSize: 14, 
                marginBottom: 2, 
                borderWidth: 1, 
                borderColor: theme.colors.neon, 
                borderRadius: 6, 
                paddingVertical: 4, 
                paddingHorizontal: 12, 
                overflow: 'hidden',
                backgroundColor: 'transparent',
              }} 
              onPress={() => router.back()}>{'← BACK'}</Text>
            {workoutDate && (
              <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 14 }}>{workoutDate}</Text>
            )}
          </View>
          {sessionStartTime && (
            <Text 
              style={{ 
                color: isPaused ? '#FFA500' : theme.colors.neon, // orange if paused
                fontFamily: theme.fonts.code, 
                fontSize: 18, 
                fontWeight: 'bold', 
                letterSpacing: 2, 
                borderWidth: 1, 
                borderColor: isPaused ? '#FFA500' : theme.colors.neon, 
                borderRadius: 6, 
                paddingVertical: 4, 
                paddingHorizontal: 16, 
                overflow: 'hidden',
                backgroundColor: 'transparent',
              }}
            >
              {isPaused ? 'TIMER PAUSED' : 'TIMER'}: {formatElapsed(elapsed)}
            </Text>
          )}
        </View>
      )}
      {/* Main content (workout box, input, END WORKOUT) */}
      {sessionExercises.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: -120 }}>
          {/* Only show input and END WORKOUT button when no exercises */}
          <View style={{ width: '100%', maxWidth: 400, borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 8, padding: 24, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ alignItems: 'center', marginBottom: 18 }}>
              <TextInput
                style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontWeight: 'bold', fontSize: 22, letterSpacing: 1.5, textAlign: 'center', backgroundColor: 'transparent', borderWidth: 0 }}
                value={workoutName}
                onChangeText={(text) => {
                  // Limit workout name to 100 characters
                  if (text.length <= 100) {
                    setWorkoutName(text);
                  }
                }}
                placeholder="ENTER WORKOUT"
                placeholderTextColor={theme.colors.neon}
                maxLength={100}
              />
              {['MORNING WORKOUT', 'AFTERNOON WORKOUT', 'NIGHT WORKOUT', 'LATE NIGHT WORKOUT'].includes(workoutName) && (
                null
              )}
            </View>
            <View style={{ flexDirection: 'row', width: '100%', marginBottom: 18 }}>
              <TextInput
                style={{ flex: 1, borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 4, color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'transparent', marginRight: 8 }}
                placeholder="ADD EXERCISE"
                placeholderTextColor={theme.colors.neon}
                value={search}
                onChangeText={setSearch}
                onFocus={() => setModalVisible(true)}
              />
              <TouchableOpacity style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 4, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }} onPress={() => setModalVisible(true)}>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 28, fontWeight: 'bold', marginTop: -2 }}>+</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', width: '100%', gap: 12 }}>
              <TouchableOpacity 
                style={{ 
                  flex: 1,
                  backgroundColor: '#333', 
                  borderRadius: 4, 
                  paddingVertical: 18, 
                  alignItems: 'center', 
                  borderWidth: 2, 
                  borderColor: theme.colors.neon, 
                  marginBottom: 0 
                }}
                onPress={handleCancelWorkout}
              >
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16, fontWeight: 'bold', letterSpacing: 1.2 }}>
                  CANCEL
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <>
          {/* Show workout name above exercises */}
          <View style={{ alignItems: 'center', marginBottom: 18 }}>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontWeight: 'bold', fontSize: 22, letterSpacing: 1.5, textAlign: 'center', backgroundColor: 'transparent', borderWidth: 0 }}>
              {workoutName}
            </Text>
            {['MORNING WORKOUT', 'AFTERNOON WORKOUT', 'NIGHT WORKOUT', 'LATE NIGHT WORKOUT'].includes(workoutName) && (
              null
            )}
          </View>
          <ScrollView style={{ flex: 1, marginBottom: 12 }}>
            {sessionExercises.map((ex, idx) => (
              <View key={ex.id} style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 8, marginBottom: 18, padding: 12, backgroundColor: 'transparent' }}>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontWeight: 'bold', fontSize: 18, textTransform: 'uppercase', marginBottom: 8 }}>{ex.name.toUpperCase()}</Text>
                {/* Sets List */}
                {(ex.sets || []).map((set: any, setIdx: number) => (
                  <SetRow
                    key={setIdx}
                    set={set}
                    setIdx={setIdx}
                    exerciseId={ex.id}
                    handleSetFieldChange={handleSetFieldChange}
                    handleToggleSetComplete={handleToggleSetComplete}
                    handleRemoveSet={handleRemoveSet}
                    theme={theme}
                  />
                ))}
                <TouchableOpacity style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 4, paddingVertical: 10, alignItems: 'center', marginTop: 4, backgroundColor: 'transparent' }} onPress={() => handleAddSet(ex.id)}>
                  <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16, fontWeight: 'bold', letterSpacing: 1 }}>ADD SET</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          <SafeAreaView style={{ width: '100%', paddingHorizontal: 0, paddingBottom: 8, backgroundColor: 'transparent' }}>
            <View style={{ width: '100%', paddingHorizontal: 0, marginTop: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 16, paddingHorizontal: 8 }}>
            <TextInput
                  style={{ flex: 1, borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 4, color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16, paddingVertical: 12, paddingHorizontal: 12, backgroundColor: 'transparent', marginRight: 8 }}
                  placeholder="ADD EXERCISE"
              placeholderTextColor={theme.colors.neon}
              value={search}
              onChangeText={setSearch}
              onFocus={() => setModalVisible(true)}
            />
                <TouchableOpacity style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 4, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }} onPress={() => setModalVisible(true)}>
                  <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 32, fontWeight: 'bold', marginTop: -2 }}>+</Text>
            </TouchableOpacity>
          </View>
              <View style={{ flexDirection: 'row', width: '100%', gap: 12 }}>
                <TouchableOpacity 
                  style={{ 
                    flex: 1,
                    backgroundColor: isPaused ? '#666' : '#333', 
                    borderRadius: 4, 
                    paddingVertical: 20, 
                    alignItems: 'center', 
                    borderWidth: 2, 
                    borderColor: theme.colors.neon, 
                    marginBottom: 0, 
                    marginTop: 0 
                  }}
                  onPress={() => setIsPaused((prev) => !prev)}
                >
                  <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 18, fontWeight: 'bold', letterSpacing: 1.2 }}>
                    {isPaused ? 'UNPAUSE' : 'PAUSE'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ 
                    flex: 1,
                    backgroundColor: isSaving ? '#666' : '#CC0000', 
                    borderRadius: 4, 
                    paddingVertical: 20, 
                    alignItems: 'center', 
                    borderWidth: 2, 
                    borderColor: theme.colors.neon, 
                    marginBottom: 0, 
                    marginTop: 0 
                  }}
                  onPress={handleFinishWorkout}
                  disabled={isSaving}
                >
                  <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 18, fontWeight: 'bold', letterSpacing: 1.2 }}>
                    {isSaving ? 'SAVING...' : 'FINISH'}
                  </Text>
          </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </>
      )}
      {/* Exercise Picker Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.neon }}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 24 }}>←</Text>
            </TouchableOpacity>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 20, fontWeight: 'bold' }}>EXERCISES</Text>
            <TouchableOpacity>
              <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 20 }}>⋮</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 8, backgroundColor: 'transparent', paddingHorizontal: 12 }}>
          <TextInput
                style={{ flex: 1, color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16, paddingVertical: 12 }}
                placeholder="SEARCH"
                placeholderTextColor={theme.colors.neon}
            value={search}
            onChangeText={setSearch}
          />
            </View>
          </View>

          {/* Filter and Sort Row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 }}>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 12 }}>FILTER</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 12 }}>{sortBy}</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 12 }}>{pickerExercises.length} found</Text>
          </View>

          {/* Muscle Groups Filter */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>MUSCLE GROUPS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row' }}>
                {['All', 'Chest', 'Arms', 'Legs', 'Back', 'Core', 'Shoulders'].map((group) => (
                  <TouchableOpacity
                    key={group}
                    style={{
                      borderWidth: 1,
                      borderColor: theme.colors.neon,
                      borderRadius: 16,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      marginRight: 8,
                      backgroundColor: selectedMuscleGroup === group ? theme.colors.neon : 'transparent'
                    }}
                    onPress={() => setSelectedMuscleGroup(group)}
                  >
                    <Text style={{ 
                      color: selectedMuscleGroup === group ? 'black' : theme.colors.neon, 
                      fontFamily: theme.fonts.code, 
                      fontSize: 12 
                    }}>{group}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Equipment Filter */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row' }}>
                {['All', 'Bodyweight', 'Dumbbell', 'Barbell', 'Machine', 'Cable'].map((equipment) => (
                  <TouchableOpacity
                    key={equipment}
                    style={{
                      borderWidth: 1,
                      borderColor: theme.colors.neon,
                      borderRadius: 16,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      marginRight: 8,
                      backgroundColor: selectedEquipment === equipment ? theme.colors.neon : 'transparent'
                    }}
                    onPress={() => setSelectedEquipment(equipment)}
                  >
                    <Text style={{ 
                      color: selectedEquipment === equipment ? 'black' : theme.colors.neon, 
                      fontFamily: theme.fonts.code, 
                      fontSize: 12 
                    }}>{equipment}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Clear Filters */}
          {(selectedMuscleGroup !== 'All' || selectedEquipment !== 'All') && (
            <TouchableOpacity 
              style={{ paddingHorizontal: 16, paddingBottom: 12 }}
              onPress={() => {
                setSelectedMuscleGroup('All');
                setSelectedEquipment('All');
              }}
            >
              <Text style={{ color: '#FF0000', fontFamily: theme.fonts.code, fontSize: 12 }}>CLEAR ALL FILTERS</Text>
            </TouchableOpacity>
          )}

          {/* Exercise List */}
          {pickerLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator color={theme.colors.neon} size="large" />
            </View>
          ) : (
            <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
              {pickerExercises.map((ex) => {
                const alreadyAdded = sessionExercises.some(e => e.id === ex.id);
                return (
                  <TouchableOpacity 
                    key={ex.id} 
                    style={{ 
                      borderWidth: 1, 
                      borderColor: theme.colors.neon, 
                      borderRadius: 8, 
                      marginBottom: 12, 
                      padding: 16, 
                      backgroundColor: 'transparent',
                      flexDirection: 'row',
                      alignItems: 'center'
                    }} 
                    onPress={() => !alreadyAdded && handleAddExerciseFromPicker(ex)}
                    disabled={alreadyAdded}
                  >
                    {/* Exercise Icon */}
                    <View style={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: 20, 
                      backgroundColor: theme.colors.neon, 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      marginRight: 12
                    }}>
                      <Text style={{ color: 'black', fontFamily: theme.fonts.code, fontSize: 16, fontWeight: 'bold' }}>
                        {ex.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    {/* Exercise Details */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>
                        {ex.name}
                      </Text>
                      <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                        {ex.muscle_group} • {ex.category}
                      </Text>
                    </View>

                    {/* Action Icons */}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <TouchableOpacity style={{ marginRight: 12 }} disabled>
                        <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16 }}>☆</Text>
                      </TouchableOpacity>
                      {alreadyAdded ? (
                        <Text style={{ color: theme.colors.success, fontFamily: theme.fonts.code, fontSize: 20, fontWeight: 'bold' }}>✔</Text>
                      ) : (
                        <TouchableOpacity onPress={() => handleAddExerciseFromPicker(ex)}>
                          <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 20, fontWeight: 'bold' }}>+</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                </TouchableOpacity>
                );
              })}
              {pickerExercises.length === 0 && (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
                  <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16, textAlign: 'center' }}>
                    No exercises found.
                  </Text>
                  <TouchableOpacity
                    style={{ marginTop: 16, backgroundColor: theme.colors.neon, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24 }}
                    onPress={() => {
                      setNewExerciseName(search);
                      setShowAddModal(true);
                    }}
                  >
                    <Text style={{ color: theme.colors.background, fontFamily: theme.fonts.heading, fontWeight: 'bold', fontSize: 16 }}>+ Add "{search.trim()}" as new exercise</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
      {/* Add Exercise Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent={true} onRequestClose={() => setShowAddModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: theme.colors.background, borderRadius: 16, padding: 24, width: '90%', maxWidth: 400 }}>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.heading, fontWeight: 'bold', fontSize: 20, marginBottom: 16, textAlign: 'center' }}>Add New Exercise</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 8, color: theme.colors.neon, fontFamily: theme.fonts.body, fontSize: 16, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: 'transparent', marginBottom: 16 }}
              placeholder="Exercise Name"
              placeholderTextColor={theme.colors.neon}
              value={newExerciseName}
              onChangeText={setNewExerciseName}
            />
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.body, fontSize: 14, marginBottom: 8 }}>Muscle Groups</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
              {MUSCLE_GROUP_OPTIONS.map((group) => (
                <TouchableOpacity
                  key={group}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.neon,
                    borderRadius: 16,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    marginRight: 8,
                    marginBottom: 8,
                    backgroundColor: newMuscleGroups.includes(group) ? theme.colors.neon : 'transparent',
                  }}
                  onPress={() => {
                    setNewMuscleGroups((prev) => prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]);
                  }}
                >
                  <Text style={{ color: newMuscleGroups.includes(group) ? 'black' : theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 13 }}>{group}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.body, fontSize: 14, marginBottom: 8 }}>Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
              {CATEGORY_OPTIONS.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.neon,
                    borderRadius: 16,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    marginRight: 8,
                    marginBottom: 8,
                    backgroundColor: newCategory === cat ? theme.colors.neon : 'transparent',
                  }}
                  onPress={() => setNewCategory(cat)}
                >
                  <Text style={{ color: newCategory === cat ? 'black' : theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 13 }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <TouchableOpacity onPress={() => setShowAddModal(false)} style={{ paddingVertical: 10, paddingHorizontal: 18 }}>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.body, fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: theme.colors.neon, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18 }}
                disabled={adding || !newExerciseName.trim() || newMuscleGroups.length === 0 || !newCategory}
                onPress={async () => {
                  setAdding(true);
                  try {
                    await db.insert(schema.exercises).values({
                      name: newExerciseName.trim(),
                      muscle_group: newMuscleGroups.join(', '),
                      category: newCategory,
                      is_custom: 1,
                    });
                    // Refresh pickerExercises after adding
                    const results = await db.select().from(schema.exercises);
                    setPickerExercises(results.filter(ex =>
                      ex.name.toLowerCase().includes(search.trim().toLowerCase()) ||
                      ex.muscle_group?.toLowerCase().includes(search.trim().toLowerCase()) ||
                      ex.category?.toLowerCase().includes(search.trim().toLowerCase())
                    ));
                    setShowAddModal(false);
                    // Do NOT close the main picker modal here
                    // setModalVisible(false); <-- do not call this
                    // setSearch(''); <-- do not clear search, keep the new exercise visible
                  } catch (err) {
                    // Optionally show error
                  } finally {
                    setAdding(false);
                  }
                }}
              >
                <Text style={{ color: theme.colors.background, fontFamily: theme.fonts.heading, fontWeight: 'bold', fontSize: 16 }}>{adding ? 'ADDING...' : 'Add Exercise'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl + 12,
  },
  statusBar: {
    color: theme.colors.text,
    fontFamily: theme.fonts.code,
    fontSize: theme.fonts.caption.fontSize,
    marginBottom: theme.spacing.xs / 2,
    lineHeight: theme.fonts.caption.lineHeight,
  },
  protocol: {
    color: theme.colors.text,
    fontFamily: theme.fonts.code,
    fontSize: theme.fonts.caption.fontSize,
    marginBottom: theme.spacing.sm,
    lineHeight: theme.fonts.caption.lineHeight,
  },
  divider: {
    borderBottomWidth: theme.borderWidth,
    borderBottomColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  back: {
    color: theme.colors.text,
    fontFamily: theme.fonts.code,
    fontSize: theme.fonts.body.fontSize,
    lineHeight: theme.fonts.body.lineHeight,
  },
  session: {
    color: theme.colors.text,
    fontFamily: theme.fonts.heading,
    fontSize: theme.fonts.body.fontSize,
    fontWeight: 'bold',
    lineHeight: theme.fonts.body.lineHeight,
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.fonts.heading,
    fontWeight: 'bold',
    fontSize: theme.fonts.h2.fontSize,
    marginBottom: theme.spacing.xs,
    letterSpacing: 1.5,
    lineHeight: theme.fonts.h2.lineHeight,
  },
  date: {
    color: theme.colors.text,
    fontFamily: theme.fonts.code,
    fontSize: theme.fonts.body.fontSize,
    marginBottom: theme.spacing.xl,
    opacity: 0.85,
    lineHeight: theme.fonts.body.lineHeight,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  input: {
    flex: 1,
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius,
    color: theme.colors.text,
    fontFamily: theme.fonts.body,
    fontSize: theme.fonts.bodyText.fontSize,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginRight: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundOverlay,
    lineHeight: theme.fonts.bodyText.lineHeight,
  },
  addBtn: {
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundOverlay,
  },
  addIcon: {
    color: theme.colors.text,
    fontFamily: theme.fonts.heading,
    fontSize: theme.fonts.h3.fontSize,
    fontWeight: 'bold',
  },
  endBtn: {
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.error,
    borderRadius: theme.borderRadius,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  endBtnText: {
    color: theme.colors.text,
    fontFamily: theme.fonts.heading,
    fontSize: theme.fonts.h3.fontSize,
    fontWeight: 'bold',
    letterSpacing: 1.2,
    lineHeight: theme.fonts.h3.lineHeight,
  },
  bigBtn: {
    width: 260,
    paddingVertical: theme.spacing.xl,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    marginBottom: 0,
  },
  bigBtnText: {
    fontFamily: theme.fonts.display,
    fontSize: theme.fonts.h2.fontSize,
    fontWeight: 'bold',
    letterSpacing: 1.2,
    lineHeight: theme.fonts.h2.lineHeight,
  },
}); 