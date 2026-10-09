import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Stack } from 'expo-router';
import { X as XIcon, ChevronLeft, ChevronRight, MapPin } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/contexts/ThemeContext';
import { apiGet } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DateEntry {
  id: string;
  person_id: string;
  person_name?: string;
  date_time?: string;
  location?: string;
  status?: string;
  title?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DOT_COLORS = [
  '#E53935', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0',
  '#00BCD4', '#FF5722', '#607D8B',
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function hashPersonId(personId: string): number {
  let hash = 0;
  for (let i = 0; i < personId.length; i++) {
    hash = (hash * 31 + personId.charCodeAt(i)) % DOT_COLORS.length;
  }
  return hash;
}

function getPersonColor(personId: string): string {
  return DOT_COLORS[hashPersonId(personId)];
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDateFull(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DateCalendarScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [dates, setDates] = useState<DateEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [dayModalVisible, setDayModalVisible] = useState(false);

  const loadDates = useCallback(async () => {
    console.log('[DateCalendar] Loading all dates');
    setLoading(true);
    try {
      const data = await apiGet<{ dates: DateEntry[] }>('/api/dates');
      console.log('[DateCalendar] Loaded', data.dates?.length ?? 0, 'dates');
      setDates(data.dates || []);
    } catch (e) {
      console.error('[DateCalendar] Failed to load dates:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadDates();
  }, [loadDates]));

  const prevMonth = () => {
    console.log('[DateCalendar] Previous month pressed');
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
    setSelectedDay(null);
  };

  const nextMonth = () => {
    console.log('[DateCalendar] Next month pressed');
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
    setSelectedDay(null);
  };

  // Build a map: day -> dates on that day
  const datesOnDay: Record<number, DateEntry[]> = {};
  for (const d of dates) {
    if (!d.date_time) continue;
    const dt = new Date(d.date_time);
    if (isNaN(dt.getTime())) continue;
    if (dt.getFullYear() === viewYear && dt.getMonth() === viewMonth) {
      const day = dt.getDate();
      if (!datesOnDay[day]) datesOnDay[day] = [];
      datesOnDay[day].push(d);
    }
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  // Build calendar grid
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  const todayDay = now.getDate();
  const isCurrentMonth = now.getFullYear() === viewYear && now.getMonth() === viewMonth;

  // Upcoming dates (next 5)
  const upcomingDates = [...dates]
    .filter((d) => d.date_time && new Date(d.date_time) >= now)
    .sort((a, b) => new Date(a.date_time!).getTime() - new Date(b.date_time!).getTime())
    .slice(0, 5);

  const selectedDayDates = selectedDay !== null ? (datesOnDay[selectedDay] || []) : [];

  const statusBadgeColor = (status?: string) => {
    if (status === 'completed' || status === 'reviewed') return colors.success;
    if (status === 'planned') return colors.primary;
    return colors.textTertiary;
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={{
        backgroundColor: colors.surface,
        paddingTop: insets.top + 8,
        paddingBottom: 16,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
        <Pressable
          onPress={() => {
            console.log('[DateCalendar] Back pressed');
            router.back();
          }}
          style={{ marginRight: 12, padding: 4 }}
          hitSlop={8}
        >
          <XIcon size={22} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, color: colors.text, fontSize: 18, fontWeight: '700' }}>
          Date Calendar 📅
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Month navigation */}
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Pressable onPress={prevMonth} style={{ padding: 8 }}>
                <ChevronLeft size={22} color={colors.text} />
              </Pressable>
              <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>
                {MONTH_NAMES[viewMonth]}
                {' '}
                {String(viewYear)}
              </Text>
              <Pressable onPress={nextMonth} style={{ padding: 8 }}>
                <ChevronRight size={22} color={colors.text} />
              </Pressable>
            </View>

            {/* Day headers */}
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              {DAY_NAMES.map((d) => (
                <View key={d} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ color: colors.textTertiary, fontSize: 11, fontWeight: '600' }}>{d}</Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            {Array.from({ length: calendarCells.length / 7 }, (_, rowIdx) => (
              <View key={rowIdx} style={{ flexDirection: 'row', marginBottom: 4 }}>
                {calendarCells.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, colIdx) => {
                  if (day === null) {
                    return <View key={colIdx} style={{ flex: 1 }} />;
                  }
                  const dayDates = datesOnDay[day] || [];
                  const isToday = isCurrentMonth && day === todayDay;
                  const isSelected = selectedDay === day;
                  const hasDates = dayDates.length > 0;

                  return (
                    <Pressable
                      key={colIdx}
                      onPress={() => {
                        if (hasDates) {
                          console.log('[DateCalendar] Day pressed:', day, 'dates:', dayDates.length);
                          setSelectedDay(day);
                          setDayModalVisible(true);
                        }
                      }}
                      style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}
                    >
                      <View style={{
                        width: 32, height: 32, borderRadius: 16,
                        backgroundColor: isSelected ? colors.primary : isToday ? colors.primaryMuted : 'transparent',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{
                          color: isSelected ? '#fff' : isToday ? colors.primary : colors.text,
                          fontSize: 13,
                          fontWeight: isToday || isSelected ? '700' : '400',
                        }}>
                          {String(day)}
                        </Text>
                      </View>
                      {/* Dots */}
                      {hasDates && (
                        <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
                          {dayDates.slice(0, 3).map((d, i) => (
                            <View
                              key={i}
                              style={{
                                width: 5, height: 5, borderRadius: 3,
                                backgroundColor: getPersonColor(d.person_id || d.id),
                              }}
                            />
                          ))}
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Upcoming dates */}
          {upcomingDates.length > 0 && (
            <View style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border,
            }}>
              <Text style={{
                color: colors.textTertiary,
                fontSize: 11,
                fontWeight: '600',
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                marginBottom: 12,
              }}>
                Upcoming
              </Text>
              <View style={{ gap: 10 }}>
                {upcomingDates.map((d) => {
                  const personColor = getPersonColor(d.person_id || d.id);
                  const timeStr = formatTime(d.date_time || '');
                  const dateStr = formatDateFull(d.date_time || '');
                  const statusColor = statusBadgeColor(d.status);
                  const statusLabel = d.status ? d.status.charAt(0).toUpperCase() + d.status.slice(1) : 'Planned';

                  return (
                    <View key={d.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                      <View style={{
                        width: 10, height: 10, borderRadius: 5,
                        backgroundColor: personColor, marginTop: 4,
                      }} />
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 }}>
                            {d.person_name || 'Unknown'}
                          </Text>
                          <View style={{
                            backgroundColor: statusColor + '20',
                            borderRadius: 6,
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                          }}>
                            <Text style={{ color: statusColor, fontSize: 11, fontWeight: '600' }}>{statusLabel}</Text>
                          </View>
                        </View>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 1 }}>{dateStr}</Text>
                        {timeStr ? (
                          <Text style={{ color: colors.textTertiary, fontSize: 12 }}>{timeStr}</Text>
                        ) : null}
                        {d.location ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <MapPin size={11} color={colors.textTertiary} />
                            <Text style={{ color: colors.textTertiary, fontSize: 12 }} numberOfLines={1}>{d.location}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Day detail modal */}
      <Modal
        visible={dayModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDayModalVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => setDayModalVisible(false)}
        >
          <View style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: insets.bottom + 24,
            maxHeight: '70%',
          }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 16 }}>
              {selectedDay !== null ? `${MONTH_NAMES[viewMonth]} ${String(selectedDay)}` : ''}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ gap: 12 }}>
                {selectedDayDates.map((d) => {
                  const personColor = getPersonColor(d.person_id || d.id);
                  const timeStr = formatTime(d.date_time || '');
                  const statusColor = statusBadgeColor(d.status);
                  const statusLabel = d.status ? d.status.charAt(0).toUpperCase() + d.status.slice(1) : 'Planned';

                  return (
                    <View key={d.id} style={{
                      backgroundColor: colors.surfaceSecondary,
                      borderRadius: 12,
                      padding: 14,
                      borderLeftWidth: 3,
                      borderLeftColor: personColor,
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>
                          {d.person_name || 'Unknown'}
                        </Text>
                        <View style={{
                          backgroundColor: statusColor + '20',
                          borderRadius: 6,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                        }}>
                          <Text style={{ color: statusColor, fontSize: 11, fontWeight: '600' }}>{statusLabel}</Text>
                        </View>
                      </View>
                      {timeStr ? (
                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{timeStr}</Text>
                      ) : null}
                      {d.location ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                          <MapPin size={12} color={colors.textTertiary} />
                          <Text style={{ color: colors.textTertiary, fontSize: 13 }} numberOfLines={1}>{d.location}</Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
