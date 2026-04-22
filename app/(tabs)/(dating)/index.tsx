import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Animated } from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import {
  Calendar,
  Sparkles,
  Shield,
  MessageCircle,
  MoreHorizontal,
  Heart,
  Users,
  Star,
  TrendingUp,
} from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { apiGet } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

interface Analytics {
  total_active?: number;
  total_dates?: number;
  avg_interest_level?: number;
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        gap: 6,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: color + '20',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: COLORS.textSecondary, fontSize: 11, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
  onPress: () => void;
}

function ActionCard({ title, description, icon, accentColor, onPress }: ActionCardProps) {
  return (
    <AnimatedPressable onPress={onPress} style={{ flex: 1 }}>
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          padding: 18,
          borderWidth: 1,
          borderColor: COLORS.border,
          gap: 10,
          minHeight: 130,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: accentColor + '20',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </View>
        <View>
          <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 3 }}>
            {title}
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12, lineHeight: 17 }}>
            {description}
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default function DatingScreen() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<Analytics>({});
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      console.log('[Dating] Loading analytics');
      apiGet<Analytics>('/api/analytics')
        .then((data) => {
          console.log('[Dating] Analytics loaded');
          setAnalytics(data);
          Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        })
        .catch((e) => console.error('[Dating] Failed to load analytics:', e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user])
  );

  const totalActive = analytics.total_active ?? 0;
  const totalDates = analytics.total_dates ?? 0;
  const avgInterest = analytics.avg_interest_level ? Number(analytics.avg_interest_level).toFixed(1) : '—';

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen
        options={{
          title: 'Dating',
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 8, marginRight: 4 }}>
              <AnimatedPressable
                onPress={() => {
                  console.log('[Dating] Analytics pressed');
                  router.push('/analytics');
                }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: COLORS.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Heart size={18} color={COLORS.primary} />
              </AnimatedPressable>
              <AnimatedPressable
                onPress={() => console.log('[Dating] Menu pressed')}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: COLORS.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MoreHorizontal size={18} color={COLORS.textSecondary} />
              </AnimatedPressable>
            </View>
          ),
        }}
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 20 }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
            Overview
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <StatCard
              label="Active"
              value={totalActive}
              icon={<Users size={18} color={COLORS.primary} />}
              color={COLORS.primary}
            />
            <StatCard
              label="Dates"
              value={totalDates}
              icon={<Calendar size={18} color={COLORS.accent} />}
              color={COLORS.accent}
            />
            <StatCard
              label="Avg Interest"
              value={avgInterest}
              icon={<Star size={18} color={COLORS.success} />}
              color={COLORS.success}
            />
          </View>
        </Animated.View>

        {/* Action cards */}
        <View>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
            Actions
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
            <ActionCard
              title="I Have a Date"
              description="Log an upcoming date"
              icon={<Calendar size={22} color={COLORS.primary} />}
              accentColor={COLORS.primary}
              onPress={() => {
                console.log('[Dating] I Have a Date pressed');
                router.push('/date-have');
              }}
            />
            <ActionCard
              title="Plan a Date"
              description="AI-powered date ideas"
              icon={<Sparkles size={22} color={COLORS.accent} />}
              accentColor={COLORS.accent}
              onPress={() => {
                console.log('[Dating] Plan a Date pressed');
                router.push('/date-plan');
              }}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <ActionCard
              title="I'm on a Date"
              description="Safety check-in"
              icon={<Shield size={22} color={COLORS.success} />}
              accentColor={COLORS.success}
              onPress={() => {
                console.log('[Dating] Safety check-in pressed');
                router.push('/date-safety');
              }}
            />
            <ActionCard
              title="Dating Coach"
              description="AI relationship advice"
              icon={<MessageCircle size={22} color="#A855F7" />}
              accentColor="#A855F7"
              onPress={() => {
                console.log('[Dating] Dating Coach pressed');
                router.push('/coach');
              }}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
