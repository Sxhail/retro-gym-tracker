# Enhanced Cardio Notification System

This document describes the enhanced cardio notification system that provides reliable, timely alerts for all cardio session phases.

## Overview

The enhanced system addresses all the key requirements for cardio notifications:

✅ **Timely alerts** - Notifications appear at the right time for each phase transition  
✅ **Background reliability** - Alerts work even when app is backgrounded or phone is locked  
✅ **Proper spacing** - Multiple alerts are spaced out to avoid notification grouping  
✅ **Session change handling** - Notifications are cancelled/rescheduled when sessions change  
✅ **Duplicate prevention** - Each alert is unique with proper deduplication  
✅ **Interruption handling** - Smooth pause/resume and background/foreground transitions  
✅ **Clear messages** - Descriptive titles and bodies for each phase transition  

## Architecture

### Core Components

1. **CardioBackgroundSessionService** (`services/cardioBackgroundSession.ts`)
   - Enhanced notification scheduling with automatic spacing
   - Robust session state change handling
   - Improved notification content generation
   - Better error handling and logging

2. **IOSLocalNotifications** (`services/iosNotifications.ts`)
   - Enhanced scheduling with better catch-up logic
   - Improved cancellation with detailed logging
   - Unique category identifiers to prevent grouping

3. **CardioNotificationReliabilityService** (`services/cardioNotificationReliability.ts`)
   - Monitors notification delivery
   - Handles missed notifications when app returns to foreground
   - Provides performance metrics
   - Database-based persistence

4. **useCardioSession** (`hooks/useCardioSession.ts`)
   - Integrated with enhanced notification management
   - Better session state change handling
   - Improved logging and error handling

### Key Features

#### 1. Notification Spacing
The system automatically spaces out notifications that are scheduled too close together (minimum 2 seconds apart) to prevent iOS from grouping them into a single notification.

```typescript
// Notifications scheduled 500ms apart will be automatically spaced to 2+ seconds
const MIN_NOTIFICATION_SPACING_MS = 2000;
```

#### 2. Session State Change Handling
All session changes (pause, resume, skip, modify, cancel, complete) trigger appropriate notification management:

```typescript
await svc.handleSessionStateChange(sessionId, 'pause'); // Cancels all notifications
await svc.handleSessionStateChange(sessionId, 'resume', newSchedule); // Reschedules with new times
```

#### 3. Enhanced Messages
Notifications include clear, descriptive messages with context:

- **Work → Rest**: "Work Phase Complete! ✅" - "Round 2 work done. Time to rest and recover."
- **Rest → Work**: "Rest Time Over! 💥" - "Round 2 rest complete. Get ready to work!"
- **Run → Walk**: "Run Phase Done! 🏃‍♂️" - "Lap 1 run complete. Switch to walking pace."
- **Session Complete**: "HIIT Session Complete! 🎉" - "Excellent work! Your HIIT session is finished."

#### 4. Duplicate Prevention
- Scheduling locks prevent concurrent scheduling calls
- Each phase has a unique identifier
- Existing notifications are cancelled before scheduling new ones

#### 5. Background Reliability
- Notifications are fully scheduled when session starts
- App state changes trigger rescheduling when needed
- Missed notification detection and catch-up system
- Database persistence for tracking pending notifications

## Usage

### Basic Integration

The enhanced system is automatically used by the existing cardio session hooks. No code changes are required for basic functionality.

```typescript
// Start a session - notifications are automatically scheduled
await cardio.startHiit({ workSec: 20, restSec: 10, rounds: 8 });

// Pause - notifications are automatically cancelled
await cardio.pause();

// Resume - notifications are automatically rescheduled
await cardio.resume();
```

### Advanced Usage

For custom notification management:

```typescript
import { cardioBackgroundSessionService } from '../services/cardioBackgroundSession';

// Handle custom session state changes
await cardioBackgroundSessionService.handleSessionStateChange(
  sessionId, 
  'modify', 
  updatedSchedule
);

// Get notification spacing
const spacedSchedule = cardioBackgroundSessionService.spaceOutNotifications(
  notifications, 
  2000
);
```

### Reliability Monitoring

```typescript
import { cardioNotificationReliability } from '../services/cardioNotificationReliability';

// Initialize monitoring
await cardioNotificationReliability.initialize();

// Get performance metrics
const metrics = cardioNotificationReliability.getMetrics();
console.log(`Delivered: ${metrics.delivered}/${metrics.scheduled}`);

// Check for missed notifications (called automatically on app foreground)
await cardioNotificationReliability.checkMissedNotifications();
```

## Testing

### Automated Testing

Use the provided test script to verify system behavior:

```bash
node scripts/testCardioNotifications.js
```

Tests include:
- Basic notification scheduling
- Notification spacing verification
- Session state change handling
- Duplicate prevention
- Message clarity validation

### Manual Testing

1. **Background Reliability Test**:
   - Start a cardio session
   - Immediately background the app
   - Observe notifications at phase transitions
   - Verify timing accuracy

2. **Pause/Resume Test**:
   - Start a session and let it run briefly
   - Pause the session
   - Wait (no notifications should appear)
   - Resume and verify notifications continue correctly

3. **Session Cancellation Test**:
   - Start a session
   - Background the app
   - Return to app and cancel session
   - Verify no further notifications appear

4. **Multiple Session Test**:
   - Start a session
   - Force-quit and restart the app
   - Start a new session
   - Verify old notifications are cancelled

## Performance Considerations

### Memory Usage
- Notification tracking uses database storage instead of memory
- Automatic cleanup of completed/cancelled sessions
- Minimal overhead from reliability monitoring

### Battery Impact
- Notifications are scheduled at iOS level (no active polling)
- Reliability monitoring uses event listeners (no continuous background work)
- Database operations are batched and optimized

### Network Usage
- No network requests required for notification system
- All data stored locally

## Troubleshooting

### Common Issues

1. **Notifications not appearing**:
   - Check notification permissions
   - Verify iOS notification settings
   - Check console for scheduling errors

2. **Multiple notifications appearing**:
   - Check for duplicate session IDs
   - Verify proper session cleanup
   - Review notification spacing logs

3. **Notifications appearing at wrong times**:
   - Check device clock accuracy
   - Verify schedule generation logic
   - Review pause/resume timing

### Debug Logging

Enable detailed logging by checking console output:

```
[CardioBackgroundSession] Scheduling notification: "Work Phase Complete! ✅" - "Round 1 work done. Time to rest and recover." at 2025-08-28T10:30:15.000Z for session cardio_1692345678901_abc123

[IOSNotifications] Scheduled notification with ID: expo-notification-12345 for session cardio_1692345678901_abc123 at 2025-08-28T10:30:15.000Z

[NotificationReliability] Registered pending: cardio_1692345678901_abc123_work_0_0
```

### Performance Metrics

Monitor notification reliability:

```typescript
const metrics = cardioNotificationReliability.getMetrics();
console.log({
  deliveryRate: metrics.delivered / metrics.scheduled,
  missedCount: metrics.missed,
  catchupCount: metrics.caughtUp
});
```

## Future Enhancements

Potential improvements for future versions:

1. **Adaptive Timing**: Adjust notification timing based on user response patterns
2. **Custom Sounds**: Different notification sounds for different phase types
3. **Vibration Patterns**: Custom haptic feedback for each notification type
4. **Smart Spacing**: Dynamic spacing based on device notification behavior
5. **Notification History**: Detailed logging of all notification events
6. **A/B Testing**: Support for testing different notification strategies
