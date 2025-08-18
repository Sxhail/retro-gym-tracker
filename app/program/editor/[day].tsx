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
  const { day } = useLocalSearchParams<{ day: string }>();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutType, setWorkoutType] = useState('');
  
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
        const existingWorkout = await db.select()
          .from(schema.temp_program_workouts)
          .where(eq(schema.temp_program_workouts.day_name, (day as string).toUpperCase()))
          .limit(1);

        if (existingWorkout.length > 0) {
          const workout = existingWorkout[0];
          setWorkoutType(workout.workout_type);
          const exercisesData = JSON.parse(workout.exercises_json);
          setExercises(exercisesData);
        }
      } catch (error) {
        console.error('Error loading workout data:', error);
      }
    };

    if (day) {
      loadWorkoutData();
    }
  }, [day]);

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
    
    if (exercises.length === 0) {
      alert('Please add at least one exercise before saving.');
      return;
    }
    
    try {
      // Save workout data to temp table
      const workoutData = {
        day_name: (day as string).toUpperCase(),
        workout_type: workoutType,
        exercises_json: JSON.stringify(exercises)
      };

      // First, delete any existing temp data for this day
      await db.delete(schema.temp_program_workouts)
        .where(eq(schema.temp_program_workouts.day_name, workoutData.day_name));

      // Insert new temp data
      await db.insert(schema.temp_program_workouts).values(workoutData);
      
      console.log('Workout saved to temp storage:', workoutData);
      router.back();
    } catch (error) {
      console.error('Error saving workout:', error);
      alert('Failed to save workout. Please try again.');
    }
  };

  // Check if save button should be enabled
  const canSave = workoutType.trim().length > 0 && exercises.length > 0;

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

      {/* Workout Type Input */}
      <View style={styles.workoutTypeSection}>
        <Text style={styles.workoutTypeLabel}>WORKOUT TYPE:</Text>
        <TextInput
          style={[
            styles.workoutTypeInput,
            !workoutType.trim() && exercises.length === 0 && styles.inputWarning
          ]}
          value={workoutType}
          onChangeText={setWorkoutType}
          placeholder="e.g., Push Day, Legs, Full Body"
          placeholderTextColor="rgba(0, 255, 0, 0.5)"
        />
      </View>

      {/* Exercise List */}
      <View style={styles.exerciseListSection}>
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
              <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 28 }}>←</Text>
            </TouchableOpacity>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 24, fontWeight: 'bold' }}>EXERCISES</Text>
            <View style={{ width: 28 }} />
          </View>

          {/* Search Bar */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 8, backgroundColor: 'transparent', paddingHorizontal: 12 }}>
              <TextInput
                style={{ flex: 1, color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 18, paddingVertical: 14 }}
                placeholder="SEARCH"
                placeholderTextColor={theme.colors.neon}
                value={search}
                onChangeText={setSearch}
              />
            </View>
          </View>

          {/* Filter Options */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
              {['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'].map((group) => (
                <TouchableOpacity
                  key={group}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    marginRight: 8,
                    backgroundColor: selectedMuscleGroup === group ? theme.colors.neon : 'transparent',
                    borderWidth: 1,
                    borderColor: theme.colors.neon,
                  }}
                  onPress={() => setSelectedMuscleGroup(group)}
                >
                  <Text style={{
                    color: selectedMuscleGroup === group ? theme.colors.background : theme.colors.neon,
                    fontFamily: theme.fonts.code,
                    fontSize: 14,
                    fontWeight: 'bold',
                  }}>
                    {group}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

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
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontWeight: 'bold', fontSize: 20, marginBottom: 16, textAlign: 'center' }}>Add New Exercise</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 8, color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: 'transparent', marginBottom: 16 }}
              placeholder="Exercise Name"
              placeholderTextColor={theme.colors.neon}
              value={newExerciseName}
              onChangeText={setNewExerciseName}
            />
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 14, marginBottom: 8 }}>Muscle Groups</Text>
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
                    if (newMuscleGroups.includes(group)) {
                      setNewMuscleGroups(newMuscleGroups.filter(g => g !== group));
                    } else {
                      setNewMuscleGroups([...newMuscleGroups, group]);
                    }
                  }}
                >
                  <Text style={{ color: newMuscleGroups.includes(group) ? theme.colors.background : theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 12 }}>{group}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 14, marginBottom: 8 }}>Category</Text>
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
                  <Text style={{ color: newCategory === cat ? theme.colors.background : theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 12 }}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <TouchableOpacity onPress={() => setShowAddModal(false)} style={{ paddingVertical: 10, paddingHorizontal: 18 }}>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16 }}>Cancel</Text>
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
