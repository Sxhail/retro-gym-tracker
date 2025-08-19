import React from 'react';
import { useBackgroundRestTimerPersistence } from '../hooks/useBackgroundRestTimerPersistence';

/**
 * Background Rest Timer Persistence Component
 * Handles automatic saving/restoring of rest timer state across app sessions
 */
export default function BackgroundRestTimerPersistence({ children }: { children: React.ReactNode }) {
  // This hook handles all the background persistence logic
  useBackgroundRestTimerPersistence();

  // This is just a provider component - renders children as-is
  return <>{children}</>;
}
