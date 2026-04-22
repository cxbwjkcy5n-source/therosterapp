import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Star } from 'lucide-react-native';
import { Image } from 'expo-image';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { apiPatch } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ImageSourcePropType } from 'react-native';

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function DateReviewScreen() {
  const insets = useSafeAreaInsets();
  const { dateId, personName, personPhoto } = useLocalSearchParams<{
    dateId: string;
    personName: string;
    personPhoto?: string;
  }>();

  const [rating, setRating] = useState(0);
  const [wentWell, setWentWell] = useState('');
  const [wentPoorly, setWentPoorly] = useState('');
  const [wantAnother, setWantAnother] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const displayName = personName || 'Unknown';
  const initials = getInitials(displayName);
  const hasPhoto = !!personPhoto;

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating required', 'Please select a star rating before submitting.');
      return;
    }
    console.log('[DateReview] Submitting review for date:', dateId, 'rating:', rating, 'wantAnother:', wantAnother);
    setSubmitting(true);
    try {
      console.log('[DateReview] PATCH /api/dates/' + dateId + '/review');
      await apiPatch(`/api/dates/${dateId}/review`, {
        rating,
        went_well: wentWell.trim() || null,
        went_poorly: wentPoorly.trim() || null,
        want_another_date: wantAnother,
      });
      console.log('[DateReview] Review submitted successfully');
      router.back();
    } catch (e: any) {
      console.error('[DateReview] Failed to submit review:', e);
      Alert.alert('Could not submit', e?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Person header */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              overflow: 'hidden',
              backgroundColor: COLORS.surface,
              borderWidth: 2,
              borderColor: COLORS.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            {hasPhoto ? (
              <Image
                source={resolveImageSource(personPhoto)}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <Text style={{ fontSize: 28, fontWeight: '700', color: COLORS.primary }}>
                {initials}
              </Text>
            )}
          </View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 4 }}>
            {displayName}
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>
            How did the date go?
          </Text>
        </View>

        {/* Star rating */}
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: COLORS.border,
            marginBottom: 16,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 16 }}>
            Overall Rating
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <AnimatedPressable
                key={star}
                onPress={() => {
                  console.log('[DateReview] Star rating selected:', star);
                  setRating(star);
                }}
              >
                <Star
                  size={40}
                  color={star <= rating ? COLORS.accent : COLORS.border}
                  fill={star <= rating ? COLORS.accent : 'transparent'}
                />
              </AnimatedPressable>
            ))}
          </View>
          {rating > 0 && (
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 10 }}>
              {rating === 1 ? 'Not great' : rating === 2 ? 'Below average' : rating === 3 ? 'It was okay' : rating === 4 ? 'Pretty good!' : 'Amazing!'}
            </Text>
          )}
        </View>

        {/* What went well */}
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 12 }}>
            What went well?
          </Text>
          <TextInput
            value={wentWell}
            onChangeText={setWentWell}
            placeholder="Great conversation, good vibes..."
            placeholderTextColor={COLORS.textTertiary}
            multiline
            style={{
              backgroundColor: COLORS.background,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: COLORS.text,
              fontSize: 15,
              borderWidth: 1,
              borderColor: COLORS.border,
              minHeight: 80,
              textAlignVertical: 'top',
            }}
          />
        </View>

        {/* What could be better */}
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 12 }}>
            What could be better?
          </Text>
          <TextInput
            value={wentPoorly}
            onChangeText={setWentPoorly}
            placeholder="Awkward silences, venue wasn't great..."
            placeholderTextColor={COLORS.textTertiary}
            multiline
            style={{
              backgroundColor: COLORS.background,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: COLORS.text,
              fontSize: 15,
              borderWidth: 1,
              borderColor: COLORS.border,
              minHeight: 80,
              textAlignVertical: 'top',
            }}
          />
        </View>

        {/* Would you go on another date */}
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            marginBottom: 28,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 2 }}>
              Would you go on another date?
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>
              {wantAnother ? 'Yes, definitely!' : 'Not right now'}
            </Text>
          </View>
          <Switch
            value={wantAnother}
            onValueChange={(v) => {
              console.log('[DateReview] Want another date toggled:', v);
              setWantAnother(v);
            }}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor="#fff"
          />
        </View>

        {/* Submit */}
        <AnimatedPressable
          onPress={handleSubmit}
          disabled={submitting || rating === 0}
          style={{
            backgroundColor: rating > 0 ? COLORS.primary : COLORS.surface,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: rating > 0 ? COLORS.primary : COLORS.border,
          }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              style={{
                color: rating > 0 ? '#fff' : COLORS.textTertiary,
                fontSize: 16,
                fontWeight: '700',
              }}
            >
              Submit Review
            </Text>
          )}
        </AnimatedPressable>
      </ScrollView>
    </View>
  );
}
