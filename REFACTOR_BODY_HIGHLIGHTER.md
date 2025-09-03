# Muscle Activation Map Refactor Plan
## Using React Native Body Highlighter

### Overview
Replace custom SVG anatomy implementation with the professional React Native Body Highlighter library.

### Installation
```bash
npm install react-native-body-highlighter
```

### Muscle Name Mapping
Your current muscle mapping needs to be converted to Body Highlighter's format:

**Body Highlighter Muscle Names:**
- `chest` → `chest` ✅ (same)
- `biceps` → `biceps` ✅ (same)  
- `triceps` → `triceps` ✅ (same)
- `deltoids` → `frontDelts`, `sideDelts`, `rearDelts` (combine)
- `forearm` → `forearms` (similar)
- `abs` → `abs` ✅ (same)
- `obliques` → `obliques` ✅ (same)
- `quadriceps` → `quads` (similar)
- `hamstring` → `hamstrings` (similar)
- `calves` → `calves` ✅ (same)
- `gluteal` → `glutes` (similar)
- `upper-back` → `upperTraps`, `midTraps` (combine)
- `lower-back` → `lowerBack` (similar)
- `trapezius` → `traps` (similar)
- `neck` → `neck` ✅ (same)
- `adductors` → `adductors` ✅ (same)
- `tibialis` → `shins` (similar)

### Implementation Steps

#### Step 1: Create Muscle Mapping Service
```typescript
// services/bodyHighlighterMapping.ts
import type { MuscleId } from '../components/anatomy/muscles';

export interface BodyPartData {
  slug: string;
  intensity: number;
  side?: 'left' | 'right';
}

export function mapToBodyHighlighter(
  muscleStates: Partial<Record<MuscleId, TrainingLevel>>,
  muscleVolumes: Partial<Record<MuscleId, number>>
): BodyPartData[] {
  const mapping: Record<MuscleId, string | string[]> = {
    chest: 'chest',
    biceps: 'biceps',
    triceps: 'triceps',
    frontDelts: 'deltoids',
    sideDelts: 'deltoids', 
    rearDelts: 'deltoids',
    forearms: 'forearm',
    abs: 'abs',
    obliques: 'obliques',
    quads: 'quadriceps',
    hamstrings: 'hamstring',
    calves: 'calves',
    glutes: 'gluteal',
    upperTraps: 'upper-back',
    midTraps: 'upper-back',
    lowerTraps: 'upper-back',
    lats: 'upper-back',
    rhomboids: 'upper-back',
    lowerBack: 'lower-back',
    traps: 'trapezius',
    neck: 'neck',
    adductors: 'adductors',
    shins: 'tibialis'
  };

  const result: BodyPartData[] = [];
  
  Object.entries(muscleStates).forEach(([muscleId, level]) => {
    const bodyPart = mapping[muscleId as MuscleId];
    if (!bodyPart) return;
    
    const intensity = getIntensityFromLevel(level);
    const volume = muscleVolumes[muscleId as MuscleId] || 0;
    
    if (Array.isArray(bodyPart)) {
      bodyPart.forEach(part => {
        result.push({ slug: part, intensity });
      });
    } else {
      result.push({ slug: bodyPart, intensity });
    }
  });
  
  return result;
}

function getIntensityFromLevel(level: TrainingLevel): number {
  switch(level) {
    case 'untrained': return 1;
    case 'undertrained': return 2;
    case 'optimal': return 4;
    case 'overtrained': return 5;
    default: return 1;
  }
}
```

#### Step 2: Create New MuscleActivationMapV2 Component
```typescript
// components/stats/MuscleActivationMapV2.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Body from 'react-native-body-highlighter';
import { getMuscleActivationMap } from '../../services/muscleAnalytics';
import { mapToBodyHighlighter } from '../../services/bodyHighlighterMapping';
import type { ViewMode, Gender, AnatomySide } from '../anatomy/muscles';

export default function MuscleActivationMapV2() {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [gender, setGender] = useState<Gender>('male');
  const [side, setSide] = useState<AnatomySide>('front');
  const [bodyData, setBodyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMuscleData();
  }, [viewMode]);

  const loadMuscleData = async () => {
    try {
      setLoading(true);
      const activationData = await getMuscleActivationMap(viewMode);
      const mappedData = mapToBodyHighlighter(
        activationData.muscleStates,
        activationData.muscleVolumes
      );
      setBodyData(mappedData);
    } catch (error) {
      console.error('Failed to load muscle data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBodyPartPress = (bodyPart, side) => {
    console.log('Pressed:', bodyPart, side);
    // Show detailed muscle statistics modal
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading muscle data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Controls */}
      <View style={styles.controls}>
        <Text style={styles.title}>Muscle Activation Map</Text>
        
        {/* View Mode Selector */}
        <View style={styles.viewModeContainer}>
          {['week', 'month', 'session'].map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.modeButton, viewMode === mode && styles.activeModeButton]}
              onPress={() => setViewMode(mode as ViewMode)}
            >
              <Text style={[styles.modeText, viewMode === mode && styles.activeModeText]}>
                {mode.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Gender/Side Controls */}
        <View style={styles.bodyControls}>
          <TouchableOpacity
            style={[styles.controlButton, gender === 'male' && styles.activeControlButton]}
            onPress={() => setGender('male')}
          >
            <Text style={[styles.controlText, gender === 'male' && styles.activeControlText]}>
              MALE
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, gender === 'female' && styles.activeControlButton]}
            onPress={() => setGender('female')}
          >
            <Text style={[styles.controlText, gender === 'female' && styles.activeControlText]}>
              FEMALE
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, side === 'front' && styles.activeControlButton]}
            onPress={() => setSide(side === 'front' ? 'back' : 'front')}
          >
            <Text style={[styles.controlText, side === 'front' && styles.activeControlText]}>
              {side.toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Body Highlighter */}
      <View style={styles.bodyContainer}>
        <Body
          data={bodyData}
          onBodyPartPress={handleBodyPartPress}
          colors={['#1ED760', '#00ff00', '#ffff00', '#ff8800', '#ff0000']}
          side={side}
          gender={gender}
          scale={1.2}
          border="#1ED760"
        />
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Training Levels</Text>
        {[
          { level: 'Untrained', color: '#1ED760', intensity: 1 },
          { level: 'Light', color: '#00ff00', intensity: 2 },
          { level: 'Moderate', color: '#ffff00', intensity: 3 },
          { level: 'High', color: '#ff8800', intensity: 4 },
          { level: 'Very High', color: '#ff0000', intensity: 5 },
        ].map((item) => (
          <View key={item.level} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.level}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  controls: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1ED760',
    textAlign: 'center',
    marginBottom: 16,
  },
  viewModeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1ED760',
    backgroundColor: 'transparent',
  },
  activeModeButton: {
    backgroundColor: '#1ED760',
  },
  modeText: {
    color: '#1ED760',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeModeText: {
    color: '#000',
  },
  bodyControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  controlButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#1ED760',
    backgroundColor: 'transparent',
  },
  activeControlButton: {
    backgroundColor: '#1ED760',
  },
  controlText: {
    color: '#1ED760',
    fontSize: 10,
    fontWeight: 'bold',
  },
  activeControlText: {
    color: '#000',
  },
  bodyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  legend: {
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1ED760',
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1ED760',
    textAlign: 'center',
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    color: '#fff',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#1ED760',
    fontSize: 16,
  },
});
```

#### Step 3: Integration Plan

**Phase 1**: Install and Test
```bash
cd /path/to/retro-gym-tracker
npm install react-native-body-highlighter
```

**Phase 2**: Update Stats Page
Replace the current `AnatomyViewer` import with `MuscleActivationMapV2`

**Phase 3**: Gradual Migration
- Keep existing implementation as fallback
- A/B test the new component
- Migrate muscle data mapping
- Remove old SVG components once stable

### Advantages of Migration

1. **Professional UI**: More polished, tested body diagrams
2. **Reduced Code**: ~70% less anatomy-related code to maintain  
3. **Better UX**: Smoother interactions, consistent styling
4. **Future-proof**: Active community maintenance
5. **Cross-platform**: Tested on iOS/Android/Web

### Considerations

1. **Muscle Mapping**: Some of your detailed muscle groups (like separate trap regions) may need to be combined
2. **Customization**: Less control over exact SVG styling
3. **Dependency**: Adding external dependency vs. self-contained solution
4. **Learning Curve**: Team needs to learn new API

### Recommendation

**YES, proceed with refactoring** because:
- Your current implementation is complex and hard to maintain
- Body Highlighter provides professional-quality diagrams
- You'll save significant development time on UI polish
- Can still maintain your advanced analytics layer on top
- Easy to revert if needed

The refactor will modernize your muscle activation map while keeping all your valuable training analytics intact.
