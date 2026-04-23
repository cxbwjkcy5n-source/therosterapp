import React from 'react';
import { View, Pressable } from 'react-native';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';

export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(home)">
        <Icon sf="house.fill" />
        <Label>Home</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(bench)">
        <Icon sf="person.2.fill" />
        <Label>Bench</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(add)">
        <Pressable
          onPress={() => {
            console.log('[Tab] Add person button pressed (iOS)');
            router.push('/add-person');
          }}
          hitSlop={12}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: COLORS.primary,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.45,
            shadowRadius: 10,
            elevation: 8,
          }}
        >
          <Plus size={28} color="#fff" strokeWidth={2.5} />
        </Pressable>
        <Label>{''}</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(dating)">
        <Icon sf="heart.fill" />
        <Label>Dating</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(profile)">
        <Icon sf="person.fill" />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
