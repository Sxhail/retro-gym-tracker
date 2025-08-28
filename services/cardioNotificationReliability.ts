import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { db } from '../db/client';
import { active_cardio_notifications } from '../db/schema';
import { eq, and, lte, gte } from 'drizzle-orm';

/**
 * Cardio Notification Reliability Service
 * 
 * This service ensures reliable delivery of cardio notifications by:
 * - Monitoring notification delivery
 * - Handling missed notifications when app returns to foreground
 * - Providing fallback mechanisms for critical phase transitions
 * - Tracking notification performance metrics
 */

/**
 * Cardio Notification Reliability Service
 * 
 * This service ensures reliable delivery of cardio notifications by:
 * - Monitoring notification delivery
 * - Handling missed notifications when app returns to foreground
 * - Providing fallback mechanisms for critical phase transitions
 * - Tracking notification performance metrics
 */

const MAX_CATCHUP_DELAY_MS = 10000; // 10 seconds max catchup for missed notifications

export interface PendingNotification {
  sessionId: string;
  phaseId: string;
  scheduledAt: string;
  fireAt: string;
  title: string;
  body: string;
  phase: string;
  cycleIndex: number;
  delivered?: boolean;
  caughtUp?: boolean;
}

export interface NotificationMetrics {
  scheduled: number;
  delivered: number;
  missed: number;
  caughtUp: number;
  lastReset: string;
}

class CardioNotificationReliabilityService {
  private isMonitoring = false;
  private appStateSubscription: any;
  private notificationSubscription: any;
  private metrics: NotificationMetrics = {
    scheduled: 0,
    delivered: 0,
    missed: 0,
    caughtUp: 0,
    lastReset: new Date().toISOString()
  };

  /**
   * Initialize the reliability service
   */
  async initialize(): Promise<void> {
    if (this.isMonitoring) return;
    
    console.log('[NotificationReliability] Initializing...');
    
    // Listen for notification received events
    this.notificationSubscription = Notifications.addNotificationReceivedListener(
      this.handleNotificationReceived
    );

    // Listen for app state changes to handle missed notifications
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange
    );

    this.isMonitoring = true;
    console.log('[NotificationReliability] Initialized successfully');
  }

  /**
   * Shutdown the reliability service
   */
  async shutdown(): Promise<void> {
    if (!this.isMonitoring) return;
    
    console.log('[NotificationReliability] Shutting down...');
    
    if (this.notificationSubscription) {
      this.notificationSubscription.remove();
      this.notificationSubscription = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    this.isMonitoring = false;
    console.log('[NotificationReliability] Shutdown complete');
  }

  /**
   * Register a notification as pending (when scheduling)
   */
  async registerPendingNotification(notification: PendingNotification): Promise<void> {
    try {
      // Store in database for persistence
      await db.insert(active_cardio_notifications).values({
        session_id: notification.sessionId,
        notification_id: notification.phaseId,
        fire_at: notification.fireAt,
        created_at: notification.scheduledAt,
      }).onConflictDoUpdate({
        target: active_cardio_notifications.notification_id,
        set: {
          fire_at: notification.fireAt,
        },
      });
      
      this.metrics.scheduled++;
      
      console.log(`[NotificationReliability] Registered pending: ${notification.phaseId}`);
    } catch (error) {
      console.warn('[NotificationReliability] Failed to register pending notification:', error);
    }
  }

  /**
   * Mark a notification as delivered
   */
  async markNotificationDelivered(sessionId: string, phaseId?: string): Promise<void> {
    try {
      // Remove from pending notifications in database
      if (phaseId) {
        await db.delete(active_cardio_notifications)
          .where(and(
            eq(active_cardio_notifications.session_id, sessionId),
            eq(active_cardio_notifications.notification_id, phaseId)
          ));
      } else {
        await db.delete(active_cardio_notifications)
          .where(eq(active_cardio_notifications.session_id, sessionId));
      }
      
      this.metrics.delivered++;
      
      console.log(`[NotificationReliability] Marked delivered: ${sessionId}${phaseId ? ` - ${phaseId}` : ''}`);
    } catch (error) {
      console.warn('[NotificationReliability] Failed to mark notification delivered:', error);
    }
  }

  /**
   * Clear all pending notifications for a session
   */
  async clearSessionNotifications(sessionId: string): Promise<void> {
    try {
      await db.delete(active_cardio_notifications)
        .where(eq(active_cardio_notifications.session_id, sessionId));
      
      console.log(`[NotificationReliability] Cleared notifications for session: ${sessionId}`);
    } catch (error) {
      console.warn('[NotificationReliability] Failed to clear session notifications:', error);
    }
  }

  /**
   * Check for and handle missed notifications
   */
  async checkMissedNotifications(): Promise<void> {
    try {
      console.log('[NotificationReliability] Checking for missed notifications...');
      const now = new Date();
      const cutoff = new Date(now.getTime() - MAX_CATCHUP_DELAY_MS);
      
      // Find notifications that should have fired but are still pending
      const missed = await db.select()
        .from(active_cardio_notifications)
        .where(and(
          lte(active_cardio_notifications.fire_at, now.toISOString()),
          // Only catch up recent missed notifications (fire_at >= cutoff)
          gte(active_cardio_notifications.fire_at, cutoff.toISOString())
        ));

      if (missed.length === 0) {
        console.log('[NotificationReliability] No missed notifications to catch up');
        return;
      }

      console.log(`[NotificationReliability] Found ${missed.length} missed notifications`);
      
      for (const notification of missed) {
        await this.deliverCatchupNotification({
          sessionId: notification.session_id,
          phaseId: notification.notification_id,
          scheduledAt: notification.created_at || now.toISOString(),
          fireAt: notification.fire_at,
          title: 'Phase Transition',
          body: 'Your cardio phase has changed',
          phase: 'unknown',
          cycleIndex: 0
        });
      }
      
      // Clean up the missed notifications from database
      await db.delete(active_cardio_notifications)
        .where(and(
          lte(active_cardio_notifications.fire_at, now.toISOString()),
          gte(active_cardio_notifications.fire_at, cutoff.toISOString())
        ));
      
    } catch (error) {
      console.warn('[NotificationReliability] Failed to check missed notifications:', error);
    }
  }

  /**
   * Get notification reliability metrics
   */
  getMetrics(): NotificationMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      scheduled: 0,
      delivered: 0,
      missed: 0,
      caughtUp: 0,
      lastReset: new Date().toISOString()
    };
    
    console.log('[NotificationReliability] Metrics reset');
  }

  // Private methods

  private handleNotificationReceived = async (notification: Notifications.Notification) => {
    const data = notification.request.content.data as any;
    
    if (data?.notificationType === 'cardio_phase_transition' && data?.sessionId) {
      console.log(`[NotificationReliability] Notification received: ${data.sessionId}`);
      await this.markNotificationDelivered(data.sessionId, data.phaseId);
    }
  };

  private handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App came to foreground, check for missed notifications
      setTimeout(async () => {
        await this.checkMissedNotifications();
      }, 1000); // Small delay to let app fully initialize
    }
  };

  private async deliverCatchupNotification(notification: PendingNotification): Promise<void> {
    try {
      console.log(`[NotificationReliability] Delivering catch-up notification: ${notification.phaseId}`);
      
      // Create a modified title to indicate this is a catch-up
      const catchupTitle = `⚡ Phase Transition`;
      const catchupBody = `Your cardio phase changed while the app was backgrounded`;
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: catchupTitle,
          body: catchupBody,
          sound: 'default' as any,
          data: {
            sessionId: notification.sessionId,
            phaseId: notification.phaseId,
            notificationType: 'cardio_phase_transition_catchup',
            originalFireAt: notification.fireAt
          }
        },
        trigger: null // Fire immediately
      });
      
      this.metrics.caughtUp++;
      
    } catch (error) {
      console.warn(`[NotificationReliability] Failed to deliver catch-up notification:`, error);
      this.metrics.missed++;
    }
  }
}

// Export singleton instance
export const cardioNotificationReliability = new CardioNotificationReliabilityService();

export default cardioNotificationReliability;
