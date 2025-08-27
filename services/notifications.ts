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
  handleNotification: async (notification) => {
    const fg = isAppForeground;
    if (fg) {
      try {
        const title = (notification as any)?.request?.content?.title;
        console.log('[Notifications] Suppressing foreground notification:', title);
      } catch {}
    }
    return {
      // Present notifications only when the app is NOT in the foreground
      shouldShowAlert: !fg,
      shouldShowBanner: !fg,
      shouldShowList: !fg,
      shouldPlaySound: !fg,
      shouldSetBadge: false,
    };
  },
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
        // On iOS, provide a sound name or 'default' to ensure audible alert when backgrounded
        sound: Platform.OS === 'ios' ? 'default' : (true as any),
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
    // Cancel any IDs we tracked in-memory for this logical session
    const ids = sessionMap.get(sessionId) ?? [];
    for (const id of ids) {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch {}
    }
    sessionMap.delete(sessionId);

    // Also scan the OS queue for any notifications tagged with this sessionId
    // This works even after an app reload where the in-memory map is empty.
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

  // Convenience: cancel any notifications whose sessionId begins with a prefix
  async cancelBySessionPrefix(sessionIdPrefix: string) {
    // In-memory first
    for (const [sid, ids] of sessionMap.entries()) {
      if (!sid.startsWith(sessionIdPrefix)) continue;
      for (const id of ids) {
        try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
      }
      sessionMap.delete(sid);
    }
    // OS queue scan
    try {
      const queued = await Notifications.getAllScheduledNotificationsAsync();
      for (const q of queued) {
        const sid = (q.content?.data as any)?.sessionId;
        if (typeof sid === 'string' && sid.startsWith(sessionIdPrefix) && q.identifier) {
          try { await Notifications.cancelScheduledNotificationAsync(q.identifier); } catch {}
        }
      }
    } catch {}
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
