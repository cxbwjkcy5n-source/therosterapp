import React, { useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Share,
  ScrollView,
  Switch,
  TouchableOpacity,
} from 'react-native';
import Barcode from 'react-native-barcode-svg';
import {
  Share2,
  RefreshCw,
  Camera,
  User,
  Calendar,
  Gift,
  Star,
  MapPin,
  Briefcase,
  FileText,
  Music,
  Phone,
  Heart,
  UtensilsCrossed,
  ThumbsUp,
  Sparkles,
  ChevronLeft,
} from 'lucide-react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { authenticatedPost } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Field definitions ───────────────────────────────────────────────────────

type FieldDef = {
  key: string;
  label: string;
  defaultOn: boolean;
  alwaysOn?: boolean;
  iconType: 'lucide' | 'feather';
  iconName: string;
};

const FIELD_GROUPS: { title: string; fields: FieldDef[] }[] = [
  {
    title: 'Basic Info',
    fields: [
      { key: 'photo', label: 'Photo', defaultOn: true, iconType: 'lucide', iconName: 'Camera' },
      { key: 'name', label: 'Name', defaultOn: true, alwaysOn: true, iconType: 'lucide', iconName: 'User' },
      { key: 'age', label: 'Age', defaultOn: true, iconType: 'lucide', iconName: 'Calendar' },
      { key: 'birthday', label: 'Birthday', defaultOn: false, iconType: 'lucide', iconName: 'Gift' },
      { key: 'zodiac', label: 'Zodiac', defaultOn: false, iconType: 'lucide', iconName: 'Star' },
      { key: 'location', label: 'Location', defaultOn: true, iconType: 'lucide', iconName: 'MapPin' },
      { key: 'occupation', label: 'Occupation', defaultOn: false, iconType: 'lucide', iconName: 'Briefcase' },
      { key: 'bio', label: 'Bio', defaultOn: false, iconType: 'lucide', iconName: 'FileText' },
    ],
  },
  {
    title: 'Social & Contact',
    fields: [
      { key: 'instagram', label: 'Instagram', defaultOn: true, iconType: 'feather', iconName: 'instagram' },
      { key: 'tiktok', label: 'TikTok', defaultOn: true, iconType: 'lucide', iconName: 'Music' },
      { key: 'twitter_x', label: 'Twitter / X', defaultOn: false, iconType: 'feather', iconName: 'twitter' },
      { key: 'phone_number', label: 'Phone Number', defaultOn: false, iconType: 'lucide', iconName: 'Phone' },
    ],
  },
  {
    title: 'About Me',
    fields: [
      { key: 'hobbies', label: 'Hobbies', defaultOn: false, iconType: 'lucide', iconName: 'Heart' },
      { key: 'favorite_foods', label: 'Favorite Foods', defaultOn: false, iconType: 'lucide', iconName: 'UtensilsCrossed' },
      { key: 'green_flags', label: 'Green Flags', defaultOn: false, iconType: 'lucide', iconName: 'ThumbsUp' },
      { key: 'what_i_bring', label: 'What I Bring', defaultOn: false, iconType: 'lucide', iconName: 'Sparkles' },
    ],
  },
];

const DEFAULT_SELECTED = FIELD_GROUPS.flatMap((g) =>
  g.fields.filter((f) => f.defaultOn).map((f) => f.key)
);

const ALL_FIELDS_MAP: Record<string, FieldDef> = {};
FIELD_GROUPS.forEach((g) => g.fields.forEach((f) => { ALL_FIELDS_MAP[f.key] = f; }));

// ─── Icon renderer ────────────────────────────────────────────────────────────

const LUCIDE_ICONS: Record<string, React.ComponentType<any>> = {
  Camera,
  User,
  Calendar,
  Gift,
  Star,
  MapPin,
  Briefcase,
  FileText,
  Music,
  Phone,
  Heart,
  UtensilsCrossed,
  ThumbsUp,
  Sparkles,
};

function FieldIcon({ field, color }: { field: FieldDef; color: string }) {
  if (field.iconType === 'feather') {
    return <Feather name={field.iconName as any} size={18} color={color} />;
  }
  const LucideIcon = LUCIDE_ICONS[field.iconName];
  if (!LucideIcon) return null;
  return <LucideIcon size={18} color={color} />;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ShareProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [step, setStep] = useState<'select' | 'code'>('select');
  const [selectedFields, setSelectedFields] = useState<string[]>(DEFAULT_SELECTED);

  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleField = (key: string) => {
    setSelectedFields((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      console.log('[ShareProfile] Toggled field:', key, '→', next.includes(key) ? 'ON' : 'OFF');
      return next;
    });
  };

  const generate = async (fields: string[]) => {
    console.log('[ShareProfile] Generating share token with fields:', fields);
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedPost<{ token: string; expires_at: string; share_fields: string[] }>(
        '/api/share/generate',
        { share_fields: fields }
      );
      console.log('[ShareProfile] Token generated:', res.token);
      setToken(res.token);
      setExpiresAt(res.expires_at);
      setStep('code');
    } catch (e: any) {
      console.error('[ShareProfile] Failed to generate token:', e?.message);
      setError(e?.message || 'Failed to generate code');
      setStep('code');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = () => {
    console.log('[ShareProfile] Generate Code button pressed');
    generate(selectedFields);
  };

  const handleGenerateNew = () => {
    console.log('[ShareProfile] Generate New Code button pressed');
    generate(selectedFields);
  };

  const handleShare = async () => {
    if (!token) return;
    console.log('[ShareProfile] Share button pressed, token:', token);
    try {
      await Share.share({
        message: `Add me on The Roster! Use code: ${token}`,
        title: 'The Roster — Add Me',
      });
    } catch {}
  };

  const handleEditFields = () => {
    console.log('[ShareProfile] Edit fields button pressed');
    setToken(null);
    setExpiresAt(null);
    setError(null);
    setStep('select');
  };

  const expiryText = expiresAt
    ? `Expires ${new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
    : null;

  const selectedLabels = selectedFields
    .map((k) => ALL_FIELDS_MAP[k]?.label)
    .filter(Boolean)
    .join(', ');

  // ── Step 1: Field selection ──────────────────────────────────────────────

  if (step === 'select') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={{ alignItems: 'center', marginBottom: 28, gap: 8 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' }}>
              Share Your Profile
            </Text>
            <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }}>
              Choose what to include in your share code
            </Text>
          </View>

          {/* Field groups */}
          {FIELD_GROUPS.map((group) => (
            <View key={group.title} style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginLeft: 4 }}>
                {group.title}
              </Text>
              {group.fields.map((field) => {
                const isOn = selectedFields.includes(field.key);
                const isDisabled = field.alwaysOn === true;
                return (
                  <View
                    key={field.key}
                    style={{
                      backgroundColor: colors.surface,
                      borderRadius: 12,
                      padding: 14,
                      marginBottom: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <View style={{ backgroundColor: colors.surfaceSecondary, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
                      <FieldIcon field={field} color={isOn ? colors.primary : colors.textSecondary} />
                    </View>
                    <Text style={{ fontSize: 15, color: colors.text, flex: 1, marginLeft: 12 }}>
                      {field.label}
                    </Text>
                    <Switch
                      value={isOn}
                      onValueChange={isDisabled ? undefined : () => toggleField(field.key)}
                      disabled={isDisabled}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor="#FFFFFF"
                      ios_backgroundColor={colors.border}
                    />
                  </View>
                );
              })}
            </View>
          ))}
        </ScrollView>

        {/* Floating Generate button */}
        <View style={{ position: 'absolute', bottom: insets.bottom + 16, left: 20, right: 20 }}>
          <AnimatedPressable
            onPress={handleGenerateCode}
            style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.primary, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Generate Code</Text>
          </AnimatedPressable>
        </View>
      </View>
    );
  }

  // ── Step 2: Barcode display ──────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: insets.bottom + 24, gap: 28 }}>

        {/* Back button */}
        <TouchableOpacity
          onPress={handleEditFields}
          style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: -12 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={16} color={colors.primary} />
          <Text style={{ fontSize: 14, color: colors.primary, fontWeight: '600' }}>Edit fields</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' }}>Share Your Profile</Text>
          <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }}>
            Have someone scan this barcode to add you to their roster instantly
          </Text>
        </View>

        {/* Barcode card */}
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28, alignItems: 'center', gap: 16, width: '100%', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, borderWidth: 1, borderColor: COLORS.border }}>
          {loading ? (
            <View style={{ height: 120, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
          ) : error ? (
            <View style={{ height: 120, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Text style={{ color: COLORS.danger, fontSize: 14, textAlign: 'center' }}>{error}</Text>
              <AnimatedPressable
                onPress={() => { console.log('[ShareProfile] Try again pressed'); generate(selectedFields); }}
                style={{ backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Try Again</Text>
              </AnimatedPressable>
            </View>
          ) : token ? (
            <>
              <Barcode
                value={token}
                format="CODE128"
                lineColor="#1A1A1A"
                backgroundColor="#FFFFFF"
                singleBarWidth={2.5}
                height={100}
                maxWidth={280}
              />
              <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: 6 }}>{token}</Text>
              {expiryText ? <Text style={{ fontSize: 12, color: COLORS.textTertiary }}>{expiryText}</Text> : null}
            </>
          ) : null}
        </View>

        {/* Action buttons */}
        {!loading && !error && token ? (
          <View style={{ width: '100%', gap: 12 }}>
            <AnimatedPressable
              onPress={handleShare}
              style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}
            >
              <Share2 size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Share Code</Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={handleGenerateNew}
              style={{ backgroundColor: colors.surface, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: colors.border }}
            >
              <RefreshCw size={16} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, fontSize: 15, fontWeight: '600' }}>Generate New Code</Text>
            </AnimatedPressable>
          </View>
        ) : null}

        {/* Disclaimer */}
        <Text style={{ fontSize: 13, color: colors.textTertiary, textAlign: 'center', lineHeight: 19 }}>
          {'Sharing: '}
          <Text style={{ fontWeight: '600' }}>{selectedLabels}</Text>
          {'. Codes valid 48 hours. Your notes and ratings are never shared.'}
        </Text>
      </View>
    </View>
  );
}
