import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  Animated,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { X as XIcon, Plus, Trash2 } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { apiGet, apiPost, apiDelete } from '@/utils/api';

const RED = '#E53935';

const MILESTONE_TYPES = [
  { type: 'first_date', label: 'First Date', emoji: '📅' },
  { type: 'first_kiss', label: 'First Kiss', emoji: '💋' },
  { type: 'met_friends', label: 'Met Their Friends', emoji: '👥' },
  { type: 'met_family', label: 'Met Their Family', emoji: '👨‍👩‍👧' },
  { type: 'exclusivity_talk', label: 'Exclusivity Talk', emoji: '💬' },
  { type: 'became_official', label: 'Became Official', emoji: '💑' },
  { type: 'first_trip', label: 'First Trip Together', emoji: '✈️' },
  { type: 'custom', label: 'Custom Milestone', emoji: '⭐' },
];

interface Milestone {
  id: string;
  person_id: string;
  type: string;
  label?: string;
  emoji?: string;
  date: string;
  notes?: string;
  created_at: string;
}

function formatMilestoneDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MilestonesScreen() {
  const params = useLocalSearchParams<{ personId: string; personName: string }>();
  const personId = Array.isArray(params.personId) ? params.personId[0] : params.personId;
  const personName = Array.isArray(params.personName) ? params.personName[0] : params.personName;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);

  // Add form state
  const [selectedType, setSelectedType] = useState(MILESTONE_TYPES[0].type);
  const [customLabel, setCustomLabel] = useState('');
  const [milestoneDate, setMilestoneDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const sheetAnim = useRef(new Animated.Value(0)).current;

  const loadMilestones = useCallback(async () => {
    if (!personId) return;
    console.log('[Milestones] Loading milestones for person:', personId);
    try {
      const data = await apiGet<{ milestones: Milestone[] }>(`/api/persons/${personId}/milestones`);
      console.log('[Milestones] Loaded', data.milestones?.length ?? 0, 'milestones');
      setMilestones(data.milestones || []);
    } catch (e) {
      console.error('[Milestones] Failed to load milestones:', e);
    } finally {
      setLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    loadMilestones();
  }, [loadMilestones]);

  const openAddSheet = () => {
    console.log('[Milestones] Add milestone sheet opened');
    setShowAddSheet(true);
    Animated.spring(sheetAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
  };

  const closeAddSheet = () => {
    console.log('[Milestones] Add milestone sheet closed');
    Animated.timing(sheetAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setShowAddSheet(false);
      setSelectedType(MILESTONE_TYPES[0].type);
      setCustomLabel('');
      setMilestoneDate(new Date());
      setNotes('');
    });
  };

  const handleSave = async () => {
    const typeInfo = MILESTONE_TYPES.find((m) => m.type === selectedType);
    const label = selectedType === 'custom' ? customLabel.trim() : typeInfo?.label;
    if (!label) {
      Alert.alert('Missing info', 'Please enter a label for this milestone.');
      return;
    }
    console.log('[Milestones] Saving milestone:', selectedType, label, milestoneDate.toISOString());
    setSaving(true);
    try {
      await apiPost(`/api/persons/${personId}/milestones`, {
        type: selectedType,
        label,
        emoji: typeInfo?.emoji ?? '⭐',
        date: milestoneDate.toISOString(),
        notes: notes.trim() || undefined,
      });
      console.log('[Milestones] Milestone saved successfully');
      closeAddSheet();
      await loadMilestones();
    } catch (e: any) {
      console.error('[Milestones] Failed to save milestone:', e);
      Alert.alert('Error', e?.message || 'Could not save milestone. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (milestone: Milestone) => {
    console.log('[Milestones] Delete milestone pressed:', milestone.id);
    Alert.alert('Delete milestone?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiDelete(`/api/milestones/${milestone.id}`);
            console.log('[Milestones] Milestone deleted:', milestone.id);
            setMilestones((prev) => prev.filter((m) => m.id !== milestone.id));
          } catch (e) {
            console.error('[Milestones] Failed to delete milestone:', e);
            Alert.alert('Error', 'Could not delete milestone.');
          }
        },
      },
    ]);
  };

  const selectedTypeInfo = MILESTONE_TYPES.find((m) => m.type === selectedType);
  const milestoneDateLabel = milestoneDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

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
        justifyContent: 'space-between',
      }}>
        <Pressable
          onPress={() => {
            console.log('[Milestones] Back pressed');
            router.back();
          }}
          style={{ padding: 4 }}
          hitSlop={8}
        >
          <XIcon size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>
            {'Milestones'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 1 }}>
            {personName}
          </Text>
        </View>
        <View style={{ width: 30 }} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={RED} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        >
          {milestones.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>💑</Text>
              <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: 8 }}>
                No milestones yet
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
                Add your first one below.
              </Text>
            </View>
          ) : (
            <View>
              {milestones.map((milestone, index) => {
                const isLast = index === milestones.length - 1;
                const typeInfo = MILESTONE_TYPES.find((m) => m.type === milestone.type);
                const emoji = milestone.emoji || typeInfo?.emoji || '⭐';
                const label = milestone.label || typeInfo?.label || milestone.type;
                const dateLabel = formatMilestoneDate(milestone.date);
                return (
                  <View key={milestone.id} style={{ flexDirection: 'row', gap: 14, marginBottom: isLast ? 0 : 4 }}>
                    {/* Timeline column */}
                    <View style={{ alignItems: 'center', width: 36 }}>
                      <View style={{
                        width: 36, height: 36, borderRadius: 18,
                        backgroundColor: 'rgba(236,72,153,0.1)',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 18 }}>{emoji}</Text>
                      </View>
                      {!isLast && (
                        <View style={{ width: 2, flex: 1, backgroundColor: colors.border, marginTop: 4, minHeight: 24 }} />
                      )}
                    </View>

                    {/* Content */}
                    <Pressable
                      onLongPress={() => handleDelete(milestone)}
                      delayLongPress={600}
                      style={{
                        flex: 1,
                        backgroundColor: colors.surface,
                        borderRadius: 14,
                        padding: 14,
                        marginBottom: isLast ? 0 : 16,
                        shadowColor: '#000',
                        shadowOpacity: 0.05,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: 2,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', flex: 1 }}>{label}</Text>
                        <Pressable onPress={() => handleDelete(milestone)} hitSlop={8}>
                          <Trash2 size={14} color={colors.textTertiary} />
                        </Pressable>
                      </View>
                      <Text style={{ color: '#EC4899', fontSize: 12, fontWeight: '600', marginBottom: milestone.notes ? 6 : 0 }}>
                        {dateLabel}
                      </Text>
                      {milestone.notes ? (
                        <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18, fontStyle: 'italic' }}>
                          {milestone.notes}
                        </Text>
                      ) : null}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* FAB */}
      <View style={{ position: 'absolute', bottom: insets.bottom + 24, right: 20 }}>
        <Pressable
          onPress={openAddSheet}
          style={{
            width: 56, height: 56, borderRadius: 28,
            backgroundColor: '#EC4899',
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#EC4899',
            shadowOpacity: 0.4,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          <Plus size={24} color="#fff" />
        </Pressable>
      </View>

      {/* Add Sheet Modal */}
      <Modal visible={showAddSheet} transparent animationType="slide" onRequestClose={closeAddSheet}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '90%',
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 0 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Add Milestone</Text>
              <Pressable onPress={closeAddSheet} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
                <XIcon size={16} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 16 }} keyboardShouldPersistTaps="handled">
              {/* Type picker */}
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10 }}>
                MILESTONE TYPE
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {MILESTONE_TYPES.map((mt) => {
                    const isSelected = selectedType === mt.type;
                    return (
                      <Pressable
                        key={mt.type}
                        onPress={() => {
                          console.log('[Milestones] Milestone type selected:', mt.type);
                          setSelectedType(mt.type);
                        }}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
                          backgroundColor: isSelected ? '#EC4899' : colors.surfaceSecondary,
                          borderWidth: 1.5,
                          borderColor: isSelected ? '#EC4899' : colors.border,
                          flexDirection: 'row', alignItems: 'center', gap: 6,
                        }}
                      >
                        <Text style={{ fontSize: 16 }}>{mt.emoji}</Text>
                        <Text style={{ color: isSelected ? '#fff' : colors.text, fontSize: 13, fontWeight: '600' }}>
                          {mt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Custom label if type is custom */}
              {selectedType === 'custom' && (
                <>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10 }}>
                    CUSTOM LABEL
                  </Text>
                  <TextInput
                    value={customLabel}
                    onChangeText={setCustomLabel}
                    placeholder="e.g. First vacation together..."
                    placeholderTextColor={colors.textTertiary}
                    style={{
                      backgroundColor: colors.surfaceSecondary, borderRadius: 12, padding: 14,
                      color: colors.text, fontSize: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 20,
                    }}
                  />
                </>
              )}

              {/* Date picker */}
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10 }}>
                DATE
              </Text>
              <Pressable
                onPress={() => {
                  console.log('[Milestones] Date picker opened');
                  setShowDatePicker(true);
                }}
                style={{
                  backgroundColor: colors.surfaceSecondary, borderRadius: 12, padding: 14,
                  borderWidth: 1, borderColor: colors.border, marginBottom: 20,
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                }}
              >
                <Text style={{ fontSize: 16 }}>📅</Text>
                <Text style={{ color: colors.text, fontSize: 14 }}>{milestoneDateLabel}</Text>
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={milestoneDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, d) => {
                    setShowDatePicker(false);
                    if (d) {
                      console.log('[Milestones] Date selected:', d);
                      setMilestoneDate(d);
                    }
                  }}
                />
              )}

              {/* Notes */}
              <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 10 }}>
                NOTES (OPTIONAL)
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Any details you want to remember..."
                placeholderTextColor={colors.textTertiary}
                multiline
                style={{
                  backgroundColor: colors.surfaceSecondary, borderRadius: 12, padding: 14,
                  color: colors.text, fontSize: 14, borderWidth: 1, borderColor: colors.border,
                  minHeight: 80, textAlignVertical: 'top', marginBottom: 20,
                }}
              />

              {/* Save button */}
              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={{
                  backgroundColor: '#EC4899', borderRadius: 14, height: 52,
                  alignItems: 'center', justifyContent: 'center', opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
                    {selectedTypeInfo?.emoji}
                    {'  Save Milestone'}
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
