import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'expo-router';
import CardioCompletionModal from './CardioCompletionModal';
import { useCardioSession } from '../hooks/useCardioSession';

export default function GlobalCardioCompletion() {
  const { state, finish, cancel, reset } = useCardioSession();
  const [visible, setVisible] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Show modal when cardio reaches completed phase
  useEffect(() => {
    if (state?.phase === 'completed' && state.sessionId) {
      setVisible(true);
      // Ensure session is fully cleared so no timers remain
      // finish() will save history and clear notifications/context
      finish().catch(() => {});
    }
  }, [state?.phase, state?.sessionId, finish]);

  const onClose = () => setVisible(false);
  const onViewHistory = () => {
    setVisible(false);
    // Navigate to cardio history screen if exists; fallback to history tab
    try { router.push('/history'); } catch {}
  };
  const onNewCardio = () => {
    setVisible(false);
    try { router.push('/cardio'); } catch {}
  };

  // Hide on cardio builder page
  if (pathname === '/cardio') return null;
  return (
    <CardioCompletionModal
      visible={visible}
      onClose={onClose}
      onViewHistory={onViewHistory}
      onNewCardio={onNewCardio}
    />
  );
}
