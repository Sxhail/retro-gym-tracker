import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator, PanResponder, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../styles/theme';
import { db } from '../db/client';
import * as schema from '../db/schema';

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

  return (
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
      <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 14, marginRight: 8, minWidth: 48 }}>SET {setIdx + 1}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {/* KG label and input */}
        <View style={{ alignItems: 'center', marginRight: 6 }}>
          <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 10, marginBottom: 2 }}>KG</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 4, color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 14, width: 48, padding: 2, backgroundColor: 'transparent', textAlign: 'center' }}
            value={set.weight?.toString() || ''}
            onChangeText={v => handleSetFieldChange(exerciseId, setIdx, 'weight', v)}
            placeholder="0"
            placeholderTextColor={theme.colors.neon}
            keyboardType="numeric"
          />
        </View>
        {/* REPS label and input */}
        <View style={{ alignItems: 'center', marginRight: 6 }}>
          <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 10, marginBottom: 2 }}>REPS</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 4, color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 14, width: 48, padding: 2, backgroundColor: 'transparent', textAlign: 'center' }}
            value={set.reps?.toString() || ''}
            onChangeText={v => handleSetFieldChange(exerciseId, setIdx, 'reps', v)}
            placeholder="0"
            placeholderTextColor={theme.colors.neon}
            keyboardType="numeric"
          />
        </View>
        {/* NOTES label and input */}
        <View style={{ justifyContent: 'center', alignItems: 'center', marginRight: 6, flex: 1 }}>
          <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 10, marginBottom: 2 }}>NOTES</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 4, color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 12, padding: 2, backgroundColor: 'transparent', textAlign: 'left', width: '100%' }}
            value={set.notes || ''}
            onChangeText={v => handleSetFieldChange(exerciseId, setIdx, 'notes', v)}
            placeholder="-"
            placeholderTextColor={theme.colors.neon}
            multiline={false}
            maxLength={40}
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
          fontFamily: theme.fonts.mono,
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
  );
}

export default function NewWorkoutScreen() {
  const [exercise, setExercise] = useState('');
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [sessionExercises, setSessionExercises] = useState<any[]>([]);
  const [workoutName, setWorkoutName] = useState('New Workout');
  const [pickerExercises, setPickerExercises] = useState<Exercise[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('All');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('A-Z');
  const router = useRouter();
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<any>(null);
  const [workoutDate, setWorkoutDate] = useState<string>("");

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
        setSessionExercises([...sessionExercises, { ...ex, sets: [] }]);
      }
      setModalVisible(false);
    } catch (err) {
      console.error('Error adding exercise:', err);
    } finally {
      setPickerLoading(false);
    }
  };

  // Remove exercise from session
  const handleRemoveExercise = (exerciseId: number) => {
    setSessionExercises(sessionExercises.filter((ex) => ex.id !== exerciseId));
  };

  // Add helper to format seconds as mm:ss
  function formatRest(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // Add set to an exercise
  const handleAddSet = (exerciseId: number) => {
    setSessionExercises(sessionExercises.map((ex) => {
      if (ex.id === exerciseId) {
        const lastRest = ex.sets && ex.sets.length > 0 ? ex.sets[ex.sets.length - 1].rest ?? 120 : 120;
        const newSet = { reps: 0, weight: 0, completed: false, rest: lastRest };
        return { ...ex, sets: ex.sets ? [...ex.sets, newSet] : [newSet] };
      }
      return ex;
    }));
  };

  // Toggle set completion
  const handleToggleSetComplete = (exerciseId: number, setIdx: number) => {
    setSessionExercises(sessionExercises.map((ex) => {
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
    setSessionExercises(sessionExercises.map((ex) => {
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
    setSessionExercises(sessionExercises.map((ex) => {
      if (ex.id === exerciseId) {
        const updatedSets = (ex.sets || []).map((set: any, idx: number) =>
          idx === setIdx ? { ...set, rest: Math.max(0, (set.rest ?? 120) + delta) } : set
        );
        return { ...ex, sets: updatedSets };
      }
      return ex;
    }));
  };

  // Add handler to remove a set from an exercise
  const handleRemoveSet = (exerciseId: number, setIdx: number) => {
    setSessionExercises(sessionExercises.map((ex) => {
      if (ex.id === exerciseId) {
        const updatedSets = (ex.sets || []).filter((_, idx) => idx !== setIdx);
        return { ...ex, sets: updatedSets };
      }
      return ex;
    }));
  };

  // Start timer and set date when first exercise is added
  useEffect(() => {
    if (sessionExercises.length > 0 && !workoutStartTime) {
      setWorkoutStartTime(Date.now());
      setElapsed(0);
      // Set the workout date to today
      const now = new Date();
      const formatted = `${now.getFullYear()}.${(now.getMonth()+1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')}`;
      setWorkoutDate(formatted);
    }
    // Reset timer and date if all exercises are removed
    if (sessionExercises.length === 0 && workoutStartTime) {
      setWorkoutStartTime(null);
      setElapsed(0);
      setWorkoutDate("");
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [sessionExercises.length]);

  // Timer interval
  useEffect(() => {
    if (workoutStartTime) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - workoutStartTime) / 1000));
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [workoutStartTime]);

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

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: 0, paddingTop: 0 }}>
      {/* Top status and protocol */}
      <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 12, marginTop: 24, marginLeft: 16, marginBottom: 0 }}>■ SYSTEM ONLINE</Text>
      <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 12, marginLeft: 16, marginBottom: 8 }}>RETRO FITNESS PROTOCOL</Text>
      <View style={{ borderBottomWidth: 1, borderBottomColor: theme.colors.neon, marginHorizontal: 0, marginBottom: 8 }} />
      {/* Header row: BACK (top left), DATE (below), TIMER (right) */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginHorizontal: 16, marginBottom: 8, marginTop: 0 }}>
        <View style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <Text 
            style={{ 
              color: theme.colors.neon, 
              fontFamily: theme.fonts.mono, 
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
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 14 }}>{workoutDate}</Text>
          )}
        </View>
        {workoutStartTime && (
          <Text 
            style={{ 
              color: theme.colors.neon, 
              fontFamily: theme.fonts.mono, 
              fontSize: 18, 
              fontWeight: 'bold', 
              letterSpacing: 2, 
              borderWidth: 1, 
              borderColor: theme.colors.neon, 
              borderRadius: 6, 
              paddingVertical: 4, 
              paddingHorizontal: 16, 
              overflow: 'hidden',
              backgroundColor: 'transparent',
            }}
          >
            TIMER: {formatElapsed(elapsed)}
          </Text>
        )}
      </View>
      {/* Main content (workout box, input, END WORKOUT) */}
      {sessionExercises.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: -120 }}>
          {/* Only show input and END WORKOUT button when no exercises */}
          <View style={{ width: '100%', maxWidth: 400, borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 8, padding: 24, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
            <TextInput
              style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontWeight: 'bold', fontSize: 22, marginBottom: 18, letterSpacing: 1.5, textAlign: 'center', backgroundColor: 'transparent', borderWidth: 0 }}
              value={workoutName}
              onChangeText={setWorkoutName}
              placeholder="ENTER WORKOUT"
              placeholderTextColor={theme.colors.neon}
            />
            <View style={{ flexDirection: 'row', width: '100%', marginBottom: 18 }}>
              <TextInput
                style={{ flex: 1, borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 4, color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 16, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'transparent', marginRight: 8 }}
                placeholder="ADD EXERCISE"
                placeholderTextColor={theme.colors.neon}
                value={search}
                onChangeText={setSearch}
                onFocus={() => setModalVisible(true)}
              />
              <TouchableOpacity style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 4, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }} onPress={() => setModalVisible(true)}>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 28, fontWeight: 'bold', marginTop: -2 }}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={{ width: '100%', backgroundColor: '#CC0000', borderRadius: 4, paddingVertical: 18, alignItems: 'center', borderWidth: 2, borderColor: theme.colors.neon, marginBottom: 0 }}>
              <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 20, fontWeight: 'bold', letterSpacing: 1.2 }}>END WORKOUT</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <ScrollView style={{ flex: 1, marginBottom: 12 }}>
            {sessionExercises.map((ex, idx) => (
              <View key={ex.id} style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 8, marginBottom: 18, padding: 12, backgroundColor: 'transparent' }}>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontWeight: 'bold', fontSize: 18, textTransform: 'uppercase', marginBottom: 8 }}>{ex.name.toUpperCase()}</Text>
                {/* Sets List */}
                {(ex.sets && ex.sets.length > 0 ? ex.sets : [{ reps: 0, weight: 0, rest: 120 }]).map((set: any, setIdx: number) => (
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
                  <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 16, fontWeight: 'bold', letterSpacing: 1 }}>ADD SET</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', width: '100%', marginBottom: 12 }}>
            <TextInput
              style={{ flex: 1, borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 4, color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 16, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'transparent', marginRight: 8 }}
              placeholder="ADD EXERCISE"
              placeholderTextColor={theme.colors.neon}
              value={search}
              onChangeText={setSearch}
              onFocus={() => setModalVisible(true)}
            />
            <TouchableOpacity style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 4, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }} onPress={() => setModalVisible(true)}>
              <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 28, fontWeight: 'bold', marginTop: -2 }}>+</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={{ width: '100%', backgroundColor: '#CC0000', borderRadius: 4, paddingVertical: 18, alignItems: 'center', borderWidth: 2, borderColor: theme.colors.neon, marginBottom: 0 }}>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 20, fontWeight: 'bold', letterSpacing: 1.2 }}>END WORKOUT</Text>
          </TouchableOpacity>
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
              <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 24 }}>←</Text>
            </TouchableOpacity>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 20, fontWeight: 'bold' }}>EXERCISES</Text>
            <TouchableOpacity>
              <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 20 }}>⋮</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 8, backgroundColor: 'transparent', paddingHorizontal: 12 }}>
              <TextInput
                style={{ flex: 1, color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 16, paddingVertical: 12 }}
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
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 12 }}>FILTER</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 12 }}>{sortBy}</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 12 }}>{pickerExercises.length} found</Text>
          </View>

          {/* Muscle Groups Filter */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>MUSCLE GROUPS</Text>
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
                      fontFamily: theme.fonts.mono, 
                      fontSize: 12 
                    }}>{group}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Equipment Filter */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>CATEGORY</Text>
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
                      fontFamily: theme.fonts.mono, 
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
              <Text style={{ color: '#FF0000', fontFamily: theme.fonts.mono, fontSize: 12 }}>CLEAR ALL FILTERS</Text>
            </TouchableOpacity>
          )}

          {/* Exercise List */}
          {pickerLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator color={theme.colors.neon} size="large" />
            </View>
          ) : (
            <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
              {pickerExercises.map((ex) => (
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
                  onPress={() => handleAddExerciseFromPicker(ex)}
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
                    <Text style={{ color: 'black', fontFamily: theme.fonts.mono, fontSize: 16, fontWeight: 'bold' }}>
                      {ex.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  {/* Exercise Details */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 16, fontWeight: 'bold', marginBottom: 4 }}>
                      {ex.name}
                    </Text>
                    <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                      {ex.muscle_group} • {ex.category}
                    </Text>
                                         <View style={{ flexDirection: 'row' }}>
                       <View style={{ 
                         backgroundColor: '#FFD700', 
                         borderRadius: 8, 
                         paddingHorizontal: 6, 
                         paddingVertical: 2 
                       }}>
                         <Text style={{ color: 'black', fontFamily: theme.fonts.mono, fontSize: 10, fontWeight: 'bold' }}>
                           INTERMEDIATE
                         </Text>
                       </View>
                     </View>
                  </View>

                  {/* Action Icons */}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity style={{ marginRight: 12 }}>
                      <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 16 }}>☆</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleAddExerciseFromPicker(ex)}>
                      <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 20, fontWeight: 'bold' }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
              {pickerExercises.length === 0 && (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
                  <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 16, textAlign: 'center' }}>
                    No exercises found.
                  </Text>
                  <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 12, textAlign: 'center', marginTop: 8, opacity: 0.7 }}>
                    Try a different keyword or filter.
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
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
    fontFamily: theme.fonts.mono,
    fontSize: theme.fonts.caption.fontSize,
    marginBottom: theme.spacing.xs / 2,
    lineHeight: theme.fonts.caption.lineHeight,
  },
  protocol: {
    color: theme.colors.text,
    fontFamily: theme.fonts.mono,
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
    fontFamily: theme.fonts.mono,
    fontSize: theme.fonts.body.fontSize,
    lineHeight: theme.fonts.body.lineHeight,
  },
  session: {
    color: theme.colors.text,
    fontFamily: theme.fonts.mono,
    fontSize: theme.fonts.body.fontSize,
    fontWeight: 'bold',
    lineHeight: theme.fonts.body.lineHeight,
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.fonts.mono,
    fontWeight: 'bold',
    fontSize: theme.fonts.h2.fontSize,
    marginBottom: theme.spacing.xs,
    letterSpacing: 1.5,
    lineHeight: theme.fonts.h2.lineHeight,
  },
  date: {
    color: theme.colors.text,
    fontFamily: theme.fonts.mono,
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
    fontFamily: theme.fonts.mono,
    fontSize: theme.fonts.body.fontSize,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginRight: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundOverlay,
    lineHeight: theme.fonts.body.lineHeight,
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
    fontFamily: theme.fonts.mono,
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
    fontFamily: theme.fonts.mono,
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
    fontFamily: theme.fonts.mono,
    fontSize: theme.fonts.h2.fontSize,
    fontWeight: 'bold',
    letterSpacing: 1.2,
    lineHeight: theme.fonts.h2.lineHeight,
  },
}); 