# Cardio Notification Integration Guide

This guide helps you integrate the enhanced cardio notification system into your app workflow.

## Quick Start

### 1. Initialize Notification Reliability Service

Add initialization to your app's entry point (typically `_layout.tsx` or `App.tsx`):

```typescript
import { cardioNotificationReliability } from '../services/cardioNotificationReliability';

export default function RootLayout() {
  useEffect(() => {
    // Initialize notification reliability monitoring
    cardioNotificationReliability.initialize();
    
    return () => {
      cardioNotificationReliability.shutdown();
    };
  }, []);

  // ... rest of your layout
}
```

### 2. Verify Existing Cardio Hooks

The enhanced system is automatically integrated into `useCardioSession`. No changes needed to existing cardio screens:

```typescript
// This already works with the enhanced notifications!
const cardio = useCardioSession();
await cardio.startHiit({ workSec: 20, restSec: 10, rounds: 8 });
```

### 3. Test Notifications

Run the demo script to verify everything works:

```bash
node scripts/demoCardioNotifications.js
```

## Integration Checklist

### ✅ Files Updated
- [x] `services/cardioBackgroundSession.ts` - Enhanced notification scheduling
- [x] `services/iosNotifications.ts` - Improved iOS notification handling  
- [x] `hooks/useCardioSession.ts` - Integrated session state management
- [x] `services/cardioNotificationReliability.ts` - New reliability service
- [x] `scripts/testCardioNotifications.js` - Automated testing
- [x] `scripts/demoCardioNotifications.js` - Demo and verification
- [x] `docs/CARDIO_NOTIFICATIONS.md` - Complete documentation

### ⚠️ Files That May Need Updates

1. **App Layout/Entry Point** - Add reliability service initialization:

```typescript
// In app/_layout.tsx or similar
import { cardioNotificationReliability } from '../services/cardioNotificationReliability';

export default function RootLayout() {
  useEffect(() => {
    cardioNotificationReliability.initialize();
    return () => cardioNotificationReliability.shutdown();
  }, []);
  
  // ... existing code
}
```

2. **Notification Permissions** - Ensure proper permissions are requested:

```typescript
// The IOSLocalNotifications service handles this automatically,
// but you may want to request permissions earlier in the app lifecycle
import IOSLocalNotifications from '../services/iosNotifications';

// Early in app startup
await IOSLocalNotifications.initialize();
```

## Testing Your Integration

### 1. Manual Testing Steps

1. **Basic Flow**:
   ```
   Start cardio session → Background app → Verify notifications appear
   ```

2. **Pause/Resume**:
   ```
   Start session → Pause → Background → Verify no notifications → Resume → Verify notifications continue
   ```

3. **Session Cancellation**:
   ```
   Start session → Background → Return to app → Cancel → Verify no more notifications
   ```

### 2. Automated Testing

```bash
# Run comprehensive test suite
node scripts/testCardioNotifications.js

# Run demo to see notifications in action
node scripts/demoCardioNotifications.js
```

### 3. Monitoring

Check notification reliability metrics:

```typescript
const metrics = cardioNotificationReliability.getMetrics();
console.log('Notification Performance:', {
  successRate: `${(metrics.delivered / metrics.scheduled * 100).toFixed(1)}%`,
  missed: metrics.missed,
  catchups: metrics.caughtUp
});
```

## Debugging Common Issues

### Issue: Notifications Not Appearing

**Symptoms**: No notifications shown during cardio sessions

**Check**:
1. Device notification permissions for the app
2. iOS Do Not Disturb settings
3. Console logs for scheduling errors
4. Database for pending notifications:
   ```sql
   SELECT * FROM active_cardio_notifications;
   ```

**Solutions**:
- Request notification permissions explicitly
- Check iOS notification settings
- Verify proper session ID generation

### Issue: Multiple Notifications at Once

**Symptoms**: Several notifications appear simultaneously

**Check**:
1. Session cleanup between workouts
2. Duplicate session IDs
3. Concurrent scheduling calls

**Solutions**:
- Ensure proper session cleanup: `await cardio.reset()`
- Check for unique session ID generation
- Verify scheduling locks are working

### Issue: Wrong Notification Timing

**Symptoms**: Notifications appear too early/late

**Check**:
1. Device clock accuracy
2. Schedule generation logic
3. Pause/resume timing calculations

**Solutions**:
- Verify schedule timestamps in console logs
- Check pause duration calculations
- Ensure proper time zone handling

## Performance Considerations

### Memory Usage
- Notifications use database persistence (minimal memory impact)
- Automatic cleanup prevents data accumulation
- Reliability service uses event listeners (not polling)

### Battery Impact
- iOS handles notification scheduling (no background processing)
- Minimal database operations
- Event-driven architecture

### Network Usage
- No network requests required
- All data stored locally

## Advanced Customization

### Custom Notification Messages

To customize notification content, modify the `getNextPhaseLabel` method in `cardioBackgroundSession.ts`:

```typescript
private getNextPhaseLabel(phase: CardioPhase): { title: string; body: (e: ScheduleEntry) => string } {
  switch (phase) {
    case 'work':
      return { 
        title: 'Your Custom Work Title! 💪', 
        body: (e: ScheduleEntry) => `Custom work message for round ${e.cycleIndex + 1}` 
      };
    // ... other phases
  }
}
```

### Custom Notification Spacing

Adjust the minimum spacing between notifications:

```typescript
// In cardioBackgroundSession.ts
const MIN_NOTIFICATION_SPACING_MS = 3000; // 3 seconds instead of 2
```

### Custom Catch-up Window

Modify how long after a missed notification the system will still try to catch up:

```typescript
// In cardioNotificationReliability.ts  
const MAX_CATCHUP_DELAY_MS = 15000; // 15 seconds instead of 10
```

## Migration from Previous Version

If you had a previous cardio notification system:

1. **Remove Old Code**:
   - Remove any manual `Notifications.scheduleNotificationAsync` calls
   - Remove custom notification management logic
   - Remove manual AppState handling for notifications

2. **Update Hook Usage**:
   ```typescript
   // Old way (if you had custom notification logic)
   await scheduleCustomNotifications(sessionId, schedule);
   
   // New way (automatic)
   await cardio.startHiit(params); // Notifications handled automatically
   ```

3. **Database Migration**:
   - The `active_cardio_notifications` table is already created
   - Old notification data will be automatically cleaned up
   - No manual migration required

## Support

### Logs to Check

Enable detailed logging by checking these console patterns:

```
[CardioBackgroundSession] - Notification scheduling logs
[IOSNotifications] - iOS notification system logs  
[NotificationReliability] - Reliability monitoring logs
[useCardioSession] - Session state change logs
```

### Performance Metrics

Monitor system health:

```typescript
// Check notification performance
const metrics = cardioNotificationReliability.getMetrics();

// Check active sessions
const sessions = await cardioBackgroundSessionService.listActiveSessions();

// Check pending notifications
const pending = await db.select().from(active_cardio_notifications);
```

### Getting Help

1. Check the logs for error patterns
2. Run the test scripts to isolate issues
3. Verify notification permissions are granted
4. Test with a simple HIIT session first
5. Review the comprehensive documentation in `docs/CARDIO_NOTIFICATIONS.md`

---

**Ready to go!** Your enhanced cardio notification system should now provide reliable, well-timed alerts for all cardio session phases. 🎉
