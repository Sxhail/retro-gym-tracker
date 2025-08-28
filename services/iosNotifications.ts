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

    // Only schedule for future times; skip past or too-soon triggers to avoid burst notifications
    const now = Date.now();
    const deltaMs = when.getTime() - now;
    if (deltaMs <= 500) {
      console.log(`[IOSNotifications] Skipping schedule for past/too-soon time: ${when.toISOString()} (delta ${deltaMs}ms)`);
      return null;
    }
    const fireAt = when;

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default' as any,
          data: { 
            sessionId, 
            fireAt: fireAt.toISOString(),
            originalFireAt: when.toISOString(),
            notificationType: 'cardio_phase_transition'
          },
          // Ensure notifications don't get grouped together
          categoryIdentifier: `cardio_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        },
  trigger: { date: fireAt } as any,
      });
      
      console.log(`[IOSNotifications] Scheduled notification with ID: ${id} for session ${sessionId} at ${fireAt.toISOString()}`);
      return id;
    } catch (error) {
      console.warn(`[IOSNotifications] Failed to schedule notification:`, error);
      return null;
    }
  },

  async cancelAllForSession(sessionId: SessionId) {
    if (Platform.OS !== 'ios') return;
    
    try {
      console.log(`[IOSNotifications] Cancelling all notifications for session: ${sessionId}`);
      const queued = await Notifications.getAllScheduledNotificationsAsync();
      let cancelledCount = 0;
      
      for (const q of queued) {
        const sid = (q.content?.data as any)?.sessionId;
        if (sid === sessionId && q.identifier) {
          try { 
            await Notifications.cancelScheduledNotificationAsync(q.identifier); 
            cancelledCount++;
          } catch (error) {
            console.warn(`[IOSNotifications] Failed to cancel notification ${q.identifier}:`, error);
          }
        }
      }
      
      console.log(`[IOSNotifications] Cancelled ${cancelledCount} notifications for session ${sessionId}`);
    } catch (error) {
      console.warn(`[IOSNotifications] Failed to cancel notifications for session ${sessionId}:`, error);
    }
  },

  async cancelAllPending() {
    if (Platform.OS !== 'ios') return;
    try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch {}
  },
};

export default IOSLocalNotifications;
