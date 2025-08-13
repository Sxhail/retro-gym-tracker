import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useFonts as useOrbitron, Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import { useFonts as usePressStart2P, PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { useFonts as useVT323, VT323_400Regular } from '@expo-google-fonts/vt323';
import { useFonts as useShareTechMono, ShareTechMono_400Regular } from '@expo-google-fonts/share-tech-mono';
import * as SplashScreen from 'expo-splash-screen';
import { DatabaseProvider } from '../context/DatabaseContext';
import { WorkoutSessionProvider } from '../context/WorkoutSessionContext';
import { initializeDatabase, useDatabaseMigrations } from '../db/client';
import AppLayout from '../components/AppLayout';
import BackgroundWorkoutPersistence from '../components/BackgroundWorkoutPersistence';
import CustomSplashScreen from '../components/CustomSplashScreen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function Layout() {
  const [orbitronLoaded] = useOrbitron({ Orbitron_700Bold });
  const [pressStart2PLoaded] = usePressStart2P({ PressStart2P_400Regular });
  const [vt323Loaded] = useVT323({ VT323_400Regular });
  const [shareTechMonoLoaded] = useShareTechMono({ ShareTechMono_400Regular });
  
  const fontsLoaded = orbitronLoaded && pressStart2PLoaded && vt323Loaded && shareTechMonoLoaded;

  // Apply database migrations
  const { success: migrationsSuccess, error: migrationsError } = useDatabaseMigrations();

  // State to control native splash
  const [showNativeSplash, setShowNativeSplash] = useState(true);

  useEffect(() => {
    if (fontsLoaded && migrationsSuccess && !showNativeSplash) {
      // Initialize database when fonts are loaded, migrations are complete, and splash is done
      initializeDatabase().catch(console.error);
      SplashScreen.hideAsync();
    }
    
    if (migrationsError) {
      console.error('Database migration failed:', migrationsError);
    }
  }, [fontsLoaded, migrationsSuccess, migrationsError, showNativeSplash]);

  // Show native splash screen first
  if (showNativeSplash) {
    return (
      <CustomSplashScreen
        onFinish={() => setShowNativeSplash(false)}
        duration={1500}
      />
    );
  }

  if (!fontsLoaded || !migrationsSuccess) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DatabaseProvider>
        <WorkoutSessionProvider>
          <BackgroundWorkoutPersistence>
            <AppLayout>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'none',
                }}
              />
            </AppLayout>
          </BackgroundWorkoutPersistence>
        </WorkoutSessionProvider>
      </DatabaseProvider>
    </GestureHandlerRootView>
  );
} 