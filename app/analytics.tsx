import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  ImageSourcePropType,
  Dimensions,
} from 'react-native';
import { Stack } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { apiGet } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;
const H_PAD = 16;
const CARD_GAP = 12;
const HALF_CARD_WIDTH = (SCREEN_WIDTH - H_PAD * 2 - CARD_GAP) / 2;

// ─── Image helper ─────────────────────────────────────────────────────────────

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

// ─── Data interfaces ──────────────────────────────────────────────────────────

interface Person {
  id: string;
  name: string;
  photo_url?: string;
  age?: number;
  zodiac?: string;
  interest_level?: number;
  attractiveness?: number;
  sexual_chemistry?: number;
  communication?: number;
  overall_chemistry?: number;
  consistency?: number;
  emotional_availability?: number;
  date_planning?: number;
  alignment?: number;
  connection_type?: string;
  hobbies?: string[];
  red_flags?: string[];
  green_flags?: string[];
  is_benched?: boolean;
}

interface DateEntry {
  id: string;
  person_id?: string;
  person_name?: string;
  person_photo_url?: string;
  title?: string;
  location?: string;
  date_time?: string;
  budget?: string;
  status?: string;
  rating?: number;
  went_well?: string;
  went_poorly?: string;
  want_another_date?: boolean;
  notes?: string;
  created_at?: string;
}

// ─── Computed stat types ──────────────────────────────────────────────────────

interface PeopleStats {
  total: number;
  active: number;
  benched: number;
  topRatedName: string;
  topRatedPhoto: string;
  topRatedScore: number;
  avgInterest: number;
  avgAttractiveness: number;
  avgChemistry: number;
  avgCommunication: number;
  avgOverallChemistry: number;
  avgConsistency: number;
  avgEmotionalAvailability: number;
  avgDatePlanning: number;
  avgAlignment: number;
  connectionBreakdown: { type: string; count: number }[];
  mostCommonZodiac: string;
  topHobbies: { label: string; count: number }[];
  topRedFlags: { label: string; count: number }[];
  topGreenFlags: { label: string; count: number }[];
}

interface DateStats {
  total: number;
  upcoming: number;
  completed: number;
  avgRating: number;
  wantAnotherCount: number;
  wantAnotherTotal: number;
  mostVisitedLocation: string;
  monthlyFrequency: { label: string; count: number }[];
  topPartnerName: string;
  topPartnerDates: number;
  bestDateTitle: string;
  bestDatePerson: string;
  bestDateRating: number;
  recentWentWell: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function avg(nums: (number | undefined)[]): number {
  const valid = nums.filter((n): n is number => n != null && !isNaN(Number(n))).map(Number);
  if (valid.length === 0) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function topN<T extends string>(items: T[], n: number): { label: string; count: number }[] {
  const freq: Record<string, number> = {};
  for (const item of items) {
    const key = String(item).trim().toLowerCase();
    if (key) freq[key] = (freq[key] || 0) + 1;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, count }));
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function computePeopleStats(persons: Person[]): PeopleStats {
  const active = persons.filter((p) => !p.is_benched);
  const benched = persons.filter((p) => p.is_benched);

  let topRatedName = '—';
  let topRatedPhoto = '';
  let topRatedScore = 0;
  for (const p of persons) {
    const scores = [
      p.interest_level, p.attractiveness, p.sexual_chemistry, p.communication,
      p.overall_chemistry, p.consistency, p.emotional_availability, p.date_planning, p.alignment,
    ].filter((v): v is number => v != null);
    if (scores.length > 0) {
      const score = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (score > topRatedScore) {
        topRatedScore = score;
        topRatedName = p.name || '—';
        topRatedPhoto = p.photo_url || '';
      }
    }
  }

  const connFreq: Record<string, number> = {};
  for (const p of persons) {
    const ct = p.connection_type || 'other';
    connFreq[ct] = (connFreq[ct] || 0) + 1;
  }
  const connectionBreakdown = Object.entries(connFreq)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count }));

  const zodiacFreq: Record<string, number> = {};
  for (const p of persons) {
    if (p.zodiac) zodiacFreq[p.zodiac] = (zodiacFreq[p.zodiac] || 0) + 1;
  }
  const mostCommonZodiac = Object.entries(zodiacFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

  const allHobbies: string[] = persons.flatMap((p) => p.hobbies || []);
  const allRedFlags: string[] = persons.flatMap((p) => p.red_flags || []);
  const allGreenFlags: string[] = persons.flatMap((p) => p.green_flags || []);

  return {
    total: persons.length,
    active: active.length,
    benched: benched.length,
    topRatedName,
    topRatedPhoto,
    topRatedScore,
    avgInterest: avg(persons.map((p) => p.interest_level)),
    avgAttractiveness: avg(persons.map((p) => p.attractiveness)),
    avgChemistry: avg(persons.map((p) => p.sexual_chemistry)),
    avgCommunication: avg(persons.map((p) => p.communication)),
    avgOverallChemistry: avg(persons.map((p) => p.overall_chemistry)),
    avgConsistency: avg(persons.map((p) => p.consistency)),
    avgEmotionalAvailability: avg(persons.map((p) => p.emotional_availability)),
    avgDatePlanning: avg(persons.map((p) => p.date_planning)),
    avgAlignment: avg(persons.map((p) => p.alignment)),
    connectionBreakdown,
    mostCommonZodiac,
    topHobbies: topN(allHobbies, 3),
    topRedFlags: topN(allRedFlags, 3),
    topGreenFlags: topN(allGreenFlags, 3),
  };
}

function computeDateStats(dates: DateEntry[], persons: Person[]): DateStats {
  const now = new Date();
  const upcoming = dates.filter((d) => {
    if (!d.date_time) return false;
    const isUpcoming = new Date(d.date_time) > now;
    const notDone = d.status !== 'completed' && d.status !== 'cancelled';
    return isUpcoming && notDone;
  });
  const completed = dates.filter((d) => d.status === 'completed' || d.status === 'reviewed');

  const ratings = completed.map((d) => Number(d.rating)).filter((r) => !isNaN(r) && r > 0);
  const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  const wantAnotherTotal = completed.length;
  const wantAnotherCount = completed.filter((d) => d.want_another_date === true).length;

  const locations = dates.map((d) => d.location).filter((l): l is string => !!l && l.trim() !== '');
  const mostVisitedLocation = topN(locations, 1)[0]?.label || '—';

  const monthlyFrequency: { label: string; count: number }[] = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString('default', { month: 'short' });
    const count = dates.filter((entry) => {
      if (!entry.date_time) return false;
      const ed = new Date(entry.date_time);
      return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth();
    }).length;
    monthlyFrequency.push({ label, count });
  }

  // Use person_name from date entries directly (joined by backend)
  const partnerFreq: Record<string, { name: string; count: number }> = {};
  for (const d of dates) {
    const pid = d.person_id || '';
    const pname = d.person_name || '';
    if (pid) {
      if (!partnerFreq[pid]) partnerFreq[pid] = { name: pname, count: 0 };
      partnerFreq[pid].count += 1;
    }
  }
  const topPartnerEntry = Object.values(partnerFreq).sort((a, b) => b.count - a.count)[0];
  const topPartnerName = topPartnerEntry?.name || (persons.find((p) => p.id === Object.keys(partnerFreq).sort((a, b) => (partnerFreq[b]?.count || 0) - (partnerFreq[a]?.count || 0))[0])?.name) || '—';
  const topPartnerDates = topPartnerEntry?.count || 0;

  const bestDate = [...completed].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))[0];
  const bestDatePerson = bestDate?.person_name || (bestDate?.person_id ? (persons.find((p) => p.id === bestDate.person_id)?.name || '—') : '—');

  const recentWentWell = completed
    .filter((d) => d.went_well && d.went_well.trim() !== '')
    .slice(-3)
    .map((d) => d.went_well as string);

  return {
    total: dates.length,
    upcoming: upcoming.length,
    completed: completed.length,
    avgRating,
    wantAnotherCount,
    wantAnotherTotal,
    mostVisitedLocation,
    monthlyFrequency,
    topPartnerName,
    topPartnerDates,
    bestDateTitle: bestDate?.title || '—',
    bestDatePerson,
    bestDateRating: Number(bestDate?.rating) || 0,
    recentWentWell,
  };
}

// ─── Shared card style ────────────────────────────────────────────────────────

const CARD_STYLE = {
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#E0E0E0',
  borderRadius: 12,
  padding: 16,
  minHeight: 100,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 2,
} as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[CARD_STYLE, style]}>{children}</View>;
}

function CardTitle({ children }: { children: string }) {
  return (
    <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 12 }}>
      {children}
    </Text>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const remainder = 1 - pct;
  return (
    <View style={{ height: 7, borderRadius: 4, overflow: 'hidden', flexDirection: 'row' }}>
      <View style={{ flex: pct, backgroundColor: COLORS.primary, borderRadius: 4 }} />
      <View style={{ flex: remainder, backgroundColor: COLORS.surfaceSecondary }} />
    </View>
  );
}

function RatingStars({ rating, max = 5 }: { rating: number; max?: number }) {
  const stars: React.ReactElement[] = [];
  for (let i = 1; i <= max; i++) {
    const filled = i <= Math.round(rating);
    const starColor = filled ? COLORS.accent : COLORS.border;
    stars.push(
      <Text key={i} style={{ fontSize: 16, color: starColor }}>★</Text>
    );
  }
  return <View style={{ flexDirection: 'row', gap: 2 }}>{stars}</View>;
}

function BarChart({ data }: { data: { label: string; count: number }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, height: 90 }}>
      {data.map((item) => {
        const barHeight = maxCount > 0 ? Math.max((item.count / maxCount) * 64, item.count > 0 ? 8 : 0) : 0;
        const countLabel = String(item.count);
        return (
          <View key={item.label} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' }}>
              {countLabel}
            </Text>
            <View
              style={{
                width: '100%',
                height: barHeight,
                backgroundColor: COLORS.primary,
                borderRadius: 4,
                opacity: item.count === 0 ? 0.15 : 1,
              }}
            />
            <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>{item.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function Avatar({ uri, name, size = 28 }: { uri?: string; name: string; size?: number }) {
  const initial = name && name !== '—' ? name.charAt(0).toUpperCase() : '?';
  if (uri) {
    return (
      <Image
        source={resolveImageSource(uri)}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: COLORS.surface }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: COLORS.primaryMuted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: COLORS.primary, fontSize: size * 0.45, fontWeight: '700' }}>{initial}</Text>
    </View>
  );
}

// ─── Tab pill ─────────────────────────────────────────────────────────────────

function TabPills({ active, onChange }: { active: 'people' | 'dating'; onChange: (t: 'people' | 'dating') => void }) {
  const peopleActive = active === 'people';
  const datingActive = active === 'dating';
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: H_PAD, marginBottom: 16 }}>
      <TouchableOpacity
        onPress={() => {
          console.log('[Analytics] Tab pressed: people');
          onChange('people');
        }}
        style={{
          flex: 1,
          paddingVertical: 10,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: '#E0E0E0',
          backgroundColor: peopleActive ? COLORS.primary : '#FFFFFF',
          alignItems: 'center',
        }}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: peopleActive ? '#FFFFFF' : '#1A1A1A' }}>
          People
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => {
          console.log('[Analytics] Tab pressed: dating');
          onChange('dating');
        }}
        style={{
          flex: 1,
          paddingVertical: 10,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: '#E0E0E0',
          backgroundColor: datingActive ? COLORS.primary : '#FFFFFF',
          alignItems: 'center',
        }}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 14, fontWeight: '600', color: datingActive ? '#FFFFFF' : '#1A1A1A' }}>
          Dating
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── People tab content ───────────────────────────────────────────────────────

function PeopleTab({ ps }: { ps: PeopleStats }) {
  const isEmpty = ps.total === 0;

  if (isEmpty) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
          No data yet — add people and plan dates to see your insights!
        </Text>
      </View>
    );
  }

  const avgInterestDisplay = ps.avgInterest > 0 ? ps.avgInterest.toFixed(1) : '—';
  const avgAttrDisplay = ps.avgAttractiveness > 0 ? ps.avgAttractiveness.toFixed(1) : '—';
  const avgChemDisplay = ps.avgChemistry > 0 ? ps.avgChemistry.toFixed(1) : '—';
  const avgCommDisplay = ps.avgCommunication > 0 ? ps.avgCommunication.toFixed(1) : '—';

  const zodiacEmoji = ZODIAC_EMOJIS[ps.mostCommonZodiac] || '';
  const zodiacName = ps.mostCommonZodiac !== '—' ? capitalize(ps.mostCommonZodiac) : '—';
  const zodiacLine = ps.mostCommonZodiac !== '—' ? zodiacEmoji + ' ' + zodiacName : '—';

  const activeRatio = ps.total > 0 ? ps.active / ps.total : 0;
  const benchedRatio = ps.total > 0 ? ps.benched / ps.total : 0;

  const ratingRows = [
    { label: 'Interest Level', value: ps.avgInterest, display: avgInterestDisplay },
    { label: 'Attractiveness', value: ps.avgAttractiveness, display: avgAttrDisplay },
    { label: 'Sexual Chemistry', value: ps.avgChemistry, display: avgChemDisplay },
    { label: 'Communication', value: ps.avgCommunication, display: avgCommDisplay },
    { label: 'Overall Chemistry', value: ps.avgOverallChemistry, display: ps.avgOverallChemistry > 0 ? ps.avgOverallChemistry.toFixed(1) : '—' },
    { label: 'Consistency', value: ps.avgConsistency, display: ps.avgConsistency > 0 ? ps.avgConsistency.toFixed(1) : '—' },
    { label: 'Emotional Availability', value: ps.avgEmotionalAvailability, display: ps.avgEmotionalAvailability > 0 ? ps.avgEmotionalAvailability.toFixed(1) : '—' },
    { label: 'Date Planning', value: ps.avgDatePlanning, display: ps.avgDatePlanning > 0 ? ps.avgDatePlanning.toFixed(1) : '—' },
    { label: 'Alignment', value: ps.avgAlignment, display: ps.avgAlignment > 0 ? ps.avgAlignment.toFixed(1) : '—' },
  ];

  return (
    <View style={{ gap: CARD_GAP }}>
      {/* Row 1: Total People + Active/Benched */}
      <View style={{ flexDirection: 'row', gap: CARD_GAP }}>
        {/* Total People */}
        <Card style={{ flex: 1 }}>
          <Text style={{ color: COLORS.primary, fontSize: 32, fontWeight: '800', marginBottom: 4 }}>
            {ps.total}
          </Text>
          <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600' }}>Total People</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 2 }}>in your roster</Text>
        </Card>

        {/* Active / Benched */}
        <Card style={{ flex: 1 }}>
          <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
            Active / Benched
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 10 }}>
            <Text style={{ color: COLORS.success, fontSize: 22, fontWeight: '800' }}>{ps.active}</Text>
            <Text style={{ color: COLORS.textTertiary, fontSize: 16, fontWeight: '600' }}>/</Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 22, fontWeight: '800' }}>{ps.benched}</Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, overflow: 'hidden', flexDirection: 'row' }}>
            <View style={{ flex: activeRatio, backgroundColor: COLORS.success }} />
            <View style={{ flex: benchedRatio, backgroundColor: '#CCCCCC' }} />
          </View>
        </Card>
      </View>

      {/* Row 2: Top Rated + Most Common Zodiac */}
      <View style={{ flexDirection: 'row', gap: CARD_GAP }}>
        {/* Top Rated */}
        <Card style={{ flex: 1 }}>
          <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
            Top Rated
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Avatar uri={ps.topRatedPhoto} name={ps.topRatedName} size={28} />
            <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '700', flex: 1 }} numberOfLines={1}>
              {ps.topRatedName}
            </Text>
          </View>
          {ps.topRatedScore > 0 && (
            <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>
              avg {ps.topRatedScore.toFixed(1)}/10
            </Text>
          )}
        </Card>

        {/* Most Common Zodiac */}
        <Card style={{ flex: 1 }}>
          <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
            Most Common Zodiac
          </Text>
          <Text style={{ color: COLORS.text, fontSize: 26, fontWeight: '800', marginBottom: 2 }}>
            {zodiacEmoji || '—'}
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' }}>
            {zodiacName}
          </Text>
          <Text style={{ color: COLORS.textTertiary, fontSize: 11, marginTop: 2 }}>
            {zodiacLine !== '—' ? 'most frequent sign' : ''}
          </Text>
        </Card>
      </View>

      {/* Average Ratings */}
      <Card style={{ minHeight: undefined }}>
        <CardTitle>Average Ratings</CardTitle>
        <View style={{ gap: 12 }}>
          {ratingRows.map((item) => (
            <View key={item.label}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>{item.label}</Text>
                <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '700' }}>
                  {item.display}
                </Text>
              </View>
              <ProgressBar value={item.value} max={10} />
            </View>
          ))}
        </View>
      </Card>

      {/* Connection Types */}
      {ps.connectionBreakdown.length > 0 && (
        <Card style={{ minHeight: undefined }}>
          <CardTitle>Connection Types</CardTitle>
          <View style={{ gap: 8 }}>
            {ps.connectionBreakdown.map((item) => {
              const connLabel = CONNECTION_LABELS[item.type] || capitalize(item.type);
              const countStr = String(item.count);
              return (
                <View key={item.type} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={{
                      backgroundColor: COLORS.primaryMuted,
                      borderRadius: 20,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      minWidth: 80,
                    }}
                  >
                    <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '600' }}>
                      {connLabel}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <ProgressBar value={item.count} max={ps.total} />
                  </View>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', width: 20, textAlign: 'right' }}>
                    {countStr}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>
      )}

      {/* Top Hobbies */}
      {ps.topHobbies.length > 0 && (
        <Card style={{ minHeight: undefined }}>
          <CardTitle>Top Hobbies</CardTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ps.topHobbies.map((item) => {
              const hobbyLabel = capitalize(item.label);
              const countStr = String(item.count);
              return (
                <View
                  key={item.label}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: COLORS.surface,
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    gap: 6,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '500' }}>{hobbyLabel}</Text>
                  <View
                    style={{
                      backgroundColor: COLORS.primary,
                      borderRadius: 10,
                      minWidth: 20,
                      height: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 5,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>{countStr}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </Card>
      )}

      {/* Common Flags */}
      {(ps.topRedFlags.length > 0 || ps.topGreenFlags.length > 0) && (
        <View style={{ flexDirection: 'row', gap: CARD_GAP }}>
          {ps.topRedFlags.length > 0 && (
            <Card style={{ flex: 1, minHeight: undefined }}>
              <Text style={{ color: COLORS.danger, fontSize: 13, fontWeight: '700', marginBottom: 10 }}>
                🚩 Red Flags
              </Text>
              <View style={{ gap: 7 }}>
                {ps.topRedFlags.map((item) => {
                  const flagLabel = capitalize(item.label);
                  const flagCount = String(item.count);
                  return (
                    <View key={item.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: COLORS.text, fontSize: 12, flex: 1 }} numberOfLines={1}>
                        {flagLabel}
                      </Text>
                      <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginLeft: 4 }}>{flagCount}</Text>
                    </View>
                  );
                })}
              </View>
            </Card>
          )}
          {ps.topGreenFlags.length > 0 && (
            <Card style={{ flex: 1, minHeight: undefined }}>
              <Text style={{ color: COLORS.success, fontSize: 13, fontWeight: '700', marginBottom: 10 }}>
                ✅ Green Flags
              </Text>
              <View style={{ gap: 7 }}>
                {ps.topGreenFlags.map((item) => {
                  const flagLabel = capitalize(item.label);
                  const flagCount = String(item.count);
                  return (
                    <View key={item.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: COLORS.text, fontSize: 12, flex: 1 }} numberOfLines={1}>
                        {flagLabel}
                      </Text>
                      <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginLeft: 4 }}>{flagCount}</Text>
                    </View>
                  );
                })}
              </View>
            </Card>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Dating tab content ───────────────────────────────────────────────────────

function DatingTab({ ds }: { ds: DateStats }) {
  const isEmpty = ds.total === 0;

  if (isEmpty) {
    return (
      <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
          No data yet — add people and plan dates to see your insights!
        </Text>
      </View>
    );
  }

  const avgRatingDisplay = ds.avgRating > 0 ? ds.avgRating.toFixed(1) : '—';
  const wantAnotherDisplay = ds.wantAnotherTotal > 0
    ? String(ds.wantAnotherCount) + ' / ' + String(ds.wantAnotherTotal)
    : '—';
  const topPartnerSubDisplay = ds.topPartnerDates > 0 ? String(ds.topPartnerDates) + ' dates' : '';
  const bestDateRatingStars = ds.bestDateRating > 0 ? ds.bestDateRating : 0;
  const locationDisplay = ds.mostVisitedLocation !== '—' ? capitalize(ds.mostVisitedLocation) : 'No data yet';

  return (
    <View style={{ gap: CARD_GAP }}>
      {/* Row 1: Total Dates + Avg Rating */}
      <View style={{ flexDirection: 'row', gap: CARD_GAP }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: COLORS.primary, fontSize: 32, fontWeight: '800', marginBottom: 4 }}>
            {ds.total}
          </Text>
          <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600' }}>Total Dates</Text>
        </Card>

        <Card style={{ flex: 1 }}>
          <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>
            Avg Rating
          </Text>
          <RatingStars rating={ds.avgRating} />
          <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 6 }}>
            ★ {avgRatingDisplay}
          </Text>
        </Card>
      </View>

      {/* Row 2: Upcoming + Completed */}
      <View style={{ flexDirection: 'row', gap: CARD_GAP }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: COLORS.accent, fontSize: 32, fontWeight: '800', marginBottom: 4 }}>
            {ds.upcoming}
          </Text>
          <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600' }}>Upcoming</Text>
        </Card>

        <Card style={{ flex: 1 }}>
          <Text style={{ color: COLORS.success, fontSize: 32, fontWeight: '800', marginBottom: 4 }}>
            {ds.completed}
          </Text>
          <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600' }}>Completed</Text>
        </Card>
      </View>

      {/* Row 3: Want Another Date + Top Date Partner */}
      <View style={{ flexDirection: 'row', gap: CARD_GAP }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
            Want Another Date
          </Text>
          <Text style={{ color: COLORS.success, fontSize: 22, fontWeight: '800', marginBottom: 2 }}>
            {wantAnotherDisplay}
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>of completed dates</Text>
        </Card>

        <Card style={{ flex: 1 }}>
          <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>
            Top Date Partner
          </Text>
          <Text style={{ color: COLORS.primary, fontSize: 16, fontWeight: '800', marginBottom: 2 }} numberOfLines={1}>
            {ds.topPartnerName}
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>{topPartnerSubDisplay}</Text>
        </Card>
      </View>

      {/* Dates Per Month bar chart */}
      <Card style={{ minHeight: undefined }}>
        <CardTitle>Dates Per Month</CardTitle>
        <BarChart data={ds.monthlyFrequency} />
      </Card>

      {/* Favorite Spot */}
      <Card style={{ minHeight: undefined }}>
        <CardTitle>Favorite Spot</CardTitle>
        <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700' }}>
          {locationDisplay}
        </Text>
        {ds.mostVisitedLocation !== '—' && (
          <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 4 }}>
            most visited location
          </Text>
        )}
      </Card>

      {/* Best Date */}
      {ds.bestDateTitle !== '—' && (
        <Card style={{ minHeight: undefined }}>
          <CardTitle>Best Date</CardTitle>
          <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 4 }} numberOfLines={2}>
            {ds.bestDateTitle}
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 8 }}>
            {ds.bestDatePerson}
          </Text>
          {bestDateRatingStars > 0 && <RatingStars rating={bestDateRatingStars} />}
        </Card>
      )}

      {/* What Went Well */}
      {ds.recentWentWell.length > 0 && (
        <Card style={{ minHeight: undefined }}>
          <CardTitle>What Went Well</CardTitle>
          <View style={{ gap: 10 }}>
            {ds.recentWentWell.map((snippet, idx) => {
              const snippetKey = String(idx);
              return (
                <View
                  key={snippetKey}
                  style={{
                    backgroundColor: '#F5F5F5',
                    borderRadius: 8,
                    padding: 12,
                    borderLeftWidth: 3,
                    borderLeftColor: COLORS.success,
                  }}
                >
                  <Text style={{ color: COLORS.text, fontSize: 13, lineHeight: 19, fontStyle: 'italic' }}>
                    {snippet}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [persons, setPersons] = useState<Person[]>([]);
  const [dates, setDates] = useState<DateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'people' | 'dating'>('people');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    console.log('[Analytics] Fetching /api/persons (active+benched) and /api/dates in parallel');
    Promise.all([
      apiGet<{ persons: Person[] }>('/api/persons'),
      apiGet<{ persons: Person[] }>('/api/persons?benched=true'),
      apiGet<{ dates: DateEntry[] }>('/api/dates'),
    ])
      .then(([activeRes, benchedRes, datesRes]) => {
        const active = activeRes.persons || [];
        const benched = benchedRes.persons || [];
        const seen = new Set(active.map((p) => p.id));
        const allPersons = [...active, ...benched.filter((p) => !seen.has(p.id))];
        const d = datesRes.dates || [];
        console.log('[Analytics] Data loaded — active:', active.length, 'benched:', benched.length, 'total:', allPersons.length, 'dates:', d.length);
        setPersons(allPersons);
        setDates(d);
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      })
      .catch((e) => {
        console.error('[Analytics] Failed to load data:', e);
        setError('Could not load insights');
      })
      .finally(() => setLoading(false));
  }, [fadeAnim]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ title: 'Insights', headerBackTitle: '' }} />
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Stack.Screen options={{ title: 'Insights', headerBackTitle: '' }} />
        <View
          style={{
            backgroundColor: COLORS.dangerMuted,
            borderRadius: 12,
            padding: 20,
            width: '100%',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <Text style={{ color: COLORS.danger, fontSize: 16, fontWeight: '700', marginBottom: 4 }}>
            Could not load insights
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' }}>
            Check your connection and try again
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            console.log('[Analytics] Retry button pressed');
            loadData();
          }}
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 10,
            paddingHorizontal: 28,
            paddingVertical: 12,
          }}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ps = computePeopleStats(persons);
  const ds = computeDateStats(dates, persons);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <Stack.Screen options={{ title: 'Insights', headerBackTitle: '' }} />

      {/* Red section header */}
      <View
        style={{
          backgroundColor: COLORS.primary,
          paddingTop: insets.top > 0 ? 0 : 12,
          paddingBottom: 16,
          paddingHorizontal: H_PAD,
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 }}>
          Insights
        </Text>
      </View>

      {/* Tab pills */}
      <View style={{ backgroundColor: '#FFFFFF', paddingTop: 14 }}>
        <TabPills active={activeTab} onChange={setActiveTab} />
      </View>

      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim }}
        contentContainerStyle={{
          paddingHorizontal: H_PAD,
          paddingBottom: insets.bottom + 40,
          paddingTop: 4,
        }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {activeTab === 'people' ? (
          <PeopleTab ps={ps} />
        ) : (
          <DatingTab ds={ds} />
        )}
      </Animated.ScrollView>
    </View>
  );
}
