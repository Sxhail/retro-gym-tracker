import * as Notifications from 'expo-notifications';
import { AppState, AppStateStatus, Platform } from 'react-native';

// iOS-only local notifications helper implementing the MD spec:
// - Pre-schedule all notifications at workout start
// - Cancel all pending notifications when session ends/cancels
// - Use date-based triggers and default sound
// - Ignore foreground (only show when app is backgrounded)

type SessionId = string;

let isAppForeground = AppState.currentState === 'active';
let initialized = false;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: !isAppForeground,
    shouldShowBanner: !isAppForeground,
    shouldShowList: !isAppForeground,
    shouldPlaySound: !isAppForeground,
    shouldSetBadge: false,
  }),
});

AppState.addEventListener('change', (state: AppStateStatus) => {
  isAppForeground = state === 'active';
});

async function ensurePermission() {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted') return true;
    const req = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    return req.status === 'granted';
  } catch {
    return false;
  }
}

export const IOSLocalNotifications = {
  async initialize() {
    if (initialized) return;
    // We only care about iOS behavior; still safe to no-op on other platforms
    await ensurePermission();
    initialized = true;
  },

  async scheduleAbsolute(sessionId: SessionId, when: Date, title: string, body: string) {
    if (Platform.OS !== 'ios') return null; // iOS-only
    if (!initialized) await IOSLocalNotifications.initialize();
    const ok = await ensurePermission();
    if (!ok) return null;

    // Catch-up window: clamp past times to a few seconds in the future
    const now = Date.now();
    const fireAt = when.getTime() <= now ? new Date(now + 1000) : when;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default' as any,
        data: { sessionId, fireAt: fireAt.toISOString() },
      },
      trigger: { date: fireAt } as any,
    });
    return id;
  },

  async cancelAllForSession(sessionId: SessionId) {
    if (Platform.OS !== 'ios') return;
    try {
      const queued = await Notifications.getAllScheduledNotificationsAsync();
      for (const q of queued) {
        const sid = (q.content?.data as any)?.sessionId;
        if (sid === sessionId && q.identifier) {
          try { await Notifications.cancelScheduledNotificationAsync(q.identifier); } catch {}
        }
      }
    } catch {}
  },

  async cancelAllPending() {
    if (Platform.OS !== 'ios') return;
    try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch {}
  },
};

export default IOSLocalNotifications;
