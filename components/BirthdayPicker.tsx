import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { COLORS } from '@/constants/Colors';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ITEM_HEIGHT = 44;

function getDaysInMonth(monthIndex: number): number {
  // monthIndex: 0-based (0 = January)
  // Use a non-leap year for February (28 days)
  return new Date(2001, monthIndex + 1, 0).getDate();
}

function parseBirthday(value: string): { monthIndex: number; day: number } {
  if (value && value.length === 5 && value[2] === '-') {
    const m = parseInt(value.slice(0, 2), 10);
    const d = parseInt(value.slice(3, 5), 10);
    if (m >= 1 && m <= 12 && d >= 1) {
      return { monthIndex: m - 1, day: d };
    }
  }
  return { monthIndex: 0, day: 1 };
}

function formatDisplay(value: string): string {
  if (!value || value.length !== 5) return '';
  const { monthIndex, day } = parseBirthday(value);
  return `${MONTHS[monthIndex]} ${day}`;
}

function toMMDD(monthIndex: number, day: number): string {
  const mm = String(monthIndex + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${mm}-${dd}`;
}

function ColumnPicker({
  items,
  selectedIndex,
  onSelect,
}: {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: hasScrolled });
      if (!hasScrolled) setHasScrolled(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex]);

  return (
    <View style={{ flex: 1, height: ITEM_HEIGHT * 5, overflow: 'hidden' }}>
      {/* Selection highlight */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: ITEM_HEIGHT * 2,
          left: 0,
          right: 0,
          height: ITEM_HEIGHT,
          backgroundColor: 'rgba(229,57,53,0.12)',
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: '#E53935',
          zIndex: 1,
        }}
      />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
          const clamped = Math.max(0, Math.min(index, items.length - 1));
          console.log('[BirthdayPicker] Column scrolled to index:', clamped, items[clamped]);
          onSelect(clamped);
        }}
        scrollEventThrottle={16}
      >
        {items.map((item, i) => (
          <Pressable
            key={item}
            onPress={() => {
              console.log('[BirthdayPicker] Column item pressed:', item);
              onSelect(i);
              scrollRef.current?.scrollTo({ y: i * ITEM_HEIGHT, animated: true });
            }}
            style={{
              height: ITEM_HEIGHT,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontSize: i === selectedIndex ? 17 : 15,
                fontWeight: i === selectedIndex ? '700' : '400',
                color: i === selectedIndex ? '#E53935' : COLORS.textSecondary,
              }}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

interface BirthdayPickerProps {
  value: string; // "MM-DD" or ""
  onChange: (value: string) => void;
  placeholder?: string;
}

export function BirthdayPicker({ value, onChange, placeholder = 'Select birthday' }: BirthdayPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const { monthIndex: initMonth, day: initDay } = parseBirthday(value);
  const [selectedMonth, setSelectedMonth] = useState(initMonth);
  const [selectedDay, setSelectedDay] = useState(initDay);

  const daysInMonth = getDaysInMonth(selectedMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));

  const clampedDay = Math.min(selectedDay, daysInMonth);

  const displayText = value ? formatDisplay(value) : '';

  const handleOpen = () => {
    const parsed = parseBirthday(value);
    setSelectedMonth(parsed.monthIndex);
    setSelectedDay(parsed.day);
    console.log('[BirthdayPicker] Picker opened, current value:', value);
    setModalVisible(true);
  };

  const handleDone = () => {
    const finalDay = Math.min(selectedDay, getDaysInMonth(selectedMonth));
    const result = toMMDD(selectedMonth, finalDay);
    console.log('[BirthdayPicker] Done pressed, saving:', result);
    onChange(result);
    setModalVisible(false);
  };

  const handleMonthChange = (index: number) => {
    setSelectedMonth(index);
    const maxDay = getDaysInMonth(index);
    if (selectedDay > maxDay) {
      setSelectedDay(maxDay);
    }
  };

  return (
    <>
      <Pressable
        onPress={handleOpen}
        style={{
          backgroundColor: COLORS.surfaceSecondary,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 11,
          borderWidth: 1,
          borderColor: COLORS.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          style={{
            fontSize: 14,
            color: displayText ? COLORS.text : COLORS.textTertiary,
          }}
        >
          {displayText || placeholder}
        </Text>
        <Text style={{ color: COLORS.textTertiary, fontSize: 12 }}>▼</Text>
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingTop: 16,
                paddingBottom: Platform.OS === 'ios' ? 40 : 24,
                borderTopWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              {/* Header */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 20,
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '700' }}>Birthday</Text>
                <Pressable
                  onPress={handleDone}
                  style={{
                    backgroundColor: '#E53935',
                    borderRadius: 10,
                    paddingHorizontal: 18,
                    paddingVertical: 8,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Done</Text>
                </Pressable>
              </View>

              {/* Column labels */}
              <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 4 }}>
                <Text style={{ flex: 1, textAlign: 'center', color: COLORS.textTertiary, fontSize: 12, fontWeight: '600' }}>
                  MONTH
                </Text>
                <Text style={{ flex: 1, textAlign: 'center', color: COLORS.textTertiary, fontSize: 12, fontWeight: '600' }}>
                  DAY
                </Text>
              </View>

              {/* Pickers */}
              <View style={{ flexDirection: 'row', paddingHorizontal: 20 }}>
                <ColumnPicker
                  items={MONTHS}
                  selectedIndex={selectedMonth}
                  onSelect={handleMonthChange}
                />
                <View style={{ width: 1, backgroundColor: COLORS.border, marginHorizontal: 8 }} />
                <ColumnPicker
                  items={days}
                  selectedIndex={clampedDay - 1}
                  onSelect={(i) => setSelectedDay(i + 1)}
                />
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

export { formatDisplay as formatBirthdayDisplay };
