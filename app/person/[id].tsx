import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  Pencil,
  MapPin,
  Instagram,
  X as XIcon,
  Trash2,
  Users,
  Check,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { apiGet, apiPut, apiDelete, apiPost } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ImageSourcePropType } from 'react-native';

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

interface Person {
  id: string;
  name: string;
  location: string;
  photo_url?: string;
  age?: number;
  birthday?: string;
  zodiac?: string;
  instagram?: string;
  tiktok?: string;
  twitter_x?: string;
  interest_level?: number;
  attractiveness?: number;
  sexual_chemistry?: number;
  communication?: number;
  connection_type?: string;
  connection_type_custom?: string;
  favorite_foods?: string[];
  hobbies?: string[];
  green_flags?: string[];
  red_flags?: string[];
  is_benched?: boolean;
  bench_reason?: string;
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

function getInterestColor(val?: number) {
  if (!val) return COLORS.textTertiary;
  if (val <= 3) return COLORS.interestLow;
  if (val <= 7) return COLORS.interestMid;
  return COLORS.interestHigh;
}

function getConnectionLabel(type?: string, custom?: string) {
  const map: Record<string, string> = {
    friend: 'Friend', casual: 'Casual', booty_call: 'Booty Call',
    foodie_call: 'Foodie Call', figuring_it_out: 'Figuring It Out',
    serious: 'Serious', other: custom || 'Other',
  };
  return type ? (map[type] || type) : '';
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function SliderDisplay({ label, value, editing, onChange }: {
  label: string; value?: number; editing: boolean; onChange: (v: number) => void;
}) {
  const val = value ?? 5;
  const color = getInterestColor(val);
  const steps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>{label}</Text>
        <Text style={{ color, fontSize: 13, fontWeight: '700' }}>{val}/10</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        {steps.map((step) => (
          <Pressable
            key={step}
            onPress={() => editing && onChange(step)}
            disabled={!editing}
            style={{
              flex: 1,
              height: 24,
              borderRadius: 5,
              backgroundColor: step <= val ? color : COLORS.surfaceSecondary,
            }}
          />
        ))}
      </View>
    </View>
  );
}

function TagList({ tags, color = COLORS.primary, editing, onRemove }: {
  tags?: string[]; color?: string; editing: boolean; onRemove: (t: string) => void;
}) {
  if (!tags || tags.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {tags.map((tag) => (
        <View
          key={tag}
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
          {editing && (
            <Pressable onPress={() => onRemove(tag)}>
              <XIcon size={12} color={color} />
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}

export default function PersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<Person>>({});
  const [newPhotoUri, setNewPhotoUri] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    console.log('[PersonDetail] Loading person:', id);
    apiGet<{ person: Person }>(`/api/persons/${id}`)
      .then((data) => {
        console.log('[PersonDetail] Person loaded:', data.person?.name);
        setPerson(data.person);
        setEditData(data.person);
      })
      .catch((e) => console.error('[PersonDetail] Failed to load person:', e))
      .finally(() => setLoading(false));
  }, [id]);

  const handleEdit = () => {
    console.log('[PersonDetail] Edit mode toggled');
    setEditing(true);
    setEditData({ ...person });
  };

  const handleSave = async () => {
    if (!id || !editData) return;
    console.log('[PersonDetail] Saving person:', id);
    setSaving(true);
    try {
      await apiPut(`/api/persons/${id}`, editData);
      if (newPhotoUri) {
        try {
          const base64 = await fetch(newPhotoUri).then((r) => r.blob()).then(
            (blob) => new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            })
          );
          const uploadResult = await apiPost<{ photo_url: string }>('/api/upload-photo', { base64, person_id: id });
          if (uploadResult?.photo_url) {
            await apiPut(`/api/persons/${id}`, { photo_url: uploadResult.photo_url });
            setEditData((prev) => ({ ...prev, photo_url: uploadResult.photo_url }));
          }
        } catch (photoErr) {
          console.error('[PersonDetail] Photo upload failed:', photoErr);
        }
      }
      const updated = await apiGet<{ person: Person }>(`/api/persons/${id}`);
      setPerson(updated.person);
      setEditData(updated.person);
      setEditing(false);
      setNewPhotoUri(null);
      console.log('[PersonDetail] Person saved successfully');
    } catch (e: any) {
      console.error('[PersonDetail] Save failed:', e);
      Alert.alert('Could not save', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    console.log('[PersonDetail] Delete pressed for:', id);
    Alert.alert('Delete person?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            console.log('[PersonDetail] Deleting person:', id);
            await apiDelete(`/api/persons/${id}`);
            console.log('[PersonDetail] Person deleted');
            router.replace('/(tabs)/(home)');
          } catch (e) {
            console.error('[PersonDetail] Delete failed:', e);
            Alert.alert('Error', 'Could not delete. Try again.');
          }
        },
      },
    ]);
  };

  const handleBench = () => {
    console.log('[PersonDetail] Bench pressed for:', id, person?.name);
    router.push({ pathname: '/bench-reason', params: { personId: id, personName: person?.name } });
  };

  const pickPhoto = async () => {
    console.log('[PersonDetail] Photo picker opened');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      console.log('[PersonDetail] New photo selected');
      setNewPhotoUri(result.assets[0].uri);
    }
  };

  const openSocial = (url: string) => {
    console.log('[PersonDetail] Opening social URL:', url);
    Linking.openURL(url).catch((e) => console.error('[PersonDetail] Failed to open URL:', e));
  };

  const update = (key: keyof Person, value: any) => setEditData((prev) => ({ ...prev, [key]: value }));

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!person) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: COLORS.textSecondary }}>Person not found</Text>
      </View>
    );
  }

  const displayData = editing ? editData : person;
  const photoSource = newPhotoUri || displayData.photo_url;
  const hasPhoto = !!photoSource;
  const initials = getInitials(displayData.name || '');
  const connectionLabel = getConnectionLabel(displayData.connection_type, displayData.connection_type_custom);
  const interestColor = getInterestColor(displayData.interest_level);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {editing ? (
                <AnimatedPressable
                  onPress={handleSave}
                  disabled={saving}
                  style={{
                    backgroundColor: COLORS.primary,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Check size={16} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Save</Text>
                    </>
                  )}
                </AnimatedPressable>
              ) : (
                <AnimatedPressable
                  onPress={handleEdit}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: COLORS.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Pencil size={16} color={COLORS.textSecondary} />
                </AnimatedPressable>
              )}
            </View>
          ),
        }}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero photo */}
        <Pressable onPress={editing ? pickPhoto : undefined}>
          <View style={{ height: 300, backgroundColor: COLORS.surface }}>
            {hasPhoto ? (
              <Image source={resolveImageSource(photoSource)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <LinearGradient
                colors={['#2A1A1A', '#1A0D0D']}
                style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 64, fontWeight: '700', color: COLORS.primary }}>{initials}</Text>
              </LinearGradient>
            )}
            {editing && (
              <View
                style={{
                  position: 'absolute',
                  bottom: 12,
                  right: 12,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  borderRadius: 20,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Pencil size={14} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Change photo</Text>
              </View>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 }}
            />
          </View>
        </Pressable>

        <View style={{ padding: 20, gap: 20 }}>
          {/* Name + location */}
          <View>
            {editing ? (
              <>
                <TextInput
                  value={editData.name || ''}
                  onChangeText={(v) => update('name', v)}
                  style={{
                    color: COLORS.text,
                    fontSize: 28,
                    fontWeight: '800',
                    backgroundColor: COLORS.surfaceSecondary,
                    borderRadius: 10,
                    padding: 10,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                />
                <TextInput
                  value={editData.location || ''}
                  onChangeText={(v) => update('location', v)}
                  placeholder="Location"
                  placeholderTextColor={COLORS.textTertiary}
                  style={{
                    color: COLORS.textSecondary,
                    fontSize: 15,
                    backgroundColor: COLORS.surfaceSecondary,
                    borderRadius: 10,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                />
              </>
            ) : (
              <>
                <Text style={{ color: COLORS.text, fontSize: 28, fontWeight: '800', marginBottom: 6 }}>
                  {displayData.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MapPin size={14} color={COLORS.textSecondary} />
                  <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>{displayData.location}</Text>
                </View>
              </>
            )}
          </View>

          {/* Connection + interest */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {connectionLabel ? (
              <View
                style={{
                  backgroundColor: COLORS.primaryMuted,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                }}
              >
                <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>{connectionLabel}</Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: interestColor }} />
              <Text style={{ color: interestColor, fontSize: 13, fontWeight: '600' }}>
                Interest: {displayData.interest_level ?? '—'}/10
              </Text>
            </View>
          </View>

          {/* Details card */}
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              gap: 12,
            }}
          >
            <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700' }}>Details</Text>
            {editing ? (
              <>
                <View>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginBottom: 4 }}>Age</Text>
                  <TextInput
                    value={editData.age?.toString() || ''}
                    onChangeText={(v) => update('age', v ? parseInt(v, 10) : undefined)}
                    keyboardType="numeric"
                    placeholder="Age"
                    placeholderTextColor={COLORS.textTertiary}
                    style={{
                      backgroundColor: COLORS.surfaceSecondary,
                      borderRadius: 8,
                      padding: 10,
                      color: COLORS.text,
                      fontSize: 14,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                    }}
                  />
                </View>
                <View>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginBottom: 4 }}>Birthday</Text>
                  <TextInput
                    value={editData.birthday || ''}
                    onChangeText={(v) => update('birthday', v)}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.textTertiary}
                    style={{
                      backgroundColor: COLORS.surfaceSecondary,
                      borderRadius: 8,
                      padding: 10,
                      color: COLORS.text,
                      fontSize: 14,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                    }}
                  />
                </View>
                <View>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginBottom: 6 }}>Zodiac</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {ZODIAC_SIGNS.map((z) => (
                        <Pressable
                          key={z.value}
                          onPress={() => update('zodiac', z.value)}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 14,
                            backgroundColor: editData.zodiac === z.value ? COLORS.accentMuted : COLORS.surfaceSecondary,
                            borderWidth: 1,
                            borderColor: editData.zodiac === z.value ? COLORS.accent : COLORS.border,
                          }}
                        >
                          <Text style={{ color: editData.zodiac === z.value ? COLORS.accent : COLORS.textSecondary, fontSize: 11 }}>
                            {z.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
                <View>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginBottom: 6 }}>Connection Type</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {CONNECTION_TYPES.map((ct) => (
                        <Pressable
                          key={ct.value}
                          onPress={() => update('connection_type', ct.value)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 16,
                            backgroundColor: editData.connection_type === ct.value ? COLORS.primary : COLORS.surfaceSecondary,
                            borderWidth: 1,
                            borderColor: editData.connection_type === ct.value ? COLORS.primary : COLORS.border,
                          }}
                        >
                          <Text style={{ color: editData.connection_type === ct.value ? '#fff' : COLORS.textSecondary, fontSize: 12 }}>
                            {ct.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </>
            ) : (
              <View style={{ gap: 8 }}>
                {displayData.age ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>Age</Text>
                    <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '500' }}>{displayData.age}</Text>
                  </View>
                ) : null}
                {displayData.birthday ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>Birthday</Text>
                    <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '500' }}>{displayData.birthday}</Text>
                  </View>
                ) : null}
                {displayData.zodiac ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>Zodiac</Text>
                    <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '500' }}>
                      {ZODIAC_SIGNS.find((z) => z.value === displayData.zodiac)?.label || displayData.zodiac}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>

          {/* Scores */}
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 14 }}>Scores</Text>
            <SliderDisplay
              label="Interest Level"
              value={displayData.interest_level}
              editing={editing}
              onChange={(v) => update('interest_level', v)}
            />
            <SliderDisplay
              label="Attractiveness"
              value={displayData.attractiveness}
              editing={editing}
              onChange={(v) => update('attractiveness', v)}
            />
            <SliderDisplay
              label="Sexual Chemistry"
              value={displayData.sexual_chemistry}
              editing={editing}
              onChange={(v) => update('sexual_chemistry', v)}
            />
            <SliderDisplay
              label="Communication"
              value={displayData.communication}
              editing={editing}
              onChange={(v) => update('communication', v)}
            />
          </View>

          {/* Social media */}
          {(displayData.instagram || displayData.tiktok || displayData.twitter_x || editing) && (
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: COLORS.border,
                gap: 10,
              }}
            >
              <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700' }}>Social Media</Text>
              {editing ? (
                <>
                  {[
                    { label: 'Instagram', key: 'instagram' as keyof Person },
                    { label: 'TikTok', key: 'tiktok' as keyof Person },
                    { label: 'X / Twitter', key: 'twitter_x' as keyof Person },
                  ].map((field) => (
                    <View key={field.key}>
                      <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginBottom: 4 }}>{field.label}</Text>
                      <TextInput
                        value={(editData[field.key] as string) || ''}
                        onChangeText={(v) => update(field.key, v)}
                        placeholder="@handle"
                        placeholderTextColor={COLORS.textTertiary}
                        autoCapitalize="none"
                        style={{
                          backgroundColor: COLORS.surfaceSecondary,
                          borderRadius: 8,
                          padding: 10,
                          color: COLORS.text,
                          fontSize: 14,
                          borderWidth: 1,
                          borderColor: COLORS.border,
                        }}
                      />
                    </View>
                  ))}
                </>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {displayData.instagram && (
                    <AnimatedPressable
                      onPress={() => openSocial(`https://instagram.com/${displayData.instagram}`)}
                    >
                      <View
                        style={{
                          backgroundColor: 'rgba(225,48,108,0.15)',
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Instagram size={14} color="#E1306C" />
                        <Text style={{ color: '#E1306C', fontSize: 13, fontWeight: '500' }}>
                          @{displayData.instagram}
                        </Text>
                      </View>
                    </AnimatedPressable>
                  )}
                  {displayData.tiktok && (
                    <AnimatedPressable
                      onPress={() => openSocial(`https://tiktok.com/@${displayData.tiktok}`)}
                    >
                      <View
                        style={{
                          backgroundColor: 'rgba(0,0,0,0.3)',
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          borderWidth: 1,
                          borderColor: COLORS.border,
                        }}
                      >
                        <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '500' }}>
                          TikTok @{displayData.tiktok}
                        </Text>
                      </View>
                    </AnimatedPressable>
                  )}
                  {displayData.twitter_x && (
                    <AnimatedPressable
                      onPress={() => openSocial(`https://x.com/${displayData.twitter_x}`)}
                    >
                      <View
                        style={{
                          backgroundColor: COLORS.surfaceSecondary,
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          borderWidth: 1,
                          borderColor: COLORS.border,
                        }}
                      >
                        <XIcon size={14} color={COLORS.text} />
                        <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '500' }}>
                          @{displayData.twitter_x}
                        </Text>
                      </View>
                    </AnimatedPressable>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Foods + Hobbies */}
          {((displayData.favorite_foods && displayData.favorite_foods.length > 0) ||
            (displayData.hobbies && displayData.hobbies.length > 0) || editing) && (
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: COLORS.border,
                gap: 14,
              }}
            >
              {(displayData.favorite_foods && displayData.favorite_foods.length > 0) || editing ? (
                <View>
                  <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
                    Favorite Foods
                  </Text>
                  <TagList
                    tags={editing ? editData.favorite_foods : displayData.favorite_foods}
                    color={COLORS.accent}
                    editing={editing}
                    onRemove={(t) => update('favorite_foods', (editData.favorite_foods || []).filter((f) => f !== t))}
                  />
                </View>
              ) : null}
              {(displayData.hobbies && displayData.hobbies.length > 0) || editing ? (
                <View>
                  <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
                    Hobbies & Interests
                  </Text>
                  <TagList
                    tags={editing ? editData.hobbies : displayData.hobbies}
                    color={COLORS.primary}
                    editing={editing}
                    onRemove={(t) => update('hobbies', (editData.hobbies || []).filter((h) => h !== t))}
                  />
                </View>
              ) : null}
            </View>
          )}

          {/* Flags */}
          {((displayData.green_flags && displayData.green_flags.length > 0) ||
            (displayData.red_flags && displayData.red_flags.length > 0) || editing) && (
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: COLORS.border,
                gap: 14,
              }}
            >
              {(displayData.green_flags && displayData.green_flags.length > 0) || editing ? (
                <View>
                  <Text style={{ color: COLORS.success, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
                    🟢 Green Flags
                  </Text>
                  <TagList
                    tags={editing ? editData.green_flags : displayData.green_flags}
                    color={COLORS.success}
                    editing={editing}
                    onRemove={(t) => update('green_flags', (editData.green_flags || []).filter((f) => f !== t))}
                  />
                </View>
              ) : null}
              {(displayData.red_flags && displayData.red_flags.length > 0) || editing ? (
                <View>
                  <Text style={{ color: COLORS.danger, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
                    🔴 Red Flags
                  </Text>
                  <TagList
                    tags={editing ? editData.red_flags : displayData.red_flags}
                    color={COLORS.danger}
                    editing={editing}
                    onRemove={(t) => update('red_flags', (editData.red_flags || []).filter((f) => f !== t))}
                  />
                </View>
              ) : null}
            </View>
          )}

          {/* Actions */}
          {!editing && (
            <View style={{ gap: 10, marginTop: 8 }}>
              {!person.is_benched && (
                <AnimatedPressable
                  onPress={handleBench}
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.warning,
                    borderRadius: 14,
                    paddingVertical: 14,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <Users size={18} color={COLORS.warning} />
                  <Text style={{ color: COLORS.warning, fontSize: 15, fontWeight: '600' }}>Move to Bench</Text>
                </AnimatedPressable>
              )}
              <AnimatedPressable onPress={handleDelete}>
                <Text style={{ color: COLORS.danger, fontSize: 14, textAlign: 'center', paddingVertical: 8 }}>
                  Delete person
                </Text>
              </AnimatedPressable>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
