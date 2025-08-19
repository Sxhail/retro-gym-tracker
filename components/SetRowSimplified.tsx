import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useWorkoutSession } from '../context/WorkoutSessionContext';
import { getPreviousSetForExerciseSetNumber } from '../services/workoutHistory';

// --- Simplified SetRow component using only global rest timer ---
export function SetRowSimplified({ set, setIdx, exerciseId, handleSetFieldChange, handleToggleSetComplete, handleRemoveSet, theme, isLastCompleted }: any) {
  // Only allow marking as complete if both KG and REPS are positive numbers
  const canComplete = !!set.weight && !!set.reps && Number(set.weight) > 0 && Number(set.reps) > 0;

  // Access global rest timer for display
  const { globalRestTimer, setGlobalRestTimer } = useWorkoutSession();
  
  // Previous set state
  const [previousSet, setPreviousSet] = useState<{ weight: number, reps: number } | null>(null);

  // Load previous set data
  useEffect(() => {
    let mounted = true;
    getPreviousSetForExerciseSetNumber(exerciseId, setIdx + 1)
      .then(data => { if (mounted) setPreviousSet(data); });
    return () => { mounted = false; };
  }, [exerciseId, setIdx]);

  // Skip global rest timer
  const skipTimer = () => {
    setGlobalRestTimer(null);
  };

  // Format rest timer mm:ss
  function formatRestTimer(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // Only show rest timer for the matching global timer and when it's the most recently completed set
  const showRestTimer = globalRestTimer?.isActive && 
    globalRestTimer.exerciseId === exerciseId && 
    globalRestTimer.setIdx === setIdx && 
    isLastCompleted;

  // Get rest time from global timer or default
  const displayRestTime = showRestTimer ? globalRestTimer.timeRemaining : (set.rest ?? 120);

  // Render right action for swipe-to-delete
  const renderRightActions = () => (
    <View style={{ width: 9999, backgroundColor: 'transparent' }} />
  );

  return (
    <>
      <Swipeable
        renderRightActions={renderRightActions}
        onSwipeableRightOpen={() => handleRemoveSet(exerciseId, setIdx)}
        overshootRight={false}
        rightThreshold={40}
        friction={2}
      >
        <View
          style={{
            flexDirection: 'column',
            alignItems: 'stretch',
            marginBottom: 10,
            padding: 6,
            borderRadius: 6,
            backgroundColor: 'rgba(0,255,0,0.05)',
            justifyContent: 'flex-start',
          }}
        >
          {/* Set Number and Previous Set Info */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text, marginRight: 8 }}>
              Set {setIdx + 1}
            </Text>
            {previousSet && (
              <Text style={{ fontSize: 12, color: theme.subText, fontStyle: 'italic' }}>
                Last: {previousSet.weight}kg × {previousSet.reps}
              </Text>
            )}
          </View>

          {/* Weight and Reps Input Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={{ fontSize: 12, color: theme.subText, marginBottom: 2 }}>Weight (kg)</Text>
              <TextInput
                style={{
                  backgroundColor: theme.inputBackground,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  fontSize: 16,
                  color: theme.text,
                  textAlign: 'center',
                }}
                value={String(set.weight || '')}
                onChangeText={(text) => handleSetFieldChange(exerciseId, setIdx, 'weight', text)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.subText}
              />
            </View>

            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={{ fontSize: 12, color: theme.subText, marginBottom: 2 }}>Reps</Text>
              <TextInput
                style={{
                  backgroundColor: theme.inputBackground,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  fontSize: 16,
                  color: theme.text,
                  textAlign: 'center',
                }}
                value={String(set.reps || '')}
                onChangeText={(text) => handleSetFieldChange(exerciseId, setIdx, 'reps', text)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.subText}
              />
            </View>

            {/* Complete Button */}
            <TouchableOpacity
              style={{
                backgroundColor: set.completed ? theme.success : (canComplete ? theme.primary : theme.disabled),
                borderRadius: 6,
                paddingVertical: 8,
                paddingHorizontal: 12,
                opacity: canComplete ? 1 : 0.5,
              }}
              onPress={() => canComplete && handleToggleSetComplete(exerciseId, setIdx)}
              disabled={!canComplete}
            >
              <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
                {set.completed ? '✓' : '○'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Rest Timer Display */}
          {showRestTimer && (
            <View style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 8,
              backgroundColor: theme.cardBackground,
              borderWidth: 2,
              borderColor: theme.primary,
              alignItems: 'center',
            }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.primary, marginBottom: 4 }}>
                Rest Timer
              </Text>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.text, marginBottom: 8 }}>
                {formatRestTimer(displayRestTime)}
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: theme.danger,
                  borderRadius: 6,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                }}
                onPress={skipTimer}
              >
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>Skip Timer</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Swipeable>
    </>
  );
}
