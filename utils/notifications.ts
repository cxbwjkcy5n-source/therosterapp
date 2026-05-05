import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiPost } from '@/utils/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      console.log('[Notifications] Push notifications not supported on web');
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      console.log('[Notifications] Requesting push notification permission');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Push notification permission denied');
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    console.log('[Notifications] Got push token:', token.slice(0, 30) + '...');

    await apiPost('/api/push-tokens', { token, platform: Platform.OS });
    console.log('[Notifications] Push token registered with backend');
  } catch (e) {
    console.error('[Notifications] Failed to register push token:', e);
  }
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  trigger: Notifications.NotificationTriggerInput
): Promise<string | null> {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger,
    });
    console.log('[Notifications] Scheduled local notification:', title, 'id:', id);
    return id;
  } catch (e) {
    console.error('[Notifications] Failed to schedule notification:', e);
    return null;
  }
}
