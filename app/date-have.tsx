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
  ImageSourcePropType,
} from 'react-native';
import { router } from 'expo-router';
import { X, Calendar, Check, ChevronDown } from 'lucide-react-native';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { apiGet, apiPost } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
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
  is_benched?: boolean;
}

export default function DateHaveScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
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
    if (!user) return;
    console.log('[DateHave] Loading all persons (active + benched)');
    Promise.all([
      apiGet<{ persons: Person[] }>('/api/persons').catch(() => ({ persons: [] })),
      apiGet<{ persons: Person[] }>('/api/persons?benched=true').catch(() => ({ persons: [] })),
    ]).then(([activeData, benchedData]) => {
      const active = activeData.persons || [];
      const benched = benchedData.persons || [];
      // Merge, avoiding duplicates
      const allMap = new Map<string, Person>();
      for (const p of active) allMap.set(p.id, { ...p, is_benched: false });
      for (const p of benched) allMap.set(p.id, { ...p, is_benched: true });
      const all = Array.from(allMap.values());
      console.log('[DateHave] Loaded', active.length, 'active +', benched.length, 'benched persons');
      setPersons(all);
      const firstActive = all.find((p) => !p.is_benched);
      if (firstActive) setSelectedPersonId(firstActive.id);
      else if (all.length > 0) setSelectedPersonId(all[0].id);
    });
  }, [user]);

  const selectedPerson = persons.find((p) => p.id === selectedPersonId) || null;
  const canSave = !!selectedPersonId && !!location.trim();

  const handleSave = async () => {
    if (!canSave) return;
    console.log('[DateHave] Saving date for person:', selectedPersonId);
    setSaving(true);
    try {
      await apiPost('/api/dates', {
        title: selectedPerson ? `Date with ${selectedPerson.name}` : 'Date',
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

  const selectedPersonName = selectedPerson ? selectedPerson.name : '';

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
      {/* FIXED HEADER */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: Math.max(insets.top, 16),
          paddingBottom: 16,
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

      {/* Form content — scrolls */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: insets.bottom + 40, gap: 28 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Person dropdown */}
        <View style={{ zIndex: 100, position: 'relative' }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
            Who's this date with?
          </Text>
          <Pressable
            onPress={() => {
              console.log('[DateHave] Person dropdown toggled, open:', !dropdownOpen);
              setDropdownOpen(!dropdownOpen);
            }}
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 12,
              padding: 14,
              borderWidth: 1,
              borderColor: COLORS.border,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {selectedPerson ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{
                  width: 8, height: 8, borderRadius: 4,
                  backgroundColor: selectedPerson.is_benched ? '#E53935' : '#4CAF50',
                }} />
                <Text style={{ color: COLORS.text, fontSize: 15 }}>{selectedPerson.name}</Text>
              </View>
            ) : (
              <Text style={{ color: COLORS.textTertiary, fontSize: 15 }}>Select a person...</Text>
            )}
            <ChevronDown size={16} color={COLORS.textSecondary} />
          </Pressable>
          {dropdownOpen && (
            <View
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                zIndex: 999,
                backgroundColor: COLORS.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
                marginTop: 4,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              {persons.map((p, index) => {
                const isSelected = selectedPersonId === p.id;
                const isLast = index === persons.length - 1;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      console.log('[DateHave] Person selected from dropdown:', p.id, p.name);
                      setSelectedPersonId(p.id);
                      setDropdownOpen(false);
                    }}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      borderBottomWidth: isLast ? 0 : 1,
                      borderBottomColor: COLORS.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View style={{
                        width: 8, height: 8, borderRadius: 4,
                        backgroundColor: p.is_benched ? '#E53935' : '#4CAF50',
                      }} />
                      <Text style={{ color: COLORS.text, fontSize: 15 }}>{p.name}</Text>
                      {p.is_benched && (
                        <Text style={{ color: '#E53935', fontSize: 11, fontWeight: '600' }}>Benched</Text>
                      )}
                    </View>
                    {isSelected && <Check size={16} color={COLORS.primary} />}
                  </Pressable>
                );
              })}
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
