import React, { useState } from 'react';
import { View, Text, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { apiPost } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const REASONS = [
  'Lost interest',
  'Taking a break',
  'They ghosted',
  'Not compatible',
  'Situationship ended',
  'Other',
];

export default function BenchReasonScreen() {
  const { personId, personName } = useLocalSearchParams<{ personId: string; personName: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [saving, setSaving] = useState(false);

  const finalReason = selectedReason === 'Other' ? customReason : selectedReason;
  const canSave = !!selectedReason && (selectedReason !== 'Other' || customReason.trim().length > 0);

  const handleBench = async () => {
    if (!canSave || !personId) return;
    console.log('[BenchReason] Benching person:', personId, 'reason:', finalReason);
    setSaving(true);
    try {
      await apiPost(`/api/persons/${personId}/bench`, { reason: finalReason });
      console.log('[BenchReason] Successfully benched:', personId, '— navigating to bench tab');
      router.replace('/(tabs)/(bench)');
    } catch (e: any) {
      console.error('[BenchReason] Failed to bench:', e);
      Alert.alert('Error', 'Could not bench this person. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Drag handle + close button */}
      <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8, paddingHorizontal: 16 }}>
        {/* Drag handle */}
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 8 }} />
        {/* Close button — absolute top right */}
        <View style={{ position: 'absolute', top: 12, right: 16 }}>
          <AnimatedPressable
            onPress={() => {
              console.log('[BenchReason] Close pressed');
              router.back();
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} color={colors.textSecondary} />
          </AnimatedPressable>
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', marginBottom: 6 }}>
          Moving to Bench
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 15, marginBottom: 28 }}>
          Why are you benching{personName ? ` ${personName}` : ''}?
        </Text>

        <View style={{ gap: 10, marginBottom: 20 }}>
          {REASONS.map((reason) => {
            const isSelected = selectedReason === reason;
            return (
              <AnimatedPressable
                key={reason}
                onPress={() => {
                  console.log('[BenchReason] Reason selected:', reason);
                  setSelectedReason(reason);
                }}
              >
                <View
                  style={{
                    backgroundColor: isSelected ? colors.primaryMuted : colors.surface,
                    borderRadius: 12,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: isSelected ? colors.primary : colors.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: isSelected ? colors.primary : colors.textTertiary,
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                      marginRight: 12,
                    }}
                  />
                  <Text
                    style={{
                      color: isSelected ? colors.text : colors.textSecondary,
                      fontSize: 15,
                      fontWeight: isSelected ? '600' : '400',
                    }}
                  >
                    {reason}
                  </Text>
                </View>
              </AnimatedPressable>
            );
          })}
        </View>

        {selectedReason === 'Other' && (
          <TextInput
            value={customReason}
            onChangeText={setCustomReason}
            placeholder="Describe the reason..."
            placeholderTextColor={colors.textTertiary}
            multiline
            style={{
              backgroundColor: colors.surfaceSecondary,
              borderRadius: 12,
              padding: 14,
              color: colors.text,
              fontSize: 15,
              borderWidth: 1,
              borderColor: colors.border,
              minHeight: 80,
              marginBottom: 20,
            }}
          />
        )}
      </ScrollView>

      {/* Button always pinned at bottom */}
      <View style={{ paddingHorizontal: 24, paddingBottom: Math.max(insets.bottom, 16) + 8, paddingTop: 8, backgroundColor: colors.background }}>
        <AnimatedPressable
          onPress={handleBench}
          disabled={!canSave || saving}
          style={{
            backgroundColor: canSave ? colors.primary : colors.surfaceSecondary,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
          }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: canSave ? '#fff' : colors.textTertiary, fontSize: 16, fontWeight: '700' }}>
              Move to Bench
            </Text>
          )}
        </AnimatedPressable>
      </View>
    </View>
  );
}
