# ✅ Muscle Activation Map Implementation - COMPLETE!

## 🎉 Implementation Status: ALL PHASES COMPLETED

### **✅ Phase 1: Core Infrastructure** - COMPLETE
- ✅ `components/anatomy/muscles.ts` - Muscle group mappings and TypeScript types
- ✅ `components/anatomy/training-levels.ts` - Training level configuration and view modes

### **✅ Phase 2: SVG Anatomy Components** - COMPLETE  
- ✅ `components/anatomy/svg/MaleAnatomyFront.tsx` - Male front view with SVG paths
- ✅ `components/anatomy/svg/MaleAnatomyBack.tsx` - Male back view with SVG paths
- ✅ `components/anatomy/svg/FemaleAnatomyFront.tsx` - Female front view with SVG paths
- ✅ `components/anatomy/svg/FemaleAnatomyBack.tsx` - Female back view with SVG paths
- ✅ `components/anatomy/AnatomyViewer.tsx` - Container component with gender/side toggles

### **✅ Phase 3: Training Volume Analysis Service** - COMPLETE
- ✅ `services/muscleAnalytics.ts` - Workout volume analysis and muscle activation calculation

### **✅ Phase 4: Stats Page Integration** - COMPLETE
- ✅ `components/stats/MuscleActivationStats.tsx` - Complete Stats page component
- ✅ `app/stats.tsx` - Integrated into main stats page
- ✅ `scripts/testMuscleActivationMap.js` - Testing utilities
- ✅ `scripts/verifyDatabaseForMuscleMap.js` - Database verification
- ✅ `components/stats/MuscleActivationMapDemo.tsx` - Demo component

## 🚀 **IMPLEMENTATION COMPLETE - READY TO USE!**

## Overview

This document outlines the complete implementation of a **Muscle Activation Map** component for the retro gym tracker app. The component will display front/back views of human anatomy with muscle groups highlighted based on training volume levels, inspired by the Vue Human Muscle Anatomy repository.

## Enhanced Features Summary

### 🔗 **Workout History Integration**
- **Real Database Connection**: Pulls from your existing SQLite tables (`workouts`, `workout_exercises`, `sets`)
- **Automatic Mapping**: Maps exercise muscle groups to anatomical regions
- **Live Updates**: Refreshes when new workouts are completed
- **Historical Analysis**: Tracks training patterns over time

### 📊 **Multiple View Modes**
- **SESSION VIEW**: Analyze individual workout sessions
  - Select from recent workouts
  - See which muscles were trained in that specific session
  - Volume-based opacity for exercise intensity
  
- **WEEK VIEW**: Last 7 days analysis
  - Training frequency patterns
  - Recent training focus areas
  - Recovery gap identification

- **MONTH VIEW**: 30-day comprehensive analysis (default)
  - Long-term training balance
  - Muscle group prioritization
  - Training consistency metrics

### 🎨 **Dynamic Opacity System**
- **Volume-Based Opacity**: Higher training volume = darker/more opaque muscle regions
- **View-Specific Scaling**: Different opacity ranges for session vs week vs month
- **Real-Time Calculation**: Opacity updates based on actual workout data
- **Visual Intensity**: Instantly see which muscles received the most/least work

### 🎛️ **Enhanced Controls**
- **Time Period Toggle**: SESSION | WEEK | MONTH
- **Anatomy Options**: MALE/FEMALE + FRONT/BACK views  
- **Workout Selector**: Horizontal scroll through recent sessions (SESSION view only)
- **Interactive Legend**: Training levels + opacity explanation

### 📈 **Smart Training Analysis**
- **Context-Aware Levels**: Different algorithms for session vs weekly vs monthly analysis
- **Volume Thresholds**: Customizable min/max volume targets per view mode
- **Frequency Tracking**: Session count and training consistency
- **Recency Factor**: Last trained days for each muscle group

### Current App Architecture
- **React Native + Expo + TypeScript**
- **Database**: SQLite with Drizzle ORM
- **Styling**: Custom retro/cyberpunk theme (`#16913A` neon green)
- **SVG**: Already using `react-native-svg` (v15.11.2)
- **Components**: Established pattern in `/components/` and `/components/stats/`
- **Theme**: Centralized in `/styles/theme.ts`

### Current Muscle Groups in Database
Based on `exercises.json` and existing code:
```typescript
['Chest', 'Arms', 'Legs', 'Back', 'Core', 'Shoulders', 'Glutes']
```

### Training Level System
```typescript
type TrainingLevel = 'untrained' | 'undertrained' | 'optimal' | 'overtrained';
type ViewMode = 'week' | 'session' | 'month';
```

### Data Connection
**✅ Connected to Existing Workout History**
- Pulls data directly from your SQLite database (`workouts`, `workout_exercises`, `sets` tables)
- Maps exercise muscle groups to anatomical muscle regions
- Calculates real training volumes, frequency, and recency
- Updates automatically when new workouts are added

### Enhanced View Options
**🔄 Multiple Time Periods**
- **WEEK VIEW**: Last 7 days of training data
- **SESSION VIEW**: Single workout session analysis  
- **MONTH VIEW**: Last 30 days (default)

**🎨 Dynamic Opacity Levels**
- Each muscle group shows different opacity based on training volume
- Real-time visual feedback of training intensity
- Color gradients indicate training status

## Implementation Plan

### Phase 1: Core Infrastructure (Day 1)

#### 1.1 Create Muscle Mapping System
**File**: `/components/anatomy/muscles.ts`

```typescript
// Comprehensive muscle group mapping
export const MUSCLE_GROUPS = {
  // Upper Body - Front
  chest: 'Chest',
  frontDelts: 'Shoulders',
  biceps: 'Arms',
  forearms: 'Arms',
  abs: 'Core',
  obliques: 'Core',
  
  // Upper Body - Back
  traps: 'Back',
  lats: 'Back',
  rearDelts: 'Shoulders', 
  rotatorCuffs: 'Shoulders',
  lowerBack: 'Back',
  triceps: 'Arms',
  
  // Lower Body - Front
  quads: 'Legs',
  adductors: 'Legs',
  
  // Lower Body - Back
  glutes: 'Glutes',
  hamstrings: 'Legs',
  calves: 'Legs',
  abductors: 'Legs',
  
  // Additional
  neck: 'Back'
} as const;

export type MuscleId = keyof typeof MUSCLE_GROUPS;
export type TrainingLevel = 'untrained' | 'undertrained' | 'optimal' | 'overtrained';
export type ViewMode = 'week' | 'session' | 'month';
export type Gender = 'male' | 'female';
export type AnatomySide = 'front' | 'back';
```

#### 1.2 Create Training Level Configuration
**File**: `/components/anatomy/training-levels.ts`

```typescript
import theme from '../../styles/theme';

export const TRAINING_LEVEL_CONFIG = {
  untrained: {
    color: theme.colors.textDisabled,
    opacity: 0.1,
    label: 'Untrained',
    description: 'No recent training'
  },
  undertrained: {
    color: '#FF9500', // Orange
    opacity: 0.3,
    label: 'Undertrained', 
    description: 'Light training volume'
  },
  optimal: {
    color: theme.colors.neon, // Main green
    opacity: 0.6,
    label: 'Optimal',
    description: 'Balanced training'
  },
  overtrained: {
    color: '#FF0033', // Red
    opacity: 0.8,
    label: 'Overtrained',
    description: 'High volume/frequency'
  }
} as const;

export const VIEW_MODE_CONFIG = {
  session: {
    label: 'SESSION',
    description: 'Single workout analysis',
    daysBack: 1,
    minVolume: 100,
    maxVolume: 1000
  },
  week: {
    label: 'WEEK',
    description: 'Last 7 days',
    daysBack: 7,
    minVolume: 500,
    maxVolume: 3000
  },
  month: {
    label: 'MONTH', 
    description: 'Last 30 days',
    daysBack: 30,
    minVolume: 2000,
    maxVolume: 8000
  }
} as const;
```

### Phase 2: SVG Anatomy Components (Day 2)

#### 2.1 Extract and Convert SVG Data
**Task**: Extract the SVG paths from the Vue repository and convert to React Native format.

**Files to create**:
- `/components/anatomy/svg/MaleAnatomyFront.tsx`
- `/components/anatomy/svg/MaleAnatomyBack.tsx`
- `/components/anatomy/svg/FemaleAnatomyFront.tsx`
- `/components/anatomy/svg/FemaleAnatomyBack.tsx`

**Template structure**:
```typescript
import React from 'react';
import { G, Path } from 'react-native-svg';
import { MuscleId, TrainingLevel } from '../muscles';

interface Props {
  muscleStates: Partial<Record<MuscleId, TrainingLevel>>;
  onMusclePress?: (muscleId: MuscleId) => void;
  getMuscleStyle: (muscleId: MuscleId) => { fill: string; opacity: number };
}

export default function MaleAnatomyFront({ muscleStates, onMusclePress, getMuscleStyle }: Props) {
  return (
    <G>
      {/* Background/outline paths */}
      <Path 
        d="M..." 
        fill="#1f1f1f" 
        stroke={theme.colors.neon}
        strokeWidth={1}
      />
      
      {/* Individual muscle groups */}
      <Path
        id="chest"
        d="M..."
        {...getMuscleStyle('chest')}
        onPress={() => onMusclePress?.('chest')}
      />
      
      <Path
        id="biceps"
        d="M..."
        {...getMuscleStyle('biceps')}
        onPress={() => onMusclePress?.('biceps')}
      />
      
      {/* ... more muscle paths */}
    </G>
  );
}
```

#### 2.2 Main Anatomy Component
**File**: `/components/anatomy/HumanAnatomy.tsx`

```typescript
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Svg, { Defs, LinearGradient, Stop } from 'react-native-svg';
import theme from '../../styles/theme';
import { MuscleId, TrainingLevel, Gender, AnatomySide, MUSCLE_GROUPS } from './muscles';
import { TRAINING_LEVEL_CONFIG, VIEW_MODE_CONFIG } from './training-levels';

// Import anatomy components
import MaleAnatomyFront from './svg/MaleAnatomyFront';
import MaleAnatomyBack from './svg/MaleAnatomyBack';
import FemaleAnatomyFront from './svg/FemaleAnatomyFront';
import FemaleAnatomyBack from './svg/FemaleAnatomyBack';

interface Props {
  gender: Gender;
  side: AnatomySide;
  viewMode: ViewMode;
  muscleStates: Partial<Record<MuscleId, TrainingLevel>>;
  muscleVolumes: Partial<Record<MuscleId, number>>; // Raw volume data for opacity calculation
  selectedWorkoutId?: string; // For session view
  onMusclePress?: (muscleId: MuscleId) => void;
  width?: number;
  height?: number;
  showControls?: boolean;
  onGenderChange?: (gender: Gender) => void;
  onSideChange?: (side: AnatomySide) => void;
  onViewModeChange?: (viewMode: ViewMode) => void;
}

export default function HumanAnatomy({
  gender,
  side,
  viewMode,
  muscleStates,
  muscleVolumes,
  selectedWorkoutId,
  onMusclePress,
  width = 280,
  height = 400,
  showControls = true,
  onGenderChange,
  onSideChange,
  onViewModeChange
}: Props) {
  
  const getMuscleStyle = (muscleId: MuscleId) => {
    const level = muscleStates[muscleId] || 'untrained';
    const volume = muscleVolumes[muscleId] || 0;
    const config = TRAINING_LEVEL_CONFIG[level];
    const viewConfig = VIEW_MODE_CONFIG[viewMode];
    
    // Calculate dynamic opacity based on volume and view mode
    let opacity = config.opacity;
    if (volume > 0) {
      const normalizedVolume = Math.min(volume / viewConfig.maxVolume, 1);
      opacity = Math.max(0.2, normalizedVolume * 0.8); // Min 20%, max 80%
    }
    
    return {
      fill: config.color,
      opacity,
      stroke: level === 'optimal' ? theme.colors.neon : 'transparent',
      strokeWidth: level === 'optimal' ? 2 : 0,
    };
  };

  const renderAnatomy = () => {
    const props = { muscleStates, onMusclePress, getMuscleStyle };
    
    if (gender === 'male' && side === 'front') return <MaleAnatomyFront {...props} />;
    if (gender === 'male' && side === 'back') return <MaleAnatomyBack {...props} />;
    if (gender === 'female' && side === 'front') return <FemaleAnatomyFront {...props} />;
    if (gender === 'female' && side === 'back') return <FemaleAnatomyBack {...props} />;
    
    return null;
  };

  return (
    <View style={styles.container}>
      {/* Control Panel */}
      {showControls && (
        <View style={styles.controls}>
          {/* View Mode Toggle */}
          <View style={styles.viewModeContainer}>
            <Text style={styles.controlLabel}>TIME PERIOD</Text>
            <View style={styles.toggleGroup}>
              {Object.entries(VIEW_MODE_CONFIG).map(([mode, config]) => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.toggleButton, viewMode === mode && styles.toggleButtonActive]}
                  onPress={() => onViewModeChange?.(mode as ViewMode)}
                >
                  <Text style={[styles.toggleText, viewMode === mode && styles.toggleTextActive]}>
                    {config.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Gender/Side Toggles */}
          <View style={styles.anatomyControls}>
            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>ANATOMY</Text>
              <View style={styles.toggleGroup}>
                <TouchableOpacity
                  style={[styles.toggleButton, gender === 'male' && styles.toggleButtonActive]}
                  onPress={() => onGenderChange?.('male')}
                >
                  <Text style={[styles.toggleText, gender === 'male' && styles.toggleTextActive]}>
                    MALE
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, gender === 'female' && styles.toggleButtonActive]}
                  onPress={() => onGenderChange?.('female')}
                >
                  <Text style={[styles.toggleText, gender === 'female' && styles.toggleTextActive]}>
                    FEMALE
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>VIEW</Text>
              <View style={styles.toggleGroup}>
                <TouchableOpacity
                  style={[styles.toggleButton, side === 'front' && styles.toggleButtonActive]}
                  onPress={() => onSideChange?.('front')}
                >
                  <Text style={[styles.toggleText, side === 'front' && styles.toggleTextActive]}>
                    FRONT
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, side === 'back' && styles.toggleButtonActive]}
                  onPress={() => onSideChange?.('back')}
                >
                  <Text style={[styles.toggleText, side === 'back' && styles.toggleTextActive]}>
                    BACK
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* SVG Anatomy */}
      <View style={styles.anatomyContainer}>
        <Svg width={width} height={height} viewBox="0 0 1024 1024">
          <Defs>
            <LinearGradient id="backgroundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#000000" stopOpacity="1" />
              <Stop offset="100%" stopColor="#001100" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          {renderAnatomy()}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  controls: {
    width: '100%',
    marginBottom: 16,
    gap: 12,
  },
  viewModeContainer: {
    alignItems: 'center',
  },
  anatomyControls: {
    gap: 8,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    minWidth: 60,
  },
  toggleGroup: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: theme.colors.neon,
    borderRadius: 6,
    overflow: 'hidden',
  },
  toggleButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'transparent',
    minWidth: 50,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.neon,
  },
  toggleText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    fontWeight: 'bold',
  },
  toggleTextActive: {
    color: theme.colors.background,
  },
  anatomyContainer: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundOverlay,
    padding: 12,
    marginBottom: 12,
  },
  legend: {
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.backgroundOverlay,
    width: '100%',
    maxWidth: 320,
  },
  legendTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  legendItems: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  legendItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    fontWeight: 'bold',
  },
  legendDescription: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 9,
  },
  viewModeDescription: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 9,
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
```

### Phase 3: Training Volume Analysis Service (Day 3)

#### 3.1 Create Volume Analysis Service
**File**: `/services/muscleAnalytics.ts`

```typescript
import { db } from '../db/client';
import { exercises, workouts, workout_exercises, sets } from '../db/schema';
import { eq, and, gte, desc } from 'drizzle-orm';
import { MUSCLE_GROUPS, type MuscleId, type TrainingLevel } from '../components/anatomy/muscles';

export interface MuscleVolumeData {
  muscleId: MuscleId;
  totalVolume: number; // weight * reps * sets
  sessionCount: number;
  lastTrainedDays: number;
  averageVolumePerSession: number;
  workoutIds: string[]; // Track which workouts trained this muscle
}

export interface MuscleAnalysisResult {
  muscleStates: Record<MuscleId, TrainingLevel>;
  muscleVolumes: Record<MuscleId, number>;
  rawData: Record<MuscleId, MuscleVolumeData>;
}

export async function calculateMuscleVolumes(
  viewMode: ViewMode,
  selectedWorkoutId?: string
): Promise<Record<MuscleId, MuscleVolumeData>> {
  let cutoffDate: Date;
  const viewConfig = VIEW_MODE_CONFIG[viewMode];
  
  if (viewMode === 'session' && selectedWorkoutId) {
    // For session view, only analyze the selected workout
    const workoutData = await db
      .select({
        exerciseName: exercises.name,
        muscleGroup: exercises.muscle_group,
        weight: sets.weight,
        reps: sets.reps,
        workoutDate: workouts.date,
        workoutId: workouts.id,
      })
      .from(sets)
      .innerJoin(workout_exercises, eq(sets.workout_exercise_id, workout_exercises.id))
      .innerJoin(exercises, eq(workout_exercises.exercise_id, exercises.id))
      .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
      .where(eq(workouts.id, selectedWorkoutId));
      
    return processWorkoutData(workoutData, viewMode);
  } else {
    // For week/month view, use time-based filtering
    cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - viewConfig.daysBack);
    
    const workoutData = await db
      .select({
        exerciseName: exercises.name,
        muscleGroup: exercises.muscle_group,
        weight: sets.weight,
        reps: sets.reps,
        workoutDate: workouts.date,
        workoutId: workouts.id,
      })
      .from(sets)
      .innerJoin(workout_exercises, eq(sets.workout_exercise_id, workout_exercises.id))
      .innerJoin(exercises, eq(workout_exercises.exercise_id, exercises.id))
      .innerJoin(workouts, eq(workout_exercises.workout_id, workouts.id))
      .where(gte(workouts.date, cutoffDate.toISOString()));
      
    return processWorkoutData(workoutData, viewMode);
  }
}

function processWorkoutData(workoutData: any[], viewMode: ViewMode): Record<MuscleId, MuscleVolumeData> {

function processWorkoutData(workoutData: any[], viewMode: ViewMode): Record<MuscleId, MuscleVolumeData> {
  // Group by muscle groups and calculate volumes
  const muscleVolumes: Record<string, {
    totalVolume: number;
    sessions: Set<string>;
    workoutIds: Set<string>;
    lastTrainedDate: Date | null;
  }> = {};

  workoutData.forEach(row => {
    const muscleGroup = row.muscleGroup || 'Unknown';
    const volume = row.weight * row.reps;
    const workoutDate = new Date(row.workoutDate);
    
    if (!muscleVolumes[muscleGroup]) {
      muscleVolumes[muscleGroup] = {
        totalVolume: 0,
        sessions: new Set(),
        workoutIds: new Set(),
        lastTrainedDate: null
      };
    }
    
    muscleVolumes[muscleGroup].totalVolume += volume;
    muscleVolumes[muscleGroup].sessions.add(row.workoutDate);
    muscleVolumes[muscleGroup].workoutIds.add(row.workoutId);
    
    if (!muscleVolumes[muscleGroup].lastTrainedDate || 
        workoutDate > muscleVolumes[muscleGroup].lastTrainedDate!) {
      muscleVolumes[muscleGroup].lastTrainedDate = workoutDate;
    }
  });

  // Map to muscle IDs and calculate training levels
  const result: Record<MuscleId, MuscleVolumeData> = {} as any;
  
  Object.entries(MUSCLE_GROUPS).forEach(([muscleId, dbMuscleGroup]) => {
    const data = muscleVolumes[dbMuscleGroup];
    const sessionCount = data?.sessions.size || 0;
    const totalVolume = data?.totalVolume || 0;
    const workoutIds = data?.workoutIds ? Array.from(data.workoutIds) : [];
    const lastTrainedDays = data?.lastTrainedDate 
      ? Math.floor((Date.now() - data.lastTrainedDate.getTime()) / (1000 * 60 * 60 * 24))
      : Infinity;
    
    result[muscleId as MuscleId] = {
      muscleId: muscleId as MuscleId,
      totalVolume,
      sessionCount,
      lastTrainedDays,
      averageVolumePerSession: sessionCount > 0 ? totalVolume / sessionCount : 0,
      workoutIds,
    };
  });

  return result;
}

export function calculateTrainingLevel(data: MuscleVolumeData, viewMode: ViewMode): TrainingLevel {
  const { sessionCount, lastTrainedDays, totalVolume } = data;
  const viewConfig = VIEW_MODE_CONFIG[viewMode];
  
  // Training level logic varies by view mode
  if (viewMode === 'session') {
    // For single session: based on volume in that session
    if (totalVolume === 0) return 'untrained';
    if (totalVolume < viewConfig.minVolume) return 'undertrained';
    if (totalVolume > viewConfig.maxVolume) return 'overtrained';
    return 'optimal';
  }
  
  if (viewMode === 'week') {
    // For weekly view: frequency and volume matter
    if (sessionCount === 0 || lastTrainedDays > 7) return 'untrained';
    if (sessionCount === 1 && totalVolume < viewConfig.minVolume) return 'undertrained';
    if (sessionCount > 4 || totalVolume > viewConfig.maxVolume) return 'overtrained';
    return 'optimal';
  }
  
  if (viewMode === 'month') {
    // For monthly view: consistency and total volume
    if (sessionCount === 0 || lastTrainedDays > 14) return 'untrained';
    if (sessionCount < 3 || totalVolume < viewConfig.minVolume) return 'undertrained';
    if (sessionCount > 12 || totalVolume > viewConfig.maxVolume) return 'overtrained';
    return 'optimal';
  }
  
  return 'untrained';
}

export async function getMuscleAnalysis(
  viewMode: ViewMode,
  selectedWorkoutId?: string
): Promise<MuscleAnalysisResult> {
  const rawData = await calculateMuscleVolumes(viewMode, selectedWorkoutId);
  const muscleStates: Record<MuscleId, TrainingLevel> = {} as any;
  const muscleVolumes: Record<MuscleId, number> = {} as any;
  
  Object.entries(rawData).forEach(([muscleId, data]) => {
    muscleStates[muscleId as MuscleId] = calculateTrainingLevel(data, viewMode);
    muscleVolumes[muscleId as MuscleId] = data.totalVolume;
  });
  
  return {
    muscleStates,
    muscleVolumes,
    rawData
  };
}

// Helper function to get recent workouts for session view
export async function getRecentWorkouts(limit: number = 10) {
  return await db
    .select({
      id: workouts.id,
      date: workouts.date,
      name: workouts.name,
      exerciseCount: 'COUNT(DISTINCT workout_exercises.exercise_id) as exercise_count'
    })
    .from(workouts)
    .leftJoin(workout_exercises, eq(workouts.id, workout_exercises.workout_id))
    .groupBy(workouts.id)
    .orderBy(desc(workouts.date))
    .limit(limit);
}
```

### Phase 4: Integration into Stats Page (Day 4)

#### 4.1 Update Stats Page
**File**: `/app/stats.tsx` (modifications)

```typescript
// Add imports
import HumanAnatomy from '../components/anatomy/HumanAnatomy';
import { getMuscleTrainingStates } from '../services/muscleAnalytics';
import type { Gender, AnatomySide, MuscleId, TrainingLevel } from '../components/anatomy/muscles';

// Add to component state
const [muscleStates, setMuscleStates] = useState<Partial<Record<MuscleId, TrainingLevel>>>({});
const [muscleVolumes, setMuscleVolumes] = useState<Partial<Record<MuscleId, number>>>({});
const [anatomyGender, setAnatomyGender] = useState<Gender>('male');
const [anatomySide, setAnatomySide] = useState<AnatomySide>('front');
const [viewMode, setViewMode] = useState<ViewMode>('month');
const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>();
const [recentWorkouts, setRecentWorkouts] = useState<any[]>([]);
const [muscleLoading, setMuscleLoading] = useState(true);

// Add to useEffect
useEffect(() => {
  async function fetchMuscleData() {
    setMuscleLoading(true);
    try {
      const analysis = await getMuscleAnalysis(viewMode, selectedWorkoutId);
      setMuscleStates(analysis.muscleStates);
      setMuscleVolumes(analysis.muscleVolumes);
      
      // Load recent workouts for session view
      if (viewMode === 'session') {
        const workouts = await getRecentWorkouts();
        setRecentWorkouts(workouts);
        if (!selectedWorkoutId && workouts.length > 0) {
          setSelectedWorkoutId(workouts[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load muscle data:', error);
    } finally {
      setMuscleLoading(false);
    }
  }
  fetchMuscleData();
}, [viewMode, selectedWorkoutId]);

// Add to JSX (after headerRow, before exercise selection)
{/* Muscle Activation Map */}
<View style={styles.muscleMapSection}>
  <Text style={styles.sectionTitle}>MUSCLE ACTIVATION MAP</Text>
  <Text style={styles.sectionSubtitle}>
    {viewMode === 'session' 
      ? `Single workout analysis${selectedWorkoutId ? ' - Selected workout' : ''}` 
      : `Training volume analysis (last ${VIEW_MODE_CONFIG[viewMode].daysBack} days)`
    }
  </Text>
  
  {/* Session Selector for Session View */}
  {viewMode === 'session' && (
    <View style={styles.sessionSelector}>
      <Text style={styles.sessionSelectorTitle}>SELECT WORKOUT</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.sessionButtons}>
          {recentWorkouts.map((workout) => (
            <TouchableOpacity
              key={workout.id}
              style={[
                styles.sessionButton,
                selectedWorkoutId === workout.id && styles.sessionButtonActive
              ]}
              onPress={() => setSelectedWorkoutId(workout.id)}
            >
              <Text style={[
                styles.sessionButtonText,
                selectedWorkoutId === workout.id && styles.sessionButtonTextActive
              ]}>
                {new Date(workout.date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </Text>
              <Text style={[
                styles.sessionButtonSubtext,
                selectedWorkoutId === workout.id && styles.sessionButtonSubtextActive
              ]}>
                {workout.name || `${workout.exerciseCount} exercises`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  )}
  
  {muscleLoading ? (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.colors.neon} />
      <Text style={styles.loadingText}>Analyzing training data...</Text>
    </View>
  ) : (
    <HumanAnatomy
      gender={anatomyGender}
      side={anatomySide}
      viewMode={viewMode}
      muscleStates={muscleStates}
      muscleVolumes={muscleVolumes}
      selectedWorkoutId={selectedWorkoutId}
      onGenderChange={setAnatomyGender}
      onSideChange={setAnatomySide}
      onViewModeChange={(mode) => {
        setViewMode(mode);
        if (mode !== 'session') {
          setSelectedWorkoutId(undefined);
        }
      }}
      onMusclePress={(muscleId) => {
        // Optional: Show muscle details modal
        console.log('Pressed muscle:', muscleId);
      }}
    />
  )}
  
  {/* Enhanced Training Level Legend */}
  <View style={styles.legend}>
    <Text style={styles.legendTitle}>TRAINING LEVELS</Text>
    <Text style={styles.legendSubtitle}>
      {VIEW_MODE_CONFIG[viewMode].description}
    </Text>
    <View style={styles.legendItems}>
      {Object.entries(TRAINING_LEVEL_CONFIG).map(([level, config]) => (
        <View key={level} style={styles.legendItem}>
          <View style={styles.legendItemLeft}>
            <View 
              style={[
                styles.legendColor, 
                { backgroundColor: config.color }
              ]} 
            />
            <Text style={styles.legendLabel}>{config.label}</Text>
          </View>
          <Text style={styles.legendDescription}>{config.description}</Text>
        </View>
      ))}
    </View>
    
    {/* Opacity Information */}
    <View style={styles.opacityInfo}>
      <Text style={styles.opacityTitle}>INTENSITY VISUALIZATION</Text>
      <Text style={styles.opacityDescription}>
        Muscle opacity reflects training volume: lighter = less volume, darker = higher volume
      </Text>
    </View>
  </View>
</View>

// Add styles
const styles = StyleSheet.create({
  // ... existing styles
  
  muscleMapSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  sectionTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 4,
    textAlign: 'center',
  },
  sectionSubtitle: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  sessionSelector: {
    marginBottom: 16,
    width: '100%',
  },
  sessionSelectorTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  sessionButtons: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  sessionButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    backgroundColor: theme.colors.backgroundOverlay,
    minWidth: 80,
    alignItems: 'center',
  },
  sessionButtonActive: {
    borderColor: theme.colors.neon,
    backgroundColor: theme.colors.neon + '20',
  },
  sessionButtonText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    fontWeight: 'bold',
  },
  sessionButtonTextActive: {
    color: theme.colors.neon,
  },
  sessionButtonSubtext: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 8,
    marginTop: 2,
  },
  sessionButtonSubtextActive: {
    color: theme.colors.neon,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    marginTop: 8,
  },
  legend: {
    marginTop: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: theme.colors.backgroundOverlay,
    width: '100%',
    maxWidth: 320,
  },
  legendTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  legendSubtitle: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 10,
    marginBottom: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  legendItems: {
    gap: 6,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  legendItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendLabel: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    fontWeight: 'bold',
  },
  legendDescription: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 9,
  },
  opacityInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  opacityTitle: {
    color: theme.colors.neon,
    fontFamily: theme.fonts.code,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  opacityDescription: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.body,
    fontSize: 9,
    textAlign: 'center',
    lineHeight: 12,
  },
});
```

### Phase 5: SVG Extraction and Conversion (Day 5)

#### 5.1 SVG Path Extraction Process
1. **Manual extraction** from the Vue repository SVG files
2. **Path optimization** for React Native SVG
3. **ID mapping** to ensure muscle group consistency
4. **Testing** each muscle group highlighting

#### 5.2 Key SVG Paths to Extract
Based on the Vue repository analysis, extract paths for:
- **Male Front**: chest, frontDelts, biceps, forearms, abs, obliques, quads, adductors
- **Male Back**: traps, lats, rearDelts, rotatorCuffs, lowerBack, triceps, glutes, hamstrings, calves
- **Female Front/Back**: Same muscle groups with female anatomy

### Phase 6: Testing and Polish (Day 6)

#### 6.1 Component Testing
- **Unit tests** for muscle mapping logic
- **Integration tests** for volume calculation
- **Visual testing** of all muscle group highlights

#### 6.2 Performance Optimization
- **SVG optimization** for mobile performance
- **Caching** of muscle volume calculations
- **Lazy loading** of anatomy components

#### 6.3 User Experience Enhancements
- **Loading states** during data calculation
- **Error handling** for failed volume calculations
- **Responsive sizing** for different screen sizes

## File Structure

```
components/
├── anatomy/
│   ├── HumanAnatomy.tsx                 # Main component
│   ├── muscles.ts                       # Muscle mapping constants
│   ├── training-levels.ts               # Training level configuration
│   └── svg/
│       ├── MaleAnatomyFront.tsx        # Male front view SVG
│       ├── MaleAnatomyBack.tsx         # Male back view SVG
│       ├── FemaleAnatomyFront.tsx      # Female front view SVG
│       └── FemaleAnatomyBack.tsx       # Female back view SVG
services/
└── muscleAnalytics.ts                  # Volume calculation service
app/
└── stats.tsx                           # Updated stats page
```

## Implementation Notes

### Keep It Simple
- **No over-engineering**: Use existing patterns and components
- **Minimal dependencies**: Leverage existing `react-native-svg`
- **Consistent styling**: Follow current theme and component patterns
- **Database-driven**: Use existing exercise and workout data structure

### Alignment with Current Architecture
- **TypeScript-first**: Full type safety throughout
- **Theme integration**: Use existing color scheme and fonts  
- **Component patterns**: Follow established styling and structure
- **Service layer**: Consistent with existing analytics services

### Production Readiness
- **Error boundaries**: Handle SVG rendering failures gracefully
- **Performance**: Optimize for mobile devices
- **Accessibility**: Add proper labels for muscle groups
- **Testing**: Unit and integration test coverage

## Timeline

- **Day 1**: Core infrastructure and types
- **Day 2**: SVG anatomy components foundation
- **Day 3**: Volume analysis service
- **Day 4**: Stats page integration
- **Day 5**: SVG extraction and conversion
- **Day 6**: Testing, polish, and deployment

## Conclusion

This implementation provides a production-ready Muscle Activation Map that:
1. **Integrates seamlessly** with your existing app architecture
2. **Leverages existing data** from your workout tracking
3. **Follows established patterns** for consistency
4. **Maintains simplicity** while providing powerful insights
5. **Scales easily** for future enhancements

The component will give users valuable visual feedback on their training patterns and help identify muscle groups that need more attention.
