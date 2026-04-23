import 'react-native-reanimated';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import { Redirect, Stack, router, useSegments, useRouter } from 'expo-router';
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
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textScale = useRef(new Animated.Value(0.4)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
        // Phase 3 (1400–2200ms): hold then fade entire splash out
        setTimeout(() => {
          Animated.timing(screenOpacity, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }).start(() => onDone());
        }, 600);
      });
    });
  }, [textOpacity, textScale, screenOpacity, imageOpacity, onDone]);

  return (
    <Animated.View style={[styles.splashContainer, { opacity: screenOpacity }]}>
      <Animated.Image
        source={require('../assets/images/63013054-0171-449a-99c7-6c7734be3ef4.jpeg')}
        style={[StyleSheet.absoluteFillObject, { opacity: imageOpacity }]}
        resizeMode="cover"
      />
      <Animated.Text
        style={[
          styles.splashTitle,
          {
            opacity: textOpacity,
            transform: [{ scale: textScale }],
          },
        ]}
      >
        The Roster
      </Animated.Text>
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
                        <Pressable onPress={() => router.back()} style={{ paddingRight: 8 }}>
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
