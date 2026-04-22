import 'react-native-reanimated';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, StyleSheet, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import { Redirect, Stack, useSegments, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SystemBars } from 'react-native-edge-to-edge';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { COLORS } from '@/constants/Colors';

const DevErrorBoundary = __DEV__
  ? ErrorBoundary
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: 'auth-screen',
};

const AppLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background,
    card: COLORS.background,
    text: COLORS.text,
    border: COLORS.border,
    primary: COLORS.primary,
  },
};

// Auth-exempt routes — these are accessible without being logged in
const PUBLIC_ROUTES = ['auth-screen', 'auth-popup', 'auth-callback'];

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();

  const currentRoute = segments[0] ?? '';
  const isPublicRoute = PUBLIC_ROUTES.includes(currentRoute);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (!user && !isPublicRoute) {
    console.log('[AuthGuard] No user on protected route, redirecting to auth-screen');
    return <Redirect href="/auth-screen" />;
  }

  return <>{children}</>;
}

function CustomSplash({ onDone }: { onDone: () => void }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const screenFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade in logo + text
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      // Hold for ~1.4s then fade out the whole splash
      setTimeout(() => {
        Animated.timing(screenFade, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          onDone();
        });
      }, 1400);
    });
  }, [fadeAnim, screenFade, onDone]);

  return (
    <Animated.View style={[styles.splashContainer, { opacity: screenFade }]}>
      <Animated.View style={{ alignItems: 'center', opacity: fadeAnim }}>
        <Image
          source={require('../assets/images/6bd1ee8a-f98e-411c-802c-4efd62120bd2.jpeg')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
        <Text style={styles.splashTitle}>Roster Scout</Text>
      </Animated.View>
    </Animated.View>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <DevErrorBoundary>
      <StatusBar style="dark" animated />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider value={AppLightTheme}>
            <AuthProvider>
              <AuthGuard>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="auth-screen" options={{ headerShown: false }} />
                  <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
                  <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
                    name="date-review"
                    options={{
                      headerShown: true,
                      headerStyle: { backgroundColor: COLORS.background },
                      headerTintColor: COLORS.text,
                      headerShadowVisible: false,
                      title: 'Review Date',
                    }}
                  />
                  <Stack.Screen
                    name="add-person"
                    options={{
                      headerShown: true,
                      headerStyle: { backgroundColor: COLORS.background },
                      headerTintColor: COLORS.primary,
                      headerShadowVisible: false,
                      title: 'Add Person',
                      headerBackTitle: 'Back',
                      presentation: 'modal',
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
              </AuthGuard>
              <SystemBars style="dark" />
            </AuthProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>

      {showSplash && (
        <CustomSplash onDone={() => setShowSplash(false)} />
      )}
    </DevErrorBoundary>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  splashLogo: {
    width: 220,
    height: 220,
  },
  splashTitle: {
    marginTop: 20,
    fontSize: 28,
    fontWeight: '700',
    color: '#E53935',
    letterSpacing: -0.5,
  },
});
