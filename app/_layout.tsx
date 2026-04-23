import 'react-native-reanimated';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
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
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textScale = useRef(new Animated.Value(0.4)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    SplashScreen.hideAsync();
    // Phase 1 (0–600ms): text fades in and grows
    Animated.parallel([
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(textScale, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Phase 2 (600–1400ms): crossfade text out, image in
      Animated.parallel([
        Animated.timing(imageOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Phase 3: hold 600ms then done (no fade — red placeholder behind makes it seamless)
        setTimeout(() => {
          onDone();
        }, 600);
      });
    });
  }, [textOpacity, textScale, imageOpacity, onDone]);

  return (
    <Animated.View style={styles.splashContainer}>
      {/* Phase 2 background image */}
      <Animated.Image
        source={require('../assets/images/63013054-0171-449a-99c7-6c7734be3ef4.jpeg')}
        style={[StyleSheet.absoluteFillObject, { opacity: imageOpacity }]}
        resizeMode="cover"
      />
      {/* Phase 1 logo + text */}
      <Animated.View
        style={{
          alignItems: 'center',
          gap: 20,
          opacity: textOpacity,
          transform: [{ scale: textScale }],
        }}
      >
        <Animated.Image
          source={require('../assets/images/e3a34f91-42cb-494c-a1c0-3dffd2f0d0fe.jpeg')}
          style={{
            width: 140,
            height: 140,
            borderRadius: 70,
            overflow: 'hidden',
          }}
          resizeMode="contain"
        />
        <Text style={styles.splashTitle}>The Roster</Text>
      </Animated.View>
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
        <CustomSplash onDone={() => requestAnimationFrame(onSplashDone)} />
      )}
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Clear any persisted navigation state so stale screens don't flash on launch
    AsyncStorage.removeItem('EXPO_ROUTER_STATE').catch(() => {});
    AsyncStorage.removeItem('NAVIGATION_STATE').catch(() => {});
  }, []);

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
    zIndex: 999,
  },
  splashTitle: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
});
