import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Contract
// - initialize(): request iOS permissions and set handler
// - scheduleAbsolute(): schedule notification for a specific Date
// - cancelAllForSession(sessionId): cancel pending notifications for a session
// - cancelAllPending(): safety clear

type SessionId = string;

const sessionMap = new Map<SessionId, string[]>();

export const NotificationService = {
  async initialize() {
    if (Platform.OS !== 'ios') return; // iOS-only per requirement

    // Show alerts and play sounds for local notifications
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // Permission request
    const settings = await Notifications.getPermissionsAsync();
    let status = settings.status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowSound: true, allowBadge: false },
      });
      status = req.status;
    }
    if (status !== 'granted') {
      console.warn('iOS notification permission not granted');
    }
  },

  async scheduleAbsolute(sessionId: SessionId, when: Date, title: string, body: string) {
    if (Platform.OS !== 'ios') return null;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
  // Use default iOS notification sound
  sound: true,
      },
  trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    });

    const list = sessionMap.get(sessionId) ?? [];
    list.push(id);
    sessionMap.set(sessionId, list);
    return id;
  },

  async cancelAllForSession(sessionId: SessionId) {
    const ids = sessionMap.get(sessionId) ?? [];
    for (const id of ids) {
      try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
    }
    sessionMap.delete(sessionId);
  },

  async cancelAllPending() {
    if (Platform.OS !== 'ios') return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      sessionMap.clear();
    } catch (e) {
      console.warn('Failed to cancel all scheduled notifications', e);
    }
  },
};

export default NotificationService;
