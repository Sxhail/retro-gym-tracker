import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';

// Deprecated route — immediately redirect back to Cardio home
export default function CasualWalkScreen() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/cardio');
  }, [router]);
  return null;
}
