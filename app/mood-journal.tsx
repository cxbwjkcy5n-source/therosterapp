import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ArrowLeft, BookHeart } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { apiGet, apiPost, apiDelete } from '@/utils/api';

interface MoodEntry {
  id: string;
  mood: number;
  note?: string;
  created_at: string;
}

const MOOD_EMOJIS: Record<number, string> = {
  1: '😞',
  2: '😔',
  3: '😕',
  4: '😐',
  5: '🙂',
  6: '😊',
  7: '😄',
  8: '😁',
  9: '🥰',
  10: '🤩',
};

function getMoodColor(mood: number): string {
  if (mood <= 3) return '#EF4444';
  if (mood <= 5) return '#F59E0B';
  if (mood <= 7) return '#22C55E';
  return '#6366F1';
}

function MoodTrendLine({ entries, colors }: { entries: MoodEntry[]; colors: any }) {
  // Show last 7 days
  const now = new Date();
  const days: { label: string; mood: number | null }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10);
    const dayEntries = entries.filter((e) => e.created_at.slice(0, 10) === dayStr);
    const avgMood =
      dayEntries.length > 0
        ? dayEntries.reduce((sum, e) => sum + e.mood, 0) / dayEntries.length
        : null;
    const label = d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1);
    days.push({ label, mood: avgMood });
  }

  const chartHeight = 60;
  const dotSize = 8;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text
        style={{
          color: colors.textTertiary,
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        7-Day Mood Trend
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: chartHeight + 24, gap: 0 }}>
        {days.map((day, index) => {
          const hasMood = day.mood !== null;
          const yPos = hasMood ? chartHeight - ((day.mood! / 10) * chartHeight) : chartHeight / 2;
          const dotColor = hasMood ? getMoodColor(day.mood!) : colors.border;

          return (
            <View key={index} style={{ flex: 1, alignItems: 'center' }}>
              {/* Dot */}
              <View style={{ height: chartHeight, justifyContent: 'flex-start', alignItems: 'center', width: '100%' }}>
                <View
                  style={{
                    marginTop: yPos,
                    width: dotSize,
                    height: dotSize,
                    borderRadius: dotSize / 2,
                    backgroundColor: dotColor,
                    opacity: hasMood ? 1 : 0.3,
                  }}
                />
              </View>
              {/* Day label */}
              <Text style={{ color: colors.textTertiary, fontSize: 10, marginTop: 4 }}>{day.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function MoodJournalScreen() {
  const { colors } = useTheme();
  const [entries, setEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [logging, setLogging] = useState(false);

  const loadEntries = useCallback(async () => {
    console.log('[MoodJournal] Loading mood entries');
    try {
      const res = await apiGet<{ entries: MoodEntry[] }>('/api/mood-journal');
      console.log('[MoodJournal] Loaded', res.entries?.length ?? 0, 'entries');
      setEntries(res.entries || []);
    } catch (e) {
      console.error('[MoodJournal] Failed to load entries:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries])
  );

  const handleLogMood = async () => {
    if (!selectedMood) {
      Alert.alert('Select a mood', 'Please select a mood before logging.');
      return;
    }
    console.log('[MoodJournal] Log Mood pressed, mood:', selectedMood, 'note:', note.slice(0, 40));
    setLogging(true);
    try {
      const res = await apiPost<{ entry: MoodEntry }>('/api/mood-journal', {
        mood: selectedMood,
        note: note.trim() || undefined,
      });
      console.log('[MoodJournal] Mood logged, id:', res.entry?.id);
      setEntries((prev) => [res.entry, ...prev]);
      setSelectedMood(null);
      setNote('');
    } catch (e) {
      console.error('[MoodJournal] Failed to log mood:', e);
      Alert.alert('Error', 'Could not log mood. Try again.');
    } finally {
      setLogging(false);
    }
  };

  const handleDelete = (entry: MoodEntry) => {
    console.log('[MoodJournal] Long press delete on entry:', entry.id);
    Alert.alert('Delete Entry', 'Remove this mood entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          console.log('[MoodJournal] Deleting entry:', entry.id);
          try {
            await apiDelete(`/api/mood-journal/${entry.id}`);
            setEntries((prev) => prev.filter((e) => e.id !== entry.id));
            console.log('[MoodJournal] Entry deleted:', entry.id);
          } catch (e) {
            console.error('[MoodJournal] Failed to delete entry:', e);
            Alert.alert('Error', 'Could not delete entry.');
          }
        },
      },
    ]);
  };

  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => {
            console.log('[MoodJournal] Back button pressed');
            router.back();
          }}
          hitSlop={8}
          style={{ padding: 4 }}
        >
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, color: colors.text, fontSize: 20, fontWeight: '700' }}>
          Mood Journal
        </Text>
        <BookHeart size={22} color="#EC4899" />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Mood input section */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 18,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 14,
          }}
        >
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}
          >
            How are you feeling?
          </Text>

          {/* Mood emoji grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const).map((m) => {
              const isSelected = selectedMood === m;
              const moodColor = getMoodColor(m);
              return (
                <Pressable
                  key={m}
                  onPress={() => {
                    console.log('[MoodJournal] Mood selected:', m);
                    setSelectedMood(m);
                  }}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isSelected ? moodColor + '20' : colors.surfaceSecondary,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? moodColor : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 22 }}>{MOOD_EMOJIS[m]}</Text>
                  <Text
                    style={{
                      color: isSelected ? moodColor : colors.textTertiary,
                      fontSize: 10,
                      fontWeight: '700',
                      marginTop: 1,
                    }}
                  >
                    {m}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Note input */}
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Add a note (optional)..."
            placeholderTextColor={colors.textTertiary}
            multiline
            style={{
              backgroundColor: colors.surfaceSecondary,
              borderRadius: 12,
              padding: 12,
              color: colors.text,
              fontSize: 14,
              minHeight: 60,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />

          {/* Log button */}
          <Pressable
            onPress={handleLogMood}
            disabled={logging || !selectedMood}
            style={{
              backgroundColor: selectedMood ? '#EC4899' : colors.surfaceSecondary,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {logging ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={{ fontSize: 16 }}>📝</Text>
                <Text
                  style={{
                    color: selectedMood ? '#fff' : colors.textTertiary,
                    fontSize: 15,
                    fontWeight: '700',
                  }}
                >
                  Log Mood
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* 7-day trend */}
        {entries.length > 0 && <MoodTrendLine entries={entries} colors={colors} />}

        {/* Entries list */}
        <View>
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            Past Entries
          </Text>

          {loading ? (
            <ActivityIndicator color="#EC4899" style={{ marginVertical: 20 }} />
          ) : sortedEntries.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📓</Text>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 6 }}>
                No entries yet
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>
                Start tracking how your dating life makes you feel.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {sortedEntries.map((entry) => {
                const moodColor = getMoodColor(entry.mood);
                const moodEmoji = MOOD_EMOJIS[entry.mood] ?? '😐';
                const moodNum = String(entry.mood);
                const dateLabel = new Date(entry.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                });
                return (
                  <Pressable
                    key={entry.id}
                    delayLongPress={600}
                    onLongPress={() => handleDelete(entry)}
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 14,
                      padding: 14,
                      borderWidth: 1,
                      borderColor: colors.border,
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: 12,
                    }}
                  >
                    {/* Mood indicator */}
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        backgroundColor: moodColor + '15',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: moodColor + '30',
                      }}
                    >
                      <Text style={{ fontSize: 22 }}>{moodEmoji}</Text>
                      <Text style={{ color: moodColor, fontSize: 10, fontWeight: '700' }}>{moodNum}</Text>
                    </View>

                    {/* Content */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.textTertiary, fontSize: 12, marginBottom: 4 }}>
                        {dateLabel}
                      </Text>
                      {entry.note ? (
                        <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>
                          {entry.note}
                        </Text>
                      ) : (
                        <Text style={{ color: colors.textTertiary, fontSize: 13, fontStyle: 'italic' }}>
                          No note
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
