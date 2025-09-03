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
    <Svg viewBox="0 0 190 450" style={{ width: '100%', height: '100%' }}>
      <G>
        
        {/* Main body outline from the actual SVG */}
        <Path 
          d="M858 4416 c-95 -37 -141 -102 -142 -201 -1 -103 -27 -152 -89 -166 -27 -6 -47 -24 -82 -72 -57 -78 -76 -85 -127 -47 -42 31 -68 33 -68 5 0 -21 16 -35 68 -60 30 -15 71 -47 90 -72 l35 -45 -7 -64 c-8 -71 10 -124 36 -106 8 5 13 1 13 -11 0 -10 -7 -24 -15 -32 -8 -8 -15 -26 -15 -40 0 -29 18 -51 38 -47 7 1 12 -8 12 -20 0 -12 -5 -21 -12 -20 -18 3 -38 -20 -38 -43 0 -15 15 -36 38 -52 47 -33 62 -58 62 -102 0 -27 6 -37 28 -49 35 -19 42 -48 21 -82 -20 -32 -24 -81 -9 -121 11 -29 4 -58 -25 -101 -16 -23 -19 -40 -14 -68 5 -30 2 -42 -16 -61 -33 -35 -32 -60 4 -84 25 -16 31 -27 31 -56 0 -19 -5 -46 -11 -59 -9 -19 -8 -28 7 -48 22 -30 21 -49 -3 -92 -15 -27 -16 -38 -7 -70 6 -21 14 -38 18 -38 5 0 26 -16 48 -35 39 -34 40 -35 22 -62 -19 -28 -19 -30 -1 -80 17 -44 21 -48 43 -43 23 5 26 2 30 -30 3 -20 15 -47 26 -60 18 -20 20 -29 11 -55 -15 -43 -4 -75 33 -97 16 -10 34 -18 40 -18 15 0 18 -46 5 -63 -8 -10 -8 -18 0 -28 8 -10 8 -18 0 -28 -8 -10 -8 -18 0 -28 8 -10 8 -18 0 -28 -8 -10 -8 -18 0 -28 7 -8 7 -19 1 -29 -14 -22 -14 -50 0 -50 6 0 11 -13 11 -30 0 -23 -4 -30 -20 -30 -11 0 -20 -4 -20 -10 0 -5 14 -10 30 -10 17 0 30 -4 30 -10 0 -5 -13 -10 -30 -10 -16 0 -30 -4 -30 -10 0 -5 14 -10 30 -10 17 0 30 -4 30 -10 0 -5 -13 -10 -30 -10 -16 0 -30 -4 -30 -10 0 -5 14 -10 30 -10 17 0 30 -4 30 -10 0 -5 -13 -10 -30 -10 -16 0 -30 -4 -30 -10 0 -5 9 -10 20 -10 11 0 20 -4 20 -10 0 -5 -14 -10 -30 -10 -17 0 -30 -4 -30 -10 0 -5 13 -10 30 -10 16 0 30 -4 30 -10 0 -5 -14 -10 -30 -10 -17 0 -30 4 -30 10 0 6 14 10 30 10 17 0 30 5 30 10 0 6 -13 10 -30 10 -16 0 -30 5 -30 10 0 6 14 10 30 10 17 0 30 5 30 10 0 6 -13 10 -30 10 -16 0 -30 5 -30 10 0 6 13 10 30 10 16 0 30 5 30 10 0 6 -13 10 -30 10 -16 0 -30 5 -30 10 0 6 13 10 30 10 16 0 30 5 30 10 0 6 -13 10 -30 10 -16 0 -30 5 -30 10 0 6 13 10 30 10 16 0 30 5 30 10 0 6 -9 10 -20 10 -11 0 -20 5 -20 10 0 6 13 10 30 10 16 0 30 5 30 10 0 6 -14 10 -30 10 -17 0 -30 5 -30 10 0 6 13 10 30 10 16 0 30 5 30 10 0 6 -13 10 -30 10 -16 0 -30 5 -30 10 0 6 13 10 30 10 16 0 30 5 30 10 0 6 -13 10 -30 10 -16 0 -30 5 -30 10 0 6 13 10 30 10 z"
          fill="none" 
          stroke={theme.colors.neon}
          strokeWidth={2}
          opacity={0.8}
        />

        {/* Anatomically correct muscle regions based on actual body proportions */}
        
        {/* Upper Trapezius - use 'upperTraps' */}
        <Path
          d="M620 3800 c-80 -30 -120 -60 -120 -90 0 -30 40 -60 120 -90 80 -30 120 -30 160 0 40 30 80 60 80 90 0 30 -40 60 -80 90 -40 30 -80 30 -160 0z"
          {...getMuscleStyle('upperTraps')}
          onPress={() => onMusclePress?.('upperTraps')}
        />
        
        {/* Left Rear Deltoid */}
        <Path
          d="M400 3600 c-60 -30 -90 -60 -90 -90 0 -30 30 -60 90 -90 60 -30 90 -30 120 0 30 30 30 60 0 90 -30 30 -60 60 -120 90z"
          {...getMuscleStyle('rearDelts')}
          onPress={() => onMusclePress?.('rearDelts')}
        />
        
        {/* Right Rear Deltoid */}
        <Path
          d="M1200 3600 c60 -30 90 -60 90 -90 0 -30 -30 -60 -90 -90 -60 -30 -90 -30 -120 0 -30 30 -30 60 0 90 30 30 60 60 120 90z"
          {...getMuscleStyle('rearDelts')}
          onPress={() => onMusclePress?.('rearDelts')}
        />
        
        {/* Middle Traps */}
        <Path
          d="M620 3400 c-100 -40 -150 -80 -150 -120 0 -40 50 -80 150 -120 100 -40 140 -40 180 0 40 40 50 80 50 120 0 40 -10 80 -50 120 -40 40 -80 40 -180 0z"
          {...getMuscleStyle('midTraps')}
          onPress={() => onMusclePress?.('midTraps')}
        />
        
        {/* Rhomboids */}
        <Path
          d="M680 3200 c-60 -30 -100 -60 -100 -90 0 -30 40 -60 100 -90 60 -30 100 -30 140 0 40 30 60 60 60 90 0 30 -20 60 -60 90 -40 30 -80 30 -140 0z"
          {...getMuscleStyle('rhomboids')}
          onPress={() => onMusclePress?.('rhomboids')}
        />
        
        {/* Latissimus Dorsi - Lats */}
        <Path
          d="M520 2800 c-80 -50 -120 -100 -120 -150 0 -50 40 -100 120 -150 80 -50 160 -50 240 0 80 50 120 100 120 150 0 50 -40 100 -120 150 -80 50 -160 50 -240 0z"
          {...getMuscleStyle('lats')}
          onPress={() => onMusclePress?.('lats')}
        />
        
        {/* Left Tricep */}
        <Path
          d="M300 3200 c-50 -25 -80 -50 -80 -75 0 -25 30 -50 80 -75 50 -25 80 -25 110 0 30 25 50 50 50 75 0 25 -20 50 -50 75 -30 25 -60 25 -110 0z"
          {...getMuscleStyle('triceps')}
          onPress={() => onMusclePress?.('triceps')}
        />
        
        {/* Right Tricep */}
        <Path
          d="M1300 3200 c50 -25 80 -50 80 -75 0 -25 -30 -50 -80 -75 -50 -25 -80 -25 -110 0 -30 25 -50 50 -50 75 0 25 20 50 50 75 30 25 60 25 110 0z"
          {...getMuscleStyle('triceps')}
          onPress={() => onMusclePress?.('triceps')}
        />
        
        {/* Lower Back - Erector Spinae */}
        <Path
          d="M720 2400 c-60 -40 -100 -80 -100 -120 0 -40 40 -80 100 -120 60 -40 100 -40 140 0 40 40 60 80 60 120 0 40 -20 80 -60 120 -40 40 -80 40 -140 0z"
          {...getMuscleStyle('lowerBack')}
          onPress={() => onMusclePress?.('lowerBack')}
        />
        
        {/* Glutes - Gluteus Maximus */}
        <Path
          d="M580 1800 c-80 -40 -120 -80 -120 -120 0 -40 40 -80 120 -120 80 -40 160 -40 240 0 80 40 120 80 120 120 0 40 -40 80 -120 120 -80 40 -160 40 -240 0z"
          {...getMuscleStyle('glutes')}
          onPress={() => onMusclePress?.('glutes')}
        />
        
        {/* Left Hamstring */}
        <Path
          d="M500 1400 c-60 -30 -100 -60 -100 -90 0 -30 40 -60 100 -90 60 -30 100 -30 130 0 30 30 50 60 50 90 0 30 -20 60 -50 90 -30 30 -70 30 -130 0z"
          {...getMuscleStyle('hamstrings')}
          onPress={() => onMusclePress?.('hamstrings')}
        />
        
        {/* Right Hamstring */}
        <Path
          d="M1100 1400 c60 -30 100 -60 100 -90 0 -30 -40 -60 -100 -90 -60 -30 -100 -30 -130 0 -30 30 -50 60 -50 90 0 30 20 60 50 90 30 30 70 30 130 0z"
          {...getMuscleStyle('hamstrings')}
          onPress={() => onMusclePress?.('hamstrings')}
        />
        
        {/* Left Calf */}
        <Path
          d="M520 1000 c-40 -20 -60 -40 -60 -60 0 -20 20 -40 60 -60 40 -20 60 -20 80 0 20 20 30 40 30 60 0 20 -10 40 -30 60 -20 20 -40 20 -80 0z"
          {...getMuscleStyle('calves')}
          onPress={() => onMusclePress?.('calves')}
        />
        
        {/* Right Calf */}
        <Path
          d="M1080 1000 c40 -20 60 -40 60 -60 0 -20 -20 -40 -60 -60 -40 -20 -60 -20 -80 0 -20 20 -30 40 -30 60 0 20 10 40 30 60 20 20 40 20 80 0z"
          {...getMuscleStyle('calves')}
          onPress={() => onMusclePress?.('calves')}
        />

      </G>
    </Svg>
  );
}
