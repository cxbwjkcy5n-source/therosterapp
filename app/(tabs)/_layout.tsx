import React from 'react';
import { View, Pressable } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Home, Users, Heart, User, Plus } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 20,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(bench)"
        options={{
          title: 'Bench',
          tabBarIcon: ({ color }) => <Users size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(add)"
        options={{
          title: '',
          tabBarIcon: () => (
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: COLORS.primary,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                boxShadow: '0 4px 16px rgba(232,97,74,0.4)',
              }}
            >
              <Plus size={26} color="#fff" />
            </View>
          ),
          tabBarButton: () => (
            <Pressable
              onPress={() => {
                console.log('[Tab] Add person button pressed');
                router.push('/add-person');
              }}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="(dating)"
        options={{
          title: 'Dating',
          tabBarIcon: ({ color }) => <Heart size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
