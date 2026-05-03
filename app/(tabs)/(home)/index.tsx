import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Animated,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Image as RNImage,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Bell, Search, SlidersHorizontal } from 'lucide-react-native';
import { Image } from 'expo-image';
import Svg, { Circle } from 'react-native-svg';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/utils/api';
import type { ImageSourcePropType } from 'react-native';

const RED = '#E53935';

interface Person {
  id: string;
  name: string;
  location: string;
  photo_url?: string;
  interest_level?: number;
  connection_type?: string;
  connection_type_custom?: string;
  is_benched?: boolean;
  attractiveness?: number;
  sexual_chemistry?: number;
  overall_chemistry?: number;
  communication?: number;
  consistency?: number;
  emotional_availability?: number;
  date_planning?: number;
  alignment?: number;
  created_at?: string;
  category?: string;
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType | null {
  if (!source) return null;
  if (typeof source === 'string') {
    if (source.length < 10) return null;
    return { uri: source };
  }
  return source as ImageSourcePropType;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function computeScore(person: Person): number | null {
  const fields = [
    person.attractiveness,
    person.sexual_chemistry,
    person.overall_chemistry,
    person.communication,
    person.consistency,
    person.emotional_availability,
    person.date_planning,
    person.alignment,
  ].filter((v): v is number => v !== undefined && v !== null);
  if (fields.length === 0) return null;
  const avg = fields.reduce((a, b) => a + b, 0) / fields.length;
  return Math.round(avg * 10) / 10;
}

function formatLastActive(createdAt?: string): string {
  if (!createdAt) return '';
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Added today';
  if (days === 1) return 'Added yesterday';
  if (days < 30) return `Added ${days}d ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return 'Added 1mo ago';
  return `Added ${months}mo ago`;
}

function getCategoryLabel(type?: string, custom?: string): string {
  const map: Record<string, string> = {
    friend: 'Friend',
    casual: 'Casual',
    booty_call: 'Booty Call',
    foodie_call: 'Foodie buddy',
    figuring_it_out: 'Still deciding',
    serious: 'Potential partner',
    other: custom || 'Other',
    situationship: 'Situationship',
    cuddle_buddy: 'Cuddle buddy',
    travel_buddy: 'Travel buddy',
    one_night_stand: 'One night stand',
  };
  return type ? (map[type] || type) : '';
}

// ─── CircleScore ─────────────────────────────────────────────────────────────

function CircleScore({ score, size }: { score: number | null; size: number }) {
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score !== null ? Math.min(Math.max(score / 10, 0), 1) : 0;
  const strokeDashoffset = circumference * (1 - progress);
  const cx = size / 2;
  const cy = size / 2;

  const scoreInt = score !== null ? Math.floor(score) : null;
  const scoreDec = score !== null ? (score % 1 !== 0 ? `.${String(Math.round((score % 1) * 10))}` : '') : null;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="#EEEEEE"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {score !== null && (
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={RED}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${cx}, ${cy}`}
          />
        )}
      </Svg>
      {score !== null ? (
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A' }}>{scoreInt}</Text>
          {scoreDec ? <Text style={{ fontSize: 10, fontWeight: '600', color: '#999' }}>{scoreDec}</Text> : null}
          <Text style={{ fontSize: 10, color: '#999', fontWeight: '500' }}>/10</Text>
        </View>
      ) : (
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#BBBBBB' }}>—</Text>
      )}
    </View>
  );
}

// ─── Filter chips ─────────────────────────────────────────────────────────────

const SORT_OPTIONS = ['Chemistry', 'Newest', 'Category', 'Name'] as const;
type SortOption = typeof SORT_OPTIONS[number];

const CATEGORY_OPTIONS = [
  'All',
  'Situationship',
  'Cuddle buddy',
  'Foodie buddy',
  'Travel buddy',
  'Potential partner',
  'One night stand',
  'Still deciding',
];

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: selected ? RED : '#F5F5F5',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: '500', color: selected ? '#fff' : '#444' }}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Person row card ──────────────────────────────────────────────────────────

function PersonCard({ item, index }: { item: Person; index: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        translateX.setValue(Math.max(-80, Math.min(80, g.dx)));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -60) {
          console.log('[Roster] Swipe left — bench action for:', item.id, item.name);
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          router.push({ pathname: '/bench-reason', params: { personId: item.id, personName: item.name } });
        } else if (g.dx > 60) {
          console.log('[Roster] Swipe right — log date action for:', item.id, item.name);
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          router.push('/date-have');
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay: index * 50, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasPhoto = !!item.photo_url;
  const initials = getInitials(item.name);
  const score = computeScore(item);
  const categoryLabel = getCategoryLabel(item.connection_type, item.connection_type_custom);

  const trendColor = item.interest_level != null
    ? (item.interest_level >= 7 ? '#4CAF50' : item.interest_level <= 4 ? '#E53935' : 'transparent')
    : 'transparent';
  const trendArrow = item.interest_level != null
    ? (item.interest_level >= 7 ? '↑' : item.interest_level <= 4 ? '↓' : '·')
    : '·';

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <View style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, marginHorizontal: 16, marginVertical: 4 }}>
        {/* Left action (bench - revealed on swipe left) */}
        <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, backgroundColor: '#FF9800', alignItems: 'center', justifyContent: 'center', borderRadius: 16 }}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Bench</Text>
        </View>
        {/* Right action (log date - revealed on swipe right) */}
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 80, backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center', borderRadius: 16 }}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Log Date</Text>
        </View>
        <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
          <AnimatedPressable
            onPress={() => {
              console.log('[Roster] Navigating to person:', item.id, item.name);
              router.push(`/person/${item.id}`);
            }}
            style={{
              backgroundColor: '#fff',
              borderRadius: 16,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOpacity: 0.06,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
            }}
          >
            {/* Avatar */}
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                borderWidth: 2,
                borderColor: RED,
                overflow: 'hidden',
                backgroundColor: RED,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              {hasPhoto && resolveImageSource(item.photo_url) ? (
                <Image
                  source={resolveImageSource(item.photo_url)!}
                  style={{ width: 68, height: 68, borderRadius: 34 }}
                  contentFit="cover"
                />
              ) : (
                <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>{initials}</Text>
              )}
            </View>

            {/* Name + category */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 5 }} numberOfLines={1}>
                {item.name}
              </Text>
              {categoryLabel ? (
                <View
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: '#F5F5F5',
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ fontSize: 11, color: '#666', fontWeight: '500' }}>{categoryLabel}</Text>
                </View>
              ) : null}
              {/* Info row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                {item.location ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Text style={{ fontSize: 11, color: '#999' }}>📍</Text>
                    <Text style={{ fontSize: 12, color: '#888', fontWeight: '400' }} numberOfLines={1}>{item.location}</Text>
                  </View>
                ) : null}
                {item.location && item.interest_level ? (
                  <Text style={{ fontSize: 11, color: '#CCC' }}>·</Text>
                ) : null}
                {item.interest_level ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Text style={{ fontSize: 11, color: '#999' }}>⚡</Text>
                    <Text style={{ fontSize: 12, color: '#888', fontWeight: '400' }}>{item.interest_level} interest</Text>
                  </View>
                ) : null}
                {(item.location || item.interest_level) && item.created_at ? (
                  <Text style={{ fontSize: 11, color: '#CCC' }}>·</Text>
                ) : null}
                {item.created_at ? (
                  <Text style={{ fontSize: 12, color: '#AAAAAA', fontWeight: '400' }}>{formatLastActive(item.created_at)}</Text>
                ) : null}
              </View>
            </View>

            {/* Score ring + trend arrow */}
            <View style={{ alignItems: 'center' }}>
              <CircleScore score={score} size={52} />
              {item.interest_level != null && (
                <Text style={{ fontSize: 13, color: trendColor, marginLeft: -4, marginTop: 2 }}>
                  {trendArrow}
                </Text>
              )}
            </View>
          </AnimatedPressable>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View
      style={{
        opacity,
        marginHorizontal: 16,
        marginVertical: 5,
        backgroundColor: '#F5F5F5',
        borderRadius: 16,
        height: 80,
      }}
    />
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function RosterScreen() {
  const { user, loading: authLoading } = useAuth();
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('Newest');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const filterHeight = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      console.log('[Roster] Loading persons from /api/persons');
      setLoading(true);
      setError(null);
      const data = await apiGet<{ persons: Person[] }>('/api/persons');
      const active = (data.persons || []).filter((p) => !p.is_benched);
      console.log('[Roster] Loaded', active.length, 'active persons');
      setPersons(active);
    } catch (e: any) {
      console.error('[Roster] Failed to load persons:', e);
      setError('Could not load your roster');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      if (user) {
        console.log('[Roster] Fetching profile photo from /api/profile');
        apiGet<any>('/api/profile')
          .then((res) => {
            const raw: string | null =
              res?.profile?.photo_url ??
              res?.profile?.photoUrl ??
              res?.photo_url ??
              res?.photoUrl ??
              null;

            if (!raw || raw.length < 10) {
              setProfilePhotoUrl(null);
              return;
            }

            let finalUrl = raw;
            if (!raw.startsWith('http') && !raw.startsWith('data:')) {
              finalUrl = `data:image/jpeg;base64,${raw}`;
            }

            console.log('[Roster] Profile photo resolved, length:', finalUrl.length, 'prefix:', finalUrl.slice(0, 30));
            setProfilePhotoUrl(finalUrl);
          })
          .catch((e) => {
            console.error('[Roster] Failed to fetch profile photo:', e);
          });
      }
    }, [loadData, user])
  );

  useEffect(() => {
    Animated.timing(filterHeight, {
      toValue: filterOpen ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [filterOpen, filterHeight]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth-screen');
    }
  }, [authLoading, user]);

  if (!authLoading && !user) return null;

  // ── filtering + sorting ──
  const lowerQuery = searchQuery.toLowerCase();

  const filtered = persons.filter((p) => {
    const matchesSearch = !lowerQuery || p.name.toLowerCase().includes(lowerQuery);
    if (!matchesSearch) return false;
    if (selectedCategory === 'All') return true;
    const label = getCategoryLabel(p.connection_type, p.connection_type_custom);
    return label === selectedCategory;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'Chemistry') {
      const sa = computeScore(a) ?? -1;
      const sb = computeScore(b) ?? -1;
      return sb - sa;
    }
    if (sortBy === 'Newest') {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    }
    if (sortBy === 'Category') {
      const ca = getCategoryLabel(a.connection_type, a.connection_type_custom);
      const cb = getCategoryLabel(b.connection_type, b.connection_type_custom);
      return ca.localeCompare(cb);
    }
    if (sortBy === 'Name') {
      return a.name.localeCompare(b.name);
    }
    return 0;
  });

  const firstName = user?.name ? user.name.split(' ')[0] : 'there';

  const filterMaxHeight = filterHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 260],
  });

  const filterOpacity = filterHeight.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  // ── Who needs attention ──
  const needsAttention = persons
    .filter((p) => {
      if (!p.created_at) return false;
      const days = Math.floor((Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return days >= 14;
    })
    .sort((a, b) => new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime())
    .slice(0, 5);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>

      {/* ── Red header ── */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: RED }}>
        <View
          style={{
            backgroundColor: RED,
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 24,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {/* Avatar + greeting */}
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: 'rgba(255,255,255,0.25)',
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
              borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.6)',
            }}
          >
            {profilePhotoUrl && profilePhotoUrl.length > 10 ? (
              <RNImage
                key={profilePhotoUrl.slice(-20)}
                source={{ uri: profilePhotoUrl }}
                style={{ width: 56, height: 56 }}
                resizeMode="cover"
              />
            ) : user?.image && user.image.length > 10 ? (
              <RNImage
                source={{ uri: user.image }}
                style={{ width: 56, height: 56 }}
                resizeMode="cover"
              />
            ) : (
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>
                {firstName[0]?.toUpperCase() ?? '?'}
              </Text>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff' }}>
              Hey, {firstName}
            </Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>
              Here's your dating overview
            </Text>
          </View>

          <Pressable
            onPress={() => {
              console.log('[Roster] Notification bell pressed — navigating to reminders');
              router.push('/reminders');
            }}
            style={{ padding: 4 }}
          >
            <Bell size={22} color="#fff" />
          </Pressable>
        </View>
      </SafeAreaView>

      {/* ── Nudge banner ── */}
      {!loading && !nudgeDismissed && persons.length === 0 && (
        <View style={{ marginHorizontal: 16, marginTop: 8, backgroundColor: '#FFF3E0', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#FFB74D' }}>
          <Text style={{ fontSize: 20 }}>👋</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#E65100', fontSize: 13, fontWeight: '700', marginBottom: 2 }}>Get started!</Text>
            <Text style={{ color: '#BF360C', fontSize: 12, lineHeight: 17 }}>Add someone to your roster, rate them, then log a date.</Text>
          </View>
          <Pressable
            onPress={() => {
              console.log('[Roster] Nudge banner dismissed');
              setNudgeDismissed(true);
            }}
            style={{ padding: 4 }}
          >
            <Text style={{ color: '#E65100', fontSize: 16 }}>✕</Text>
          </Pressable>
        </View>
      )}

      {/* ── Search + filter card (overlaps header) ── */}
      <View
        style={{
          marginHorizontal: 16,
          marginTop: -16,
          backgroundColor: '#fff',
          borderRadius: 12,
          shadowColor: '#000',
          shadowOpacity: 0.10,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
          zIndex: 10,
        }}
      >
        {/* Search row */}
        <View
          style={{
            height: 48,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
          }}
        >
          <Search size={18} color="#999" style={{ marginRight: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={(t) => {
              console.log('[Roster] Search query changed:', t);
              setSearchQuery(t);
            }}
            placeholder="Search your roster..."
            placeholderTextColor="#999"
            style={{ flex: 1, fontSize: 14, color: '#1A1A1A' }}
            returnKeyType="search"
          />
          <Pressable
            onPress={() => {
              console.log('[Roster] Filter toggle pressed, open:', !filterOpen);
              setFilterOpen((v) => !v);
            }}
            style={{ padding: 4 }}
          >
            <SlidersHorizontal size={18} color={filterOpen ? RED : '#999'} />
          </Pressable>
        </View>

        {/* Animated filter panel */}
        <Animated.View style={{ maxHeight: filterMaxHeight, overflow: 'hidden', opacity: filterOpacity }}>
          <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
            {/* Divider */}
            <View style={{ height: 1, backgroundColor: '#F0F0F0', marginBottom: 12 }} />

            {/* Sort by */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
              Sort by
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {SORT_OPTIONS.map((opt) => (
                <Chip
                  key={opt}
                  label={opt}
                  selected={sortBy === opt}
                  onPress={() => {
                    console.log('[Roster] Sort by selected:', opt);
                    setSortBy(opt);
                  }}
                />
              ))}
            </ScrollView>

            {/* Category */}
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
              Category
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {CATEGORY_OPTIONS.map((cat) => (
                <Chip
                  key={cat}
                  label={cat}
                  selected={selectedCategory === cat}
                  onPress={() => {
                    console.log('[Roster] Category filter selected:', cat);
                    setSelectedCategory(cat);
                  }}
                />
              ))}
            </View>
          </View>
        </Animated.View>
      </View>

      {/* ── List ── */}
      {loading ? (
        <View style={{ flex: 1, paddingTop: 16 }}>
          {[0, 1, 2, 3].map((i) => <SkeletonRow key={i} />)}
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ color: COLORS.danger, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
            Couldn't load your roster
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 20 }}>
            Check your connection and try again
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[Roster] Retry pressed');
              loadData();
            }}
            style={{ backgroundColor: RED, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Try Again</Text>
          </AnimatedPressable>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Who needs attention */}
          {persons.length > 0 && needsAttention.length > 0 && (
            <View style={{ paddingTop: 16, paddingBottom: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 16, marginBottom: 10 }}>
                Who needs attention?
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
                {needsAttention.map((p) => {
                  const days = Math.floor((Date.now() - new Date(p.created_at!).getTime()) / (1000 * 60 * 60 * 24));
                  const hasPhoto = !!p.photo_url && p.photo_url.length > 10;
                  const initials = getInitials(p.name);
                  const daysStr = String(days) + 'd ago';
                  const firstName = p.name.split(' ')[0];
                  return (
                    <AnimatedPressable
                      key={p.id}
                      onPress={() => {
                        console.log('[Roster] Needs attention card pressed:', p.id, p.name);
                        router.push(`/person/${p.id}`);
                      }}
                      style={{ alignItems: 'center', width: 68 }}
                    >
                      <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: '#FF9800', overflow: 'hidden', backgroundColor: RED, alignItems: 'center', justifyContent: 'center', marginBottom: 5 }}>
                        {hasPhoto ? (
                          <Image source={{ uri: p.photo_url }} style={{ width: 48, height: 48, borderRadius: 24 }} contentFit="cover" />
                        ) : (
                          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{initials}</Text>
                        )}
                      </View>
                      <Text style={{ fontSize: 11, color: '#1A1A1A', fontWeight: '600', textAlign: 'center' }} numberOfLines={1}>{firstName}</Text>
                      <Text style={{ fontSize: 10, color: '#FF9800', textAlign: 'center' }}>{daysStr}</Text>
                    </AnimatedPressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <FlatList
            data={sorted}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => <PersonCard item={item} index={index} />}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 40, paddingHorizontal: 32 }}>
                <Text style={{ fontSize: 32, marginBottom: 12 }}>💝</Text>
                <Text style={{ color: '#1A1A1A', fontSize: 18, fontWeight: '700', marginBottom: 6, textAlign: 'center' }}>
                  Start tracking your dating life
                </Text>
                <Text style={{ color: '#999', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 28 }}>
                  Get insights, spot patterns, and make better choices.
                </Text>
                {[
                  { step: '1', label: 'Add someone to your roster', icon: '👤' },
                  { step: '2', label: 'Rate them across 9 dimensions', icon: '⭐' },
                  { step: '3', label: 'Log dates and track trends', icon: '📅' },
                ].map((s) => (
                  <View key={s.step} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16, width: '100%' }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: RED, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{s.step}</Text>
                    </View>
                    <Text style={{ fontSize: 16 }}>{s.icon}</Text>
                    <Text style={{ color: '#1A1A1A', fontSize: 14, fontWeight: '500', flex: 1 }}>{s.label}</Text>
                  </View>
                ))}
                <Pressable
                  onPress={() => {
                    console.log('[Roster] Empty state onboarding — Add Your First Person pressed');
                    router.push('/add-person');
                  }}
                  style={{ backgroundColor: RED, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14, marginTop: 8 }}
                >
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Add Your First Person</Text>
                </Pressable>
              </View>
            }
          />
        </View>
      )}

      {/* ── Add New Person button ── */}
      {!loading && !error && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 16,
            paddingBottom: 100,
            paddingTop: 8,
            backgroundColor: 'transparent',
          }}
        >
          <AnimatedPressable
            onPress={() => {
              console.log('[Roster] Add New Person button pressed');
              router.push('/add-person');
            }}
            style={{
              backgroundColor: RED,
              borderRadius: 12,
              height: 52,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: RED,
              shadowOpacity: 0.35,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>⊕ Add New Person</Text>
          </AnimatedPressable>
        </View>
      )}
    </View>
  );
}
