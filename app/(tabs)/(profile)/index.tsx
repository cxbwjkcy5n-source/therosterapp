import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Switch, Alert } from 'react-native';
import { Stack, router, useFocusEffect } from 'expo-router';
import { User, Bell, Moon, FileText, Shield, LogOut, ChevronRight, BarChart2 } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Analytics {
  total_active?: number;
  total_benched?: number;
  total_dates?: number;
}

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [analytics, setAnalytics] = useState<Analytics>({});
  const [notifications, setNotifications] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      console.log('[Profile] Loading analytics for stats');
      apiGet<Analytics>('/api/analytics')
        .then((data) => {
          console.log('[Profile] Analytics loaded');
          setAnalytics(data);
        })
        .catch((e) => console.error('[Profile] Failed to load analytics:', e));
    }, [user])
  );

  const handleSignOut = () => {
    console.log('[Profile] Sign out pressed');
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          console.log('[Profile] Confirming sign out');
          await signOut();
          router.replace('/auth-screen');
        },
      },
    ]);
  };

  const initials = getInitials(user?.name);
  const totalActive = analytics.total_active ?? 0;
  const totalBenched = analytics.total_benched ?? 0;
  const totalDates = analytics.total_dates ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen options={{ title: 'Profile' }} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + info */}
        <View style={{ alignItems: 'center', paddingTop: 32, paddingBottom: 28, paddingHorizontal: 24 }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: COLORS.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
              borderWidth: 2,
              borderColor: COLORS.primary,
            }}
          >
            <Text style={{ fontSize: 32, fontWeight: '700', color: COLORS.primary }}>{initials}</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 4 }}>
            {user?.name || 'Anonymous'}
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>{user?.email || ''}</Text>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', marginHorizontal: 16, gap: 10, marginBottom: 28 }}>
          {[
            { label: 'Active', value: totalActive },
            { label: 'Benched', value: totalBenched },
            { label: 'Dates', value: totalDates },
          ].map((stat) => (
            <View
              key={stat.label}
              style={{
                flex: 1,
                backgroundColor: COLORS.surface,
                borderRadius: 14,
                padding: 14,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.text }}>{stat.value}</Text>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Settings */}
        <View style={{ marginHorizontal: 16, gap: 8 }}>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 12,
              fontWeight: '600',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              marginBottom: 4,
              marginLeft: 4,
            }}
          >
            Settings
          </Text>

          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
              overflow: 'hidden',
            }}
          >
            {/* Notifications */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.divider,
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  backgroundColor: COLORS.accentMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Bell size={18} color={COLORS.accent} />
              </View>
              <Text style={{ flex: 1, color: COLORS.text, fontSize: 15 }}>Notifications</Text>
              <Switch
                value={notifications}
                onValueChange={(v) => {
                  console.log('[Profile] Notifications toggled:', v);
                  setNotifications(v);
                }}
                trackColor={{ false: COLORS.surfaceSecondary, true: COLORS.primary }}
                thumbColor="#fff"
              />
            </View>

            {/* Dark mode */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.divider,
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  backgroundColor: 'rgba(100,100,200,0.15)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Moon size={18} color="#8B8BFF" />
              </View>
              <Text style={{ flex: 1, color: COLORS.text, fontSize: 15 }}>Dark mode</Text>
              <Switch
                value={true}
                onValueChange={() => console.log('[Profile] Dark mode toggle (always on)')}
                trackColor={{ false: COLORS.surfaceSecondary, true: COLORS.primary }}
                thumbColor="#fff"
              />
            </View>

            {/* Insights */}
            <AnimatedPressable
              onPress={() => {
                console.log('[Profile] Insights pressed');
                router.push('/analytics');
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: COLORS.divider,
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    backgroundColor: COLORS.successMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <BarChart2 size={18} color={COLORS.success} />
                </View>
                <Text style={{ flex: 1, color: COLORS.text, fontSize: 15 }}>Insights</Text>
                <ChevronRight size={18} color={COLORS.textTertiary} />
              </View>
            </AnimatedPressable>

            {/* Privacy Policy */}
            <AnimatedPressable onPress={() => console.log('[Profile] Privacy Policy pressed')}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: COLORS.divider,
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    backgroundColor: COLORS.primaryMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Shield size={18} color={COLORS.primary} />
                </View>
                <Text style={{ flex: 1, color: COLORS.text, fontSize: 15 }}>Privacy Policy</Text>
                <ChevronRight size={18} color={COLORS.textTertiary} />
              </View>
            </AnimatedPressable>

            {/* Terms */}
            <AnimatedPressable onPress={() => console.log('[Profile] Terms of Service pressed')}>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    backgroundColor: COLORS.primaryMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <FileText size={18} color={COLORS.primary} />
                </View>
                <Text style={{ flex: 1, color: COLORS.text, fontSize: 15 }}>Terms of Service</Text>
                <ChevronRight size={18} color={COLORS.textTertiary} />
              </View>
            </AnimatedPressable>
          </View>

          {/* Sign out */}
          <AnimatedPressable onPress={handleSignOut} style={{ marginTop: 12 }}>
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 16,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: 'rgba(232,97,74,0.3)',
                gap: 10,
              }}
            >
              <LogOut size={18} color={COLORS.primary} />
              <Text style={{ color: COLORS.primary, fontSize: 15, fontWeight: '600' }}>Sign out</Text>
            </View>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </View>
  );
}
