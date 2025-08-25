import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { cardioBackgroundSessionService as svc } from '../services/cardioBackgroundSession';

type Props = { children: React.ReactNode };

// Background Cardio Session Persistence
// - On mount/app launch: reschedules notifications for any active cardio session from persisted schedule
// - On foreground transitions: fast check to ensure notifications are still scheduled
export default function BackgroundCardioSessionPersistence({ children }: Props) {
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // On cold start, keep only the latest session and clear stale rows to avoid duplicate schedules
        const list = await svc.listActiveSessions();
        if (!mounted) return;
        if (list.length > 1) {
          const latest = list.reduce((a, b) => (new Date(a.startedAt).getTime() > new Date(b.startedAt).getTime() ? a : b));
          await svc.clearStaleSessions(latest.sessionId);
          if (!mounted) return;
          await svc.scheduleNotifications(latest.sessionId, latest.schedule);
        } else if (list.length === 1) {
          const snap = list[0];
          await svc.scheduleNotifications(snap.sessionId, snap.schedule);
        }
      } catch (e) {}
    })();
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        try {
          const list = await svc.listActiveSessions();
          if (!list.length) return;
          const latest = list.reduce((a, b) => (new Date(a.startedAt).getTime() > new Date(b.startedAt).getTime() ? a : b));
          await svc.clearStaleSessions(latest.sessionId);
          await svc.scheduleNotifications(latest.sessionId, latest.schedule);
        } catch {}
      }
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return <>{children}</>;
}
