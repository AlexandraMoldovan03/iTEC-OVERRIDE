/**
 * app/_layout.tsx
 * Root layout — restaurează sesiunea și pre-încarcă toate imaginile statice
 * (badge-uri echipe, butoane) înainte de a randa orice ecran.
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/stores/authStore';
import { usePreloadImages } from '../src/hooks/usePreloadImages';

export default function RootLayout() {
  const { restoreSession } = useAuthStore();

  // Pre-încarcă badge-urile echipelor și butoanele imagine
  // (nu blocăm randarea — imginile se pregătesc în background)
  usePreloadImages();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
        <Stack.Screen name="poster/[id]" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="scanner" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
