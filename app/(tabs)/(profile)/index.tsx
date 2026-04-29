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
  Share2,
  Trash2,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet, apiPut, apiPost, authenticatedDelete } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ImageSourcePropType } from 'react-native';
import { BirthdayPicker, formatBirthdayDisplay } from '@/components/BirthdayPicker';

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType | null {
  if (!source) return null;
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function getZodiacFromMMDD(mm: number, dd: number): string | null {
  if ((mm === 3 && dd >= 21) || (mm === 4 && dd <= 19)) return 'aries';
  if ((mm === 4 && dd >= 20) || (mm === 5 && dd <= 20)) return 'taurus';
  if ((mm === 5 && dd >= 21) || (mm === 6 && dd <= 20)) return 'gemini';
  if ((mm === 6 && dd >= 21) || (mm === 7 && dd <= 22)) return 'cancer';
  if ((mm === 7 && dd >= 23) || (mm === 8 && dd <= 22)) return 'leo';
  if ((mm === 8 && dd >= 23) || (mm === 9 && dd <= 22)) return 'virgo';
  if ((mm === 9 && dd >= 23) || (mm === 10 && dd <= 22)) return 'libra';
  if ((mm === 10 && dd >= 23) || (mm === 11 && dd <= 21)) return 'scorpio';
  if ((mm === 11 && dd >= 22) || (mm === 12 && dd <= 21)) return 'sagittarius';
  if ((mm === 12 && dd >= 22) || (mm === 1 && dd <= 19)) return 'capricorn';
  if ((mm === 1 && dd >= 20) || (mm === 2 && dd <= 18)) return 'aquarius';
  if ((mm === 2 && dd >= 19) || (mm === 3 && dd <= 20)) return 'pisces';
  return null;
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
  const [darkMode, setDarkMode] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({});
  const [editData, setEditData] = useState<UserProfile>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [newPhotoBase64, setNewPhotoBase64] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      console.log('[Profile] Loading profile, analytics, and preferences');
      Promise.all([
        apiGet<any>('/api/profile').catch((e) => {
          console.error('[Profile] Failed to load profile:', e);
          return {} as any;
        }),
        apiGet<Analytics>('/api/analytics').catch((e) => {
          console.error('[Profile] Failed to load analytics:', e);
          return {} as Analytics;
        }),
        apiGet<{ notifications_enabled: boolean; dark_mode_enabled: boolean }>('/api/preferences').catch(() => ({ notifications_enabled: true, dark_mode_enabled: false })),
      ]).then(([res, analyticsData, prefs]) => {
        const profileData: UserProfile = (res as any).profile ?? res;
        console.log('[Profile] Profile, analytics, and preferences loaded');
        setProfile(profileData);
        setEditData(profileData);
        setAnalytics(analyticsData);
        setNotifications(prefs.notifications_enabled);
        setDarkMode(prefs.dark_mode_enabled);
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
      const dataToSave = { ...editData };

      // Upload photo first, then include the returned URL in the PUT payload
      if (newPhotoBase64) {
        console.log('[Profile] Uploading photo via POST /api/upload-photo');
        try {
          const uploadRes = await apiPost<{ photo_url: string }>('/api/upload-photo', { base64: newPhotoBase64 });
          console.log('[Profile] Photo upload succeeded, url:', uploadRes.photo_url);
          dataToSave.photo_url = uploadRes.photo_url;
        } catch (uploadErr: any) {
          console.error('[Profile] Photo upload failed:', uploadErr?.message);
          Alert.alert('Photo upload failed', uploadErr?.message || 'Could not upload photo. Other profile changes will still be saved.');
        }
      }

      await apiPut('/api/profile', dataToSave);

      console.log('[Profile] PUT succeeded, re-fetching profile');
      const res = await apiGet<any>('/api/profile');
      const saved: UserProfile = (res as any).profile ?? res;
      console.log('[Profile] Profile saved and re-fetched successfully');
      setProfile(saved);
      setEditData(saved);
      setEditing(false);
      setNewPhotoBase64(null);
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
    setNewPhotoBase64(null);
  };

  const pickPhoto = async () => {
    console.log('[Profile] Photo picker opened');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      console.log('[Profile] New photo selected');
      setNewPhotoBase64(result.assets[0].base64 ?? null);
      // Preview using local file URI for immediate display
      setEditData((prev) => ({ ...prev, photo_url: result.assets[0].uri }));
    }
  };

  const handleDeleteAccount = () => {
    console.log('[Profile] Delete account pressed');
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data — your roster, dates, notes, and everything else. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[Profile] Confirming account deletion');
              await authenticatedDelete('/api/account');
              await signOut();
              router.replace('/auth-screen');
            } catch (e: any) {
              console.error('[Profile] Account deletion error:', e);
              Alert.alert('Could not delete account', e?.message || 'Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    console.log('[Profile] Sign out pressed');
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            console.log('[Profile] Confirming sign out');
            await signOut();
          } catch (e) {
            console.error('[Profile] Sign out error:', e);
          } finally {
            router.replace('/auth-screen');
          }
        },
      },
    ]);
  };

  const update = (key: keyof UserProfile, value: any) =>
    setEditData((prev) => ({ ...prev, [key]: value }));

  const displayData = editing ? editData : profile;
  const photoSource = displayData.photo_url || null;
  const initials = getInitials(displayData.display_name || user?.name);
  const totalActive = analytics.total_active ?? 0;
  const totalBenched = analytics.total_benched ?? 0;
  const totalDates = analytics.total_dates ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen
        options={{
          title: 'Profile',
          headerShown: true,
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerShadowVisible: false,
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
        contentContainerStyle={{ paddingBottom: insets.bottom + 180 }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar + info */}
        <View style={{ alignItems: 'center', paddingTop: 24, paddingBottom: 24, paddingHorizontal: 24 }}>
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
              {photoSource && resolveImageSource(photoSource) ? (
                <Image source={resolveImageSource(photoSource)!} style={{ width: '100%', height: '100%' }} contentFit="cover" />
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
                    <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 7 }}>Birthday</Text>
                    <BirthdayPicker
                      value={editData.birthday || ''}
                      onChange={(v) => {
                        update('birthday', v);
                        if (v) {
                          const [mm, dd] = v.split('-').map(Number);
                          const zodiac = getZodiacFromMMDD(mm, dd);
                          if (zodiac) update('zodiac', zodiac);
                        }
                      }}
                    />
                  </View>
                </View>
                {editData.zodiac ? (
                  <View style={{ marginBottom: 14 }}>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6 }}>Zodiac (auto)</Text>
                    <View style={{ backgroundColor: COLORS.primaryMuted, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' }}>
                      <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>
                        {ZODIAC_SIGNS.find(z => z.value === editData.zodiac)?.label || editData.zodiac}
                      </Text>
                    </View>
                  </View>
                ) : null}
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
            <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 14 }}>Interests & Flags</Text>
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
                  apiPut('/api/preferences', { notifications_enabled: v }).catch((e: any) => console.error('[Profile] Failed to save notifications pref:', e));
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
                value={darkMode}
                onValueChange={(v) => {
                  console.log('[Profile] Dark mode toggled:', v);
                  setDarkMode(v);
                  apiPut('/api/preferences', { dark_mode_enabled: v }).catch((e: any) => console.error('[Profile] Failed to save dark mode pref:', e));
                }}
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

            <AnimatedPressable onPress={() => { console.log('[Profile] Share profile pressed'); router.push('/share-profile'); }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.divider }}>
                <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Share2 size={18} color={COLORS.primary} />
                </View>
                <Text style={{ flex: 1, color: COLORS.text, fontSize: 15 }}>My Share Code</Text>
                <ChevronRight size={18} color={COLORS.textTertiary} />
              </View>
            </AnimatedPressable>

            <AnimatedPressable onPress={() => {
                console.log('[Profile] Privacy Policy pressed');
                router.push('/privacy');
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.divider }}>
                <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Shield size={18} color={COLORS.primary} />
                </View>
                <Text style={{ flex: 1, color: COLORS.text, fontSize: 15 }}>Privacy Policy</Text>
                <ChevronRight size={18} color={COLORS.textTertiary} />
              </View>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={() => {
                console.log('[Profile] Legal pressed — navigating to /legal');
                router.push('/legal');
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
                <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <FileText size={18} color={COLORS.primary} />
                </View>
                <Text style={{ flex: 1, color: COLORS.text, fontSize: 15 }}>Legal</Text>
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

          <AnimatedPressable onPress={handleDeleteAccount} style={{ marginTop: 4, marginBottom: 8 }}>
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 16,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(232,25,44,0.15)',
                gap: 10,
              }}
            >
              <Trash2 size={16} color={COLORS.textTertiary} />
              <Text style={{ color: COLORS.textTertiary, fontSize: 14, fontWeight: '500' }}>Delete Account</Text>
            </View>
          </AnimatedPressable>
        </View>
      </Animated.ScrollView>
    </View>
  );
}
