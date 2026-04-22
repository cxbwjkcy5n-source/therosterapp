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
  Platform,
} from 'react-native';
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
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '@/constants/Colors';
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

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
}

function formatDateTimeLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const date = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date}  ${time}`;
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr);
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
}

interface DateEntry {
  id: string;
  person_id: string;
  type?: string;
  location?: string;
  date_time?: string;
  status?: string;
  notes?: string;
  overall_rating?: number;
  conversation_rating?: number;
  attraction_rating?: number;
  effort_rating?: number;
  would_go_again?: string;
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

function SectionHeader({ label }: { label: string }) {
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
}

function PillTag({ label, color = '#555555', bg = '#F5F5F5' }: { label: string; color?: string; bg?: string }) {
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
}

function ReadOnlySlider({ label, value }: { label: string; value?: number }) {
  const val = value ?? 0;
  const fillPct = `${(val / 10) * 100}%` as any;
  const valueStr = String(val);
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ color: '#444444', fontSize: 14, fontWeight: '500' }}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={{ color: RED, fontSize: 14, fontWeight: '700' }}>{valueStr}</Text>
          <Text style={{ color: '#AAAAAA', fontSize: 12, fontWeight: '500' }}>/10</Text>
        </View>
      </View>
      <View style={{ height: 4, backgroundColor: '#E8E8E8', borderRadius: 2, overflow: 'hidden' }}>
        <View style={{ height: 4, width: fillPct, backgroundColor: RED, borderRadius: 2 }} />
      </View>
    </View>
  );
}

function EditableSlider({ label, value, onChange }: { label: string; value?: number; onChange: (v: number) => void }) {
  const val = value ?? 5;
  const fillPct = `${(val / 10) * 100}%` as any;
  const valueStr = String(val);
  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ color: '#444444', fontSize: 14, fontWeight: '500' }}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={{ color: RED, fontSize: 14, fontWeight: '700' }}>{valueStr}</Text>
          <Text style={{ color: '#AAAAAA', fontSize: 12, fontWeight: '500' }}>/10</Text>
        </View>
      </View>
      <View style={{ position: 'relative', height: 20, justifyContent: 'center' }}>
        <View style={{ height: 4, backgroundColor: '#E8E8E8', borderRadius: 2, overflow: 'hidden' }}>
          <View style={{ height: 4, width: fillPct, backgroundColor: RED, borderRadius: 2 }} />
        </View>
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flexDirection: 'row' }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((step) => (
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
    </View>
  );
}

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

function CallModal({ visible, name, phone, onClose }: { visible: boolean; name: string; phone: string; onClose: () => void }) {
  const handleStartCall = () => {
    console.log('[PersonDetail] Start Call pressed for:', name, phone);
    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`).catch((e) =>
      console.error('[PersonDetail] Failed to open tel link:', e)
    );
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

function TextModal({ visible, name, phone, onClose }: { visible: boolean; name: string; phone: string; onClose: () => void }) {
  const [customMessage, setCustomMessage] = useState('');
  const firstName = name.split(' ')[0];

  const sendMessage = (msg: string) => {
    console.log('[PersonDetail] Sending message to:', name, 'message:', msg);
    const encoded = encodeURIComponent(msg);
    const cleanPhone = phone.replace(/\s/g, '');
    Linking.openURL(`sms:${cleanPhone}?body=${encoded}`).catch((e) =>
      console.error('[PersonDetail] Failed to open sms link:', e)
    );
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
  dateOverall, setDateOverall,
  dateConversation, setDateConversation,
  dateAttraction, setDateAttraction,
  dateEffort, setDateEffort,
  dateWouldGoAgain, setDateWouldGoAgain,
  dateNotes, setDateNotes,
  savingDate,
}: {
  visible: boolean; onClose: () => void; onSave: () => void;
  dateType: string; setDateType: (v: string) => void;
  dateWhen: Date; setDateWhen: (v: Date) => void;
  showDatePicker: boolean; setShowDatePicker: (v: boolean) => void;
  showTimePicker: boolean; setShowTimePicker: (v: boolean) => void;
  dateLocation: string; setDateLocation: (v: string) => void;
  dateOverall: number; setDateOverall: (v: number) => void;
  dateConversation: number; setDateConversation: (v: number) => void;
  dateAttraction: number; setDateAttraction: (v: number) => void;
  dateEffort: number; setDateEffort: (v: number) => void;
  dateWouldGoAgain: string; setDateWouldGoAgain: (v: string) => void;
  dateNotes: string; setDateNotes: (v: string) => void;
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

            {/* Rate the Date */}
            <Text style={{ color: '#999999', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 12 }}>Rate the Date</Text>
            <EditableSlider label="Overall" value={dateOverall} onChange={(v) => { console.log('[PersonDetail] Date overall rating:', v); setDateOverall(v); }} />
            <EditableSlider label="Conversation" value={dateConversation} onChange={(v) => { console.log('[PersonDetail] Date conversation rating:', v); setDateConversation(v); }} />
            <EditableSlider label="Attraction IRL" value={dateAttraction} onChange={(v) => { console.log('[PersonDetail] Date attraction rating:', v); setDateAttraction(v); }} />
            <EditableSlider label="Effort & Intent" value={dateEffort} onChange={(v) => { console.log('[PersonDetail] Date effort rating:', v); setDateEffort(v); }} />

            {/* Would go again */}
            <Text style={{ color: '#999999', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10 }}>Would go again?</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {WOULD_GO_AGAIN_OPTIONS.map((opt) => {
                const isSelected = dateWouldGoAgain === opt;
                return (
                  <Pressable
                    key={opt}
                    onPress={() => {
                      console.log('[PersonDetail] Would go again selected:', opt);
                      setDateWouldGoAgain(opt);
                    }}
                    style={{
                      paddingHorizontal: 20, paddingVertical: 9, borderRadius: 20,
                      backgroundColor: isSelected ? RED : '#F5F5F5',
                      borderWidth: 1, borderColor: isSelected ? RED : '#E0E0E0',
                    }}
                  >
                    <Text style={{ color: isSelected ? '#fff' : '#666666', fontSize: 14, fontWeight: '500' }}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>

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

  // core data
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<Person>>({});
  const [newPhotoUri, setNewPhotoUri] = useState<string | null>(null);

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
  const [dateOverall, setDateOverall] = useState(5);
  const [dateConversation, setDateConversation] = useState(5);
  const [dateAttraction, setDateAttraction] = useState(5);
  const [dateEffort, setDateEffort] = useState(5);
  const [dateWouldGoAgain, setDateWouldGoAgain] = useState('Maybe');
  const [dateNotes, setDateNotes] = useState('');
  const [savingDate, setSavingDate] = useState(false);

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

  // edit date
  const [editingDateId, setEditingDateId] = useState<string | null>(null);

  // ── loaders ──────────────────────────────────────────────────────────────

  const loadPerson = useCallback(async () => {
    if (!id) return;
    const personId = Array.isArray(id) ? id[0] : id;
    console.log('[PersonDetail] Loading person id:', personId);
    try {
      const data = await apiGet<any>(`/api/persons/${personId}`);
      console.log('[PersonDetail] Raw API response keys:', Object.keys(data || {}));
      // Handle both { person: {...} } and direct person object shapes
      const resolved: Person = data?.person ?? data;
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

  useEffect(() => {
    Promise.all([loadPerson(), loadDates(), loadNotes(), loadReminders()]);
  }, [loadPerson, loadDates, loadNotes, loadReminders]);

  // ── actions ──────────────────────────────────────────────────────────────

  const handleEdit = () => {
    console.log('[PersonDetail] Edit mode toggled on');
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
          }
        } catch (photoErr) {
          console.error('[PersonDetail] Photo upload failed:', photoErr);
        }
      }
      const updatedRaw = await apiGet<any>(`/api/persons/${id}`);
      const updated: Person = updatedRaw?.person ?? updatedRaw;
      setPerson(updated);
      setEditData(updated);
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

  const openLink = (url: string) => {
    console.log('[PersonDetail] Opening URL:', url);
    Linking.openURL(url).catch((e) => console.error('[PersonDetail] Failed to open URL:', e));
  };

  const handleSaveDate = async () => {
    console.log('[PersonDetail] Saving date for person:', id, 'type:', dateType);
    setSavingDate(true);
    try {
      await apiPost('/api/dates', {
        person_id: id,
        type: dateType.toLowerCase(),
        location: dateLocation.trim() || undefined,
        date_time: dateWhen.toISOString(),
        overall_rating: dateOverall,
        conversation_rating: dateConversation,
        attraction_rating: dateAttraction,
        effort_rating: dateEffort,
        would_go_again: dateWouldGoAgain.toLowerCase(),
        notes: dateNotes.trim() || undefined,
        status: 'completed',
      });
      console.log('[PersonDetail] Date saved successfully');
      setDateType('Coffee');
      setDateWhen(new Date());
      setDateLocation('');
      setDateOverall(5);
      setDateConversation(5);
      setDateAttraction(5);
      setDateEffort(5);
      setDateWouldGoAgain('Maybe');
      setDateNotes('');
      setShowLogDateModal(false);
      await loadDates();
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
    console.log('[PersonDetail] Saving note for person:', id);
    setSavingNote(true);
    try {
      await apiPost('/api/notes', { person_id: id, content: newNoteText.trim() });
      console.log('[PersonDetail] Note saved');
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
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={RED} />
      </View>
    );
  }

  if (!person) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#666666' }}>Person not found</Text>
      </View>
    );
  }

  const displayData = editing ? editData : person;
  const photoSource = newPhotoUri || displayData.photo_url;
  const hasPhoto = !!photoSource;
  const initials = getInitials(displayData.name || '');
  const connectionLabel = getConnectionLabel(displayData.connection_type, displayData.connection_type_custom);
  const hasPhone = !!(displayData.phone_number);
  const personName = person.name || '';
  const personFirstName = personName.split(' ')[0];
  const phoneNumber = displayData.phone_number || '';

  const ratingFields = [
    { label: 'Sexual chemistry', key: 'sexual_chemistry' as keyof Person },
    { label: 'Overall chemistry', key: 'overall_chemistry' as keyof Person },
    { label: 'Communication', key: 'communication' as keyof Person },
    { label: 'Consistency', key: 'consistency' as keyof Person },
    { label: 'Emotional availability', key: 'emotional_availability' as keyof Person },
    { label: 'Date planning', key: 'date_planning' as keyof Person },
    { label: 'Alignment', key: 'alignment' as keyof Person },
  ];

  const ratingValues = ratingFields.map((f) => (displayData[f.key] as number) ?? 5);
  const avgCompatibility = Math.round(ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length);

  const reminderDateLabel = reminderDate.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  const chemistryScore = displayData.interest_level ?? displayData.overall_chemistry ?? 0;
  const chemistryStr = String(chemistryScore);

  // ── render tabs ───────────────────────────────────────────────────────────

  const renderOverviewTab = () => {
    const favTags: { label: string; value?: string | string[] }[] = [
      { label: 'Fav Food', value: displayData.favorite_foods?.join(', ') },
      { label: 'Fav Color', value: displayData.favorite_color },
      { label: 'Things they like', value: displayData.things_they_like?.join(', ') },
      { label: 'Lifestyle vibe', value: displayData.lifestyle_vibe },
      { label: 'Intention', value: displayData.intention },
      { label: displayData.distance_type || 'In-person', value: undefined },
    ].filter((t) => t.value !== undefined || t.label === (displayData.distance_type || 'In-person'));

    const sortedDates = [...dates].sort((a, b) => {
      const da = new Date(a.date_time || a.created_at).getTime();
      const db = new Date(b.date_time || b.created_at).getTime();
      return db - da;
    });

    return (
      <View style={{ gap: 16 }}>
        {/* Dating Timeline */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, ...CARD_SHADOW }}>
          <SectionHeader label="Dating Timeline" />
          {loadingDates ? (
            <ActivityIndicator color={RED} style={{ marginVertical: 12 }} />
          ) : sortedDates.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(229,57,53,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Heart size={22} color={RED} />
              </View>
              <Text style={{ color: '#999999', fontSize: 14, textAlign: 'center' }}>No dates yet</Text>
            </View>
          ) : (
            <View>
              {sortedDates.map((d, index) => {
                const isLast = index === sortedDates.length - 1;
                const dateLabel = formatShortDate(d.date_time || d.created_at);
                const typeLabel = d.type ? (d.type.charAt(0).toUpperCase() + d.type.slice(1)) : 'Date';
                const ratingVal = d.overall_rating ?? 0;
                const ratingStr = ratingVal > 0 ? `${ratingVal}/10` : '—';
                return (
                  <View key={d.id} style={{ flexDirection: 'row', gap: 12, marginBottom: isLast ? 0 : 16 }}>
                    <View style={{ alignItems: 'center', width: 28 }}>
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: RED, marginTop: 4 }} />
                      {!isLast && (
                        <View style={{ width: 2, flex: 1, backgroundColor: '#EEEEEE', marginTop: 4, minHeight: 20 }} />
                      )}
                    </View>
                    <View style={{ flex: 1, paddingBottom: isLast ? 0 : 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <Text style={{ color: '#1A1A1A', fontSize: 14, fontWeight: '600' }}>{typeLabel}</Text>
                        <View style={{ backgroundColor: 'rgba(229,57,53,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ color: RED, fontSize: 12, fontWeight: '600' }}>{ratingStr}</Text>
                        </View>
                      </View>
                      <Text style={{ color: '#999999', fontSize: 12 }}>{dateLabel}</Text>
                      {d.location ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <MapPin size={11} color="#AAAAAA" />
                          <Text style={{ color: '#AAAAAA', fontSize: 12 }} numberOfLines={1}>{d.location}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Favorites */}
        {(favTags.length > 0 || editing) && (
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, ...CARD_SHADOW }}>
            <SectionHeader label="Favorites" />
            {editing ? (
              <View style={{ gap: 10 }}>
                {[
                  { label: 'Fav Food (comma-separated)', key: 'favorite_foods' as keyof Person, isArray: true },
                  { label: 'Fav Color', key: 'favorite_color' as keyof Person, isArray: false },
                  { label: 'Things they like (comma-separated)', key: 'things_they_like' as keyof Person, isArray: true },
                  { label: 'Lifestyle vibe', key: 'lifestyle_vibe' as keyof Person, isArray: false },
                  { label: 'Intention', key: 'intention' as keyof Person, isArray: false },
                  { label: 'Distance type (e.g. In-person)', key: 'distance_type' as keyof Person, isArray: false },
                ].map((field) => (
                  <View key={field.key}>
                    <Text style={{ color: '#999999', fontSize: 12, marginBottom: 4 }}>{field.label}</Text>
                    <TextInput
                      value={field.isArray
                        ? ((editData[field.key] as string[]) || []).join(', ')
                        : (editData[field.key] as string) || ''}
                      onChangeText={(v) => {
                        if (field.isArray) {
                          update(field.key, v.split(',').map((s) => s.trim()).filter(Boolean));
                        } else {
                          update(field.key, v);
                        }
                      }}
                      placeholder={field.label}
                      placeholderTextColor="#BBBBBB"
                      style={{
                        backgroundColor: '#F5F5F5', borderRadius: 10, padding: 10,
                        color: '#1A1A1A', fontSize: 14, borderWidth: 1, borderColor: '#E0E0E0',
                      }}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {displayData.favorite_foods && displayData.favorite_foods.length > 0 && (
                  <PillTag label={`Fav Food: ${displayData.favorite_foods.join(', ')}`} />
                )}
                {displayData.favorite_color && (
                  <PillTag label={`Fav Color: ${displayData.favorite_color}`} />
                )}
                {displayData.things_they_like && displayData.things_they_like.length > 0 && (
                  <PillTag label={`Things they like: ${displayData.things_they_like.join(', ')}`} />
                )}
                {displayData.lifestyle_vibe && (
                  <PillTag label={`Lifestyle vibe: ${displayData.lifestyle_vibe}`} />
                )}
                {displayData.intention && (
                  <PillTag label={`Intention: ${displayData.intention}`} />
                )}
                {displayData.distance_type && (
                  <PillTag label={displayData.distance_type} />
                )}
              </View>
            )}
          </View>
        )}

        {/* Flags */}
        {((displayData.green_flags && displayData.green_flags.length > 0) ||
          (displayData.red_flags && displayData.red_flags.length > 0) || editing) && (
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, ...CARD_SHADOW }}>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#2E7D32', fontSize: 14, fontWeight: '700', marginBottom: 10 }}>Green Flags</Text>
                {editing ? (
                  <TextInput
                    value={((editData.green_flags || []).join(', '))}
                    onChangeText={(v) => update('green_flags', v.split(',').map((s) => s.trim()).filter(Boolean))}
                    placeholder="e.g. Kind, Funny"
                    placeholderTextColor="#BBBBBB"
                    multiline
                    style={{
                      backgroundColor: '#F5F5F5', borderRadius: 10, padding: 10,
                      color: '#1A1A1A', fontSize: 13, borderWidth: 1, borderColor: '#E0E0E0', minHeight: 60,
                    }}
                  />
                ) : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {(displayData.green_flags || []).map((flag) => (
                      <PillTag key={flag} label={flag} color="#2E7D32" bg="rgba(46,125,50,0.08)" />
                    ))}
                    {(!displayData.green_flags || displayData.green_flags.length === 0) && (
                      <Text style={{ color: '#BBBBBB', fontSize: 13 }}>None added</Text>
                    )}
                  </View>
                )}
              </View>
              <View style={{ width: 1, backgroundColor: '#F0F0F0' }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: RED, fontSize: 14, fontWeight: '700', marginBottom: 10 }}>Red Flags</Text>
                {editing ? (
                  <TextInput
                    value={((editData.red_flags || []).join(', '))}
                    onChangeText={(v) => update('red_flags', v.split(',').map((s) => s.trim()).filter(Boolean))}
                    placeholder="e.g. Flaky, Rude"
                    placeholderTextColor="#BBBBBB"
                    multiline
                    style={{
                      backgroundColor: '#F5F5F5', borderRadius: 10, padding: 10,
                      color: '#1A1A1A', fontSize: 13, borderWidth: 1, borderColor: '#E0E0E0', minHeight: 60,
                    }}
                  />
                ) : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {(displayData.red_flags || []).map((flag) => (
                      <PillTag key={flag} label={flag} color={RED} bg="rgba(229,57,53,0.08)" />
                    ))}
                    {(!displayData.red_flags || displayData.red_flags.length === 0) && (
                      <Text style={{ color: '#BBBBBB', fontSize: 13 }}>None added</Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Ratings */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, ...CARD_SHADOW }}>
          <SectionHeader label="Ratings" />
          {ratingFields.map((f) =>
            editing ? (
              <EditableSlider
                key={f.key}
                label={f.label}
                value={editData[f.key] as number}
                onChange={(v) => update(f.key, v)}
              />
            ) : (
              <ReadOnlySlider key={f.key} label={f.label} value={person[f.key] as number} />
            )
          )}
          <View style={{ height: 1, backgroundColor: '#EEEEEE', marginVertical: 16 }} />
          <Text style={{ color: '#999999', fontSize: 11, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
            Overall Compatibility
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginBottom: 10 }}>
            <Text style={{ color: RED, fontSize: 36, fontWeight: '800', letterSpacing: -1 }}>{avgCompatibility}</Text>
            <Text style={{ color: RED, fontSize: 18, fontWeight: '600' }}>/10</Text>
          </View>
          <View style={{ height: 6, backgroundColor: '#E8E8E8', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
            <View style={{ height: 6, width: `${(avgCompatibility / 10) * 100}%` as any, backgroundColor: RED, borderRadius: 3 }} />
          </View>
          <Text style={{ color: '#AAAAAA', fontSize: 12 }}>Based on your ratings</Text>
        </View>

        {/* Details (edit mode) */}
        {editing && (
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, ...CARD_SHADOW }}>
            <SectionHeader label="Details" />
            <View style={{ gap: 12 }}>
              <View>
                <Text style={{ color: '#999999', fontSize: 12, marginBottom: 4 }}>Nickname</Text>
                <TextInput
                  value={editData.nickname || ''}
                  onChangeText={(v) => update('nickname', v)}
                  placeholder="Nickname"
                  placeholderTextColor="#BBBBBB"
                  style={{ backgroundColor: '#F5F5F5', borderRadius: 10, padding: 10, color: '#1A1A1A', fontSize: 14, borderWidth: 1, borderColor: '#E0E0E0' }}
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
                  style={{ backgroundColor: '#F5F5F5', borderRadius: 10, padding: 10, color: '#1A1A1A', fontSize: 14, borderWidth: 1, borderColor: '#E0E0E0' }}
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
                    style={{ backgroundColor: '#F5F5F5', borderRadius: 10, padding: 10, color: '#1A1A1A', fontSize: 14, borderWidth: 1, borderColor: '#E0E0E0' }}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Edit / Delete buttons */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
          <AnimatedPressable
            onPress={editing ? handleSave : handleEdit}
            disabled={saving}
            style={{ flex: 1 }}
          >
            <View style={{
              backgroundColor: '#1A1A1A', borderRadius: 14, paddingVertical: 16,
              alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
            }}>
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Pencil size={16} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                    {editing ? 'Save' : 'Edit'}
                  </Text>
                </>
              )}
            </View>
          </AnimatedPressable>
          <AnimatedPressable onPress={handleDelete} style={{ flex: 1 }}>
            <View style={{
              backgroundColor: RED, borderRadius: 14, paddingVertical: 16,
              alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
            }}>
              <Trash2 size={16} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Delete</Text>
            </View>
          </AnimatedPressable>
        </View>

        {!person.is_benched && !editing && (
          <AnimatedPressable onPress={handleBench}>
            <View style={{
              borderWidth: 1, borderColor: COLORS.warning, borderRadius: 14,
              paddingVertical: 14, alignItems: 'center', flexDirection: 'row',
              justifyContent: 'center', gap: 8,
            }}>
              <Users size={16} color={COLORS.warning} />
              <Text style={{ color: COLORS.warning, fontSize: 15, fontWeight: '600' }}>Move to Bench</Text>
            </View>
          </AnimatedPressable>
        )}
      </View>
    );
  };

  const renderDatesTab = () => {
    const sortedDates = [...dates].sort((a, b) => {
      const da = new Date(a.date_time || a.created_at).getTime();
      const db = new Date(b.date_time || b.created_at).getTime();
      return db - da;
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
            <Text style={{ color: '#1A1A1A', fontSize: 16, fontWeight: '600', marginBottom: 6 }}>No dates yet</Text>
            <Text style={{ color: '#999999', fontSize: 14, textAlign: 'center' }}>Log your first date below</Text>
          </View>
        ) : (
          sortedDates.map((d, index) => {
            const isExpanded = expandedDateId === d.id;
            const typeLabel = d.type ? (d.type.charAt(0).toUpperCase() + d.type.slice(1)) : 'Date';
            const dateTimeStr = formatDateTimeLabel(d.date_time || d.created_at);
            const overallVal = d.overall_rating ?? 0;
            const overallStr = String(overallVal);
            const convoVal = d.conversation_rating ?? 0;
            const attractVal = d.attraction_rating ?? 0;
            const effortVal = d.effort_rating ?? 0;
            const wouldGoRaw = d.would_go_again || '';
            const wouldGoLabel = wouldGoRaw ? (wouldGoRaw.charAt(0).toUpperCase() + wouldGoRaw.slice(1)) : null;
            const badgeNum = String(index + 1);

            const wouldGoBg = wouldGoLabel === 'Yes' ? '#4CAF50' : wouldGoLabel === 'Maybe' ? RED : '#999999';

            return (
              <Pressable
                key={d.id}
                onPress={() => {
                  console.log('[PersonDetail] Date card toggled:', d.id, 'expanded:', !isExpanded);
                  setExpandedDateId(isExpanded ? null : d.id);
                }}
              >
                <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', ...CARD_SHADOW }}>
                  {/* Header row */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 }}>
                    {/* Number badge */}
                    <View style={{
                      width: 28, height: 28, borderRadius: 14,
                      backgroundColor: RED, alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                        {'#'}
                        <Text>{badgeNum}</Text>
                      </Text>
                    </View>

                    {/* Center info */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#1A1A1A', fontSize: 15, fontWeight: '700', marginBottom: 3 }}>{typeLabel}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Calendar size={11} color="#999999" />
                          <Text style={{ color: '#999999', fontSize: 12 }}>{dateTimeStr}</Text>
                        </View>
                        {d.location ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Text style={{ color: '#CCCCCC', fontSize: 12 }}>•</Text>
                            <MapPin size={11} color="#999999" />
                            <Text style={{ color: '#999999', fontSize: 12 }} numberOfLines={1}>{d.location}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {/* Right: star + score + chevron */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 14 }}>⭐</Text>
                      <Text style={{ color: '#1A1A1A', fontSize: 13, fontWeight: '700' }}>{overallStr}</Text>
                      {isExpanded ? <ChevronUp size={16} color="#999999" /> : <ChevronDown size={16} color="#999999" />}
                    </View>
                  </View>

                  {/* Expanded content */}
                  {isExpanded && (
                    <View style={{ paddingHorizontal: 14, paddingBottom: 0 }}>
                      <View style={{ height: 1, backgroundColor: '#F0F0F0', marginBottom: 14 }} />

                      {/* 2x2 score grid */}
                      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                        <View style={{ flex: 1, gap: 10 }}>
                          {/* Overall */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ fontSize: 16 }}>⭐</Text>
                            <Text style={{ color: '#1A1A1A', fontSize: 13, flex: 1 }}>Overall</Text>
                            <ScoreRing score={overallVal} color="#F5A623" size={36} />
                          </View>
                          {/* Attraction IRL */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ fontSize: 16 }}>💙</Text>
                            <Text style={{ color: '#1A1A1A', fontSize: 13, flex: 1 }}>Attraction IRL</Text>
                            <ScoreRing score={attractVal} color="#1565C0" size={36} />
                          </View>
                        </View>
                        <View style={{ flex: 1, gap: 10 }}>
                          {/* Convo */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ fontSize: 16 }}>💬</Text>
                            <Text style={{ color: '#1A1A1A', fontSize: 13, flex: 1 }}>Convo</Text>
                            <ScoreRing score={convoVal} color="#00897B" size={36} />
                          </View>
                          {/* Effort */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ fontSize: 16 }}>🔥</Text>
                            <Text style={{ color: '#1A1A1A', fontSize: 13, flex: 1 }}>Effort</Text>
                            <ScoreRing score={effortVal} color="#E65100" size={36} />
                          </View>
                        </View>
                      </View>

                      {/* Would go again */}
                      {wouldGoLabel ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <Text style={{ color: '#1A1A1A', fontSize: 14 }}>Would go again?</Text>
                          <View style={{ backgroundColor: wouldGoBg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 }}>
                            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>{wouldGoLabel}</Text>
                          </View>
                        </View>
                      ) : null}

                      {/* Notes */}
                      {d.notes ? (
                        <Text style={{ color: '#555555', fontSize: 13, fontStyle: 'italic', lineHeight: 19, marginBottom: 14 }}>
                          {d.notes}
                        </Text>
                      ) : null}

                      {/* Edit / Delete buttons */}
                      <View style={{ flexDirection: 'row', gap: 0, marginHorizontal: -14, borderTopWidth: 1, borderTopColor: '#F0F0F0' }}>
                        <Pressable
                          onPress={() => {
                            console.log('[PersonDetail] Edit date pressed:', d.id);
                            setEditingDateId(d.id);
                          }}
                          style={{
                            flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                            borderRightWidth: 1, borderRightColor: '#F0F0F0',
                          }}
                        >
                          <Pencil size={15} color="#1A1A1A" />
                          <Text style={{ color: '#1A1A1A', fontSize: 14, fontWeight: '600' }}>Edit</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            console.log('[PersonDetail] Delete date pressed:', d.id);
                            handleDeleteDate(d.id);
                          }}
                          style={{
                            flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                            backgroundColor: RED, borderBottomRightRadius: 16,
                          }}
                        >
                          <Trash2 size={15} color="#FFFFFF" />
                          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>Delete</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })
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
          <Text style={{ color: '#1A1A1A', fontSize: 16, fontWeight: '600', marginBottom: 6 }}>No notes yet</Text>
          <Text style={{ color: '#999999', fontSize: 14, textAlign: 'center' }}>Add notes to remember important details</Text>
        </View>
      ) : (
        notes.map((note) => (
          <View key={note.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, ...CARD_SHADOW }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <Text style={{ color: '#999999', fontSize: 12 }}>{formatTimestamp(note.created_at)}</Text>
              <AnimatedPressable onPress={() => handleDeleteNote(note)}>
                <XIcon size={16} color="#CCCCCC" />
              </AnimatedPressable>
            </View>
            <Text style={{ color: '#1A1A1A', fontSize: 14, lineHeight: 21 }}>{note.content}</Text>
          </View>
        ))
      )}

      {addingNote && (
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, ...CARD_SHADOW }}>
          <TextInput
            value={newNoteText}
            onChangeText={setNewNoteText}
            placeholder="Write a note..."
            placeholderTextColor="#BBBBBB"
            multiline
            autoFocus
            style={{
              backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14,
              color: '#1A1A1A', fontSize: 14, borderWidth: 1, borderColor: '#E0E0E0',
              minHeight: 100, textAlignVertical: 'top', marginBottom: 12,
            }}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <AnimatedPressable onPress={() => { setAddingNote(false); setNewNoteText(''); }} style={{ flex: 1 }}>
              <View style={{ backgroundColor: '#F5F5F5', borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}>
                <Text style={{ color: '#666666', fontSize: 14, fontWeight: '600' }}>Cancel</Text>
              </View>
            </AnimatedPressable>
            <AnimatedPressable onPress={handleSaveNote} disabled={!newNoteText.trim() || savingNote} style={{ flex: 1 }}>
              <View style={{ backgroundColor: newNoteText.trim() ? RED : '#F5F5F5', borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}>
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
          <Text style={{ color: '#1A1A1A', fontSize: 16, fontWeight: '600', marginBottom: 6 }}>No reminders yet</Text>
          <Text style={{ color: '#999999', fontSize: 14, textAlign: 'center' }}>Set reminders to stay on top of things</Text>
        </View>
      ) : (
        reminders.map((reminder) => (
          <View key={reminder.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, ...CARD_SHADOW, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(229,57,53,0.08)', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={18} color={RED} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#1A1A1A', fontSize: 14, fontWeight: '500', marginBottom: 3 }}>{reminder.text}</Text>
              <Text style={{ color: '#999999', fontSize: 12 }}>{formatFullDate(reminder.remind_at)}</Text>
            </View>
            <AnimatedPressable onPress={() => handleDeleteReminder(reminder)}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={15} color="#CCCCCC" />
              </View>
            </AnimatedPressable>
          </View>
        ))
      )}

      {addingReminder && (
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, ...CARD_SHADOW }}>
          <Text style={{ color: '#999999', fontSize: 12, fontWeight: '600', marginBottom: 8 }}>Reminder text</Text>
          <TextInput
            value={reminderText}
            onChangeText={setReminderText}
            placeholder="e.g. Follow up after date"
            placeholderTextColor="#BBBBBB"
            autoFocus
            style={{
              backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14,
              color: '#1A1A1A', fontSize: 14, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 14,
            }}
          />
          <Text style={{ color: '#999999', fontSize: 12, fontWeight: '600', marginBottom: 8 }}>When</Text>
          <AnimatedPressable onPress={() => {
            console.log('[PersonDetail] Reminder date picker opened');
            setShowReminderDatePicker(true);
          }}>
            <View style={{
              backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14,
              borderWidth: 1, borderColor: '#E0E0E0', flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
            }}>
              <Calendar size={16} color={RED} />
              <Text style={{ color: '#1A1A1A', fontSize: 14 }}>{reminderDateLabel}</Text>
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
              <View style={{ backgroundColor: '#F5F5F5', borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}>
                <Text style={{ color: '#666666', fontSize: 14, fontWeight: '600' }}>Cancel</Text>
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
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <Stack.Screen
        options={{
          title: 'Roster Details',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: '#FFFFFF' },
          headerTintColor: '#1A1A1A',
          headerTitleStyle: { fontWeight: '600', fontSize: 17 },
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Profile Card ─────────────────────────────────────────────────── */}
        <View style={{
          backgroundColor: '#FFFFFF',
          marginHorizontal: 16, marginTop: 16,
          borderRadius: 16, padding: 20,
          ...CARD_SHADOW,
        }}>
          {/* Avatar */}
          <AnimatedPressable onPress={editing ? pickPhoto : undefined} style={{ alignSelf: 'center', marginBottom: 12 }}>
            <View style={{
              width: 80, height: 80, borderRadius: 40,
              borderWidth: 3, borderColor: RED,
              overflow: 'hidden',
              backgroundColor: RED,
              alignItems: 'center', justifyContent: 'center',
            }}>
              {hasPhoto ? (
                <Image
                  source={resolveImageSource(photoSource)}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              ) : (
                <Text style={{ fontSize: 28, fontWeight: '700', color: '#fff' }}>{initials}</Text>
              )}
            </View>
          </AnimatedPressable>
          {editing && (
            <Pressable onPress={pickPhoto} style={{ alignSelf: 'center', marginBottom: 8 }}>
              <Text style={{ color: RED, fontSize: 12, fontWeight: '600' }}>Change photo</Text>
            </Pressable>
          )}

          {/* Name */}
          {editing ? (
            <TextInput
              value={editData.name || ''}
              onChangeText={(v) => update('name', v)}
              style={{
                color: '#1A1A1A', fontSize: 20, fontWeight: '700', textAlign: 'center',
                backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
                borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 10, alignSelf: 'center', minWidth: 200,
              }}
            />
          ) : (
            <Text style={{ color: '#1A1A1A', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 10 }}>
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
              <Text style={{ color: '#1A1A1A', fontSize: 13, fontWeight: '700', marginBottom: 3 }}>Compatibility Score</Text>
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
              style={{
                flex: 1, height: 36, borderRadius: 20,
                borderWidth: 1, borderColor: '#EEEEEE',
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
                opacity: hasPhone ? 1 : 0.4,
              }}
            >
              <Ionicons name="call-outline" size={14} color="#1A1A1A" />
              <Text style={{ color: '#1A1A1A', fontSize: 12, fontWeight: '500' }}>Call</Text>
            </Pressable>

            {/* Text */}
            <Pressable
              onPress={() => {
                console.log('[PersonDetail] Text button pressed');
                if (hasPhone) setShowTextModal(true);
              }}
              style={{
                flex: 1, height: 36, borderRadius: 20,
                borderWidth: 1, borderColor: '#EEEEEE',
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
                opacity: hasPhone ? 1 : 0.4,
              }}
            >
              <Ionicons name="chatbubble-outline" size={14} color="#1A1A1A" />
              <Text style={{ color: '#1A1A1A', fontSize: 12, fontWeight: '500' }}>Text</Text>
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
              <Text style={{ color: '#1A1A1A', fontSize: 12, fontWeight: '500' }}>Insta</Text>
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
              <Text style={{ color: '#1A1A1A', fontSize: 12, fontWeight: '500' }}>TikTok</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
        <View style={{
          backgroundColor: '#FFFFFF', marginHorizontal: 16, marginTop: 14,
          borderRadius: 16, padding: 6, flexDirection: 'row', ...CARD_SHADOW,
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
                  color: isActive ? '#FFFFFF' : '#888888',
                  fontSize: 14, fontWeight: isActive ? '600' : '400',
                }}>
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Tab Content ─────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 }}>
          {activeTab === 'Overview' && renderOverviewTab()}
          {activeTab === 'Dates' && renderDatesTab()}
          {activeTab === 'Notes' && renderNotesTab()}
          {activeTab === 'Reminders' && renderRemindersTab()}
        </View>
      </ScrollView>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <CallModal
        visible={showCallModal}
        name={personName}
        phone={phoneNumber}
        onClose={() => setShowCallModal(false)}
      />
      <TextModal
        visible={showTextModal}
        name={personName}
        phone={phoneNumber}
        onClose={() => setShowTextModal(false)}
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
        dateOverall={dateOverall}
        setDateOverall={setDateOverall}
        dateConversation={dateConversation}
        setDateConversation={setDateConversation}
        dateAttraction={dateAttraction}
        setDateAttraction={setDateAttraction}
        dateEffort={dateEffort}
        setDateEffort={setDateEffort}
        dateWouldGoAgain={dateWouldGoAgain}
        setDateWouldGoAgain={setDateWouldGoAgain}
        dateNotes={dateNotes}
        setDateNotes={setDateNotes}
        savingDate={savingDate}
      />
    </View>
  );
}
