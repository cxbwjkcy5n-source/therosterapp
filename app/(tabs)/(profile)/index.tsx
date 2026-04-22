import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Pressable,
  Animated,
} from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import {
  User,
  Bell,
  Moon,
  FileText,
  Shield,
  LogOut,
  ChevronRight,
  BarChart2,
  Pencil,
  Check,
  Camera,
  X,
  Instagram,
  MapPin,
  Briefcase,
  Phone,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet, apiPut } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ImageSourcePropType } from 'react-native';

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

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

interface UserProfile {
  display_name?: string;
  age?: number;
  birthday?: string;
  zodiac?: string;
  location?: string;
  occupation?: string;
  bio?: string;
  phone_number?: string;
  instagram?: string;
  tiktok?: string;
  twitter_x?: string;
  favorite_foods?: string[];
  hobbies?: string[];
  what_i_bring?: string[];
  things_to_work_on?: string[];
  attractiveness_self?: number;
  communication_self?: number;
  photo_url?: string;
}

interface Analytics {
  total_active?: number;
  total_benched?: number;
  total_dates?: number;
}

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function SelfSlider({ label, value, editing, onChange }: {
  label: string; value?: number; editing: boolean; onChange: (v: number) => void;
}) {
  const val = value ?? 5;
  const steps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const color = val >= 8 ? COLORS.success : val >= 5 ? COLORS.accent : COLORS.primary;
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
            onPress={() => {
              if (editing) {
                console.log(`[Profile] Self-rating ${label} set to:`, step);
                onChange(step);
              }
            }}
            disabled={!editing}
            style={{
              flex: 1,
              height: 22,
              borderRadius: 4,
              backgroundColor: step <= val ? color : COLORS.surfaceSecondary,
            }}
          />
        ))}
      </View>
    </View>
  );
}

function TagInput({ label, tags, onAdd, onRemove, color = COLORS.primary, editing }: {
  label: string; tags: string[]; onAdd: (t: string) => void; onRemove: (t: string) => void;
  color?: string; editing: boolean;
}) {
  const [input, setInput] = useState('');
  const handleAdd = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      console.log(`[Profile] Adding tag to ${label}:`, trimmed);
      onAdd(trimmed);
      setInput('');
    }
  };
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>{label}</Text>
      {editing && (
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
      )}
      {tags.length > 0 && (
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
                <Pressable onPress={() => {
                  console.log(`[Profile] Removing tag from ${label}:`, tag);
                  onRemove(tag);
                }}>
                  <X size={12} color={color} />
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function FormField({ label, value, onChangeText, placeholder, keyboardType, multiline, autoCapitalize }: {
  label: string; value: string; onChangeText: (v: string) => void; placeholder?: string;
  keyboardType?: any; multiline?: boolean; autoCapitalize?: any;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 7 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || label}
        placeholderTextColor={COLORS.textTertiary}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={autoCapitalize || 'sentences'}
        style={{
          backgroundColor: COLORS.surfaceSecondary,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: multiline ? 12 : 13,
          color: COLORS.text,
          fontSize: 15,
          borderWidth: 1,
          borderColor: COLORS.border,
          minHeight: multiline ? 80 : undefined,
          textAlignVertical: multiline ? 'top' : undefined,
        }}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [analytics, setAnalytics] = useState<Analytics>({});
  const [notifications, setNotifications] = useState(true);
  const [profile, setProfile] = useState<UserProfile>({});
  const [editData, setEditData] = useState<UserProfile>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [newPhotoUri, setNewPhotoUri] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      console.log('[Profile] Loading profile and analytics');
      Promise.all([
        apiGet<UserProfile>('/api/profile').catch((e) => {
          console.error('[Profile] Failed to load profile:', e);
          return {} as UserProfile;
        }),
        apiGet<Analytics>('/api/analytics').catch((e) => {
          console.error('[Profile] Failed to load analytics:', e);
          return {} as Analytics;
        }),
      ]).then(([profileData, analyticsData]) => {
        console.log('[Profile] Profile and analytics loaded');
        setProfile(profileData);
        setEditData(profileData);
        setAnalytics(analyticsData);
        setLoadingProfile(false);
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      });
    }, [user, fadeAnim])
  );

  const handleEdit = () => {
    console.log('[Profile] Edit mode activated');
    setEditData({ ...profile });
    setEditing(true);
  };

  const handleSave = async () => {
    console.log('[Profile] Saving profile');
    setSaving(true);
    try {
      await apiPut('/api/profile', editData);
      setProfile({ ...editData });
      setEditing(false);
      setNewPhotoUri(null);
      console.log('[Profile] Profile saved successfully');
    } catch (e: any) {
      console.error('[Profile] Save failed:', e);
      Alert.alert('Could not save', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    console.log('[Profile] Edit cancelled');
    setEditData({ ...profile });
    setEditing(false);
    setNewPhotoUri(null);
  };

  const pickPhoto = async () => {
    console.log('[Profile] Photo picker opened');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      console.log('[Profile] New photo selected');
      setNewPhotoUri(result.assets[0].uri);
      setEditData((prev) => ({ ...prev, photo_url: result.assets[0].uri }));
    }
  };

  const handleSignOut = () => {
    console.log('[Profile] Sign out pressed');
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          console.log('[Profile] Confirming sign out');
          await signOut();
          router.replace('/auth-screen');
        },
      },
    ]);
  };

  const update = (key: keyof UserProfile, value: any) =>
    setEditData((prev) => ({ ...prev, [key]: value }));

  const displayData = editing ? editData : profile;
  const photoSource = newPhotoUri || displayData.photo_url;
  const initials = getInitials(displayData.display_name || user?.name);
  const totalActive = analytics.total_active ?? 0;
  const totalBenched = analytics.total_benched ?? 0;
  const totalDates = analytics.total_dates ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen
        options={{
          title: 'Profile',
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {editing ? (
                <>
                  <AnimatedPressable
                    onPress={handleCancel}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: COLORS.surface,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={16} color={COLORS.textSecondary} />
                  </AnimatedPressable>
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
                        <Check size={15} color="#fff" />
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Save</Text>
                      </>
                    )}
                  </AnimatedPressable>
                </>
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
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  <Pencil size={16} color={COLORS.textSecondary} />
                </AnimatedPressable>
              )}
            </View>
          ),
        }}
      />

      <Animated.ScrollView
        style={{ opacity: loadingProfile ? 1 : fadeAnim }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar + info */}
        <View style={{ alignItems: 'center', paddingTop: 32, paddingBottom: 24, paddingHorizontal: 24 }}>
          <AnimatedPressable onPress={editing ? pickPhoto : undefined}>
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: COLORS.primaryMuted,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
                borderWidth: 2.5,
                borderColor: COLORS.primary,
                overflow: 'hidden',
                shadowColor: COLORS.primary,
                shadowOpacity: 0.3,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 4 },
              }}
            >
              {photoSource ? (
                <Image source={resolveImageSource(photoSource)} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <Text style={{ fontSize: 34, fontWeight: '700', color: COLORS.primary }}>{initials}</Text>
              )}
              {editing && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    alignItems: 'center',
                    paddingVertical: 6,
                  }}
                >
                  <Camera size={14} color="#fff" />
                </View>
              )}
            </View>
          </AnimatedPressable>

          {editing ? (
            <TextInput
              value={editData.display_name || ''}
              onChangeText={(v) => update('display_name', v)}
              placeholder={user?.name || 'Display name'}
              placeholderTextColor={COLORS.textTertiary}
              style={{
                color: COLORS.text,
                fontSize: 22,
                fontWeight: '700',
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: COLORS.border,
                textAlign: 'center',
                marginBottom: 4,
                minWidth: 180,
              }}
            />
          ) : (
            <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 4 }}>
              {displayData.display_name || user?.name || 'Anonymous'}
            </Text>
          )}
          <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>{user?.email || ''}</Text>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', marginHorizontal: 16, gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Active', value: totalActive, color: COLORS.primary },
            { label: 'Benched', value: totalBenched, color: COLORS.accent },
            { label: 'Dates', value: totalDates, color: COLORS.success },
          ].map((stat) => (
            <View
              key={stat.label}
              style={{
                flex: 1,
                backgroundColor: COLORS.surface,
                borderRadius: 14,
                padding: 14,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: COLORS.border,
                shadowColor: COLORS.primary,
                shadowOpacity: 0.06,
                shadowRadius: 8,
              }}
            >
              <Text style={{ fontSize: 22, fontWeight: '800', color: stat.color }}>{stat.value}</Text>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Profile form / view */}
        <View style={{ marginHorizontal: 16, gap: 12 }}>

          {/* About card */}
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              shadowColor: COLORS.primary,
              shadowOpacity: 0.06,
              shadowRadius: 12,
            }}
          >
            <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 14 }}>About Me</Text>

            {editing ? (
              <>
                <FormField label="Bio" value={editData.bio || ''} onChangeText={(v) => update('bio', v)} placeholder="Tell people about yourself..." multiline />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <FormField label="Age" value={editData.age?.toString() || ''} onChangeText={(v) => update('age', v ? parseInt(v, 10) : undefined)} placeholder="e.g. 28" keyboardType="numeric" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormField label="Birthday" value={editData.birthday || ''} onChangeText={(v) => update('birthday', v)} placeholder="YYYY-MM-DD" />
                  </View>
                </View>
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 }}>Zodiac</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {ZODIAC_SIGNS.map((z) => (
                        <Pressable
                          key={z.value}
                          onPress={() => {
                            console.log('[Profile] Zodiac selected:', z.value);
                            update('zodiac', z.value);
                          }}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 14,
                            backgroundColor: editData.zodiac === z.value ? COLORS.primaryMuted : COLORS.surfaceSecondary,
                            borderWidth: 1,
                            borderColor: editData.zodiac === z.value ? COLORS.primary : COLORS.border,
                          }}
                        >
                          <Text style={{ color: editData.zodiac === z.value ? COLORS.primary : COLORS.textSecondary, fontSize: 11 }}>
                            {z.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
                <FormField label="Location" value={editData.location || ''} onChangeText={(v) => update('location', v)} placeholder="City, neighborhood..." />
                <FormField label="Occupation" value={editData.occupation || ''} onChangeText={(v) => update('occupation', v)} placeholder="What do you do?" />
              </>
            ) : (
              <View style={{ gap: 10 }}>
                {displayData.bio ? (
                  <Text style={{ color: COLORS.text, fontSize: 15, lineHeight: 22 }}>{displayData.bio}</Text>
                ) : (
                  <Text style={{ color: COLORS.textTertiary, fontSize: 14, fontStyle: 'italic' }}>No bio yet. Tap edit to add one.</Text>
                )}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {displayData.age ? (
                    <View style={{ backgroundColor: COLORS.primaryMuted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>{displayData.age} yrs</Text>
                    </View>
                  ) : null}
                  {displayData.zodiac ? (
                    <View style={{ backgroundColor: COLORS.primaryMuted, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>
                        {ZODIAC_SIGNS.find((z) => z.value === displayData.zodiac)?.label || displayData.zodiac}
                      </Text>
                    </View>
                  ) : null}
                  {displayData.location ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surfaceSecondary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <MapPin size={12} color={COLORS.textSecondary} />
                      <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>{displayData.location}</Text>
                    </View>
                  ) : null}
                  {displayData.occupation ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surfaceSecondary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Briefcase size={12} color={COLORS.textSecondary} />
                      <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>{displayData.occupation}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            )}
          </View>

          {/* Contact card */}
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              shadowColor: COLORS.primary,
              shadowOpacity: 0.06,
              shadowRadius: 12,
            }}
          >
            <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 14 }}>Contact & Social</Text>
            {editing ? (
              <>
                <FormField label="Phone Number" value={editData.phone_number || ''} onChangeText={(v) => update('phone_number', v)} placeholder="+1 (555) 000-0000" keyboardType="phone-pad" autoCapitalize="none" />
                <FormField label="Instagram" value={editData.instagram || ''} onChangeText={(v) => update('instagram', v)} placeholder="@handle" autoCapitalize="none" />
                <FormField label="TikTok" value={editData.tiktok || ''} onChangeText={(v) => update('tiktok', v)} placeholder="@handle" autoCapitalize="none" />
                <FormField label="X / Twitter" value={editData.twitter_x || ''} onChangeText={(v) => update('twitter_x', v)} placeholder="@handle" autoCapitalize="none" />
              </>
            ) : (
              <View style={{ gap: 10 }}>
                {displayData.phone_number ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Phone size={16} color={COLORS.textSecondary} />
                    <Text style={{ color: COLORS.text, fontSize: 15 }}>{displayData.phone_number}</Text>
                  </View>
                ) : null}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {displayData.instagram ? (
                    <View style={{ backgroundColor: 'rgba(225,48,108,0.15)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Instagram size={14} color="#E1306C" />
                      <Text style={{ color: '#E1306C', fontSize: 13, fontWeight: '500' }}>@{displayData.instagram}</Text>
                    </View>
                  ) : null}
                  {displayData.tiktok ? (
                    <View style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.border }}>
                      <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '500' }}>TikTok @{displayData.tiktok}</Text>
                    </View>
                  ) : null}
                  {displayData.twitter_x ? (
                    <View style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.border }}>
                      <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '500' }}>X @{displayData.twitter_x}</Text>
                    </View>
                  ) : null}
                  {!displayData.phone_number && !displayData.instagram && !displayData.tiktok && !displayData.twitter_x && (
                    <Text style={{ color: COLORS.textTertiary, fontSize: 14, fontStyle: 'italic' }}>No contact info yet.</Text>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Tags card */}
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              shadowColor: COLORS.primary,
              shadowOpacity: 0.06,
              shadowRadius: 12,
            }}
          >
            <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 14 }}>Interests</Text>
            <TagInput
              label="Favorite Foods"
              tags={displayData.favorite_foods || []}
              onAdd={(t) => update('favorite_foods', [...(editData.favorite_foods || []), t])}
              onRemove={(t) => update('favorite_foods', (editData.favorite_foods || []).filter((f) => f !== t))}
              color={COLORS.accent}
              editing={editing}
            />
            <TagInput
              label="Hobbies"
              tags={displayData.hobbies || []}
              onAdd={(t) => update('hobbies', [...(editData.hobbies || []), t])}
              onRemove={(t) => update('hobbies', (editData.hobbies || []).filter((h) => h !== t))}
              color={COLORS.primary}
              editing={editing}
            />
          </View>

          {/* Flags card */}
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              shadowColor: COLORS.primary,
              shadowOpacity: 0.06,
              shadowRadius: 12,
            }}
          >
            <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 14 }}>Self-Awareness</Text>
            <TagInput
              label="What I Bring"
              tags={displayData.what_i_bring || []}
              onAdd={(t) => update('what_i_bring', [...(editData.what_i_bring || []), t])}
              onRemove={(t) => update('what_i_bring', (editData.what_i_bring || []).filter((f) => f !== t))}
              color={COLORS.success}
              editing={editing}
            />
            <TagInput
              label="Things to Work On"
              tags={displayData.things_to_work_on || []}
              onAdd={(t) => update('things_to_work_on', [...(editData.things_to_work_on || []), t])}
              onRemove={(t) => update('things_to_work_on', (editData.things_to_work_on || []).filter((f) => f !== t))}
              color={COLORS.danger}
              editing={editing}
            />
          </View>

          {/* Self-ratings */}
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              shadowColor: COLORS.primary,
              shadowOpacity: 0.06,
              shadowRadius: 12,
            }}
          >
            <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 14 }}>Self-Ratings</Text>
            <SelfSlider
              label="Attractiveness"
              value={displayData.attractiveness_self}
              editing={editing}
              onChange={(v) => update('attractiveness_self', v)}
            />
            <SelfSlider
              label="Communication"
              value={displayData.communication_self}
              editing={editing}
              onChange={(v) => update('communication_self', v)}
            />
          </View>

          {/* Settings */}
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 12,
              fontWeight: '600',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              marginTop: 8,
              marginBottom: 4,
              marginLeft: 4,
            }}
          >
            Settings
          </Text>

          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.divider,
              }}
            >
              <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: COLORS.accentMuted, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Bell size={18} color={COLORS.accent} />
              </View>
              <Text style={{ flex: 1, color: COLORS.text, fontSize: 15 }}>Notifications</Text>
              <Switch
                value={notifications}
                onValueChange={(v) => {
                  console.log('[Profile] Notifications toggled:', v);
                  setNotifications(v);
                }}
                trackColor={{ false: COLORS.surfaceSecondary, true: COLORS.primary }}
                thumbColor="#fff"
              />
            </View>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.divider,
              }}
            >
              <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: 'rgba(100,100,200,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Moon size={18} color="#8B8BFF" />
              </View>
              <Text style={{ flex: 1, color: COLORS.text, fontSize: 15 }}>Dark mode</Text>
              <Switch
                value={true}
                onValueChange={() => console.log('[Profile] Dark mode toggle (always on)')}
                trackColor={{ false: COLORS.surfaceSecondary, true: COLORS.primary }}
                thumbColor="#fff"
              />
            </View>

            <AnimatedPressable
              onPress={() => {
                console.log('[Profile] Insights pressed');
                router.push('/analytics');
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.divider }}>
                <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: COLORS.successMuted, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <BarChart2 size={18} color={COLORS.success} />
                </View>
                <Text style={{ flex: 1, color: COLORS.text, fontSize: 15 }}>Insights</Text>
                <ChevronRight size={18} color={COLORS.textTertiary} />
              </View>
            </AnimatedPressable>

            <AnimatedPressable onPress={() => console.log('[Profile] Privacy Policy pressed')}>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.divider }}>
                <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Shield size={18} color={COLORS.primary} />
                </View>
                <Text style={{ flex: 1, color: COLORS.text, fontSize: 15 }}>Privacy Policy</Text>
                <ChevronRight size={18} color={COLORS.textTertiary} />
              </View>
            </AnimatedPressable>

            <AnimatedPressable onPress={() => console.log('[Profile] Terms of Service pressed')}>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
                <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <FileText size={18} color={COLORS.primary} />
                </View>
                <Text style={{ flex: 1, color: COLORS.text, fontSize: 15 }}>Terms of Service</Text>
                <ChevronRight size={18} color={COLORS.textTertiary} />
              </View>
            </AnimatedPressable>
          </View>

          <AnimatedPressable onPress={handleSignOut} style={{ marginTop: 4, marginBottom: 8 }}>
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 16,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(232,25,44,0.25)',
                gap: 10,
              }}
            >
              <LogOut size={18} color={COLORS.primary} />
              <Text style={{ color: COLORS.primary, fontSize: 15, fontWeight: '600' }}>Sign out</Text>
            </View>
          </AnimatedPressable>
        </View>
      </Animated.ScrollView>
    </View>
  );
}
