import 'react-native-reanimated';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import { Stack, router, useSegments } from 'expo-router';
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

function CustomSplash({ onDone }: { onDone: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    // Fade in over 500ms, hold 800ms, fade out over 500ms
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.delay(800),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDone();
    });
  }, [opacity, onDone]);

  return (
    <Animated.View style={[styles.splashContainer, { opacity }]}>
      <Animated.Image
        source={require('../assets/images/e3a34f91-42cb-494c-a1c0-3dffd2f0d0fe.jpeg')}
        style={styles.splashLogo}
        resizeMode="cover"
      />
      <Text style={styles.splashTitle}>The Roster</Text>
    </Animated.View>
  );
}

function AppContent({ showSplash, onSplashDone }: { showSplash: boolean; onSplashDone: () => void }) {
  const { user, loading } = useAuth();
  const segments = useSegments();

  // Show red placeholder while splash is playing OR while auth is still loading
  const showPlaceholder = showSplash || loading;

  // Once auth resolves and we're on a protected route with no user, redirect
  useEffect(() => {
    if (loading || showSplash) return;
    const currentRoute = segments[0] ?? '';
    const isPublicRoute = PUBLIC_ROUTES.includes(currentRoute);
    if (!user && !isPublicRoute) {
      console.log('[AppContent] No user on protected route, redirecting to auth-screen');
      router.replace('/auth-screen');
    }
  }, [user, loading, showSplash, segments]);

  return (
    <>
      {showPlaceholder ? (
        <View style={{ flex: 1, backgroundColor: '#E53935' }} />
      ) : (
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
          <Stack screenOptions={{ headerShown: false, headerBackTitle: '' }}>
            <Stack.Screen name="auth-screen" options={{ headerShown: false }} />
            <Stack.Screen name="auth-popup" options={{ headerShown: false }} />
            <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false, headerBackTitle: '', title: '' }} />
            <Stack.Screen
              name="person/[id]"
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: COLORS.background },
                headerTintColor: COLORS.text,
                headerShadowVisible: false,
                title: '',
                headerBackTitle: '',
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
                headerBackTitle: '',
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
                headerBackTitle: '',
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
                headerBackTitle: '',
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
                headerBackTitle: '',
                presentation: 'modal',
                headerLeft: () => (
                  <Pressable onPress={() => { console.log('[add-person] Cancel pressed'); router.back(); }} style={{ paddingRight: 8 }}>
                    <Text style={{ color: COLORS.primary, fontSize: 16 }}>Cancel</Text>
                  </Pressable>
                ),
              }}
            />
            <Stack.Screen
              name="bench-reason"
              options={{
                presentation: 'formSheet',
                sheetGrabberVisible: true,
                sheetAllowedDetents: [0.75],
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
            <Stack.Screen
              name="reminders"
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: COLORS.background },
                headerTintColor: COLORS.text,
                headerShadowVisible: false,
                title: 'Reminders',
                headerBackTitle: '',
              }}
            />
            <Stack.Screen
              name="privacy"
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: '#FFFFFF' },
                headerTintColor: '#1A1A1A',
                headerShadowVisible: false,
                title: 'Privacy Policy',
                headerBackTitle: '',
              }}
            />
            <Stack.Screen
              name="legal"
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: '#FFFFFF' },
                headerTintColor: '#1A1A1A',
                headerShadowVisible: false,
                title: 'Terms & Conditions',
                headerBackTitle: '',
              }}
            />
          </Stack>
        </View>
      )}

      {showSplash && (
        <CustomSplash onDone={onSplashDone} />
      )}
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [showSplash, setShowSplash] = useState(true);

  if (!loaded) return null;

  return (
    <DevErrorBoundary>
      <StatusBar style="dark" animated />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ThemeProvider value={AppLightTheme}>
            <AuthProvider>
              <AppContent showSplash={showSplash} onSplashDone={() => setShowSplash(false)} />
              <SystemBars style="dark" />
            </AuthProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </DevErrorBoundary>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    zIndex: 999,
  },
  splashLogo: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  splashTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
