import React from 'react';
import { View, Pressable } from 'react-native';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { router } from 'expo-router';
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
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: COLORS.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View style={{ width: 24, height: 2, backgroundColor: '#fff', position: 'absolute' }} />
          <View style={{ width: 2, height: 24, backgroundColor: '#fff', position: 'absolute' }} />
        </Pressable>
        <Label>{''}</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(dating)">
        <Icon sf="heart.fill" />
        <Label>Dating</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="(profile)">
        <Icon sf="gearshape.fill" />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
