import { Stack } from 'expo-router';
import { COLORS } from '@/constants/Colors';

export default function BenchLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
        headerShadowVisible: false,
        headerLargeTitle: false,
      }}
    />
  );
}
