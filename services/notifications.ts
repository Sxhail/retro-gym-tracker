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
    shouldShowBanner: !isAppForeground,
    shouldShowList: !isAppForeground,
    shouldPlaySound: !isAppForeground,
    shouldSetBadge: false,
  }),
});

// Track app foreground/background state for handler
AppState.addEventListener('change', (state: AppStateStatus) => {
  isAppForeground = state === 'active';
});

export const NotificationService = {
  async getPermissionStatus(): Promise<Notifications.PermissionStatus> {
    try {
      const settings = await Notifications.getPermissionsAsync();
      return settings.status;
    } catch {
      return 'undetermined' as Notifications.PermissionStatus;
    }
  },

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
  const fireAt: Date = when.getTime() <= now ? new Date(now + 500) : when;

    // Use date-based trigger for precise delivery even if app is killed
  const payload: Notifications.NotificationRequestInput = {
      content: {
        title,
        body,
        // Use default sound on both platforms
        sound: true as any,
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
    // Race-safe cutoff: only cancel notifications scheduled before this call started
    const cutoff = Date.now();

    // Build a quick map of identifier -> trigger time for this session
    let idToTime = new Map<string, number>();
    try {
      const queued = await Notifications.getAllScheduledNotificationsAsync();
      for (const q of queued) {
        const sid = (q.content?.data as any)?.sessionId;
        const trig: any = q.trigger as any;
        const raw = trig?.date ?? trig?.timestamp ?? trig?.value ?? null;
        const d = typeof raw === 'number' ? new Date(raw) : (raw instanceof Date ? raw : (raw ? new Date(raw) : null));
        if (sid === sessionId && d && !isNaN(d.getTime()) && q.identifier) {
          idToTime.set(q.identifier, d.getTime());
        }
      }
    } catch {}

    // Cancel any IDs we tracked in-memory for this logical session, but only if they existed before cutoff
    const ids = sessionMap.get(sessionId) ?? [];
    const kept: string[] = [];
    for (const id of ids) {
      const ts = idToTime.get(id);
      if (ts && ts > cutoff) {
        // Newer than cutoff; keep it
        kept.push(id);
        continue;
      }
      try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
    }
    if (kept.length) sessionMap.set(sessionId, kept); else sessionMap.delete(sessionId);

    // Also scan the OS queue for any notifications tagged with this sessionId (works after reload),
    // but only cancel those scheduled at or before the cutoff to avoid racing with freshly added ones.
    try {
      const queued = await Notifications.getAllScheduledNotificationsAsync();
      for (const q of queued) {
        const sid = (q.content?.data as any)?.sessionId;
        if (sid !== sessionId || !q.identifier) continue;
        const trig: any = q.trigger as any;
        const raw = trig?.date ?? trig?.timestamp ?? trig?.value ?? null;
        const d = typeof raw === 'number' ? new Date(raw) : (raw instanceof Date ? raw : (raw ? new Date(raw) : null));
        const ms = d && !isNaN(d.getTime()) ? d.getTime() : undefined;
        if (ms === undefined || ms <= cutoff) {
          try { await Notifications.cancelScheduledNotificationAsync(q.identifier); } catch {}
        }
      }
    } catch {}
  },

  // Convenience: cancel any notifications whose sessionId begins with a prefix
  async cancelBySessionPrefix(sessionIdPrefix: string) {
    const cutoff = Date.now();
    // Preload id->time for targeted cancellations
    let idToTime = new Map<string, number>();
    try {
      const queued = await Notifications.getAllScheduledNotificationsAsync();
      for (const q of queued) {
        const sid = (q.content?.data as any)?.sessionId;
        const trig: any = q.trigger as any;
        const raw = trig?.date ?? trig?.timestamp ?? trig?.value ?? null;
        const d = typeof raw === 'number' ? new Date(raw) : (raw instanceof Date ? raw : (raw ? new Date(raw) : null));
        if (typeof sid === 'string' && sid.startsWith(sessionIdPrefix) && d && !isNaN(d.getTime()) && q.identifier) {
          idToTime.set(q.identifier, d.getTime());
        }
      }
    } catch {}

    // In-memory first (race-safe)
    for (const [sid, ids] of sessionMap.entries()) {
      if (!sid.startsWith(sessionIdPrefix)) continue;
      const kept: string[] = [];
      for (const id of ids) {
        const ts = idToTime.get(id);
        if (ts && ts > cutoff) { kept.push(id); continue; }
        try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
      }
      if (kept.length) sessionMap.set(sid, kept); else sessionMap.delete(sid);
    }
    // OS queue scan (race-safe)
    try {
      const queued = await Notifications.getAllScheduledNotificationsAsync();
      for (const q of queued) {
        const sid = (q.content?.data as any)?.sessionId;
        if (!q.identifier || typeof sid !== 'string' || !sid.startsWith(sessionIdPrefix)) continue;
        const trig: any = q.trigger as any;
        const raw = trig?.date ?? trig?.timestamp ?? trig?.value ?? null;
        const d = typeof raw === 'number' ? new Date(raw) : (raw instanceof Date ? raw : (raw ? new Date(raw) : null));
        const ms = d && !isNaN(d.getTime()) ? d.getTime() : undefined;
        if (ms === undefined || ms <= cutoff) {
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
