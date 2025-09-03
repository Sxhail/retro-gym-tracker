import React from 'react';
import { G, Path, Svg } from 'react-native-svg';
import theme from '../../../styles/theme';
import type { MuscleId, TrainingLevel } from '../muscles';

interface Props {
  muscleStates: Partial<Record<MuscleId, TrainingLevel>>;
  onMusclePress?: (muscleId: MuscleId) => void;
  getMuscleStyle: (muscleId: MuscleId) => { fill: string; opacity: number; stroke?: string; strokeWidth?: number };
}

export default function MaleAnatomyBack({ muscleStates, onMusclePress, getMuscleStyle }: Props) {
  return (
    <Svg viewBox="0 0 208 450" style={{ width: '100%', height: '100%' }}>
      <G>
        {/* Body outline - using the original SVG path but as stroke only */}
        <Path 
          d="M94.5 409.8 c-1.6 -0.6 -4.2 -2.1 -5.6 -3.4 -1.4 -1.4 -2.8 -2.1 -3.2 -1.7 -0.4 0.3 -0.7 0 -0.7 -0.8 0 -0.8 -1.0 -2.3 -2.1 -3.3 -1.9 -1.6 -2.1 -2.4 -1.5 -8.8 0.5 -4.8 0.4 -7.4 -0.5 -8.4 -1.6 -1.9 -0.5 -9.2 2.0 -13.9 1.6 -3.0 2.0 -3.3 2.5 -1.8 0.3 1.0 0.4 -1.0 0.2 -4.4 -0.3 -7.6 -1.3 -8.9 -11.5 -14.4 -4.2 -2.2 -9.0 -5.4 -10.6 -7.0 -2.5 -2.4 -4.0 -2.9 -7.8 -2.9 -12.8 0 -21.9 -11.5 -22.1 -27.5 -0.1 -6.6 -0.6 -8.9 -2.9 -13.5 -1.8 -3.7 -3.0 -8.2 -3.6 -13.5 -0.6 -5.0 -2.2 -11.4 -4.5 -17.2 -5.6 -14.3 -7.2 -25.9 -5.7 -41.8 0.6 -7.1 0.9 -13.9 0.6 -15.0 -0.3 -1.1 -0.2 -7.2 0.3 -13.6 1.0 -12.3 3.1 -18.3 7.4 -21.3 4.3 -3.0 16.6 -1.1 15.3 2.3 -0.4 0.9 -0.9 2.2 -1.2 2.9 -0.3 0.8 0.3 1.1 1.8 1.0 2.1 -0.3 2.4 0.1 2.3 2.8 -0.3 7.2 -3.4 14.5 -8.1 19.0 -4.5 4.4 -4.5 4.6 -3.9 9.2 0.3 2.6 3.0 9.6 5.8 15.6 4.8 10.1 5.2 11.7 5.9 21.0 0.4 5.6 1.2 11.4 1.8 12.9 1.5 3.8 1.3 4.6 -0.4 2.3 -0.8 -1.1 -1.5 -1.6 -1.5 -1.0 0 0.5 2.0 3.2 4.4 5.9 4.6 5.3 6.9 9.3 8.0 13.8 0.9 3.9 2.0 3.3 3.6 -2.0 1.0 -3.6 2.9 -6.3 7.4 -10.7 4.3 -4.1 5.4 -5.6 3.7 -5.1 l-2.3 0.7 2.7 -4.6 c1.5 -2.5 2.5 -5.1 2.3 -5.8 -0.3 -0.7 -2.5 2.6 -5.1 7.2 -4.6 8.5 -6.1 9.6 -3.1 2.5 1.2 -2.8 1.4 -6.7 1.2 -16.6 -0.2 -7.1 -0.1 -12.9 0 -12.9 0.2 0 1.5 0.9 2.9 2.0 4.7 3.7 10.4 2.0 19.7 -5.6 3.2 -2.5 5.9 -4.4 6.1 -4.2 0.3 0.2 -1.0 2.2 -2.8 4.3 -1.7 2.2 -2.5 3.5 -1.7 3.1 0.8 -0.5 0.4 0.4 -1.0 2.0 -1.4 1.5 -1.7 2.2 -0.7 1.5 0.9 -0.8 2.0 -1.1 2.4 -0.8 0.8 0.9 -1.7 3.8 -2.7 3.2 -0.4 -0.3 -1.0 0.2 -1.3 1.0 -0.4 1.0 -0.1 1.2 1.1 0.9 0.9 -0.3 0.1 0.8 -1.8 2.6 -1.9 1.7 -2.8 2.8 -2.0 2.4 1.3 -0.7 1.3 -0.6 0 1.0 -1.3 1.6 -1.2 2.0 0.5 3.2 1.0 0.8 1.3 1.4 0.7 1.4 -0.7 0 -1.2 0.4 -1.2 0.9 0 0.4 2.3 0.3 5.2 -0.2 2.9 -0.6 4.7 -1.2 4.1 -1.4 -1.6 -0.6 -0.3 -4.4 2.1 -6.6 l2.1 -1.8 -2.5 0.7 c-2.2 0.5 -2.3 0.4 -0.9 -0.7 1.4 -1.2 2.7 -5.2 5.6 -16.4 0.7 -3.0 0.7 -3.0 1.1 1.0 0.5 5.3 -0.8 22.5 -1.7 22.2 -0.4 -0.1 -2.0 1.3 -3.6 3.1 -2.5 2.8 -3.7 3.3 -7.4 3.4 -7.0 0.1 -9.8 -5.4 -6.4 -12.6 l2.0 -4.1 -6.3 0.3 c-7.4 0.4 -8.5 1.9 -4.8 5.9 2.5 2.7 2.6 3.2 2.0 10.6 -0.7 8.4 -2.2 12.5 -5.9 15.4 -1.2 1.0 -3.8 4.4 -5.6 7.6 -3.2 5.7 -6.1 8.3 -7.6 6.9 -0.4 -0.4 -0.5 0.7 -0.1 2.3 0.3 1.7 0.9 5.3 1.2 8.0 0.6 4.9 0.5 5.1 -3.5 8.8 -3.5 3.2 -5.2 4.0 -8.1 3.9 -0.3 0 -2.0 -0.3 -3.7 -0.7"
          fill="none" 
          stroke={theme.colors.neon}
          strokeWidth={2}
          opacity={1.0}
        />
        
        {/* Head/Neck region - back view */}
        <Path
          d="M90 20 L118 20 L118 45 L90 45 Z"
          {...getMuscleStyle('neck')}
          onPress={() => onMusclePress?.('neck')}
        />
        
        {/* Upper Traps - Upper back/shoulder area */}
        <Path
          d="M75 45 L133 45 L133 75 L75 75 Z"
          {...getMuscleStyle('upperTraps')}
          onPress={() => onMusclePress?.('upperTraps')}
        />
        
        {/* Rear Delts - Back of shoulders */}
        <Path
          d="M60 75 L75 75 L75 105 L60 105 Z"
          {...getMuscleStyle('rearDelts')}
          onPress={() => onMusclePress?.('rearDelts')}
        />
        <Path
          d="M133 75 L148 75 L148 105 L133 105 Z"
          {...getMuscleStyle('rearDelts')}
          onPress={() => onMusclePress?.('rearDelts')}
        />
        
        {/* Triceps - Back of arms */}
        <Path
          d="M48 105 L60 105 L60 145 L48 145 Z"
          {...getMuscleStyle('triceps')}
          onPress={() => onMusclePress?.('triceps')}
        />
        <Path
          d="M148 105 L160 105 L160 145 L148 145 Z"
          {...getMuscleStyle('triceps')}
          onPress={() => onMusclePress?.('triceps')}
        />
        
        {/* Mid Traps - Middle back */}
        <Path
          d="M85 85 L123 85 L123 115 L85 115 Z"
          {...getMuscleStyle('midTraps')}
          onPress={() => onMusclePress?.('midTraps')}
        />
        
        {/* Rhomboids - Upper middle back */}
        <Path
          d="M88 95 L120 95 L120 125 L88 125 Z"
          {...getMuscleStyle('rhomboids')}
          onPress={() => onMusclePress?.('rhomboids')}
        />
        
        {/* Lats - Latissimus dorsi, side back */}
        <Path
          d="M70 115 L85 115 L85 165 L70 165 Z"
          {...getMuscleStyle('lats')}
          onPress={() => onMusclePress?.('lats')}
        />
        <Path
          d="M123 115 L138 115 L138 165 L123 165 Z"
          {...getMuscleStyle('lats')}
          onPress={() => onMusclePress?.('lats')}
        />
        
        {/* Lower Traps */}
        <Path
          d="M92 125 L116 125 L116 155 L92 155 Z"
          {...getMuscleStyle('lowerTraps')}
          onPress={() => onMusclePress?.('lowerTraps')}
        />
        
        {/* Lower Back - Erector spinae */}
        <Path
          d="M88 165 L120 165 L120 195 L88 195 Z"
          {...getMuscleStyle('lowerBack')}
          onPress={() => onMusclePress?.('lowerBack')}
        />
        
        {/* Glutes - Buttocks */}
        <Path
          d="M82 215 L126 215 L126 255 L82 255 Z"
          {...getMuscleStyle('glutes')}
          onPress={() => onMusclePress?.('glutes')}
        />
        
        {/* Hamstrings - Back of thighs */}
        <Path
          d="M75 275 L95 275 L95 335 L75 335 Z"
          {...getMuscleStyle('hamstrings')}
          onPress={() => onMusclePress?.('hamstrings')}
        />
        <Path
          d="M113 275 L133 275 L133 335 L113 335 Z"
          {...getMuscleStyle('hamstrings')}
          onPress={() => onMusclePress?.('hamstrings')}
        />
        
        {/* Calves - Back of lower legs */}
        <Path
          d="M78 355 L92 355 L92 415 L78 415 Z"
          {...getMuscleStyle('calves')}
          onPress={() => onMusclePress?.('calves')}
        />
        <Path
          d="M116 355 L130 355 L130 415 L116 415 Z"
          {...getMuscleStyle('calves')}
          onPress={() => onMusclePress?.('calves')}
        />
      </G>
    </Svg>
  );
}
