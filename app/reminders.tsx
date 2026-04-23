import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { Stack, router } from 'expo-router';
import { Bell, Calendar, Zap, ChevronRight } from 'lucide-react-native';
import { Image } from 'expo-image';
import { COLORS } from '@/constants/Colors';
import { apiGet } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface UpcomingDate {
  id: string;
  title: string;
  date_time: string;
  location?: string;
  person_name: string;
  person_photo_url?: string;
}

interface Nudge {
  person_id: string;
  person_name: string;
  person_photo_url?: string;
  interest_level: number;
  days_since_contact: number;
  message: string;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function RemindersScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [upcomingDates, setUpcomingDates] = useState<UpcomingDate[]>([]);
  const [nudges, setNudges] = useState<Nudge[]>([]);

  useEffect(() => {
    console.log('[Reminders] Fetching /api/reminders/feed');
    apiGet<{ upcoming_dates: UpcomingDate[]; nudges: Nudge[] }>('/api/reminders/feed')
      .then((data) => {
        console.log('[Reminders] Loaded', data.upcoming_dates?.length ?? 0, 'dates,', data.nudges?.length ?? 0, 'nudges');
        setUpcomingDates(data.upcoming_dates || []);
        setNudges(data.nudges || []);
      })
      .catch((e) => console.error('[Reminders] Failed to load:', e))
      .finally(() => setLoading(false));
  }, []);

  function formatDate(dt: string) {
    try {
      return new Date(dt).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dt;
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen
        options={{
          title: 'Reminders',
          headerShown: true,
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerShadowVisible: false,
          headerBackTitle: '',
        }}
      />
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Upcoming Dates */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: '#999',
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              marginBottom: 10,
            }}
          >
            Upcoming Dates
          </Text>

          {upcomingDates.length === 0 ? (
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 14,
                padding: 16,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: COLORS.border,
                alignItems: 'center',
              }}
            >
              <Calendar size={28} color="#CCC" style={{ marginBottom: 8 }} />
              <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>No upcoming dates scheduled</Text>
            </View>
          ) : (
            <View style={{ marginBottom: 20, gap: 10 }}>
              {upcomingDates.map((d) => {
                const formattedDate = formatDate(d.date_time);
                const initials = getInitials(d.person_name);
                return (
                  <Pressable
                    key={d.id}
                    onPress={() => {
                      console.log('[Reminders] Upcoming date pressed:', d.id, d.title);
                      router.push('/date-plan');
                    }}
                    style={{
                      backgroundColor: '#fff',
                      borderRadius: 14,
                      padding: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      shadowColor: '#000',
                      shadowOpacity: 0.04,
                      shadowRadius: 6,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 1,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: COLORS.primaryMuted,
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {d.person_photo_url ? (
                        <Image
                          source={{ uri: d.person_photo_url }}
                          style={{ width: 44, height: 44 }}
                          contentFit="cover"
                        />
                      ) : (
                        <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 15 }}>{initials}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A' }} numberOfLines={1}>
                        {d.title}
                      </Text>
                      <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
                        {d.person_name}
                      </Text>
                      <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 1 }}>
                        {formattedDate}
                      </Text>
                      {d.location ? (
                        <Text style={{ fontSize: 12, color: COLORS.textTertiary, marginTop: 1 }} numberOfLines={1}>
                          {d.location}
                        </Text>
                      ) : null}
                    </View>
                    <ChevronRight size={16} color={COLORS.textTertiary} />
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Nudges */}
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: '#999',
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              marginBottom: 10,
            }}
          >
            Nudges
          </Text>

          {nudges.length === 0 ? (
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 14,
                padding: 16,
                borderWidth: 1,
                borderColor: COLORS.border,
                alignItems: 'center',
              }}
            >
              <Zap size={28} color="#CCC" style={{ marginBottom: 8 }} />
              <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>You're on top of things!</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {nudges.map((n) => {
                const initials = getInitials(n.person_name);
                const interestDisplay = String(n.interest_level) + '/10';
                return (
                  <Pressable
                    key={n.person_id}
                    onPress={() => {
                      console.log('[Reminders] Nudge pressed — navigating to person:', n.person_id, n.person_name);
                      router.push(`/person/${n.person_id}`);
                    }}
                    style={{
                      backgroundColor: '#fff',
                      borderRadius: 14,
                      padding: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      borderWidth: 1,
                      borderColor: '#FFE0B2',
                      shadowColor: '#000',
                      shadowOpacity: 0.04,
                      shadowRadius: 6,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 1,
                    }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        backgroundColor: '#FFF3E0',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {n.person_photo_url ? (
                        <Image
                          source={{ uri: n.person_photo_url }}
                          style={{ width: 44, height: 44 }}
                          contentFit="cover"
                        />
                      ) : (
                        <Text style={{ color: '#FF9800', fontWeight: '700', fontSize: 15 }}>{initials}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A' }} numberOfLines={1}>
                        {n.person_name}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#FF9800', marginTop: 2 }} numberOfLines={2}>
                        {n.message}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: COLORS.primaryMuted,
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                      }}
                    >
                      <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700' }}>{interestDisplay}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
