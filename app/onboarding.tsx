import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { apiGet, apiPut } from '@/utils/api';

const STEPS = [
  {
    emoji: '👋',
    title: 'Welcome to Roster',
    description: 'Keep track of everyone you\'re dating in one organized place. No more mixing up details or forgetting important moments.',
    cta: 'Add Your First Person',
    route: '/add-person' as const,
  },
  {
    emoji: '📅',
    title: 'Log a Date',
    description: 'Record your dates, rate how they went, and build a history with each person. Your memory, upgraded.',
    cta: 'Log Your First Date',
    route: '/date-have' as const,
  },
  {
    emoji: '🎯',
    title: 'Set Your Vibe',
    description: 'Do a weekly check-in to reflect on your dating life, track your progress, and stay intentional about what you want.',
    cta: 'Do Your Weekly Check-in',
    route: '/weekly-checkin' as const,
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('[Onboarding] Checking onboarding state');
    apiGet<{ completed: boolean; step?: number }>('/api/onboarding/state')
      .then((state) => {
        console.log('[Onboarding] State loaded:', state);
        if (state?.completed) {
          console.log('[Onboarding] Already completed, redirecting to home');
          router.replace('/(tabs)/(home)');
          return;
        }
        const currentStep = state?.step ?? 0;
        setStep(Math.min(currentStep, STEPS.length - 1));
        setLoading(false);
      })
      .catch((e) => {
        console.log('[Onboarding] Could not load state (non-fatal):', e?.message);
        setLoading(false);
      });
  }, []);

  const animateToStep = (nextStep: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleCTA = async () => {
    const currentStep = STEPS[step];
    console.log('[Onboarding] CTA pressed for step:', step, currentStep.title);

    setSaving(true);
    try {
      await apiPut('/api/onboarding/state', { step: step + 1 });
      console.log('[Onboarding] Step saved:', step + 1);
    } catch (e) {
      console.log('[Onboarding] Could not save step (non-fatal):', e);
    } finally {
      setSaving(false);
    }

    // Navigate to the route for this step
    router.push(currentStep.route as any);

    // Advance to next step after a short delay
    setTimeout(() => {
      if (step < STEPS.length - 1) {
        animateToStep(step + 1);
      }
    }, 300);
  };

  const handleSkip = async () => {
    console.log('[Onboarding] Skip pressed at step:', step);
    if (step < STEPS.length - 1) {
      setSaving(true);
      try {
        await apiPut('/api/onboarding/state', { step: step + 1 });
      } catch (e) {
        console.log('[Onboarding] Could not save skip (non-fatal):', e);
      } finally {
        setSaving(false);
      }
      animateToStep(step + 1);
    } else {
      await handleComplete();
    }
  };

  const handleComplete = async () => {
    console.log('[Onboarding] Completing onboarding');
    setSaving(true);
    try {
      await apiPut('/api/onboarding/state', { completed: true });
      console.log('[Onboarding] Onboarding marked complete');
    } catch (e) {
      console.log('[Onboarding] Could not mark complete (non-fatal):', e);
    } finally {
      setSaving(false);
    }
    router.replace('/(tabs)/(home)');
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const currentStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;
  const progressPercent = ((step + 1) / STEPS.length) * 100;
  const progressPctStr = `${progressPercent}%`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Progress bar */}
      <View style={{ height: 3, backgroundColor: colors.border, marginTop: insets.top + 16, marginHorizontal: 24 }}>
        <View
          style={{
            height: 3,
            width: progressPctStr as any,
            backgroundColor: colors.primary,
            borderRadius: 2,
          }}
        />
      </View>

      {/* Step indicators */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 16 }}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === step ? 24 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: i === step ? colors.primary : colors.border,
            }}
          />
        ))}
      </View>

      {/* Content */}
      <Animated.View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <Text style={{ fontSize: 72, marginBottom: 24 }}>{currentStep.emoji}</Text>
        <Text
          style={{
            fontSize: 28,
            fontWeight: '800',
            color: colors.text,
            textAlign: 'center',
            marginBottom: 16,
            letterSpacing: -0.5,
          }}
        >
          {currentStep.title}
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: colors.textSecondary,
            textAlign: 'center',
            lineHeight: 24,
          }}
        >
          {currentStep.description}
        </Text>
      </Animated.View>

      {/* Bottom actions */}
      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 32, gap: 12 }}>
        <Pressable
          onPress={handleCTA}
          disabled={saving}
          style={{
            backgroundColor: colors.primary,
            borderRadius: 16,
            height: 56,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
              {currentStep.cta}
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={isLastStep ? handleComplete : handleSkip}
          style={{ alignItems: 'center', paddingVertical: 12 }}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 15, fontWeight: '500' }}>
            {isLastStep ? 'Get Started' : 'Skip for now'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
