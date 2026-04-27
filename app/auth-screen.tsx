import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Redirect, router } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function AppleLogo({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
    </Svg>
  );
}

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" fill="#FFC107" />
      <Path d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" fill="#FF3D00" />
      <Path d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" fill="#4CAF50" />
      <Path d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" fill="#1976D2" />
    </Svg>
  );
}

export default function AuthScreen() {
  const { user, loading, signInWithEmail, signUpWithEmail, signInWithApple, signInWithGoogle } = useAuth();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'apple' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      console.log('[Auth] User logged in, redirecting to home');
      router.replace('/(tabs)/(home)');
    }
  }, [user]);

  if (user) return <Redirect href="/(tabs)/(home)" />;

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (mode === 'signup' && password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    console.log('[Auth] Email auth attempt, mode:', mode);
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
        console.log('[Auth] Sign in successful');
      } else {
        await signUpWithEmail(email.trim(), password, name.trim() || undefined);
        console.log('[Auth] Sign up successful');
      }
    } catch (e: any) {
      console.error('[Auth] Email auth failed:', e);
      const msg = e?.message || '';
      if (msg.includes('Invalid email') || msg.includes('invalid_email')) {
        setError('Please enter a valid email address.');
      } else if (msg.includes('password') || msg.includes('credentials')) {
        setError('Incorrect email or password. Please try again.');
      } else if (msg.includes('already exists') || msg.includes('already registered')) {
        setError('An account with this email already exists. Try signing in.');
      } else {
        setError(msg || 'Authentication failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleApple = async () => {
    console.log('[Auth] Apple sign in pressed');
    setSocialLoading('apple');
    setError(null);
    try {
      await signInWithApple();
      console.log('[Auth] Apple sign in successful');
    } catch (e: any) {
      console.error('[Auth] Apple sign in failed:', e);
      if (e?.message !== 'Authentication cancelled') {
        setError(e?.message || 'Apple sign in failed. Please try again.');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleGoogle = async () => {
    console.log('[Auth] Google sign in pressed');
    setSocialLoading('google');
    setError(null);
    try {
      await signInWithGoogle();
      console.log('[Auth] Google sign in successful');
    } catch (e: any) {
      console.error('[Auth] Google sign in failed:', e);
      if (e?.message !== 'Authentication cancelled') {
        setError(e?.message || 'Google sign in failed. Please try again.');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const isSignIn = mode === 'signin';
  const buttonLabel = isSignIn ? 'Sign in' : 'Create account';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 32,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 22,
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              shadowColor: COLORS.primary,
              shadowOpacity: 0.2,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 8 },
              borderWidth: 1,
              borderColor: 'rgba(232,25,44,0.15)',
            }}
          >
            <Image
              source={require('../assets/images/34921cf2-8b2e-4abd-bfd8-c61924bed58f.png')}
              style={{ width: 80, height: 80 }}
              resizeMode="contain"
            />
          </View>
          <Text
            style={{
              fontSize: 34,
              fontWeight: '800',
              color: COLORS.text,
              letterSpacing: -0.5,
              marginBottom: 6,
            }}
          >
            Roster
          </Text>
          <Text style={{ fontSize: 15, color: COLORS.textSecondary, letterSpacing: 0.2 }}>
            Your dating life, organized.
          </Text>
        </View>

        {/* Mode selector tabs */}
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 32 }}>
          <AnimatedPressable
            onPress={() => { console.log('[Auth] Switched to sign in mode'); setMode('signin'); setError(null); }}
            style={{
              flex: 1,
              paddingVertical: 18,
              paddingHorizontal: 24,
              borderRadius: 14,
              alignItems: 'center',
              backgroundColor: isSignIn ? COLORS.primary : COLORS.surface,
              borderWidth: 1.5,
              borderColor: isSignIn ? COLORS.primary : COLORS.border,
              shadowColor: isSignIn ? COLORS.primary : 'transparent',
              shadowOpacity: isSignIn ? 0.25 : 0,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
            }}
          >
            <Text style={{ color: isSignIn ? '#fff' : COLORS.textSecondary, fontWeight: '700', fontSize: 16 }}>
              Sign In
            </Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => { console.log('[Auth] Switched to create account mode'); setMode('signup'); setError(null); }}
            style={{
              flex: 1,
              paddingVertical: 18,
              paddingHorizontal: 24,
              borderRadius: 14,
              alignItems: 'center',
              backgroundColor: !isSignIn ? COLORS.primary : COLORS.surface,
              borderWidth: 1.5,
              borderColor: !isSignIn ? COLORS.primary : COLORS.border,
              shadowColor: !isSignIn ? COLORS.primary : 'transparent',
              shadowOpacity: !isSignIn ? 0.25 : 0,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
            }}
          >
            <Text style={{ color: !isSignIn ? '#fff' : COLORS.textSecondary, fontWeight: '700', fontSize: 16 }}>
              Create Account
            </Text>
          </AnimatedPressable>
        </View>

        {/* Form */}
        <View style={{ gap: 14, marginBottom: 20 }}>
          {!isSignIn && (
            <View>
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 7 }}>
                Name
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={COLORS.textTertiary}
                autoCapitalize="words"
                style={{
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  color: COLORS.text,
                  fontSize: 15,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              />
            </View>
          )}

          <View>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 7 }}>
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                color: COLORS.text,
                fontSize: 15,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            />
          </View>

          <View>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 7 }}>
              Password
            </Text>
            <View style={{ position: 'relative' }}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textTertiary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={{
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  paddingRight: 52,
                  color: COLORS.text,
                  fontSize: 15,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              />
              <Pressable
                onPress={() => {
                  console.log('[Auth] Toggle password visibility');
                  setShowPassword(!showPassword);
                }}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: 0,
                  bottom: 0,
                  justifyContent: 'center',
                }}
              >
                {showPassword ? (
                  <EyeOff size={18} color={COLORS.textTertiary} />
                ) : (
                  <Eye size={18} color={COLORS.textTertiary} />
                )}
              </Pressable>
            </View>
          </View>

          {isSignIn && (
            <Pressable
              onPress={() => {
                console.log('[Auth] Forgot password pressed');
                Alert.alert('Forgot Password', 'Password reset coming soon.');
              }}
              style={{ alignSelf: 'flex-end', marginTop: 4, marginBottom: 4 }}
            >
              <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '500' }}>Forgot your password?</Text>
            </Pressable>
          )}
        </View>

        {error ? (
          <View
            style={{
              backgroundColor: COLORS.dangerMuted,
              borderRadius: 12,
              padding: 13,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: 'rgba(232,25,44,0.25)',
            }}
          >
            <Text style={{ color: COLORS.danger, fontSize: 13, lineHeight: 18 }}>{error}</Text>
          </View>
        ) : null}

        <AnimatedPressable
          onPress={handleEmailAuth}
          disabled={submitting}
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            marginBottom: 24,
            shadowColor: COLORS.primary,
            shadowOpacity: 0.35,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 4 },
          }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 }}>{buttonLabel}</Text>
          )}
        </AnimatedPressable>

        {/* Divider */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
          <Text style={{ color: COLORS.textTertiary, fontSize: 13, marginHorizontal: 12 }}>
            or continue with
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: COLORS.border }} />
        </View>

        {/* Social buttons */}
        <View style={{ gap: 12 }}>
          <AnimatedPressable
            onPress={handleApple}
            disabled={socialLoading !== null}
            style={{
              backgroundColor: '#000',
              borderRadius: 14,
              paddingVertical: 15,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
            }}
          >
            {socialLoading === 'apple' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <AppleLogo size={20} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
                  Continue with Apple
                </Text>
              </>
            )}
          </AnimatedPressable>

          <AnimatedPressable
            onPress={handleGoogle}
            disabled={socialLoading !== null}
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 14,
              paddingVertical: 15,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            {socialLoading === 'google' ? (
              <ActivityIndicator color={COLORS.text} size="small" />
            ) : (
              <>
                <GoogleLogo size={20} />
                <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '600' }}>
                  Continue with Google
                </Text>
              </>
            )}
          </AnimatedPressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
