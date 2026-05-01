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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useFocusEffect, Redirect } from 'expo-router';
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

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <AnimatedPressable
        onPress={() => {
          console.log('[Roster] Navigating to person:', item.id, item.name);
          router.push(`/person/${item.id}`);
        }}
        style={{
          marginHorizontal: 16,
          marginVertical: 4,
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: 14,
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
            width: 64,
            height: 64,
            borderRadius: 32,
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
              style={{ width: 60, height: 60, borderRadius: 30 }}
              contentFit="cover"
            />
          ) : (
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>{initials}</Text>
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
        </View>

        {/* Score ring */}
        <CircleScore score={score} size={52} />
      </AnimatedPressable>
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
            const profileData = res?.profile ?? {};
            const photoUrl = profileData?.photoUrl ?? profileData?.photo_url ?? null;
            console.log('[Roster] Profile photoUrl length:', photoUrl?.length ?? 0);
            setProfilePhotoUrl(photoUrl);
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

  if (!authLoading && !user) {
    return <Redirect href="/auth-screen" />;
  }

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

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Stack.Screen options={{ headerShown: false }} />

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
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <PersonCard item={item} index={index} />}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
              <Text style={{ color: '#999', fontSize: 15, marginBottom: 12 }}>
                No one on your roster yet
              </Text>
              <Pressable
                onPress={() => {
                  console.log('[Roster] Empty state add someone pressed');
                  router.push('/add-person');
                }}
              >
                <Text style={{ color: RED, fontSize: 15, fontWeight: '600' }}>+ Add someone</Text>
              </Pressable>
            </View>
          }
        />
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
