import * as Notifications from 'expo-notifications';
import { Platform, AppState, AppStateStatus, Linking } from 'react-native';

// Contract
// - initialize(): request iOS permissions and set handler
// - scheduleAbsolute(): schedule notification for a specific Date
// - cancelAllForSession(sessionId): cancel pending notifications for a session
// - cancelAllPending(): safety clear

type SessionId = string;

const sessionMap = new Map<SessionId, string[]>();
let isAppForeground = AppState.currentState === 'active';

export const NotificationService = {
  async initialize() {
    if (Platform.OS !== 'ios') return; // iOS-only per requirement

    // Show alerts and play sounds for local notifications
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        // Suppress alert when app is foregrounded; only show outside the app
        shouldShowAlert: !isAppForeground,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // Track app foreground/background state for handler
    const appStateListener = (state: AppStateStatus) => {
      isAppForeground = state === 'active';
    };
    AppState.addEventListener('change', appStateListener);

    // Permission request (idempotent)
    const settings = await Notifications.getPermissionsAsync();
    let status = settings.status;
    if (status !== 'granted') {
      try {
        const req = await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowSound: true, allowBadge: false },
        });
        status = req.status;
      } catch (e) {
        console.warn('Failed requesting iOS notification permissions', e);
      }
    }
    if (status !== 'granted') {
      console.warn('[Notifications] iOS permission not granted. Alert/Sound delivery will be blocked.');
    }
  },

  async scheduleAbsolute(sessionId: SessionId, when: Date, title: string, body: string) {
    if (Platform.OS !== 'ios') return null;
    // Ensure permission at schedule time as well
    try {
      const perm = await Notifications.getPermissionsAsync();
      if (perm.status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync({
          ios: { allowAlert: true, allowSound: true, allowBadge: false },
        });
        if (req.status !== 'granted') {
          console.warn('[Notifications] Permission denied when scheduling. Skipping schedule for', title);
          return null;
        }
      }
    } catch (e) {
      console.warn('[Notifications] Permission check/request failed', e);
    }
    // Clamp past times to near-future to ensure delivery
    const now = Date.now();
    const fireAt = when.getTime() <= now ? new Date(now + 500) : when;
    const payload: Notifications.NotificationRequestInput = {
      content: {
        title,
        body,
        // Default iOS notification sound
        sound: true,
        // Help delivery under Focus by marking as time-sensitive (best-effort; iOS specific)
        // Casting to any to avoid TS friction if type defs lag behind
        ...( { interruptionLevel: 'timeSensitive' } as any ),
      },
      // Use date trigger; Expo will deliver even if app is backgrounded/force-quit
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
    };
    const id = await Notifications.scheduleNotificationAsync(payload);

    const list = sessionMap.get(sessionId) ?? [];
    list.push(id);
    sessionMap.set(sessionId, list);
    // Debug: log scheduled notifications queue (helps diagnose on device)
    try {
      const queued = await Notifications.getAllScheduledNotificationsAsync();
      const count = queued?.length ?? 0;
      const next = queued?.[queued.length - 1];
      console.log(
        `[Notifications] Scheduled '${title}' for ${fireAt.toISOString()} (id=${id}). Total queued: ${count}.` +
          (next ? ` Last item fires at ${(next.trigger as any)?.date ?? (next.trigger as any)?.timestamp}` : '')
      );
    } catch {}
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
