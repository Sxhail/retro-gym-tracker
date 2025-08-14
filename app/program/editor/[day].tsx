import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, TextInput, Modal, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import theme from '../../../styles/theme';
import { db } from '../../../db/client';
import * as schema from '../../../db/schema';
import { like, or, asc } from 'drizzle-orm';
import ExerciseCard from '../../../components/ExerciseCard';
import { getExerciseMaxWeights } from '../../../services/workoutHistory';

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

  // Fetch max weights for exercises (same as new.tsx)
  useEffect(() => {
    getExerciseMaxWeights().then(setMaxWeights);
  }, []);

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

  const handleSaveWorkout = () => {
    // Validation: Check if workout type is entered and at least one exercise is added
    if (!workoutType.trim()) {
      alert('Please enter a workout type before saving.');
      return;
    }
    
    if (exercises.length === 0) {
      alert('Please add at least one exercise before saving.');
      return;
    }
    
    // Create workout data
    const workoutData = {
      day: day as string,
      workoutType,
      exercises
    };
    
    // In a real app, you would save this to a global state or database
    // For now, we'll just go back
    console.log('Saving workout:', workoutData);
    router.back();
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
          style={styles.workoutTypeInput}
          value={workoutType}
          onChangeText={setWorkoutType}
          placeholder="Enter"
          placeholderTextColor={theme.colors.neon}
        />
      </View>

      {/* Exercise List */}
      <View style={styles.exerciseListSection}>
        <Text style={styles.exerciseListTitle}>EXERCISE LIST:</Text>
        
        {exercises.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>NO EXERCISES YET</Text>
            <Text style={styles.emptyStateSubtext}>Tap "ADD EXERCISE" below to get started</Text>
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
          <Text style={[styles.saveButtonText, !canSave && styles.saveButtonTextDisabled]}>SAVE WORKOUT</Text>
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
                    fontSize: 12,
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
            </ScrollView>
          )}
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
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  workoutTypeSection: {
    marginBottom: 20,
  },
  workoutTypeLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  workoutTypeInput: {
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'rgba(0, 255, 0, 0.08)',
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
  },
  exerciseListSection: {
    flex: 1,
  },
  exerciseListTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
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
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  emptyStateSubtext: {
    color: 'rgba(0, 255, 0, 0.6)',
    fontFamily: theme.fonts.code,
    fontSize: 12,
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
    fontSize: 16,
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
    fontSize: 12,
    marginRight: 8,
    fontWeight: 'bold',
  },
  inputBox: {
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 50,
    backgroundColor: 'rgba(0, 255, 0, 0.12)',
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
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
    borderColor: 'rgba(0, 255, 0, 0.3)',
    borderStyle: 'dashed',
  },
  addExerciseText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 16,
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
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: theme.colors.background,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    fontWeight: 'bold',
  },
  cancelButton: {
    flex: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 0, 0.08)',
  },
  cancelButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 0, 51, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 51, 0.3)',
  },
  deleteButtonText: {
    color: '#FF0033',
    fontFamily: theme.fonts.code,
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 16,
  },
});
