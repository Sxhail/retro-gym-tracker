import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import theme from '../styles/theme';
import FilterChips from '../components/FilterChips';
import ExerciseCard from '../components/ExerciseCard';
import { getAllExercises, filterExercises, searchExercisesByName, insertCustomExercise, Exercise } from '../services/db';

interface AddExercisePickerProps {
  onClose: () => void;
  onAddExercise?: (exercise: any) => void;
}

const AddExercisePicker: React.FC<AddExercisePickerProps> = ({ onClose, onAddExercise }) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [muscleGroups, setMuscleGroups] = useState<string[]>(['Any']);
  const [categories, setCategories] = useState<string[]>(['Any']);
  const [selectedMuscle, setSelectedMuscle] = useState<string>('Any');
  const [selectedCategory, setSelectedCategory] = useState<string>('Any');
  const [showAddCustom, setShowAddCustom] = useState(false);

  // Load all exercises and extract unique categories/muscle groups
  useEffect(() => {
    setLoading(true);
    getAllExercises().then((all) => {
      setExercises(all);
      // Extract unique muscle groups and categories
      const allMuscles = Array.from(new Set(all.flatMap(ex => ex.muscle_group.split(',').map(s => s.trim())))).filter(Boolean);
      const allCats = Array.from(new Set(all.flatMap(ex => ex.category.split(',').map(s => s.trim())))).filter(Boolean);
      setMuscleGroups(['Any', ...allMuscles]);
      setCategories(['Any', ...allCats]);
      setLoading(false);
    });
  }, []);

  // Filter/search logic
  useEffect(() => {
    setLoading(true);
    let fetch;
    if (search.trim()) {
      fetch = searchExercisesByName(search.trim());
    } else {
      fetch = getAllExercises();
    }
    fetch.then((results) => {
      // Further filter by muscle group/category if needed
      let filtered = results;
      if (selectedMuscle !== 'Any') {
        filtered = filtered.filter(ex => ex.muscle_group.split(',').map(s => s.trim()).includes(selectedMuscle));
      }
      if (selectedCategory !== 'Any') {
        filtered = filtered.filter(ex => ex.category.split(',').map(s => s.trim()).includes(selectedCategory));
      }
      setExercises(filtered);
      setShowAddCustom(search.trim() && filtered.length === 0);
      setLoading(false);
    });
  }, [search, selectedMuscle, selectedCategory]);

  // Group by first letter
  const grouped = exercises.reduce((acc: Record<string, Exercise[]>, ex) => {
    const letter = ex.name[0].toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(ex);
    return acc;
  }, {});
  const groupKeys = Object.keys(grouped).sort();

  // Add custom exercise handler
  const handleAddCustom = async () => {
    // For simplicity, prompt for category/muscle group (could use a modal in real app)
    const category = selectedCategory !== 'Any' ? selectedCategory : prompt('Category for new exercise?') || '';
    const muscle_group = selectedMuscle !== 'Any' ? selectedMuscle : prompt('Muscle group for new exercise?') || '';
    setLoading(true);
    await insertCustomExercise(search.trim(), category, muscle_group);
    setSearch(''); // Reset search to reload all
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ADD EXERCISE</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>CLOSE</Text>
        </TouchableOpacity>
      </View>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          placeholderTextColor={theme.colors.neon}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      {/* Filter chips */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 12 }}>
        <FilterChips options={muscleGroups} selected={selectedMuscle === 'Any' ? [] : [selectedMuscle]} onSelect={setSelectedMuscle} />
        <FilterChips options={categories} selected={selectedCategory === 'Any' ? [] : [selectedCategory]} onSelect={setSelectedCategory} />
      </View>
      {/* Exercise List */}
      <View style={styles.listContainer}>
        {loading ? (
          <ActivityIndicator color={theme.colors.neon} size="large" />
        ) : (
          <>
            {showAddCustom ? (
              <TouchableOpacity style={{ margin: 16, alignItems: 'center' }} onPress={handleAddCustom}>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 16 }}>
                  + Add "{search.trim()}" as custom exercise
                </Text>
              </TouchableOpacity>
            ) : null}
            {exercises.length === 0 ? (
              <Text style={styles.placeholderText}>No exercises found.</Text>
            ) : (
              <>
                <View style={{ flex: 1 }}>
                  <ScrollView>
                    {groupKeys.map((letter) => (
                      <View key={letter}>
                        <Text style={styles.groupHeader}>{letter}</Text>
                        {grouped[letter].map((ex) => (
                          <ExerciseCard
                            key={ex.id}
                            name={ex.name}
                            onAdd={() => {
                              if (onAddExercise) onAddExercise(ex);
                              onClose();
                            }}
                          />
                        ))}
                      </View>
                    ))}
                  </ScrollView>
                </View>
              </>
            )}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: 36,
    paddingHorizontal: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  title: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.mono,
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  closeBtn: {
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.neon,
    borderRadius: theme.borderRadius,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: theme.colors.backgroundOverlay,
  },
  closeText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.mono,
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.neon,
    borderRadius: theme.borderRadius,
    color: theme.colors.neon,
    fontFamily: theme.fonts.mono,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.backgroundOverlay,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.mono,
    fontSize: 16,
    opacity: 0.7,
  },
  listContainer: {
    flex: 1,
    marginTop: 8,
    marginHorizontal: 12,
  },
  groupHeader: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.mono,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
    letterSpacing: 1.2,
  },
});

export default AddExercisePicker; 