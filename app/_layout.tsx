// Entry imports for gesture-handler and reanimated are handled in index.js
import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts } from 'expo-font';
import {
  FiraCode_400Regular,
  FiraCode_500Medium,
  FiraCode_700Bold,
} from '@expo-google-fonts/fira-code';
import {
  SourceCodePro_400Regular,
  SourceCodePro_600SemiBold,
} from '@expo-google-fonts/source-code-pro';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from '@/contexts/LanguageContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'FiraCode-Regular': FiraCode_400Regular,
    'FiraCode-Medium': FiraCode_500Medium,
    'FiraCode-Bold': FiraCode_700Bold,
    'SourceCodePro-Regular': SourceCodePro_400Regular,
    'SourceCodePro-SemiBold': SourceCodePro_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
