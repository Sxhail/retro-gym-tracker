import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import theme from '../../styles/theme';
import type { MuscleKey } from '../../services/workoutReport';

const MUSCLES: { key: MuscleKey; label: string; path: string }[] = [
  // Simplified front anatomy (approximate paths), sized to 200x300 viewBox
  { key: 'Chest', label: 'Chest', path: 'M40,80 C70,60 130,60 160,80 L160,120 C130,100 70,100 40,120 Z' },
  { key: 'Shoulders', label: 'Shoulders', path: 'M30,70 C45,50 65,50 80,70 L80,90 C65,75 45,75 30,90 Z M120,70 C135,50 155,50 170,70 L170,90 C155,75 135,75 120,90 Z' },
  { key: 'Core', label: 'Core', path: 'M80,120 L120,120 L120,190 L80,190 Z' },
  { key: 'Arms', label: 'Arms', path: 'M20,100 L40,100 L40,180 L20,180 Z M160,100 L180,100 L180,180 L160,180 Z' },
  { key: 'Biceps', label: 'Biceps', path: 'M25,120 L40,120 L40,150 L25,150 Z M160,120 L175,120 L175,150 L160,150 Z' },
  { key: 'Triceps', label: 'Triceps', path: 'M25,150 L40,150 L40,180 L25,180 Z M160,150 L175,150 L175,180 L160,180 Z' },
  { key: 'Legs', label: 'Legs', path: 'M80,190 L95,190 L95,280 L80,280 Z M105,190 L120,190 L120,280 L105,280 Z' },
  { key: 'Glutes', label: 'Glutes', path: 'M80,180 L120,180 L120,200 L80,200 Z' },
  // Back: not used for front-only, included fallback as Unknown
];

function colorForIntensity(intensity: number) {
  // Map 0..1 to neon green opacity
  const alpha = Math.max(0.1, Math.min(0.9, intensity));
  return `rgba(0,255,0,${alpha})`;
}

export default function BodyOverlayHeatmap({ muscleIntensity, onMusclePress }: { muscleIntensity: Record<MuscleKey, number>; onMusclePress?: (m: MuscleKey) => void; }) {
  return (
    <View style={{ borderWidth: 1, borderColor: theme.colors.neon, borderRadius: 12, padding: 12 }}>
      <Svg width={"100%"} height={260} viewBox="0 0 200 300">
        {/* Outline */}
        <Path d="M100,20 C60,20 40,60 40,90 L40,200 C40,240 60,280 100,280 C140,280 160,240 160,200 L160,90 C160,60 140,20 100,20 Z" fill="none" stroke={theme.colors.neon} strokeWidth={1} />
        {MUSCLES.map(m => (
          <Path
            key={m.key}
            d={m.path}
            fill={colorForIntensity(muscleIntensity[m.key] || 0)}
            stroke={theme.colors.neon}
            strokeWidth={0.5}
            onPress={() => onMusclePress?.(m.key)}
          />
        ))}
      </Svg>
    </View>
  );
}
