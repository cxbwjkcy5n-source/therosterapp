import React, { useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Animated, useWindowDimensions, Pressable } from 'react-native';
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

interface Person {
  id: string;
  name: string;
  photo_url?: string;
}

interface DateEntry {
  id: string;
  person_id?: string;
  title?: string;
  date_time?: string;
  rating?: number;
  status?: string;
  location?: string;
  // legacy fields kept for compatibility
  person_name?: string;
  date_type?: string;
  scheduled_at?: string;
  interest_rating?: number;
  notes?: string;
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
  cardWidth: number;
}

function ActionCard({ title, description, icon, accentColor, onPress, cardWidth }: ActionCardProps) {
  return (
    <AnimatedPressable onPress={onPress} style={{ width: cardWidth }}>
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          padding: 18,
          borderWidth: 1,
          borderColor: COLORS.border,
          gap: 10,
          height: 130,
          alignItems: 'center',
          justifyContent: 'center',
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
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 3, textAlign: 'center' }}>
            {title}
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12, lineHeight: 17, textAlign: 'center' }}>
            {description}
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

function DateCard({ entry, persons, onPress }: { entry: DateEntry; persons: Person[]; onPress: () => void }) {
  const dateStr = entry.date_time || entry.scheduled_at;
  const dateLabel = dateStr
    ? new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'No date set';
  const typeLabel = entry.title || (entry.date_type
    ? entry.date_type.charAt(0).toUpperCase() + entry.date_type.slice(1)
    : 'Date');
  const ratingValue = entry.rating ?? entry.interest_rating;
  const ratingDisplay = ratingValue != null ? String(ratingValue) : '—';
  const foundPerson = entry.person_id ? persons.find((p) => p.id === entry.person_id) : null;
  const personName = foundPerson?.name || entry.person_name || 'Unknown';

  return (
    <AnimatedPressable
      onPress={onPress}
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      }}
    >
      {/* Type badge */}
      <View
        style={{
          backgroundColor: '#E53935',
          borderRadius: 8,
          paddingHorizontal: 8,
          paddingVertical: 4,
          minWidth: 52,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }} numberOfLines={1}>
          {typeLabel}
        </Text>
      </View>

      {/* Center info */}
      <View style={{ flex: 1 }}>
        <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
          {personName}
        </Text>
        <Text style={{ color: COLORS.textTertiary, fontSize: 12, marginTop: 1 }}>
          {dateLabel}
        </Text>
      </View>

      {/* Rating */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <Text style={{ fontSize: 13 }}>⭐</Text>
        <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700' }}>{ratingDisplay}</Text>
      </View>
    </AnimatedPressable>
  );
}

export default function DatingScreen() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [analytics, setAnalytics] = useState<Analytics>({});
  const [recentDates, setRecentDates] = useState<DateEntry[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Card width: (screenWidth - 16 left - 16 right - 8 gap) / 2
  const cardWidth = (width - 48) / 2;

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      console.log('[Dating] Loading analytics, persons, and recent dates');
      Promise.all([
        apiGet<Analytics>('/api/analytics').catch((e) => {
          console.error('[Dating] Failed to load analytics:', e);
          return {} as Analytics;
        }),
        apiGet<{ persons: Person[] }>('/api/persons').catch((e) => {
          console.error('[Dating] Failed to load persons:', e);
          return { persons: [] };
        }),
        apiGet<{ dates: DateEntry[] }>('/api/dates').catch((e) => {
          console.error('[Dating] Failed to load dates:', e);
          return { dates: [] };
        }),
      ]).then(([analyticsData, personsData, datesData]) => {
        console.log('[Dating] Analytics, persons, and dates loaded');
        setAnalytics(analyticsData);
        setPersons(personsData.persons || []);
        const datesList = datesData.dates || [];
        // Sort by date_time descending, take 3 most recent
        const sorted = [...datesList].sort((a, b) => {
          const aTime = a.date_time ? new Date(a.date_time).getTime() : 0;
          const bTime = b.date_time ? new Date(b.date_time).getTime() : 0;
          return bTime - aTime;
        });
        setRecentDates(sorted.slice(0, 3));
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      });
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
        contentContainerStyle={{ padding: 16, paddingTop: 16, paddingBottom: 100, gap: 20 }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={{ color: '#999', fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
            Overview
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
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
          <Text style={{ color: '#999', fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
            Actions
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <ActionCard
              title="I Have a Date"
              description="Log an upcoming date"
              icon={<Calendar size={22} color={COLORS.primary} />}
              accentColor={COLORS.primary}
              cardWidth={cardWidth}
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
              cardWidth={cardWidth}
              onPress={() => {
                console.log('[Dating] Plan a Date pressed');
                router.push('/date-plan');
              }}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <ActionCard
              title="I'm on a Date"
              description="Safety check-in"
              icon={<Shield size={22} color={COLORS.success} />}
              accentColor={COLORS.success}
              cardWidth={cardWidth}
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
              cardWidth={cardWidth}
              onPress={() => {
                console.log('[Dating] Dating Coach pressed');
                router.push('/coach');
              }}
            />
          </View>
        </View>

        {/* Recent Dates */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ flex: 1, color: '#999', fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase' }}>
              Recent Dates
            </Text>
            <Pressable
              onPress={() => {
                console.log('[Dating] See All dates pressed');
                router.push('/date-review');
              }}
            >
              <Text style={{ color: '#E53935', fontSize: 13, fontWeight: '600' }}>See All</Text>
            </Pressable>
          </View>

          {recentDates.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text style={{ color: '#999', fontSize: 14 }}>No dates logged yet</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {recentDates.map((entry) => {
                const foundPerson = entry.person_id ? persons.find((p) => p.id === entry.person_id) : null;
                const personName = foundPerson?.name || entry.person_name || 'Unknown';
                const personPhoto = foundPerson?.photo_url || '';
                return (
                  <DateCard
                    key={entry.id}
                    entry={entry}
                    persons={persons}
                    onPress={() => {
                      console.log('[Dating] Date card pressed, dateId:', entry.id, 'person:', personName);
                      router.push({ pathname: '/date-review', params: { dateId: entry.id, personName, personPhoto } });
                    }}
                  />
                );
              })}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}
