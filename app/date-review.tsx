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
import { useTheme } from '@/contexts/ThemeContext';
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
  const { colors } = useTheme();
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
  const [privateNotes, setPrivateNotes] = useState('');
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
        const notesVal = d?.notes;
        if (notesVal) setPrivateNotes(notesVal);
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
    console.log('[DateReview] Submitting review for date:', dateId, 'rating:', rating, 'wantAnother:', wantAnother, 'hasNotes:', !!privateNotes.trim());
    setSubmitting(true);
    try {
      console.log('[DateReview] PATCH /api/dates/' + dateId + '/review');
      await apiPatch(`/api/dates/${dateId}/review`, {
        rating,
        went_well: wentWell.trim() || null,
        went_poorly: wentPoorly.trim() || null,
        want_another_date: wantAnother,
        notes: privateNotes.trim() || null,
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

  const ratingLabel = rating === 1 ? 'Not great' : rating === 2 ? 'Below average' : rating === 3 ? 'It was okay' : rating === 4 ? 'Pretty good!' : 'Amazing!';
  const submitBg = rating > 0 ? colors.primary : colors.surface;
  const submitBorder = rating > 0 ? colors.primary : colors.border;
  const submitTextColor = rating > 0 ? '#fff' : colors.textTertiary;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!dateId) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: 32 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 16, textAlign: 'center' }}>
          No date selected. Go back and select a date to review.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

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
              backgroundColor: colors.surface,
              borderWidth: 2,
              borderColor: colors.primary,
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
              <Text style={{ fontSize: 28, fontWeight: '700', color: colors.primary }}>
                {initials}
              </Text>
            )}
          </View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
            {displayName}
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary }}>
            How did the date go?
          </Text>
        </View>

        {/* Star rating */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 16,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 16 }}>
            Overall Rating
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[1, 2, 3, 4, 5].map((star) => {
              const starColor = star <= rating ? '#FFB300' : colors.border;
              const starFill = star <= rating ? '#FFB300' : 'transparent';
              return (
                <AnimatedPressable
                  key={star}
                  onPress={() => {
                    console.log('[DateReview] Star rating selected:', star);
                    setRating(star);
                  }}
                >
                  <Star
                    size={40}
                    color={starColor}
                    fill={starFill}
                  />
                </AnimatedPressable>
              );
            })}
          </View>
          {rating > 0 && (
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 10 }}>
              {ratingLabel}
            </Text>
          )}
        </View>

        {/* What went well */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 12 }}>
            What went well?
          </Text>
          <TextInput
            value={wentWell}
            onChangeText={setWentWell}
            placeholder="Great conversation, good vibes..."
            placeholderTextColor={colors.textTertiary}
            multiline
            style={{
              backgroundColor: colors.background,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: colors.text,
              fontSize: 15,
              borderWidth: 1,
              borderColor: colors.border,
              minHeight: 80,
              textAlignVertical: 'top',
            }}
          />
        </View>

        {/* What could be better */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 16,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 12 }}>
            What could be better?
          </Text>
          <TextInput
            value={wentPoorly}
            onChangeText={setWentPoorly}
            placeholder="Awkward silences, venue wasn't great..."
            placeholderTextColor={colors.textTertiary}
            multiline
            style={{
              backgroundColor: colors.background,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: colors.text,
              fontSize: 15,
              borderWidth: 1,
              borderColor: colors.border,
              minHeight: 80,
              textAlignVertical: 'top',
            }}
          />
        </View>

        {/* Private Notes */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Text style={{ fontSize: 16 }}>🔒</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>
                Private Notes
              </Text>
              <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 1 }}>
                Never shown in analytics
              </Text>
            </View>
          </View>
          <TextInput
            value={privateNotes}
            onChangeText={(v) => {
              console.log('[DateReview] Private notes updated, length:', v.length);
              setPrivateNotes(v);
            }}
            placeholder="Personal thoughts, things to remember..."
            placeholderTextColor={colors.textTertiary}
            multiline
            style={{
              backgroundColor: colors.background,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              color: colors.text,
              fontSize: 15,
              borderWidth: 1,
              borderColor: colors.border,
              minHeight: 80,
              textAlignVertical: 'top',
            }}
          />
        </View>

        {/* Would you go on another date */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            marginBottom: 28,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 2 }}>
              Would you go on another date?
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
              {wantAnother ? 'Yes, definitely!' : 'Not right now'}
            </Text>
          </View>
          <Switch
            value={wantAnother}
            onValueChange={(v) => {
              console.log('[DateReview] Want another date toggled:', v);
              setWantAnother(v);
            }}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>

        {/* Submit */}
        <AnimatedPressable
          onPress={handleSubmit}
          disabled={submitting || rating === 0}
          style={{
            backgroundColor: submitBg,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: submitBorder,
          }}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text
              style={{
                color: submitTextColor,
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
