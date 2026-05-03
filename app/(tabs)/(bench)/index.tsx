import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Animated,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Users } from 'lucide-react-native';
import { Image } from 'expo-image';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet, apiPut } from '@/utils/api';
import type { ImageSourcePropType } from 'react-native';

interface Person {
  id: string;
  name: string;
  photo_url?: string;
  bench_reason?: string;
  updated_at?: string;
  is_benched?: boolean;
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
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

function formatBenchedDate(updatedAt?: string) {
  if (!updatedAt) return '';
  const d = new Date(updatedAt);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

function BenchCard({ item, onUnbench }: { item: Person; onUnbench: (p: Person) => void }) {
  const hasPhoto = !!item.photo_url;
  const initials = getInitials(item.name);
  const benchedDateLabel = formatBenchedDate(item.updated_at);
  const benchedOnText = benchedDateLabel ? `Benched on ${benchedDateLabel}` : '';

  return (
    <View
      style={{
        backgroundColor: '#fff',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      }}
    >
      {/* Avatar */}
      <Pressable onPress={() => {
        console.log('[Bench] Navigating to person:', item.id);
        router.push(`/person/${item.id}`);
      }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            borderWidth: 2,
            borderColor: '#E53935',
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFF0F0',
          }}
        >
          {hasPhoto ? (
            <Image
              source={resolveImageSource(item.photo_url)}
              style={{ width: 52, height: 52 }}
              contentFit="cover"
            />
          ) : (
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#E53935' }}>
              {initials}
            </Text>
          )}
        </View>
      </Pressable>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A' }} numberOfLines={1}>
            {item.name}
          </Text>
          {item.bench_reason ? (
            <View style={{ backgroundColor: '#F0F0F0', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, color: '#888', fontWeight: '500' }} numberOfLines={1}>
                {item.bench_reason}
              </Text>
            </View>
          ) : null}
        </View>
        {benchedOnText ? (
          <Text style={{ fontSize: 11, color: '#AAAAAA', marginTop: 2 }}>
            {benchedOnText}
          </Text>
        ) : null}

        {/* Move Back button */}
        <Pressable
          onPress={() => {
            console.log('[Bench] Move Back to Roster pressed for:', item.id, item.name);
            onUnbench(item);
          }}
          style={{
            marginTop: 8,
            height: 36,
            borderRadius: 20,
            borderWidth: 1.5,
            borderColor: '#E53935',
            alignItems: 'center',
            justifyContent: 'center',
            alignSelf: 'flex-start',
            paddingHorizontal: 16,
          }}
        >
          <Text style={{ color: '#E53935', fontSize: 13, fontWeight: '600' }}>
            Move Back to Roster
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function AnimatedBenchCard({ item, index, onUnbench }: { item: Person; index: number; onUnbench: (p: Person) => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 300, delay: index * 50, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <BenchCard item={item} onUnbench={onUnbench} />
    </Animated.View>
  );
}

export default function BenchScreen() {
  const { user } = useAuth();
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPersons = useCallback(async (isRefresh = false) => {
    if (!user) return;
    try {
      console.log('[Bench] Fetching benched persons from GET /api/persons?benched=true');
      if (!isRefresh) setLoading(true);
      setError(null);
      const data = await apiGet<{ persons: Person[] }>('/api/persons?benched=true');
      const benched = data.persons || [];
      console.log('[Bench] Benched persons loaded:', benched.length);
      setPersons(benched);
    } catch (e: any) {
      console.error('[Bench] Failed to load benched persons:', e);
      setError('Could not load bench');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadPersons();
    }, [loadPersons])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadPersons(true);
  }, [loadPersons]);

  const handleUnbench = useCallback(async (person: Person) => {
    console.log('[Bench] Unbenching person:', person.id, person.name);
    setPersons((prev) => prev.filter((p) => p.id !== person.id));
    try {
      const raw = await apiGet<any>(`/api/persons/${person.id}`);
      const full = raw?.person ?? raw;
      const ALLOWED = ['name','location','age','birthday','zodiac','instagram','tiktok','twitter_x','facebook','connection_type','connection_type_custom','interest_level','attractiveness','sexual_chemistry','communication','overall_chemistry','consistency','emotional_availability','date_planning','alignment','favorite_foods','hobbies','green_flags','red_flags','photo_url'];
      const payload: Record<string, any> = { is_benched: false, bench_reason: null };
      for (const key of ALLOWED) {
        const val = full?.[key];
        if (val !== undefined) {
          if ((key === 'zodiac' || key === 'connection_type') && !val) continue;
          payload[key] = val;
        }
      }
      await apiPut(`/api/persons/${person.id}`, payload);
      console.log('[Bench] Successfully moved back to roster:', person.id);
      loadPersons();
    } catch (e) {
      console.error('[Bench] Failed to unbench:', e);
      Alert.alert('Error', 'Could not move them back. Try again.');
      loadPersons();
    }
  }, [loadPersons]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
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
            onPress={() => loadPersons()}
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
              backgroundColor: '#FFF0F0',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Users size={32} color="#E53935" />
          </View>
          <Text style={{ color: '#1A1A1A', fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
            Your bench is empty
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', maxWidth: 260 }}>
            People you bench will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={persons}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <AnimatedBenchCard item={item} index={index} onUnbench={handleUnbench} />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
        />
      )}
    </View>
  );
}
