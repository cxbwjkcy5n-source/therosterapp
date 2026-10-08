import { Stack } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { Pressable } from 'react-native';
import { Heart } from 'lucide-react-native';
import { router } from 'expo-router';

export default function DatingLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
        headerShadowVisible: false,
        headerLargeTitle: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Dating',
          headerRight: () => (
            <Pressable
              onPress={() => {
                console.log('[DatingLayout] Navigating to analytics');
                router.push('/analytics');
              }}
              style={{ paddingHorizontal: 8, paddingVertical: 4 }}
              hitSlop={8}
            >
              <Heart size={22} color={COLORS.primary} />
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}
