import 'react-native-reanimated';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

const PHRASES = [
  "Keeping up with everyone shouldn't be this hard.",
  "Because remembering everything isn't realistic.",
  "Stay organized without overthinking it.",
  "Your dating life, without the confusion.",
  "Because details matter—and they add up.",
  "Keep track without the stress.",
  "Everything you need to remember, in one place.",
  'Because "wait, what did we talk about?" happens too often.',
  "Stay on top of it all, effortlessly.",
  "Because mixing things up is not the move.",
  "Stay in control of your dating life.",
  "Move with intention, not confusion.",
  "Know where you stand—every time.",
  "Be clear about what you want.",
  "Keep your standards high and your details straight.",
  "Make better decisions with better clarity.",
  "Stay organized. Stay intentional.",
  "You're allowed to keep things simple.",
  "Clarity changes everything.",
  "Date smarter, not harder.",
  "Don't get your stories crossed.",
  "Keep your options clear.",
  "Confusion is a choice.",
  "Stop guessing—know what's going on.",
  "Not everyone deserves a callback.",
  "If you're juggling, at least do it right.",
  "Keep it together—or it gets messy.",
  "Details matter… especially the ones you forget.",
  "Stay sharp or get played.",
  "Know the difference between interest and convenience.",
];

function CustomSplash({ onDone }: { onDone: () => void }) {
  const phrase = useRef(PHRASES[Math.floor(Math.random() * PHRASES.length)]).current;

  // Animation values — stable refs, safe to omit from deps
  const screenOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const phraseOpacity = useRef(new Animated.Value(0)).current;

  const stableOnDone = useCallback(onDone, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});

    Animated.sequence([
      // 1. Fade in the red screen
      Animated.timing(screenOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      // 2. Logo scales up + fades in simultaneously
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
      // 3. Phrase fades in
      Animated.timing(phraseOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // 4. Hold for 1.8s
      Animated.delay(1800),
      // 5. Fade everything out
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      stableOnDone();
    });
  }, [stableOnDone]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Animated.View style={[styles.splashContainer, { opacity: screenOpacity }]}>
      <Animated.Image
        source={require('../assets/images/dc34b019-a8ac-4275-9753-e1726a517bc0.jpeg')}
        style={[styles.splashLogo, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
        resizeMode="contain"
      />
      <Text style={styles.splashTitle}>The Roster</Text>
      <Animated.Text style={[styles.splashPhrase, { opacity: phraseOpacity }]}>
        {phrase}
      </Animated.Text>
    </Animated.View>
  );
}

function AppContent({ showSplash, onSplashDone }: { showSplash: boolean; onSplashDone: () => void }) {
  const { user, loading, isReady } = useAuth();
  const segments = useSegments();

  // Show red placeholder while splash is playing OR while auth is still loading
  const showPlaceholder = showSplash || loading;

  // Safety net: only runs on initial load (when isReady first becomes true)
  // Handles: already-logged-in user opening app, or unauthenticated user on protected route
  useEffect(() => {
    if (!isReady || showSplash) return;

    const currentRoute = segments[0] ?? '';
    const isPublicRoute = PUBLIC_ROUTES.includes(currentRoute);

    if (user && isPublicRoute) {
      console.log('[AppContent] Already logged in, redirecting to home');
      router.replace('/(tabs)/(home)');
    } else if (!user && !isPublicRoute) {
      console.log('[AppContent] No session on protected route, redirecting to auth');
      router.replace('/auth-screen');
    }
  }, [isReady, showSplash]); // Only run when isReady or showSplash changes — NOT on user changes

  return (
    <>
      {!showPlaceholder && (
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
              name="share-profile"
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: COLORS.background },
                headerTintColor: COLORS.text,
                headerShadowVisible: false,
                title: 'My Share Code',
                headerBackTitle: '',
              }}
            />
            <Stack.Screen
              name="scan-code"
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: COLORS.background },
                headerTintColor: COLORS.text,
                headerShadowVisible: false,
                title: 'Scan Code',
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
      {showPlaceholder && <View style={{ flex: 1, backgroundColor: '#E53935' }} />}

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
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 20,
    zIndex: 999,
  },
  splashLogo: {
    width: 120,
    height: 120,
    borderRadius: 24,
  },
  splashTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  splashPhrase: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 26,
    marginTop: 8,
  },
});
