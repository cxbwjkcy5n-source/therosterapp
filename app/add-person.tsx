import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Camera, Plus, X } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { BirthdayPicker, formatBirthdayDisplay } from '@/components/BirthdayPicker';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { apiPost, apiPut } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ImageSourcePropType } from 'react-native';

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

const CONNECTION_TYPES = [
  { value: 'friend', label: 'Friend' },
  { value: 'casual', label: 'Casual' },
  { value: 'booty_call', label: 'Booty Call' },
  { value: 'foodie_call', label: 'Foodie Call' },
  { value: 'figuring_it_out', label: 'Figuring It Out' },
  { value: 'serious', label: 'Serious' },
  { value: 'other', label: 'Other' },
];

const ZODIAC_SIGNS = [
  { value: 'aries', label: '♈ Aries' },
  { value: 'taurus', label: '♉ Taurus' },
  { value: 'gemini', label: '♊ Gemini' },
  { value: 'cancer', label: '♋ Cancer' },
  { value: 'leo', label: '♌ Leo' },
  { value: 'virgo', label: '♍ Virgo' },
  { value: 'libra', label: '♎ Libra' },
  { value: 'scorpio', label: '♏ Scorpio' },
  { value: 'sagittarius', label: '♐ Sagittarius' },
  { value: 'capricorn', label: '♑ Capricorn' },
  { value: 'aquarius', label: '♒ Aquarius' },
  { value: 'pisces', label: '♓ Pisces' },
];

// mmdd format: "MM-DD"
function getZodiacFromBirthday(mmdd: string): string {
  const parts = mmdd.split('-');
  if (parts.length < 2) return '';
  const month = parseInt(parts[0], 10);
  const day = parseInt(parts[1], 10);
  if (isNaN(month) || isNaN(day)) return '';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'aquarius';
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'pisces';
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'aries';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'taurus';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'gemini';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'cancer';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'leo';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'virgo';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'libra';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'scorpio';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'sagittarius';
  return 'capricorn'; // 12-22 to 01-19
}

function getInterestColor(val: number) {
  if (val <= 3) return COLORS.interestLow;
  if (val <= 7) return COLORS.interestMid;
  return COLORS.interestHigh;
}

function SliderInput({ label, value, onChange, excluded, onToggleExclude }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  excluded: boolean;
  onToggleExclude: () => void;
}) {
  const fillPct = `${(value / 10) * 100}%`;
  const valueLabel = excluded ? 'N/A' : `${value}/10`;
  return (
    <View style={{ marginBottom: 20, opacity: excluded ? 0.4 : 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Pressable
          onPress={() => {
            console.log(`[AddPerson] ${label} exclude toggled, excluded:`, !excluded);
            onToggleExclude();
          }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <View style={{
            width: 22, height: 22, borderRadius: 6,
            backgroundColor: excluded ? '#E8E8E8' : '#E53935',
            borderWidth: excluded ? 1.5 : 0,
            borderColor: '#CCCCCC',
            alignItems: 'center', justifyContent: 'center',
          }}>
            {!excluded && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
          <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '500' }}>{label}</Text>
        </Pressable>
        <Text style={{ color: '#E53935', fontSize: 13, fontWeight: '700' }}>{valueLabel}</Text>
      </View>
      <View style={{ position: 'relative', height: 20, justifyContent: 'center' }}>
        <View style={{ height: 4, backgroundColor: '#E8E8E8', borderRadius: 2, overflow: 'hidden' }}>
          {!excluded && <View style={{ height: 4, width: fillPct, backgroundColor: '#E53935', borderRadius: 2 }} />}
        </View>
        {!excluded && (
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((step) => (
              <Pressable
                key={step}
                onPress={() => {
                  console.log(`[AddPerson] ${label} slider set to:`, step);
                  onChange(step);
                }}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              >
                {step === value ? (
                  <View style={{
                    width: 20, height: 20, borderRadius: 10,
                    backgroundColor: '#E53935',
                    shadowColor: '#E53935', shadowOpacity: 0.35, shadowRadius: 6,
                    shadowOffset: { width: 0, height: 2 }, elevation: 4,
                  }} />
                ) : null}
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function TagInput({ label, tags, onAdd, onRemove, color = COLORS.primary }: {
  label: string;
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  color?: string;
}) {
  const [input, setInput] = useState('');
  const handleAdd = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      console.log(`[AddPerson] Adding tag to ${label}:`, trimmed);
      onAdd(trimmed);
      setInput('');
    }
  };
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 8 }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={`Add ${label.toLowerCase()}...`}
          placeholderTextColor={COLORS.textTertiary}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
          style={{
            flex: 1,
            backgroundColor: COLORS.surfaceSecondary,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: COLORS.text,
            fontSize: 14,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        />
        <AnimatedPressable
          onPress={handleAdd}
          style={{
            backgroundColor: color,
            borderRadius: 10,
            paddingHorizontal: 14,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Add</Text>
        </AnimatedPressable>
      </View>
      {tags.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {tags.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => {
                console.log(`[AddPerson] Removing tag from ${label}:`, tag);
                onRemove(tag);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: color + '20',
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 5,
                gap: 4,
              }}
            >
              <Text style={{ color, fontSize: 13, fontWeight: '500' }}>{tag}</Text>
              <X size={12} color={color} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export default function AddPersonScreen() {
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [age, setAge] = useState('');
  const [birthday, setBirthday] = useState('');
  const [zodiac, setZodiac] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [twitterX, setTwitterX] = useState('');
  const [connectionType, setConnectionType] = useState('');
  const [connectionTypeCustom, setConnectionTypeCustom] = useState('');
  const [interestLevel, setInterestLevel] = useState(5);
  const [attractiveness, setAttractiveness] = useState(5);
  const [sexualChemistry, setSexualChemistry] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [overallChemistry, setOverallChemistry] = useState(5);
  const [consistency, setConsistency] = useState(5);
  const [emotionalAvailability, setEmotionalAvailability] = useState(5);
  const [datePlanning, setDatePlanning] = useState(5);
  const [alignment, setAlignment] = useState(5);
  const [excludedRatings, setExcludedRatings] = useState<Set<string>>(new Set());
  const toggleExclude = (key: string) => setExcludedRatings(prev => {
    const next = new Set(prev);
    if (next.has(key)) { next.delete(key); } else { next.add(key); }
    return next;
  });
  const [favoriteFoods, setFavoriteFoods] = useState<string[]>([]);
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [greenFlags, setGreenFlags] = useState<string[]>([]);
  const [redFlags, setRedFlags] = useState<string[]>([]);

  const canSave = name.trim().length > 0 && location.trim().length > 0;

  const pickPhoto = async () => {
    console.log('[AddPerson] Photo picker opened');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      console.log('[AddPerson] Photo selected');
      setPhotoUri(result.assets[0].uri);
      setPhotoBase64(result.assets[0].base64 ?? null);
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    console.log('[AddPerson] Saving person:', name);
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        name: name.trim(),
        location: location.trim(),
        interest_level: interestLevel,
        attractiveness,
        sexual_chemistry: sexualChemistry,
        communication,
        overall_chemistry: overallChemistry,
        consistency,
        emotional_availability: emotionalAvailability,
        date_planning: datePlanning,
        alignment,
        favorite_foods: favoriteFoods,
        hobbies,
        green_flags: greenFlags,
        red_flags: redFlags,
      };
      if (age) payload.age = parseInt(age, 10);
      if (birthday) payload.birthday = birthday;
      if (zodiac) payload.zodiac = zodiac;
      if (phoneNumber) payload.phone_number = phoneNumber;
      if (instagram) payload.instagram = instagram;
      if (tiktok) payload.tiktok = tiktok;
      if (twitterX) payload.twitter_x = twitterX;
      if (connectionType) payload.connection_type = connectionType;
      if (connectionType === 'other' && connectionTypeCustom) payload.connection_type_custom = connectionTypeCustom;

      console.log('[AddPerson] POST /api/persons');
      const created = await apiPost<{ person: { id: string } }>('/api/persons', payload);
      const personId = created?.person?.id;

      if (photoUri && personId && photoBase64) {
        try {
          console.log('[AddPerson] Uploading photo for person:', personId);
          const uploadResult = await apiPost<{ photo_url: string }>('/api/upload-photo', {
            base64: photoBase64,
            person_id: personId,
          });
          if (uploadResult?.photo_url) {
            await apiPut(`/api/persons/${personId}`, { photo_url: uploadResult.photo_url });
          }
        } catch (photoErr) {
          console.error('[AddPerson] Photo upload failed (non-fatal):', photoErr);
        }
      }

      console.log('[AddPerson] Person saved successfully:', personId);
      router.back();
    } catch (e: any) {
      console.error('[AddPerson] Save failed:', e);
      Alert.alert('Could not save', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const initials = name.trim() ? name.trim().split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : '+';

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 4 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Photo */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <AnimatedPressable onPress={pickPhoto}>
            <View
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: COLORS.surface,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: COLORS.primary,
                overflow: 'hidden',
              }}
            >
              {photoUri ? (
                <Image source={resolveImageSource(photoUri)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Camera size={24} color={COLORS.primary} />
                  <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '600' }}>{initials}</Text>
                </View>
              )}
            </View>
          </AnimatedPressable>
          <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginTop: 8 }}>Tap to add photo</Text>
        </View>

        {/* Required fields */}
        <View style={{ marginBottom: 8 }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
            Name <Text style={{ color: COLORS.primary }}>*</Text>
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Their name"
            placeholderTextColor={COLORS.textTertiary}
            autoFocus
            autoCapitalize="words"
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 13,
              color: COLORS.text,
              fontSize: 15,
              borderWidth: 1,
              borderColor: COLORS.border,
              marginBottom: 12,
            }}
          />
          <AddressAutocomplete
            label="Location *"
            value={location}
            onChangeText={setLocation}
            onSelect={(addr) => {
              console.log('[AddPerson] Location selected from autocomplete:', addr);
              setLocation(addr);
            }}
            placeholder="City, neighborhood..."
          />
        </View>

        {/* Connection type */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 8 }}>
            Connection Type
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
              {CONNECTION_TYPES.map((ct) => (
                <Pressable
                  key={ct.value}
                  onPress={() => {
                    console.log('[AddPerson] Connection type selected:', ct.value);
                    setConnectionType(ct.value);
                  }}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: connectionType === ct.value ? COLORS.primary : COLORS.surface,
                    borderWidth: 1,
                    borderColor: connectionType === ct.value ? COLORS.primary : COLORS.border,
                  }}
                >
                  <Text
                    style={{
                      color: connectionType === ct.value ? '#fff' : COLORS.textSecondary,
                      fontSize: 13,
                      fontWeight: '500',
                    }}
                  >
                    {ct.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          {connectionType === 'other' && (
            <TextInput
              value={connectionTypeCustom}
              onChangeText={setConnectionTypeCustom}
              placeholder="Describe the connection..."
              placeholderTextColor={COLORS.textTertiary}
              style={{
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 13,
                color: COLORS.text,
                fontSize: 15,
                borderWidth: 1,
                borderColor: COLORS.border,
                marginTop: 10,
              }}
            />
          )}
        </View>

        {/* Optional fields */}
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            marginBottom: 16,
            gap: 12,
          }}
        >
          <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>Details</Text>

          <View>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>Age</Text>
            <TextInput
              value={age}
              onChangeText={setAge}
              placeholder="e.g. 28"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="numeric"
              style={{
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 11,
                color: COLORS.text,
                fontSize: 14,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            />
          </View>

          <View>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
              Birthday
            </Text>
            <BirthdayPicker
              value={birthday}
              onChange={(v) => {
                console.log('[AddPerson] Birthday selected:', v, formatBirthdayDisplay(v));
                setBirthday(v);
                const computed = getZodiacFromBirthday(v);
                if (computed) {
                  console.log('[AddPerson] Auto-setting zodiac from birthday:', computed);
                  setZodiac(computed);
                }
              }}
            />
          </View>

          <View>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 8 }}>Zodiac</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {ZODIAC_SIGNS.map((z) => (
                  <Pressable
                    key={z.value}
                    onPress={() => {
                      console.log('[AddPerson] Zodiac selected:', z.value);
                      setZodiac(z.value);
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 16,
                      backgroundColor: zodiac === z.value ? COLORS.accentMuted : COLORS.surfaceSecondary,
                      borderWidth: 1,
                      borderColor: zodiac === z.value ? COLORS.accent : COLORS.border,
                    }}
                  >
                    <Text style={{ color: zodiac === z.value ? COLORS.accent : COLORS.textSecondary, fontSize: 12 }}>
                      {z.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Social media */}
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            marginBottom: 16,
            gap: 12,
          }}
        >
          <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>Contact & Social</Text>
          {[
            { label: 'Phone Number', value: phoneNumber, onChange: setPhoneNumber, placeholder: '+1 (555) 000-0000' },
            { label: 'Instagram', value: instagram, onChange: setInstagram, placeholder: '@handle' },
            { label: 'TikTok', value: tiktok, onChange: setTiktok, placeholder: '@handle' },
            { label: 'X / Twitter', value: twitterX, onChange: setTwitterX, placeholder: '@handle' },
          ].map((field) => (
            <View key={field.label}>
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>
                {field.label}
              </Text>
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                placeholder={field.placeholder}
                placeholderTextColor={COLORS.textTertiary}
                autoCapitalize="none"
                style={{
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 11,
                  color: COLORS.text,
                  fontSize: 14,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              />
            </View>
          ))}
        </View>

        {/* Tags */}
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            marginBottom: 16,
          }}
        >
          <TagInput
            label="Favorite Foods"
            tags={favoriteFoods}
            onAdd={(t) => setFavoriteFoods([...favoriteFoods, t])}
            onRemove={(t) => setFavoriteFoods(favoriteFoods.filter((f) => f !== t))}
            color={COLORS.accent}
          />
          <TagInput
            label="Hobbies & Interests"
            tags={hobbies}
            onAdd={(t) => setHobbies([...hobbies, t])}
            onRemove={(t) => setHobbies(hobbies.filter((h) => h !== t))}
            color={COLORS.primary}
          />
        </View>

        {/* Flags */}
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            marginBottom: 16,
          }}
        >
          <TagInput
            label="🟢 Green Flags"
            tags={greenFlags}
            onAdd={(t) => setGreenFlags([...greenFlags, t])}
            onRemove={(t) => setGreenFlags(greenFlags.filter((f) => f !== t))}
            color={COLORS.success}
          />
          <TagInput
            label="🔴 Red Flags"
            tags={redFlags}
            onAdd={(t) => setRedFlags([...redFlags, t])}
            onRemove={(t) => setRedFlags(redFlags.filter((f) => f !== t))}
            color={COLORS.danger}
          />
        </View>

        {/* Sliders */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 2 },
            elevation: 3,
          }}
        >
          <Text
            style={{
              color: '#999999',
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginBottom: 20,
            }}
          >
            Ratings
          </Text>
          <SliderInput label="Interest Level" value={interestLevel} onChange={setInterestLevel} excluded={excludedRatings.has('interest_level')} onToggleExclude={() => toggleExclude('interest_level')} />
          <SliderInput label="Attractiveness" value={attractiveness} onChange={setAttractiveness} excluded={excludedRatings.has('attractiveness')} onToggleExclude={() => toggleExclude('attractiveness')} />
          <SliderInput label="Sexual Chemistry" value={sexualChemistry} onChange={setSexualChemistry} excluded={excludedRatings.has('sexual_chemistry')} onToggleExclude={() => toggleExclude('sexual_chemistry')} />
          <SliderInput label="Communication" value={communication} onChange={setCommunication} excluded={excludedRatings.has('communication')} onToggleExclude={() => toggleExclude('communication')} />
          <SliderInput label="Overall Chemistry" value={overallChemistry} onChange={setOverallChemistry} excluded={excludedRatings.has('overall_chemistry')} onToggleExclude={() => toggleExclude('overall_chemistry')} />
          <SliderInput label="Consistency" value={consistency} onChange={setConsistency} excluded={excludedRatings.has('consistency')} onToggleExclude={() => toggleExclude('consistency')} />
          <SliderInput label="Emotional Availability" value={emotionalAvailability} onChange={setEmotionalAvailability} excluded={excludedRatings.has('emotional_availability')} onToggleExclude={() => toggleExclude('emotional_availability')} />
          <SliderInput label="Date Planning" value={datePlanning} onChange={setDatePlanning} excluded={excludedRatings.has('date_planning')} onToggleExclude={() => toggleExclude('date_planning')} />
          <SliderInput label="Alignment" value={alignment} onChange={setAlignment} excluded={excludedRatings.has('alignment')} onToggleExclude={() => toggleExclude('alignment')} />

          {/* Compatibility Score */}
          <View style={{ height: 1, backgroundColor: '#EEEEEE', marginVertical: 20 }} />
          <Text
            style={{
              color: '#999999',
              fontSize: 13,
              fontWeight: '600',
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 12,
            }}
          >
            Overall Compatibility
          </Text>
          {(() => {
            const activeScores = [
              !excludedRatings.has('interest_level') ? interestLevel : null,
              !excludedRatings.has('attractiveness') ? attractiveness : null,
              !excludedRatings.has('sexual_chemistry') ? sexualChemistry : null,
              !excludedRatings.has('communication') ? communication : null,
              !excludedRatings.has('overall_chemistry') ? overallChemistry : null,
              !excludedRatings.has('consistency') ? consistency : null,
              !excludedRatings.has('emotional_availability') ? emotionalAvailability : null,
              !excludedRatings.has('date_planning') ? datePlanning : null,
              !excludedRatings.has('alignment') ? alignment : null,
            ].filter((v): v is number => v !== null);
            const compatScore = activeScores.length > 0 ? Math.round(activeScores.reduce((a, b) => a + b, 0) / activeScores.length) : 0;
            const compatPct = activeScores.length > 0 ? (compatScore / 10) * 100 : 0;
            return (
              <>
                <Text style={{ color: '#E53935', fontSize: 32, fontWeight: '800', letterSpacing: -1, marginBottom: 10 }}>
                  {compatScore}<Text style={{ fontSize: 18, fontWeight: '600', color: '#E53935' }}>/10</Text>
                </Text>
                <View style={{ height: 6, backgroundColor: '#E8E8E8', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                  <View style={{ height: 6, width: `${compatPct}%`, backgroundColor: '#E53935', borderRadius: 3 }} />
                </View>
              </>
            );
          })()}
          <Text style={{ color: '#AAAAAA', fontSize: 12 }}>Based on your ratings</Text>
        </View>

        {/* Save button */}
        <AnimatedPressable
          onPress={handleSave}
          disabled={!canSave || saving}
          style={{
            backgroundColor: canSave ? COLORS.primary : COLORS.surfaceSecondary,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            marginTop: 8,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: canSave ? '#fff' : COLORS.textTertiary, fontSize: 16, fontWeight: '700' }}>
              Save Person
            </Text>
          )}
        </AnimatedPressable>
      </ScrollView>
    </View>
  );
}
