import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Animated,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { Users, BarChart2, MoreHorizontal, Heart } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet, apiPost } from '@/utils/api';
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
  bench_reason?: string;
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
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
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
      style={{
        width,
        height: width,
        borderRadius: 16,
        backgroundColor: COLORS.surface,
        opacity,
        margin: 4,
      }}
    />
  );
}

export default function BenchScreen() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cardWidth = (width - 48) / 2;

  const loadPersons = useCallback(async () => {
    if (!user) return;
    try {
      console.log('[Bench] Loading benched persons');
      setLoading(true);
      setError(null);
      const data = await apiGet<{ persons: Person[] }>('/api/persons?benched=true');
      const benched = (data.persons || []).filter((p) => p.is_benched);
      console.log('[Bench] Loaded', benched.length, 'benched persons');
      setPersons(benched);
    } catch (e: any) {
      console.error('[Bench] Failed to load persons:', e);
      setError('Could not load bench');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadPersons();
    }, [loadPersons])
  );

  const handleUnbench = async (person: Person) => {
    console.log('[Bench] Unbenching person:', person.id, person.name);
    Alert.alert(
      `Bring back ${person.name}?`,
      'They will be moved back to your active roster.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Bring Back',
          onPress: async () => {
            try {
              await apiPost(`/api/persons/${person.id}/unbenched`, {});
              console.log('[Bench] Successfully unbenched:', person.id);
              loadPersons();
            } catch (e) {
              console.error('[Bench] Failed to unbench:', e);
              Alert.alert('Error', 'Could not bring them back. Try again.');
            }
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
            console.log('[Bench] Navigating to person:', item.id);
            router.push(`/person/${item.id}`);
          }}
          onLongPress={() => handleUnbench(item)}
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
                colors={['#2A1A1A', '#1A0D0D']}
                style={{
                  width: '100%',
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 36, fontWeight: '700', color: COLORS.primary }}>
                  {initials}
                </Text>
              </LinearGradient>
            )}

            {/* Bench overlay */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.55)',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 12,
              }}
            >
              <Text
                style={{
                  color: COLORS.accent,
                  fontSize: 11,
                  fontWeight: '700',
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                Benched
              </Text>
              {item.bench_reason ? (
                <Text
                  style={{
                    color: COLORS.text,
                    fontSize: 12,
                    textAlign: 'center',
                    opacity: 0.9,
                  }}
                  numberOfLines={2}
                >
                  {item.bench_reason}
                </Text>
              ) : null}
            </View>

            {/* Connection badge */}
            {connectionLabel ? (
              <View
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  borderRadius: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text style={{ color: COLORS.text, fontSize: 10, fontWeight: '600' }}>
                  {connectionLabel}
                </Text>
              </View>
            ) : null}

            {/* Bottom info */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.85)']}
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
                  style={{ color: COLORS.text, fontSize: 14, fontWeight: '700', flex: 1 }}
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
                  style={{ color: COLORS.textSecondary, fontSize: 11, marginTop: 1 }}
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
          title: 'Bench',
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 8, marginRight: 4 }}>
              <AnimatedPressable
                onPress={() => {
                  console.log('[Bench] Analytics pressed');
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
                onPress={() => console.log('[Bench] Menu pressed')}
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

      {loading ? (
        <View style={{ flex: 1, padding: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} width={cardWidth} />
            ))}
          </View>
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ color: COLORS.danger, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
            Couldn't load bench
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 20 }}>
            Check your connection and try again
          </Text>
          <AnimatedPressable
            onPress={loadPersons}
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
      ) : persons.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              backgroundColor: COLORS.accentMuted,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Users size={32} color={COLORS.accent} />
          </View>
          <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
            Your bench is empty
          </Text>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 14,
              textAlign: 'center',
              maxWidth: 260,
            }}
          >
            People you bench will appear here. Long press a card to bring them back.
          </Text>
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
        />
      )}
    </View>
  );
}
