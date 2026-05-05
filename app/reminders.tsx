import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { Bell, Calendar, Zap, ChevronRight } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/contexts/ThemeContext';
import { apiGet } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';

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
  interest_level?: number | null;
  days_since_contact: number;
  message: string;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

async function scheduleRemindersFromFeed(upcomingDates: UpcomingDate[], nudges: Nudge[]) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[Reminders] Cleared all scheduled notifications');

    // Schedule date notifications (1 day before)
    for (const d of upcomingDates) {
      const dateMs = new Date(d.date_time).getTime();
      const oneDayBefore = dateMs - 24 * 60 * 60 * 1000;
      if (oneDayBefore > Date.now()) {
        const formattedTime = new Date(d.date_time).toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
        });
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `📅 Date with ${d.person_name}`,
            body: formattedTime,
            sound: true,
          },
          trigger: { date: new Date(oneDayBefore) } as any,
        });
        console.log('[Reminders] Scheduled date notification for:', d.person_name, 'at', new Date(oneDayBefore).toISOString());
      }
    }

    // Schedule nudge notifications (immediate / informational)
    for (const n of nudges) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: n.person_name,
          body: n.message,
          sound: true,
        },
        trigger: null,
      });
      console.log('[Reminders] Scheduled nudge notification for:', n.person_name);
    }
  } catch (e) {
    console.error('[Reminders] Failed to schedule notifications:', e);
  }
}

export default function RemindersScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [upcomingDates, setUpcomingDates] = useState<UpcomingDate[]>([]);
  const [nudges, setNudges] = useState<Nudge[]>([]);

  useEffect(() => {
    console.log('[Reminders] Fetching /api/reminders/feed');
    apiGet<{ upcoming_dates: UpcomingDate[]; nudges: Nudge[] }>('/api/reminders/feed')
      .then((data) => {
        console.log('[Reminders] Loaded', data.upcoming_dates?.length ?? 0, 'dates,', data.nudges?.length ?? 0, 'nudges');
        const dates = data.upcoming_dates || [];
        const nudgeList = data.nudges || [];
        setUpcomingDates(dates);
        setNudges(nudgeList);
        scheduleRemindersFromFeed(dates, nudgeList);
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
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
              color: colors.textTertiary,
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
                backgroundColor: colors.surface,
                borderRadius: 14,
                padding: 16,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
              }}
            >
              <Calendar size={28} color={colors.textTertiary} style={{ marginBottom: 8 }} />
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>No upcoming dates scheduled</Text>
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
                      backgroundColor: colors.surface,
                      borderRadius: 14,
                      padding: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
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
                        backgroundColor: colors.primaryMuted,
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
                        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 15 }}>{initials}</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                        {d.title}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                        {d.person_name}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
                        {formattedDate}
                      </Text>
                      {d.location ? (
                        <Text style={{ fontSize: 12, color: colors.textTertiary, marginTop: 1 }} numberOfLines={1}>
                          {d.location}
                        </Text>
                      ) : null}
                    </View>
                    <ChevronRight size={16} color={colors.textTertiary} />
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
              color: colors.textTertiary,
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
                backgroundColor: colors.surface,
                borderRadius: 14,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
              }}
            >
              <Zap size={28} color={colors.textTertiary} style={{ marginBottom: 8 }} />
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>You're on top of things!</Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {nudges.map((n) => {
                const initials = getInitials(n.person_name);
                const rawLevel = (n as any).interestLevel ?? n.interest_level;
                const interestDisplay = rawLevel != null ? `${rawLevel}/10` : null;
                return (
                  <Pressable
                    key={n.person_id}
                    onPress={() => {
                      console.log('[Reminders] Nudge pressed — navigating to person:', n.person_id, n.person_name);
                      router.push(`/person/${n.person_id}`);
                    }}
                    style={{
                      backgroundColor: colors.surface,
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
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }} numberOfLines={1}>
                        {n.person_name}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#FF9800', marginTop: 2 }} numberOfLines={2}>
                        {n.message}
                      </Text>
                    </View>
                    {interestDisplay != null && (
                      <View
                        style={{
                          backgroundColor: colors.primaryMuted,
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                        }}
                      >
                        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>{interestDisplay}</Text>
                      </View>
                    )}
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
