import { db } from '../db/client';
import { active_workout_sessions, active_session_timers } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import type { Exercise, SessionMeta } from '../context/WorkoutSessionContext';

export interface SessionState {
  sessionId: string;
  name: string;
  startTime: Date;
  elapsedTime: number;
  isPaused: boolean;
  currentExercises: Exercise[];
  sessionMeta: SessionMeta;
  currentExerciseIndex?: number;
}

export interface TimerState {
  sessionId: string;
  timerType: 'workout' | 'rest';
  startTime: Date;
  duration: number;
  elapsedWhenPaused: number;
  isActive: boolean;
}

/**
 * Background Session Persistence Service
 * Handles saving and restoring workout sessions for background continuity
 */
class BackgroundSessionService {
  /**
   * Save current session state to SQLite
   * Called automatically on state changes and app backgrounding
   */
  async saveSessionState(state: SessionState): Promise<void> {
    try {
      const sessionData = {
        currentExercises: state.currentExercises,
        sessionMeta: state.sessionMeta,
        currentExerciseIndex: state.currentExerciseIndex || 0,
      };

      const sessionRecord = {
        session_id: state.sessionId,
        name: state.name,
        start_time: state.startTime.toISOString(),
        elapsed_time: state.elapsedTime,
        is_paused: state.isPaused ? 1 : 0,
        current_exercise_index: state.currentExerciseIndex || 0,
        session_data: JSON.stringify(sessionData),
        last_updated: new Date().toISOString(),
      };

      // Upsert session data (insert or update if exists)
      const existingSession = await db
        .select()
        .from(active_workout_sessions)
        .where(eq(active_workout_sessions.session_id, state.sessionId))
        .limit(1);

      if (existingSession.length > 0) {
        await db
          .update(active_workout_sessions)
          .set(sessionRecord)
          .where(eq(active_workout_sessions.session_id, state.sessionId));
      } else {
        await db.insert(active_workout_sessions).values(sessionRecord);
      }

      console.log('✅ Session state saved to background storage');
    } catch (error) {
      console.error('❌ Error saving session state:', error);
      throw error;
    }
  }

  /**
   * Save timer state for accurate background timing
   */
  async saveTimerState(timer: TimerState): Promise<void> {
    try {
      const timerRecord = {
        session_id: timer.sessionId,
        timer_type: timer.timerType,
        start_time: timer.startTime.toISOString(),
        duration: timer.duration,
        elapsed_when_paused: timer.elapsedWhenPaused,
        is_active: timer.isActive ? 1 : 0,
      };

      // Remove any existing active timers for this session and type
      await db
        .delete(active_session_timers)
        .where(
          and(
            eq(active_session_timers.session_id, timer.sessionId),
            eq(active_session_timers.timer_type, timer.timerType)
          )
        );

      // Insert new timer state
      await db.insert(active_session_timers).values(timerRecord);

      console.log(`✅ ${timer.timerType} timer state saved`);
    } catch (error) {
      console.error('❌ Error saving timer state:', error);
      throw error;
    }
  }

  /**
   * Restore session state from SQLite
   * Called on app launch to resume active sessions
   */
  async restoreSessionState(): Promise<SessionState | null> {
    try {
      const sessions = await db
        .select()
        .from(active_workout_sessions)
        .limit(1); // Get the most recent active session

      if (sessions.length === 0) {
        console.log('📱 No active session found');
        return null;
      }

      const session = sessions[0];
      const sessionData = JSON.parse(session.session_data);
      const startTime = new Date(session.start_time);
      
      // Calculate current elapsed time based on real time passage
      const currentTime = new Date();
      const realElapsedTime = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
      
      // Use stored elapsed time if paused, otherwise calculate from real time
      const elapsedTime = session.is_paused ? session.elapsed_time : realElapsedTime;

      const restoredState: SessionState = {
        sessionId: session.session_id,
        name: session.name,
        startTime,
        elapsedTime,
        isPaused: session.is_paused === 1,
        currentExercises: sessionData.currentExercises || [],
        sessionMeta: sessionData.sessionMeta,
        currentExerciseIndex: session.current_exercise_index,
      };

      console.log('✅ Session state restored from background storage');
      console.log(`📊 Elapsed time: ${elapsedTime}s (${session.is_paused ? 'paused' : 'active'})`);
      
      return restoredState;
    } catch (error) {
      console.error('❌ Error restoring session state:', error);
      return null;
    }
  }

  /**
   * Restore timer state and calculate current elapsed time
   */
  async restoreTimerState(sessionId: string, timerType: 'workout' | 'rest'): Promise<TimerState | null> {
    try {
      const timers = await db
        .select()
        .from(active_session_timers)
        .where(
          and(
            eq(active_session_timers.session_id, sessionId),
            eq(active_session_timers.timer_type, timerType),
            eq(active_session_timers.is_active, 1)
          )
        )
        .limit(1);

      if (timers.length === 0) {
        return null;
      }

      const timer = timers[0];
      const startTime = new Date(timer.start_time);
      const currentTime = new Date();
      
      // Calculate real elapsed time since timer started
      const realElapsed = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
      const totalElapsed = timer.elapsed_when_paused + realElapsed;

      const restoredTimer: TimerState = {
        sessionId: timer.session_id,
        timerType: timer.timer_type as 'workout' | 'rest',
        startTime,
        duration: timer.duration,
        elapsedWhenPaused: totalElapsed,
        isActive: timer.is_active === 1,
      };

      console.log(`✅ ${timerType} timer restored: ${totalElapsed}s elapsed`);
      return restoredTimer;
    } catch (error) {
      console.error('❌ Error restoring timer state:', error);
      return null;
    }
  }

  /**
   * Clear session and timer data when workout is completed
   */
  async clearSessionData(sessionId: string): Promise<void> {
    try {
      // Delete session and associated timers
      await db.delete(active_session_timers).where(eq(active_session_timers.session_id, sessionId));
      await db.delete(active_workout_sessions).where(eq(active_workout_sessions.session_id, sessionId));
      
      console.log('✅ Session data cleared from background storage');
    } catch (error) {
      console.error('❌ Error clearing session data:', error);
      throw error;
    }
  }

  /**
   * Clean up old/stale sessions (older than 24 hours)
   */
  async cleanupOldSessions(): Promise<void> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      // Delete old sessions and their timers
      const oldSessions = await db
        .select({ session_id: active_workout_sessions.session_id })
        .from(active_workout_sessions)
        .where(eq(active_workout_sessions.last_updated, oneDayAgo));

      for (const session of oldSessions) {
        await this.clearSessionData(session.session_id);
      }

      console.log(`🧹 Cleaned up ${oldSessions.length} old sessions`);
    } catch (error) {
      console.error('❌ Error cleaning up old sessions:', error);
    }
  }

  /**
   * Generate unique session ID
   */
  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const backgroundSessionService = new BackgroundSessionService();
