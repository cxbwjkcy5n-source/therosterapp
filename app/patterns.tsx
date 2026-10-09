import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Brain } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { apiPost } from '@/utils/api';

interface Pattern {
  type: string;
  title: string;
  description: string;
  insight: string;
}

interface PatternsResponse {
  patterns: Pattern[];
  summary: string;
}

function PatternSkeleton({ colors }: { colors: any }) {
  return (
    <View style={{ gap: 12 }}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 18,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 10,
          }}
        >
          <View style={{ width: 70, height: 22, backgroundColor: colors.surfaceSecondary, borderRadius: 8 }} />
          <View style={{ width: '80%', height: 18, backgroundColor: colors.surfaceSecondary, borderRadius: 6 }} />
          <View style={{ width: '100%', height: 14, backgroundColor: colors.surfaceSecondary, borderRadius: 6 }} />
          <View style={{ width: '90%', height: 14, backgroundColor: colors.surfaceSecondary, borderRadius: 6 }} />
          <View style={{ width: '100%', height: 48, backgroundColor: colors.surfaceSecondary, borderRadius: 10 }} />
        </View>
      ))}
    </View>
  );
}

function getTypeBadgeStyle(type: string): { bg: string; text: string; label: string } {
  switch (type) {
    case 'attraction':
      return { bg: 'rgba(236,72,153,0.12)', text: '#EC4899', label: 'Attraction' };
    case 'gap':
      return { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B', label: 'Gap' };
    case 'strength':
      return { bg: 'rgba(34,197,94,0.12)', text: '#22C55E', label: 'Strength' };
    case 'warning':
      return { bg: 'rgba(239,68,68,0.12)', text: '#EF4444', label: 'Warning' };
    default:
      return { bg: 'rgba(99,102,241,0.12)', text: '#6366F1', label: type };
  }
}

export default function PatternsScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PatternsResponse | null>(null);
  const [lastAnalyzed, setLastAnalyzed] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    console.log('[Patterns] Analyze button pressed');
    setLoading(true);
    setError(null);
    try {
      const res = await apiPost<PatternsResponse>('/api/ai/patterns', {});
      console.log('[Patterns] Patterns loaded, count:', res.patterns?.length ?? 0);
      setData(res);
      setLastAnalyzed(new Date());
    } catch (e: any) {
      console.error('[Patterns] Failed to load patterns:', e);
      setError('Could not analyze patterns. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const lastAnalyzedText = lastAnalyzed
    ? lastAnalyzed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => {
            console.log('[Patterns] Back button pressed');
            router.back();
          }}
          hitSlop={8}
          style={{ padding: 4 }}
        >
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>
            Your Patterns 🧠
          </Text>
          {lastAnalyzedText ? (
            <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 1 }}>
              Last analyzed at {lastAnalyzedText}
            </Text>
          ) : null}
        </View>
        <Brain size={22} color="#6366F1" />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Analyze button */}
        {!loading && (
          <Pressable
            onPress={handleAnalyze}
            style={{
              backgroundColor: '#6366F1',
              borderRadius: 14,
              paddingVertical: 15,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Brain size={18} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
              {data ? 'Re-Analyze' : 'Analyze My Patterns'}
            </Text>
          </Pressable>
        )}

        {error ? (
          <View
            style={{
              backgroundColor: 'rgba(239,68,68,0.08)',
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: 'rgba(239,68,68,0.2)',
            }}
          >
            <Text style={{ color: '#EF4444', fontSize: 14 }}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <>
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <ActivityIndicator color="#6366F1" />
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 8 }}>
                Analyzing your dating patterns...
              </Text>
            </View>
            <PatternSkeleton colors={colors} />
          </>
        ) : data ? (
          <>
            {/* Summary card */}
            <View
              style={{
                borderRadius: 16,
                padding: 18,
                backgroundColor: '#6366F1',
                gap: 6,
              }}
            >
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                Summary
              </Text>
              <Text style={{ color: '#fff', fontSize: 15, lineHeight: 22 }}>
                {data.summary}
              </Text>
            </View>

            {/* Pattern cards */}
            {data.patterns.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>🧠</Text>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 6 }}>
                  No patterns found
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>
                  Add at least 3 people to your roster to unlock pattern insights.
                </Text>
              </View>
            ) : (
              data.patterns.map((pattern, index) => {
                const badge = getTypeBadgeStyle(pattern.type);
                return (
                  <View
                    key={index}
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 16,
                      padding: 18,
                      borderWidth: 1,
                      borderColor: colors.border,
                      gap: 10,
                    }}
                  >
                    {/* Type badge */}
                    <View
                      style={{
                        backgroundColor: badge.bg,
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        alignSelf: 'flex-start',
                      }}
                    >
                      <Text style={{ color: badge.text, fontSize: 12, fontWeight: '700' }}>
                        {badge.label}
                      </Text>
                    </View>

                    {/* Title */}
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>
                      {pattern.title}
                    </Text>

                    {/* Description */}
                    <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
                      {pattern.description}
                    </Text>

                    {/* Insight callout */}
                    <View
                      style={{
                        backgroundColor: badge.bg,
                        borderRadius: 10,
                        padding: 12,
                        borderLeftWidth: 3,
                        borderLeftColor: badge.text,
                      }}
                    >
                      <Text style={{ color: colors.textTertiary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
                        Insight
                      </Text>
                      <Text style={{ color: colors.text, fontSize: 13, lineHeight: 19 }}>
                        {pattern.insight}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </>
        ) : (
          /* Empty / pre-analyze state */
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Text style={{ fontSize: 56, marginBottom: 16 }}>🧠</Text>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' }}>
              Discover Your Patterns
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 21, paddingHorizontal: 20 }}>
              Add at least 3 people to your roster to unlock pattern insights.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
