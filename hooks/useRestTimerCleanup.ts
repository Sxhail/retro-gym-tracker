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
          
          // Clean up all rest timers if no workout is active
          for (const timer of restTimers) {
            await backgroundSessionService.clearTimerData(timer.session_id, 'rest');
          }
          
          if (restTimers.length > 0) {
            console.log('🧹 Cleaned up', restTimers.length, 'orphaned rest timers');
          }
        } catch (error) {
          console.error('Failed to cleanup orphaned rest timers:', error);
        }
      }
    };

    // Run cleanup after a short delay to ensure session state is stable
    const timeout = setTimeout(cleanupOrphanedTimers, 3000);
    return () => clearTimeout(timeout);
  }, [session.isWorkoutActive]);
}
