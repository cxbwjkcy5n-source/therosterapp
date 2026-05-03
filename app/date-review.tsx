import React, { useState, useEffect } from 'react';
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
import { apiPatch, apiGet } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ImageSourcePropType } from 'react-native';

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType | null {
  if (!source) return null;
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

  const safePersonName = (Array.isArray(personName) ? personName[0] : personName) || 'Unknown';
  const safePersonPhoto = (Array.isArray(personPhoto) ? personPhoto[0] : personPhoto) || null;

  const [rating, setRating] = useState(0);
  const [wentWell, setWentWell] = useState('');
  const [wentPoorly, setWentPoorly] = useState('');
  const [wantAnother, setWantAnother] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dateId) {
      setLoading(false);
      return;
    }
    console.log('[DateReview] Fetching existing review for date:', dateId);
    apiGet<any>(`/api/dates/${dateId}`)
      .then((data) => {
        const d = data?.date ?? data;
        console.log('[DateReview] Existing review loaded:', d);
        const ratingVal = d?.rating;
        if (ratingVal) setRating(ratingVal);
        const wentWellVal = d?.went_well ?? d?.wentWell;
        if (wentWellVal) setWentWell(wentWellVal);
        const wentPoorlyVal = d?.went_poorly ?? d?.wentPoorly;
        if (wentPoorlyVal) setWentPoorly(wentPoorlyVal);
        const wantAnotherVal = d?.want_another_date ?? d?.wantAnotherDate;
        if (wantAnotherVal != null) setWantAnother(wantAnotherVal);
      })
      .catch((e) => {
        console.error('[DateReview] Failed to load existing review:', e);
      })
      .finally(() => setLoading(false));
  }, [dateId]);

  const displayName = safePersonName;
  const initials = getInitials(displayName);
  const photoSource = resolveImageSource(safePersonPhoto ?? undefined);
  const hasPhoto = !!safePersonPhoto && !!photoSource;

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

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!dateId) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, padding: 32 }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 16, textAlign: 'center' }}>
          No date selected. Go back and select a date to review.
        </Text>
      </View>
    );
  }

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
            {hasPhoto && photoSource ? (
              <Image
                source={photoSource}
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
