import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../styles/theme';
import { db } from '../db/client';
import * as schema from '../db/schema';
import { getExerciseMaxWeights } from '../services/workoutHistory';
import { GlobalRestTimerDisplay } from '../components/GlobalRestTimerDisplay';

export type Exercise = typeof schema.exercises.$inferSelect;

const MUSCLE_GROUP_OPTIONS = [
  'Chest', 'Back', 'Legs', 'Glutes', 'Shoulders', 'Triceps', 'Biceps', 'Core', 'Arms'
];
const CATEGORY_OPTIONS = [
  'Barbell', 'Dumbbell', 'Machine', 'Smith Machine', 'Bodyweight', 'Cable', 'Trap Bar', 'Kettlebell', 'Band', 'Other'
];

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
});

export default function ExercisesScreen() {
  const [search, setSearch] = useState('');
  const [pickerExercises, setPickerExercises] = useState<Exercise[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('All');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('A-Z');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newMuscleGroups, setNewMuscleGroups] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [adding, setAdding] = useState(false);
  const [maxWeights, setMaxWeights] = useState<Record<number, { weight: number; reps: number }>>({});
  const router = useRouter();

  // Fetch max weights for exercises
  useEffect(() => {
    getExerciseMaxWeights().then(setMaxWeights);
  }, []);

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
          let filtered = results;
          if (selectedMuscleGroup !== 'All') {
            filtered = filtered.filter(ex => 
              ex.muscle_group?.toLowerCase().includes(selectedMuscleGroup.toLowerCase())
            );
          }
          if (selectedEquipment !== 'All') {
            filtered = filtered.filter(ex => 
              ex.category?.toLowerCase().includes(selectedEquipment.toLowerCase())
            );
          }
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
        }
      })
      .catch(() => {
        if (isActive) setPickerExercises([]);
      })
      .finally(() => {
        if (isActive) setPickerLoading(false);
      });
    return () => { isActive = false; };
  }, [search, selectedMuscleGroup, selectedEquipment, sortBy]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <GlobalRestTimerDisplay />
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.body, fontSize: 36, fontWeight: 'bold' }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 28, fontWeight: 'bold', flex: 1, textAlign: 'center', marginHorizontal: 16 }}>EXERCISES</Text>
        <View style={{ width: 36 }} />
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
      {/* Exercise List */}
      {pickerLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.colors.neon} size="large" />
        </View>
      ) : (
        <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
          {pickerExercises.map((ex) => (
            <View key={ex.id} style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 8, marginBottom: 12, padding: 16, backgroundColor: 'transparent', flexDirection: 'row', alignItems: 'center' }}>
              {/* Exercise Details */}
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 20, fontWeight: 'bold', marginBottom: 4 }}>{ex.name}</Text>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16, opacity: 0.7, marginBottom: 4 }}>{ex.muscle_group} • {ex.category}</Text>
              </View>
              {/* Max Weight */}
              {maxWeights[ex.id] && (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 18, fontWeight: 'bold' }}>
                    {Math.round(maxWeights[ex.id].weight)}kg
                  </Text>
                  <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 14, opacity: 0.7 }}>
                    {maxWeights[ex.id].reps} reps
                  </Text>
                </View>
              )}
            </View>
          ))}
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
                    setShowAddModal(false);
                    setSearch('');
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
    </SafeAreaView>
  );
} 