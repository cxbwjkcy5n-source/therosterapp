import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { X as XIcon, Plus, AlertTriangle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { apiGet, apiPost, apiDelete } from '@/utils/api';

const RED = '#E53935';

interface DealBreaker {
  id: string;
  text: string;
  created_at: string;
}

interface FlaggedPerson {
  id: string;
  name: string;
  photo_url?: string;
  matched_deal_breakers: string[];
}

export default function DealBreakersScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [dealBreakers, setDealBreakers] = useState<DealBreaker[]>([]);
  const [flaggedPeople, setFlaggedPeople] = useState<FlaggedPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState('');
  const [adding, setAdding] = useState(false);

  const loadData = useCallback(async () => {
    console.log('[DealBreakers] Loading deal breakers and flagged people');
    try {
      const [dbRes, flagsRes] = await Promise.all([
        apiGet<{ deal_breakers: DealBreaker[] }>('/api/deal-breakers'),
        apiGet<{ persons: FlaggedPerson[] }>('/api/persons/deal-breaker-flags'),
      ]);
      console.log('[DealBreakers] Loaded', dbRes.deal_breakers?.length ?? 0, 'deal breakers,', flagsRes.persons?.length ?? 0, 'flagged people');
      setDealBreakers(dbRes.deal_breakers || []);
      setFlaggedPeople(flagsRes.persons || []);
    } catch (e) {
      console.error('[DealBreakers] Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAdd = async () => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    console.log('[DealBreakers] Adding deal breaker:', trimmed);
    setAdding(true);
    try {
      await apiPost('/api/deal-breakers', { text: trimmed });
      console.log('[DealBreakers] Deal breaker added successfully');
      setNewText('');
      await loadData();
    } catch (e: any) {
      console.error('[DealBreakers] Failed to add deal breaker:', e);
      Alert.alert('Error', e?.message || 'Could not add deal breaker.');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = (db: DealBreaker) => {
    console.log('[DealBreakers] Delete deal breaker pressed:', db.id, db.text);
    Alert.alert('Remove deal breaker?', `"${db.text}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiDelete(`/api/deal-breakers/${db.id}`);
            console.log('[DealBreakers] Deal breaker deleted:', db.id);
            setDealBreakers((prev) => prev.filter((d) => d.id !== db.id));
          } catch (e) {
            console.error('[DealBreakers] Failed to delete deal breaker:', e);
            Alert.alert('Error', 'Could not remove deal breaker.');
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        paddingTop: insets.top + 12,
        paddingBottom: 16,
        paddingHorizontal: 20,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <Pressable
          onPress={() => {
            console.log('[DealBreakers] Back pressed');
            router.back();
          }}
          style={{ padding: 4, marginRight: 12 }}
          hitSlop={8}
        >
          <XIcon size={22} color={colors.text} />
        </Pressable>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', flex: 1 }}>
          Deal Breakers
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={RED} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section 1: Your Deal Breakers */}
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>
            Your Deal Breakers
          </Text>

          {dealBreakers.length === 0 ? (
            <View style={{
              backgroundColor: colors.surface, borderRadius: 14, padding: 20,
              alignItems: 'center', marginBottom: 16,
              borderWidth: 1, borderColor: colors.border,
            }}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>🚫</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>
                No deal breakers set yet. Add things you absolutely cannot accept.
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {dealBreakers.map((db) => (
                <View
                  key={db.id}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    backgroundColor: 'rgba(229,57,53,0.08)',
                    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
                    borderWidth: 1, borderColor: 'rgba(229,57,53,0.2)',
                  }}
                >
                  <Text style={{ color: RED, fontSize: 13, fontWeight: '600' }}>{db.text}</Text>
                  <Pressable
                    onPress={() => handleDelete(db)}
                    hitSlop={8}
                  >
                    <XIcon size={14} color={RED} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {/* Add input */}
          <View style={{
            flexDirection: 'row', gap: 10, alignItems: 'center',
            backgroundColor: colors.surface, borderRadius: 14, padding: 14,
            borderWidth: 1, borderColor: colors.border, marginBottom: 32,
          }}>
            <TextInput
              value={newText}
              onChangeText={setNewText}
              placeholder="e.g. Doesn't want kids, Smoker..."
              placeholderTextColor={colors.textTertiary}
              style={{ flex: 1, color: colors.text, fontSize: 14 }}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            <Pressable
              onPress={handleAdd}
              disabled={adding || !newText.trim()}
              style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: newText.trim() ? RED : colors.surfaceSecondary,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              {adding ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Plus size={18} color={newText.trim() ? '#fff' : colors.textTertiary} />
              )}
            </Pressable>
          </View>

          {/* Section 2: Flagged People */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <AlertTriangle size={14} color="#FF9800" />
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
              Flagged People
            </Text>
          </View>

          {flaggedPeople.length === 0 ? (
            <View style={{
              backgroundColor: colors.surface, borderRadius: 14, padding: 20,
              alignItems: 'center',
              borderWidth: 1, borderColor: colors.border,
            }}>
              <Text style={{ fontSize: 32, marginBottom: 8 }}>✅</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>
                No one on your roster matches your deal breakers.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {flaggedPeople.map((person) => {
                const initials = person.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <Pressable
                    key={person.id}
                    onPress={() => {
                      console.log('[DealBreakers] Flagged person tapped:', person.id, person.name);
                      router.push(`/person/${person.id}`);
                    }}
                    style={{
                      backgroundColor: colors.surface, borderRadius: 14, padding: 14,
                      borderWidth: 1, borderColor: 'rgba(229,57,53,0.2)',
                      flexDirection: 'row', alignItems: 'flex-start', gap: 12,
                    }}
                  >
                    {/* Avatar */}
                    <View style={{
                      width: 44, height: 44, borderRadius: 22,
                      backgroundColor: RED, alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{initials}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 6 }}>
                        {person.name}
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {(person.matched_deal_breakers || []).map((flag, i) => {
                          const flagKey = String(i);
                          return (
                            <View
                              key={flagKey}
                              style={{
                                backgroundColor: 'rgba(229,57,53,0.1)',
                                borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
                              }}
                            >
                              <Text style={{ color: RED, fontSize: 12, fontWeight: '600' }}>{flag}</Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
