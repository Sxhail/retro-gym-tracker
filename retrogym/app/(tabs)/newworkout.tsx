import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, FlatList, Alert } from 'react-native';
import { useFonts } from 'expo-font';
import { useWorkout } from '../context/WorkoutContext';
import { getExercisesByFilter, searchExercisesByName, Exercise } from '../../db/dataAccess';
import { useRouter } from 'expo-router';
import * as SQLite from 'expo-sqlite';
console.log('SQLite is', SQLite);

const MUSCLE_GROUPS = ['Chest', 'Back', 'Legs', 'Shoulders', 'Triceps', 'Biceps', 'Glutes', 'Core', 'Calves', 'Forearms', 'Hip Flexors'];
const CATEGORIES = ['Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Smith Machine', 'Trap Bar', 'Resistance Band', "Captain's Chair", 'Assisted Machine'];
const db = (SQLite as any).openDatabase('gym.db');

export default function NewWorkoutScreen() {
  const [fontsLoaded] = useFonts({
    VT323: require('../../assets/fonts/VT323-Regular.ttf'),
  });
  const [search, setSearch] = useState('');
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [results, setResults] = useState<Exercise[]>([]);
  const { addExercise, removeExercise, selectedExercises } = useWorkout();
  const router = useRouter();

  useEffect(() => {
    if (search.trim()) {
      searchExercisesByName(search).then(setResults);
    } else {
      getExercisesByFilter(selectedMuscles, selectedCategories).then(setResults);
    }
  }, [search, selectedMuscles, selectedCategories]);

  // Add a new custom exercise to the DB and to the workout
  const handleAddCustomExercise = () => {
    const trimmed = search.trim();
    if (!trimmed) return;
    // Check if already exists in results or selectedExercises
    if (
      results.some(e => e.name.toLowerCase() === trimmed.toLowerCase()) ||
      selectedExercises.some(e => e.name.toLowerCase() === trimmed.toLowerCase())
    ) {
      Alert.alert('Exercise already exists');
      return;
    }
    db.transaction((tx: any) => {
      tx.executeSql(
        'INSERT INTO exercises (name) VALUES (?)',
        [trimmed],
        (_: any, result: any) => {
          const newExercise: Exercise = {
            id: result.insertId,
            name: trimmed,
            muscle_groups: [],
            categories: [],
          };
          addExercise(newExercise);
          setSearch('');
          Alert.alert('Added', `"${trimmed}" added to your workout!`);
        },
        (err: any) => {
          Alert.alert('Error', 'Could not add exercise.');
          return true;
        }
      );
    });
  };

  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      {/* Header and Back */}
      <View style={styles.header}>
        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>SYSTEM ONLINE</Text>
        </View>
        <Text style={styles.protocolText}>RETRO FITNESS PROTOCOL</Text>
        <View style={styles.divider} />
      </View>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>{'← BACK'}</Text>
        </TouchableOpacity>
        <Text style={styles.sessionActive}>SESSION ACTIVE</Text>
      </View>
      {/* Selected Exercises */}
      {selectedExercises.length > 0 && (
        <View style={styles.selectedList}>
          <Text style={styles.selectedTitle}>Current Workout:</Text>
          {selectedExercises.map((ex) => (
            <View key={ex.id} style={styles.selectedExerciseRow}>
              <Text style={styles.selectedExerciseName}>{ex.name}</Text>
              <TouchableOpacity onPress={() => removeExercise(ex.id)}>
                <Text style={styles.removeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      {/* Search Bar */}
      <TextInput
        style={styles.searchBar}
        placeholder="Search exercises..."
        placeholderTextColor="#3fa77a"
        value={search}
        onChangeText={setSearch}
      />
      {/* Add Custom Exercise Button */}
      {search.trim() && results.length === 0 && (
        <TouchableOpacity style={styles.addCustomBtn} onPress={handleAddCustomExercise}>
          <Text style={styles.addCustomBtnText}>+ Add "{search.trim()}" as a new exercise</Text>
        </TouchableOpacity>
      )}
      {/* Muscle Group Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {MUSCLE_GROUPS.map((mg) => (
          <TouchableOpacity
            key={mg}
            style={[styles.chip, selectedMuscles.includes(mg) && styles.chipSelected]}
            onPress={() =>
              setSelectedMuscles((prev) =>
                prev.includes(mg) ? prev.filter((m) => m !== mg) : [...prev, mg]
              )
            }
          >
            <Text style={styles.chipText}>{mg}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {/* Category Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, selectedCategories.includes(cat) && styles.chipSelected]}
            onPress={() =>
              setSelectedCategories((prev) =>
                prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
              )
            }
          >
            <Text style={styles.chipText}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {/* Exercise List */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 32 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.exerciseCard}
            onPress={() => addExercise(item)}
            disabled={selectedExercises.some((e) => e.id === item.id)}
          >
            <View>
              <Text style={styles.exerciseName}>{item.name}</Text>
              <View style={styles.badgeRow}>
                {/* Render muscle group badges */}
                {item.muscle_groups?.map((mg) => (
                  <Text key={mg} style={styles.badge}>{mg}</Text>
                ))}
                {/* Render category badges */}
                {item.categories?.map((cat) => (
                  <Text key={cat} style={[styles.badge, styles.badgeCategory]}>{cat}</Text>
                ))}
              </View>
            </View>
            {selectedExercises.some((e) => e.id === item.id) && (
              <Text style={styles.selectedMark}>✓</Text>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050d07', padding: 16 },
  header: {
    width: 420,
    marginBottom: 12,
    alignSelf: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00ff99',
    marginRight: 8,
  },
  statusText: {
    color: '#00ff99',
    fontSize: 12,
    fontFamily: 'VT323',
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  protocolText: {
    color: '#00ff99',
    fontSize: 12,
    fontFamily: 'VT323',
    marginBottom: 8,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  divider: {
    borderBottomColor: '#00ff99',
    borderBottomWidth: 1,
    opacity: 0.2,
    marginVertical: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 2,
  },
  backText: {
    color: '#00ff99',
    fontFamily: 'VT323',
    fontSize: 18,
    letterSpacing: 2,
  },
  sessionActive: {
    color: '#00ff99',
    fontFamily: 'VT323',
    fontSize: 16,
    letterSpacing: 2,
  },
  selectedList: {
    marginBottom: 10,
    backgroundColor: 'rgba(0,255,153,0.03)',
    borderColor: '#00ff99',
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
  },
  selectedTitle: {
    color: '#00ff99',
    fontFamily: 'VT323',
    fontSize: 16,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  selectedExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  selectedExerciseName: {
    color: '#00ff99',
    fontFamily: 'VT323',
    fontSize: 16,
  },
  removeBtn: {
    color: '#ff4d4d',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  searchBar: {
    fontFamily: 'VT323',
    fontSize: 20,
    color: '#00ff99',
    borderColor: '#00ff99',
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  addCustomBtn: {
    backgroundColor: '#071d13',
    borderColor: '#00ff99',
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  addCustomBtnText: {
    color: '#00ff99',
    fontFamily: 'VT323',
    fontSize: 16,
    fontWeight: 'bold',
  },
  chipRow: { flexDirection: 'row', marginBottom: 8 },
  chip: {
    borderColor: '#00ff99',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
    backgroundColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: '#071d13',
  },
  chipText: {
    color: '#00ff99',
    fontFamily: 'VT323',
    fontSize: 16,
  },
  list: { flex: 1, marginTop: 8 },
  exerciseCard: {
    backgroundColor: 'rgba(0,255,153,0.03)',
    borderColor: '#00ff99',
    borderWidth: 1,
    borderRadius: 4,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: {
    color: '#00ff99',
    fontFamily: 'VT323',
    fontSize: 18,
    marginBottom: 4,
    letterSpacing: 2,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 },
  badge: {
    color: '#00ff99',
    fontFamily: 'VT323',
    fontSize: 13,
    borderColor: '#00ff99',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6,
    marginBottom: 2,
  },
  badgeCategory: {
    backgroundColor: '#071d13',
  },
  selectedMark: {
    color: '#00ff99',
    fontFamily: 'VT323',
    fontSize: 22,
    fontWeight: 'bold',
  },
}); 