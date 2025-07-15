import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { initializeDatabase } from '../db/initDb';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initializeDatabase();
        if (!cancelled) setDbReady(true);
      } catch (err: any) {
        setDbError(err?.message || 'Database initialization failed');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!loaded || !dbReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#050d07' }}>
        <ActivityIndicator size="large" color="#00ff99" />
        <Text style={{ color: '#00ff99', fontFamily: 'SpaceMono', fontSize: 22, marginTop: 16 }}>Loading...</Text>
        {dbError && <Text style={{ color: 'red', marginTop: 12 }}>{dbError}</Text>}
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="newworkout" options={{ presentation: 'modal', title: 'New Workout' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
