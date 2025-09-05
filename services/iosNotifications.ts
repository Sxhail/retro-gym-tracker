import * as Notifications from 'expo-notifications';
import { Platform, AppState } from 'react-native';

type SessionId = string;

let initialized = false;

// Only show notifications when app is in background or inactive
// BUT always play sound for countdown notifications
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const appState = AppState.currentState;
    const shouldShow = appState === 'background' || appState === 'inactive';
    const isCountdown = (notification as any)?.request?.content?.data?.sessionId?.includes('_countdown');
    
    return {
      shouldShowAlert: shouldShow,
      shouldShowBanner: shouldShow,
      shouldShowList: shouldShow,
      shouldPlaySound: shouldShow || isCountdown, // Always play sound for countdown notifications
      shouldSetBadge: false,
    };
  },
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

  async scheduleAbsolute(sessionId: SessionId, when: Date, title: string, body: string, customSound?: string) {
    if (Platform.OS !== 'ios') return null;
    if (!initialized) await IOSLocalNotifications.initialize();
    
    const now = Date.now();
    const deltaMs = when.getTime() - now;
    const seconds = Math.max(1, Math.round(deltaMs / 1000));

    // Determine notification type based on sessionId pattern
    const isCardio = sessionId.includes('hiit') || sessionId.includes('walk');
    const isLiftRest = sessionId.includes('lift-rest');
    const notificationType = isCardio ? 'cardio_phase_transition' : 
                            isLiftRest ? 'lift_rest_timer' : 'general';

    try {
      console.log(`[IOSNotifications] Scheduling notification with sound: ${customSound || 'default'}`);
      
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: customSound || 'default',
          data: {
            sessionId,
            notificationType,
          },
        },
        trigger: { type: 'timeInterval', seconds, repeats: false } as any,
      });
      
      console.log(`[IOSNotifications] Scheduled notification ${id} for ${title} with sound: ${customSound || 'default'}`);
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

  async cancelAllLiftRest() {
    if (Platform.OS !== 'ios') return;
    try {
      console.log('[IOSNotifications] Clearing all lift rest notifications');
      const queued = await Notifications.getAllScheduledNotificationsAsync();
      let cancelled = 0;
      for (const q of queued) {
        const type = (q.content?.data as any)?.notificationType;
        if (type === 'lift_rest_timer' && q.identifier) {
          try {
            await Notifications.cancelScheduledNotificationAsync(q.identifier);
            cancelled++;
          } catch (e) {
            console.warn('[IOSNotifications] Failed to cancel lift rest notification', q.identifier, e);
          }
        }
      }
      console.log(`[IOSNotifications] Cleared ${cancelled} lift rest notifications`);
    } catch (e) {
      console.warn('[IOSNotifications] Failed to clear lift rest notifications', e);
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
