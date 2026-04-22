import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { apiGet } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Analytics {
  total_active?: number;
  total_benched?: number;
  total_dates?: number;
  avg_interest_level?: number;
  avg_attractiveness?: number;
  avg_communication?: number;
  connection_breakdown?: { type: string; count: number }[];
  top_hobbies?: { hobby: string; count: number }[];
  top_foods?: { food: string; count: number }[];
  interest_distribution?: { low: number; medium: number; high: number };
  zodiac_breakdown?: { zodiac: string; count: number }[];
}

const ZODIAC_EMOJIS: Record<string, string> = {
  aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋',
  leo: '♌', virgo: '♍', libra: '♎', scorpio: '♏',
  sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓',
};

const CONNECTION_LABELS: Record<string, string> = {
  friend: 'Friend', casual: 'Casual', booty_call: 'Booty Call',
  foodie_call: 'Foodie Call', figuring_it_out: 'Figuring It Out',
  serious: 'Serious', other: 'Other',
};

function ScoreCircle({ label, value, color }: { label: string; value?: number; color: string }) {
  const displayValue = value ? Number(value).toFixed(1) : '—';
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: color + '20',
          borderWidth: 3,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
        }}
      >
        <Text style={{ color, fontSize: 18, fontWeight: '800' }}>{displayValue}</Text>
      </View>
      <Text style={{ color: COLORS.textSecondary, fontSize: 12, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('[Analytics] Loading analytics');
    apiGet<Analytics>('/api/analytics')
      .then((data) => {
        console.log('[Analytics] Analytics loaded');
        setAnalytics(data);
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      })
      .catch((e) => {
        console.error('[Analytics] Failed to load:', e);
        setError('Could not load insights');
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (error || !analytics) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ color: COLORS.danger, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
          Couldn't load insights
        </Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: 'center' }}>
          Check your connection and try again
        </Text>
      </View>
    );
  }

  const interestDist = analytics.interest_distribution || { low: 0, medium: 0, high: 0 };
  const totalInterest = (interestDist.low || 0) + (interestDist.medium || 0) + (interestDist.high || 0);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen options={{ title: 'Insights' }} />
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 20 }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Overview */}
        <View>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 }}>
            Overview
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { label: 'Active', value: analytics.total_active ?? 0, color: COLORS.primary },
              { label: 'Benched', value: analytics.total_benched ?? 0, color: COLORS.accent },
              { label: 'Dates', value: analytics.total_dates ?? 0, color: COLORS.success },
            ].map((stat) => (
              <View
                key={stat.label}
                style={{
                  flex: 1,
                  backgroundColor: COLORS.surface,
                  borderRadius: 14,
                  padding: 14,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  gap: 4,
                }}
              >
                <Text style={{ color: stat.color, fontSize: 26, fontWeight: '800' }}>{stat.value}</Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Interest distribution */}
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 14 }}>
            Interest Distribution
          </Text>
          {[
            { label: 'Low (1-3)', value: interestDist.low || 0, color: COLORS.interestLow },
            { label: 'Medium (4-7)', value: interestDist.medium || 0, color: COLORS.interestMid },
            { label: 'High (8-10)', value: interestDist.high || 0, color: COLORS.interestHigh },
          ].map((bar) => {
            const pct = totalInterest > 0 ? (bar.value / totalInterest) * 100 : 0;
            const pctDisplay = pct.toFixed(0);
            return (
              <View key={bar.label} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>{bar.label}</Text>
                  <Text style={{ color: bar.color, fontSize: 13, fontWeight: '600' }}>
                    {bar.value} ({pctDisplay}%)
                  </Text>
                </View>
                <View style={{ height: 8, backgroundColor: COLORS.surfaceSecondary, borderRadius: 4, overflow: 'hidden' }}>
                  <View
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      backgroundColor: bar.color,
                      borderRadius: 4,
                    }}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* Average scores */}
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 16 }}>
            Average Scores
          </Text>
          <View style={{ flexDirection: 'row' }}>
            <ScoreCircle label="Attractiveness" value={analytics.avg_attractiveness} color={COLORS.primary} />
            <ScoreCircle label="Chemistry" value={analytics.avg_interest_level} color={COLORS.accent} />
            <ScoreCircle label="Communication" value={analytics.avg_communication} color={COLORS.success} />
          </View>
        </View>

        {/* Connection breakdown */}
        {analytics.connection_breakdown && analytics.connection_breakdown.length > 0 && (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 12 }}>
              Connection Types
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {analytics.connection_breakdown.map((item) => (
                <View
                  key={item.type}
                  style={{
                    backgroundColor: COLORS.primaryMuted,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>
                    {CONNECTION_LABELS[item.type] || item.type}
                  </Text>
                  <View
                    style={{
                      backgroundColor: COLORS.primary,
                      borderRadius: 10,
                      width: 20,
                      height: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{item.count}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Top hobbies */}
        {analytics.top_hobbies && analytics.top_hobbies.length > 0 && (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 12 }}>
              Top Hobbies
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {analytics.top_hobbies.map((item) => (
                <View
                  key={item.hobby}
                  style={{
                    backgroundColor: COLORS.primaryMuted,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  }}
                >
                  <Text style={{ color: COLORS.primary, fontSize: 13 }}>
                    {item.hobby} ({item.count})
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Top foods */}
        {analytics.top_foods && analytics.top_foods.length > 0 && (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 12 }}>
              Top Foods
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {analytics.top_foods.map((item) => (
                <View
                  key={item.food}
                  style={{
                    backgroundColor: COLORS.accentMuted,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  }}
                >
                  <Text style={{ color: COLORS.accent, fontSize: 13 }}>
                    {item.food} ({item.count})
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Zodiac breakdown */}
        {analytics.zodiac_breakdown && analytics.zodiac_breakdown.length > 0 && (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 12 }}>
              Zodiac Breakdown
            </Text>
            <View style={{ gap: 8 }}>
              {analytics.zodiac_breakdown.map((item) => (
                <View
                  key={item.zodiac}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 4,
                    borderBottomWidth: 1,
                    borderBottomColor: COLORS.divider,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 18 }}>{ZODIAC_EMOJIS[item.zodiac] || '⭐'}</Text>
                    <Text style={{ color: COLORS.text, fontSize: 14, textTransform: 'capitalize' }}>
                      {item.zodiac}
                    </Text>
                  </View>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' }}>
                    {item.count}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Animated.ScrollView>
    </View>
  );
}
