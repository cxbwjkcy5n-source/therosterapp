import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { apiGet } from '@/utils/api';
import { useTheme } from '@/contexts/ThemeContext';

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (address: string) => void;
  placeholder?: string;
  label?: string;
}

function generateToken() {
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
}

export function AddressAutocomplete({ value, onChangeText, onSelect, placeholder, label }: Props) {
  const { colors } = useTheme();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [inputLayout, setInputLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const sessionToken = useRef<string>('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);
  const inputRef = useRef<View>(null);
  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  const fetchPredictions = useCallback(async (input: string) => {
    if (!sessionToken.current) sessionToken.current = generateToken();
    const token = sessionToken.current;
    console.log('[AddressAutocomplete] Fetching predictions for:', input);
    setLoading(true);
    try {
      const data = await apiGet<{ predictions: Prediction[] }>(
        `/api/places/autocomplete?input=${encodeURIComponent(input)}&sessiontoken=${token}`
      );
      if (!isMounted.current) return;
      const preds = data?.predictions || [];
      console.log('[AddressAutocomplete] Got', preds.length, 'predictions');
      setPredictions(preds);
      setNoResults(preds.length === 0);
      setShowDropdown(true);
      textInputRef.current?.focus();
    } catch (e) {
      console.error('[AddressAutocomplete] Fetch error (silent):', e);
      if (isMounted.current) setShowDropdown(false);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  const handleChangeText = useCallback((text: string) => {
    onChangeText(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (text.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      setNoResults(false);
      return;
    }
    debounceTimer.current = setTimeout(() => fetchPredictions(text), 350);
  }, [onChangeText, fetchPredictions]);

  const handleSelect = useCallback((prediction: Prediction) => {
    console.log('[AddressAutocomplete] Address selected:', prediction.description);
    onSelect(prediction.description);
    onChangeText(prediction.description);
    setShowDropdown(false);
    setPredictions([]);
    setNoResults(false);
    sessionToken.current = '';
  }, [onSelect, onChangeText]);

  const measureInput = () => {
    inputRef.current?.measureInWindow((x, y, width, height) => {
      setInputLayout({ x, y, width, height });
    });
  };

  const dropdownTop = inputLayout ? inputLayout.y + inputLayout.height + 4 : 0;
  const dropdownLeft = inputLayout ? inputLayout.x : 0;
  const dropdownWidth = inputLayout ? inputLayout.width : 300;

  return (
    <View ref={inputRef} onLayout={measureInput}>
      {label ? (
        <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 6 }}>{label}</Text>
      ) : null}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
      }}>
        <TextInput
          ref={textInputRef}
          value={value}
          onChangeText={handleChangeText}
          onFocus={measureInput}
          placeholder={placeholder || 'Search city or neighborhood...'}
          placeholderTextColor={colors.textTertiary}
          style={{
            flex: 1,
            paddingHorizontal: 14,
            paddingVertical: 13,
            color: colors.text,
            fontSize: 14,
          }}
        />
        {loading ? (
          <View style={{ paddingRight: 12 }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : null}
      </View>

      <Modal
        visible={showDropdown && !!inputLayout}
        transparent
        animationType="none"
        onRequestClose={() => setShowDropdown(false)}
        onShow={() => {}}
      >
        <Pressable style={{ flex: 1 }} onPress={() => setShowDropdown(false)}>
          <View
            style={{
              position: 'absolute',
              top: dropdownTop,
              left: dropdownLeft,
              width: dropdownWidth,
              backgroundColor: colors.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
              overflow: 'hidden',
              maxHeight: 220,
            }}
          >
            <ScrollView keyboardShouldPersistTaps="always" bounces={false}>
              {noResults ? (
                <View style={{ minHeight: 44, paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'center' }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>No results found</Text>
                </View>
              ) : (
                predictions.map((pred, index) => {
                  const isLast = index === predictions.length - 1;
                  const main = pred.structured_formatting?.main_text || pred.description;
                  const secondary = pred.structured_formatting?.secondary_text || '';
                  return (
                    <Pressable
                      key={pred.place_id}
                      onPress={() => handleSelect(pred)}
                      style={({ pressed }) => ({
                        minHeight: 44,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        justifyContent: 'center',
                        borderBottomWidth: isLast ? 0 : 1,
                        borderBottomColor: colors.border,
                        backgroundColor: pressed ? colors.surfaceSecondary : 'transparent',
                      })}
                    >
                      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>{main}</Text>
                      {secondary ? (
                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{secondary}</Text>
                      ) : null}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
