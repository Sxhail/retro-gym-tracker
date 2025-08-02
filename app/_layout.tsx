import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useFonts as useOrbitron, Orbitron_700Bold } from '@expo-google-fonts/orbitron';
import { useFonts as usePressStart2P, PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { useFonts as useVT323, VT323_400Regular } from '@expo-google-fonts/vt323';
import { useFonts as useShareTechMono, ShareTechMono_400Regular } from '@expo-google-fonts/share-tech-mono';
import * as SplashScreen from 'expo-splash-screen';
import { DatabaseProvider } from '../context/DatabaseContext';
import { WorkoutSessionProvider } from '../context/WorkoutSessionContext';
import { initializeDatabase } from '../db/client';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function Layout() {
  const [orbitronLoaded] = useOrbitron({ Orbitron_700Bold });
  const [pressStart2PLoaded] = usePressStart2P({ PressStart2P_400Regular });
  const [vt323Loaded] = useVT323({ VT323_400Regular });
  const [shareTechMonoLoaded] = useShareTechMono({ ShareTechMono_400Regular });
  
  const fontsLoaded = orbitronLoaded && pressStart2PLoaded && vt323Loaded && shareTechMonoLoaded;

  useEffect(() => {
    if (fontsLoaded) {
      // Initialize database when fonts are loaded
      initializeDatabase().catch(console.error);
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);



  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DatabaseProvider>
        <WorkoutSessionProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'none',
            }}
          />
        </WorkoutSessionProvider>
      </DatabaseProvider>
    </GestureHandlerRootView>
  );
} 