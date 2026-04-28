import React from 'react';
import { View, Pressable } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Home, Users, Heart, User, Plus } from 'lucide-react-native';
import { COLORS } from '@/constants/Colors';

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="(home)"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.background,
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
          tabBarShowLabel: false,
          tabBarButton: () => (
            <Pressable
              onPress={() => {
                console.log('[Tab] Add person button pressed');
                router.push('/add-person');
              }}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#E53935',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: -12,
                  shadowColor: '#E53935',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.45,
                  shadowRadius: 10,
                  elevation: 8,
                  zIndex: 10,
                }}
              >
                <Plus size={28} color="#fff" strokeWidth={2.5} />
              </View>
            </Pressable>
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
