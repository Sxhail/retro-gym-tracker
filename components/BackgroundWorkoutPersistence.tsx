import React from 'react';
import { useBackgroundWorkoutPersistence } from '../hooks/useBackgroundWorkoutPersistence';

/**
 * Background Persistence Provider
 * Add this component anywhere in your app tree to enable background session persistence
 * Does NOT interfere with existing workout logic - only adds background save/restore
 */
export function BackgroundWorkoutPersistence({ children }: { children: React.ReactNode }) {
  // Initialize background persistence - this runs automatically
  useBackgroundWorkoutPersistence();
  
  // This component is invisible - it just enables background persistence
  return <>{children}</>;
}

export default BackgroundWorkoutPersistence;
