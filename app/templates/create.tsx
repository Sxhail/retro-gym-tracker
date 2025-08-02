import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../../styles/theme';
import { db } from '../../db/client';
import * as schema from '../../db/schema';

export type Exercise = typeof schema.exercises.$inferSelect;

const MUSCLE_GROUP_OPTIONS = [
  'Chest', 'Back', 'Legs', 'Glutes', 'Shoulders', 'Triceps', 'Biceps', 'Core', 'Arms'
];
const CATEGORY_OPTIONS = [
  'Barbell', 'Dumbbell', 'Machine', 'Smith Machine', 'Bodyweight', 'Cable', 'Trap Bar', 'Kettlebell', 'Band', 'Other'
];

export default function CreateTemplateScreen() {
  const [templateName, setTemplateName] = useState('');
  const [search, setSearch] = useState('');
  const [pickerExercises, setPickerExercises] = useState<Exercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('All');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('A-Z');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newMuscleGroups, setNewMuscleGroups] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [adding, setAdding] = useState(false);
  const router = useRouter();

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

  const handleSelectExercise = (exercise: Exercise) => {
    if (!selectedExercises.some(e => e.id === exercise.id)) {
      setSelectedExercises([...selectedExercises, exercise]);
    }
  };

  const handleRemoveExercise = (exerciseId: number) => {
    setSelectedExercises(selectedExercises.filter(e => e.id !== exerciseId));
  };

  // Placeholder for save logic
  const handleSaveTemplate = async () => {
    if (!templateName || selectedExercises.length === 0) return;
    try {
      // Insert new template
      const [{ id: templateId }] = await db.insert(schema.workout_templates).values({ name: templateName }).returning({ id: schema.workout_templates.id });
      // Insert template_exercises
      await Promise.all(selectedExercises.map((ex, idx) =>
        db.insert(schema.template_exercises).values({ template_id: templateId, exercise_id: ex.id, exercise_order: idx })
      ));
      router.push('/templates');
    } catch (err) {
      console.error('Error saving template:', err);
      // Optionally show error to user
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, paddingTop: 16, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.body, fontSize: 36, fontWeight: 'bold' }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 28, fontWeight: 'bold', flex: 1, textAlign: 'center', marginHorizontal: 16 }}>CREATE TEMPLATE</Text>
        <View style={{ width: 36 }} />
      </View>
      {/* Template Name Input */}
      <View style={{ paddingHorizontal: 16, marginTop: 8, marginBottom: 12 }}>
        <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.heading, fontWeight: 'bold', fontSize: 18, marginBottom: 6 }}>Template Name</Text>
        <TextInput
          style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 8, color: theme.colors.neon, fontFamily: theme.fonts.body, fontSize: 16, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: 'transparent' }}
          placeholder="Enter template name"
          placeholderTextColor={theme.colors.neon}
          value={templateName}
          onChangeText={setTemplateName}
        />
      </View>
      {/* Exercise Search UI */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.heading, fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>Add Exercises</Text>
        {/* Search Bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 8, backgroundColor: 'transparent', paddingHorizontal: 12, marginBottom: 8 }}>
          <TextInput
            style={{ flex: 1, color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16, paddingVertical: 12 }}
            placeholder="SEARCH EXERCISES"
            placeholderTextColor={theme.colors.neon}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        {/* Search Results Dropdown */}
        {search.trim().length > 0 && (
          <View style={{ 
            borderWidth: 1, 
            borderColor: theme.colors.neon, 
            borderRadius: 8, 
            backgroundColor: 'transparent',
            maxHeight: 200,
            marginBottom: 8,
            position: 'relative',
            zIndex: 1000
          }}>
            <ScrollView style={{ maxHeight: 200 }}>
              {pickerLoading ? (
                <View style={{ padding: 12, alignItems: 'center' }}>
                  <ActivityIndicator color={theme.colors.neon} size="small" />
                </View>
              ) : pickerExercises.length > 0 ? (
                pickerExercises.slice(0, 10).map((ex) => {
                  const alreadyAdded = selectedExercises.some(e => e.id === ex.id);
                  return (
                    <TouchableOpacity
                      key={ex.id}
                      style={{
                        padding: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.colors.neon,
                        backgroundColor: alreadyAdded ? 'rgba(22, 145, 58, 0.1)' : 'transparent',
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                      onPress={() => handleSelectExercise(ex)}
                      disabled={alreadyAdded}
                    >
                      <Text style={{ 
                        color: alreadyAdded ? theme.colors.neon : theme.colors.neon, 
                        fontFamily: theme.fonts.code, 
                        fontSize: 14, 
                        fontWeight: 'bold',
                        flex: 1
                      }}>
                        {ex.name}
                      </Text>
                      <Text style={{ 
                        color: theme.colors.neon, 
                        fontFamily: theme.fonts.code, 
                        fontSize: 11, 
                        opacity: 0.7,
                        marginRight: 8
                      }}>
                        {ex.muscle_group} • {ex.category}
                      </Text>
                      {alreadyAdded && (
                        <Text style={{ color: theme.colors.neon, fontSize: 14 }}>✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={{ padding: 12, alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 14 }}>
                    No exercises found.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
        {/* Add New Exercise Button */}
        <TouchableOpacity
          style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 8, paddingVertical: 10, marginBottom: 8, alignItems: 'center' }}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.heading, fontSize: 14 }}>+ Add New Exercise</Text>
        </TouchableOpacity>
      </View>
      {/* Selected Exercises List */}
      <View style={{ paddingHorizontal: 16, marginTop: 8, flex: 1 }}>
        <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.heading, fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>Selected Exercises</Text>
        {selectedExercises.length === 0 ? (
          <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 14 }}>No exercises selected.</Text>
        ) : (
          <ScrollView style={{ flex: 1 }}>
            {selectedExercises.map((ex) => (
              <View key={ex.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 15, fontWeight: 'bold', marginRight: 8 }}>{ex.name}</Text>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 11, opacity: 0.7 }}>{ex.muscle_group} • {ex.category}</Text>
                <TouchableOpacity onPress={() => handleRemoveExercise(ex.id)}>
                  <Text style={{ color: '#FF4444', fontSize: 16, marginLeft: 8 }}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
      {/* Save Button - Fixed at Bottom */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 20, paddingTop: 12 }}>
        <TouchableOpacity
          style={{
            backgroundColor: theme.colors.neon,
            borderRadius: 12,
            paddingVertical: theme.spacing.lg,
            alignItems: 'center',
            width: '100%',
          }}
          onPress={handleSaveTemplate}
          disabled={!templateName || selectedExercises.length === 0}
        >
          <Text style={{
            color: theme.colors.background,
            fontFamily: theme.fonts.heading,
            fontWeight: 'bold',
            fontSize: 18,
            letterSpacing: 1,
            textAlign: 'center',
          }}>SAVE TEMPLATE</Text>
        </TouchableOpacity>
      </View>
      {/* Modal for Adding New Exercise */}
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
                    if (newMuscleGroups.includes(group)) {
                      setNewMuscleGroups(newMuscleGroups.filter(g => g !== group));
                    } else {
                      setNewMuscleGroups([...newMuscleGroups, group]);
                    }
                  }}
                >
                  <Text style={{ color: newMuscleGroups.includes(group) ? 'black' : theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 12 }}>{group}</Text>
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
                  <Text style={{ color: newCategory === cat ? 'black' : theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 12 }}>{cat}</Text>
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
                    const [inserted] = await db.insert(schema.exercises).values({
                      name: newExerciseName.trim(),
                      muscle_group: newMuscleGroups.join(', '),
                      category: newCategory,
                      is_custom: 1,
                    }).returning();
                    // Refresh pickerExercises after adding
                    const results = await db.select().from(schema.exercises);
                    setPickerExercises(results);
                    setShowAddModal(false);
                    setSearch('');
                    setNewExerciseName('');
                    setNewMuscleGroups([]);
                    setNewCategory('');
                    // Auto-select the new exercise for the template
                    if (inserted) {
                      setSelectedExercises(prev => [...prev, inserted]);
                    }
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