import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, Modal, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import theme from '../../../styles/theme';
import { db } from '../../../db/client';
import * as schema from '../../../db/schema';
import { like, or, asc, eq } from 'drizzle-orm';
import ExerciseCard from '../../../components/ExerciseCard';
import { getExerciseMaxWeights } from '../../../services/workoutHistory';
import { dbOperations } from '../../../services/database';

interface Exercise {
  id: number;
  name: string;
  sets: number;
  reps: string;
}

export default function WorkoutEditorScreen() {
  const router = useRouter();
  const { day, editMode, programId, dayId } = useLocalSearchParams<{ 
    day: string; 
    editMode?: string; 
    programId?: string; 
    dayId?: string; 
  }>();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutType, setWorkoutType] = useState('');
  const [workoutCategory, setWorkoutCategory] = useState<'lift' | 'cardio' | ''>('');
  const isCardioDay = workoutCategory === 'cardio';
  // Cardio params state
  const [hiitWorkSec, setHiitWorkSec] = useState(30);
  const [hiitRestSec, setHiitRestSec] = useState(30);
  const [hiitRounds, setHiitRounds] = useState(10);
  const [wrRunSec, setWrRunSec] = useState(60);
  const [wrWalkSec, setWrWalkSec] = useState(60);
  const [wrLaps, setWrLaps] = useState(10);
  const [loading, setLoading] = useState(false);
  
  // Exercise picker modal states (same as new.tsx)
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [pickerExercises, setPickerExercises] = useState<any[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('All');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('A-Z');
  const [maxWeights, setMaxWeights] = useState<Record<number, { weight: number; reps: number }>>({});

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

  // Fetch max weights for exercises (same as new.tsx)
  useEffect(() => {
    getExerciseMaxWeights().then(setMaxWeights);
  }, []);

  // Load existing workout data for this day
  useEffect(() => {
    const loadWorkoutData = async () => {
      try {
        if (editMode && dayId) {
          // Load from program_days if in edit mode
          await loadExistingDayData();
        } else {
          // Load from temp storage for new program creation
          const existingWorkout = await db.select()
            .from(schema.temp_program_workouts)
            .where(eq(schema.temp_program_workouts.day_name, (day as string).toUpperCase()))
            .limit(1);

          if (existingWorkout.length > 0) {
            const workout = existingWorkout[0];
            setWorkoutType(workout.workout_type);
            setWorkoutCategory(['quick hiit','walk-run'].includes((workout.workout_type || '').toLowerCase()) ? 'cardio' : 'lift');
            try {
              const parsed = JSON.parse(workout.exercises_json);
              if (parsed && !Array.isArray(parsed) && parsed.cardio) {
                const cardio = parsed.cardio;
                if (cardio.mode === 'hiit') {
                  setWorkoutCategory('cardio');
                  setWorkoutType('QUICK HIIT');
                  setHiitWorkSec(cardio.workSec ?? 30);
                  setHiitRestSec(cardio.restSec ?? 30);
                  setHiitRounds(cardio.rounds ?? 10);
                } else if (cardio.mode === 'walk_run') {
                  setWorkoutCategory('cardio');
                  setWorkoutType('WALK-RUN');
                  setWrRunSec(cardio.runSec ?? 60);
                  setWrWalkSec(cardio.walkSec ?? 60);
                  setWrLaps(cardio.laps ?? 10);
                }
                setExercises([]);
              } else if (Array.isArray(parsed)) {
                setExercises(parsed);
              }
            } catch {
              // fallback
              try {
                const exercisesData = JSON.parse(workout.exercises_json);
                if (Array.isArray(exercisesData)) setExercises(exercisesData);
              } catch {}
            }
          }
        }
      } catch (error) {
        console.error('Error loading workout data:', error);
      }
    };

    if (day) {
      loadWorkoutData();
    }
  }, [day, editMode, dayId]);

  const loadExistingDayData = async () => {
    try {
      setLoading(true);
      const dayIdNum = parseInt(dayId as string);
      
      // Get the program day data
      const dayData = await db.select()
        .from(schema.program_days)
        .leftJoin(schema.workout_templates, eq(schema.program_days.template_id, schema.workout_templates.id))
        .where(eq(schema.program_days.id, dayIdNum))
        .limit(1);

        if (dayData.length > 0) {
        const dayInfo = dayData[0];
        
        if (dayInfo.workout_templates) {
          setWorkoutType(dayInfo.workout_templates.name);
          setWorkoutCategory((dayInfo.workout_templates.category || '').toLowerCase() === 'cardio' ? 'cardio' : 'lift');
            // If cardio, try to load params from description JSON
            if ((dayInfo.workout_templates.category || '').toLowerCase() === 'cardio') {
              try {
                const desc = dayInfo.workout_templates.description || '';
                const parsed = JSON.parse(desc);
                if (parsed && parsed.cardio) {
                  const cardio = parsed.cardio;
                  if (cardio.mode === 'hiit') {
                    setWorkoutType('QUICK HIIT');
                    setHiitWorkSec(cardio.workSec ?? 30);
                    setHiitRestSec(cardio.restSec ?? 30);
                    setHiitRounds(cardio.rounds ?? 10);
                  } else if (cardio.mode === 'walk_run') {
                    setWorkoutType('WALK-RUN');
                    setWrRunSec(cardio.runSec ?? 60);
                    setWrWalkSec(cardio.walkSec ?? 60);
                    setWrLaps(cardio.laps ?? 10);
                  }
                }
              } catch {}
            }
          
          // Load exercises from template_exercises and template_sets
          const templateExercises = await db.select()
            .from(schema.template_exercises)
            .leftJoin(schema.exercises, eq(schema.template_exercises.exercise_id, schema.exercises.id))
            .leftJoin(schema.template_sets, eq(schema.template_exercises.id, schema.template_sets.template_exercise_id))
            .where(eq(schema.template_exercises.template_id, dayInfo.workout_templates.id))
            .orderBy(schema.template_exercises.exercise_order);

          // Group by exercises and collect sets
          const exerciseMap = new Map<number, Exercise>();
          
          templateExercises.forEach(row => {
            if (row.exercises) {
              const exerciseId = row.exercises.id;
              if (!exerciseMap.has(exerciseId)) {
                exerciseMap.set(exerciseId, {
                  id: exerciseId,
                  name: row.exercises.name,
                  sets: 0,
                  reps: '',
                });
              }
              
              if (row.template_sets) {
                const exercise = exerciseMap.get(exerciseId)!;
                exercise.sets += 1;
                if (exercise.reps) {
                  exercise.reps += `, ${row.template_sets.target_reps}`;
                } else {
                  exercise.reps = row.template_sets.target_reps.toString();
                }
              }
            }
          });

          setExercises(Array.from(exerciseMap.values()));
        }
      }
    } catch (error) {
      console.error('Error loading day data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Exercise picker logic (same as new.tsx)
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

    fetch.then(results => {
      if (isActive) {
        let filtered = results;
        if (selectedMuscleGroup !== 'All') {
          filtered = filtered.filter(ex => ex.muscle_group === selectedMuscleGroup);
        }
        if (selectedEquipment !== 'All') {
          filtered = filtered.filter(ex => ex.category === selectedEquipment);
        }
        if (sortBy === 'A-Z') {
          filtered.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortBy === 'Z-A') {
          filtered.sort((a, b) => b.name.localeCompare(a.name));
        }
        setPickerExercises(filtered);
      }
    })
    .catch(() => {
      if (isActive) setPickerExercises([]);
    })
    .finally(() => {
      if (isActive) setPickerLoading(false);
    });
    return () => { isActive = false; };
  }, [search, modalVisible, selectedMuscleGroup, selectedEquipment, sortBy]);

  const handleAddExercise = () => {
    // Open modal instead of navigating to exercises page
    setModalVisible(true);
  };

  // Add exercise from picker (same logic as new.tsx)
  const handleAddExerciseFromPicker = (ex: any) => {
    try {
      if (!exercises.some(e => e.id === ex.id)) {
        const newExercise = {
          id: ex.id,
          name: ex.name,
          sets: 3,
          reps: '8-12'
        };
        setExercises([...exercises, newExercise]);
      }
      setModalVisible(false);
    } catch (err) {
      console.error('Error adding exercise:', err);
    }
  };

  const handleRemoveExercise = (exerciseId: number) => {
    setExercises(exercises.filter(ex => ex.id !== exerciseId));
  };

  const handleSaveWorkout = async () => {
    // Validation: Check if workout type is entered and at least one exercise is added
    if (!workoutType.trim()) {
      alert('Please enter a workout type before saving.');
      return;
    }
    // For Lift: require exercises; for Cardio: allow none
    if (!isCardioDay && exercises.length === 0) {
      alert('Please add at least one exercise before saving.');
      return;
    }
    
    try {
      if (editMode && programId && dayId) {
        // Save to existing program day
        await saveToExistingProgram();
      } else {
        // Save to temp table for new program creation
        await saveToTempStorage();
      }
      
      router.back();
    } catch (error) {
      console.error('Error saving workout:', error);
      alert('Failed to save workout. Please try again.');
    }
  };

  const saveToTempStorage = async () => {
    // For cardio days, persist params in a cardio object
    let payload: any = exercises;
    if (isCardioDay) {
      const mode = (workoutType || '').toLowerCase().includes('walk') ? 'walk_run' : 'hiit';
      payload = {
        cardio: mode === 'hiit'
          ? { mode: 'hiit', workSec: hiitWorkSec, restSec: hiitRestSec, rounds: hiitRounds }
          : { mode: 'walk_run', runSec: wrRunSec, walkSec: wrWalkSec, laps: wrLaps }
      };
    }
    const workoutData = {
      day_name: (day as string).toUpperCase(),
      workout_type: workoutType,
      exercises_json: JSON.stringify(payload)
    };

    // First, delete any existing temp data for this day
    await db.delete(schema.temp_program_workouts)
      .where(eq(schema.temp_program_workouts.day_name, workoutData.day_name));

    // Insert new temp data
    await db.insert(schema.temp_program_workouts).values(workoutData);
    console.log('Workout saved to temp storage:', workoutData);
  };

  const saveToExistingProgram = async () => {
    const dayIdNum = parseInt(dayId as string);
    const programIdNum = parseInt(programId as string);

    // Get existing day data to check if it has a template
    const existingDay = await db.select()
      .from(schema.program_days)
      .where(eq(schema.program_days.id, dayIdNum))
      .limit(1);

    if (existingDay.length === 0) {
      throw new Error('Program day not found');
    }

    const currentDay = existingDay[0];
    let templateId = currentDay.template_id;

  if (templateId) {
      // Update existing template
      // Compute description: for cardio, store params JSON; else keep simple text
      let description: string | null = null;
      if (isCardioDay) {
        const mode = (workoutType || '').toLowerCase().includes('walk') ? 'walk_run' : 'hiit';
        const cardio = mode === 'hiit'
          ? { mode: 'hiit', workSec: hiitWorkSec, restSec: hiitRestSec, rounds: hiitRounds }
          : { mode: 'walk_run', runSec: wrRunSec, walkSec: wrWalkSec, laps: wrLaps };
        description = JSON.stringify({ cardio });
      } else {
        description = `Template for ${day?.toUpperCase()}`;
      }
      await db.update(schema.workout_templates)
        .set({
          name: workoutType.trim(),
          category: isCardioDay ? 'cardio' : 'strength',
          description,
        })
        .where(eq(schema.workout_templates.id, templateId));

      // Clear existing template exercises and sets
      await db.delete(schema.template_exercises)
        .where(eq(schema.template_exercises.template_id, templateId));
  } else {
      // Create new template
      let description: string | null = null;
      if (isCardioDay) {
        const mode = (workoutType || '').toLowerCase().includes('walk') ? 'walk_run' : 'hiit';
        const cardio = mode === 'hiit'
          ? { mode: 'hiit', workSec: hiitWorkSec, restSec: hiitRestSec, rounds: hiitRounds }
          : { mode: 'walk_run', runSec: wrRunSec, walkSec: wrWalkSec, laps: wrLaps };
        description = JSON.stringify({ cardio });
      } else {
        description = `Template for ${day?.toUpperCase()}`;
      }
      const newTemplate = await db.insert(schema.workout_templates)
        .values({
          name: workoutType.trim(),
          description,
          category: isCardioDay ? 'cardio' : 'strength',
          difficulty: 'intermediate',
          estimated_duration: 60,
        })
        .returning();

      templateId = newTemplate[0].id;

      // Update program_days to link to new template
      await db.update(schema.program_days)
        .set({ template_id: templateId })
        .where(eq(schema.program_days.id, dayIdNum));
    }

  // Insert exercises and sets (skip if cardio day)
  for (let i = 0; i < (isCardioDay ? 0 : exercises.length); i++) {
      const exercise = exercises[i];
      
      const newTemplateExercise = await db.insert(schema.template_exercises)
        .values({
          template_id: templateId,
          exercise_id: exercise.id,
          exercise_order: i + 1,
        })
        .returning();

      const templateExerciseId = newTemplateExercise[0].id;

      // Parse reps and create sets
      const repsArray = exercise.reps.split(',').map(r => parseInt(r.trim())).filter(r => !isNaN(r));
      
      for (let setIndex = 0; setIndex < exercise.sets; setIndex++) {
        const targetReps = repsArray[setIndex] || repsArray[0] || 10;
        
        await db.insert(schema.template_sets)
          .values({
            template_exercise_id: templateExerciseId,
            set_index: setIndex + 1,
            target_reps: targetReps,
            target_rest: 60, // Default 60 seconds rest
          });
      }
    }

    console.log('Workout saved to existing program');
  };

  // Check if save button should be enabled
  const canSave = (workoutCategory !== '') && workoutType.trim().length > 0 && (isCardioDay || exercises.length > 0);

  const handleCancel = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>WORKOUT EDITOR - {day?.toUpperCase()}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Workout Selection Flow */}
      <View style={styles.workoutTypeSection}>
        <Text style={styles.workoutTypeLabel}>WORKOUT:</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity onPress={() => { setWorkoutCategory('lift'); setWorkoutType(''); }} style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: workoutCategory === 'lift' ? 'rgba(0,255,0,0.15)' : 'transparent' }}>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.body }}>LIFT</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setWorkoutCategory('cardio'); setWorkoutType(''); setExercises([]); }} style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: workoutCategory === 'cardio' ? 'rgba(0,255,0,0.15)' : 'transparent' }}>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.body }}>CARDIO</Text>
          </TouchableOpacity>
        </View>

        {/* Lift: free text workout type */}
        {workoutCategory === 'lift' && (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.workoutTypeLabel}>WORKOUT TYPE (ENTER):</Text>
            <TextInput
              style={[
                styles.workoutTypeInput,
                !workoutType.trim() && exercises.length === 0 && styles.inputWarning
              ]}
              value={workoutType}
              onChangeText={setWorkoutType}
              placeholder="e.g. Push, Pull, Legs"
              placeholderTextColor="rgba(0, 255, 0, 0.5)"
            />
          </View>
        )}

        {/* Cardio: pick from options */}
        {workoutCategory === 'cardio' && (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.workoutTypeLabel}>WORKOUT TYPE:</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity onPress={() => setWorkoutType('QUICK HIIT')} style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: workoutType === 'QUICK HIIT' ? 'rgba(0,255,0,0.15)' : 'transparent' }}>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.body }}>QUICK HIIT</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setWorkoutType('WALK-RUN')} style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: workoutType === 'WALK-RUN' ? 'rgba(0,255,0,0.15)' : 'transparent' }}>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.body }}>WALK-RUN</Text>
              </TouchableOpacity>
            </View>
            {/* Cardio Params */}
            {workoutType === 'QUICK HIIT' && (
              <View style={{ marginTop: 12, flexDirection: 'row', gap: 12 }}>
                <ParamBox label="WORK" value={`${hiitWorkSec}s`} onDec={() => setHiitWorkSec(Math.max(5, hiitWorkSec - 5))} onInc={() => setHiitWorkSec(hiitWorkSec + 5)} />
                <ParamBox label="REST" value={`${hiitRestSec}s`} onDec={() => setHiitRestSec(Math.max(5, hiitRestSec - 5))} onInc={() => setHiitRestSec(hiitRestSec + 5)} />
                <ParamBox label="ROUNDS" value={`${hiitRounds}`} onDec={() => setHiitRounds(Math.max(1, hiitRounds - 1))} onInc={() => setHiitRounds(hiitRounds + 1)} />
              </View>
            )}
            {workoutType === 'WALK-RUN' && (
              <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                <ParamBox label="RUN" value={`${wrRunSec}s`} onDec={() => setWrRunSec(Math.max(10, wrRunSec - 10))} onInc={() => setWrRunSec(wrRunSec + 10)} />
                <ParamBox label="WALK" value={`${wrWalkSec}s`} onDec={() => setWrWalkSec(Math.max(10, wrWalkSec - 10))} onInc={() => setWrWalkSec(wrWalkSec + 10)} />
                <ParamBox label="LAPS" value={`${wrLaps}`} onDec={() => setWrLaps(Math.max(1, wrLaps - 1))} onInc={() => setWrLaps(wrLaps + 1)} />
              </View>
            )}
          </View>
        )}
      </View>

      {/* Exercise List */}
      <View style={styles.exerciseListSection}>
  {isCardioDay ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>CARDIO DAY - NO EXERCISES REQUIRED</Text>
          </View>
        ) : (
          <>
            <Text style={styles.exerciseListTitle}>
              EXERCISE LIST:
              {exercises.length > 0 && <Text style={styles.countIndicator}>({exercises.length})</Text>}
            </Text>
            {exercises.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>NO EXERCISES YET</Text>
              </View>
            ) : (
              <ScrollView style={styles.exerciseList} showsVerticalScrollIndicator={false}>
                {exercises.map((exercise) => (
                  <View key={exercise.id} style={styles.exerciseItem}>
                    <View style={styles.exerciseContent}>
                      <View style={styles.exerciseHeader}>
                        <Text style={styles.exerciseNameDisplay}>{exercise.name.toUpperCase()}</Text>
                      </View>
                      <View style={styles.exerciseInputs}>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>SETS:</Text>
                          <TextInput
                            style={styles.inputBox}
                            value={exercise.sets.toString()}
                            onChangeText={(text) => {
                              const numericText = text.replace(/[^0-9]/g, '');
                              const updatedExercises = exercises.map(ex => 
                                ex.id === exercise.id ? { ...ex, sets: parseInt(numericText) || 0 } : ex
                              );
                              setExercises(updatedExercises);
                            }}
                            keyboardType="numeric"
                            placeholder="3"
                            placeholderTextColor="rgba(0, 255, 0, 0.5)"
                          />
                        </View>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>REPS:</Text>
                          <TextInput
                            style={styles.inputBox}
                            value={exercise.reps}
                            onChangeText={(text) => {
                              const updatedExercises = exercises.map(ex => 
                                ex.id === exercise.id ? { ...ex, reps: text } : ex
                              );
                              setExercises(updatedExercises);
                            }}
                            placeholder="8-12"
                            placeholderTextColor="rgba(0, 255, 0, 0.5)"
                          />
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleRemoveExercise(exercise.id)}
                    >
                      <Text style={styles.deleteButtonText}>−</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
            {/* Add Exercise Button */}
            <TouchableOpacity style={styles.addExerciseButton} onPress={() => setModalVisible(true)}>
              <Text style={styles.addExerciseText}>+ ADD EXERCISE</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]} 
          onPress={handleSaveWorkout}
          disabled={!canSave}
        >
          <Text style={[styles.saveButtonText, !canSave && styles.saveButtonTextDisabled]}>
            {canSave ? 'SAVE WORKOUT' : 'COMPLETE FORM TO SAVE'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>CANCEL</Text>
        </TouchableOpacity>
      </View>

      {/* Exercise Picker Modal (same as new.tsx) */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 16 }}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 24 }}>←</Text>
            </TouchableOpacity>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 20, fontWeight: 'bold' }}>EXERCISES</Text>
            <View style={{ width: 24 }} />
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
                const alreadyAdded = exercises.some(e => e.id === ex.id);
                return (
                  <ExerciseCard
                    key={ex.id}
                    exercise={ex}
                    maxWeight={maxWeights[ex.id]}
                    onPress={() => !alreadyAdded && handleAddExerciseFromPicker(ex)}
                    isAlreadyAdded={alreadyAdded}
                  />
                );
              })}
              {pickerExercises.length === 0 && search.trim() && (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
                  <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16, textAlign: 'center' }}>
                    No exercises found.
                  </Text>
                  <TouchableOpacity
                    style={{ marginTop: 16, backgroundColor: theme.colors.neon, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24 }}
                    onPress={() => {
                      setNewExerciseName(search);
                      setNewMuscleGroups([]);
                      setNewCategory('');
                      // Close the main modal first to avoid conflicts
                      setModalVisible(false);
                      // Small delay to ensure modal closes, then show add modal
                      setTimeout(() => {
                        setShowAddModal(true);
                      }, 100);
                    }}
                  >
                    <Text style={{ color: theme.colors.background, fontFamily: theme.fonts.code, fontWeight: 'bold', fontSize: 16 }}>+ Add "{search.trim()}" as new exercise</Text>
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
                  <Text style={{ color: newMuscleGroups.includes(group) ? theme.colors.background : theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 13 }}>{group}</Text>
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
                  <Text style={{ color: newCategory === cat ? theme.colors.background : theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 13 }}>{cat}</Text>
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
                    await dbOperations.addExercise({
                      name: newExerciseName.trim(),
                      muscle_group: newMuscleGroups.join(', '),
                      category: newCategory,
                      is_custom: 1,
                    });
                    
                    setShowAddModal(false);
                    // Reset add exercise form
                    setNewExerciseName('');
                    setNewMuscleGroups([]);
                    setNewCategory('');
                    
                    // Reopen the main modal and refresh the exercise list
                    setTimeout(() => {
                      setModalVisible(true);
                      // Refresh the exercise list to include the newly added exercise
                      dbOperations.getExercises().then(refreshedExercises => {
                        setPickerExercises(refreshedExercises.filter(ex =>
                          ex.name.toLowerCase().includes(search.trim().toLowerCase()) ||
                          ex.muscle_group?.toLowerCase().includes(search.trim().toLowerCase()) ||
                          ex.category?.toLowerCase().includes(search.trim().toLowerCase())
                        ));
                      });
                    }, 100);
                  } catch (err) {
                    console.error('Error adding exercise:', err);
                  } finally {
                    setAdding(false);
                  }
                }}
              >
                <Text style={{ color: theme.colors.background, fontFamily: theme.fonts.code, fontWeight: 'bold', fontSize: 16 }}>{adding ? 'ADDING...' : 'Add Exercise'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ParamBox({ label, value, onDec, onInc }: { label: string; value: string; onDec: () => void; onInc: () => void }) {
  return (
    <View style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 8, padding: 10, alignItems: 'center', minWidth: 90 }}>
      <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 12, fontWeight: 'bold' }}>{label}</Text>
      <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 18, marginVertical: 4 }}>{value}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity onPress={onDec} style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code }}>-</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onInc} style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code }}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neon,
    marginBottom: 20,
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
  workoutTypeSection: {
    marginBottom: 20,
  },
  workoutTypeLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  workoutTypeInput: {
    borderRadius: 8,
    padding: 16,
    backgroundColor: 'rgba(0, 255, 0, 0.08)',
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 18,
    borderWidth: 1,
    borderColor: theme.colors.neon,
  },
  inputWarning: {
    borderColor: theme.colors.neon,
    borderWidth: 2,
  },
  exerciseListSection: {
    flex: 1,
  },
  exerciseListTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  countIndicator: {
    color: 'rgba(0, 255, 0, 0.7)',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  emptyStateSubtext: {
    color: 'rgba(0, 255, 0, 0.6)',
    fontFamily: theme.fonts.code,
    fontSize: 14,
    textAlign: 'center',
  },
  exerciseList: {
    flex: 1,
    marginBottom: 16,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(0, 255, 0, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 0, 0.2)',
    position: 'relative',
  },
  exerciseContent: {
    flex: 1,
    paddingRight: 8,
  },
  exerciseHeader: {
    marginBottom: 12,
  },
  exerciseNameDisplay: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  exerciseDetails: {
    flex: 1,
  },
  exerciseName: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  exerciseNameInput: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 255, 0, 0.3)',
    paddingBottom: 8,
    paddingHorizontal: 0,
  },
  exerciseInputs: {
    flexDirection: 'row',
    gap: 20,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    marginRight: 8,
    fontWeight: 'bold',
  },
  inputBox: {
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 60,
    backgroundColor: 'rgba(0, 255, 0, 0.12)',
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 0, 0.3)',
  },
  inputValue: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    textAlign: 'center',
  },
  addExerciseButton: {
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 0, 0.08)',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: theme.colors.neon,
    borderStyle: 'solid',
  },
  addExerciseText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 20,
  },
  saveButton: {
    flex: 1,
    backgroundColor: theme.colors.neon,
    borderRadius: 8,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.neon,
  },
  saveButtonText: {
    color: theme.colors.background,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(0, 255, 0, 0.3)',
    borderColor: 'rgba(0, 255, 0, 0.3)',
  },
  saveButtonTextDisabled: {
    color: 'rgba(0, 0, 0, 0.5)',
  },
  cancelButton: {
    flex: 1,
    borderRadius: 8,
    padding: 18,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 0, 0.08)',
    borderWidth: 2,
    borderColor: theme.colors.neon,
  },
  cancelButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    backgroundColor: 'rgba(0, 255, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 16,
  },
});
