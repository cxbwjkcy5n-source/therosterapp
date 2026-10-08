import { Stack, router } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { Pressable } from 'react-native';
import { Heart } from 'lucide-react-native';

export default function BenchLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
        headerShadowVisible: false,
        headerLargeTitle: false,
        headerBackVisible: false,
        gestureEnabled: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Bench',
          headerRight: () => (
            <Pressable
              onPress={() => {
                console.log('[BenchLayout] Analytics button pressed');
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
