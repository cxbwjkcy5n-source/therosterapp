import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { X, MapPin, Shield, Share2, ChevronDown, Check } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { apiGet, apiPost } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Person {
  id: string;
  name: string;
  photo_url?: string;
}

export default function DateSafetyScreen() {
  const insets = useSafeAreaInsets();
  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [location, setLocation] = useState('');
  const [appearance, setAppearance] = useState('');
  const [contacts, setContacts] = useState(['', '', '']);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    console.log('[DateSafety] Loading persons');
    apiGet<{ persons: Person[] }>('/api/persons')
      .then((data) => {
        const active = (data.persons || []).filter((p: any) => !p.is_benched);
        console.log('[DateSafety] Loaded', active.length, 'persons');
        setPersons(active);
        if (active.length > 0) setSelectedPersonId(active[0].id);
      })
      .catch((e) => console.error('[DateSafety] Failed to load persons:', e));
  }, []);

  const filledContacts = contacts.filter((c) => c.trim().length > 0);
  const canShare = !!selectedPersonId && !!location.trim() && filledContacts.length > 0;

  const handleShare = async () => {
    if (!canShare) return;
    const selectedPerson = persons.find((p) => p.id === selectedPersonId);
    console.log('[DateSafety] Sharing safety check-in for person:', selectedPersonId);
    setSaving(true);
    try {
      const result = await apiPost<{ share_message: string }>('/api/safety-checkins', {
        person_id: selectedPersonId,
        location: location.trim(),
        appearance: appearance.trim() || undefined,
        emergency_contacts: filledContacts,
      });
      console.log('[DateSafety] Safety check-in created');

      const photoLine = selectedPerson?.photo_url ? `\n📸 ${selectedPerson.photo_url}` : '';
      const message = result?.share_message ||
        `🛡️ Safety Check-In\nI'm on a date with ${selectedPerson?.name || 'someone'} at ${location}. ${appearance ? `They are: ${appearance}. ` : ''}Please check on me if you don't hear from me.${photoLine}`;

      const phoneNumbers = filledContacts.join(',');
      const smsUrl = `sms:${phoneNumbers}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(message)}`;

      console.log('[DateSafety] Opening SMS to contacts:', phoneNumbers);
      await Linking.openURL(smsUrl);
      router.back();
    } catch (e: any) {
      console.error('[DateSafety] Failed to share:', e);
      Alert.alert('Error', 'Could not create safety check-in. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateContact = (index: number, value: string) => {
    const updated = [...contacts];
    updated[index] = value;
    setContacts(updated);
  };

  const selectedPerson = persons.find((p) => p.id === selectedPersonId);
  const selectedPersonName = selectedPerson ? selectedPerson.name : '';

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* FIXED HEADER */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingTop: 60,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        }}
      >
        <AnimatedPressable
          onPress={() => {
            console.log('[DateSafety] Close pressed');
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
        <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700' }}>Safety Check-In 🛡️</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Form content — scrolls */}
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 20 }}
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
              console.log('[DateSafety] Person dropdown toggled, open:', !dropdownOpen);
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
            {selectedPersonName ? (
              <Text style={{ color: COLORS.text, fontSize: 15 }}>{selectedPersonName}</Text>
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
                      console.log('[DateSafety] Person selected from dropdown:', p.id, p.name);
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
                    <Text style={{ color: COLORS.text, fontSize: 15 }}>{p.name}</Text>
                    {isSelected && <Check size={16} color={COLORS.success} />}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Info banner */}
        <View
          style={{
            backgroundColor: COLORS.successMuted,
            borderRadius: 12,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Shield size={20} color={COLORS.success} />
          <Text style={{ color: COLORS.success, fontSize: 13, flex: 1, lineHeight: 18 }}>
            Share your date details with trusted contacts for safety
          </Text>
        </View>

        {/* Location */}
        <View>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
            Where are you?
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <MapPin size={16} color={COLORS.textTertiary} />
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Address or venue name"
              placeholderTextColor={COLORS.textTertiary}
              style={{
                flex: 1,
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 13,
                color: COLORS.text,
                fontSize: 15,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            />
          </View>
        </View>

        {/* Appearance */}
        <View>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
            What are they wearing / driving? (optional)
          </Text>
          <TextInput
            value={appearance}
            onChangeText={setAppearance}
            placeholder="e.g. Blue jacket, drives a red Honda..."
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

        {/* Emergency contacts */}
        <View>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 10 }}>
            Emergency Contacts (up to 3)
          </Text>
          <View style={{ gap: 8 }}>
            {contacts.map((contact, index) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: COLORS.successMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: COLORS.success, fontSize: 12, fontWeight: '700' }}>{index + 1}</Text>
                </View>
                <TextInput
                  value={contact}
                  onChangeText={(v) => updateContact(index, v)}
                  placeholder={`Phone number ${index + 1}`}
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="phone-pad"
                  style={{
                    flex: 1,
                    backgroundColor: COLORS.surfaceSecondary,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    color: COLORS.text,
                    fontSize: 15,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                />
              </View>
            ))}
          </View>
        </View>

        <AnimatedPressable
          onPress={handleShare}
          disabled={!canShare || saving}
          style={{
            backgroundColor: canShare ? COLORS.success : COLORS.surfaceSecondary,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Share2 size={18} color={canShare ? '#fff' : COLORS.textTertiary} />
              <Text style={{ color: canShare ? '#fff' : COLORS.textTertiary, fontSize: 16, fontWeight: '700' }}>
                Share My Location
              </Text>
            </>
          )}
        </AnimatedPressable>

        {!canShare && (
          <Text style={{ color: COLORS.textTertiary, fontSize: 12, textAlign: 'center' }}>
            Select a person, enter location, and add at least one contact
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
