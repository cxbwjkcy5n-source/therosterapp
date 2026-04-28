import React from 'react';
import { Pressable } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Plus, Home, Users, Heart, User } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarStyle: {
          backgroundColor: COLORS.background,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(bench)"
        options={{
          title: 'Bench',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(add)"
        options={{
          title: '',
          tabBarIcon: () => (
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
                marginBottom: 8,
              }}
            >
              <Plus size={28} color="#fff" strokeWidth={2.5} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="(dating)"
        options={{
          title: 'Dating',
          tabBarIcon: ({ color, size }) => <Heart size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
