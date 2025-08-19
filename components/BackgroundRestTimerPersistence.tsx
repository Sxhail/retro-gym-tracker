import React from 'react';
import { useBackgroundRestTimerPersistence } from '../hooks/useBackgroundRestTimerPersistence';
import { useRestTimerCleanup } from '../hooks/useRestTimerCleanup';

/**
 * Background Rest Timer Persistence Component
 * Handles automatic saving/restoring of rest timer state across app sessions
 */
export default function BackgroundRestTimerPersistence({ children }: { children: React.ReactNode }) {
  // This hook handles all the background persistence logic
  useBackgroundRestTimerPersistence();
  
  // This hook cleans up orphaned rest timers when no workout is active
  useRestTimerCleanup();

  // This is just a provider component - renders children as-is
  return <>{children}</>;
}
