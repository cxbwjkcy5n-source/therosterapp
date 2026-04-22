import 'react-native-reanimated';
import React, { useEffect } from 'react';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SystemBars } from 'react-native-edge-to-edge';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { COLORS } from '@/constants/Colors';

const DevErrorBoundary = __DEV__
  ? ErrorBoundary
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

const NewlyDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: COLORS.background,
    card: COLORS.surface,
    text: COLORS.text,
    border: COLORS.border,
    primary: COLORS.primary,
  },
};

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <DevErrorBoundary>
      <StatusBar style="light" animated />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider value={NewlyDarkTheme}>
            <AuthProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="auth-screen" options={{ headerShown: false }} />
                <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
                <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
                <Stack.Screen
                  name="person/[id]"
                  options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: COLORS.background },
                    headerTintColor: COLORS.text,
                    headerShadowVisible: false,
                    title: '',
                  }}
                />
                <Stack.Screen
                  name="coach"
                  options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: COLORS.background },
                    headerTintColor: COLORS.text,
                    headerShadowVisible: false,
                    title: 'Dating Coach',
                  }}
                />
                <Stack.Screen
                  name="analytics"
                  options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: COLORS.background },
                    headerTintColor: COLORS.text,
                    headerShadowVisible: false,
                    title: 'Insights',
                  }}
                />
                <Stack.Screen
                  name="add-person"
                  options={{
                    presentation: 'formSheet',
                    sheetGrabberVisible: true,
                    sheetAllowedDetents: [1.0],
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="bench-reason"
                  options={{
                    presentation: 'formSheet',
                    sheetGrabberVisible: true,
                    sheetAllowedDetents: [0.5],
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="date-have"
                  options={{
                    presentation: 'formSheet',
                    sheetGrabberVisible: true,
                    sheetAllowedDetents: [1.0],
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="date-plan"
                  options={{
                    presentation: 'formSheet',
                    sheetGrabberVisible: true,
                    sheetAllowedDetents: [1.0],
                    headerShown: false,
                  }}
                />
                <Stack.Screen
                  name="date-safety"
                  options={{
                    presentation: 'formSheet',
                    sheetGrabberVisible: true,
                    sheetAllowedDetents: [1.0],
                    headerShown: false,
                  }}
                />
              </Stack>
              <SystemBars style="light" />
            </AuthProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </DevErrorBoundary>
  );
}
