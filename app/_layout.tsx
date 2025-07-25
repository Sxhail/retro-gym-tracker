import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import { WorkoutSessionProvider } from '../context/WorkoutSessionContext';
import { db } from '../db/client';
import * as schema from '../db/schema';
import exerciseList from '../db/exercises.json';
import migrations from '../drizzle/migrations/migrations';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useFonts as useOrbitron, Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import { useFonts as useShareTechMono, ShareTechMono_400Regular } from '@expo-google-fonts/share-tech-mono';
import { useFonts as useVT323, VT323_400Regular } from '@expo-google-fonts/vt323';
import { useFonts as usePressStart2P, PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import theme from '../styles/theme';

const GREEN = '#00FF00';

export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  // Load all retro fonts
  const [orbitronLoaded] = useOrbitron({ Orbitron_700Bold });
  const [shareTechMonoLoaded] = useShareTechMono({ ShareTechMono_400Regular });
  const [vt323Loaded] = useVT323({ VT323_400Regular });
  const [pressStart2PLoaded] = usePressStart2P({ PressStart2P_400Regular });
  const allFontsLoaded = orbitronLoaded && shareTechMonoLoaded && vt323Loaded && pressStart2PLoaded;

  useEffect(() => {
    if (success) {
      // One‑time seed of exercises from JSON after migrations
      setIsSeeding(true);
      db.select().from(schema.exercises)
        .then(async (rows) => {
          const count = rows.length;
          console.log('[Drizzle] exercises table row count:', count);
          if (count === 0) {
            const now = new Date().toISOString();
            const seedRows = (exerciseList.exercises || [])
              .filter(ex => !ex.name?.toLowerCase().includes('variation'))
              .map((ex) => ({
                name: ex.name,
                category: Array.isArray(ex.categories) ? ex.categories.join(', ') : '',
                muscle_group: Array.isArray(ex.muscle_groups) ? ex.muscle_groups.join(', ') : '',
                is_custom: 0,
                created_at: now,
              }));
            try {
              await db.insert(schema.exercises).values(seedRows);
              console.log(`[Drizzle] Seeded ${seedRows.length} exercises from JSON.`);
            } catch (err) {
              console.error('[Drizzle] Error seeding exercises:', err);
              setSeedError('Failed to seed exercise database');
            }
          }
        })
        .catch((err) => {
          console.error('[Drizzle] Error counting exercises:', err);
          setSeedError('Failed to initialize database');
        })
        .finally(() => {
          setIsSeeding(false);
        });
    }
  }, [success]);

  if (!allFontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={{ color: GREEN, fontFamily: theme.fonts.body, fontSize: 16, marginTop: 20, letterSpacing: 1 }}>
          LOADING RETRO FONTS...
        </Text>
      </View>
    );
  }

  // Error states
  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: '#FF4444', fontFamily: theme.fonts.heading, fontSize: 16, textAlign: 'center', marginBottom: 20 }}>
          DATABASE MIGRATION ERROR
        </Text>
        <Text style={{ color: GREEN, fontFamily: theme.fonts.body, fontSize: 12, textAlign: 'center', opacity: 0.8 }}>
          {error.message}
        </Text>
        <Text style={{ color: GREEN, fontFamily: theme.fonts.body, fontSize: 10, textAlign: 'center', marginTop: 20, opacity: 0.6 }}>
          Please restart the app or contact support
        </Text>
      </View>
    );
  }

  if (!success || isSeeding) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={{ color: GREEN, fontFamily: theme.fonts.body, fontSize: 14, marginTop: 20, letterSpacing: 1 }}>
          {isSeeding ? 'INITIALIZING DATABASE...' : 'MIGRATING DATABASE...'}
        </Text>
      </View>
    );
  }

  if (seedError) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: '#FF4444', fontFamily: theme.fonts.heading, fontSize: 16, textAlign: 'center', marginBottom: 20 }}>
          DATABASE INITIALIZATION ERROR
        </Text>
        <Text style={{ color: GREEN, fontFamily: theme.fonts.body, fontSize: 12, textAlign: 'center', opacity: 0.8 }}>
          {seedError}
        </Text>
        <Text style={{ color: GREEN, fontFamily: theme.fonts.body, fontSize: 10, textAlign: 'center', marginTop: 20, opacity: 0.6 }}>
          Please restart the app
        </Text>
      </View>
    );
  }

  return (
    <WorkoutSessionProvider>
      <Stack />
    </WorkoutSessionProvider>
  );
} 