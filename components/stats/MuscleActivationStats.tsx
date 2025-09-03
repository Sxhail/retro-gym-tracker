import React from 'react';
import MuscleActivationMapV2 from './MuscleActivationMapV2';

export interface MuscleActivationStatsProps {
  className?: string;
}

export const MuscleActivationStats: React.FC<MuscleActivationStatsProps> = () => {
  return <MuscleActivationMapV2 />;
};
