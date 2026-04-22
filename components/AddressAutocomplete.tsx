import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { apiGet } from '@/utils/api';
import { COLORS } from '@/constants/Colors';

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
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const sessionToken = useRef<string>('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchPredictions = useCallback(async (input: string) => {
    if (!sessionToken.current) {
      sessionToken.current = generateToken();
    }
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
    } catch (e) {
      console.error('[AddressAutocomplete] Fetch error (silent):', e);
      if (isMounted.current) {
        setShowDropdown(false);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
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
    debounceTimer.current = setTimeout(() => {
      fetchPredictions(text);
    }, 350);
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

  const mainText = (pred: Prediction) => pred.structured_formatting?.main_text || pred.description;
  const secondaryText = (pred: Prediction) => pred.structured_formatting?.secondary_text || '';

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={styles.label}>{label}</Text>
      ) : null}
      <View style={styles.inputWrapper}>
        <TextInput
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder || 'Search address...'}
          placeholderTextColor={COLORS.textTertiary}
          style={styles.input}
        />
        {loading ? (
          <View style={styles.loadingIndicator}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
        ) : null}
      </View>

      {showDropdown ? (
        <View style={styles.dropdown}>
          {noResults ? (
            <View style={styles.noResultsRow}>
              <Text style={styles.noResultsText}>No results found</Text>
            </View>
          ) : (
            predictions.map((pred, index) => {
              const isLast = index === predictions.length - 1;
              const main = mainText(pred);
              const secondary = secondaryText(pred);
              return (
                <Pressable
                  key={pred.place_id}
                  onPress={() => handleSelect(pred)}
                  style={({ pressed }) => [
                    styles.suggestionRow,
                    !isLast && styles.suggestionRowBorder,
                    pressed && styles.suggestionRowPressed,
                  ]}
                >
                  <Text style={styles.mainText} numberOfLines={1}>{main}</Text>
                  {secondary ? (
                    <Text style={styles.secondaryText} numberOfLines={1}>{secondary}</Text>
                  ) : null}
                </Pressable>
              );
            })
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 999,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#1A1A1A',
    fontSize: 14,
  },
  loadingIndicator: {
    paddingRight: 12,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    zIndex: 999,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    marginTop: 4,
    overflow: 'hidden',
  },
  suggestionRow: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  suggestionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  suggestionRowPressed: {
    backgroundColor: '#F5F5F5',
  },
  mainText: {
    color: '#1A1A1A',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryText: {
    color: '#666666',
    fontSize: 12,
    marginTop: 2,
  },
  noResultsRow: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  noResultsText: {
    color: '#666666',
    fontSize: 14,
  },
});
