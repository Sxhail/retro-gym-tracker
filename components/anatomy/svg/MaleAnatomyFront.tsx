import React from 'react';
import { G, Path, Svg } from 'react-native-svg';
import theme from '../../../styles/theme';
import type { MuscleId, TrainingLevel } from '../muscles';

interface Props {
  muscleStates: Partial<Record<MuscleId, TrainingLevel>>;
  onMusclePress?: (muscleId: MuscleId) => void;
  getMuscleStyle: (muscleId: MuscleId) => { fill: string; opacity: number; stroke?: string; strokeWidth?: number };
}

export default function MaleAnatomyFront({ muscleStates, onMusclePress, getMuscleStyle }: Props) {
  return (
    <Svg viewBox="0 0 136 300" style={{ width: '100%', height: '100%' }}>
      <G>
        {/* Body outline - using the original SVG path but as stroke only */}
        <Path 
          d="M58.1 27.24 c-5.7 -2.4 -7.4 -5.1 -6.9 -11.1 0.3 -2.9 0.1 -5.3 -0.4 -5.3 -1.3 0 -0.9 -6.4 0.5 -8.5 4.4 -6.5 5.5 -22.5 1.6 -22.5 -2.3 0 -2.4 1.3 -0.4 3.0 0.8 0.7 1.5 2.8 1.5 4.6 l0 3.4 -3.7 -1.5 c-2.1 -0.9 -6.0 -2.9 -8.6 -4.5 -2.7 -1.7 -5.8 -3.0 -7.0 -3.0 -1.1 0 -4.0 -0.9 -6.4 -2.1 -5.4 -2.6 -8.6 -8.2 -8.8 -15.6 -0.1 -2.8 -0.9 -6.2 -1.7 -7.5 -2.1 -3.2 -2.8 -5.7 -2.9 -10.8 -0.1 -2.5 -0.8 -5.8 -1.7 -7.4 -0.8 -1.6 -2.3 -6.6 -3.4 -11.0 -1.6 -7.0 -1.8 -10.4 -1.3 -26.1 0.3 -9.9 0.8 -19.3 1.1 -20.9 0.9 -4.1 4.4 -7.6 8.5 -8.2 2.8 -0.5 3.8 -0.1 6.1 2.3 2.6 2.7 2.6 2.9 1.3 8.0 -1.6 5.9 -2.8 8.4 -4.9 10.3 -2.5 2.0 -1.9 7.7 1.9 15.9 2.5 5.6 3.6 9.8 4.1 15.2 0.4 5.4 1.3 8.4 3.1 11.2 1.3 2.1 2.8 5.0 3.4 6.5 l1.1 2.7 1.4 -3.5 c0.8 -1.9 2.3 -4.3 3.2 -5.3 1.3 -1.5 1.7 -3.9 1.7 -11.3 0 -9.3 0 -9.3 3.5 -13.1 6.7 -7.2 8.3 -9.8 2.6 -4.1 -3.3 3.3 -5.9 5.2 -6.1 4.5 -2.7 -7.3 -3.5 -10.4 -3.5 -13.2 0 -1.7 -1.2 -6.5 -2.6 -10.6 -3.8 -10.7 -4.4 -25.4 -1.5 -36.6 2.6 -10.0 2.6 -13.4 0.1 -24.7 -2.7 -12.0 -2.5 -19.6 0.6 -33.5 3.4 -15.0 3.5 -20.5 0.6 -25.3 -3.9 -6.3 -9.3 -9.8 -17.5 -11.3 l-7.2 -1.3 9.1 -0.1 c7.6 -0.1 9.3 0.2 9.8 1.5 0.4 1.2 0.2 1.5 -0.9 1.0 -2.6 -0.9 -1.7 0 3.9 4.4 3.0 2.3 5.3 4.7 5.0 5.4 -0.2 0.6 0.7 2.2 2.1 3.4 1.4 1.2 2.5 3.3 2.5 4.6 0 4.5 -1.3 11.6 -2.0 11.1 -1.0 -0.6 -2.9 11.7 -3.7 23.2 -0.7 11.5 0.8 12.4 2.6 1.6 3.2 -19.4 4.3 -24.9 6.6 -31.2 2.9 -8.0 2.9 -8.2 1.1 -7.5"
          fill="none" 
          stroke={theme.colors.neon}
          strokeWidth={2}
          opacity={1.0}
        />
        
        {/* Head/Neck region */}
        <Path
          d="M60 15 L76 15 L76 35 L60 35 Z"
          {...getMuscleStyle('neck')}
          onPress={() => onMusclePress?.('neck')}
        />
        
        {/* Chest - Upper torso center */}
        <Path
          d="M52 45 L84 45 L84 75 L52 75 Z"
          {...getMuscleStyle('chest')}
          onPress={() => onMusclePress?.('chest')}
        />
        
        {/* Front Delts - Shoulder areas */}
        <Path
          d="M42 45 L52 45 L52 65 L42 65 Z"
          {...getMuscleStyle('frontDelts')}
          onPress={() => onMusclePress?.('frontDelts')}
        />
        <Path
          d="M84 45 L94 45 L94 65 L84 65 Z"
          {...getMuscleStyle('frontDelts')}
          onPress={() => onMusclePress?.('frontDelts')}
        />
        
        {/* Biceps - Upper arms */}
        <Path
          d="M32 65 L42 65 L42 95 L32 95 Z"
          {...getMuscleStyle('biceps')}
          onPress={() => onMusclePress?.('biceps')}
        />
        <Path
          d="M94 65 L104 65 L104 95 L94 95 Z"
          {...getMuscleStyle('biceps')}
          onPress={() => onMusclePress?.('biceps')}
        />
        
        {/* Forearms */}
        <Path
          d="M25 95 L35 95 L35 125 L25 125 Z"
          {...getMuscleStyle('forearms')}
          onPress={() => onMusclePress?.('forearms')}
        />
        <Path
          d="M101 95 L111 95 L111 125 L101 125 Z"
          {...getMuscleStyle('forearms')}
          onPress={() => onMusclePress?.('forearms')}
        />
        
        {/* Abs - Core center */}
        <Path
          d="M55 75 L81 75 L81 95 L55 95 Z"
          {...getMuscleStyle('abs')}
          onPress={() => onMusclePress?.('abs')}
        />
        <Path
          d="M58 95 L78 95 L78 115 L58 115 Z"
          {...getMuscleStyle('abs')}
          onPress={() => onMusclePress?.('abs')}
        />
        
        {/* Obliques - Side core */}
        <Path
          d="M45 75 L55 75 L55 105 L45 105 Z"
          {...getMuscleStyle('obliques')}
          onPress={() => onMusclePress?.('obliques')}
        />
        <Path
          d="M81 75 L91 75 L91 105 L81 105 Z"
          {...getMuscleStyle('obliques')}
          onPress={() => onMusclePress?.('obliques')}
        />
        
        {/* Quads - Upper legs */}
        <Path
          d="M52 155 L68 155 L68 205 L52 205 Z"
          {...getMuscleStyle('quads')}
          onPress={() => onMusclePress?.('quads')}
        />
        <Path
          d="M68 155 L84 155 L84 205 L68 205 Z"
          {...getMuscleStyle('quads')}
          onPress={() => onMusclePress?.('quads')}
        />
        
        {/* Adductors - Inner thighs */}
        <Path
          d="M60 145 L76 145 L76 165 L60 165 Z"
          {...getMuscleStyle('adductors')}
          onPress={() => onMusclePress?.('adductors')}
        />
        
        {/* Shins - Lower legs front */}
        <Path
          d="M55 225 L68 225 L68 275 L55 275 Z"
          {...getMuscleStyle('shins')}
          onPress={() => onMusclePress?.('shins')}
        />
        <Path
          d="M68 225 L81 225 L81 275 L68 275 Z"
          {...getMuscleStyle('shins')}
          onPress={() => onMusclePress?.('shins')}
        />
      </G>
    </Svg>
  );
}
