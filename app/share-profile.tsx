import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Stack } from 'expo-router';
import { Barcode } from 'expo-barcode-generator';
import { Share2, RefreshCw } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { authenticatedPost } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ShareProfileScreen() {
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    console.log('[ShareProfile] Generating share token');
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedPost<{ token: string; expires_at: string }>(
        '/api/share/generate',
        {}
      );
      console.log('[ShareProfile] Token generated:', res.token);
      setToken(res.token);
      setExpiresAt(res.expires_at);
    } catch (e: any) {
      console.error('[ShareProfile] Failed to generate token:', e?.message);
      setError(e?.message || 'Failed to generate code');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { generate(); }, []);

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

  const expiryText = expiresAt
    ? `Expires ${new Date(expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen
        options={{
          title: 'My Share Code',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerShadowVisible: false,
          headerBackTitle: '',
        }}
      />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: insets.bottom + 24, gap: 28 }}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.text, textAlign: 'center' }}>Share Your Profile</Text>
          <Text style={{ fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 }}>
            Have someone scan this barcode to add you to their roster instantly
          </Text>
        </View>

        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28, alignItems: 'center', gap: 16, width: '100%', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, borderWidth: 1, borderColor: COLORS.border }}>
          {loading ? (
            <View style={{ height: 120, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
          ) : error ? (
            <View style={{ height: 120, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Text style={{ color: COLORS.danger, fontSize: 14, textAlign: 'center' }}>{error}</Text>
              <AnimatedPressable onPress={() => { console.log('[ShareProfile] Try again pressed'); generate(); }} style={{ backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 }}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>Try Again</Text>
              </AnimatedPressable>
            </View>
          ) : token ? (
            <>
              <Barcode
                value={token}
                options={{ format: 'CODE128', background: '#FFFFFF', lineColor: '#1A1A1A', width: 2.5, height: 100 }}
                style={{ width: '100%' }}
              />
              <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: 6 }}>{token}</Text>
              {expiryText ? <Text style={{ fontSize: 12, color: COLORS.textTertiary }}>{expiryText}</Text> : null}
            </>
          ) : null}
        </View>

        {!loading && !error && token ? (
          <View style={{ width: '100%', gap: 12 }}>
            <AnimatedPressable onPress={handleShare} style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <Share2 size={18} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Share Code</Text>
            </AnimatedPressable>
            <AnimatedPressable onPress={() => { console.log('[ShareProfile] Generate new code pressed'); generate(); }} style={{ backgroundColor: COLORS.surface, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: COLORS.border }}>
              <RefreshCw size={16} color={COLORS.textSecondary} />
              <Text style={{ color: COLORS.textSecondary, fontSize: 15, fontWeight: '600' }}>Generate New Code</Text>
            </AnimatedPressable>
          </View>
        ) : null}

        <Text style={{ fontSize: 13, color: COLORS.textTertiary, textAlign: 'center', lineHeight: 19 }}>
          Codes are valid for 48 hours. Only your name, photo, and basic info will be shared — never your notes or ratings.
        </Text>
      </View>
    </View>
  );
}
