import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Stack } from 'expo-router';
import { X as XIcon, Archive, RotateCcw } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/contexts/ThemeContext';
import { apiGet, apiPost } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ImageSourcePropType } from 'react-native';

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

interface ArchivedPerson {
  id: string;
  name: string;
  photo_url?: string;
  created_at: string;
  archived_at: string;
  total_dates: number;
  avg_rating: number;
  days_on_roster: number;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function ArchiveScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [persons, setPersons] = useState<ArchivedPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [unarchiving, setUnarchiving] = useState<string | null>(null);

  const loadArchived = useCallback(async () => {
    console.log('[Archive] Loading archived persons');
    setLoading(true);
    try {
      const data = await apiGet<{ persons: ArchivedPerson[] }>('/api/persons/archived');
      console.log('[Archive] Loaded', data.persons?.length ?? 0, 'archived persons');
      setPersons(data.persons || []);
    } catch (e) {
      console.error('[Archive] Failed to load archived persons:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadArchived();
  }, [loadArchived]));

  const handleUnarchive = async (person: ArchivedPerson) => {
    console.log('[Archive] Unarchive pressed for:', person.name, person.id);
    Alert.alert(
      'Unarchive?',
      `Move ${person.name} back to your active roster?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unarchive',
          onPress: async () => {
            setUnarchiving(person.id);
            try {
              await apiPost(`/api/persons/${person.id}/unarchive`, {});
              console.log('[Archive] Unarchived:', person.id);
              setPersons((prev) => prev.filter((p) => p.id !== person.id));
            } catch (e: any) {
              console.error('[Archive] Failed to unarchive:', e);
              Alert.alert('Error', e?.message || 'Could not unarchive. Try again.');
            } finally {
              setUnarchiving(null);
            }
          },
        },
      ]
    );
  };

  // Aggregate stats
  const totalArchived = persons.length;
  const avgDaysOnRoster = totalArchived > 0
    ? Math.round(persons.reduce((sum, p) => sum + (p.days_on_roster || 0), 0) / totalArchived)
    : 0;
  const avgDatesBeforeArchive = totalArchived > 0
    ? (persons.reduce((sum, p) => sum + (p.total_dates || 0), 0) / totalArchived).toFixed(1)
    : '0';

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
            console.log('[Archive] Back pressed');
            router.back();
          }}
          style={{ marginRight: 12, padding: 4 }}
          hitSlop={8}
        >
          <XIcon size={22} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, color: colors.text, fontSize: 18, fontWeight: '700' }}>
          Archive 📦
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
          {/* Aggregate stats */}
          {totalArchived > 0 && (
            <View style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: colors.border,
              flexDirection: 'row',
              gap: 0,
            }}>
              {[
                { label: 'Total Archived', value: String(totalArchived) },
                { label: 'Avg Days', value: String(avgDaysOnRoster) },
                { label: 'Avg Dates', value: String(avgDatesBeforeArchive) },
              ].map((stat, i) => (
                <View key={stat.label} style={{ flex: 1, alignItems: 'center', borderRightWidth: i < 2 ? 1 : 0, borderRightColor: colors.border }}>
                  <Text style={{ color: colors.primary, fontSize: 22, fontWeight: '800' }}>{stat.value}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>{stat.label}</Text>
                </View>
              ))}
            </View>
          )}

          {persons.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <View style={{
                width: 64, height: 64, borderRadius: 32,
                backgroundColor: colors.surfaceSecondary,
                alignItems: 'center', justifyContent: 'center', marginBottom: 16,
              }}>
                <Archive size={28} color={colors.textTertiary} />
              </View>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 6 }}>
                No archived people yet
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>
                People you archive will appear here
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {persons.map((person) => {
                const initials = getInitials(person.name);
                const archivedDateStr = formatDate(person.archived_at);
                const avgRatingStr = person.avg_rating > 0 ? Number(person.avg_rating).toFixed(1) : '—';
                const totalDatesStr = String(person.total_dates || 0);
                const daysStr = String(person.days_on_roster || 0);
                const isUnarchiving = unarchiving === person.id;

                return (
                  <View
                    key={person.id}
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 16,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      {/* Photo */}
                      {person.photo_url ? (
                        <Image
                          source={resolveImageSource(person.photo_url)}
                          style={{ width: 44, height: 44, borderRadius: 22 }}
                          contentFit="cover"
                        />
                      ) : (
                        <View style={{
                          width: 44, height: 44, borderRadius: 22,
                          backgroundColor: colors.primary,
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{initials}</Text>
                        </View>
                      )}

                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{person.name}</Text>
                        <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 2 }}>
                          {'Archived '}
                          {archivedDateStr}
                        </Text>
                      </View>

                      <Pressable
                        onPress={() => handleUnarchive(person)}
                        disabled={isUnarchiving}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          backgroundColor: colors.successMuted,
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          opacity: isUnarchiving ? 0.6 : 1,
                        }}
                      >
                        {isUnarchiving ? (
                          <ActivityIndicator size="small" color={colors.success} />
                        ) : (
                          <>
                            <RotateCcw size={14} color={colors.success} />
                            <Text style={{ color: colors.success, fontSize: 13, fontWeight: '600' }}>Unarchive</Text>
                          </>
                        )}
                      </Pressable>
                    </View>

                    {/* Stats row */}
                    <View style={{
                      flexDirection: 'row',
                      backgroundColor: colors.surfaceSecondary,
                      borderRadius: 10,
                      padding: 10,
                      gap: 0,
                    }}>
                      {[
                        { label: 'Dates', value: totalDatesStr },
                        { label: 'Days on roster', value: daysStr },
                        { label: 'Avg rating', value: avgRatingStr },
                      ].map((stat, i) => (
                        <View key={stat.label} style={{ flex: 1, alignItems: 'center', borderRightWidth: i < 2 ? 1 : 0, borderRightColor: colors.border }}>
                          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>{stat.value}</Text>
                          <Text style={{ color: colors.textTertiary, fontSize: 10, marginTop: 1 }}>{stat.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
