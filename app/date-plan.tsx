import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Animated,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { X, Sparkles, ExternalLink } from 'lucide-react-native';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { apiGet, apiPost } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Person {
  id: string;
  name: string;
}

interface DateIdea {
  title: string;
  description: string;
  category?: string;
  estimated_cost?: string;
  search_url?: string;
}

const BUDGETS = [
  { label: '$', value: 25 },
  { label: '$$', value: 75 },
  { label: '$$$', value: 150 },
  { label: '$$$$', value: 300 },
];

export default function DatePlanScreen() {
  const insets = useSafeAreaInsets();
  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState(75);
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<DateIdea[]>([]);
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('[DatePlan] Loading persons');
    apiGet<{ persons: Person[] }>('/api/persons')
      .then((data) => {
        const active = (data.persons || []).filter((p: any) => !p.is_benched);
        console.log('[DatePlan] Loaded', active.length, 'persons');
        setPersons(active);
        if (active.length > 0) setSelectedPersonId(active[0].id);
      })
      .catch((e) => console.error('[DatePlan] Failed to load persons:', e));
  }, []);

  const startSparkleAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(sparkleAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  };

  const handleGetIdeas = async () => {
    if (!selectedPersonId) return;
    console.log('[DatePlan] Getting date ideas for person:', selectedPersonId, 'budget:', budget);
    setLoading(true);
    setIdeas([]);
    startSparkleAnimation();
    try {
      const result = await apiPost<{ ideas: DateIdea[] }>('/api/date-plan/ideas', {
        person_id: selectedPersonId,
        location: location.trim() || undefined,
        budget,
      });
      console.log('[DatePlan] Got', result?.ideas?.length, 'ideas');
      setIdeas(result?.ideas || []);
    } catch (e: any) {
      console.error('[DatePlan] Failed to get ideas:', e);
    } finally {
      setLoading(false);
      sparkleAnim.stopAnimation();
    }
  };

  const sparkleOpacity = sparkleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* STATIC HEADER */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
        {/* Row 1: Close + Title + Spacer */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 14,
          }}
        >
          <AnimatedPressable
            onPress={() => {
              console.log('[DatePlan] Close pressed');
              router.back();
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: COLORS.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} color={COLORS.textSecondary} />
          </AnimatedPressable>
          <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700' }}>Plan a Date ✨</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Row 2: Person chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 14, gap: 8 }}
        >
          {persons.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => {
                console.log('[DatePlan] Person selected:', p.id, p.name);
                setSelectedPersonId(p.id);
              }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: selectedPersonId === p.id ? COLORS.accent : COLORS.surface,
                borderWidth: 1,
                borderColor: selectedPersonId === p.id ? COLORS.accent : COLORS.border,
              }}
            >
              <Text
                style={{
                  color: selectedPersonId === p.id ? '#000' : COLORS.textSecondary,
                  fontSize: 14,
                  fontWeight: '500',
                }}
              >
                {p.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* SCROLLABLE CONTENT */}
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Location */}
        <View style={{ zIndex: 10 }}>
          <AddressAutocomplete
            label="Location (optional)"
            value={location}
            onChangeText={setLocation}
            onSelect={(addr) => {
              console.log('[DatePlan] Location selected from autocomplete:', addr);
              setLocation(addr);
            }}
            placeholder="City or neighborhood..."
          />
        </View>

        {/* Budget */}
        <View>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500', marginBottom: 10 }}>
            Budget
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {BUDGETS.map((b) => (
              <Pressable
                key={b.value}
                onPress={() => {
                  console.log('[DatePlan] Budget selected:', b.label, b.value);
                  setBudget(b.value);
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: budget === b.value ? COLORS.accentMuted : COLORS.surface,
                  borderWidth: 1,
                  borderColor: budget === b.value ? COLORS.accent : COLORS.border,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    color: budget === b.value ? COLORS.accent : COLORS.textSecondary,
                    fontSize: 16,
                    fontWeight: '700',
                  }}
                >
                  {b.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Get Ideas button */}
        <AnimatedPressable
          onPress={handleGetIdeas}
          disabled={!selectedPersonId || loading}
          style={{
            backgroundColor: COLORS.accent,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {loading ? (
            <>
              <Animated.View style={{ opacity: sparkleOpacity }}>
                <Sparkles size={20} color="#000" />
              </Animated.View>
              <Text style={{ color: '#000', fontSize: 16, fontWeight: '700' }}>
                Finding perfect date ideas...
              </Text>
            </>
          ) : (
            <>
              <Sparkles size={20} color="#000" />
              <Text style={{ color: '#000', fontSize: 16, fontWeight: '700' }}>Get Ideas</Text>
            </>
          )}
        </AnimatedPressable>

        {/* Results */}
        {ideas.length > 0 && (
          <View style={{ gap: 12 }}>
            <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700' }}>
              Date Ideas ✨
            </Text>
            {ideas.map((idea, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  gap: 8,
                }}
              >
                {idea.category && (
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      backgroundColor: COLORS.accentMuted,
                      borderRadius: 6,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                    }}
                  >
                    <Text style={{ color: COLORS.accent, fontSize: 11, fontWeight: '600' }}>
                      {idea.category}
                    </Text>
                  </View>
                )}
                <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700' }}>{idea.title}</Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: 14, lineHeight: 20 }}>
                  {idea.description}
                </Text>
                {idea.estimated_cost && (
                  <Text style={{ color: COLORS.accent, fontSize: 13, fontWeight: '600' }}>
                    Est. cost: {idea.estimated_cost}
                  </Text>
                )}
                {idea.search_url && (
                  <AnimatedPressable
                    onPress={() => {
                      console.log('[DatePlan] Explore pressed for:', idea.title);
                      Linking.openURL(idea.search_url!).catch((e) =>
                        console.error('[DatePlan] Failed to open URL:', e)
                      );
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      alignSelf: 'flex-start',
                      backgroundColor: COLORS.accentMuted,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      marginTop: 4,
                    }}
                  >
                    <ExternalLink size={14} color={COLORS.accent} />
                    <Text style={{ color: COLORS.accent, fontSize: 13, fontWeight: '600' }}>Explore</Text>
                  </AnimatedPressable>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
