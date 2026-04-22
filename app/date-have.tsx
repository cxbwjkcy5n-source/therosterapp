import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  Share,
  ImageSourcePropType,
} from 'react-native';
import { router } from 'expo-router';
import { X, MapPin, Calendar, Check } from 'lucide-react-native';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { apiGet, apiPost } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

interface Person {
  id: string;
  name: string;
  photo_url?: string;
}

export default function DateHaveScreen() {
  const insets = useSafeAreaInsets();
  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [location, setLocation] = useState('');
  const [dateTime, setDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reminder3Days, setReminder3Days] = useState(false);
  const [reminder1Day, setReminder1Day] = useState(true);
  const [reminder1Hour, setReminder1Hour] = useState(true);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    console.log('[DateHave] Loading persons');
    apiGet<{ persons: Person[] }>('/api/persons')
      .then((data) => {
        const active = (data.persons || []).filter((p: any) => !p.is_benched);
        console.log('[DateHave] Loaded', active.length, 'persons');
        setPersons(active);
        if (active.length > 0) setSelectedPersonId(active[0].id);
      })
      .catch((e) => console.error('[DateHave] Failed to load persons:', e));
  }, []);

  const selectedPerson = persons.find((p) => p.id === selectedPersonId) || null;
  const canSave = !!selectedPersonId && !!location.trim();

  const handleShare = async () => {
    if (!selectedPerson) return;
    console.log('[DateHave] Sharing date details for person:', selectedPerson.name);
    const photoLine = selectedPerson.photo_url ? `\n📸 ${selectedPerson.photo_url}` : '';
    const message = `🗓️ I have a date with ${selectedPerson.name}!\n📍 Location: ${location || 'TBD'}\n🕐 Time: ${dateLabel} at ${timeLabel}${photoLine}`;
    try {
      await Share.share({ message });
      console.log('[DateHave] Share dialog opened');
    } catch (e: any) {
      console.error('[DateHave] Share failed:', e);
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    console.log('[DateHave] Saving date for person:', selectedPersonId);
    setSaving(true);
    try {
      await apiPost('/api/dates', {
        person_id: selectedPersonId,
        location: location.trim(),
        date_time: dateTime.toISOString(),
        reminder_3_days: reminder3Days,
        reminder_1_day: reminder1Day,
        reminder_1_hour: reminder1Hour,
        notes: notes.trim() || undefined,
        status: 'planned',
      });
      console.log('[DateHave] Date saved successfully');
      setSuccess(true);
      setTimeout(() => router.back(), 1500);
    } catch (e: any) {
      console.error('[DateHave] Save failed:', e);
      Alert.alert('Could not save date', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const dateLabel = dateTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const timeLabel = dateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  if (success) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: COLORS.successMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={36} color={COLORS.success} />
        </View>
        <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700' }}>Date saved!</Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>Have a great time 🎉</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        }}
      >
        <AnimatedPressable
          onPress={() => {
            console.log('[DateHave] Close pressed');
            router.back();
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
          <X size={18} color={COLORS.textSecondary} />
        </AnimatedPressable>
        <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700' }}>I Have a Date! 🎉</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Person selector */}
        <View>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 10 }}>
            Who's the date with?
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {persons.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => {
                    console.log('[DateHave] Person selected:', p.id, p.name);
                    setSelectedPersonId(p.id);
                  }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 20,
                    backgroundColor: selectedPersonId === p.id ? COLORS.primary : COLORS.surface,
                    borderWidth: 1,
                    borderColor: selectedPersonId === p.id ? COLORS.primary : COLORS.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {p.photo_url ? (
                    <Image
                      source={resolveImageSource(p.photo_url)}
                      style={{ width: 24, height: 24, borderRadius: 12 }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: selectedPersonId === p.id ? 'rgba(255,255,255,0.3)' : COLORS.primaryMuted || '#fde8ea',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: selectedPersonId === p.id ? '#fff' : COLORS.primary, fontSize: 11, fontWeight: '700' }}>
                        {p.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text
                    style={{
                      color: selectedPersonId === p.id ? '#fff' : COLORS.textSecondary,
                      fontSize: 14,
                      fontWeight: '500',
                    }}
                  >
                    {p.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Selected person avatar */}
          {selectedPerson && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 }}>
              {selectedPerson.photo_url ? (
                <Image
                  source={resolveImageSource(selectedPerson.photo_url)}
                  style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: COLORS.primary }}
                />
              ) : (
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: COLORS.primaryMuted || '#fde8ea',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 2,
                    borderColor: COLORS.primary,
                  }}
                >
                  <Text style={{ color: COLORS.primary, fontSize: 22, fontWeight: '700' }}>
                    {selectedPerson.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700' }}>{selectedPerson.name}</Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 2 }}>Your date</Text>
              </View>
            </View>
          )}
        </View>

        {/* Location */}
        <View style={{ zIndex: 10 }}>
          <AddressAutocomplete
            label="Location"
            value={location}
            onChangeText={setLocation}
            onSelect={(addr) => {
              console.log('[DateHave] Location selected from autocomplete:', addr);
              setLocation(addr);
            }}
            placeholder="Restaurant, park, coffee shop..."
          />
        </View>

        {/* Date & Time */}
        <View>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 10 }}>
            Date & Time
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <AnimatedPressable
              onPress={() => {
                console.log('[DateHave] Date picker opened');
                setShowDatePicker(true);
              }}
              style={{ flex: 1 }}
            >
              <View
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 12,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Calendar size={16} color={COLORS.primary} />
                <Text style={{ color: COLORS.text, fontSize: 14 }}>{dateLabel}</Text>
              </View>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={() => {
                console.log('[DateHave] Time picker opened');
                setShowTimePicker(true);
              }}
              style={{ flex: 1 }}
            >
              <View
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 12,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: COLORS.text, fontSize: 14 }}>{timeLabel}</Text>
              </View>
            </AnimatedPressable>
          </View>
          {showDatePicker && (
            <DateTimePicker
              value={dateTime}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (date) {
                  console.log('[DateHave] Date selected:', date);
                  setDateTime(date);
                }
              }}
              minimumDate={new Date()}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={dateTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                setShowTimePicker(false);
                if (date) {
                  console.log('[DateHave] Time selected:', date);
                  setDateTime(date);
                }
              }}
            />
          )}
        </View>

        {/* Reminders */}
        <View>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 10 }}>
            Reminders
          </Text>
          <View style={{ gap: 8 }}>
            {[
              { label: '3 days before', value: reminder3Days, onChange: setReminder3Days },
              { label: '1 day before', value: reminder1Day, onChange: setReminder1Day },
              { label: '1 hour before', value: reminder1Hour, onChange: setReminder1Hour },
            ].map((r) => (
              <Pressable
                key={r.label}
                onPress={() => {
                  console.log('[DateHave] Reminder toggled:', r.label, !r.value);
                  r.onChange(!r.value);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: COLORS.surface,
                  borderRadius: 12,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: r.value ? COLORS.primary : COLORS.border,
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    backgroundColor: r.value ? COLORS.primary : COLORS.surfaceSecondary,
                    borderWidth: 1,
                    borderColor: r.value ? COLORS.primary : COLORS.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {r.value && <Check size={14} color="#fff" />}
                </View>
                <Text style={{ color: r.value ? COLORS.text : COLORS.textSecondary, fontSize: 14 }}>
                  {r.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
            Notes (optional)
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Any notes about the date..."
            placeholderTextColor={COLORS.textTertiary}
            multiline
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 12,
              padding: 14,
              color: COLORS.text,
              fontSize: 15,
              borderWidth: 1,
              borderColor: COLORS.border,
              minHeight: 80,
            }}
          />
        </View>

        <AnimatedPressable
          onPress={handleSave}
          disabled={!canSave || saving}
          style={{
            backgroundColor: canSave ? COLORS.primary : COLORS.surfaceSecondary,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
          }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: canSave ? '#fff' : COLORS.textTertiary, fontSize: 16, fontWeight: '700' }}>
              Save Date
            </Text>
          )}
        </AnimatedPressable>
      </ScrollView>
    </View>
  );
}
