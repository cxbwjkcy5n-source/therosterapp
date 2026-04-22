import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Animated,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { Stack, router, useFocusEffect, Redirect } from 'expo-router';
import { Plus, MoreHorizontal, Heart, ClipboardList } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/utils/api';
import type { ImageSourcePropType } from 'react-native';

interface Person {
  id: string;
  name: string;
  location: string;
  photo_url?: string;
  interest_level?: number;
  connection_type?: string;
  connection_type_custom?: string;
  is_benched?: boolean;
}

interface PendingDate {
  id: string;
  title: string;
  date_time: string;
  person_name: string;
  person_photo_url?: string;
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function getInterestColor(level?: number) {
  if (!level) return COLORS.textTertiary;
  if (level <= 3) return COLORS.interestLow;
  if (level <= 7) return COLORS.interestMid;
  return COLORS.interestHigh;
}

function getConnectionLabel(type?: string, custom?: string) {
  const map: Record<string, string> = {
    friend: 'Friend',
    casual: 'Casual',
    booty_call: 'Booty Call',
    foodie_call: 'Foodie Call',
    figuring_it_out: 'Figuring It Out',
    serious: 'Serious',
    other: custom || 'Other',
  };
  return type ? (map[type] || type) : '';
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function AnimatedCard({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

function SkeletonCard({ width }: { width: number }) {
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
      style={{ width, height: width, borderRadius: 16, backgroundColor: COLORS.surface, opacity, margin: 4 }}
    />
  );
}

function GhostCard({ width }: { width: number }) {
  return (
    <AnimatedPressable
      onPress={() => {
        console.log('[Home] Ghost card pressed — opening add person');
        router.push('/add-person');
      }}
      style={{ margin: 4 }}
    >
      <View
        style={{
          width,
          height: width,
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: COLORS.primary,
          borderStyle: 'dashed',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: COLORS.primaryMuted,
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: COLORS.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
          }}
        >
          <Plus size={24} color="#fff" />
        </View>
        <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
          Add your first person
        </Text>
      </View>
    </AnimatedPressable>
  );
}

function PendingReviewBanner({ dates }: { dates: PendingDate[] }) {
  if (dates.length === 0) return null;
  const first = dates[0];
  const countText = dates.length === 1 ? '1 date to review!' : `${dates.length} dates to review!`;

  return (
    <AnimatedPressable
      onPress={() => {
        console.log('[Home] Pending review banner pressed, navigating to date-review for:', first.id);
        router.push({
          pathname: '/date-review',
          params: {
            dateId: first.id,
            personName: first.person_name,
            personPhoto: first.person_photo_url || '',
          },
        });
      }}
    >
      <View
        style={{
          marginHorizontal: 12,
          marginTop: 12,
          marginBottom: 4,
          backgroundColor: COLORS.primary,
          borderRadius: 14,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ClipboardList size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 2 }}>
            You have {countText}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>
            Tap to review your date with {first.person_name}
          </Text>
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 20 }}>›</Text>
      </View>
    </AnimatedPressable>
  );
}

export default function HomeScreen() {
  const { user, loading: authLoading } = useAuth();
  const { width } = useWindowDimensions();
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDates, setPendingDates] = useState<PendingDate[]>([]);

  const cardWidth = (width - 48) / 2;

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      console.log('[Home] Loading persons and pending reviews');
      setLoading(true);
      setError(null);
      const [personsData, pendingData] = await Promise.all([
        apiGet<{ persons: Person[] }>('/api/persons'),
        apiGet<{ dates: PendingDate[] }>('/api/dates/pending-review').catch((e) => {
          console.error('[Home] Failed to load pending reviews (non-fatal):', e);
          return { dates: [] };
        }),
      ]);
      const active = (personsData.persons || []).filter((p) => !p.is_benched);
      console.log('[Home] Loaded', active.length, 'active persons,', pendingData.dates?.length ?? 0, 'pending reviews');
      setPersons(active);
      setPendingDates(pendingData.dates || []);
    } catch (e: any) {
      console.error('[Home] Failed to load persons:', e);
      setError('Could not load your roster');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  if (!authLoading && !user) {
    return <Redirect href="/auth-screen" />;
  }

  const handleLongPress = (person: Person) => {
    console.log('[Home] Long press on person:', person.id, person.name);
    Alert.alert(
      person.name,
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move to Bench',
          style: 'destructive',
          onPress: () => {
            console.log('[Home] Moving to bench:', person.id);
            router.push({ pathname: '/bench-reason', params: { personId: person.id, personName: person.name } });
          },
        },
      ]
    );
  };

  const renderCard = ({ item, index }: { item: Person; index: number }) => {
    const hasPhoto = !!item.photo_url;
    const initials = getInitials(item.name);
    const interestColor = getInterestColor(item.interest_level);
    const connectionLabel = getConnectionLabel(item.connection_type, item.connection_type_custom);

    return (
      <AnimatedCard index={index}>
        <AnimatedPressable
          onPress={() => {
            console.log('[Home] Navigating to person:', item.id);
            router.push(`/person/${item.id}`);
          }}
          onLongPress={() => handleLongPress(item)}
          style={{ margin: 4 }}
        >
          <View
            style={{
              width: cardWidth,
              height: cardWidth,
              borderRadius: 16,
              overflow: 'hidden',
              backgroundColor: COLORS.surface,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            {hasPhoto ? (
              <Image
                source={resolveImageSource(item.photo_url)}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <LinearGradient
                colors={['#F5E8E8', '#EDD5D5']}
                style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 36, fontWeight: '700', color: COLORS.primary }}>
                  {initials}
                </Text>
              </LinearGradient>
            )}

            {connectionLabel ? (
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'rgba(0,0,0,0.55)',
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>
                  {connectionLabel}
                </Text>
              </View>
            ) : null}

            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.75)']}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: 10,
                paddingTop: 24,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text
                  style={{ color: '#fff', fontSize: 14, fontWeight: '700', flex: 1 }}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: interestColor,
                    marginLeft: 4,
                  }}
                />
              </View>
              {item.location ? (
                <Text
                  style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 1 }}
                  numberOfLines={1}
                >
                  {item.location}
                </Text>
              ) : null}
            </LinearGradient>
          </View>
        </AnimatedPressable>
      </AnimatedCard>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen
        options={{
          title: 'Home',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerShadowVisible: false,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 8, marginRight: 4 }}>
              <AnimatedPressable
                onPress={() => {
                  console.log('[Home] Analytics pressed');
                  router.push('/analytics');
                }}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: COLORS.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Heart size={18} color={COLORS.primary} />
              </AnimatedPressable>
              <AnimatedPressable
                onPress={() => console.log('[Home] Menu pressed')}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: COLORS.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <MoreHorizontal size={18} color={COLORS.textSecondary} />
              </AnimatedPressable>
            </View>
          ),
        }}
      />

      {loading ? (
        <View style={{ flex: 1, padding: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} width={cardWidth} />
            ))}
          </View>
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
            onPress={loadData}
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: 12,
              paddingHorizontal: 24,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Try Again</Text>
          </AnimatedPressable>
        </View>
      ) : (
        <FlatList
          data={persons}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          numColumns={2}
          contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
          columnWrapperStyle={{ justifyContent: 'flex-start' }}
          contentInsetAdjustmentBehavior="automatic"
          ListHeaderComponent={<PendingReviewBanner dates={pendingDates} />}
          ListEmptyComponent={
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 0 }}>
              <GhostCard width={cardWidth} />
            </View>
          }
        />
      )}
    </View>
  );
}
