import { Stack } from 'expo-router';
import { COLORS } from '@/constants/Colors';

export default function PersonLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
        headerShadowVisible: false,
        headerBackTitle: '',
      }}
    />
  );
}
