import React, { useState, useEffect, useCallback, useRef } from 'react';

async function uploadToCloudinary(base64: string, mimeType: string = 'image/jpeg'): Promise<string> {
  console.log('[Cloudinary] Uploading image, mimeType:', mimeType);
  const formData = new FormData();
  formData.append('file', `data:${mimeType};base64,${base64}`);
  formData.append('upload_preset', 'Roster');
  const res = await fetch('https://api.cloudinary.com/v1_1/dfssa7ecv/image/upload', {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!data.secure_url) throw new Error('Cloudinary upload failed');
  console.log('[Cloudinary] Upload successful:', data.secure_url);
  return data.secure_url;
}
import { useFocusEffect } from '@react-navigation/native';
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
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  Pencil,
  MapPin,
  X as XIcon,
  Trash2,
  Users,
  Phone,
  MessageSquare,
  Plus,
  Bell,
  Calendar,
  ChevronDown,
  ChevronUp,
  Heart,
  Star,
  Send,
} from 'lucide-react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { Image, Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { BirthdayPicker, formatBirthdayDisplay } from '@/components/BirthdayPicker';
import { apiGet, apiPut, apiDelete, apiPost, apiPatch } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ImageSourcePropType } from 'react-native';

// ─── helpers ────────────────────────────────────────────────────────────────

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
  return 'capricorn';
}

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType | null {
  if (!source) return null;
  if (typeof source === 'string') {
    if (source.length < 10) return null;
    return { uri: source };
  }
  return source as ImageSourcePropType;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

// ─── PhotoThumb ──────────────────────────────────────────────────────────────
function PhotoThumb({ photoUrl, colors }: { photoUrl: string; colors: Record<string, string> }) {
  if (!photoUrl || photoUrl.trim().length === 0) {
    return (
      <View style={{ width: 80, height: 80, borderRadius: 12, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="camera-outline" size={28} color="#AAAAAA" />
      </View>
    );
  }
  return (
    <ExpoImage
      source={{ uri: photoUrl }}
      style={{ width: 80, height: 80, borderRadius: 12 }}
      contentFit="cover"
      cachePolicy="none"
    />
  );
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
}

function formatDateTimeLabel(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date}  ${time}`;
}

function formatFullDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimestamp(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getConnectionLabel(type?: string, custom?: string) {
  const map: Record<string, string> = {
    friend: 'Friend', casual: 'Casual', booty_call: 'Booty Call',
    foodie_call: 'Foodie buddy', figuring_it_out: 'Figuring It Out',
    serious: 'Serious', other: custom || 'Other',
  };
  return type ? (map[type] || type) : '';
}

// ─── normalizer ──────────────────────────────────────────────────────────────

function normalizePerson(raw: any): Person {
  if (!raw) return raw;
  return {
    id: raw.id,
    name: raw.name,
    location: raw.location,
    photo_url: raw.photo_url ?? raw.photoUrl,
    age: raw.age,
    birthday: raw.birthday,
    zodiac: raw.zodiac,
    phone_number: raw.phone_number ?? raw.phoneNumber,
    instagram: raw.instagram,
    tiktok: raw.tiktok,
    twitter_x: raw.twitter_x ?? raw.twitterX,
    facebook: raw.facebook,
    interest_level: raw.interest_level ?? raw.interestLevel,
    attractiveness: raw.attractiveness,
    sexual_chemistry: raw.sexual_chemistry ?? raw.sexualChemistry,
    overall_chemistry: raw.overall_chemistry ?? raw.overallChemistry,
    communication: raw.communication,
    consistency: raw.consistency,
    emotional_availability: raw.emotional_availability ?? raw.emotionalAvailability,
    date_planning: raw.date_planning ?? raw.datePlanning,
    alignment: raw.alignment,
    connection_type: raw.connection_type ?? raw.connectionType,
    connection_type_custom: raw.connection_type_custom ?? raw.connectionTypeCustom,
    favorite_foods: raw.favorite_foods ?? raw.favoriteFoods,
    favorite_color: raw.favorite_color ?? raw.favoriteColor,
    things_they_like: raw.things_they_like ?? raw.thingsTheyLike,
    lifestyle_vibe: raw.lifestyle_vibe ?? raw.lifestyleVibe,
    intention: raw.intention,
    distance_type: raw.distance_type ?? raw.distanceType,
    hobbies: raw.hobbies,
    green_flags: raw.green_flags ?? raw.greenFlags,
    red_flags: raw.red_flags ?? raw.redFlags,
    is_benched: raw.is_benched ?? raw.isBenched,
    bench_reason: raw.bench_reason ?? raw.benchReason,
    nickname: raw.nickname,
    things_i_like: raw.things_i_like ?? raw.thingsILike,
    dating_status: raw.dating_status ?? raw.datingStatus,
    tags: raw.tags,
    career: raw.career,
  };
}

// ─── interfaces ──────────────────────────────────────────────────────────────

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
  facebook?: string;
  phone_number?: string;
  interest_level?: number;
  attractiveness?: number;
  sexual_chemistry?: number;
  overall_chemistry?: number;
  communication?: number;
  consistency?: number;
  emotional_availability?: number;
  date_planning?: number;
  alignment?: number;
  connection_type?: string;
  connection_type_custom?: string;
  favorite_foods?: string[];
  favorite_color?: string;
  things_they_like?: string[];
  lifestyle_vibe?: string;
  intention?: string;
  distance_type?: string;
  hobbies?: string[];
  green_flags?: string[];
  red_flags?: string[];
  is_benched?: boolean;
  bench_reason?: string;
  nickname?: string;
  things_i_like?: string;
  dating_status?: string;
  tags?: string[];
  career?: string;
}

interface DateEntry {
  id: string;
  person_id: string;
  type?: string;
  location?: string;
  date_time?: string;
  status?: string;
  notes?: string;
  rating?: number;
  went_well?: string;
  went_poorly?: string;
  want_another_date?: boolean;
  created_at: string;
}

interface Note {
  id: string;
  person_id: string;
  content: string;
  created_at: string;
}

interface Reminder {
  id: string;
  person_id: string;
  text: string;
  remind_at: string;
  created_at: string;
}

// ─── constants ───────────────────────────────────────────────────────────────

const DATE_TYPES = ['Coffee', 'Dinner', 'Drinks', 'Adventure', 'Movie', 'Stay-in', 'Other'];
const WOULD_GO_AGAIN_OPTIONS = ['Yes', 'Maybe', 'No'];

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

const RED = '#E53935';
const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
};

const QUICK_MESSAGES = [
  'Good morning 🌅',
  'Thinking about you 💭',
  'Miss you',
  'Are you free this weekend? 🍽️',
  'Wanna grab dinner? 🍽️',
  'Had a great time last night!',
];

// ─── sub-components ──────────────────────────────────────────────────────────

const SectionHeader = React.memo(function SectionHeader({ label }: { label: string }) {
  return (
    <Text style={{
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: '#999999',
      marginBottom: 12,
    }}>
      {label}
    </Text>
  );
});

const PillTag = React.memo(function PillTag({ label, color = '#555555', bg = '#F5F5F5' }: { label: string; color?: string; bg?: string }) {
  return (
    <View style={{
      backgroundColor: bg,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    }}>
      <Text style={{ color, fontSize: 11, fontWeight: '500' }}>{label}</Text>
    </View>
  );
});

const ReadOnlySlider = React.memo(function ReadOnlySlider({ label, value, excluded, onToggleExclude }: {
  label: string; value?: number; excluded?: boolean; onToggleExclude?: () => void
}) {
  const val = value ?? 0;
  const fillPct = `${(val / 10) * 100}%` as any;
  const valueStr = String(val);
  return (
    <View style={{ marginBottom: 16, opacity: excluded ? 0.4 : 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Pressable
            onPress={onToggleExclude}
            style={{
              width: 22, height: 22, borderRadius: 5,
              borderWidth: 1.5,
              borderColor: excluded ? '#CCCCCC' : RED,
              backgroundColor: excluded ? 'transparent' : RED,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            {!excluded && <Ionicons name="checkmark" size={14} color="#fff" />}
          </Pressable>
          <Text style={{ color: '#444444', fontSize: 14, fontWeight: '500' }}>{label}</Text>
        </View>
        {!excluded && (
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={{ color: RED, fontSize: 14, fontWeight: '700' }}>{valueStr}</Text>
            <Text style={{ color: '#AAAAAA', fontSize: 12, fontWeight: '500' }}>/10</Text>
          </View>
        )}
      </View>
      {!excluded && (
        <View style={{ height: 4, backgroundColor: '#E8E8E8', borderRadius: 2, overflow: 'hidden' }}>
          <View style={{ height: 4, width: fillPct, backgroundColor: RED, borderRadius: 2 }} />
        </View>
      )}
    </View>
  );
});

const EditableSlider = React.memo(function EditableSlider({ label, value, onChange, excluded, onToggleExclude }: {
  label: string; value?: number; onChange: (v: number) => void; excluded?: boolean; onToggleExclude?: () => void
}) {
  const val = value ?? 5;
  const fillPct = `${(val / 10) * 100}%` as any;
  const valueStr = String(val);
  return (
    <View style={{ marginBottom: 16, opacity: excluded ? 0.4 : 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <Pressable
            onPress={onToggleExclude}
            style={{
              width: 22, height: 22, borderRadius: 5,
              borderWidth: 1.5,
              borderColor: excluded ? '#CCCCCC' : RED,
              backgroundColor: excluded ? 'transparent' : RED,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            {!excluded && <Ionicons name="checkmark" size={14} color="#fff" />}
          </Pressable>
          <Text style={{ color: '#444444', fontSize: 14, fontWeight: '500' }}>{label}</Text>
        </View>
        {!excluded && (
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={{ color: RED, fontSize: 14, fontWeight: '700' }}>{valueStr}</Text>
            <Text style={{ color: '#AAAAAA', fontSize: 12, fontWeight: '500' }}>/10</Text>
          </View>
        )}
      </View>
      {!excluded && (
        <View style={{ position: 'relative', height: 20, justifyContent: 'center' }}>
          <View style={{ height: 4, backgroundColor: '#E8E8E8', borderRadius: 2, overflow: 'hidden' }}>
            <View style={{ height: 4, width: fillPct, backgroundColor: RED, borderRadius: 2 }} />
          </View>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row' }}>
            {[1,2,3,4,5,6,7,8,9,10].map((step) => (
              <Pressable
                key={step}
                onPress={() => {
                  console.log(`[PersonDetail] Slider "${label}" set to:`, step);
                  onChange(step);
                }}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
              >
                {step === val ? (
                  <View style={{
                    width: 18, height: 18, borderRadius: 9,
                    backgroundColor: RED,
                    shadowColor: RED, shadowOpacity: 0.4, shadowRadius: 4,
                    shadowOffset: { width: 0, height: 1 }, elevation: 3,
                  }} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
});

// Circular score ring using SVG-like approach with border
function ScoreRing({ score, color, size = 48 }: { score: number; color: string; size?: number }) {
  const displayScore = String(score ?? 0);
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      borderWidth: 3, borderColor: color,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    }}>
      <Text style={{ color: '#1A1A1A', fontSize: 13, fontWeight: '700' }}>{displayScore}</Text>
    </View>
  );
}

// Compatibility ring for profile card
function CompatibilityRing({ score }: { score: number }) {
  const displayScore = String(score);
  return (
    <View style={{
      width: 48, height: 48, borderRadius: 24,
      borderWidth: 3, borderColor: RED,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    }}>
      <Text style={{ color: '#1A1A1A', fontSize: 13, fontWeight: '700' }}>{displayScore}</Text>
    </View>
  );
}

// ─── Call Modal ───────────────────────────────────────────────────────────────

function CallModal({ visible, name, phone, onClose, onConfirm }: { visible: boolean; name: string; phone: string; onClose: () => void; onConfirm?: () => void }) {
  const handleStartCall = () => {
    console.log('[PersonDetail] Start Call pressed for:', name, phone);
    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`).catch((e) =>
      console.error('[PersonDetail] Failed to open tel link:', e)
    );
    onConfirm?.();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View style={{
          backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: 28, paddingBottom: 40,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1A1A1A' }}>
              {'Call '}
              <Text>{name}</Text>
            </Text>
            <Pressable onPress={onClose} style={{
              width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F5F5',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <XIcon size={16} color="#666666" />
            </Pressable>
          </View>
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: 'rgba(229,57,53,0.08)',
              alignItems: 'center', justifyContent: 'center', marginBottom: 12,
            }}>
              <Phone size={32} color={RED} />
            </View>
            <Text style={{ color: '#999999', fontSize: 14, marginBottom: 6 }}>Calling</Text>
            <Text style={{ color: '#1A1A1A', fontSize: 20, fontWeight: '700' }}>{phone}</Text>
          </View>
          <Pressable
            onPress={handleStartCall}
            style={{
              backgroundColor: RED, borderRadius: 14, height: 52,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
          >
            <Phone size={20} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Start Call</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Text Modal ───────────────────────────────────────────────────────────────

function TextModal({ visible, name, phone, onClose, onConfirm }: { visible: boolean; name: string; phone: string; onClose: () => void; onConfirm?: () => void }) {
  const [customMessage, setCustomMessage] = useState('');
  const firstName = name.split(' ')[0];

  const sendMessage = (msg: string) => {
    console.log('[PersonDetail] Sending message to:', name, 'message:', msg);
    const encoded = encodeURIComponent(msg);
    const cleanPhone = phone.replace(/\s/g, '');
    Linking.openURL(`sms:${cleanPhone}?body=${encoded}`).catch((e) =>
      console.error('[PersonDetail] Failed to open sms link:', e)
    );
    onConfirm?.();
    onClose();
  };

  const handleSendCustom = () => {
    if (!customMessage.trim()) return;
    sendMessage(customMessage.trim());
    setCustomMessage('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View style={{
          backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: 24, paddingBottom: 40,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#1A1A1A' }}>
              {'Text '}
              <Text>{name}</Text>
            </Text>
            <Pressable onPress={onClose} style={{
              width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F5F5',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <XIcon size={16} color="#666666" />
            </Pressable>
          </View>

          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 }}>Quick Messages</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {QUICK_MESSAGES.map((msg) => (
                <Pressable
                  key={msg}
                  onPress={() => {
                    console.log('[PersonDetail] Quick message tapped:', msg);
                    sendMessage(msg);
                  }}
                  style={{
                    backgroundColor: '#F5F5F5', borderRadius: 20,
                    paddingHorizontal: 14, paddingVertical: 9,
                  }}
                >
                  <Text style={{ color: '#1A1A1A', fontSize: 13 }}>{msg}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 }}>Custom Message</Text>
          <View style={{
            flexDirection: 'row', alignItems: 'flex-end',
            backgroundColor: '#F5F5F5', borderRadius: 14,
            borderWidth: 1, borderColor: '#E0E0E0',
            paddingHorizontal: 14, paddingVertical: 10, gap: 10,
          }}>
            <TextInput
              value={customMessage}
              onChangeText={setCustomMessage}
              placeholder={`Message ${firstName}...`}
              placeholderTextColor="#BBBBBB"
              multiline
              style={{ flex: 1, color: '#1A1A1A', fontSize: 14, maxHeight: 100 }}
            />
            <Pressable
              onPress={handleSendCustom}
              style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: customMessage.trim() ? RED : '#DDDDDD',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Send size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Log Date Modal ───────────────────────────────────────────────────────────

function LogDateModal({
  visible, onClose, onSave,
  dateType, setDateType,
  dateWhen, setDateWhen,
  showDatePicker, setShowDatePicker,
  showTimePicker, setShowTimePicker,
  dateLocation, setDateLocation,
  dateNotes, setDateNotes,
  dateVibe, setDateVibe,
  savingDate,
}: {
  visible: boolean; onClose: () => void; onSave: () => void;
  dateType: string; setDateType: (v: string) => void;
  dateWhen: Date; setDateWhen: (v: Date) => void;
  showDatePicker: boolean; setShowDatePicker: (v: boolean) => void;
  showTimePicker: boolean; setShowTimePicker: (v: boolean) => void;
  dateLocation: string; setDateLocation: (v: string) => void;
  dateNotes: string; setDateNotes: (v: string) => void;
  dateVibe: string; setDateVibe: (v: string) => void;
  savingDate: boolean;
}) {
  const dateWhenLabel = dateWhen.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const dateTimeLabel = dateWhen.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View style={{
          backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
          maxHeight: '92%',
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 0 }}>
            <Text style={{ color: '#1A1A1A', fontSize: 18, fontWeight: '700' }}>Log a Date</Text>
            <Pressable onPress={onClose} style={{
              width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F5F5',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <XIcon size={16} color="#666666" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 16 }} keyboardShouldPersistTaps="handled">
            {/* Vibe */}
            <Text style={{ color: '#999999', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10 }}>How was the vibe?</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {[
                { emoji: '😍', label: 'Amazing' },
                { emoji: '🙂', label: 'Good' },
                { emoji: '😐', label: 'Meh' },
                { emoji: '😬', label: 'Awkward' },
              ].map((v) => {
                const isSelected = dateVibe === v.emoji;
                return (
                  <Pressable
                    key={v.emoji}
                    onPress={() => {
                      console.log('[PersonDetail] Date vibe selected:', v.label);
                      setDateVibe(dateVibe === v.emoji ? '' : v.emoji);
                    }}
                    style={{
                      flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12,
                      backgroundColor: isSelected ? 'rgba(229,57,53,0.1)' : '#F5F5F5',
                      borderWidth: 1.5, borderColor: isSelected ? '#E53935' : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>{v.emoji}</Text>
                    <Text style={{ fontSize: 10, color: '#999', marginTop: 3 }}>{v.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Type */}
            <Text style={{ color: '#999999', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10 }}>Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {DATE_TYPES.map((t) => {
                const isSelected = dateType === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => {
                      console.log('[PersonDetail] Date type selected:', t);
                      setDateType(t);
                    }}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                      backgroundColor: isSelected ? RED : '#F5F5F5',
                      borderWidth: 1, borderColor: isSelected ? RED : '#E0E0E0',
                    }}
                  >
                    <Text style={{ color: isSelected ? '#fff' : '#666666', fontSize: 13, fontWeight: '500' }}>{t}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* When */}
            <Text style={{ color: '#999999', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10 }}>When</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <Pressable
                onPress={() => {
                  console.log('[PersonDetail] Date picker opened');
                  setShowDatePicker(true);
                }}
                style={{ flex: 1, backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E0E0E0', flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Calendar size={16} color={RED} />
                <Text style={{ color: '#1A1A1A', fontSize: 14 }}>{dateWhenLabel}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  console.log('[PersonDetail] Time picker opened');
                  setShowTimePicker(true);
                }}
                style={{ flex: 1, backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center' }}
              >
                <Text style={{ color: '#1A1A1A', fontSize: 14 }}>{dateTimeLabel}</Text>
              </Pressable>
            </View>
            {showDatePicker && (
              <DateTimePicker
                value={dateWhen}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => {
                  setShowDatePicker(false);
                  if (d) { console.log('[PersonDetail] Date selected:', d); setDateWhen(d); }
                }}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={dateWhen}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => {
                  setShowTimePicker(false);
                  if (d) { console.log('[PersonDetail] Time selected:', d); setDateWhen(d); }
                }}
              />
            )}

            {/* Location */}
            <Text style={{ color: '#999999', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10 }}>Location</Text>
            <TextInput
              value={dateLocation}
              onChangeText={setDateLocation}
              placeholder="e.g. Blue Bottle Cafe"
              placeholderTextColor="#BBBBBB"
              style={{
                backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14,
                color: '#1A1A1A', fontSize: 14, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 20,
              }}
            />

            {/* Notes */}
            <Text style={{ color: '#999999', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10 }}>Notes</Text>
            <TextInput
              value={dateNotes}
              onChangeText={setDateNotes}
              placeholder="How did it go?"
              placeholderTextColor="#BBBBBB"
              multiline
              style={{
                backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14,
                color: '#1A1A1A', fontSize: 14, borderWidth: 1, borderColor: '#E0E0E0',
                minHeight: 80, textAlignVertical: 'top', marginBottom: 20,
              }}
            />

            <Pressable
              onPress={onSave}
              disabled={savingDate}
              style={{
                backgroundColor: RED, borderRadius: 14, height: 52,
                alignItems: 'center', justifyContent: 'center', opacity: savingDate ? 0.7 : 1,
              }}
            >
              {savingDate ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save Date</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── main screen ─────────────────────────────────────────────────────────────

type TabName = 'Overview' | 'Dates' | 'Notes' | 'Reminders';
const TABS: TabName[] = ['Overview', 'Dates', 'Notes', 'Reminders'];

export default function PersonDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { isReady } = useAuth();

  // core data
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<Person>>({});
  const [newPhotoUri, setNewPhotoUri] = useState<string | null>(null);
  const [newPhotoBase64, setNewPhotoBase64] = useState<string | null>(null);
  const [excludedRatings, setExcludedRatings] = useState<Set<string>>(new Set());
  const [ratingsExpanded, setRatingsExpanded] = useState(false);

  // tab
  const [activeTab, setActiveTab] = useState<TabName>('Overview');

  // dates tab
  const [dates, setDates] = useState<DateEntry[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);
  const [expandedDateId, setExpandedDateId] = useState<string | null>(null);
  const [showLogDateModal, setShowLogDateModal] = useState(false);
  // log date form
  const [dateType, setDateType] = useState('Coffee');
  const [dateWhen, setDateWhen] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [dateLocation, setDateLocation] = useState('');
  const [dateNotes, setDateNotes] = useState('');
  const [dateVibe, setDateVibe] = useState('');
  const [savingDate, setSavingDate] = useState(false);

  // scroll ref for keyboard avoidance
  const scrollViewRef = useRef<ScrollView>(null);

  // notes tab
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [addingNote, setAddingNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // reminders tab
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [addingReminder, setAddingReminder] = useState(false);
  const [reminderText, setReminderText] = useState('');
  const [reminderDate, setReminderDate] = useState(new Date());
  const [showReminderDatePicker, setShowReminderDatePicker] = useState(false);
  const [savingReminder, setSavingReminder] = useState(false);

  // modals
  const [showCallModal, setShowCallModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);

  // interactions (calls/texts)
  const [interactions, setInteractions] = useState<{ id: string; type: string; title: string; occurred_at: string; created_at?: string }[]>([]);

  // inline flag editing (view mode)
  const [addingGreenFlag, setAddingGreenFlag] = useState('');
  const [addingRedFlag, setAddingRedFlag] = useState('');

  // inline card editing
  const [inlineEditField, setInlineEditField] = useState<'things_i_like' | 'dating_status' | 'tags' | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  const [inlineTagInput, setInlineTagInput] = useState('');
  const [inlineTags, setInlineTags] = useState<string[]>([]);
  const [inlineSaving, setInlineSaving] = useState(false);

  // tags
  const [newTag, setNewTag] = useState('');

  // conversation starters
  const [startersLoading, setStartersLoading] = useState(false);
  const [starters, setStarters] = useState<string[]>([]);
  const [startersModalVisible, setStartersModalVisible] = useState(false);

  // compatibility report
  const [compatReportLoading, setCompatReportLoading] = useState(false);
  const [compatReport, setCompatReport] = useState<{
    overall_score: number;
    summary: string;
    strongest_trait: string;
    weakest_trait: string;
    traits?: { name: string; score: number }[];
  } | null>(null);
  const [compatReportVisible, setCompatReportVisible] = useState(false);

  // person photos
  const [personPhotos, setPersonPhotos] = useState<{ id: string; photo_url: string; sort_order?: number }[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // edit date
  const [editingDateId, setEditingDateId] = useState<string | null>(null);

  // scroll to end when note input appears so keyboard doesn't cover it
  useEffect(() => {
    if (addingNote) {
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [addingNote]);

  // ── loaders ──────────────────────────────────────────────────────────────

  const loadPerson = useCallback(async () => {
    if (!id) return;
    const personId = Array.isArray(id) ? id[0] : id;
    console.log('[PersonDetail] Loading person id:', personId);
    try {
      const data = await apiGet<any>(`/api/persons/${personId}`);
      console.log('[PersonDetail] Raw API response keys:', Object.keys(data || {}));
      // Handle both { person: {...} } and direct person object shapes, normalize camelCase→snake_case
      const resolved: Person = normalizePerson(data?.person ?? data);
      console.log('[PersonDetail] Person loaded:', resolved?.name, 'id:', resolved?.id);
      if (!resolved?.id) {
        console.error('[PersonDetail] Person not found in response:', data);
      }
      setPerson(resolved ?? null);
      setEditData(resolved ?? {});
    } catch (e) {
      console.error('[PersonDetail] Failed to load person:', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadDates = useCallback(async () => {
    if (!id) return;
    console.log('[PersonDetail] Loading dates for person:', id);
    try {
      const data = await apiGet<{ dates: DateEntry[] }>(`/api/dates?person_id=${id}`);
      console.log('[PersonDetail] Loaded', data.dates?.length ?? 0, 'dates');
      setDates(data.dates || []);
    } catch (e) {
      console.error('[PersonDetail] Failed to load dates:', e);
    } finally {
      setLoadingDates(false);
    }
  }, [id]);


  const loadNotes = useCallback(async () => {
    if (!id) return;
    console.log('[PersonDetail] Loading notes for person:', id);
    try {
      const data = await apiGet<{ notes: Note[] }>(`/api/notes?person_id=${id}`);
      console.log('[PersonDetail] Loaded', data.notes?.length ?? 0, 'notes');
      setNotes(data.notes || []);
    } catch (e) {
      console.error('[PersonDetail] Failed to load notes:', e);
    } finally {
      setLoadingNotes(false);
    }
  }, [id]);

  const loadReminders = useCallback(async () => {
    if (!id) return;
    console.log('[PersonDetail] Loading reminders for person:', id);
    try {
      const data = await apiGet<{ reminders: Reminder[] }>(`/api/reminders?person_id=${id}`);
      console.log('[PersonDetail] Loaded', data.reminders?.length ?? 0, 'reminders');
      setReminders(data.reminders || []);
    } catch (e) {
      console.error('[PersonDetail] Failed to load reminders:', e);
    } finally {
      setLoadingReminders(false);
    }
  }, [id]);

  const loadInteractions = useCallback(async () => {
    if (!id) return;
    console.log('[PersonDetail] Loading interactions for person:', id);
    try {
      const data = await apiGet<{ interactions: { id: string; type: string; title: string; occurred_at: string; created_at?: string }[] }>(`/api/interactions?person_id=${id}`);
      console.log('[PersonDetail] Loaded', data.interactions?.length ?? 0, 'interactions');
      setInteractions(data.interactions || []);
    } catch (e) {
      console.error('[PersonDetail] Failed to load interactions:', e);
    }
  }, [id]);

  useEffect(() => {
    if (!id || !isReady) return;
    const personId = Array.isArray(id) ? id[0] : id;
    loadPerson();
    loadNotes();
    loadReminders();
    loadInteractions();
    loadDates();
    // Fetch photos inline to avoid stale useCallback closure
    console.log('[PersonDetail] Loading photos inline for person:', personId);
    apiGet<{ photos: { id: string; photo_url: string; sort_order?: number }[] }>(`/api/persons/${personId}/photos`)
      .then((data) => {
        const photos = (data.photos || []).filter((p) => p.photo_url && p.photo_url.trim().length > 0);
        console.log('[PersonDetail] Loaded', photos.length, 'photos');
        setPersonPhotos(photos);
      })
      .catch((e) => console.error('[PersonDetail] Failed to load photos:', e));
  }, [id, isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── actions ──────────────────────────────────────────────────────────────

  const handleEdit = () => {
    console.log('[PersonDetail] Edit mode toggled on');
    const sliderDefaults = {
      interest_level: person?.interest_level ?? 5,
      attractiveness: person?.attractiveness ?? 5,
      sexual_chemistry: person?.sexual_chemistry ?? 5,
      overall_chemistry: person?.overall_chemistry ?? 5,
      communication: person?.communication ?? 5,
      consistency: person?.consistency ?? 5,
      emotional_availability: person?.emotional_availability ?? 5,
      date_planning: person?.date_planning ?? 5,
      alignment: person?.alignment ?? 5,
    };
    const contactDefaults = {
      phone_number: person?.phone_number ?? '',
      instagram: person?.instagram ?? '',
      tiktok: person?.tiktok ?? '',
      facebook: person?.facebook ?? '',
      twitter_x: person?.twitter_x ?? '',
    };
    setEditing(true);
    setEditData({ ...person, ...sliderDefaults, ...contactDefaults });
  };

  const handleSave = async () => {
    if (!id || !editData) return;
    console.log('[PersonDetail] Saving person:', id);
    setSaving(true);
    try {
      const ALLOWED_FIELDS = [
        'name', 'location', 'age', 'birthday', 'zodiac',
        'instagram', 'tiktok', 'twitter_x', 'facebook', 'connection_type',
        'connection_type_custom', 'interest_level', 'attractiveness',
        'sexual_chemistry', 'communication', 'overall_chemistry', 'consistency',
        'emotional_availability', 'date_planning', 'alignment',
        'favorite_foods', 'hobbies', 'green_flags', 'red_flags', 'photo_url',
        'things_i_like', 'dating_status', 'tags', 'career', 'nickname',
      ];
      const payload: Record<string, any> = {};
      for (const key of ALLOWED_FIELDS) {
        const val = (editData as any)[key];
        if (val === undefined) continue;
        if (key === 'zodiac' || key === 'connection_type') {
          if (val) payload[key] = val;
          // if falsy, skip entirely — backend rejects empty string for enum fields
          continue;
        }
        payload[key] = val;
      }
      // Include base64 photo directly in the main PUT payload
      if (newPhotoBase64) {
        payload.photo_url = `data:image/jpeg;base64,${newPhotoBase64}`;
        console.log('[PersonDetail] Including new photo in save payload');
      }

      await apiPut(`/api/persons/${id}`, payload);
      // Always PATCH phone_number separately via dedicated endpoint
      const phoneVal = (editData.phone_number as string) ?? '';
      try {
        await apiPatch(`/api/persons/${id}/phone`, { phone_number: phoneVal === '' ? null : phoneVal });
        console.log('[PersonDetail] Phone number patched separately:', phoneVal || 'null');
      } catch (phoneErr) {
        console.error('[PersonDetail] Phone PATCH failed:', phoneErr);
      }
      const updatedRaw = await apiGet<any>(`/api/persons/${id}`);
      const updated: Person = normalizePerson(updatedRaw?.person ?? updatedRaw);
      setPerson(updated);
      setEditData(updated);
      setEditing(false);
      setNewPhotoUri(null);
      setNewPhotoBase64(null);
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

  const handleUnbench = async () => {
    if (!id) return;
    console.log('[PersonDetail] Unbenching person:', id);
    try {
      await apiPut(`/api/persons/${id}`, { is_benched: false, bench_reason: null });
      console.log('[PersonDetail] Successfully unbenched:', id);
      await loadPerson();
    } catch (e: any) {
      console.error('[PersonDetail] Failed to unbench:', e);
      Alert.alert('Error', 'Could not move them back. Try again.');
    }
  };

  const pickPhoto = async () => {
    console.log('[PersonDetail] Photo picker opened');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'] as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      console.log('[PersonDetail] New photo selected');
      const base64 = result.assets[0].base64 ?? null;
      setNewPhotoUri(result.assets[0].uri);
      setNewPhotoBase64(base64);
      if (base64) {
        setEditData((prev) => ({ ...prev, photo_url: `data:image/jpeg;base64,${base64}` }));
      }
    }
  };

  const openLink = (url: string) => {
    console.log('[PersonDetail] Opening URL:', url);
    Linking.openURL(url).catch((e) => console.error('[PersonDetail] Failed to open URL:', e));
  };

  const handleSaveDate = async () => {
    console.log('[PersonDetail] Saving date for person:', id, 'type:', dateType, 'vibe:', dateVibe);
    setSavingDate(true);
    try {
      const combinedNotes = [dateVibe, dateNotes.trim()].filter(Boolean).join(' ') || undefined;
      const result = await apiPost<any>('/api/dates', {
        person_id: id,
        type: dateType.toLowerCase(),
        location: dateLocation.trim() || undefined,
        date_time: dateWhen.toISOString(),
        notes: combinedNotes,
        status: 'completed',
        title: `Date with ${person?.name || 'Unknown'}`,
      });
      console.log('[PersonDetail] Date saved successfully, result:', result);
      const newDateId = result?.date?.id || result?.id;
      setDateType('Coffee');
      setDateWhen(new Date());
      setDateLocation('');
      setDateNotes('');
      setDateVibe('');
      setShowLogDateModal(false);
      await loadDates();
      if (newDateId) {
        console.log('[PersonDetail] Navigating to date-review for dateId:', newDateId);
        router.push({
          pathname: '/date-review',
          params: {
            dateId: newDateId,
            personName: person?.name || '',
            personPhoto: person?.photo_url || '',
          },
        });
      }
    } catch (e: any) {
      console.error('[PersonDetail] Failed to save date:', e);
      Alert.alert('Could not save date', e?.message || 'Please try again.');
    } finally {
      setSavingDate(false);
    }
  };

  const handleDeleteDate = (dateId: string) => {
    console.log('[PersonDetail] Delete date pressed:', dateId);
    Alert.alert('Delete date?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await apiDelete(`/api/dates/${dateId}`);
            console.log('[PersonDetail] Date deleted:', dateId);
            setDates((prev) => prev.filter((d) => d.id !== dateId));
            setExpandedDateId(null);
          } catch (e) {
            console.error('[PersonDetail] Failed to delete date:', e);
          }
        },
      },
    ]);
  };

  const handleSaveNote = async () => {
    if (!newNoteText.trim()) return;
    console.log('[PersonDetail] handleSaveNote called, text:', newNoteText.trim(), 'person id:', id);
    setSavingNote(true);
    try {
      const result = await apiPost('/api/notes', { person_id: id, content: newNoteText.trim() });
      console.log('[PersonDetail] Note save result:', result);
      setNewNoteText('');
      setAddingNote(false);
      await loadNotes();
    } catch (e: any) {
      console.error('[PersonDetail] Failed to save note:', e);
      Alert.alert('Could not save note', e?.message || 'Please try again.');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = (note: Note) => {
    console.log('[PersonDetail] Delete note pressed:', note.id);
    Alert.alert('Delete note?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await apiDelete(`/api/notes/${note.id}`);
            console.log('[PersonDetail] Note deleted:', note.id);
            setNotes((prev) => prev.filter((n) => n.id !== note.id));
          } catch (e) {
            console.error('[PersonDetail] Failed to delete note:', e);
          }
        },
      },
    ]);
  };

  const handleSaveReminder = async () => {
    if (!reminderText.trim()) return;
    console.log('[PersonDetail] Saving reminder for person:', id);
    setSavingReminder(true);
    try {
      await apiPost('/api/reminders', {
        person_id: id,
        text: reminderText.trim(),
        remind_at: reminderDate.toISOString(),
      });
      console.log('[PersonDetail] Reminder saved');
      setReminderText('');
      setReminderDate(new Date());
      setAddingReminder(false);
      await loadReminders();
    } catch (e: any) {
      console.error('[PersonDetail] Failed to save reminder:', e);
      Alert.alert('Could not save reminder', e?.message || 'Please try again.');
    } finally {
      setSavingReminder(false);
    }
  };

  const handleDeleteReminder = (reminder: Reminder) => {
    console.log('[PersonDetail] Delete reminder pressed:', reminder.id);
    Alert.alert('Delete reminder?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await apiDelete(`/api/reminders/${reminder.id}`);
            console.log('[PersonDetail] Reminder deleted:', reminder.id);
            setReminders((prev) => prev.filter((r) => r.id !== reminder.id));
          } catch (e) {
            console.error('[PersonDetail] Failed to delete reminder:', e);
          }
        },
      },
    ]);
  };

  const update = (key: keyof Person, value: any) => setEditData((prev) => ({ ...prev, [key]: value }));

  // ── derived ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={RED} />
      </View>
    );
  }

  if (!person) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>Person not found</Text>
      </View>
    );
  }

  const displayData = editing ? editData : person;
  const photoSource = displayData.photo_url || newPhotoUri;
  const hasPhoto = !!photoSource;
  const initials = getInitials(displayData.name || '');
  const connectionLabel = getConnectionLabel(displayData.connection_type, displayData.connection_type_custom);
  const hasPhone = !!(displayData.phone_number);
  const personName = person.name || '';
  const personFirstName = personName.split(' ')[0];
  const phoneNumber = displayData.phone_number || '';

  const ratingFields = [
    { label: 'Interest Level', key: 'interest_level' as keyof Person },
    { label: 'Attractiveness', key: 'attractiveness' as keyof Person },
    { label: 'Sexual Chemistry', key: 'sexual_chemistry' as keyof Person },
    { label: 'Overall Chemistry', key: 'overall_chemistry' as keyof Person },
    { label: 'Communication', key: 'communication' as keyof Person },
    { label: 'Consistency', key: 'consistency' as keyof Person },
    { label: 'Emotional Availability', key: 'emotional_availability' as keyof Person },
    { label: 'Date Planning', key: 'date_planning' as keyof Person },
    { label: 'Alignment', key: 'alignment' as keyof Person },
  ];

  const includedRatingFields = ratingFields.filter((f) => !excludedRatings.has(f.key));
  const ratingValues = includedRatingFields
    .map((f) => {
      const v = displayData[f.key] as number | null | undefined;
      return (v !== null && v !== undefined && !isNaN(Number(v))) ? Number(v) : null;
    })
    .filter((v): v is number => v !== null);
  const avgCompatibility = ratingValues.length > 0
    ? parseFloat((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length).toFixed(1))
    : 0;

  const reminderDateLabel = reminderDate.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  const chemistryScore = displayData.interest_level ?? displayData.overall_chemistry ?? 0;
  const chemistryStr = String(chemistryScore);

  // ── render tabs ───────────────────────────────────────────────────────────

  const renderDetailsCard = () => (
    <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20, ...CARD_SHADOW }}>
      <SectionHeader label="Details" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 0 }}>
        {[
          { label: 'Age', value: displayData.age?.toString() },
          { label: 'Birthday', value: displayData.birthday ? formatBirthdayDisplay(displayData.birthday) : undefined },
          { label: 'Zodiac', value: ZODIAC_SIGNS.find(z => z.value === displayData.zodiac)?.label },
          { label: 'Location', value: displayData.location },
          { label: 'Career', value: displayData.career || undefined },
          { label: 'Connection', value: getConnectionLabel(displayData.connection_type, displayData.connection_type_custom) || undefined },
          { label: 'Instagram', value: displayData.instagram ? `@${displayData.instagram.replace('@', '')}` : undefined },
          { label: 'TikTok', value: displayData.tiktok ? `@${displayData.tiktok.replace('@', '')}` : undefined },
          { label: 'Phone', value: displayData.phone_number || undefined },
        ].filter(f => !!f.value).map((f) => (
          <View key={f.label} style={{ width: '50%', paddingVertical: 8, paddingRight: 8 }}>
            <Text style={{ color: '#999999', fontSize: 11, marginBottom: 2 }}>{f.label}</Text>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '500' }} numberOfLines={1}>{f.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderFavoritesCard = () => {
    const favTags: { label: string; value: string | undefined }[] = [
      { label: 'Favourite Foods', value: displayData.favorite_foods?.join(', ') },
      { label: 'Hobbies', value: displayData.hobbies?.join(', ') },
      { label: 'Connection', value: displayData.connection_type_custom || undefined },
    ].filter((t) => !!t.value);
    if (favTags.length === 0) return null;
    return (
      <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20, ...CARD_SHADOW }}>
        <SectionHeader label="Favorites" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {favTags.map((t) => (
            <PillTag key={t.label} label={`${t.label}: ${t.value}`} />
          ))}
        </View>
      </View>
    );
  };

  const renderFlagsCard = () => (
    <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20, ...CARD_SHADOW }}>
      {/* Green Flags */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ color: '#2E7D32', fontSize: 14, fontWeight: '700', marginBottom: 10 }}>🟢 Green Flags</Text>
        <View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {(displayData.green_flags || []).map((flag) => (
              <PillTag key={flag} label={flag} color="#2E7D32" bg="rgba(46,125,50,0.08)" />
            ))}
            {(!displayData.green_flags || displayData.green_flags.length === 0) && (
              <Text style={{ color: colors.textTertiary, fontSize: 13 }}>None added yet</Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput
              value={addingGreenFlag}
              onChangeText={setAddingGreenFlag}
              placeholder="Add green flag..."
              placeholderTextColor="#BBBBBB"
              style={{ flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: colors.border, color: colors.text }}
            />
            <Pressable
              onPress={async () => {
                const trimmed = addingGreenFlag.trim();
                if (!trimmed) return;
                console.log('[PersonDetail] Adding green flag:', trimmed);
                const newFlags = [...(person?.green_flags ?? []), trimmed];
                setAddingGreenFlag('');
                setPerson((prev) => prev ? { ...prev, green_flags: newFlags } : prev);
                setEditData((prev) => ({ ...prev, green_flags: newFlags }));
                try {
                  const payload: Record<string, any> = {};
                  const ALLOWED = ['name','location','age','birthday','zodiac','instagram','tiktok','twitter_x','facebook','connection_type','connection_type_custom','interest_level','attractiveness','sexual_chemistry','communication','overall_chemistry','consistency','emotional_availability','date_planning','alignment','favorite_foods','hobbies','green_flags','red_flags','photo_url','career','nickname'];
                  for (const key of ALLOWED) {
                    if (key === 'zodiac' || key === 'connection_type') {
                      const val = (person as any)?.[key];
                      if (!val) continue;
                      payload[key] = val;
                      continue;
                    }
                    const val = (person as any)?.[key];
                    if (val !== undefined) payload[key] = val;
                  }
                  payload.green_flags = newFlags;
                  console.log('[PersonDetail] PUT green flag payload keys:', Object.keys(payload));
                  await apiPut(`/api/persons/${id}`, payload);
                  const raw = await apiGet<any>(`/api/persons/${id}`);
                  const refreshed = normalizePerson(raw?.person ?? raw);
                  if (refreshed?.green_flags && refreshed.green_flags.length >= newFlags.length) {
                    console.log('[PersonDetail] Backend confirmed green flags saved:', refreshed.green_flags);
                    setPerson(refreshed);
                    setEditData(refreshed);
                  } else {
                    console.log('[PersonDetail] Backend did not return flags — keeping optimistic state');
                  }
                } catch (e) {
                  console.error('[PersonDetail] Failed to add green flag:', e);
                  await loadPerson();
                }
              }}
              style={{ backgroundColor: '#2E7D32', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 }}
            >
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Add</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: colors.surfaceSecondary, marginBottom: 16 }} />

      {/* Red Flags */}
      <View>
        <Text style={{ color: '#E53935', fontSize: 14, fontWeight: '700', marginBottom: 10 }}>🔴 Red Flags</Text>
        <View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {(displayData.red_flags || []).map((flag) => (
              <PillTag key={flag} label={flag} color="#E53935" bg="rgba(229,57,53,0.08)" />
            ))}
            {(!displayData.red_flags || displayData.red_flags.length === 0) && (
              <Text style={{ color: colors.textTertiary, fontSize: 13 }}>None added yet</Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput
              value={addingRedFlag}
              onChangeText={setAddingRedFlag}
              placeholder="Add red flag..."
              placeholderTextColor="#BBBBBB"
              style={{ flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: colors.border, color: colors.text }}
            />
            <Pressable
              onPress={async () => {
                const trimmed = addingRedFlag.trim();
                if (!trimmed) return;
                console.log('[PersonDetail] Adding red flag:', trimmed);
                const newFlags = [...(person?.red_flags ?? []), trimmed];
                setAddingRedFlag('');
                setPerson((prev) => prev ? { ...prev, red_flags: newFlags } : prev);
                setEditData((prev) => ({ ...prev, red_flags: newFlags }));
                try {
                  const payload: Record<string, any> = {};
                  const ALLOWED = ['name','location','age','birthday','zodiac','instagram','tiktok','twitter_x','facebook','connection_type','connection_type_custom','interest_level','attractiveness','sexual_chemistry','communication','overall_chemistry','consistency','emotional_availability','date_planning','alignment','favorite_foods','hobbies','green_flags','red_flags','photo_url','career','nickname'];
                  for (const key of ALLOWED) {
                    if (key === 'zodiac' || key === 'connection_type') {
                      const val = (person as any)?.[key];
                      if (!val) continue;
                      payload[key] = val;
                      continue;
                    }
                    const val = (person as any)?.[key];
                    if (val !== undefined) payload[key] = val;
                  }
                  payload.red_flags = newFlags;
                  console.log('[PersonDetail] PUT red flag payload keys:', Object.keys(payload));
                  await apiPut(`/api/persons/${id}`, payload);
                  const raw = await apiGet<any>(`/api/persons/${id}`);
                  const refreshed = normalizePerson(raw?.person ?? raw);
                  if (refreshed?.red_flags && refreshed.red_flags.length >= newFlags.length) {
                    console.log('[PersonDetail] Backend confirmed red flags saved:', refreshed.red_flags);
                    setPerson(refreshed);
                    setEditData(refreshed);
                  } else {
                    console.log('[PersonDetail] Backend did not return flags — keeping optimistic state');
                  }
                } catch (e) {
                  console.error('[PersonDetail] Failed to add red flag:', e);
                  await loadPerson();
                }
              }}
              style={{ backgroundColor: '#E53935', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 }}
            >
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Add</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );

  const renderRatingsCard = () => (
    <View style={{ backgroundColor: colors.surface, borderRadius: 16, ...CARD_SHADOW, overflow: 'hidden' }}>
      <Pressable
        onPress={() => setRatingsExpanded((v) => !v)}
        style={{ padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>Ratings</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 1 }}>
            <Text style={{ color: RED, fontSize: 20, fontWeight: '800' }}>{isNaN(avgCompatibility) ? '—' : avgCompatibility}</Text>
            <Text style={{ color: RED, fontSize: 12, fontWeight: '600' }}>/10</Text>
          </View>
          <ChevronDown
            size={18}
            color="#999"
            style={{ transform: [{ rotate: ratingsExpanded ? '180deg' : '0deg' }] }}
          />
        </View>
      </Pressable>
      {ratingsExpanded && (
        <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
          <View style={{ height: 1, backgroundColor: '#EEEEEE', marginBottom: 16 }} />
          {ratingFields.map((f) => (
            <ReadOnlySlider
              key={f.key}
              label={f.label}
              value={(person?.[f.key] as number) ?? 0}
              excluded={excludedRatings.has(f.key)}
              onToggleExclude={() => setExcludedRatings((prev) => {
                const next = new Set(prev);
                if (next.has(f.key)) next.delete(f.key); else next.add(f.key);
                return next;
              })}
            />
          ))}
          <View style={{ height: 1, backgroundColor: '#EEEEEE', marginVertical: 16 }} />
          <Text style={{ color: '#999999', fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
            Overall Compatibility
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginBottom: 10 }}>
            <Text style={{ color: RED, fontSize: 36, fontWeight: '800', letterSpacing: -1 }}>{isNaN(avgCompatibility) ? '—' : avgCompatibility}</Text>
            <Text style={{ color: RED, fontSize: 18, fontWeight: '600' }}>/10</Text>
          </View>
          <View style={{ height: 6, backgroundColor: '#E8E8E8', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
            <View style={{ height: 6, width: `${(avgCompatibility / 10) * 100}%` as any, backgroundColor: RED, borderRadius: 3 }} />
          </View>
          <Text style={{ color: colors.textTertiary, fontSize: 12 }}>Based on your ratings</Text>
        </View>
      )}
    </View>
  );

  const renderOverviewTab = () => {
    const sortedDates = [...dates].sort((a, b) => {
      const da = new Date(a.date_time || a.created_at).getTime();
      const db = new Date(b.date_time || b.created_at).getTime();
      return db - da;
    });

    type TimelineItem =
      | { kind: 'date'; id: string; timestamp: number; data: DateEntry }
      | { kind: 'interaction'; id: string; timestamp: number; data: { id: string; type: string; title: string; occurred_at: string; created_at?: string } };

    const timelineItems: TimelineItem[] = [
      ...sortedDates.map((d): TimelineItem => ({
        kind: 'date',
        id: `date-${d.id}`,
        timestamp: new Date(d.date_time || d.created_at).getTime(),
        data: d,
      })),
      ...interactions.map((i): TimelineItem => ({
        kind: 'interaction',
        id: `interaction-${i.id}`,
        timestamp: new Date(i.occurred_at || i.created_at || Date.now()).getTime(),
        data: i,
      })),
    ].sort((a, b) => b.timestamp - a.timestamp);

    const timelineEmpty = timelineItems.length === 0;

    return (
      <View style={{ gap: 16 }}>
        {/* Details card */}
        {renderDetailsCard()}

        {/* Favorites card */}
        {renderFavoritesCard()}

        {/* Flags card */}
        {renderFlagsCard()}

        {/* Ratings card */}
        {renderRatingsCard()}

        {/* Red flag warning banner */}
        {(displayData.red_flags?.length ?? 0) >= 3 && (
          <View style={{ backgroundColor: '#FFF8E1', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FFB300', flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 4 }}>
            <Text style={{ fontSize: 18 }}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#E65100', fontSize: 13, fontWeight: '700', marginBottom: 2 }}>
                {displayData.red_flags!.length}
                <Text style={{ color: '#E65100', fontSize: 13, fontWeight: '700' }}> red flags noted</Text>
              </Text>
              <Text style={{ color: '#BF360C', fontSize: 12, lineHeight: 17 }}>
                Are you sure about this one? Take a moment to reflect.
              </Text>
            </View>
          </View>
        )}

        {/* What I like about them */}
        <Pressable
          onPress={() => {
            console.log('[PersonDetail] Inline edit: things_i_like tapped');
            setInlineEditValue(displayData.things_i_like ?? '');
            setInlineEditField('things_i_like');
          }}
          style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20, ...CARD_SHADOW }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', color: '#999999' }}>What I Like About Them</Text>
            <Pencil size={14} color="#BBBBBB" />
          </View>
          {displayData.things_i_like ? (
            <Text style={{ color: colors.text, fontSize: 14, lineHeight: 21, fontStyle: 'italic' }}>
              {'"'}{displayData.things_i_like}{'"'}
            </Text>
          ) : (
            <Text style={{ color: colors.textTertiary, fontSize: 14, fontStyle: 'italic' }}>
              Tap to add what you appreciate about them...
            </Text>
          )}
        </Pressable>

        {/* Status card */}
        <Pressable
          onPress={() => {
            console.log('[PersonDetail] Inline edit: dating_status tapped');
            setInlineEditValue(displayData.dating_status ?? '');
            setInlineEditField('dating_status');
          }}
          style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20, ...CARD_SHADOW }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', color: '#999999' }}>Status</Text>
            <Pencil size={14} color="#BBBBBB" />
          </View>
          {displayData.dating_status ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{
                width: 10, height: 10, borderRadius: 5,
                backgroundColor:
                  displayData.dating_status === 'talking' ? '#2196F3' :
                  displayData.dating_status === 'dating' ? '#4CAF50' :
                  displayData.dating_status === 'exclusive' ? '#9C27B0' :
                  displayData.dating_status === 'fading' ? '#9E9E9E' :
                  displayData.dating_status === 'on_hold' ? '#FF9800' : '#CCC',
              }} />
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', textTransform: 'capitalize' }}>
                {displayData.dating_status.replace('_', ' ')}
              </Text>
            </View>
          ) : (
            <Text style={{ color: colors.textTertiary, fontSize: 14, fontStyle: 'italic' }}>Tap to set a status...</Text>
          )}
        </Pressable>

        {/* Tags card */}
        <Pressable
          onPress={() => {
            console.log('[PersonDetail] Inline edit: tags tapped');
            const currentTags = (displayData.tags as string[] | undefined) ?? [];
            setInlineTags([...currentTags]);
            setInlineTagInput('');
            setInlineEditField('tags');
          }}
          style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20, ...CARD_SHADOW }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', color: '#999999' }}>Tags</Text>
            <Pencil size={14} color="#BBBBBB" />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(displayData.tags as string[] | undefined || []).map((tag, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryMuted, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>{tag}</Text>
              </View>
            ))}
            {(displayData.tags?.length ?? 0) === 0 && (
              <Text style={{ color: colors.textTertiary, fontSize: 14, fontStyle: 'italic' }}>Tap to add tags...</Text>
            )}
          </View>
        </Pressable>

        {/* Next Step card */}
        {(() => {
          const nextStepActions: { label: string; onPress: () => void }[] = [];

          // Plan a date — always available
          nextStepActions.push({
            label: '📅 Plan a date',
            onPress: () => {
              console.log('[PersonDetail] Next Step: Plan a date pressed');
              router.push({ pathname: '/date-plan', params: { personId: displayData.id, personName: displayData.name } });
            },
          });

          // Send a message — only if phone number exists
          if (displayData.phone_number) {
            nextStepActions.push({
              label: '💬 Send a message',
              onPress: () => {
                console.log('[PersonDetail] Next Step: Send a message pressed');
                Linking.openURL(`sms:${displayData.phone_number}`);
              },
            });
          }

          // Call them — only if phone number exists
          if (displayData.phone_number) {
            nextStepActions.push({
              label: '📞 Call them',
              onPress: () => {
                console.log('[PersonDetail] Next Step: Call them pressed');
                Linking.openURL(`tel:${displayData.phone_number}`);
              },
            });
          }

          // Give it space — always available, sets dating_status to 'on_hold' via API
          nextStepActions.push({
            label: '🌿 Give it space',
            onPress: async () => {
              console.log('[PersonDetail] Next Step: Give it space pressed');
              try {
                await apiPut(`/api/persons/${id}`, { dating_status: 'on_hold' });
                await loadPerson();
                Alert.alert('Done', `${personFirstName} has been set to "On Hold".`);
              } catch (e) {
                console.error('[PersonDetail] Give it space failed:', e);
                Alert.alert('Error', 'Could not update status. Try again.');
              }
            },
          });

          // Dating Coach — always available
          nextStepActions.push({
            label: '🤖 Dating Coach',
            onPress: () => {
              console.log('[PersonDetail] Next Step: Dating Coach pressed for person:', displayData.id);
              router.push({ pathname: '/coach', params: { personId: displayData.id } });
            },
          });

          // End it — always available
          nextStepActions.push({
            label: '🚪 End it',
            onPress: () => {
              console.log('[PersonDetail] Next Step: End it pressed');
              router.push({ pathname: '/bench-reason', params: { personId: displayData.id, personName: displayData.name } });
            },
          });

          return (
            <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20, ...CARD_SHADOW }}>
              <SectionHeader label="Next Step" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {nextStepActions.map((action) => (
                  <Pressable
                    key={action.label}
                    onPress={action.onPress}
                    style={{ backgroundColor: colors.surfaceSecondary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }}
                  >
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{action.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })()}

        {/* Conversation Starters card */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20, ...CARD_SHADOW }}>
          <SectionHeader label="Conversation Starters" />
          <AnimatedPressable
            onPress={async () => {
              console.log('[PersonDetail] Get Conversation Starters pressed for person:', displayData.id);
              setStartersLoading(true);
              try {
                const res = await apiPost<{ starters: string[] }>(`/api/persons/${displayData.id}/conversation-starters`, {});
                setStarters(res.starters || []);
                setStartersModalVisible(true);
              } catch (e) {
                console.error('[PersonDetail] Failed to get conversation starters:', e);
              } finally {
                setStartersLoading(false);
              }
            }}
            style={{ backgroundColor: RED, borderRadius: 12, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
          >
            {startersLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={{ fontSize: 16 }}>✨</Text>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Get Conversation Starters</Text>
              </>
            )}
          </AnimatedPressable>

          {/* Compatibility Report button */}
          <AnimatedPressable
            onPress={async () => {
              console.log('[PersonDetail] Compatibility Report pressed for person:', displayData.id);
              setCompatReportLoading(true);
              try {
                const res = await apiGet<{
                  report: {
                    overall_score: number;
                    summary: string;
                    strongest_trait: string;
                    weakest_trait: string;
                    traits?: { name: string; score: number }[];
                  }
                }>(`/api/persons/${displayData.id}/compatibility-report`);
                const report = res?.report ?? res as any;
                console.log('[PersonDetail] Compatibility report loaded, score:', report?.overall_score);
                setCompatReport(report);
                setCompatReportVisible(true);
              } catch (e) {
                console.error('[PersonDetail] Failed to get compatibility report:', e);
                Alert.alert('Error', 'Could not load compatibility report. Try again.');
              } finally {
                setCompatReportLoading(false);
              }
            }}
            style={{ backgroundColor: 'rgba(229,57,53,0.08)', borderRadius: 12, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 10 }}
          >
            {compatReportLoading ? (
              <ActivityIndicator color={RED} size="small" />
            ) : (
              <>
                <Text style={{ fontSize: 16 }}>📊</Text>
                <Text style={{ color: RED, fontSize: 14, fontWeight: '700' }}>Compatibility Report</Text>
              </>
            )}
          </AnimatedPressable>
        </View>

        {/* Photos section */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20, ...CARD_SHADOW }}>
          <SectionHeader label="Photos" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            <>
              {personPhotos.slice(0, 5).map((photo) => {
                  return (
                    <Pressable
                      key={photo.id}
                      delayLongPress={800}
                      onLongPress={() => {
                        console.log('[PersonDetail] Long press on photo:', photo.id);
                        Alert.alert('Delete Photo', 'Remove this photo?', [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                              console.log('[PersonDetail] Deleting photo:', photo.id);
                              try {
                                await apiDelete(`/api/persons/${id}/photos/${photo.id}`);
                                setPersonPhotos((prev) => prev.filter((p) => p.id !== photo.id));
                                console.log('[PersonDetail] Photo deleted:', photo.id);
                              } catch (e) {
                                console.error('[PersonDetail] Failed to delete photo:', e);
                                Alert.alert('Error', 'Could not delete photo.');
                              }
                            },
                          },
                        ]);
                      }}
                    >
                      <PhotoThumb
                        photoUrl={photo.photo_url}
                        colors={colors}
                      />
                    </Pressable>
                  );
                })}
                {personPhotos.length < 5 && (
                  <Pressable
                    disabled={uploadingPhoto}
                    onPress={async () => {
                      console.log('[PersonDetail] Add photo pressed');
                      const result = await ImagePicker.launchImageLibraryAsync({
                        mediaTypes: ['images'],
                        allowsEditing: true,
                        aspect: [1, 1],
                        quality: 0.7,
                        base64: true,
                      });
                      if (result.canceled || !result.assets?.[0]) return;
                      const asset = result.assets[0];
                      console.log('[PersonDetail] Photo selected, uploading to Cloudinary...');
                      setUploadingPhoto(true);
                      try {
                        const photoUrl = await uploadToCloudinary(asset.base64 ?? '', asset.mimeType ?? 'image/jpeg');
                        console.log('[PersonDetail] Saving Cloudinary URL to person photos');
                        // Optimistically add so the user sees it immediately
                        setPersonPhotos((prev) => [...prev, { id: Date.now().toString(), photo_url: photoUrl, sort_order: prev.length }]);
                        // Save to DB
                        const personId = Array.isArray(id) ? id[0] : id;
                        await apiPost(`/api/persons/${personId}/photos`, {
                          photo_url: photoUrl,
                          sort_order: personPhotos.length,
                        });
                        // Optimistic state is correct — DB will be read on next mount
                      } catch (e: any) {
                        console.error('[PersonDetail] Failed to upload/save photo:', e?.message || e);
                        Alert.alert('Error', 'Photo upload failed: ' + (e?.message || 'Please try again.'));
                        // Remove optimistic entry on failure
                        setPersonPhotos((prev) => prev.filter((p) => !p.id.startsWith('temp_') && p.photo_url !== ''));
                      } finally {
                        setUploadingPhoto(false);
                      }
                    }}
                    style={{
                      width: 80, height: 80, borderRadius: 12,
                      backgroundColor: colors.surfaceSecondary, borderWidth: 1.5, borderColor: colors.border,
                      borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {uploadingPhoto ? (
                      <ActivityIndicator size="small" color={colors.textTertiary} />
                    ) : (
                      <Plus size={24} color="#AAAAAA" />
                    )}
                  </Pressable>
                )}
            </>
          </ScrollView>
        </View>

        {/* Dating Timeline */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20, ...CARD_SHADOW }}>
          <SectionHeader label="Dating Timeline" />
          {loadingDates ? (
            <ActivityIndicator color={RED} style={{ marginVertical: 12 }} />
          ) : timelineEmpty ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(229,57,53,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Heart size={22} color={RED} />
              </View>
              <Text style={{ color: '#999999', fontSize: 14, textAlign: 'center' }}>No dates yet</Text>
            </View>
          ) : (
            <ScrollView
              style={{ maxHeight: 300 }}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {timelineItems.map((item, index) => {
                const isLast = index === timelineItems.length - 1;
                if (item.kind === 'date') {
                  const d = item.data;
                  const dateLabel = formatShortDate(d.date_time || d.created_at);
                  const typeLabel = d.type ? (d.type.charAt(0).toUpperCase() + d.type.slice(1)) : 'Date';
                  const ratingVal = d.rating ?? 0;
                  const ratingStr = ratingVal > 0 ? `${ratingVal}/10` : '—';
                  return (
                    <View key={item.id} style={{ flexDirection: 'row', gap: 12, marginBottom: isLast ? 0 : 16 }}>
                      <View style={{ alignItems: 'center', width: 28 }}>
                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: RED, marginTop: 4 }} />
                        {!isLast && (
                          <View style={{ width: 2, flex: 1, backgroundColor: '#EEEEEE', marginTop: 4, minHeight: 20 }} />
                        )}
                      </View>
                      <View style={{ flex: 1, paddingBottom: isLast ? 0 : 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{typeLabel}</Text>
                          <View style={{ backgroundColor: 'rgba(229,57,53,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                            <Text style={{ color: RED, fontSize: 12, fontWeight: '600' }}>{ratingStr}</Text>
                          </View>
                        </View>
                        <Text style={{ color: '#999999', fontSize: 12 }}>{dateLabel}</Text>
                        {d.location ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <MapPin size={11} color="#AAAAAA" />
                            <Text style={{ color: colors.textTertiary, fontSize: 12 }} numberOfLines={1}>{d.location}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                } else {
                  const i = item.data;
                  const interactionLabel = formatShortDate(i.occurred_at || i.created_at || '');
                  const isCall = i.type === 'call';
                  const dotColor = isCall ? '#4CAF50' : '#2196F3';
                  return (
                    <View key={item.id} style={{ flexDirection: 'row', gap: 12, marginBottom: isLast ? 0 : 16 }}>
                      <View style={{ alignItems: 'center', width: 28 }}>
                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: dotColor, marginTop: 4 }} />
                        {!isLast && (
                          <View style={{ width: 2, flex: 1, backgroundColor: '#EEEEEE', marginTop: 4, minHeight: 20 }} />
                        )}
                      </View>
                      <View style={{ flex: 1, paddingBottom: isLast ? 0 : 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          {isCall ? (
                            <Phone size={12} color={dotColor} />
                          ) : (
                            <MessageSquare size={12} color={dotColor} />
                          )}
                          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{i.title}</Text>
                        </View>
                        <Text style={{ color: '#999999', fontSize: 12 }}>{interactionLabel}</Text>
                      </View>
                    </View>
                  );
                }
              })}
            </ScrollView>
          )}
        </View>

        {/* Delete / Bench row */}
        <View style={{ paddingTop: 12, paddingBottom: 8, gap: 10, paddingHorizontal: 16 }}>
          <AnimatedPressable
            onPress={handleDelete}
            style={{
              width: '100%', height: 48, borderRadius: 14,
              backgroundColor: RED,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Trash2 size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Delete</Text>
          </AnimatedPressable>
          {!editing && !person.is_benched && (
            <AnimatedPressable
              onPress={handleBench}
              style={{
                height: 48, borderRadius: 14,
                borderWidth: 1.5, borderColor: '#FF9800',
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Users size={16} color="#FF9800" />
              <Text style={{ color: '#FF9800', fontSize: 15, fontWeight: '600' }}>Move to Bench</Text>
            </AnimatedPressable>
          )}
        </View>
      </View>
    );
  };

  const renderDatesTab = () => {
    // Sort oldest first for timeline
    const sortedDates = [...dates].sort((a, b) => {
      const da = new Date(a.date_time || a.created_at).getTime();
      const db = new Date(b.date_time || b.created_at).getTime();
      return da - db;
    });

    return (
      <View style={{ gap: 12, paddingBottom: 80 }}>
        {loadingDates ? (
          <ActivityIndicator color={RED} style={{ marginVertical: 20 }} />
        ) : sortedDates.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(229,57,53,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Heart size={24} color={RED} />
            </View>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 6 }}>No dates yet</Text>
            <Text style={{ color: '#999999', fontSize: 14, textAlign: 'center' }}>Log your first date below</Text>
          </View>
        ) : (
          <View style={{ paddingLeft: 8 }}>
            {sortedDates.map((d, index) => {
              const isLast = index === sortedDates.length - 1;
              const typeLabel = d.type ? (d.type.charAt(0).toUpperCase() + d.type.slice(1)) : 'Date';
              const dateTimeStr = formatDateTimeLabel(d.date_time || d.created_at);
              const overallVal = d.rating ?? 0;
              const overallStr = String(overallVal);
              const hasRating = !!d.rating;
              const wentWellSnippet = d.went_well ? d.went_well.slice(0, 60) + (d.went_well.length > 60 ? '…' : '') : null;

              return (
                <View key={d.id} style={{ flexDirection: 'row', gap: 12 }}>
                  {/* Timeline left column */}
                  <View style={{ alignItems: 'center', width: 20 }}>
                    <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: RED, marginTop: 16, borderWidth: 2, borderColor: '#fff', shadowColor: RED, shadowOpacity: 0.4, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 }} />
                    {!isLast && (
                      <View style={{ width: 2, flex: 1, backgroundColor: '#EEEEEE', marginTop: 4, minHeight: 40 }} />
                    )}
                  </View>

                  {/* Card */}
                  <View style={{ flex: 1, marginBottom: isLast ? 0 : 16 }}>
                    <Pressable
                      onPress={() => {
                        console.log('[PersonDetail] Date timeline entry tapped, navigating to review:', d.id);
                        router.push({ pathname: '/date-review', params: { dateId: d.id, personName: person?.name ?? '', personPhoto: person?.photo_url ?? '' } });
                      }}
                    >
                      <View style={{ backgroundColor: colors.surface, borderRadius: 14, padding: 14, ...CARD_SHADOW }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>{typeLabel}</Text>
                          {hasRating ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Text style={{ fontSize: 13 }}>⭐</Text>
                              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{overallStr}</Text>
                            </View>
                          ) : (
                            <Text style={{ color: '#CCCCCC', fontSize: 12 }}>No rating yet</Text>
                          )}
                        </View>
                        <Text style={{ color: '#999999', fontSize: 12, marginBottom: d.location || wentWellSnippet ? 6 : 0 }}>{dateTimeStr}</Text>
                        {d.location ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: wentWellSnippet ? 4 : 0 }}>
                            <MapPin size={11} color="#AAAAAA" />
                            <Text style={{ color: colors.textTertiary, fontSize: 12 }} numberOfLines={1}>{d.location}</Text>
                          </View>
                        ) : null}
                        {wentWellSnippet ? (
                          <Text style={{ color: '#4CAF50', fontSize: 12, fontStyle: 'italic' }} numberOfLines={2}>{wentWellSnippet}</Text>
                        ) : null}
                      </View>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Log New Date sticky button */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <Pressable
            onPress={() => {
              console.log('[PersonDetail] Log New Date button pressed');
              setShowLogDateModal(true);
            }}
            style={{
              backgroundColor: RED, borderRadius: 14, height: 52,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '400', lineHeight: 22 }}>⊕</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}>Log New Date</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderNotesTab = () => (
    <View style={{ gap: 12 }}>
      {loadingNotes ? (
        <ActivityIndicator color={RED} style={{ marginVertical: 20 }} />
      ) : notes.length === 0 && !addingNote ? (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(229,57,53,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Star size={24} color={RED} />
          </View>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 6 }}>No notes yet</Text>
          <Text style={{ color: '#999999', fontSize: 14, textAlign: 'center' }}>Add notes to remember important details</Text>
        </View>
      ) : (
        notes.map((note) => (
          <View key={note.id} style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, ...CARD_SHADOW }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <Text style={{ color: '#999999', fontSize: 12 }}>{formatTimestamp(note.created_at)}</Text>
              <AnimatedPressable onPress={() => handleDeleteNote(note)}>
                <XIcon size={16} color="#CCCCCC" />
              </AnimatedPressable>
            </View>
            <Text style={{ color: colors.text, fontSize: 14, lineHeight: 21 }}>{note.content || ''}</Text>
          </View>
        ))
      )}

      {addingNote && (
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, ...CARD_SHADOW }}>
          <TextInput
            value={newNoteText}
            onChangeText={setNewNoteText}
            placeholder="Write a note..."
            placeholderTextColor="#BBBBBB"
            multiline
            autoFocus
            style={{
              backgroundColor: colors.surfaceSecondary, borderRadius: 12, padding: 14,
              color: colors.text, fontSize: 14, borderWidth: 1, borderColor: colors.border,
              minHeight: 100, textAlignVertical: 'top', marginBottom: 12,
            }}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <AnimatedPressable onPress={() => { setAddingNote(false); setNewNoteText(''); }} style={{ flex: 1 }}>
              <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>Cancel</Text>
              </View>
            </AnimatedPressable>
            <AnimatedPressable onPress={handleSaveNote} disabled={!newNoteText.trim() || savingNote} style={{ flex: 1 }}>
              <View style={{ backgroundColor: newNoteText.trim() ? RED : '#F5F5F5', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center' }}>
                {savingNote ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: newNoteText.trim() ? '#fff' : '#BBBBBB', fontSize: 14, fontWeight: '600' }}>Save note</Text>
                )}
              </View>
            </AnimatedPressable>
          </View>
        </View>
      )}

      {!addingNote && (
        <AnimatedPressable onPress={() => {
          console.log('[PersonDetail] Add Note button pressed');
          setAddingNote(true);
        }}>
          <View style={{
            backgroundColor: RED, borderRadius: 14, height: 52,
            alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
          }}>
            <Plus size={18} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Add Note</Text>
          </View>
        </AnimatedPressable>
      )}
    </View>
  );

  const renderRemindersTab = () => (
    <View style={{ gap: 12 }}>
      {loadingReminders ? (
        <ActivityIndicator color={RED} style={{ marginVertical: 20 }} />
      ) : reminders.length === 0 && !addingReminder ? (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(229,57,53,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Bell size={24} color={RED} />
          </View>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 6 }}>No reminders yet</Text>
          <Text style={{ color: '#999999', fontSize: 14, textAlign: 'center' }}>Set reminders to stay on top of things</Text>
        </View>
      ) : (
        reminders.map((reminder) => (
          <View key={reminder.id} style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, ...CARD_SHADOW, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(229,57,53,0.08)', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={18} color={RED} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '500', marginBottom: 3 }}>{reminder.text}</Text>
              <Text style={{ color: '#999999', fontSize: 12 }}>{formatFullDate(reminder.remind_at)}</Text>
            </View>
            <AnimatedPressable onPress={() => handleDeleteReminder(reminder)}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={15} color="#CCCCCC" />
              </View>
            </AnimatedPressable>
          </View>
        ))
      )}

      {addingReminder && (
        <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, ...CARD_SHADOW }}>
          <Text style={{ color: '#999999', fontSize: 12, fontWeight: '600', marginBottom: 8 }}>Reminder text</Text>
          <TextInput
            value={reminderText}
            onChangeText={setReminderText}
            placeholder="e.g. Follow up after date"
            placeholderTextColor="#BBBBBB"
            autoFocus
            style={{
              backgroundColor: colors.surfaceSecondary, borderRadius: 12, padding: 14,
              color: colors.text, fontSize: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 14,
            }}
          />
          <Text style={{ color: '#999999', fontSize: 12, fontWeight: '600', marginBottom: 8 }}>When</Text>
          <AnimatedPressable onPress={() => {
            console.log('[PersonDetail] Reminder date picker opened');
            setShowReminderDatePicker(true);
          }}>
            <View style={{
              backgroundColor: colors.surfaceSecondary, borderRadius: 12, padding: 14,
              borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
            }}>
              <Calendar size={16} color={RED} />
              <Text style={{ color: colors.text, fontSize: 14 }}>{reminderDateLabel}</Text>
            </View>
          </AnimatedPressable>
          {showReminderDatePicker && (
            <DateTimePicker
              value={reminderDate}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => {
                setShowReminderDatePicker(false);
                if (d) {
                  console.log('[PersonDetail] Reminder date selected:', d);
                  setReminderDate(d);
                }
              }}
              minimumDate={new Date()}
            />
          )}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <AnimatedPressable onPress={() => { setAddingReminder(false); setReminderText(''); }} style={{ flex: 1 }}>
              <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '600' }}>Cancel</Text>
              </View>
            </AnimatedPressable>
            <AnimatedPressable onPress={handleSaveReminder} disabled={!reminderText.trim() || savingReminder} style={{ flex: 1 }}>
              <View style={{ backgroundColor: reminderText.trim() ? RED : '#F5F5F5', borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}>
                {savingReminder ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: reminderText.trim() ? '#fff' : '#BBBBBB', fontSize: 14, fontWeight: '600' }}>Save reminder</Text>
                )}
              </View>
            </AnimatedPressable>
          </View>
        </View>
      )}

      {!addingReminder && (
        <AnimatedPressable onPress={() => {
          console.log('[PersonDetail] Add Reminder button pressed');
          setAddingReminder(true);
        }}>
          <View style={{
            backgroundColor: RED, borderRadius: 14, height: 52,
            alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
          }}>
            <Plus size={18} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Add Reminder</Text>
          </View>
        </AnimatedPressable>
      )}
    </View>
  );

  // ── main render ───────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Stack.Screen
        options={{
          title: 'Roster Details',
          headerBackVisible: false,
          gestureEnabled: false,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: '#1A1A1A',
          headerTitleStyle: { fontWeight: '600', fontSize: 17 },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={() => {
                if (editing) {
                  Alert.alert(
                    'Unsaved Changes',
                    'Do you want to save your changes?',
                    [
                      {
                        text: 'Discard',
                        style: 'destructive',
                        onPress: () => router.back(),
                      },
                      {
                        text: 'Save',
                        onPress: () => handleSave(),
                      },
                    ]
                  );
                } else {
                  router.back();
                }
              }}
              style={{ paddingLeft: 4, paddingRight: 12, paddingVertical: 4 }}
              hitSlop={8}
            >
              <XIcon size={22} color="#1A1A1A" />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              onPress={() => {
                if (editing) {
                  console.log('[Person] Header Save pressed');
                  handleSave();
                } else {
                  console.log('[Person] Header Edit pressed');
                  handleEdit();
                }
              }}
              style={{ paddingHorizontal: 8, paddingVertical: 4 }}
            >
              {saving ? (
                <ActivityIndicator color="#1A1A1A" size="small" />
              ) : editing ? (
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>Save</Text>
              ) : (
                <Pencil size={20} color="#1A1A1A" />
              )}
            </Pressable>
          ),
        }}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ paddingBottom: editing ? insets.bottom + 32 : 8 }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={editing ? [] : [1]}
      >
        {/* child 0: all above-tab content wrapped in one View */}
        <View>
        {/* ── Profile Card ─────────────────────────────────────────────────── */}
        <View style={{
          backgroundColor: colors.surface,
          marginHorizontal: 16, marginTop: 0,
          borderRadius: 16,
          overflow: 'hidden',
          ...CARD_SHADOW,
        }}>
          {/* Full-width photo */}
          <View style={{ width: '100%', height: 220, borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' }}>
            {hasPhoto && resolveImageSource(photoSource) ? (
              <Image
                source={resolveImageSource(photoSource)!}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <View style={{ width: '100%', height: 220, backgroundColor: RED, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 48, fontWeight: '700', color: '#fff' }}>{initials}</Text>
              </View>
            )}
            {editing && (
              <Pressable
                onPress={pickPhoto}
                style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.45)',
                  alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Ionicons name="camera-outline" size={28} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Change photo</Text>
              </Pressable>
            )}
          </View>

          {/* Card content below image */}
          <View style={{ padding: 20 }}>

          {/* Name */}
          {editing ? (
            <TextInput
              value={editData.name || ''}
              onChangeText={(v) => update('name', v)}
              style={{
                color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center',
                backgroundColor: colors.surfaceSecondary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
                borderWidth: 1, borderColor: colors.border, marginBottom: 10, alignSelf: 'center', minWidth: 200,
              }}
            />
          ) : (
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 10 }}>
              {displayData.name}
            </Text>
          )}

          {/* Pill tags row */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
            {connectionLabel ? <PillTag label={connectionLabel} /> : null}
            {chemistryScore > 0 ? (
              <PillTag label={`${chemistryStr} ⚡ Chemistry`} />
            ) : null}
          </View>

          {/* Compatibility sub-card */}
          <View style={{
            borderWidth: 1, borderColor: '#EEEEEE', borderRadius: 12,
            padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 14,
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700', marginBottom: 3 }}>Compatibility Score</Text>
              <Text style={{ color: '#999999', fontSize: 11 }}>Based on your ratings</Text>
            </View>
            <CompatibilityRing score={avgCompatibility} />
          </View>

          {/* Social buttons row */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* Call */}
            <Pressable
              onPress={() => {
                console.log('[PersonDetail] Call button pressed');
                if (hasPhone) setShowCallModal(true);
              }}
              disabled={!hasPhone}
              style={{
                flex: 1, height: 36, borderRadius: 20,
                borderWidth: 1, borderColor: '#EEEEEE',
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              <Ionicons name="call-outline" size={14} color={hasPhone ? '#1A1A1A' : '#CCCCCC'} />
              <Text style={{ color: hasPhone ? '#1A1A1A' : '#CCCCCC', fontSize: 12, fontWeight: '500' }}>Call</Text>
            </Pressable>

            {/* Text */}
            <Pressable
              onPress={() => {
                console.log('[PersonDetail] Text button pressed');
                if (hasPhone) setShowTextModal(true);
              }}
              disabled={!hasPhone}
              style={{
                flex: 1, height: 36, borderRadius: 20,
                borderWidth: 1, borderColor: '#EEEEEE',
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}
            >
              <Ionicons name="chatbubble-outline" size={14} color={hasPhone ? '#1A1A1A' : '#CCCCCC'} />
              <Text style={{ color: hasPhone ? '#1A1A1A' : '#CCCCCC', fontSize: 12, fontWeight: '500' }}>Text</Text>
            </Pressable>

            {/* Insta */}
            <Pressable
              onPress={() => {
                console.log('[PersonDetail] Instagram button pressed:', displayData.instagram);
                if (displayData.instagram) openLink(`https://instagram.com/${displayData.instagram}`);
              }}
              style={{
                flex: 1, height: 36, borderRadius: 20,
                borderWidth: 1, borderColor: '#EEEEEE',
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
                opacity: displayData.instagram ? 1 : 0.4,
              }}
            >
              <FontAwesome name="instagram" size={14} color="#1A1A1A" />
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '500' }}>Insta</Text>
            </Pressable>

            {/* TikTok */}
            <Pressable
              onPress={() => {
                console.log('[PersonDetail] TikTok button pressed:', displayData.tiktok);
                if (displayData.tiktok) openLink(`https://tiktok.com/@${displayData.tiktok}`);
              }}
              style={{
                flex: 1, height: 36, borderRadius: 20,
                borderWidth: 1, borderColor: '#EEEEEE',
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
                opacity: displayData.tiktok ? 1 : 0.4,
              }}
            >
              <FontAwesome name="music" size={13} color="#1A1A1A" />
              <Text style={{ color: colors.text, fontSize: 12, fontWeight: '500' }}>TikTok</Text>
            </Pressable>
          </View>
          </View>{/* end card content padding */}
        </View>



        {/* Details (edit mode) — shown here so it's first when editing */}
        {editing && (
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginHorizontal: 16, marginTop: 14, ...CARD_SHADOW }}>
            <SectionHeader label="Details" />
            <View style={{ gap: 12 }}>
              <View>
                <Text style={{ color: '#999999', fontSize: 12, marginBottom: 4 }}>Nickname</Text>
                <TextInput
                  value={editData.nickname || ''}
                  onChangeText={(v) => update('nickname', v)}
                  placeholder="Nickname"
                  placeholderTextColor="#BBBBBB"
                  style={{ backgroundColor: colors.surfaceSecondary, borderRadius: 10, padding: 10, color: colors.text, fontSize: 14, borderWidth: 1, borderColor: colors.border }}
                />
              </View>
              <View>
                <Text style={{ color: '#999999', fontSize: 12, marginBottom: 4 }}>Location</Text>
                <AddressAutocomplete
                  value={editData.location || ''}
                  onChangeText={(v) => update('location', v)}
                  onSelect={(v) => {
                    console.log('[PersonDetail] Location selected:', v);
                    update('location', v);
                  }}
                  placeholder="City or neighborhood"
                />
              </View>
              <View>
                <Text style={{ color: '#999999', fontSize: 12, marginBottom: 4 }}>Career</Text>
                <TextInput
                  value={editData.career || ''}
                  onChangeText={(v) => update('career', v)}
                  placeholder="e.g. Software Engineer, Teacher..."
                  placeholderTextColor="#BBBBBB"
                  style={{ backgroundColor: colors.surfaceSecondary, borderRadius: 10, padding: 10, color: colors.text, fontSize: 14, borderWidth: 1, borderColor: colors.border }}
                />
              </View>
              <View>
                <Text style={{ color: '#999999', fontSize: 12, marginBottom: 4 }}>Age</Text>
                <TextInput
                  value={editData.age?.toString() || ''}
                  onChangeText={(v) => update('age', v ? parseInt(v, 10) : undefined)}
                  keyboardType="numeric"
                  placeholder="Age"
                  placeholderTextColor="#BBBBBB"
                  style={{ backgroundColor: colors.surfaceSecondary, borderRadius: 10, padding: 10, color: colors.text, fontSize: 14, borderWidth: 1, borderColor: colors.border }}
                />
              </View>
              <View>
                <Text style={{ color: '#999999', fontSize: 12, marginBottom: 4 }}>Birthday</Text>
                <BirthdayPicker
                  value={editData.birthday || ''}
                  onChange={(v) => {
                    console.log('[PersonDetail] Birthday selected:', v);
                    update('birthday', v);
                    const computed = getZodiacFromBirthday(v);
                    if (computed) {
                      console.log('[PersonDetail] Auto-setting zodiac from birthday:', computed);
                      update('zodiac', computed);
                    }
                  }}
                />
              </View>
              <View>
                <Text style={{ color: '#999999', fontSize: 12, marginBottom: 6 }}>Zodiac</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {ZODIAC_SIGNS.map((z) => (
                      <Pressable
                        key={z.value}
                        onPress={() => update('zodiac', z.value)}
                        style={{
                          paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14,
                          backgroundColor: editData.zodiac === z.value ? 'rgba(229,57,53,0.1)' : '#F5F5F5',
                          borderWidth: 1,
                          borderColor: editData.zodiac === z.value ? RED : '#E0E0E0',
                        }}
                      >
                        <Text style={{ color: editData.zodiac === z.value ? RED : '#666666', fontSize: 11 }}>{z.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
              <View>
                <Text style={{ color: '#999999', fontSize: 12, marginBottom: 6 }}>Connection Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {CONNECTION_TYPES.map((ct) => (
                      <Pressable
                        key={ct.value}
                        onPress={() => update('connection_type', ct.value)}
                        style={{
                          paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16,
                          backgroundColor: editData.connection_type === ct.value ? RED : '#F5F5F5',
                          borderWidth: 1,
                          borderColor: editData.connection_type === ct.value ? RED : '#E0E0E0',
                        }}
                      >
                        <Text style={{ color: editData.connection_type === ct.value ? '#fff' : '#666666', fontSize: 12 }}>
                          {ct.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
              {[
                { label: 'Phone Number', key: 'phone_number' as keyof Person, keyboard: 'phone-pad' as const },
                { label: 'Instagram', key: 'instagram' as keyof Person, keyboard: 'default' as const },
                { label: 'TikTok', key: 'tiktok' as keyof Person, keyboard: 'default' as const },
                { label: 'Facebook', key: 'facebook' as keyof Person, keyboard: 'default' as const },
                { label: 'X / Twitter', key: 'twitter_x' as keyof Person, keyboard: 'default' as const },
              ].map((field) => (
                <View key={field.key}>
                  <Text style={{ color: '#999999', fontSize: 12, marginBottom: 4 }}>{field.label}</Text>
                  <TextInput
                    value={(editData[field.key] as string) || ''}
                    onChangeText={(v) => update(field.key, v)}
                    placeholder={field.label}
                    placeholderTextColor="#BBBBBB"
                    keyboardType={field.keyboard}
                    autoCapitalize="none"
                    style={{ backgroundColor: colors.surfaceSecondary, borderRadius: 10, padding: 10, color: colors.text, fontSize: 14, borderWidth: 1, borderColor: colors.border }}
                  />
                </View>
              ))}
            </View>
          </View>
        )}



        {/* ── Ratings (edit mode only) ─────────────────────────────────── */}
        {editing && (
          <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
            <View style={{ backgroundColor: colors.surface, borderRadius: 16, ...CARD_SHADOW, overflow: 'hidden' }}>
              <Pressable
                style={{ padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>Ratings</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 1 }}>
                  <Text style={{ color: RED, fontSize: 20, fontWeight: '800' }}>{isNaN(avgCompatibility) ? '—' : avgCompatibility}</Text>
                  <Text style={{ color: RED, fontSize: 12, fontWeight: '600' }}>/10</Text>
                </View>
              </Pressable>
              <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                <View style={{ height: 1, backgroundColor: '#EEEEEE', marginBottom: 16 }} />
                {ratingFields.map((f) => (
                  <EditableSlider
                    key={f.key}
                    label={f.label}
                    value={editData[f.key] as number}
                    onChange={(v) => update(f.key, v)}
                    excluded={excludedRatings.has(f.key)}
                    onToggleExclude={() => setExcludedRatings((prev) => {
                      const next = new Set(prev);
                      if (next.has(f.key)) next.delete(f.key); else next.add(f.key);
                      return next;
                    })}
                  />
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ── What I Like About Them (edit mode only) ──────────────────── */}
        {editing && (
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginHorizontal: 16, marginTop: 14, ...CARD_SHADOW }}>
            <SectionHeader label="What I Like About Them" />
            <TextInput
              value={(editData.things_i_like as string) || ''}
              onChangeText={(v) => {
                console.log('[PersonDetail] things_i_like updated');
                update('things_i_like' as keyof Person, v);
              }}
              placeholder="What do you genuinely appreciate about this person?"
              placeholderTextColor="#BBBBBB"
              multiline
              style={{
                backgroundColor: colors.surfaceSecondary, borderRadius: 12, padding: 14,
                color: colors.text, fontSize: 14, borderWidth: 1, borderColor: colors.border,
                minHeight: 80, textAlignVertical: 'top',
              }}
            />
          </View>
        )}

        {/* ── Status (edit mode only) ──────────────────────────────────── */}
        {editing && (
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginHorizontal: 16, marginTop: 14, ...CARD_SHADOW }}>
            <SectionHeader label="Status" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { value: 'talking', label: 'Talking', color: '#2196F3' },
                { value: 'dating', label: 'Dating', color: '#4CAF50' },
                { value: 'exclusive', label: 'Exclusive', color: '#9C27B0' },
                { value: 'fading', label: 'Fading', color: '#9E9E9E' },
                { value: 'on_hold', label: 'On Hold', color: '#FF9800' },
              ].map((s) => {
                const selected = (editData.dating_status as string) === s.value;
                return (
                  <Pressable
                    key={s.value}
                    onPress={() => {
                      console.log('[PersonDetail] Dating status selected:', s.value);
                      update('dating_status' as keyof Person, selected ? '' : s.value);
                    }}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                      backgroundColor: selected ? s.color : colors.surfaceSecondary,
                      borderWidth: 1.5, borderColor: selected ? s.color : colors.border,
                    }}
                  >
                    <Text style={{ color: selected ? '#fff' : colors.textSecondary, fontSize: 13, fontWeight: '600' }}>{s.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Tags (edit mode only) ────────────────────────────────────── */}
        {editing && (
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginHorizontal: 16, marginTop: 14, ...CARD_SHADOW }}>
            <SectionHeader label="Tags" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {((editData.tags as string[] | undefined) || []).map((tag, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryMuted, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, gap: 6 }}>
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>{tag}</Text>
                  <Pressable onPress={() => {
                    console.log('[PersonDetail] Tag removed at index:', i);
                    const current = (editData.tags as string[]) || [];
                    update('tags' as keyof Person, current.filter((_, idx) => idx !== i));
                  }}>
                    <Text style={{ color: '#9E9E9E', fontSize: 14 }}>×</Text>
                  </Pressable>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={newTag}
                onChangeText={setNewTag}
                placeholder="Add a tag (e.g. Met on Hinge)"
                placeholderTextColor="#BBBBBB"
                style={{ flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, borderWidth: 1, borderColor: colors.border, color: colors.text }}
                onSubmitEditing={() => {
                  if (newTag.trim()) {
                    console.log('[PersonDetail] Tag added via submit:', newTag.trim());
                    const current = (editData.tags as string[]) || [];
                    update('tags' as keyof Person, [...current, newTag.trim()]);
                    setNewTag('');
                  }
                }}
                returnKeyType="done"
              />
              <Pressable
                onPress={() => {
                  if (newTag.trim()) {
                    console.log('[PersonDetail] Tag added via button:', newTag.trim());
                    const current = (editData.tags as string[]) || [];
                    update('tags' as keyof Person, [...current, newTag.trim()]);
                    setNewTag('');
                  }
                }}
                style={{ backgroundColor: RED, borderRadius: 10, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Add</Text>
              </Pressable>
            </View>
          </View>
        )}

        </View>{/* end child 0 wrapper */}

        {/* child 1: tab bar — sticks at top when scrolled */}
        {!editing && (
          <View style={{ backgroundColor: colors.background, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 }}>
            <View style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 6,
              flexDirection: 'row',
              shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12,
              shadowOffset: { width: 0, height: 2 }, elevation: 3,
            }}>
              {TABS.map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <Pressable
                    key={tab}
                    onPress={() => {
                      console.log('[PersonDetail] Tab selected:', tab);
                      setActiveTab(tab);
                    }}
                    style={{
                      flex: 1, height: 44, borderRadius: 20,
                      backgroundColor: isActive ? RED : 'transparent',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Text style={{
                      color: isActive ? '#FFFFFF' : colors.textSecondary,
                      fontSize: 14, fontWeight: isActive ? '600' : '400',
                    }}>
                      {tab}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* child 2: tab content */}
        {!editing && (
          <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 }}>
            {activeTab === 'Overview' && renderOverviewTab()}
            {activeTab === 'Dates' && renderDatesTab()}
            {activeTab === 'Notes' && renderNotesTab()}
            {activeTab === 'Reminders' && renderRemindersTab()}
          </View>
        )}

      </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Inline Edit Modal ───────────────────────────────────────────────── */}
      <Modal
        visible={inlineEditField !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setInlineEditField(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => setInlineEditField(null)}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable
            onPress={() => {}}
            style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}
          >
            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>
                {inlineEditField === 'things_i_like' ? 'What I Like About Them' :
                 inlineEditField === 'dating_status' ? 'Status' :
                 inlineEditField === 'tags' ? 'Tags' : ''}
              </Text>
              <Pressable onPress={() => setInlineEditField(null)}>
                <Text style={{ color: RED, fontSize: 14, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
            </View>

            {/* things_i_like */}
            {inlineEditField === 'things_i_like' && (
              <View>
                <TextInput
                  value={inlineEditValue}
                  onChangeText={setInlineEditValue}
                  multiline
                  numberOfLines={4}
                  placeholder="What do you appreciate about them?"
                  placeholderTextColor={colors.textTertiary}
                  style={{
                    backgroundColor: colors.surfaceSecondary,
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 14,
                    color: colors.text,
                    minHeight: 100,
                    textAlignVertical: 'top',
                    marginBottom: 16,
                  }}
                />
                <Pressable
                  disabled={inlineSaving}
                  onPress={async () => {
                    console.log('[PersonDetail] Inline save things_i_like:', inlineEditValue.slice(0, 40));
                    setInlineSaving(true);
                    try {
                      await apiPut(`/api/persons/${id}`, { things_i_like: inlineEditValue });
                      setPerson((prev) => prev ? { ...prev, things_i_like: inlineEditValue } : prev);
                      setInlineEditField(null);
                    } catch (e: any) {
                      console.error('[PersonDetail] Inline save things_i_like failed:', e);
                      Alert.alert('Error', e?.message || 'Could not save. Try again.');
                    } finally {
                      setInlineSaving(false);
                    }
                  }}
                  style={{ backgroundColor: RED, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                >
                  {inlineSaving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Save</Text>
                  )}
                </Pressable>
              </View>
            )}

            {/* dating_status */}
            {inlineEditField === 'dating_status' && (
              <View style={{ gap: 10 }}>
                {(['talking', 'dating', 'exclusive', 'fading', 'on_hold'] as const).map((status) => {
                  const dotColor =
                    status === 'talking' ? '#2196F3' :
                    status === 'dating' ? '#4CAF50' :
                    status === 'exclusive' ? '#9C27B0' :
                    status === 'fading' ? '#9E9E9E' :
                    '#FF9800';
                  const isSelected = inlineEditValue === status;
                  const statusLabel = status.replace('_', ' ');
                  return (
                    <Pressable
                      key={status}
                      disabled={inlineSaving}
                      onPress={async () => {
                        console.log('[PersonDetail] Inline save dating_status:', status);
                        setInlineSaving(true);
                        try {
                          await apiPut(`/api/persons/${id}`, { dating_status: status });
                          setPerson((prev) => prev ? { ...prev, dating_status: status } : prev);
                          setInlineEditField(null);
                        } catch (e: any) {
                          console.error('[PersonDetail] Inline save dating_status failed:', e);
                          Alert.alert('Error', e?.message || 'Could not save. Try again.');
                        } finally {
                          setInlineSaving(false);
                        }
                      }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        backgroundColor: isSelected ? colors.primaryMuted : colors.surfaceSecondary,
                        borderRadius: 12,
                        padding: 14,
                        borderWidth: isSelected ? 1.5 : 0,
                        borderColor: isSelected ? colors.primary : 'transparent',
                      }}
                    >
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: dotColor }} />
                      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', textTransform: 'capitalize', flex: 1 }}>{statusLabel}</Text>
                      {isSelected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* tags */}
            {inlineEditField === 'tags' && (
              <View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {inlineTags.map((tag, i) => (
                    <Pressable
                      key={i}
                      onPress={() => {
                        console.log('[PersonDetail] Removing inline tag:', tag);
                        setInlineTags((prev) => prev.filter((_, idx) => idx !== i));
                      }}
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryMuted, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, gap: 6 }}
                    >
                      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>{tag}</Text>
                      <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>×</Text>
                    </Pressable>
                  ))}
                  {inlineTags.length === 0 && (
                    <Text style={{ color: colors.textTertiary, fontSize: 13, fontStyle: 'italic' }}>No tags yet</Text>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  <TextInput
                    value={inlineTagInput}
                    onChangeText={setInlineTagInput}
                    placeholder="Add a tag..."
                    placeholderTextColor={colors.textTertiary}
                    style={{
                      flex: 1,
                      backgroundColor: colors.surfaceSecondary,
                      borderRadius: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      fontSize: 14,
                      color: colors.text,
                    }}
                    onSubmitEditing={() => {
                      const trimmed = inlineTagInput.trim();
                      if (trimmed && !inlineTags.includes(trimmed)) {
                        setInlineTags((prev) => [...prev, trimmed]);
                      }
                      setInlineTagInput('');
                    }}
                  />
                  <Pressable
                    onPress={() => {
                      const trimmed = inlineTagInput.trim();
                      if (trimmed && !inlineTags.includes(trimmed)) {
                        console.log('[PersonDetail] Adding inline tag:', trimmed);
                        setInlineTags((prev) => [...prev, trimmed]);
                      }
                      setInlineTagInput('');
                    }}
                    style={{ backgroundColor: RED, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Add</Text>
                  </Pressable>
                </View>
                <Pressable
                  disabled={inlineSaving}
                  onPress={async () => {
                    console.log('[PersonDetail] Inline save tags:', inlineTags);
                    setInlineSaving(true);
                    try {
                      await apiPut(`/api/persons/${id}`, { tags: inlineTags });
                      setPerson((prev) => prev ? { ...prev, tags: inlineTags } : prev);
                      setInlineEditField(null);
                    } catch (e: any) {
                      console.error('[PersonDetail] Inline save tags failed:', e);
                      Alert.alert('Error', e?.message || 'Could not save. Try again.');
                    } finally {
                      setInlineSaving(false);
                    }
                  }}
                  style={{ backgroundColor: RED, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
                >
                  {inlineSaving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Save</Text>
                  )}
                </Pressable>
              </View>
            )}
          </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* ── Conversation Starters Modal ─────────────────────────────────────── */}
      <Modal visible={startersModalVisible} transparent animationType="slide" onRequestClose={() => setStartersModalVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setStartersModalVisible(false)}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 16 }}>✨ Conversation Starters</Text>
            <View style={{ gap: 12 }}>
              {starters.map((s, i) => (
                <Pressable
                  key={i}
                  onPress={() => {
                    console.log('[PersonDetail] Conversation starter tapped:', s.slice(0, 40));
                    const hasPhone = !!(displayData.phone_number);
                    if (hasPhone) {
                      Alert.alert(
                        'Send as Text?',
                        s,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Send Text',
                            onPress: () => {
                              console.log('[PersonDetail] Opening SMS for starter');
                              Linking.openURL('sms:' + (displayData.phone_number ?? ''));
                            },
                          },
                        ]
                      );
                    } else {
                      Alert.alert(
                        'Send as Text?',
                        'Copy this to send manually:\n\n' + s,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Copy',
                            onPress: () => {
                              console.log('[PersonDetail] Copying starter to clipboard');
                              Clipboard.setStringAsync(s);
                            },
                          },
                        ]
                      );
                    }
                  }}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? colors.surfaceSecondary : colors.surfaceSecondary,
                    borderRadius: 12,
                    padding: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20, flex: 1 }}>{s}</Text>
                  <Text style={{ color: '#BBBBBB', fontSize: 16, marginLeft: 8 }}>›</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={() => {
                console.log('[PersonDetail] Conversation starters modal closed');
                setStartersModalVisible(false);
              }}
              style={{ marginTop: 20, backgroundColor: RED, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Done</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* ── Compatibility Report Modal ──────────────────────────────────────── */}
      <Modal visible={compatReportVisible} transparent animationType="slide" onRequestClose={() => setCompatReportVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} onPress={() => setCompatReportVisible(false)}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '85%' }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 4 }}>📊 Compatibility Report</Text>
              {compatReport && (
                <>
                  {/* Overall score */}
                  <View style={{ alignItems: 'center', marginVertical: 20 }}>
                    <Text style={{ fontSize: 56, fontWeight: '800', color: RED, letterSpacing: -2 }}>
                      {isNaN(Number(compatReport.overall_score)) ? '—' : Number(compatReport.overall_score).toFixed(1)}
                    </Text>
                    <Text style={{ fontSize: 18, color: RED, fontWeight: '600', marginTop: -4 }}>/10</Text>
                  </View>

                  {/* Trait bars */}
                  {compatReport.traits && compatReport.traits.length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>Traits</Text>
                      {compatReport.traits.map((trait) => {
                        const traitScore = isNaN(Number(trait.score)) ? 0 : Number(trait.score);
                        const fillPct = `${(traitScore / 10) * 100}%` as any;
                        const traitScoreStr = String(traitScore);
                        return (
                          <View key={trait.name} style={{ marginBottom: 12 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ color: '#444', fontSize: 13, fontWeight: '500' }}>{trait.name}</Text>
                              <Text style={{ color: RED, fontSize: 13, fontWeight: '700' }}>{traitScoreStr}</Text>
                            </View>
                            <View style={{ height: 6, backgroundColor: colors.surfaceSecondary, borderRadius: 3, overflow: 'hidden' }}>
                              <View style={{ height: 6, width: fillPct, backgroundColor: RED, borderRadius: 3 }} />
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {/* Summary */}
                  {compatReport.summary ? (
                    <View style={{ backgroundColor: colors.surfaceSecondary, borderRadius: 12, padding: 14, marginBottom: 16 }}>
                      <Text style={{ color: colors.text, fontSize: 14, lineHeight: 21 }}>{compatReport.summary}</Text>
                    </View>
                  ) : null}

                  {/* Strongest / Weakest */}
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                    {compatReport.strongest_trait ? (
                      <View style={{ flex: 1, backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' }}>
                        <Text style={{ color: '#22C55E', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>Strongest</Text>
                        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{compatReport.strongest_trait}</Text>
                      </View>
                    ) : null}
                    {compatReport.weakest_trait ? (
                      <View style={{ flex: 1, backgroundColor: 'rgba(229,57,53,0.08)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(229,57,53,0.15)' }}>
                        <Text style={{ color: RED, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>Weakest</Text>
                        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{compatReport.weakest_trait}</Text>
                      </View>
                    ) : null}
                  </View>
                </>
              )}
              <Pressable
                onPress={() => {
                  console.log('[PersonDetail] Compatibility report modal closed');
                  setCompatReportVisible(false);
                }}
                style={{ marginTop: 16, backgroundColor: RED, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Done</Text>
              </Pressable>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <CallModal
        visible={showCallModal}
        name={personName}
        phone={phoneNumber}
        onClose={() => setShowCallModal(false)}
        onConfirm={() => {
          console.log('[PersonDetail] Logging call interaction for person:', id);
          apiPost('/api/interactions', {
            person_id: id,
            type: 'call',
            title: `Called ${person?.name}`,
            occurred_at: new Date().toISOString(),
          })
            .then(() => loadInteractions())
            .catch((e) => console.error('[PersonDetail] Failed to log call interaction:', e));
        }}
      />
      <TextModal
        visible={showTextModal}
        name={personName}
        phone={phoneNumber}
        onClose={() => setShowTextModal(false)}
        onConfirm={() => {
          console.log('[PersonDetail] Logging text interaction for person:', id);
          apiPost('/api/interactions', {
            person_id: id,
            type: 'text',
            title: `Texted ${person?.name}`,
            occurred_at: new Date().toISOString(),
          })
            .then(() => loadInteractions())
            .catch((e) => console.error('[PersonDetail] Failed to log text interaction:', e));
        }}
      />
      <LogDateModal
        visible={showLogDateModal}
        onClose={() => setShowLogDateModal(false)}
        onSave={handleSaveDate}
        dateType={dateType}
        setDateType={setDateType}
        dateWhen={dateWhen}
        setDateWhen={setDateWhen}
        showDatePicker={showDatePicker}
        setShowDatePicker={setShowDatePicker}
        showTimePicker={showTimePicker}
        setShowTimePicker={setShowTimePicker}
        dateLocation={dateLocation}
        setDateLocation={setDateLocation}
        dateNotes={dateNotes}
        setDateNotes={setDateNotes}
        dateVibe={dateVibe}
        setDateVibe={setDateVibe}
        savingDate={savingDate}
      />
    </View>
  );
}
