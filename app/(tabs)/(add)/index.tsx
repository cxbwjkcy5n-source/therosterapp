import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View } from 'react-native';

export default function AddRedirect() {
  const { user, loading } = useAuth();
  if (loading || !user) return <View style={{ flex: 1 }} />;
  return <Redirect href="/add-person" />;
}
