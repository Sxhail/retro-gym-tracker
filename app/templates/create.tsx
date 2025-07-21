import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../../styles/theme';
import { db } from '../../db/client';
import * as schema from '../../db/schema';

export type Exercise = typeof schema.exercises.$inferSelect;

export default function CreateTemplateScreen() {
  const [templateName, setTemplateName] = useState('');
  const [search, setSearch] = useState('');
  const [pickerExercises, setPickerExercises] = useState<Exercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('All');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('A-Z');
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
      {/* Back Button */}
      <View style={{ marginTop: 12, marginLeft: 8, marginBottom: 0, alignItems: 'flex-start' }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.body, fontSize: 12, paddingVertical: 2, paddingHorizontal: 6 }}>← BACK</Text>
        </TouchableOpacity>
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
      {/* Exercise Picker/Search UI */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.heading, fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>Add Exercises</Text>
        {/* Search Bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 8, backgroundColor: 'transparent', paddingHorizontal: 12, marginBottom: 8 }}>
          <TextInput
            style={{ flex: 1, color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16, paddingVertical: 12 }}
            placeholder="SEARCH"
            placeholderTextColor={theme.colors.neon}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        {/* Filter and Sort Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <TouchableOpacity style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 }}>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 12 }}>FILTER</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 12 }}>{sortBy}</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 12, marginLeft: 12 }}>{pickerExercises.length} found</Text>
        </View>
        {/* Muscle Groups Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
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
        {/* Equipment Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
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
        {/* Exercise List */}
        {pickerLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={theme.colors.neon} size="large" />
          </View>
        ) : (
          <ScrollView style={{ maxHeight: 180 }}>
            {pickerExercises.map((ex) => {
              const alreadyAdded = selectedExercises.some(e => e.id === ex.id);
              return (
                <TouchableOpacity
                  key={ex.id}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.neon,
                    borderRadius: 8,
                    marginBottom: 8,
                    padding: 12,
                    backgroundColor: alreadyAdded ? theme.colors.neon : 'transparent',
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                  onPress={() => handleSelectExercise(ex)}
                  disabled={alreadyAdded}
                >
                  <View style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: theme.colors.neon,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 10,
                  }}>
                    <Text style={{ color: 'black', fontFamily: theme.fonts.code, fontSize: 14, fontWeight: 'bold' }}>{ex.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={{ color: alreadyAdded ? 'black' : theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 15, fontWeight: 'bold' }}>{ex.name}</Text>
                  <Text style={{ color: alreadyAdded ? 'black' : theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 11, opacity: 0.7, marginLeft: 8 }}>{ex.muscle_group} • {ex.category}</Text>
                  {alreadyAdded && (
                    <Text style={{ color: 'black', fontSize: 16, marginLeft: 8 }}>✔</Text>
                  )}
                </TouchableOpacity>
              );
            })}
            {pickerExercises.length === 0 && (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20 }}>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 14, textAlign: 'center' }}>
                  No exercises found.
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
      {/* Selected Exercises List */}
      <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
        <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.heading, fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>Selected Exercises</Text>
        {selectedExercises.length === 0 ? (
          <Text style={{ color: theme.colors.textSecondary, fontFamily: theme.fonts.body, fontSize: 14 }}>No exercises selected.</Text>
        ) : (
          <ScrollView style={{ maxHeight: 120 }}>
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
      {/* Save Button */}
      <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
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
    </SafeAreaView>
  );
} 