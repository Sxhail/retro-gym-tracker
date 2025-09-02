import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator, PanResponder, Animated, SafeAreaView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import theme from '../styles/theme';
import { dbOperations } from '../services/database';
import * as schema from '../db/schema';
import { useWorkoutSession } from '../context/WorkoutSessionContext';
import ExerciseCard from '../components/ExerciseCard';
import { backgroundSessionService } from '../services/backgroundSession';
import { BottomNav } from '../components/BottomNav';

import { getExerciseMaxWeights, getPreviousSetForExerciseSetNumber } from '../services/workoutHistory';
import { Swipeable } from 'react-native-gesture-handler';
import PostSessionReportModal from '../components/Report/PostSessionReportModal';
// Removed PostSessionReportModal and related sharing/print imports

export type Exercise = typeof schema.exercises.$inferSelect;

// --- SetRow component for swipe-to-remove ---
function SetRow({ set, setIdx, exerciseId, handleSetFieldChange, handleSetRestChange, handleToggleSetComplete, handleRemoveSet, theme, isLastCompleted }: any) {
  // Remove PanResponder and Animated pan logic

  // Only allow marking as complete if both KG and REPS are positive numbers
  // Allow weight to be 0, but reps must be > 0. Blank weight is not allowed.
  const hasWeightValue = set.weight !== '' && set.weight !== null && set.weight !== undefined;
  const canComplete = hasWeightValue && Number(set.weight) >= 0 && Number(set.reps) > 0;

  // Rest timer state (per set) - timestamp-based for background persistence
  const [restTime, setRestTime] = useState(set.restDuration ?? 120);
  const [restActive, setRestActive] = useState(false);
  const [timerPaused, setTimerPaused] = useState(false);
  const restInterval = useRef<any>(null);
  // Track previous completed state to avoid auto-restarting timer on remount/navigation
  const prevCompletedRef = useRef<boolean>(set.completed);
  
  // Background-persistent timer state (like main workout timer)
  const [restStartTime, setRestStartTime] = useState<Date | null>(null);
  const [restLastResumeTime, setRestLastResumeTime] = useState<Date | null>(null);
  const [restAccumulatedTime, setRestAccumulatedTime] = useState<number>(0);
  
  // Rest timer persistence (using session ID from main workout)
  const restTimerIdRef = useRef<string | null>(null);
  const sessionWorkout = useWorkoutSession(); // Access session for persistence
  
  // Generate unique rest timer ID for this set
  const getRestTimerId = () => {
    if (!restTimerIdRef.current) {
      // Use session start time to create consistent session-based ID
      const sessionTime = sessionWorkout.sessionStartTime?.getTime() || Date.now();
      restTimerIdRef.current = `rest_${sessionTime}_${exerciseId}_${setIdx}`;
    }
    return restTimerIdRef.current;
  };
  
  // Save rest timer state to background storage
  const saveRestTimerState = async () => {
    if (!sessionWorkout.isWorkoutActive || !restActive) return;
    
    try {
      const timerId = getRestTimerId();
      const saveTime = new Date();
      let resumeTime: Date;
      let accumulatedTimeOnly: number;
      
      if (timerPaused) {
        // If paused, save current accumulated time
        resumeTime = saveTime;
        accumulatedTimeOnly = restAccumulatedTime;
      } else {
        // If active, save when current segment started and accumulated time
        if (restLastResumeTime) {
          resumeTime = restLastResumeTime;
          accumulatedTimeOnly = restAccumulatedTime;
        } else {
          resumeTime = restStartTime || saveTime;
          accumulatedTimeOnly = 0;
        }
      }
      
      await backgroundSessionService.saveTimerState({
        sessionId: timerId,
        timerType: 'rest',
        startTime: resumeTime,
        duration: Number(set.restDuration ?? 120),
        elapsedWhenPaused: accumulatedTimeOnly,
        isActive: !timerPaused,
      });
      
      console.log('🔄 Rest timer state saved for set', setIdx, exerciseId);
    } catch (error) {
      console.error('Failed to save rest timer state:', error);
    }
  };
  
  // Restore rest timer state from background storage
  const restoreRestTimerState = async () => {
    if (!sessionWorkout.isWorkoutActive) return;
    
    try {
      const timerId = getRestTimerId();
      const timerState = await backgroundSessionService.restoreTimerState(timerId, 'rest');
      
      if (timerState) {
        const now = new Date();
        const totalElapsed = timerState.elapsedWhenPaused;
  const totalRestDuration = Number(set.restDuration ?? 120);
        const remaining = Math.max(0, totalRestDuration - totalElapsed);
        
        // If timer was still active and hasn't finished
        if (remaining > 0) {
          setRestActive(true);
          setRestStartTime(timerState.startTime);
          setRestLastResumeTime(timerState.isActive ? timerState.startTime : null);
          setRestAccumulatedTime(timerState.elapsedWhenPaused);
          setRestTime(remaining);
          setTimerPaused(!timerState.isActive);
          
          console.log('🔄 Rest timer state restored for set', setIdx, exerciseId, '- remaining:', remaining, 's');
        }
      }
    } catch (error) {
      console.error('Failed to restore rest timer state:', error);
    }
  };
  
  // Clear rest timer state from background storage
  const clearRestTimerState = async () => {
    try {
      const timerId = getRestTimerId();
      await backgroundSessionService.clearSessionData(timerId);
      console.log('🧹 Rest timer state cleared for set', setIdx, exerciseId);
    } catch (error) {
      console.error('Failed to clear rest timer state:', error);
    }
  };

  // Previous set state
  const [previousSet, setPreviousSet] = useState<{ weight: number, reps: number } | null>(null);

  // Restore rest timer state on component mount
  useEffect(() => {
    restoreRestTimerState();
  }, [sessionWorkout.isWorkoutActive]);

  // Sync local timer display with global rest timer - strict match with exerciseId/setIdx
  useEffect(() => {
    const globalTimer = sessionWorkout.globalRestTimer;
    if (globalTimer && globalTimer.isActive && globalTimer.startTime) {
      // Only treat this row as the owner if BOTH exerciseId and setIdx match the global timer
      const isTimerForThisSet = (globalTimer.exerciseId === exerciseId && globalTimer.setIdx === setIdx);
      
      if (isTimerForThisSet && set.completed) {
        console.log('🔄 Attempting to sync local timer with global timer for set', setIdx, 'of exercise', exerciseId);
        
        // Calculate current remaining time based on global timer's start time
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - globalTimer.startTime.getTime()) / 1000);
        const remaining = Math.max(0, globalTimer.originalDuration - elapsed);
        
        // Sync all local timer state to match global timer
        setRestTime(remaining);
        setRestActive(true);  // Ensure local timer shows as active
        setRestStartTime(globalTimer.startTime);
        setRestLastResumeTime(globalTimer.startTime);
        setRestAccumulatedTime(0); // Reset since we're using global timer's timestamp
        setTimerPaused(false); // Ensure timer is not paused
        
        console.log('🔄 Local timer synced with global timer:', remaining, 's remaining');
    } else if (restActive && (!isTimerForThisSet || !set.completed)) {
        // If this set's timer was active but it's not the one the global timer belongs to, stop local timer
        setRestActive(false);
        setRestStartTime(null);
        setRestLastResumeTime(null);
        setRestAccumulatedTime(0);
        setRestTime(Number(set.restDuration ?? 120));
        setTimerPaused(false);
        console.log('🛑 Local timer stopped - global timer belongs to different set');
      }
    } else if (restActive && (!globalTimer || !globalTimer.isActive)) {
      // No global timer active but local timer is - stop local timer
      setRestActive(false);
      setRestStartTime(null);
      setRestLastResumeTime(null);
      setRestAccumulatedTime(0);
      setRestTime(Number(set.restDuration ?? 120));
      setTimerPaused(false);
      console.log('� Local timer stopped - no global timer active');
    }
  }, [sessionWorkout.globalRestTimer, sessionWorkout.globalRestTimer?.timeRemaining, exerciseId, setIdx, set.restDuration, set.completed]);

  // Cleanup rest timer state when component unmounts or set is no longer completed
  useEffect(() => {
    return () => {
      // Clear background state if rest timer is no longer needed
      if (!set.completed) {
        clearRestTimerState();
      }
    };
  }, [set.completed]);

  useEffect(() => {
    let mounted = true;
    getPreviousSetForExerciseSetNumber(exerciseId, setIdx + 1)
      .then(data => { if (mounted) setPreviousSet(data); });
    return () => { mounted = false; };
  }, [exerciseId, setIdx]);

  // Update rest duration handler
  const handleRestChange = async (delta: number) => {
    const prevTotal = Number(set.restDuration ?? 120);
    const newTotal = Math.max(15, Math.min(prevTotal + delta, 600));
    // Update session exercise model
    handleSetRestChange(exerciseId, setIdx, delta);

    // If this set owns the global timer, adjust it and reschedule notification
    const grt = sessionWorkout.globalRestTimer;
    if (grt && grt.isActive && grt.exerciseId === exerciseId && grt.setIdx === setIdx && grt.startTime) {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - grt.startTime.getTime()) / 1000);
      const newRemaining = Math.max(0, newTotal - elapsed);

      // Update global timer immediately
      sessionWorkout.setGlobalRestTimer({
        ...grt,
        originalDuration: newTotal,
        timeRemaining: newRemaining,
      });
      setRestTime(newRemaining);

      // Reschedule notification using the new service
      try {
        const { liftRestNotificationService } = await import('../services/liftRestNotifications');
        if (sessionWorkout.restNotificationSessionId) {
          await liftRestNotificationService.cancelRestNotification(sessionWorkout.restNotificationSessionId);
          sessionWorkout.setRestNotificationSessionId(null);
        }
        if (newRemaining > 0) {
          const newFireAt = new Date(now.getTime() + newRemaining * 1000);
          const sessionId = `lift-rest-${exerciseId}-${setIdx}-${grt.startTime.getTime()}`;
          
          await liftRestNotificationService.scheduleRestNotification({
            sessionId,
            exerciseId,
            setIdx,
            duration: newTotal,
            startTime: grt.startTime,
            fireAt: newFireAt,
          });
          
          sessionWorkout.setRestNotificationSessionId(sessionId);
        }
      } catch (e) {
        console.warn('Failed to reschedule rest notification:', e);
      }

      // If time reduced to zero or below, end timer
      if (newRemaining <= 0) {
        sessionWorkout.setGlobalRestTimer(null);
      }
    } else if (restActive) {
      // Local-only safety update
      setRestTime(newTotal);
    }
  };
  

  // Handle rest timer pause/resume (timestamp-based)
  const toggleTimerPause = () => {
    if (restActive) {
      if (timerPaused) {
        // Resume timer
        const now = new Date();
        setRestLastResumeTime(now);
        setTimerPaused(false);
      } else {
        // Pause timer - save accumulated time
        if (restLastResumeTime) {
          const now = new Date();
          const currentSegmentElapsed = Math.floor((now.getTime() - restLastResumeTime.getTime()) / 1000);
          const newAccumulated = restAccumulatedTime + currentSegmentElapsed;
          setRestAccumulatedTime(newAccumulated);
          
          // Update display to show current remaining time
          const totalRestDuration = Number(set.restDuration ?? 120);
          const remaining = Math.max(0, totalRestDuration - newAccumulated);
          setRestTime(remaining);
        }
        setTimerPaused(true);
        setRestLastResumeTime(null);
      }
    }
  };

  // Handle rest timer skip (timestamp-based)
  const skipTimer = () => {
    // Stop global rest timer
    sessionWorkout.setGlobalRestTimer(null);
    
    // Reset local state
    setRestActive(false);
    setRestStartTime(null);
    setRestLastResumeTime(null);
    setRestAccumulatedTime(0);
  setRestTime(Number(set.restDuration ?? 120));
    setTimerPaused(false);
    // Clear background state when timer is skipped
    clearRestTimerState();
    // Cancel rest notifications using the new service
    (async () => {
      try {
        const { liftRestNotificationService } = await import('../services/liftRestNotifications');
        if (sessionWorkout.restNotificationSessionId) {
          await liftRestNotificationService.cancelRestNotification(sessionWorkout.restNotificationSessionId);
          sessionWorkout.setRestNotificationSessionId(null);
        }
      } catch (e) {
        console.warn('Failed to cancel rest notification:', e);
      }
    })();
  };

  // Background-persistent rest timer (timestamp-based like main workout timer)
  useEffect(() => {
    // This effect is now handled by the global rest timer in WorkoutSessionContext
    // Keep this for any local display updates if needed
    return () => {
      if (restInterval.current) {
        clearInterval(restInterval.current);
        restInterval.current = null;
      }
    };
  }, []);

  // Start/stop rest timer only on completion state transition (false -> true / true -> false)
  useEffect(() => {
    const prevCompleted = prevCompletedRef.current;
    prevCompletedRef.current = set.completed;

    // Start only when toggled to completed, not on initial mount or rerenders
    if (!prevCompleted && set.completed && canComplete) {
      // If another rest timer is already active, don't start a new one
      if (sessionWorkout.globalRestTimer?.isActive) {
        return;
      }

      const now = new Date();
  const totalRestDuration = Number(set.restDuration ?? 120);

      sessionWorkout.setGlobalRestTimer({
        isActive: true,
        timeRemaining: totalRestDuration,
        originalDuration: totalRestDuration,
        exerciseId,
        setIdx,
        startTime: now,
      });

      // Local state for display
      setRestActive(true);
      setRestStartTime(now);
      setRestLastResumeTime(now);
      setRestAccumulatedTime(0);
      setRestTime(totalRestDuration);
      setTimerPaused(false);
      return;
    }

    // Stop only when toggled to not completed
    if (prevCompleted && !set.completed) {
      sessionWorkout.setGlobalRestTimer(null);
      setRestActive(false);
      setRestStartTime(null);
      setRestLastResumeTime(null);
      setRestAccumulatedTime(0);
  setRestTime(Number(set.restDuration ?? 120));
      setTimerPaused(false);
      clearRestTimerState();
    }
  }, [set.completed, canComplete, set.restDuration, sessionWorkout.globalRestTimer?.isActive]);

  // Format rest timer mm:ss or hh:mm:ss
  function formatRestTimer(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    } else {
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
  }

  // Show rest timer based on global rest timer state only (don't depend on local restActive)
  const showRestTimer = (
    sessionWorkout.globalRestTimer?.isActive &&
    sessionWorkout.globalRestTimer.exerciseId === exerciseId &&
    sessionWorkout.globalRestTimer.setIdx === setIdx &&
    sessionWorkout.globalRestTimer.timeRemaining > 0
  );

  // Render right action for swipe-to-delete (transparent, allows row to slide left)
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
          <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 14, minWidth: 48, marginBottom: 4, alignSelf: 'flex-start' }}>SET {setIdx + 1}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', flex: 1, justifyContent: 'flex-end' }}>
            {/* Previous set box */}
              <View style={{ alignItems: 'center', marginRight: 16, alignSelf: 'flex-end' }}>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 13, marginBottom: 2 }}>PREV</Text>
                <View style={{ borderRadius: 6, paddingHorizontal: 4, paddingVertical: 2, minWidth: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,255,0,0.08)' }}>
                  <Text style={{ color: theme.colors.neonBright, fontFamily: theme.fonts.heading, fontSize: 12 }}>
                  {previousSet ? `${previousSet.weight} kg x ${previousSet.reps} reps` : '--'}
                </Text>
              </View>
            </View>
              {/* KG label and input */}
              <View style={{ alignItems: 'center', marginRight: 6 }}>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 14, marginBottom: 2 }}>KG</Text>
                <TextInput
                  style={{ borderRadius: 4, color: theme.colors.neon, fontFamily: theme.fonts.heading, fontSize: 18, width: 80, padding: 2, backgroundColor: 'rgba(0, 255, 0, 0.05)', textAlign: 'center' }}
                  value={(set.weight !== undefined && set.weight !== null && set.weight !== '') ? String(set.weight) : ''}
                  onChangeText={v => handleSetFieldChange(exerciseId, setIdx, 'weight', v)}
                  placeholder=""
                  placeholderTextColor={theme.colors.neon}
                  keyboardType="decimal-pad"
                />
              </View>
              {/* REPS label and input */}
              <View style={{ alignItems: 'center', marginRight: 6 }}>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 14, marginBottom: 2 }}>REPS</Text>
                <TextInput
                  style={{ borderRadius: 4, color: theme.colors.neon, fontFamily: theme.fonts.heading, fontSize: 18, width: 80, padding: 2, backgroundColor: 'rgba(0, 255, 0, 0.05)', textAlign: 'center' }}
                  value={set.reps && set.reps > 0 ? set.reps.toString() : ''}
                  onChangeText={v => handleSetFieldChange(exerciseId, setIdx, 'reps', v)}
                  placeholder=""
                  placeholderTextColor={theme.colors.neon}
                  keyboardType="numeric"
                />
              </View>
              {/* Done toggle */}
              <TouchableOpacity
                onPress={() => canComplete && handleToggleSetComplete(exerciseId, setIdx)}
                style={{ marginLeft: 8 }}
                disabled={!canComplete}
              >
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 3,
                  borderWidth: 2,
                  borderColor: canComplete
                    ? (set.completed ? theme.colors.neon : theme.colors.neon)
                    : '#444',
                  backgroundColor: set.completed && canComplete 
                    ? theme.colors.neon
                    : 'transparent',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Swipeable>
      {/* Rest timer below set row */}
      {showRestTimer && (
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          {/* Timer controls row 1: Time adjustment */}
          <View style={{ flexDirection: 'row', alignItems: 'center', opacity: 0.8, marginBottom: 8 }}>
            {/* Minus button */}
            <TouchableOpacity onPress={() => handleRestChange(-15)} style={{ 
              width: 32, 
              height: 32, 
              borderRadius: 16, 
              borderWidth: 1, 
              borderColor: 'rgba(0, 255, 0, 0.3)', 
              justifyContent: 'center', 
              alignItems: 'center',
              marginRight: 8
            }}>
              <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 18, fontWeight: 'bold' }}>-</Text>
            </TouchableOpacity>
            
            {/* Connecting line */}
            <View style={{ width: 20, height: 2, backgroundColor: theme.colors.neon, marginRight: 8 }} />
            
            {/* Timer display */}
            <Text style={{ color: timerPaused ? '#FFA500' : theme.colors.neon, fontFamily: theme.fonts.heading, fontSize: 20, fontWeight: 'bold', letterSpacing: 1.2 }}>
              {formatRestTimer(sessionWorkout.globalRestTimer?.timeRemaining || 0)}
            </Text>
            
            {/* Connecting line */}
            <View style={{ width: 20, height: 2, backgroundColor: theme.colors.neon, marginLeft: 8 }} />
            
            {/* Plus button */}
            <TouchableOpacity onPress={() => handleRestChange(15)} style={{ 
              width: 32, 
              height: 32, 
              borderRadius: 16, 
              borderWidth: 1, 
              borderColor: 'rgba(0, 255, 0, 0.3)', 
              justifyContent: 'center', 
              alignItems: 'center',
              marginLeft: 8
            }}>
              <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 18, fontWeight: 'bold' }}>+</Text>
            </TouchableOpacity>
          </View>
          
          {/* Timer controls - inline with timer */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 8 }}>
            {/* Skip button */}
            <TouchableOpacity onPress={skipTimer} style={{ 
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6, 
              borderWidth: 1, 
              borderColor: '#FF4444', 
              backgroundColor: 'transparent',
              justifyContent: 'center', 
              alignItems: 'center',
            }}>
              <Text style={{ color: '#FF4444', fontFamily: theme.fonts.code, fontSize: 10, fontWeight: 'bold' }}>
                SKIP
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
}

export default function NewWorkoutScreen() {
  const [exercise, setExercise] = useState('');
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [pickerExercises, setPickerExercises] = useState<Exercise[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('All');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('A-Z');
  const router = useRouter();
  const { templateId } = useLocalSearchParams<{ templateId?: string }>();
  const [workoutDate, setWorkoutDate] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportWorkoutId, setReportWorkoutId] = useState<number | null>(null);

  // Add state for custom exercise modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newMuscleGroups, setNewMuscleGroups] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [adding, setAdding] = useState(false);
  const [maxWeights, setMaxWeights] = useState<Record<number, { weight: number; reps: number }>>({});

  const MUSCLE_GROUP_OPTIONS = [
    'Chest', 'Back', 'Legs', 'Glutes', 'Shoulders', 'Triceps', 'Biceps', 'Core', 'Arms'
  ];
  const CATEGORY_OPTIONS = [
    'Barbell', 'Dumbbell', 'Machine', 'Smith Machine', 'Bodyweight', 'Cable', 'Trap Bar', 'Kettlebell', 'Band', 'Other'
  ];

  // Use workout session context
  const {
    currentExercises: sessionExercises,
    setCurrentExercises,
    workoutName,
    setWorkoutName,
    sessionStartTime,
    isWorkoutActive,
    elapsedTime,
    isPaused,
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    endWorkout,
    saveWorkout,
    resetSession,
    globalRestTimer,
  setGlobalRestTimer,
  restNotificationSessionId,
  setRestNotificationSessionId
  } = useWorkoutSession();

  // Fetch max weights for exercises
  useEffect(() => {
    getExerciseMaxWeights().then(setMaxWeights);
  }, []);

  // Focus effect to sync rest timer when user returns to workout screen
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Workout screen focused - syncing rest timer state...');
      
      // If there's a global rest timer active, ensure local timer state syncs
      if (globalRestTimer?.isActive && globalRestTimer.startTime) {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - globalRestTimer.startTime.getTime()) / 1000);
        const remaining = Math.max(0, globalRestTimer.originalDuration - elapsed);
        
        // Update global rest timer's timeRemaining to current calculated value
        setGlobalRestTimer({
          ...globalRestTimer,
          timeRemaining: remaining
        });
        
        console.log('🔄 Global rest timer synced on screen focus:', remaining, 's remaining');
      }
    }, [globalRestTimer?.isActive, globalRestTimer?.startTime, globalRestTimer?.originalDuration, globalRestTimer?.exerciseId, globalRestTimer?.setIdx, setGlobalRestTimer])
  );

  // Load exercises for modal (search-aware with filters)
  useEffect(() => {
    let isActive = true;
    setPickerLoading(true);
    const fetch = search.trim()
      ? dbOperations.getExercises().then(results => results.filter(ex => 
          ex.name.toLowerCase().includes(search.trim().toLowerCase()) ||
          ex.muscle_group?.toLowerCase().includes(search.trim().toLowerCase()) ||
          ex.category?.toLowerCase().includes(search.trim().toLowerCase())
        ))
      : dbOperations.getExercises();
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
        // CRITICAL: Clear any existing rest timer when adding a new exercise
        // This prevents old rest timers from interfering with the new exercise
        if (globalRestTimer?.isActive) {
          console.log('🧹 Clearing existing rest timer when adding new exercise');
          setGlobalRestTimer(null);
          
          // Also clear background storage immediately
          setTimeout(async () => {
            try {
              const { backgroundSessionService } = await import('../services/backgroundSession');
              const { db } = await import('../db/client');
              const { active_session_timers } = await import('../db/schema');
              const { eq } = await import('drizzle-orm');
              
              // Clear all active rest timers from background storage
              const restTimers = await db
                .select()
                .from(active_session_timers)
                .where(eq(active_session_timers.timer_type, 'rest'));
              
              for (const timer of restTimers) {
                await backgroundSessionService.clearTimerData(timer.session_id, 'rest');
              }
              
              if (restTimers.length > 0) {
                console.log('🧹 Cleared', restTimers.length, 'rest timers from background when adding new exercise');
              }
            } catch (error) {
              console.error('Failed to clear rest timer background data when adding exercise:', error);
            }
          }, 100);
        }
        
        setCurrentExercises([
          ...sessionExercises,
          { 
            ...ex, 
            sets: [
              { reps: 0, weight: '', completed: false, restDuration: 120 },
              { reps: 0, weight: '', completed: false, restDuration: 120 },
              { reps: 0, weight: '', completed: false, restDuration: 120 }
            ],
          }
        ]);
      }
      setModalVisible(false);
      // Start workout timer when first exercise is added
      if (!isWorkoutActive) {
        startWorkout();
      }
    } catch (err) {
      console.error('Error adding exercise:', err);
    } finally {
      setPickerLoading(false);
    }
  };

  // Remove exercise from session
  const handleRemoveExercise = (exerciseId: number) => {
    setCurrentExercises(sessionExercises.filter((ex) => ex.id !== exerciseId));
  };

  // Add helper to format seconds as mm:ss
  function formatRest(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // Add set to an exercise
  const handleAddSet = (exerciseId: number) => {
    setCurrentExercises(sessionExercises.map((ex) => {
      if (ex.id === exerciseId) {
        const currentSets = ex.sets || [];
        const deletedSets = (ex as any).deletedSets || [];
        
        if (deletedSets.length > 0) {
          // Restore the first deleted set
          const setToRestore = deletedSets[0];
          const remainingDeletedSets = deletedSets.slice(1);
          
          return {
            ...ex,
            sets: [...currentSets, setToRestore],
            deletedSets: remainingDeletedSets.length > 0 ? remainingDeletedSets : undefined
          };
        } else {
          // No deleted sets to restore, create a new one
          const lastRest = currentSets.length > 0 ? currentSets[currentSets.length - 1].restDuration ?? 120 : 120;
          const newSet = { reps: 0, weight: '', completed: false, restDuration: lastRest };
          return { ...ex, sets: [...currentSets, newSet] };
        }
      }
      return ex;
    }));
  };

  // Toggle set completion
  const handleToggleSetComplete = async (exerciseId: number, setIdx: number) => {
    const updatedExercises = sessionExercises.map((ex) => {
      if (ex.id === exerciseId) {
        const currentSets = ex.sets || [];
        if (setIdx >= 0 && setIdx < currentSets.length) {
          const updatedSets = currentSets.map((set: any, idx: number) =>
            idx === setIdx ? { ...set, completed: !set.completed } : set
          );
          return { ...ex, sets: updatedSets };
        }
      }
      return ex;
    });
    
    // Check if set is being completed and start global rest timer
    const targetExercise = updatedExercises.find(ex => ex.id === exerciseId);
    if (targetExercise) {
      const targetSet = targetExercise.sets?.[setIdx];
      if (targetSet && !targetSet.completed) {  // If it's being completed now
        
        // CRITICAL FIX: Clean up any existing rest timers before starting new one
        try {
          // 1. Clear any existing global rest timer first
          setGlobalRestTimer(null);
          
          // 2. Clean up all existing rest timer background data to prevent conflicts
          const { db } = await import('../db/client');
          const { active_session_timers } = await import('../db/schema');
          const { eq } = await import('drizzle-orm');
          
          // Get all existing rest timers
          const existingRestTimers = await db
            .select()
            .from(active_session_timers)
            .where(eq(active_session_timers.timer_type, 'rest'));
          
          // Clean them all up
          for (const timer of existingRestTimers) {
            await backgroundSessionService.clearTimerData(timer.session_id, 'rest');
          }
          
          console.log('🧹 Cleaned up', existingRestTimers.length, 'existing rest timers before starting new one');
          
          // Small delay to ensure cleanup is complete
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.error('Failed to cleanup existing rest timers:', error);
        }
        
        // 3. Now start the new global rest timer
        const restDuration = targetSet.restDuration || 120;
        const now = new Date();
        
        setGlobalRestTimer({
          isActive: true,
          timeRemaining: restDuration,
          originalDuration: restDuration,
          exerciseId,
          setIdx,
          startTime: now,
        });
        
        console.log('🏃 Started new global rest timer:', restDuration, 'seconds for exercise', exerciseId, 'set', setIdx + 1);

        // Schedule rest completion notification using the new service
        try {
          const { liftRestNotificationService } = await import('../services/liftRestNotifications');
          const sessionId = `lift-rest-${exerciseId}-${setIdx}-${now.getTime()}`;
          const fireAt = new Date(now.getTime() + restDuration * 1000);
          
          await liftRestNotificationService.scheduleRestNotification({
            sessionId,
            exerciseId,
            setIdx,
            duration: restDuration,
            startTime: now,
            fireAt,
          });
          
          setRestNotificationSessionId(sessionId);
        } catch (e) {
          console.warn('Failed to schedule rest completion notification:', e);
        }
      } else if (targetSet && targetSet.completed) {  // If it's being uncompleted
        // Stop global rest timer and cleanup
        setGlobalRestTimer(null);
        
        // Cancel the scheduled rest notification using the new service
        try {
          const { liftRestNotificationService } = await import('../services/liftRestNotifications');
          if (restNotificationSessionId) {
            await liftRestNotificationService.cancelRestNotification(restNotificationSessionId);
            setRestNotificationSessionId(null);
          }
        } catch (e) {
          console.warn('Failed to cancel rest notification:', e);
        }
        
        // Also cleanup background timer data for this specific timer
        try {
          const { db } = await import('../db/client');
          const { active_session_timers } = await import('../db/schema');
          const { eq } = await import('drizzle-orm');
          
          const existingRestTimers = await db
            .select()
            .from(active_session_timers)
            .where(eq(active_session_timers.timer_type, 'rest'));
          
          for (const timer of existingRestTimers) {
            await backgroundSessionService.clearTimerData(timer.session_id, 'rest');
          }
        } catch (error) {
          console.error('Failed to cleanup rest timer on uncomplete:', error);
        }
        
        console.log('⏹️ Stopped global rest timer');
      }
    }
    
    setCurrentExercises(updatedExercises);
  };

  // Update handleSetFieldChange to support 'notes' field
  const handleSetFieldChange = (exerciseId: number, setIdx: number, field: 'weight' | 'reps' | 'notes', value: string) => {
    setCurrentExercises(sessionExercises.map((ex) => {
      if (ex.id === exerciseId) {
        const currentSets = ex.sets || [];
        if (setIdx >= 0 && setIdx < currentSets.length) {
          const updatedSets = currentSets.map((set: any, idx: number) => {
            if (idx === setIdx) {
              let processedValue = value;
              if (field === 'notes') {
                processedValue = value;
              } else if (field === 'weight') {
                // Allow decimals for weight (numbers and one decimal point)
                processedValue = value.replace(/[^0-9.]/g, '');
                // Ensure only one decimal point
                const parts = processedValue.split('.');
                if (parts.length > 2) {
                  processedValue = parts[0] + '.' + parts.slice(1).join('');
                }
              } else {
                // For reps, only allow integers
                processedValue = value.replace(/[^0-9]/g, '');
              }
              return { ...set, [field]: processedValue };
            }
            return set;
          });
          return { ...ex, sets: updatedSets };
        }
      }
      return ex;
    }));
  };

  // Add handler to update rest
  const handleSetRestChange = async (exerciseId: number, setIdx: number, delta: number) => {
    // 1) Update state model
    setCurrentExercises(sessionExercises.map((ex) => {
      if (ex.id === exerciseId) {
        const currentSets = ex.sets || [];
        if (setIdx >= 0 && setIdx < currentSets.length) {
          const updatedSets = currentSets.map((set: any, idx: number) =>
            idx === setIdx ? { ...set, restDuration: Math.max(0, (set.restDuration ?? 120) + delta) } : set
          );
          return { ...ex, sets: updatedSets };
        }
      }
      return ex;
    }));
  };

  // Add handler to remove a set from an exercise
  const handleRemoveSet = (exerciseId: number, setIdx: number) => {
    setCurrentExercises(sessionExercises.map((ex) => {
      if (ex.id === exerciseId) {
        const currentSets = ex.sets || [];
        // Don't allow removing if only 1 set remains
        if (currentSets.length <= 1) {
          Alert.alert('Cannot Remove', 'Each exercise must have at least one set.');
          return ex;
        }
        
        // Store deleted sets for potential restoration
        const deletedSets = currentSets.slice(setIdx);
        
        // Store deleted sets in exercise metadata for restoration
        const exerciseWithDeletedSets = {
          ...ex,
          sets: currentSets.slice(0, setIdx), // Keep only sets before the deleted one
          deletedSets: deletedSets // Store deleted sets for restoration
        };
        
        return exerciseWithDeletedSets;
      }
      return ex;
    }));
  };

  // Start workout and set date when first exercise is added
  useEffect(() => {
    if (sessionExercises.length > 0 && !isWorkoutActive) {
      // Start timer; context now runs an immediate tick
      startWorkout();
      // Set the workout date to today
      const now = new Date();
      const formatted = `${now.getFullYear()}.${(now.getMonth()+1).toString().padStart(2, '0')}.${now.getDate().toString().padStart(2, '0')}`;
      setWorkoutDate(formatted);
    }
    // Keep workout active even if all exercises are removed
    // Only reset if workout is explicitly cancelled
  }, [sessionExercises.length, isWorkoutActive]);

  // Format timer mm:ss
  function formatElapsed(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    } else {
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
  }

  // When modal closes, always clear loading
  useEffect(() => {
    if (!modalVisible) {
      setPickerLoading(false);
    }
  }, [modalVisible]);



  // Initialize workout name with next number when component loads
  useEffect(() => {
    const initializeWorkoutName = async () => {
      // Small delay to ensure database is ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        // Only reset session if there are no exercises (not loading from template)
        if (sessionExercises.length === 0) {
          await resetSession();
          
          const { getNextWorkoutNumber } = await import('../services/workoutHistory');
          const nextNumber = await getNextWorkoutNumber();
          const newWorkoutName = `LIFT ${nextNumber}`;
          setWorkoutName(newWorkoutName);
          console.log('Setting workout name to:', newWorkoutName);
          

        } else {
          console.log('Session has exercises, skipping reset');
        }
      } catch (error) {
        console.error('Error initializing workout name:', error);
        if (sessionExercises.length === 0) {
          setWorkoutName('LIFT 1');
        }
      }
    };
    
    // Only initialize if no exercises are present
    if (sessionExercises.length === 0) {
      initializeWorkoutName();
    }
  }, [sessionExercises.length]);





  // Finish confirmation modal actions
  const confirmFinish = async () => {
    setShowFinishConfirm(false);
    await handleFinishWorkout();
  };
  const cancelFinish = () => setShowFinishConfirm(false);

  // Handle back button - directly navigate back without save prompt
  const handleBackButton = async () => {
    // If there are no exercises, ensure session is reset so home shows START TRAINING
    if (sessionExercises.length === 0) {
      await resetSession();
    }
    router.back();
  };

  // Handle finish workout with improved duplicate prevention
  const handleFinishWorkout = async () => {
    // Prevent multiple saves with early return
    if (isSaving) {
      return;
    }

    // Validate workout name
    if (!workoutName || workoutName.trim().length === 0) {
      Alert.alert('Invalid Workout Name', 'Please enter a workout name before finishing.');
      return;
    }

    if (workoutName.length > 100) {
      Alert.alert('Workout Name Too Long', 'Workout name must be 100 characters or less.');
      return;
    }

    // Validate exercises
    if (sessionExercises.length === 0) {
      Alert.alert('No Exercises', 'Cannot finish workout with no exercises.');
      return;
    }

    // Validate that all exercises have at least one set
    const exercisesWithoutSets = sessionExercises.filter(exercise => 
      !exercise.sets || exercise.sets.length === 0
    );

    if (exercisesWithoutSets.length > 0) {
      Alert.alert(
        'Incomplete Exercises', 
        'All exercises must have at least one set. Please add sets to all exercises.'
      );
      return;
    }

    // Validate sets have valid data
    const invalidSets = sessionExercises.flatMap(exercise => 
      exercise.sets.filter(set => {
        const weight = Number(set.weight);
        const reps = Number(set.reps);
        return isNaN(weight) || weight < 0 || isNaN(reps) || reps <= 0;
      })
    );

    if (invalidSets.length > 0) {
      Alert.alert(
        'Invalid Set Data', 
        'All sets must have valid weight (≥ 0) and reps (> 0) values.'
      );
      return;
    }

    try {
      // Set saving state immediately to prevent double-clicks
      setIsSaving(true);
      
  await endWorkout(); // End the workout session
  const workoutId = await saveWorkout(); // Save to database
      
      if (workoutId) {
        // Show report modal (reset session when modal closes)
        setReportWorkoutId(workoutId);
        setReportVisible(true);
      } else {
        throw new Error('Failed to save workout - no ID returned');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Handle specific error cases
      if (errorMessage.includes('Workout name cannot be empty')) {
        Alert.alert('Invalid Workout Name', 'Please enter a workout name.');
      } else if (errorMessage.includes('too long')) {
        Alert.alert('Input Too Long', 'Please shorten your workout name or notes.');
      } else if (errorMessage.includes('negative') || errorMessage.includes('greater than 0')) {
        Alert.alert('Invalid Values', 'Please check your weight and reps values.');
      } else if (errorMessage.includes('Database is busy')) {
        Alert.alert('Database Busy', 'Please try again in a moment.');
      } else if (errorMessage.includes('Database schema is missing')) {
        Alert.alert('Database Error', 'Please restart the app and try again.');
      } else {
        Alert.alert('Save Failed', `Failed to save workout: ${errorMessage}`);
      }
    } finally {
      // Only reset saving state if still saving (avoid race conditions)
      setIsSaving(false);
    }
  };

  // Handle closing the post-session report
  const handleCloseReport = async () => {
    setReportVisible(false);
    setReportWorkoutId(null);
    try {
      await resetSession();
    } catch {}
    // After reset, return to previous screen
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header with back button, workout name, and cancel cross */}
      <View style={styles.headerRow}>
        <View style={{ width: 36 }} />
        
        {sessionExercises.length > 0 && (
          <Text style={{ 
            color: theme.colors.neon, 
            fontFamily: theme.fonts.code, 
            fontWeight: 'bold', 
            fontSize: 28, 
            letterSpacing: 1.5, 
            textAlign: 'center',
            flex: 1,
            marginHorizontal: 16,
          }}>
            {workoutName}
          </Text>
        )}
        
  {/* X removed as per requirement */}
  <View style={{ flexDirection: 'row', alignItems: 'center' }} />
      </View>
      {/* Main content (workout box, input, END WORKOUT) */}
      {sessionExercises.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: -120 }}>
          {/* Only show input and END WORKOUT button when no exercises */}
          <View style={{ width: '100%', maxWidth: 400, borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 8, padding: 24, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ alignItems: 'center', marginBottom: 18 }}>
              <TextInput
                style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontWeight: 'bold', fontSize: 22, letterSpacing: 1.5, textAlign: 'center', backgroundColor: 'transparent', borderWidth: 0 }}
                value={workoutName}
                onChangeText={(text) => {
                  // Limit workout name to 100 characters
                  if (text.length <= 100) {
                    setWorkoutName(text);
                  }
                }}
                placeholder="ENTER WORKOUT"
                placeholderTextColor={theme.colors.neon}
                maxLength={100}
              />
              {['MORNING WORKOUT', 'AFTERNOON WORKOUT', 'NIGHT WORKOUT', 'LATE NIGHT WORKOUT'].includes(workoutName) && (
                null
              )}
            </View>
            <View style={{ flexDirection: 'row', width: '100%', marginBottom: 18 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: theme.colors.neon,
                  borderRadius: 6,
                  paddingVertical: 14,
                  paddingHorizontal: 12,
                  backgroundColor: 'rgba(0,255,0,0.1)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                activeOpacity={0.7}
                onPress={() => {
                  // Open instantly and avoid double open
                  if (!modalVisible) {
                    setModalVisible(true);
                  }
                }}
              >
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16, fontWeight: 'bold', letterSpacing: 1, textAlign: 'center' }}>
                  ADD EXERCISE
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      ) : (
        <>

          {/* Show exercise timer in the middle */}
          <View style={{ alignItems: 'center', marginBottom: 18 }}>
            {sessionStartTime && sessionExercises.length > 0 && (
              <Text 
                style={{ 
                  color: isPaused ? '#FFA500' : theme.colors.neon, // orange if paused
                  fontFamily: theme.fonts.heading, 
                  fontSize: 24, 
                  fontWeight: 'bold', 
                  letterSpacing: 2, 
                  paddingVertical: 4, 
                  paddingHorizontal: 16, 
                  overflow: 'hidden',
                  backgroundColor: 'transparent',
                }}
              >
                {isPaused ? 'PAUSED' : formatElapsed(elapsedTime)}
              </Text>
            )}
          </View>
          <ScrollView style={{ flex: 1, marginBottom: 12 }}>
            {sessionExercises.map((ex, idx) => (
              <View key={ex.id} style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 8, marginBottom: 18, padding: 12, backgroundColor: 'transparent' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontWeight: 'bold', fontSize: 18, textTransform: 'uppercase', flex: 1 }}>{ex.name.toUpperCase()}</Text>
                  <TouchableOpacity onPress={() => handleRemoveExercise(ex.id)}>
                    <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 24, fontWeight: 'bold' }}>−</Text>
                  </TouchableOpacity>
                </View>
                {/* Sets List */}
                {(ex.sets || []).map((set: any, setIdx: number, arr: any[]) => {
                  // Find the last completed set index
                  const lastCompletedIdx = arr.map((s, i) => s.completed ? i : -1).filter(i => i !== -1).pop();
                  return (
                    <SetRow
                      key={setIdx}
                      set={set}
                      setIdx={setIdx}
                      exerciseId={ex.id}
                      handleSetFieldChange={handleSetFieldChange}
                      handleSetRestChange={handleSetRestChange}
                      handleToggleSetComplete={handleToggleSetComplete}
                      handleRemoveSet={handleRemoveSet}
                      theme={theme}
                      isLastCompleted={set.completed && setIdx === lastCompletedIdx}
                    />
                  );
                })}
                <TouchableOpacity style={{ paddingVertical: 12, alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(0, 255, 0, 0.1)', borderRadius: 6 }} onPress={() => handleAddSet(ex.id)}>
                  <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16, fontWeight: 'bold', letterSpacing: 1 }}>ADD SET</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <SafeAreaView style={{ width: '100%', paddingHorizontal: 0, paddingBottom: 8, backgroundColor: 'transparent' }}>
            <View style={{ width: '100%', paddingHorizontal: 0, marginTop: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 16, paddingHorizontal: 8 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: theme.colors.neon,
                    borderRadius: 6,
                    paddingVertical: 14,
                    paddingHorizontal: 12,
                    backgroundColor: 'rgba(0,255,0,0.1)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (!modalVisible) {
                      setModalVisible(true);
                    }
                  }}
                >
                  <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16, fontWeight: 'bold', letterSpacing: 1, textAlign: 'center' }}>
                    ADD EXERCISE
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', width: '100%', gap: 12 }}>
                <TouchableOpacity 
                  style={{ 
                    flex: 1,
                    backgroundColor: isSaving ? '#666' : '#CC0000', 
                    borderRadius: 4, 
                    paddingVertical: 20, 
                    alignItems: 'center', 
                    borderWidth: 2, 
                    borderColor: 'black', 
                    marginBottom: 0,
                    marginTop: 0,
                    opacity: isSaving ? 0.6 : 1.0 // Visual feedback for disabled state
                  }}
                  onPress={() => setShowFinishConfirm(true)}
                  disabled={isSaving}
                  activeOpacity={isSaving ? 1.0 : 0.7} // Prevent tap feedback when disabled
                >
                  <Text style={{ color: 'black', fontFamily: theme.fonts.code, fontSize: 18, fontWeight: 'bold', letterSpacing: 1.2 }}>
                    {isSaving ? 'SAVING...' : 'FINISH'}
                  </Text>
          </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </>
      )}
      {/* Exercise Picker Modal */}
      {/* Finish confirmation modal */}
      <Modal
        visible={showFinishConfirm}
        transparent
        animationType="fade"
        onRequestClose={cancelFinish}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#000', borderWidth: 2, borderColor: theme.colors.neon, borderRadius: 8, padding: 20, width: '80%', maxWidth: 360 }}>
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.heading, fontSize: 18, textAlign: 'center', marginBottom: 12 }}>Are you sure you want to finish your workout?</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <TouchableOpacity onPress={confirmFinish} style={{ flex: 1, marginRight: 8, paddingVertical: 12, borderWidth: 2, borderColor: theme.colors.neon, borderRadius: 6, alignItems: 'center', backgroundColor: 'rgba(0,255,0,0.1)' }}>
                <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontWeight: 'bold' }}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={cancelFinish} style={{ flex: 1, marginLeft: 8, paddingVertical: 12, borderWidth: 2, borderColor: '#666', borderRadius: 6, alignItems: 'center', backgroundColor: 'transparent' }}>
                <Text style={{ color: '#AAA', fontFamily: theme.fonts.code, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingHorizontal: 16, paddingBottom: 16 }}>
            <View style={{ width: 24 }} />
            <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 20, fontWeight: 'bold' }}>EXERCISES</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 24 }}>✕</Text>
            </TouchableOpacity>
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

          {/* Clear Filters */}
          {(selectedMuscleGroup !== 'All' || selectedEquipment !== 'All') && (
            <TouchableOpacity 
              style={{ paddingHorizontal: 16, paddingBottom: 12 }}
              onPress={() => {
                setSelectedMuscleGroup('All');
                setSelectedEquipment('All');
              }}
            >
              <Text style={{ color: '#FF0000', fontFamily: theme.fonts.code, fontSize: 12 }}>CLEAR ALL FILTERS</Text>
            </TouchableOpacity>
          )}

          {/* Exercise List */}
          {pickerLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator color={theme.colors.neon} size="large" />
            </View>
          ) : (
            <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
              {pickerExercises.map((ex) => {
                const alreadyAdded = sessionExercises.some(e => e.id === ex.id);
                return (
                  <ExerciseCard
                    key={ex.id}
                    exercise={ex}
                    maxWeight={maxWeights[ex.id]}
                    onPress={() => !alreadyAdded && handleAddExerciseFromPicker(ex)}
                    isAlreadyAdded={alreadyAdded}
                    showAction={true}
                    disabled={alreadyAdded}
                  />
                );
              })}
              {pickerExercises.length === 0 && (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
                  <Text style={{ color: theme.colors.neon, fontFamily: theme.fonts.code, fontSize: 16, textAlign: 'center' }}>
                    No exercises found.
                  </Text>
                  <TouchableOpacity
                    style={{ marginTop: 16, backgroundColor: theme.colors.neon, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24 }}
                    onPress={() => {
                      setNewExerciseName(search);
                      setNewMuscleGroups([]);
                      setNewCategory('');
                      // Close the main modal first to avoid conflicts
                      setModalVisible(false);
                      // Small delay to ensure modal closes, then show add modal
                      setTimeout(() => {
                        setShowAddModal(true);
                      }, 100);
                    }}
                  >
                    <Text style={{ color: theme.colors.background, fontFamily: theme.fonts.heading, fontWeight: 'bold', fontSize: 16 }}>+ Add "{search.trim()}" as new exercise</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
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
                    await dbOperations.addExercise({
                      name: newExerciseName.trim(),
                      muscle_group: newMuscleGroups.join(', '),
                      category: newCategory,
                      is_custom: 1,
                    });
                    
                    setShowAddModal(false);
                    // Reset the form
                    setNewExerciseName('');
                    setNewMuscleGroups([]);
                    setNewCategory('');
                    
                    // Reopen the main modal and refresh the exercise list
                    setTimeout(() => {
                      setModalVisible(true);
                      // Refresh the exercise list to include the newly added exercise
                      dbOperations.getExercises().then(refreshedExercises => {
                        setPickerExercises(refreshedExercises.filter(ex =>
                          ex.name.toLowerCase().includes(search.trim().toLowerCase()) ||
                          ex.muscle_group?.toLowerCase().includes(search.trim().toLowerCase()) ||
                          ex.category?.toLowerCase().includes(search.trim().toLowerCase())
                        ));
                      });
                    }, 100);
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
      <PostSessionReportModal
        visible={reportVisible}
        workoutId={reportWorkoutId}
        onClose={handleCloseReport}
      />
      
      {/* Only show BottomNav when workout is not active */}
      {!isWorkoutActive && <BottomNav currentScreen="/new" />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
  },
  statusBar: {
    color: theme.colors.text,
    fontFamily: theme.fonts.code,
    fontSize: theme.fonts.caption.fontSize,
    marginBottom: theme.spacing.xs / 2,
    lineHeight: theme.fonts.caption.lineHeight,
  },
  protocol: {
    color: theme.colors.text,
    fontFamily: theme.fonts.code,
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
  back: {
    color: theme.colors.text,
    fontFamily: theme.fonts.code,
    fontSize: theme.fonts.bodyText.fontSize,
    lineHeight: theme.fonts.bodyText.lineHeight,
  },
  session: {
    color: theme.colors.text,
    fontFamily: theme.fonts.heading,
    fontSize: theme.fonts.bodyText.fontSize,
    fontWeight: 'bold',
    lineHeight: theme.fonts.bodyText.lineHeight,
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.fonts.heading,
    fontWeight: 'bold',
    fontSize: theme.fonts.h2.fontSize,
    marginBottom: theme.spacing.xs,
    letterSpacing: 1.5,
    lineHeight: theme.fonts.h2.lineHeight,
  },
  date: {
    color: theme.colors.text,
    fontFamily: theme.fonts.code,
    fontSize: theme.fonts.bodyText.fontSize,
    marginBottom: theme.spacing.xl,
    opacity: 0.85,
    lineHeight: theme.fonts.bodyText.lineHeight,
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
    fontFamily: theme.fonts.body,
    fontSize: theme.fonts.bodyText.fontSize,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginRight: theme.spacing.sm,
    backgroundColor: theme.colors.backgroundOverlay,
    lineHeight: theme.fonts.bodyText.lineHeight,
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
    fontFamily: theme.fonts.heading,
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
    fontFamily: theme.fonts.heading,
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
    fontFamily: theme.fonts.display,
    fontSize: theme.fonts.h2.fontSize,
    fontWeight: 'bold',
    letterSpacing: 1.2,
    lineHeight: theme.fonts.h2.lineHeight,
  },
});