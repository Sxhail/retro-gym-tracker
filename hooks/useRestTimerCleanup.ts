import { useEffect } from 'react';
import { useWorkoutSession } from '../context/WorkoutSessionContext';

/**
 * Cleanup orphaned rest timer data on app startup when no workout is active
 */
export function useRestTimerCleanup() {
  const session = useWorkoutSession();
  
  useEffect(() => {
    const cleanupOrphanedTimers = async () => {
      // Only clean up if there's no active workout
      if (!session.isWorkoutActive) {
        try {
          const { backgroundSessionService } = await import('../services/backgroundSession');
          const { db } = await import('../db/client');
          const { active_session_timers } = await import('../db/schema');
          const { eq } = await import('drizzle-orm');
          
          // Get all rest timers
          const restTimers = await db
            .select()
            .from(active_session_timers)
            .where(eq(active_session_timers.timer_type, 'rest'));
          
          // SAFER CLEANUP: Only remove timers that are definitely expired or absurdly old
          const now = new Date();
          let cleaned = 0;
          for (const timer of restTimers) {
            const start = new Date(timer.start_time);
            const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
            const remaining = Math.max(0, timer.duration - elapsed);
            const isVeryOld = elapsed > 24 * 60 * 60; // older than 24h
            const isExpired = remaining <= 0;
            if (isExpired || isVeryOld) {
              await backgroundSessionService.clearTimerData(timer.session_id, 'rest');
              cleaned++;
            }
          }
          if (cleaned > 0) {
            console.log('🧹 Cleaned up', cleaned, 'expired/old rest timers');
          }
        } catch (error) {
          console.error('Failed to cleanup orphaned rest timers:', error);
        }
      }
    };

    // Run cleanup after a slightly longer delay to avoid racing restoration on cold start
    const timeout = setTimeout(cleanupOrphanedTimers, 8000);
    return () => clearTimeout(timeout);
  }, [session.isWorkoutActive]);
}
