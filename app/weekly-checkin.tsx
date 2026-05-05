import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { apiGet, apiPost } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

export default function WeeklyCheckinScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [mood, setMood] = useState(7);
  const [mostExcited, setMostExcited] = useState('');
  const [oneThingToChange, setOneThingToChange] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recentCheckin, setRecentCheckin] = useState<{ days: number } | null>(null);
  const [showAnyway, setShowAnyway] = useState(false);

  useEffect(() => {
    if (!user) return;
    console.log('[WeeklyCheckin] Checking for recent check-in');
    apiGet<{ checkin: { created_at: string } | null }>('/api/weekly-checkins/latest')
      .then((res) => {
        if (res.checkin) {
          const days = Math.floor((Date.now() - new Date(res.checkin.created_at).getTime()) / (1000 * 60 * 60 * 24));
          if (days < 7) setRecentCheckin({ days });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const handleSubmit = async () => {
    console.log('[WeeklyCheckin] Submitting check-in, mood:', mood);
    setSaving(true);
    try {
      await apiPost('/api/weekly-checkins', {
        mood,
        most_excited_person: mostExcited.trim() || undefined,
        one_thing_to_change: oneThingToChange.trim() || undefined,
      });
      console.log('[WeeklyCheckin] Check-in saved successfully');

      // Fetch updated streak
      let streakMessage = '';
      try {
        const streakData = await apiGet<{ current_streak: number; longest_streak: number }>('/api/streaks/me');
        const currentStreak = streakData?.current_streak ?? 0;
        console.log('[WeeklyCheckin] Updated streak:', currentStreak);
        if (currentStreak >= 1) {
          streakMessage = `\n\n🔥 You're on a ${currentStreak}-week streak!`;
        }
      } catch (e) {
        console.log('[WeeklyCheckin] Could not fetch streak (non-fatal):', e);
      }

      Alert.alert('Done!', `Your weekly check-in has been saved.${streakMessage}`, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      console.error('[WeeklyCheckin] Failed to save check-in:', e);
      Alert.alert('Error', 'Could not save your check-in. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (recentCheckin && !showAnyway) {
    const daysAgoText = recentCheckin.days === 0 ? 'today' : `${recentCheckin.days} day${recentCheckin.days === 1 ? '' : 's'} ago`;
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>✅</Text>
        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 8 }}>
          Already checked in
        </Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 28 }}>
          {'You did your weekly check-in '}
          {daysAgoText}
          {'.'}
        </Text>
        <Pressable
          onPress={() => {
            console.log('[WeeklyCheckin] Do another check-in anyway pressed');
            setShowAnyway(true);
          }}
          style={{ backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 13, marginBottom: 12 }}
        >
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>Do another check-in anyway</Text>
        </Pressable>
        <Pressable onPress={() => {
          console.log('[WeeklyCheckin] Go back pressed from already-checked-in screen');
          router.back();
        }}>
          <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Mood */}
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 }}>
        {'How\'s your dating life feeling? 🌡️'}
      </Text>
      <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 16 }}>
        {'Mood: '}
        {mood}
        {'/10'}
      </Text>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 28, flexWrap: 'wrap' }}>
        {[1,2,3,4,5,6,7,8,9,10].map((n) => {
          const isSelected = mood === n;
          return (
            <Pressable
              key={n}
              onPress={() => {
                console.log('[WeeklyCheckin] Mood selected:', n);
                setMood(n);
              }}
              style={{
                width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
                backgroundColor: isSelected ? colors.primary : colors.surface,
                borderWidth: 1.5, borderColor: isSelected ? colors.primary : colors.border,
              }}
            >
              <Text style={{ color: isSelected ? '#fff' : colors.textSecondary, fontSize: 14, fontWeight: '700' }}>{n}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Most excited */}
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
        {'Who are you most excited about? 💫'}
      </Text>
      <TextInput
        value={mostExcited}
        onChangeText={setMostExcited}
        placeholder="Their name or a description..."
        placeholderTextColor={colors.textTertiary}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 14,
          fontSize: 14,
          color: colors.text,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 24,
        }}
      />

      {/* One thing to change */}
      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
        {'One thing you want to change 🔄'}
      </Text>
      <TextInput
        value={oneThingToChange}
        onChangeText={setOneThingToChange}
        placeholder="Be honest with yourself..."
        placeholderTextColor={colors.textTertiary}
        multiline
        style={{
          backgroundColor: colors.surface,
          borderRadius: 12,
          padding: 14,
          fontSize: 14,
          color: colors.text,
          borderWidth: 1,
          borderColor: colors.border,
          minHeight: 80,
          textAlignVertical: 'top',
          marginBottom: 32,
        }}
      />

      <Pressable
        onPress={handleSubmit}
        disabled={saving}
        style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save Check-in</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
