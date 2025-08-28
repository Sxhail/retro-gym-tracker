import IOSLocalNotifications from './iosNotifications';

export interface RestTimerState {
  sessionId: string;
  exerciseId: number;
  setIdx: number;
  duration: number;
  startTime: Date;
  fireAt: Date;
}

class LiftRestNotificationService {
  // Track active rest timer notifications
  private activeNotifications = new Map<string, RestTimerState>();

  // Schedule a rest timer notification
  async scheduleRestNotification(state: RestTimerState): Promise<void> {
    try {
      // Cancel any existing notification for this session first
      await this.cancelRestNotification(state.sessionId);
      
      const now = Date.now();
      const fireTime = state.fireAt.getTime();
      
      // Only schedule if fire time is in the future
      if (fireTime > now + 1000) {
        const { title, body } = this.getRestNotificationContent(state);
        await IOSLocalNotifications.scheduleAbsolute(state.sessionId, state.fireAt, title, body);
        
        // Track this notification
        this.activeNotifications.set(state.sessionId, state);
        
        console.log(`[LiftRestNotifications] Scheduled rest notification for ${state.duration}s at ${state.fireAt.toISOString()}`);
      }
    } catch (error) {
      console.warn('Failed to schedule rest notification:', error);
    }
  }

  // Cancel a specific rest timer notification
  async cancelRestNotification(sessionId: string): Promise<void> {
    try {
      console.log(`[LiftRestNotifications] Cancelling rest notification for session ${sessionId}`);
      
      // Cancel the notification
      await IOSLocalNotifications.cancelAllForSession(sessionId);
      
      // Remove from tracking
      this.activeNotifications.delete(sessionId);
    } catch (error) {
      console.warn('Failed to cancel rest notification:', error);
    }
  }

  // Cancel all rest timer notifications
  async cancelAllRestNotifications(): Promise<void> {
    try {
      console.log('[LiftRestNotifications] Cancelling all rest notifications');
      
      // Cancel all tracked notifications
      for (const sessionId of this.activeNotifications.keys()) {
        await IOSLocalNotifications.cancelAllForSession(sessionId);
      }
      
      // Clear tracking
      this.activeNotifications.clear();
    } catch (error) {
      console.warn('Failed to cancel all rest notifications:', error);
    }
  }

  // Reschedule a rest timer notification (when duration is changed)
  async rescheduleRestNotification(state: RestTimerState): Promise<void> {
    console.log(`[LiftRestNotifications] Rescheduling rest notification for session ${state.sessionId}`);
    
    // Cancel existing and schedule new
    await this.cancelRestNotification(state.sessionId);
    await this.scheduleRestNotification(state);
  }

  // Get notification content
  private getRestNotificationContent(state: RestTimerState): { title: string; body: string } {
    return {
      title: 'REST OVER',
      body: `Time for your next set`
    };
  }

  // Get active notification count
  getActiveNotificationCount(): number {
    return this.activeNotifications.size;
  }

  // Check if a notification is active for a session
  hasActiveNotification(sessionId: string): boolean {
    return this.activeNotifications.has(sessionId);
  }
}

export const liftRestNotificationService = new LiftRestNotificationService();
