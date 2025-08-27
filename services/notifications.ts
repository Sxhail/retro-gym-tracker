// DEPRECATED: Legacy cross-platform notifications service has been removed.
// iOS-only notifications live in services/iosNotifications.ts per docs/LOCAL_NOTIFICATIONS_IOS.md.
// This stub performs no actions and will be removed.

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export const NotificationService = {
  async getPermissionStatus(): Promise<PermissionStatus> {
    return 'undetermined';
  },
  async initialize() {
    return;
  },
  async scheduleAbsolute() {
    return null;
  },
  async cancelAllForSession() {
    return;
  },
  async cancelBySessionPrefix() {
    return;
  },
  async cancelAllPending() {
    return;
  },
};

export default NotificationService;
