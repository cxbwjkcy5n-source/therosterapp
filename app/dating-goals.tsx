import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ArrowLeft, Target, Plus, X, Check } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@/contexts/ThemeContext';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/utils/api';

interface Goal {
  id: string;
  title: string;
  target_date?: string;
  completed: boolean;
  completed_at?: string;
  person_id?: string;
  created_at: string;
}

interface Person {
  id: string;
  name: string;
}

export default function DatingGoalsScreen() {
  const { colors } = useTheme();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [addSheetVisible, setAddSheetVisible] = useState(false);

  // Add form state
  const [newTitle, setNewTitle] = useState('');
  const [newTargetDate, setNewTargetDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newPersonId, setNewPersonId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    console.log('[DatingGoals] Loading goals and persons');
    try {
      const [goalsRes, personsRes] = await Promise.all([
        apiGet<{ goals: Goal[] }>('/api/dating-goals'),
        apiGet<{ persons: Person[] }>('/api/persons'),
      ]);
      console.log('[DatingGoals] Loaded', goalsRes.goals?.length ?? 0, 'goals,', personsRes.persons?.length ?? 0, 'persons');
      setGoals(goalsRes.goals || []);
      setPersons(personsRes.persons || []);
    } catch (e) {
      console.error('[DatingGoals] Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleComplete = async (goal: Goal) => {
    if (goal.completed) return;
    console.log('[DatingGoals] Complete goal pressed:', goal.id, goal.title);
    try {
      const res = await apiPatch<{ goal: Goal }>(`/api/dating-goals/${goal.id}`, { completed: true });
      console.log('[DatingGoals] Goal completed:', goal.id);
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? res.goal : g)));
    } catch (e) {
      console.error('[DatingGoals] Failed to complete goal:', e);
      Alert.alert('Error', 'Could not complete goal.');
    }
  };

  const handleDelete = (goal: Goal) => {
    console.log('[DatingGoals] Long press delete on goal:', goal.id);
    Alert.alert('Delete Goal', `Remove "${goal.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          console.log('[DatingGoals] Deleting goal:', goal.id);
          try {
            await apiDelete(`/api/dating-goals/${goal.id}`);
            setGoals((prev) => prev.filter((g) => g.id !== goal.id));
            console.log('[DatingGoals] Goal deleted:', goal.id);
          } catch (e) {
            console.error('[DatingGoals] Failed to delete goal:', e);
            Alert.alert('Error', 'Could not delete goal.');
          }
        },
      },
    ]);
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) {
      Alert.alert('Title required', 'Please enter a goal title.');
      return;
    }
    console.log('[DatingGoals] Add goal pressed, title:', newTitle, 'targetDate:', newTargetDate, 'personId:', newPersonId);
    setSaving(true);
    try {
      const body: any = { title: newTitle.trim() };
      if (newTargetDate) body.target_date = newTargetDate.toISOString();
      if (newPersonId) body.person_id = newPersonId;
      const res = await apiPost<{ goal: Goal }>('/api/dating-goals', body);
      console.log('[DatingGoals] Goal created:', res.goal?.id);
      setGoals((prev) => [res.goal, ...prev]);
      setAddSheetVisible(false);
      setNewTitle('');
      setNewTargetDate(null);
      setNewPersonId(null);
    } catch (e) {
      console.error('[DatingGoals] Failed to create goal:', e);
      Alert.alert('Error', 'Could not create goal.');
    } finally {
      setSaving(false);
    }
  };

  const activeGoals = goals.filter((g) => !g.completed);
  const completedGoals = goals.filter((g) => g.completed);
  const totalGoals = goals.length;
  const completedCount = completedGoals.length;
  const progressPct = totalGoals > 0 ? completedCount / totalGoals : 0;
  const progressWidth = `${Math.round(progressPct * 100)}%` as any;
  const progressLabel = `${completedCount} of ${totalGoals} goals completed`;

  const renderGoalCard = (goal: Goal) => {
    const linkedPerson = goal.person_id ? persons.find((p) => p.id === goal.person_id) : null;
    const personName = linkedPerson?.name ?? null;
    const targetDateLabel = goal.target_date
      ? new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null;

    return (
      <Pressable
        key={goal.id}
        delayLongPress={600}
        onLongPress={() => handleDelete(goal)}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 14,
          padding: 14,
          borderWidth: 1,
          borderColor: goal.completed ? colors.border : colors.border,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
          opacity: goal.completed ? 0.7 : 1,
        }}
      >
        {/* Checkbox */}
        <Pressable
          onPress={() => handleComplete(goal)}
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            borderWidth: 2,
            borderColor: goal.completed ? '#22C55E' : colors.border,
            backgroundColor: goal.completed ? '#22C55E' : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 1,
          }}
        >
          {goal.completed ? <Check size={14} color="#fff" /> : null}
        </Pressable>

        {/* Content */}
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            style={{
              color: colors.text,
              fontSize: 15,
              fontWeight: '600',
              textDecorationLine: goal.completed ? 'line-through' : 'none',
            }}
          >
            {goal.title}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {targetDateLabel ? (
              <View
                style={{
                  backgroundColor: 'rgba(99,102,241,0.1)',
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ color: '#6366F1', fontSize: 11, fontWeight: '600' }}>
                  📅 {targetDateLabel}
                </Text>
              </View>
            ) : null}
            {personName ? (
              <View
                style={{
                  backgroundColor: 'rgba(236,72,153,0.1)',
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ color: '#EC4899', fontSize: 11, fontWeight: '600' }}>
                  👤 {personName}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Completed badge */}
        {goal.completed ? (
          <View
            style={{
              backgroundColor: 'rgba(34,197,94,0.12)',
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <Text style={{ color: '#22C55E', fontSize: 12, fontWeight: '700' }}>✓</Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => {
            console.log('[DatingGoals] Back button pressed');
            router.back();
          }}
          hitSlop={8}
          style={{ padding: 4 }}
        >
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, color: colors.text, fontSize: 20, fontWeight: '700' }}>
          Dating Goals 🎯
        </Text>
        <Target size={22} color="#6366F1" />
      </View>

      {loading ? (
        <ActivityIndicator color="#6366F1" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Progress bar */}
          {totalGoals > 0 && (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 14,
                padding: 14,
                borderWidth: 1,
                borderColor: colors.border,
                gap: 8,
              }}
            >
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                {progressLabel}
              </Text>
              <View
                style={{
                  height: 8,
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: 8,
                    width: progressWidth,
                    backgroundColor: '#22C55E',
                    borderRadius: 4,
                  }}
                />
              </View>
            </View>
          )}

          {/* Active Goals */}
          <View>
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: 11,
                fontWeight: '600',
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              Active Goals
            </Text>
            {activeGoals.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                <Text style={{ fontSize: 36, marginBottom: 10 }}>🎯</Text>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 6 }}>
                  No active goals
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
                  Set your first dating goal to stay focused.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {activeGoals.map(renderGoalCard)}
              </View>
            )}
          </View>

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <View>
              <Text
                style={{
                  color: colors.textTertiary,
                  fontSize: 11,
                  fontWeight: '600',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                Completed Goals
              </Text>
              <View style={{ gap: 8 }}>
                {completedGoals.map(renderGoalCard)}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* FAB */}
      <Pressable
        onPress={() => {
          console.log('[DatingGoals] FAB pressed, opening add sheet');
          setAddSheetVisible(true);
        }}
        style={{
          position: 'absolute',
          bottom: 32,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#6366F1',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#6366F1',
          shadowOpacity: 0.4,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}
      >
        <Plus size={24} color="#fff" />
      </Pressable>

      {/* Add Goal Sheet */}
      <Modal
        visible={addSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddSheetVisible(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          onPress={() => setAddSheetVisible(false)}
        >
          <Pressable
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 40,
              gap: 14,
            }}
            onPress={() => {}}
          >
            {/* Sheet header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ flex: 1, color: colors.text, fontSize: 18, fontWeight: '700' }}>
                New Goal 🎯
              </Text>
              <Pressable
                onPress={() => {
                  console.log('[DatingGoals] Add sheet closed');
                  setAddSheetVisible(false);
                }}
                hitSlop={8}
              >
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Title input */}
            <TextInput
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Goal title..."
              placeholderTextColor={colors.textTertiary}
              style={{
                backgroundColor: colors.surfaceSecondary,
                borderRadius: 12,
                padding: 14,
                color: colors.text,
                fontSize: 15,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            />

            {/* Target date */}
            <Pressable
              onPress={() => {
                console.log('[DatingGoals] Target date picker opened');
                setShowDatePicker(true);
              }}
              style={{
                backgroundColor: colors.surfaceSecondary,
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 16 }}>📅</Text>
              <Text style={{ color: newTargetDate ? colors.text : colors.textTertiary, fontSize: 14, flex: 1 }}>
                {newTargetDate
                  ? newTargetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'Target date (optional)'}
              </Text>
              {newTargetDate ? (
                <Pressable
                  onPress={() => {
                    console.log('[DatingGoals] Target date cleared');
                    setNewTargetDate(null);
                  }}
                  hitSlop={8}
                >
                  <X size={16} color={colors.textTertiary} />
                </Pressable>
              ) : null}
            </Pressable>

            {showDatePicker && (
              <DateTimePicker
                value={newTargetDate ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={(_, date) => {
                  setShowDatePicker(false);
                  if (date) {
                    console.log('[DatingGoals] Target date selected:', date.toISOString());
                    setNewTargetDate(date);
                  }
                }}
              />
            )}

            {/* Person picker */}
            {persons.length > 0 && (
              <View>
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>
                  Link to person (optional)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }} contentContainerStyle={{ paddingHorizontal: 4, gap: 8 }}>
                  {persons.map((p) => {
                    const isSelected = newPersonId === p.id;
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => {
                          console.log('[DatingGoals] Person selected:', p.id, p.name);
                          setNewPersonId(isSelected ? null : p.id);
                        }}
                        style={{
                          backgroundColor: isSelected ? 'rgba(236,72,153,0.12)' : colors.surfaceSecondary,
                          borderRadius: 20,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                          borderWidth: 1,
                          borderColor: isSelected ? '#EC4899' : colors.border,
                        }}
                      >
                        <Text style={{ color: isSelected ? '#EC4899' : colors.text, fontSize: 13, fontWeight: '600' }}>
                          {p.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Save button */}
            <Pressable
              onPress={handleAdd}
              disabled={saving || !newTitle.trim()}
              style={{
                backgroundColor: newTitle.trim() ? '#6366F1' : colors.surfaceSecondary,
                borderRadius: 14,
                paddingVertical: 15,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Plus size={18} color={newTitle.trim() ? '#fff' : colors.textTertiary} />
                  <Text
                    style={{
                      color: newTitle.trim() ? '#fff' : colors.textTertiary,
                      fontSize: 15,
                      fontWeight: '700',
                    }}
                  >
                    Add Goal
                  </Text>
                </>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
