import * as Notifications from 'expo-notifications';
import { Platform, AppState, AppStateStatus } from 'react-native';

// Contract
// - initialize(): request permissions and set handler
// - scheduleAbsolute(sessionId, when, title, body): schedule notification for a specific Date
// - cancelAllForSession(sessionId): cancel pending notifications for a session
// - cancelAllPending(): safety clear

type SessionId = string;

const sessionMap = new Map<SessionId, string[]>();
let isAppForeground = AppState.currentState === 'active';
let initialized = false;

// Register a notification handler ASAP at module load so foreground presentation is correct
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    // Show alerts/sounds only when app is NOT foregrounded (lock screen / other apps)
    shouldShowAlert: !isAppForeground,
    shouldPlaySound: !isAppForeground,
    shouldSetBadge: false,
  }),
});

// Track app foreground/background state for handler
AppState.addEventListener('change', (state: AppStateStatus) => {
  isAppForeground = state === 'active';
});

export const NotificationService = {
  async initialize() {
  if (initialized) return;

    // Android: ensure a high-importance channel with sound
  if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#00FFC2',
          enableVibrate: true,
          sound: 'default',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      } catch (e) {
        console.warn('Failed to configure Android notification channel', e);
      }
    }

    // Permission request (idempotent) – iOS and Android 13+
    try {
      const settings = await Notifications.getPermissionsAsync();
      let status = settings.status;
      if (status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowSound: true, allowBadge: false },
        });
        status = req.status;
      }
      if (status !== 'granted') {
        console.warn('[Notifications] Permission not granted. Local notifications may be blocked.');
      }
    } catch (e) {
      console.warn('Failed requesting notification permissions', e);
    }

    initialized = true;
  },

  async scheduleAbsolute(sessionId: SessionId, when: Date, title: string, body: string) {
    // Ensure initialization (channel/permissions) before scheduling
    try {
      if (!initialized) {
        await NotificationService.initialize();
      } else if (Platform.OS === 'android') {
        // Re-assert channel settings defensively (idempotent)
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#00FFC2',
          enableVibrate: true,
          sound: 'default',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      }
    } catch {}
    // Ensure permission at schedule time as well
    try {
      let perm = await Notifications.getPermissionsAsync();
      if (perm.status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowSound: true, allowBadge: false },
        });
        perm = req;
      }
      if (perm.status !== 'granted') {
        console.warn('[Notifications] Permission denied when scheduling. Skipping schedule for', title);
        return null;
      }
    } catch (e) {
      console.warn('[Notifications] Permission check/request failed', e);
    }

    // Clamp past times to near-future to ensure delivery
    const now = Date.now();
    const fireAt = when.getTime() <= now ? new Date(now + 500) : when;

    // Use date-based trigger for precise delivery even if app is killed
  const payload: Notifications.NotificationRequestInput = {
      content: {
        title,
        body,
        sound: true,
    data: { sessionId, fireAt: fireAt.toISOString() },
        ...(Platform.OS === 'android'
          ? { channelId: 'default', priority: Notifications.AndroidNotificationPriority.MAX }
          : {}),
        ...(Platform.OS === 'ios' ? ({ interruptionLevel: 'timeSensitive' } as any) : {}),
      },
      // The simple date trigger input is the most reliable across OS versions
      trigger: { date: fireAt } as any,
    };

    const id = await Notifications.scheduleNotificationAsync(payload);

    const list = sessionMap.get(sessionId) ?? [];
    list.push(id);
    sessionMap.set(sessionId, list);

    // Debug: log scheduled notifications queue (helps diagnose on device)
    try {
      const queued = await Notifications.getAllScheduledNotificationsAsync();
      const count = queued?.length ?? 0;
      const last = queued?.[queued.length - 1];
      console.log(
        `[Notifications] Scheduled '${title}' for ${fireAt.toISOString()} (id=${id}). Total queued: ${count}.` +
          (last ? ` Last item fires at ${(last.trigger as any)?.date ?? (last.trigger as any)?.timestamp}` : '')
      );
    } catch {}

    return id;
  },

  async cancelAllForSession(sessionId: SessionId) {
    const ids = sessionMap.get(sessionId) ?? [];
    for (const id of ids) {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch {}
    }
    sessionMap.delete(sessionId);
  },

  async cancelAllPending() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      sessionMap.clear();
    } catch (e) {
      console.warn('Failed to cancel all scheduled notifications', e);
    }
  },
};

export default NotificationService;
