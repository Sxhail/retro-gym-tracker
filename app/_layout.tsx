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
import RandomSplashScreen from '../components/RandomSplashScreen';

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

  // State to track if minimum splash time has elapsed
  const [splashTimeElapsed, setSplashTimeElapsed] = useState(false);
  
  // State to control our custom random splash screen
  const [showRandomSplash, setShowRandomSplash] = useState(true);

  // Start 3-second timer when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashTimeElapsed(true);
    }, 3000); // 3 seconds

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (fontsLoaded && migrationsSuccess && splashTimeElapsed) {
      // Initialize database when fonts are loaded, migrations are complete, and 3 seconds have passed
      initializeDatabase().catch(console.error);
      SplashScreen.hideAsync();
    }
    
    if (migrationsError) {
      console.error('Database migration failed:', migrationsError);
    }
  }, [fontsLoaded, migrationsSuccess, migrationsError, splashTimeElapsed]);

  // Show random splash screen if everything is ready but we haven't finished the custom splash
  if (fontsLoaded && migrationsSuccess && splashTimeElapsed && showRandomSplash) {
    return (
      <RandomSplashScreen
        onFinish={() => setShowRandomSplash(false)}
        duration={2500}
      />
    );
  }



  if (!fontsLoaded || !migrationsSuccess || !splashTimeElapsed || showRandomSplash) {
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