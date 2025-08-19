import React from 'react';
import { useCardioBackgroundPersistence } from '../hooks/useCardioBackgroundPersistence';

interface BackgroundCardioSessionPersistenceProps {
  children: React.ReactNode;
}

/**
 * Background Cardio Session Persistence Component
 * Enables cardio sessions to survive app force close, screen lock, and device restart
 * Works identically to lift workout background persistence
 */
export default function BackgroundCardioSessionPersistence({ children }: BackgroundCardioSessionPersistenceProps) {
  // Initialize cardio background persistence
  useCardioBackgroundPersistence();
  
  return <>{children}</>;
}
