/**
 * Cardio Session Cleanup Utility
 * This utility provides functions to clean up stale or orphaned cardio sessions
 */

import { cardioBackgroundSessionService as svc } from '../services/cardioBackgroundSession';

export class CardioSessionCleanup {
  /**
   * Force clear all active cardio sessions
   * Use this as an emergency cleanup mechanism
   */
  static async clearAllActiveSessions(): Promise<void> {
    try {
      console.log('[CardioSessionCleanup] Clearing all active sessions...');
      const sessions = await svc.listActiveSessions();
      
      for (const session of sessions) {
        await svc.clearActiveSession(session.sessionId);
        console.log(`[CardioSessionCleanup] Cleared session: ${session.sessionId}`);
      }
      
      // Additional cleanup - clear any stale sessions
      await svc.clearStaleSessions();
      
      console.log(`[CardioSessionCleanup] Cleared ${sessions.length} sessions`);
    } catch (error) {
      console.error('[CardioSessionCleanup] Failed to clear sessions:', error);
      throw error;
    }
  }

  /**
   * Clean up sessions older than specified hours
   */
  static async clearOldSessions(maxAgeHours: number = 24): Promise<void> {
    try {
      console.log(`[CardioSessionCleanup] Clearing sessions older than ${maxAgeHours} hours...`);
      const sessions = await svc.listActiveSessions();
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;
      
      let clearedCount = 0;
      
      for (const session of sessions) {
        const sessionAge = now - new Date(session.startedAt).getTime();
        if (sessionAge > maxAge) {
          await svc.clearActiveSession(session.sessionId);
          console.log(`[CardioSessionCleanup] Cleared old session: ${session.sessionId} (age: ${(sessionAge / 1000 / 60 / 60).toFixed(1)} hours)`);
          clearedCount++;
        }
      }
      
      console.log(`[CardioSessionCleanup] Cleared ${clearedCount} old sessions`);
    } catch (error) {
      console.error('[CardioSessionCleanup] Failed to clear old sessions:', error);
      throw error;
    }
  }

  /**
   * Validate and clean up invalid sessions
   */
  static async cleanupInvalidSessions(): Promise<void> {
    try {
      console.log('[CardioSessionCleanup] Cleaning up invalid sessions...');
      const sessions = await svc.listActiveSessions();
      
      let clearedCount = 0;
      
      for (const session of sessions) {
        // Check for invalid sessions
        if (!session.mode || !session.params || !session.schedule?.length) {
          await svc.clearActiveSession(session.sessionId);
          console.log(`[CardioSessionCleanup] Cleared invalid session: ${session.sessionId}`);
          clearedCount++;
        }
      }
      
      console.log(`[CardioSessionCleanup] Cleared ${clearedCount} invalid sessions`);
    } catch (error) {
      console.error('[CardioSessionCleanup] Failed to cleanup invalid sessions:', error);
      throw error;
    }
  }

  /**
   * Get summary of current active sessions
   */
  static async getSessionSummary(): Promise<{
    totalSessions: number;
    sessions: Array<{
      sessionId: string;
      mode: string;
      startedAt: string;
      ageHours: number;
      isValid: boolean;
    }>;
  }> {
    try {
      const sessions = await svc.listActiveSessions();
      const now = Date.now();
      
      return {
        totalSessions: sessions.length,
        sessions: sessions.map(session => ({
          sessionId: session.sessionId,
          mode: session.mode,
          startedAt: session.startedAt,
          ageHours: (now - new Date(session.startedAt).getTime()) / (1000 * 60 * 60),
          isValid: !!(session.mode && session.params && session.schedule?.length)
        }))
      };
    } catch (error) {
      console.error('[CardioSessionCleanup] Failed to get session summary:', error);
      throw error;
    }
  }
}
