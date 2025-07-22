import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../styles/theme';
import { db } from '../db/client';
import * as schema from '../db/schema';

export type Exercise = typeof schema.exercises.$inferSelect;

export default function ExercisesScreen() {
  const [search, setSearch] = useState('');
  const [pickerExercises, setPickerExercises] = useState<Exercise[]>([]);
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 36, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.neon }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 24 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 20, fontWeight: 'bold', marginLeft: 16 }}>EXERCISES</Text>
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
      {/* Exercise List */}
      {pickerLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.colors.neon} size="large" />
        </View>
      ) : (
        <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
          {pickerExercises.map((ex) => (
            <View key={ex.id} style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 8, marginBottom: 12, padding: 16, backgroundColor: 'transparent', flexDirection: 'row', alignItems: 'center' }}>
              {/* Exercise Icon */}
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.neon, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Text style={{ color: 'black', fontFamily: theme.fonts.code, fontSize: 16, fontWeight: 'bold' }}>{ex.name.charAt(0).toUpperCase()}</Text>
              </View>
              {/* Exercise Details */}
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>{ex.name}</Text>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 12, opacity: 0.7, marginBottom: 4 }}>{ex.muscle_group} • {ex.category}</Text>
<<<<<<< HEAD
                <View style={{ flexDirection: 'row' }}>
                  <View style={{ backgroundColor: '#FFD700', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: 'black', fontFamily: theme.fonts.code, fontSize: 10, fontWeight: 'bold' }}>INTERMEDIATE</Text>
                  </View>
                </View>
=======
>>>>>>> a784d5a (Removed problematic legacy code, added outlines and better color schemes to each screen)
              </View>
            </View>
          ))}
          {pickerExercises.length === 0 && (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16, textAlign: 'center' }}>
                No exercises found.
              </Text>
              <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 12, textAlign: 'center', marginTop: 8, opacity: 0.7 }}>
                Try a different keyword or filter.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
} 