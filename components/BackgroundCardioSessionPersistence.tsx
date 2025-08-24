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
        const snap = await svc.restoreActiveSession();
        if (!mounted || !snap || !snap.sessionId) return;
        // Reschedule from persisted schedule (service cancels stored IDs first)
        await svc.scheduleNotifications(snap.sessionId, snap.schedule);
      } catch (e) {}
    })();
    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        try {
          const snap = await svc.restoreActiveSession();
          if (!snap || !snap.sessionId) return;
          await svc.scheduleNotifications(snap.sessionId, snap.schedule);
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
