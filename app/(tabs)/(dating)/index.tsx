import React, { useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Animated, useWindowDimensions, Pressable, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  Calendar,
  Sparkles,
  Shield,
  MessageCircle,
  Heart,
  Users,
  Star,
  Brain,
  BookHeart,
  Target,
} from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
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

interface RosterHealthInsight {
  type: 'warning' | 'positive' | 'tip';
  message: string;
}

interface RosterHealth {
  score: number;
  grade: string;
  summary: string;
  insights: RosterHealthInsight[];
  breakdown: {
    size_score: number;
    engagement_score: number;
    quality_score: number;
    balance_score: number;
  };
}

type ThemeColors = typeof COLORS;

function getHealthColor(grade: string): string {
  if (grade === 'A' || grade === 'B') return '#22C55E';
  if (grade === 'C') return '#F59E0B';
  return '#EF4444';
}

function HealthScoreSkeleton({ colors }: { colors: ThemeColors }) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 18,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 14,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surfaceSecondary }} />
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ width: '60%', height: 16, backgroundColor: colors.surfaceSecondary, borderRadius: 6 }} />
          <View style={{ width: '90%', height: 12, backgroundColor: colors.surfaceSecondary, borderRadius: 6 }} />
        </View>
      </View>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={{ gap: 4 }}>
          <View style={{ width: '40%', height: 11, backgroundColor: colors.surfaceSecondary, borderRadius: 4 }} />
          <View style={{ height: 6, backgroundColor: colors.surfaceSecondary, borderRadius: 3 }} />
        </View>
      ))}
    </View>
  );
}

function RosterHealthCard({ health, colors }: { health: RosterHealth; colors: ThemeColors }) {
  const healthColor = getHealthColor(health.grade);
  const scoreStr = String(health.score);

  const breakdownItems = [
    { label: 'Size', score: health.breakdown.size_score },
    { label: 'Engagement', score: health.breakdown.engagement_score },
    { label: 'Quality', score: health.breakdown.quality_score },
    { label: 'Balance', score: health.breakdown.balance_score },
  ];

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 18,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 14,
      }}
    >
      {/* Score row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        {/* Circle score */}
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            borderWidth: 4,
            borderColor: healthColor,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: healthColor + '10',
          }}
        >
          <Text style={{ color: healthColor, fontSize: 24, fontWeight: '800', lineHeight: 28 }}>
            {scoreStr}
          </Text>
        </View>

        {/* Grade + summary */}
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>
              Roster Health
            </Text>
            <View
              style={{
                backgroundColor: healthColor + '20',
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <Text style={{ color: healthColor, fontSize: 14, fontWeight: '800' }}>
                {health.grade}
              </Text>
            </View>
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
            {health.summary}
          </Text>
        </View>
      </View>

      {/* Breakdown bars */}
      <View style={{ gap: 8 }}>
        {breakdownItems.map((item) => {
          const barWidth = `${item.score}%` as any;
          const barColor = item.score >= 70 ? '#22C55E' : item.score >= 50 ? '#F59E0B' : '#EF4444';
          const scoreLabel = String(item.score);
          return (
            <View key={item.label} style={{ gap: 3 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500' }}>
                  {item.label}
                </Text>
                <Text style={{ color: barColor, fontSize: 12, fontWeight: '700' }}>
                  {scoreLabel}
                </Text>
              </View>
              <View
                style={{
                  height: 5,
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: 5,
                    width: barWidth,
                    backgroundColor: barColor,
                    borderRadius: 3,
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>

      {/* Insights */}
      {health.insights.length > 0 && (
        <View style={{ gap: 6 }}>
          {health.insights.map((insight, index) => {
            const insightEmoji = insight.type === 'warning' ? '⚠️' : insight.type === 'positive' ? '✅' : '💡';
            const insightColor =
              insight.type === 'warning'
                ? '#F59E0B'
                : insight.type === 'positive'
                ? '#22C55E'
                : '#3B82F6';
            const insightBg =
              insight.type === 'warning'
                ? 'rgba(245,158,11,0.08)'
                : insight.type === 'positive'
                ? 'rgba(34,197,94,0.08)'
                : 'rgba(59,130,246,0.08)';
            return (
              <View
                key={index}
                style={{
                  backgroundColor: insightBg,
                  borderRadius: 10,
                  padding: 10,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 8,
                  borderWidth: 1,
                  borderColor: insightColor + '25',
                }}
              >
                <Text style={{ fontSize: 14 }}>{insightEmoji}</Text>
                <Text style={{ color: colors.text, fontSize: 13, lineHeight: 18, flex: 1 }}>
                  {insight.message}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function StatCard({ label, value, icon, color, colors }: { label: string; value: string | number; icon: React.ReactNode; color: string; colors: ThemeColors }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: colors.border,
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
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: 'center' }}>{label}</Text>
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
  colors: ThemeColors;
}

function ActionCard({ title, description, icon, accentColor, onPress, cardWidth, colors }: ActionCardProps) {
  return (
    <AnimatedPressable onPress={onPress} style={{ width: cardWidth }}>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 18,
          borderWidth: 1,
          borderColor: colors.border,
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
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 3, textAlign: 'center' }}>
            {title}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 17, textAlign: 'center' }}>
            {description}
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

function DateCard({ entry, persons, onPress, colors }: { entry: DateEntry; persons: Person[]; onPress: () => void; colors: ThemeColors }) {
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
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.border,
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
          backgroundColor: colors.primary,
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
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }} numberOfLines={1}>
          {personName}
        </Text>
        <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 1 }}>
          {dateLabel}
        </Text>
      </View>

      {/* Rating */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <Text style={{ fontSize: 13 }}>⭐</Text>
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{ratingDisplay}</Text>
      </View>
    </AnimatedPressable>
  );
}

export default function DatingScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [analytics, setAnalytics] = useState<Analytics>({});
  const [recentDates, setRecentDates] = useState<DateEntry[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [weeklySummary, setWeeklySummary] = useState<any>(null);
  const [rosterHealth, setRosterHealth] = useState<RosterHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Card width: (screenWidth - 16 left - 16 right - 8 gap) / 2
  const cardWidth = (width - 48) / 2;

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      console.log('[Dating] Loading analytics, persons, recent dates, weekly summary, and roster health');
      setHealthLoading(true);
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
        apiGet<{ summary: any }>('/api/analytics/weekly-summary').catch(() => ({ summary: null })),
        apiGet<RosterHealth>('/api/roster-health').catch((e) => {
          console.error('[Dating] Failed to load roster health:', e);
          return null;
        }),
      ]).then((data) => {
        const [analyticsData, personsData, datesData, weeklySummaryData, healthData] = data;
        console.log('[Dating] All data loaded, health score:', (healthData as RosterHealth | null)?.score);
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
        setWeeklySummary(weeklySummaryData?.summary ?? null);
        setRosterHealth(healthData as RosterHealth | null);
        setHealthLoading(false);
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user])
  );

  const totalActive = analytics.total_active ?? 0;
  const totalDates = analytics.total_dates ?? 0;
  const avgInterest = analytics.avg_interest_level ? Number(analytics.avg_interest_level).toFixed(1) : '—';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 16, paddingBottom: 100, gap: 20 }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {/* Roster Health Card */}
        <View>
          <Text style={{ color: colors.textTertiary, fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
            Roster Health
          </Text>
          {healthLoading ? (
            <HealthScoreSkeleton colors={colors} />
          ) : rosterHealth ? (
            <RosterHealthCard health={rosterHealth} colors={colors} />
          ) : null}
        </View>

        {/* Quick Actions */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16, marginBottom: 4 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {[
            { label: '📅 Log a Date', route: '/date-have' },
            { label: '✨ Plan a Date', route: '/date-plan' },
            { label: '➕ Add Person', route: '/add-person' },
          ].map((action) => (
            <Pressable
              key={action.route}
              onPress={() => {
                console.log('[Dating] Quick Action pressed:', action.label, action.route);
                router.push(action.route as any);
              }}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 20,
                paddingHorizontal: 16,
                paddingVertical: 9,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{action.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Stats */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={{ color: colors.textTertiary, fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
            Overview
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <StatCard
              label="Active"
              value={totalActive}
              icon={<Users size={18} color={colors.primary} />}
              color={colors.primary}
              colors={colors}
            />
            <StatCard
              label="Dates"
              value={totalDates}
              icon={<Calendar size={18} color={colors.accent} />}
              color={colors.accent}
              colors={colors}
            />
            <StatCard
              label="Avg Interest"
              value={avgInterest}
              icon={<Star size={18} color={colors.success} />}
              color={colors.success}
              colors={colors}
            />
          </View>
        </Animated.View>

        {/* Action cards */}
        <View>
          <Text style={{ color: colors.textTertiary, fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
            Actions
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <ActionCard
              title="I Have a Date"
              description="Log an upcoming date"
              icon={<Calendar size={22} color={colors.primary} />}
              accentColor={colors.primary}
              cardWidth={cardWidth}
              colors={colors}
              onPress={() => {
                console.log('[Dating] I Have a Date pressed');
                router.push('/date-have');
              }}
            />
            <ActionCard
              title="Plan a Date"
              description="AI-powered date ideas"
              icon={<Sparkles size={22} color={colors.accent} />}
              accentColor={colors.accent}
              cardWidth={cardWidth}
              colors={colors}
              onPress={() => {
                console.log('[Dating] Plan a Date pressed');
                router.push('/date-plan');
              }}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <ActionCard
              title="I'm on a Date"
              description="Safety check-in"
              icon={<Shield size={22} color={colors.success} />}
              accentColor={colors.success}
              cardWidth={cardWidth}
              colors={colors}
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
              colors={colors}
              onPress={() => {
                console.log('[Dating] Dating Coach pressed');
                router.push('/coach');
              }}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <ActionCard
              title="Patterns 🧠"
              description="AI pattern recognition"
              icon={<Brain size={22} color="#6366F1" />}
              accentColor="#6366F1"
              cardWidth={cardWidth}
              colors={colors}
              onPress={() => {
                console.log('[Dating] Patterns pressed');
                router.push('/patterns');
              }}
            />
            <ActionCard
              title="Mood Journal"
              description="Track your feelings"
              icon={<BookHeart size={22} color="#EC4899" />}
              accentColor="#EC4899"
              cardWidth={cardWidth}
              colors={colors}
              onPress={() => {
                console.log('[Dating] Mood Journal pressed');
                router.push('/mood-journal');
              }}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <ActionCard
              title="Dating Goals 🎯"
              description="Set & track your goals"
              icon={<Target size={22} color="#F59E0B" />}
              accentColor="#F59E0B"
              cardWidth={cardWidth}
              colors={colors}
              onPress={() => {
                console.log('[Dating] Dating Goals pressed');
                router.push('/dating-goals');
              }}
            />
            <ActionCard
              title="Date Calendar 📅"
              description="View all your dates"
              icon={<Calendar size={22} color="#06B6D4" />}
              accentColor="#06B6D4"
              cardWidth={cardWidth}
              colors={colors}
              onPress={() => {
                console.log('[Dating] Date Calendar pressed');
                router.push('/date-calendar');
              }}
            />
          </View>
        </View>

        {/* This Week vs Last Week */}
        {weeklySummary && (
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.textTertiary, fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 }}>
              This Week vs Last Week
            </Text>
            {[
              { label: 'Dates', thisWeek: weeklySummary.this_week_dates ?? 0, lastWeek: weeklySummary.last_week_dates ?? 0 },
              { label: 'People added', thisWeek: weeklySummary.this_week_persons_added ?? 0, lastWeek: weeklySummary.last_week_persons_added ?? 0 },
              { label: 'Notes written', thisWeek: weeklySummary.this_week_notes ?? 0, lastWeek: weeklySummary.last_week_notes ?? 0 },
            ].map((row) => {
              const up = row.thisWeek > row.lastWeek;
              const same = row.thisWeek === row.lastWeek;
              const arrowColor = same ? colors.textTertiary : up ? '#4CAF50' : colors.primary;
              const arrowChar = same ? '—' : up ? '↑' : '↓';
              const lastWeekStr = String(row.lastWeek);
              const thisWeekStr = String(row.thisWeek);
              return (
                <View key={row.label} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <Text style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: '500' }}>{row.label}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{lastWeekStr}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{' → '}</Text>
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{thisWeekStr}</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: arrowColor, fontWeight: '700' }}>{arrowChar}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Recent Dates */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ flex: 1, color: colors.textTertiary, fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase' }}>
              Recent Dates
            </Text>
            <Pressable
              onPress={() => {
                console.log('[Dating] See All dates pressed');
                router.push('/analytics');
              }}
            >
              <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>See All</Text>
            </Pressable>
          </View>

          {recentDates.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Text style={{ color: colors.textTertiary, fontSize: 14 }}>No dates logged yet</Text>
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
                    colors={colors}
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
