import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

type SessionId = string;

let initialized = false;

// Always show notifications - let iOS handle background/foreground behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
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
    if (Platform.OS !== 'ios') return null;
    if (!initialized) await IOSLocalNotifications.initialize();
    
    const now = Date.now();
    const deltaMs = when.getTime() - now;
    const seconds = Math.max(1, Math.round(deltaMs / 1000));

    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          data: {
            sessionId,
            notificationType: 'cardio_phase_transition',
          },
        },
        trigger: { type: 'timeInterval', seconds, repeats: false } as any,
      });
      
      return id;
    } catch (error) {
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

  async cancelAllCardio() {
    if (Platform.OS !== 'ios') return;
    try {
      console.log('[IOSNotifications] Aggressively clearing all cardio notifications');
      const queued = await Notifications.getAllScheduledNotificationsAsync();
      let cancelled = 0;
      for (const q of queued) {
        const type = (q.content?.data as any)?.notificationType;
        if (type === 'cardio_phase_transition' && q.identifier) {
          try {
            await Notifications.cancelScheduledNotificationAsync(q.identifier);
            cancelled++;
          } catch (e) {
            console.warn('[IOSNotifications] Failed to cancel cardio notification', q.identifier, e);
          }
        }
      }
      console.log(`[IOSNotifications] Cleared ${cancelled} cardio notifications`);
    } catch (e) {
      console.warn('[IOSNotifications] Failed to clear cardio notifications', e);
    }
  },

  async cancelAllPending() {
    if (Platform.OS !== 'ios') return;
    try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch {}
  },

  async listScheduledForSession(sessionId?: SessionId) {
    if (Platform.OS !== 'ios') return [] as any[];
    try {
      const queued = await Notifications.getAllScheduledNotificationsAsync();
      const list = queued
        .filter(q => !sessionId || (q.content?.data as any)?.sessionId === sessionId)
        .map(q => ({
          id: q.identifier,
          when: (q.trigger as any)?.date ? new Date((q.trigger as any).date).toISOString() : undefined,
          type: (q.content?.data as any)?.notificationType,
          sessionId: (q.content?.data as any)?.sessionId,
          title: q.content?.title,
        }));
      console.log('[IOSNotifications] Scheduled notifications', list);
      return list;
    } catch (e) {
      console.warn('[IOSNotifications] Failed to list scheduled notifications', e);
      return [];
    }
  }
};

export default IOSLocalNotifications;
