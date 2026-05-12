import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { X, MapPin, Shield, Share2, ChevronDown, Check } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { apiGet, apiPost } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Person {
  id: string;
  name: string;
  photo_url?: string;
  is_benched?: boolean;
}

export default function DateSafetyScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [location, setLocation] = useState('');
  const [locating, setLocating] = useState(false);
  const [appearance, setAppearance] = useState('');
  const [contacts, setContacts] = useState(['', '', '']);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    console.log('[DateSafety] Loading all persons (active + benched)');
    Promise.all([
      apiGet<{ persons: Person[] }>('/api/persons').catch(() => ({ persons: [] })),
      apiGet<{ persons: Person[] }>('/api/persons?benched=true').catch(() => ({ persons: [] })),
    ]).then(([activeData, benchedData]) => {
      const active = activeData.persons || [];
      const benched = benchedData.persons || [];
      const allMap = new Map<string, Person>();
      for (const p of active) allMap.set(p.id, { ...p, is_benched: false });
      for (const p of benched) allMap.set(p.id, { ...p, is_benched: true });
      const all = Array.from(allMap.values());
      console.log('[DateSafety] Loaded', active.length, 'active +', benched.length, 'benched');
      setPersons(all);
      const firstActive = all.find((p) => !p.is_benched);
      if (firstActive) setSelectedPersonId(firstActive.id);
      else if (all.length > 0) setSelectedPersonId(all[0].id);
    });
  }, [user]);

  const handleUseCurrentLocation = async () => {
    console.log('[DateSafety] Use My Current Location pressed');
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('[DateSafety] Location permission denied');
        Alert.alert('Permission Denied', 'Location access is required to use this feature.');
        return;
      }
      console.log('[DateSafety] Getting current position');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      console.log('[DateSafety] Got coords:', pos.coords.latitude, pos.coords.longitude);
      const results = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      if (results && results.length > 0) {
        const r = results[0];
        const parts = [r.name || r.street, r.city, r.region].filter(Boolean);
        const address = parts.join(', ');
        console.log('[DateSafety] Reverse geocoded address:', address);
        setLocation(address);
      } else {
        console.log('[DateSafety] No reverse geocode results');
        Alert.alert('Could not resolve address', 'Please type your location manually.');
      }
    } catch (e: any) {
      console.error('[DateSafety] Location error:', e);
      Alert.alert('Location Error', 'Could not get your location. Please type it manually.');
    } finally {
      setLocating(false);
    }
  };

  const filledContacts = contacts.filter((c) => c.trim().length > 0);
  const canShare = !!selectedPersonId && !!location.trim() && filledContacts.length > 0;

  const handleShare = async () => {
    if (!canShare) return;
    const selectedPerson = persons.find((p) => p.id === selectedPersonId);
    console.log('[DateSafety] Sharing safety check-in for person:', selectedPersonId);
    setSaving(true);
    try {
      await apiPost<{ share_message: string }>('/api/safety-checkins', {
        person_id: selectedPersonId,
        location: location.trim(),
        appearance: appearance.trim() || undefined,
        emergency_contacts: filledContacts,
      });
      console.log('[DateSafety] Safety check-in created');

      const appearanceLine = appearance.trim()
        ? `They are wearing/driving: ${appearance.trim()}.`
        : '';
      const personName = selectedPerson?.name || 'someone';

      const messageParts = [
        '🛡️ Safety Check-In',
        `I'm on a date with ${personName} at ${location.trim()}.`,
      ];
      if (appearanceLine) messageParts.push(appearanceLine);
      messageParts.push('');
      messageParts.push("Please check on me if you don't hear from me! 💙");

      const message = messageParts.join('\n');

      console.log('[DateSafety] Opening Share sheet with safety message');

      const photoUrl = selectedPerson?.photo_url;
      if (photoUrl) {
        try {
          console.log('[DateSafety] Downloading photo for share:', photoUrl);
          const destFile = new File(Paths.cache, 'date-safety-photo.jpg');
          const downloadedFile = await File.downloadFileAsync(photoUrl, destFile, { idempotent: true });
          const localUri = downloadedFile.uri;
          console.log('[DateSafety] Photo downloaded to:', localUri);
          const sharingAvailable = await Sharing.isAvailableAsync();
          if (sharingAvailable) {
            // On iOS, Share.share with url attaches the image alongside the text
            await Share.share({ message, url: localUri });
          } else {
            await Share.share({ message });
          }
        } catch (photoErr: any) {
          console.warn('[DateSafety] Photo download/share failed, falling back to text only:', photoErr?.message);
          await Share.share({ message });
        }
      } else {
        await Share.share({ message });
      }

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

  const closeDropdown = () => {
    if (dropdownOpen) {
      console.log('[DateSafety] Dropdown closed by outside tap');
      setDropdownOpen(false);
    }
  };

  const selectedPerson = persons.find((p) => p.id === selectedPersonId);
  const selectedPersonName = selectedPerson ? selectedPerson.name : '';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
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
          borderBottomColor: colors.border,
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
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={18} color={colors.textSecondary} />
        </AnimatedPressable>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>Safety Check-In 🛡️</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Form content — scrolls */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: insets.bottom + 40, gap: 28 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Pressable overlay to close dropdown when tapping outside */}
        <Pressable onPress={closeDropdown} style={{ gap: 28 }}>

          {/* Person dropdown */}
          <View style={{ zIndex: 100, position: 'relative' }}>
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
              Who's this date with?
            </Text>
            <Pressable
              onPress={() => {
                console.log('[DateSafety] Person dropdown toggled, open:', !dropdownOpen);
                setDropdownOpen(!dropdownOpen);
              }}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                {selectedPerson && (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: selectedPerson.is_benched ? '#E53935' : '#2E7D32',
                    }}
                  />
                )}
                {selectedPersonName ? (
                  <Text style={{ color: colors.text, fontSize: 15 }}>{selectedPersonName}</Text>
                ) : (
                  <Text style={{ color: colors.textTertiary, fontSize: 15 }}>Select a person...</Text>
                )}
                {selectedPerson?.is_benched && (
                  <Text style={{ color: '#E53935', fontSize: 11, fontWeight: '600' }}>Benched</Text>
                )}
              </View>
              <ChevronDown size={16} color={colors.textSecondary} />
            </Pressable>
            {dropdownOpen && (
              <View
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 999,
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
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
                  const dotColor = p.is_benched ? '#E53935' : '#2E7D32';
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => {
                        console.log('[DateSafety] Person selected from dropdown:', p.id, p.name, 'benched:', p.is_benched);
                        setSelectedPersonId(p.id);
                        setDropdownOpen(false);
                      }}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        borderBottomWidth: isLast ? 0 : 1,
                        borderBottomColor: colors.border,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor }} />
                        <Text style={{ color: colors.text, fontSize: 15 }}>{p.name}</Text>
                        {p.is_benched && (
                          <Text style={{ color: '#E53935', fontSize: 11, fontWeight: '600' }}>Benched</Text>
                        )}
                      </View>
                      {isSelected && <Check size={16} color={colors.success} />}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* Info banner */}
          <View
            style={{
              backgroundColor: colors.successMuted,
              borderRadius: 12,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Shield size={20} color={colors.success} />
            <Text style={{ color: colors.success, fontSize: 13, flex: 1, lineHeight: 18 }}>
              Share your date details with trusted contacts for safety
            </Text>
          </View>

          {/* Location */}
          <View>
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 8 }}>
              Where are you?
            </Text>

            {/* GPS button */}
            <Pressable
              onPress={handleUseCurrentLocation}
              disabled={locating}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                paddingVertical: 13,
                paddingHorizontal: 14,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginBottom: 8,
              }}
            >
              {locating ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <MapPin size={16} color={colors.textSecondary} />
              )}
              <Text style={{ color: locating ? colors.textTertiary : colors.textSecondary, fontSize: 15 }}>
                {locating ? 'Getting location...' : 'Use My Current Location'}
              </Text>
            </Pressable>

            {/* Manual text input */}
            <TextInput
              value={location}
              onChangeText={(v) => {
                console.log('[DateSafety] Location changed manually');
                setLocation(v);
              }}
              onFocus={() => console.log('[DateSafety] Location field focused')}
              placeholder="Or type address / venue name"
              placeholderTextColor={colors.textTertiary}
              style={{
                backgroundColor: colors.surfaceSecondary,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 13,
                color: colors.text,
                fontSize: 15,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            />
          </View>

          {/* Appearance */}
          <View>
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
              What are they wearing / driving? (optional)
            </Text>
            <TextInput
              value={appearance}
              onChangeText={setAppearance}
              placeholder="e.g. Blue jacket, drives a red Honda..."
              placeholderTextColor={colors.textTertiary}
              multiline
              style={{
                backgroundColor: colors.surfaceSecondary,
                borderRadius: 12,
                padding: 14,
                color: colors.text,
                fontSize: 15,
                borderWidth: 1,
                borderColor: colors.border,
                minHeight: 80,
              }}
            />
          </View>

          {/* Emergency contacts */}
          <View>
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 10 }}>
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
                      backgroundColor: colors.successMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: colors.success, fontSize: 12, fontWeight: '700' }}>{index + 1}</Text>
                  </View>
                  <TextInput
                    value={contact}
                    onChangeText={(v) => updateContact(index, v)}
                    placeholder={`Phone number ${index + 1}`}
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="phone-pad"
                    style={{
                      flex: 1,
                      backgroundColor: colors.surfaceSecondary,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      color: colors.text,
                      fontSize: 15,
                      borderWidth: 1,
                      borderColor: colors.border,
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
              backgroundColor: canShare ? colors.success : colors.surfaceSecondary,
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
                <Share2 size={18} color={canShare ? '#fff' : colors.textTertiary} />
                <Text style={{ color: canShare ? '#fff' : colors.textTertiary, fontSize: 16, fontWeight: '700' }}>
                  Share My Location
                </Text>
              </>
            )}
          </AnimatedPressable>

          {!canShare && (
            <Text style={{ color: colors.textTertiary, fontSize: 12, textAlign: 'center' }}>
              Select a person, enter location, and add at least one contact
            </Text>
          )}

        </Pressable>
      </ScrollView>
    </View>
  );
}
