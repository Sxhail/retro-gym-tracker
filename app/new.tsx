import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import theme from '../styles/theme';
import { getAllExercises, searchExercisesByName, Exercise } from '../services/db';

export default function NewWorkoutScreen() {
  const [exercise, setExercise] = useState('');
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [sessionExercises, setSessionExercises] = useState<any[]>([]);
  const [workoutName, setWorkoutName] = useState('New Workout');
  const [pickerExercises, setPickerExercises] = useState<Exercise[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const router = useRouter();

  // Load exercises for modal (search-aware)
  useEffect(() => {
    let isActive = true;
    setPickerLoading(true);
    const fetch = search.trim()
      ? searchExercisesByName(search.trim())
      : getAllExercises();
    fetch
      .then((results) => {
        if (isActive) setPickerExercises(results);
        console.log('[DB] Picker exercises loaded:', results);
      })
      .catch((err) => {
        console.error('[DB] Error loading exercises:', err);
        if (isActive) setPickerExercises([]);
      })
      .finally(() => {
        if (isActive) setPickerLoading(false);
      });
    return () => { isActive = false; };
  }, [search, modalVisible]);

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

  // Add this handler to update set fields
  const handleSetFieldChange = (exerciseId: number, setIdx: number, field: 'weight' | 'reps', value: string) => {
    setSessionExercises(sessionExercises.map((ex) => {
      if (ex.id === exerciseId) {
        const updatedSets = (ex.sets || []).map((set: any, idx: number) =>
          idx === setIdx ? { ...set, [field]: value.replace(/[^0-9]/g, '') } : set
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
      {/* Header row: BACK, SESSION ACTIVE */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginBottom: 0 }}>
        <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 14 }} onPress={() => router.back()}>{'← BACK'}</Text>
        <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 14, fontWeight: 'bold' }}>SESSION ACTIVE</Text>
      </View>
      <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 14, marginLeft: 16, marginBottom: 12, marginTop: 0 }}>2025.07.16</Text>
      {/* Main content (workout box, input, END WORKOUT) */}
      {sessionExercises.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          {/* Only show input and END WORKOUT button when no exercises */}
          <View style={{ width: '100%', maxWidth: 400, borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 8, padding: 24, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontWeight: 'bold', fontSize: 22, marginBottom: 18, letterSpacing: 1.5 }}>New Workout</Text>
            <View style={{ flexDirection: 'row', width: '100%', marginBottom: 18 }}>
              <TextInput
                style={{ flex: 1, borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 4, color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 16, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'transparent', marginRight: 8 }}
                placeholder="Exercise name..."
                placeholderTextColor={theme.colors.neon}
                value={search}
                onChangeText={setSearch}
                onFocus={() => setModalVisible(true)}
              />
              <TouchableOpacity style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 4, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }} onPress={() => setModalVisible(true)}>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 28, fontWeight: 'bold', marginTop: -2 }}>+</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={{ width: '100%', backgroundColor: '#330000', borderRadius: 4, paddingVertical: 18, alignItems: 'center', borderWidth: 2, borderColor: theme.colors.neon, marginBottom: 0 }}>
              <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 20, fontWeight: 'bold', letterSpacing: 1.2 }}>END WORKOUT</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <ScrollView style={{ flex: 1, marginBottom: 12 }}>
            {sessionExercises.map((ex, idx) => (
              <View key={ex.id} style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 8, marginBottom: 18, padding: 12, backgroundColor: 'transparent' }}>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontWeight: 'bold', fontSize: 18, textTransform: 'lowercase', marginBottom: 8 }}>{ex.name}</Text>
                {/* Sets List */}
                {(ex.sets && ex.sets.length > 0 ? ex.sets : [{ reps: 0, weight: 0, rest: 120 }]).map((set: any, setIdx: number) => (
                  <View key={setIdx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 14, marginRight: 8 }}>SET {setIdx + 1}</Text>
                    <TextInput
                      style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 4, color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 14, width: 40, marginRight: 4, padding: 2, backgroundColor: 'transparent' }}
                      value={set.reps?.toString() || ''}
                      onChangeText={v => handleSetFieldChange(ex.id, setIdx, 'reps', v)}
                      placeholder="0"
                      placeholderTextColor={theme.colors.neon}
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 4, color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 14, width: 40, marginRight: 4, padding: 2, backgroundColor: 'transparent' }}
                      value={set.weight?.toString() || ''}
                      onChangeText={v => handleSetFieldChange(ex.id, setIdx, 'weight', v)}
                      placeholder="0"
                      placeholderTextColor={theme.colors.neon}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity onPress={() => handleToggleSetComplete(ex.id, setIdx)} style={{ marginLeft: 8 }}>
                      <Text style={{ color: set.completed ? theme.colors.success : theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 16 }}>{set.completed ? '✓' : '○'}</Text>
                    </TouchableOpacity>
                  </View>
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
              placeholder="Exercise name..."
              placeholderTextColor={theme.colors.neon}
              value={search}
              onChangeText={setSearch}
              onFocus={() => setModalVisible(true)}
            />
            <TouchableOpacity style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 4, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }} onPress={() => setModalVisible(true)}>
              <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.mono, fontSize: 28, fontWeight: 'bold', marginTop: -2 }}>+</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={{ width: '100%', backgroundColor: '#330000', borderRadius: 4, paddingVertical: 18, alignItems: 'center', borderWidth: 2, borderColor: theme.colors.neon, marginBottom: 0 }}>
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
        <View style={{ flex: 1, backgroundColor: theme.colors.background, paddingTop: 36 }}>
          <Text style={{ color: theme.colors.text, fontFamily: theme.fonts.mono, fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 }}>ADD EXERCISE</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, color: theme.colors.text, fontFamily: theme.fonts.mono, fontSize: 16, paddingVertical: 8, paddingHorizontal: 12, margin: 12, backgroundColor: theme.colors.backgroundOverlay }}
            placeholder="Search..."
            placeholderTextColor={theme.colors.text}
            value={search}
            onChangeText={setSearch}
          />
          {pickerLoading ? (
            <ActivityIndicator color={theme.colors.neon} size="large" style={{ marginTop: 32 }} />
          ) : (
            <ScrollView>
              {pickerExercises.map((ex) => (
                <TouchableOpacity key={ex.id} style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, margin: 8, padding: 12, backgroundColor: theme.colors.backgroundOverlay }} onPress={() => handleAddExerciseFromPicker(ex)}>
                  <Text style={{ color: theme.colors.text, fontFamily: theme.fonts.mono, fontSize: 16 }}>{ex.name}</Text>
                  <Text style={{ color: theme.colors.text, fontFamily: theme.fonts.mono, fontSize: 12, opacity: 0.7 }}>{ex.category} | {ex.muscle_group}</Text>
                </TouchableOpacity>
              ))}
              {pickerExercises.length === 0 && (
                <Text style={{ color: theme.colors.text, fontFamily: theme.fonts.mono, fontSize: 16, textAlign: 'center', marginTop: 24 }}>No exercises found.</Text>
              )}
            </ScrollView>
          )}
          <TouchableOpacity style={{ alignSelf: 'center', margin: 18 }} onPress={() => setModalVisible(false)}>
            <Text style={{ color: theme.colors.text, fontFamily: theme.fonts.mono, fontSize: 16 }}>CLOSE</Text>
          </TouchableOpacity>
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