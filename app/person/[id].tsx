import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  Linking,
  Modal,
  TouchableOpacity,
  Animated,
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
  Phone,
  MessageSquare,
  Heart,
  Star,
  PhoneCall,
  Plus,
  ChevronDown,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { BirthdayPicker, formatBirthdayDisplay } from '@/components/BirthdayPicker';
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
  phone_number?: string;
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

interface Interaction {
  id: string;
  person_id: string;
  type: 'date' | 'text' | 'call' | 'other';
  title: string;
  notes?: string;
  interaction_date: string;
  created_at: string;
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

const INTERACTION_TYPES = [
  { value: 'date', label: 'Date', icon: Heart },
  { value: 'text', label: 'Text', icon: MessageSquare },
  { value: 'call', label: 'Call', icon: PhoneCall },
  { value: 'other', label: 'Other', icon: Star },
] as const;

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

function formatInteractionDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function getInteractionIcon(type: string) {
  switch (type) {
    case 'date': return Heart;
    case 'text': return MessageSquare;
    case 'call': return PhoneCall;
    default: return Star;
  }
}

function getInteractionColor(type: string) {
  switch (type) {
    case 'date': return COLORS.primary;
    case 'text': return COLORS.accent;
    case 'call': return COLORS.success;
    default: return COLORS.textSecondary;
  }
}

function SliderDisplay({ label, value, editing, onChange }: {
  label: string; value?: number; editing: boolean; onChange: (v: number) => void;
}) {
  const val = value ?? 5;
  return (
    <View style={{ marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' }}>{label}</Text>
        <Text style={{ color: '#E53935', fontSize: 13, fontWeight: '700' }}>{val}/10</Text>
      </View>
      {/* Track */}
      <View style={{ height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, position: 'relative', marginHorizontal: 9 }}>
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${(val / 10) * 100}%`,
            backgroundColor: '#E53935',
            borderRadius: 2,
          }}
        />
      </View>
      {/* Tap targets */}
      <View style={{ flexDirection: 'row', marginTop: -9 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((step) => (
          <Pressable
            key={step}
            onPress={() => {
              if (editing) {
                console.log(`[PersonDetail] ${label} slider set to:`, step);
                onChange(step);
              }
            }}
            disabled={!editing}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 9 }}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: step === val ? '#fff' : 'transparent',
                borderWidth: step === val ? 2 : 0,
                borderColor: '#E53935',
                shadowColor: step === val ? '#E53935' : 'transparent',
                shadowOpacity: step === val ? 0.4 : 0,
                shadowRadius: 4,
                elevation: step === val ? 3 : 0,
              }}
            />
          </Pressable>
        ))}
      </View>
      {/* Min/max labels */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
        <Text style={{ color: COLORS.textTertiary, fontSize: 11 }}>0</Text>
        <Text style={{ color: COLORS.textTertiary, fontSize: 11 }}>10</Text>
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

function LogInteractionModal({
  visible,
  personId,
  onClose,
  onSaved,
}: {
  visible: boolean;
  personId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<'date' | 'text' | 'call' | 'other'>('date');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dateStr, setDateStr] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    console.log('[PersonDetail] Logging interaction:', type, title);
    setSaving(true);
    try {
      await apiPost('/api/interactions', {
        person_id: personId,
        type,
        title: title.trim(),
        notes: notes.trim() || undefined,
        interaction_date: dateStr,
      });
      console.log('[PersonDetail] Interaction saved');
      setTitle('');
      setNotes('');
      setType('date');
      setDateStr(new Date().toISOString().slice(0, 10));
      onSaved();
      onClose();
    } catch (e: any) {
      console.error('[PersonDetail] Failed to save interaction:', e);
      Alert.alert('Could not save', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 40,
              borderTopWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700' }}>Log Interaction</Text>
              <AnimatedPressable onPress={onClose}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
                  <XIcon size={16} color={COLORS.textSecondary} />
                </View>
              </AnimatedPressable>
            </View>

            {/* Type selector */}
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 10 }}>Type</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
              {INTERACTION_TYPES.map((t) => {
                const IconComp = t.icon;
                const isSelected = type === t.value;
                const color = getInteractionColor(t.value);
                return (
                  <AnimatedPressable
                    key={t.value}
                    onPress={() => {
                      console.log('[PersonDetail] Interaction type selected:', t.value);
                      setType(t.value);
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 12,
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: isSelected ? color + '20' : COLORS.surfaceSecondary,
                      borderWidth: 1,
                      borderColor: isSelected ? color : COLORS.border,
                    }}
                  >
                    <IconComp size={16} color={isSelected ? color : COLORS.textTertiary} />
                    <Text style={{ color: isSelected ? color : COLORS.textTertiary, fontSize: 11, fontWeight: '600' }}>{t.label}</Text>
                  </AnimatedPressable>
                );
              })}
            </View>

            {/* Title */}
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 7 }}>
              Title <Text style={{ color: COLORS.primary }}>*</Text>
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Coffee at Blue Bottle"
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
                marginBottom: 14,
              }}
            />

            {/* Notes */}
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 7 }}>Notes (optional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="How did it go?"
              placeholderTextColor={COLORS.textTertiary}
              multiline
              style={{
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: COLORS.text,
                fontSize: 15,
                borderWidth: 1,
                borderColor: COLORS.border,
                minHeight: 72,
                textAlignVertical: 'top',
                marginBottom: 14,
              }}
            />

            {/* Date */}
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 7 }}>Date</Text>
            <TextInput
              value={dateStr}
              onChangeText={setDateStr}
              placeholder="YYYY-MM-DD"
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
                marginBottom: 20,
              }}
            />

            <AnimatedPressable
              onPress={handleSave}
              disabled={!title.trim() || saving}
              style={{
                backgroundColor: title.trim() ? COLORS.primary : COLORS.surfaceSecondary,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
                shadowColor: COLORS.primary,
                shadowOpacity: title.trim() ? 0.3 : 0,
                shadowRadius: 12,
              }}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: title.trim() ? '#fff' : COLORS.textTertiary, fontSize: 16, fontWeight: '700' }}>
                  Save interaction
                </Text>
              )}
            </AnimatedPressable>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
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
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loadingInteractions, setLoadingInteractions] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);

  const loadPerson = useCallback(async () => {
    if (!id) return;
    console.log('[PersonDetail] Loading person:', id);
    try {
      const data = await apiGet<{ person: Person }>(`/api/persons/${id}`);
      console.log('[PersonDetail] Person loaded:', data.person?.name);
      setPerson(data.person);
      setEditData(data.person);
    } catch (e) {
      console.error('[PersonDetail] Failed to load person:', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadInteractions = useCallback(async () => {
    if (!id) return;
    console.log('[PersonDetail] Loading interactions for person:', id);
    try {
      const data = await apiGet<{ interactions: Interaction[] }>(`/api/interactions?person_id=${id}`);
      console.log('[PersonDetail] Loaded', data.interactions?.length ?? 0, 'interactions');
      setInteractions(data.interactions || []);
    } catch (e) {
      console.error('[PersonDetail] Failed to load interactions:', e);
    } finally {
      setLoadingInteractions(false);
    }
  }, [id]);

  useEffect(() => {
    Promise.all([loadPerson(), loadInteractions()]);
  }, [loadPerson, loadInteractions]);

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

  const openPhone = (phone: string) => {
    const cleaned = phone.replace(/\s/g, '');
    console.log('[PersonDetail] Opening phone dialer:', cleaned);
    Linking.openURL(`tel:${cleaned}`).catch((e) => console.error('[PersonDetail] Failed to open dialer:', e));
  };

  const openSMS = (phone: string) => {
    const cleaned = phone.replace(/\s/g, '');
    console.log('[PersonDetail] Opening SMS:', cleaned);
    Linking.openURL(`sms:${cleaned}`).catch((e) => console.error('[PersonDetail] Failed to open SMS:', e));
  };

  const handleDeleteInteraction = (interaction: Interaction) => {
    console.log('[PersonDetail] Delete interaction pressed:', interaction.id);
    Alert.alert('Delete interaction?', `"${interaction.title}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            console.log('[PersonDetail] Deleting interaction:', interaction.id);
            await apiDelete(`/api/interactions/${interaction.id}`);
            console.log('[PersonDetail] Interaction deleted');
            setInteractions((prev) => prev.filter((i) => i.id !== interaction.id));
          } catch (e) {
            console.error('[PersonDetail] Failed to delete interaction:', e);
            Alert.alert('Error', 'Could not delete. Try again.');
          }
        },
      },
    ]);
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
  const hasPhone = !!(displayData.phone_number);
  const personName = person.name;

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
                colors={['#2A0A0A', '#1A0505']}
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
              colors={['transparent', 'rgba(0,0,0,0.75)']}
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
                <AddressAutocomplete
                  value={editData.location || ''}
                  onChangeText={(v) => update('location', v)}
                  onSelect={(addr) => {
                    console.log('[PersonDetail] Location selected from autocomplete:', addr);
                    update('location', addr);
                  }}
                  placeholder="Location"
                />
              </>
            ) : (
              <>
                <Text style={{ color: COLORS.text, fontSize: 28, fontWeight: '800', marginBottom: 6, letterSpacing: -0.5 }}>
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

          {/* Contact card */}
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              shadowColor: COLORS.primary,
              shadowOpacity: 0.08,
              shadowRadius: 12,
              gap: 12,
            }}
          >
            <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700' }}>Contact</Text>

            {editing ? (
              <View>
                <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginBottom: 6 }}>Phone Number</Text>
                <TextInput
                  value={editData.phone_number || ''}
                  onChangeText={(v) => update('phone_number', v)}
                  placeholder="+1 (555) 000-0000"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="phone-pad"
                  style={{
                    backgroundColor: COLORS.surfaceSecondary,
                    borderRadius: 10,
                    padding: 11,
                    color: COLORS.text,
                    fontSize: 15,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                />
              </View>
            ) : hasPhone ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Phone size={15} color={COLORS.textSecondary} />
                  <Text style={{ color: COLORS.text, fontSize: 15 }}>{displayData.phone_number}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <AnimatedPressable
                    onPress={() => openSMS(displayData.phone_number!)}
                    style={{ flex: 1 }}
                  >
                    <View
                      style={{
                        backgroundColor: COLORS.primaryMuted,
                        borderRadius: 12,
                        paddingVertical: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        borderWidth: 1,
                        borderColor: 'rgba(232,25,44,0.2)',
                      }}
                    >
                      <MessageSquare size={16} color={COLORS.primary} />
                      <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '600' }}>
                        Text {personName.split(' ')[0]}
                      </Text>
                    </View>
                  </AnimatedPressable>
                  <AnimatedPressable
                    onPress={() => openPhone(displayData.phone_number!)}
                    style={{ flex: 1 }}
                  >
                    <View
                      style={{
                        backgroundColor: COLORS.successMuted,
                        borderRadius: 12,
                        paddingVertical: 12,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        borderWidth: 1,
                        borderColor: 'rgba(34,197,94,0.2)',
                      }}
                    >
                      <Phone size={16} color={COLORS.success} />
                      <Text style={{ color: COLORS.success, fontSize: 14, fontWeight: '600' }}>
                        Call {personName.split(' ')[0]}
                      </Text>
                    </View>
                  </AnimatedPressable>
                </View>
              </>
            ) : (
              <AnimatedPressable onPress={handleEdit}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Plus size={14} color={COLORS.textTertiary} />
                  <Text style={{ color: COLORS.textTertiary, fontSize: 14 }}>Add phone number</Text>
                </View>
              </AnimatedPressable>
            )}

            {/* Social chips */}
            {(displayData.instagram || displayData.tiktok || displayData.twitter_x) && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {displayData.instagram && (
                  <AnimatedPressable onPress={() => openSocial(`https://instagram.com/${displayData.instagram}`)}>
                    <View style={{ backgroundColor: 'rgba(225,48,108,0.15)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Instagram size={14} color="#E1306C" />
                      <Text style={{ color: '#E1306C', fontSize: 13, fontWeight: '500' }}>@{displayData.instagram}</Text>
                    </View>
                  </AnimatedPressable>
                )}
                {displayData.tiktok && (
                  <AnimatedPressable onPress={() => openSocial(`https://tiktok.com/@${displayData.tiktok}`)}>
                    <View style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: COLORS.border }}>
                      <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '500' }}>TikTok @{displayData.tiktok}</Text>
                    </View>
                  </AnimatedPressable>
                )}
                {displayData.twitter_x && (
                  <AnimatedPressable onPress={() => openSocial(`https://x.com/${displayData.twitter_x}`)}>
                    <View style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: COLORS.border }}>
                      <XIcon size={14} color={COLORS.text} />
                      <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '500' }}>@{displayData.twitter_x}</Text>
                    </View>
                  </AnimatedPressable>
                )}
              </View>
            )}
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
                    style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 8, padding: 10, color: COLORS.text, fontSize: 14, borderWidth: 1, borderColor: COLORS.border }}
                  />
                </View>
                <View>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginBottom: 4 }}>Birthday</Text>
                  <BirthdayPicker
                    value={editData.birthday || ''}
                    onChange={(v) => {
                      console.log('[PersonDetail] Birthday selected:', v, formatBirthdayDisplay(v));
                      update('birthday', v);
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
                {/* Social in edit mode */}
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
                      style={{ backgroundColor: COLORS.surfaceSecondary, borderRadius: 8, padding: 10, color: COLORS.text, fontSize: 14, borderWidth: 1, borderColor: COLORS.border }}
                    />
                  </View>
                ))}
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
                    <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '500' }}>{formatBirthdayDisplay(displayData.birthday) || displayData.birthday}</Text>
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
            <SliderDisplay label="Interest Level" value={displayData.interest_level} editing={editing} onChange={(v) => update('interest_level', v)} />
            <SliderDisplay label="Attractiveness" value={displayData.attractiveness} editing={editing} onChange={(v) => update('attractiveness', v)} />
            <SliderDisplay label="Sexual Chemistry" value={displayData.sexual_chemistry} editing={editing} onChange={(v) => update('sexual_chemistry', v)} />
            <SliderDisplay label="Communication" value={displayData.communication} editing={editing} onChange={(v) => update('communication', v)} />
          </View>

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
                  <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Favorite Foods</Text>
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
                  <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Hobbies & Interests</Text>
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
                  <Text style={{ color: COLORS.success, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Green Flags</Text>
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
                  <Text style={{ color: COLORS.danger, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Red Flags</Text>
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

          {/* Interaction Timeline */}
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              shadowColor: COLORS.primary,
              shadowOpacity: 0.08,
              shadowRadius: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700' }}>Interaction Timeline</Text>
              <AnimatedPressable
                onPress={() => {
                  console.log('[PersonDetail] Log Interaction button pressed');
                  setShowLogModal(true);
                }}
                style={{
                  backgroundColor: COLORS.primary,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Plus size={14} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Log</Text>
              </AnimatedPressable>
            </View>

            {loadingInteractions ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
            ) : interactions.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Heart size={22} color={COLORS.primary} />
                </View>
                <Text style={{ color: COLORS.textSecondary, fontSize: 14, textAlign: 'center' }}>
                  No interactions yet.{'\n'}Log your first one!
                </Text>
              </View>
            ) : (
              <View>
                {interactions.map((interaction, index) => {
                  const IconComp = getInteractionIcon(interaction.type);
                  const color = getInteractionColor(interaction.type);
                  const dateDisplay = formatInteractionDate(interaction.interaction_date);
                  const isLast = index === interactions.length - 1;
                  return (
                    <AnimatedPressable
                      key={interaction.id}
                      onLongPress={() => handleDeleteInteraction(interaction)}
                    >
                      <View style={{ flexDirection: 'row', gap: 12, marginBottom: isLast ? 0 : 16 }}>
                        {/* Timeline line + dot */}
                        <View style={{ alignItems: 'center', width: 32 }}>
                          <View
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 16,
                              backgroundColor: color + '20',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderWidth: 1.5,
                              borderColor: color,
                            }}
                          >
                            <IconComp size={14} color={color} />
                          </View>
                          {!isLast && (
                            <View
                              style={{
                                width: 2,
                                flex: 1,
                                backgroundColor: COLORS.primary,
                                opacity: 0.25,
                                marginTop: 4,
                                minHeight: 20,
                              }}
                            />
                          )}
                        </View>
                        {/* Content */}
                        <View style={{ flex: 1, paddingTop: 4 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                            <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                              {interaction.title}
                            </Text>
                            <Text style={{ color: COLORS.textTertiary, fontSize: 12, marginLeft: 8 }}>{dateDisplay}</Text>
                          </View>
                          {interaction.notes ? (
                            <Text style={{ color: COLORS.textSecondary, fontSize: 13, lineHeight: 18 }} numberOfLines={2}>
                              {interaction.notes}
                            </Text>
                          ) : null}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
                            <Text style={{ color, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' }}>{interaction.type}</Text>
                          </View>
                        </View>
                      </View>
                    </AnimatedPressable>
                  );
                })}
              </View>
            )}
          </View>

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

      <LogInteractionModal
        visible={showLogModal}
        personId={id!}
        onClose={() => {
          console.log('[PersonDetail] Log interaction modal closed');
          setShowLogModal(false);
        }}
        onSaved={loadInteractions}
      />
    </View>
  );
}
