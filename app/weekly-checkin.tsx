import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { apiGet, apiPost } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

const RED = '#E53935';

export default function WeeklyCheckinScreen() {
  const { user } = useAuth();
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
      Alert.alert('Done!', 'Your weekly check-in has been saved.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      console.error('[WeeklyCheckin] Failed to save check-in:', e);
      Alert.alert('Error', 'Could not save your check-in. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator color={RED} />
      </View>
    );
  }

  if (recentCheckin && !showAnyway) {
    const daysAgoText = recentCheckin.days === 0 ? 'today' : `${recentCheckin.days} day${recentCheckin.days === 1 ? '' : 's'} ago`;
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>✅</Text>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#1A1A1A', textAlign: 'center', marginBottom: 8 }}>
          Already checked in
        </Text>
        <Text style={{ fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20, marginBottom: 28 }}>
          {'You did your weekly check-in '}
          {daysAgoText}
          {'.'}
        </Text>
        <Pressable
          onPress={() => {
            console.log('[WeeklyCheckin] Do another check-in anyway pressed');
            setShowAnyway(true);
          }}
          style={{ backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 13, marginBottom: 12 }}
        >
          <Text style={{ color: '#1A1A1A', fontSize: 14, fontWeight: '600' }}>Do another check-in anyway</Text>
        </Pressable>
        <Pressable onPress={() => {
          console.log('[WeeklyCheckin] Go back pressed from already-checked-in screen');
          router.back();
        }}>
          <Text style={{ color: RED, fontSize: 14, fontWeight: '600' }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ padding: 24, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
      {/* Mood */}
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 }}>
        {'How\'s your dating life feeling? 🌡️'}
      </Text>
      <Text style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
        {'Mood: '}
        {mood}
        {'/10'}
      </Text>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 28, flexWrap: 'wrap' }}>
        {[1,2,3,4,5,6,7,8,9,10].map((n) => (
          <Pressable
            key={n}
            onPress={() => {
              console.log('[WeeklyCheckin] Mood selected:', n);
              setMood(n);
            }}
            style={{
              width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
              backgroundColor: mood === n ? RED : '#F5F5F5',
              borderWidth: 1.5, borderColor: mood === n ? RED : '#E0E0E0',
            }}
          >
            <Text style={{ color: mood === n ? '#fff' : '#666', fontSize: 14, fontWeight: '700' }}>{n}</Text>
          </Pressable>
        ))}
      </View>

      {/* Most excited */}
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 }}>
        {'Who are you most excited about? 💫'}
      </Text>
      <TextInput
        value={mostExcited}
        onChangeText={setMostExcited}
        placeholder="Their name or a description..."
        placeholderTextColor="#BBBBBB"
        style={{ backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14, fontSize: 14, color: '#1A1A1A', borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 24 }}
      />

      {/* One thing to change */}
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 }}>
        {'One thing you want to change 🔄'}
      </Text>
      <TextInput
        value={oneThingToChange}
        onChangeText={setOneThingToChange}
        placeholder="Be honest with yourself..."
        placeholderTextColor="#BBBBBB"
        multiline
        style={{ backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14, fontSize: 14, color: '#1A1A1A', borderWidth: 1, borderColor: '#E0E0E0', minHeight: 80, textAlignVertical: 'top', marginBottom: 32 }}
      />

      <Pressable
        onPress={handleSubmit}
        disabled={saving}
        style={{ backgroundColor: RED, borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save Check-in</Text>}
      </Pressable>
    </ScrollView>
  );
}
