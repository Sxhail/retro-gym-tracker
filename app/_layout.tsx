import React from 'react';
import { Stack } from 'expo-router';
import { WorkoutSessionProvider } from '../context/WorkoutSessionContext';
import { useEffect } from 'react';

export default function RootLayout() {
  return (
    <WorkoutSessionProvider>
      <Stack />
    </WorkoutSessionProvider>
  );
} 