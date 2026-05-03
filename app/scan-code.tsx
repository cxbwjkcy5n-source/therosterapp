import React, { useState, useRef, Component } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TextInput, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { apiGet } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Error boundary to catch native camera crashes (e.g. Old Architecture + worklets)
class CameraErrorBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export default function ScanCodeScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [cameraFailed, setCameraFailed] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const hasScanned = useRef(false);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (hasScanned.current) return;
    hasScanned.current = true;
    setScanned(true);
    setResolving(true);
    const token = data.trim().toUpperCase();
    console.log('[ScanCode] Barcode scanned, token:', token);
    try {
      console.log('[ScanCode] GET /api/share/resolve/' + token);
      const profile = await apiGet<{
        name: string | null; photo_url: string | null; age: number | null;
        occupation: string | null; location: string | null; instagram: string | null;
        tiktok: string | null; twitter_x: string | null; phone_number: string | null;
      }>(`/api/share/resolve/${token}`);

      console.log('[ScanCode] Profile resolved, navigating to add-person');
      router.replace({
        pathname: '/add-person',
        params: {
          prefill_name: profile.name ?? '',
          prefill_photo_url: profile.photo_url ?? '',
          prefill_age: profile.age?.toString() ?? '',
          prefill_occupation: profile.occupation ?? '',
          prefill_location: profile.location ?? '',
          prefill_instagram: profile.instagram ?? '',
          prefill_tiktok: profile.tiktok ?? '',
          prefill_twitter_x: profile.twitter_x ?? '',
          prefill_phone_number: profile.phone_number ?? '',
        },
      });
    } catch (e: any) {
      const msg = e?.message || '';
      console.error('[ScanCode] Resolve failed:', msg);
      const isExpired = msg.includes('410') || msg.includes('expired');
      const isNotFound = msg.includes('404') || msg.includes('not found');
      Alert.alert(
        isExpired ? 'Code Expired' : isNotFound ? 'Invalid Code' : 'Error',
        isExpired
          ? 'This code has expired. Ask them to generate a new one.'
          : isNotFound
          ? 'This code was not recognized.'
          : 'Could not resolve this code. Please try again.',
        [{ text: 'OK', onPress: () => { hasScanned.current = false; setScanned(false); } }]
      );
    } finally {
      setResolving(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim()) return;
    console.log('[ScanCode] Manual code submitted:', manualCode.trim());
    handleBarCodeScanned({ data: manualCode.trim() });
  };

  const manualEntryFallback = (
    <View style={{ flex: 1, backgroundColor: COLORS.background, padding: 32, paddingTop: insets.top + 20 }}>
      <Stack.Screen options={{
        title: 'Enter Code',
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
        headerShadowVisible: false,
        headerBackTitle: '',
      }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.text }}>Enter Code Manually</Text>
        <AnimatedPressable
          onPress={() => { console.log('[ScanCode] Manual entry close pressed'); router.back(); }}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={18} color={COLORS.text} />
        </AnimatedPressable>
      </View>
      <Text style={{ fontSize: 15, color: COLORS.textSecondary, marginBottom: 24, lineHeight: 22 }}>
        Type the code shown on their profile to add them to your roster.
      </Text>
      <TextInput
        style={{
          backgroundColor: COLORS.card,
          color: COLORS.text,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 18,
          fontWeight: '600',
          letterSpacing: 2,
          borderWidth: 1,
          borderColor: (COLORS as any).border ?? '#333',
          marginBottom: 16,
        }}
        placeholder="e.g. ABC123"
        placeholderTextColor={COLORS.textSecondary}
        value={manualCode}
        onChangeText={setManualCode}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={handleManualSubmit}
      />
      {resolving ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 8 }} />
      ) : (
        <TouchableOpacity
          onPress={() => { console.log('[ScanCode] Submit code button pressed'); handleManualSubmit(); }}
          style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
          activeOpacity={0.8}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Submit Code</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 }}>
        <Stack.Screen options={{
          title: 'Scan Code',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerShadowVisible: false,
          headerBackTitle: '',
        }} />
        <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text, textAlign: 'center' }}>Camera Access Needed</Text>
        <Text style={{ fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 }}>
          Allow camera access to scan someone's barcode and add them to your roster.
        </Text>
        <AnimatedPressable
          onPress={() => { console.log('[ScanCode] Request camera permission pressed'); requestPermission(); }}
          style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Allow Camera</Text>
        </AnimatedPressable>
      </View>
    );
  }

  if (cameraFailed) return manualEntryFallback;

  const scannerSettings = { barcodeTypes: ['code128', 'code39', 'qr'] as any };

  let cameraView: React.ReactNode = null;
  try {
    cameraView = (
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={scannerSettings}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
    );
  } catch {
    // If CameraView throws synchronously during construction, fall back
    setCameraFailed(true);
  }

  return (
    <CameraErrorBoundary fallback={manualEntryFallback}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <Stack.Screen options={{ headerShown: false, title: 'Scan Code' }} />
        {cameraView}
        <View style={[StyleSheet.absoluteFillObject, { pointerEvents: 'box-none' }]}>
          <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>Scan Code</Text>
            <AnimatedPressable
              onPress={() => { console.log('[ScanCode] Close pressed'); router.back(); }}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={18} color="#fff" />
            </AnimatedPressable>
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 }}>
            <View style={{ width: 280, height: 140, borderRadius: 12, borderWidth: 2, borderColor: resolving ? COLORS.success : '#fff', backgroundColor: 'transparent' }} />
            {resolving ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 }}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Looking up profile...</Text>
              </View>
            ) : (
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '500', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 }}>
                Point at someone's barcode
              </Text>
            )}
          </View>
          <View style={{ paddingBottom: insets.bottom + 32, alignItems: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>Ask them to open "My Share Code" in their profile</Text>
          </View>
        </View>
      </View>
    </CameraErrorBoundary>
  );
}
