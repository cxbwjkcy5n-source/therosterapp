import { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function AddRedirect() {
  const { user, loading } = useAuth();
  const mountedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      // Skip the very first focus (app startup / initial render)
      if (!mountedRef.current) {
        mountedRef.current = true;
        return;
      }
      if (loading || !user) return;
      console.log('[AddTab] Tab focused by user tap — pushing /add-person');
      router.push('/add-person');
    }, [user, loading])
  );

  return <View style={{ flex: 1 }} />;
}
