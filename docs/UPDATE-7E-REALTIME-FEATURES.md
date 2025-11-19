# Update #7E: Real-time Features

**Date**: December 2024  
**Version**: 1.0.0  
**Status**: ✅ Production Ready

## Overview

This update adds comprehensive real-time features to the Luna ERP system using Firebase Realtime Database and Firestore real-time listeners. Users can now see live updates, notifications, and presence indicators without refreshing the page.

## Features Implemented

### 1. Real-time Inventory Updates

**Hook**: `useRealtimeInventory()`

Automatically syncs inventory data across all users in real-time.

**Key Features**:
- Live product quantity updates
- Real-time raw material stock changes
- Automatic UI refresh when data changes
- Zero-delay synchronization across devices

**Usage**:
```tsx
import { useRealtimeInventory } from '@/hooks/use-realtime-inventory';

function InventoryPage() {
  const { products, rawMaterials, isLoading } = useRealtimeInventory();
  
  // Data automatically updates when changes occur in Firestore
  return <div>{products.map(p => <ProductCard key={p.id} {...p} />)}</div>;
}
```

**Low Stock Alerts**: `useLowStockAlerts()`
```tsx
const { lowStockItems } = useLowStockAlerts();
// Automatically filters items below reorder level
```

### 2. Live Notifications System

**Component**: `<NotificationBell />`

Real-time notification bell with unread count badge.

**Features**:
- Red badge showing unread notification count
- Popover with recent high-priority activities
- Auto-updates when new critical events occur
- Relative timestamps (e.g., "2 minutes ago")

**Hook**: `useRealtimeNotifications(userId)`
```tsx
const { notifications, unreadCount, isLoading } = useRealtimeNotifications(user?.uid);
```

**What triggers notifications**:
- High or critical priority activities
- System-wide alerts
- Events requiring user attention

### 3. User Presence Indicators

**Component**: `<OnlineUsers />`

Shows who's currently online in the system.

**Features**:
- Green badge with online user count
- Popover displaying all active users
- User avatars with online status indicators
- Role display for each user

**Hook**: `usePresence()`
```tsx
const { onlineUsers } = usePresence();
```

**How it works**:
- Automatically sets user status to "online" on login
- Updates Realtime Database with connection state
- Sets status to "offline" on disconnect
- Uses Firebase `.info/connected` for reliable presence

### 4. Live Activity Feed

**Component**: `<LiveActivityFeed />`

Real-time feed of all system activities.

**Features**:
- Color-coded activity types (green=created, blue=updated, red=deleted)
- Live "pulse" badge indicator
- Scrollable feed with latest 20-50 activities
- User names, roles, and relative timestamps

**Hook**: `useRealtimeActivities(limitCount)`
```tsx
const { activities, isLoading } = useRealtimeActivities(50);
```

**User-specific activity**:
```tsx
const { activities } = useRealtimeUserActivities(userId, 20);
```

### 5. Toast Notifications (Existing)

The existing toast system (`use-toast`) works seamlessly with real-time updates to show in-app notifications.

## File Structure

```
src/
├── hooks/
│   ├── use-realtime-inventory.ts      # Real-time inventory hooks
│   ├── use-realtime-activities.ts     # Activity feed & notifications
│   └── use-presence.ts                 # User presence tracking
├── components/
│   └── realtime/
│       ├── NotificationBell.tsx        # Notification bell component
│       ├── OnlineUsers.tsx             # Online users indicator
│       ├── LiveActivityFeed.tsx        # Real-time activity feed
│       └── index.ts                    # Barrel exports
└── firebase/
    ├── config.ts                       # Added databaseURL
    └── index.ts                        # Export rtdb instance
```

## Technical Implementation

### Firebase Realtime Database Setup

**config.ts**:
```typescript
export const firebaseConfig = {
  // ... existing config
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || '',
};
```

**index.ts**:
```typescript
import { getDatabase } from 'firebase/database';

let rtdb: ReturnType<typeof getDatabase> | null = null;

if (typeof window !== 'undefined') {
  rtdb = getDatabase(firebaseApp);
}

export { rtdb };
```

### Firestore Real-time Listeners

Uses `onSnapshot` for live data synchronization:

```typescript
const unsubscribe = onSnapshot(
  collection(db, 'products'),
  (snapshot) => {
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setProducts(items);
  }
);
```

### Presence Detection

Uses Firebase Realtime Database's special `.info/connected` path:

```typescript
const connectedRef = ref(rtdb, '.info/connected');
onValue(connectedRef, (snapshot) => {
  if (snapshot.val() === true) {
    set(userStatusRef, { status: 'online', ... });
    onDisconnect(userStatusRef).set({ status: 'offline', ... });
  }
});
```

## Environment Variables

Add to `.env.local`:
```bash
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

Get this from Firebase Console → Realtime Database → Settings

## Integration in Layout

**src/app/(app)/layout.tsx**:
```tsx
import { NotificationBell } from '@/components/realtime/NotificationBell';
import { OnlineUsers } from '@/components/realtime/OnlineUsers';

// In header:
<div className="flex items-center gap-4">
  {user && (
    <>
      <NotificationBell />
      <OnlineUsers />
    </>
  )}
  <AccessibilityMenu />
  <ThemeToggle />
  <UserNav />
</div>
```

## Usage Examples

### Replace Static Data with Real-time

**Before**:
```tsx
const { data: products, isLoading } = useCollection('products');
```

**After**:
```tsx
const { products, isLoading } = useRealtimeInventory();
```

### Add Live Activity to Dashboard

```tsx
import { LiveActivityFeed } from '@/components/realtime';

function Dashboard() {
  return (
    <div className="grid gap-4">
      <LiveActivityFeed limit={20} />
    </div>
  );
}
```

### Monitor Low Stock in Real-time

```tsx
import { useLowStockAlerts } from '@/hooks/use-realtime-inventory';

function LowStockAlert() {
  const { lowStockItems } = useLowStockAlerts();
  
  if (lowStockItems.products.length === 0 && lowStockItems.materials.length === 0) {
    return null;
  }
  
  return (
    <Alert variant="destructive">
      <AlertTitle>Low Stock Alert</AlertTitle>
      <AlertDescription>
        {lowStockItems.products.length} products and {lowStockItems.materials.length} materials need reordering
      </AlertDescription>
    </Alert>
  );
}
```

## Performance Considerations

### Optimizations

1. **Limited queries**: Only fetch last 20-50 items
2. **Indexed fields**: Firestore queries use indexed fields
3. **Cleanup subscriptions**: All hooks properly unsubscribe on unmount
4. **Conditional listeners**: Only subscribe when component is mounted

### Best Practices

- **Use limits**: Don't fetch entire collections
- **Filter server-side**: Use Firestore queries, not client-side filtering
- **Debounce updates**: For frequently changing data
- **Optimize re-renders**: Use React.memo for child components

### Firestore Index Requirements

Create these composite indexes:

```
Collection: activities
- timestamp (desc) + priority (in)

Collection: products
- createdAt (desc)

Collection: rawMaterials
- createdAt (desc)
```

## Security Rules

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Activities: authenticated users can read
    match /activities/{activityId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.token.role == 'admin';
    }
    
    // Products & Materials: role-based access
    match /products/{productId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (request.auth.token.role in ['admin', 'production', 'operations']);
    }
  }
}
```

### Realtime Database Rules
```json
{
  "rules": {
    "status": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid == $uid"
      }
    }
  }
}
```

## Testing

### Manual Testing Steps

1. **Real-time Inventory**:
   - Open inventory page in two browser tabs
   - Update quantity in one tab
   - Verify change appears instantly in other tab

2. **Notifications**:
   - Perform high-priority action (e.g., low stock)
   - Check notification bell shows badge
   - Open bell and verify notification appears

3. **Presence**:
   - Login with two different accounts
   - Verify both users appear in "Online Users"
   - Close one browser tab
   - Verify user disappears from online list

4. **Activity Feed**:
   - Perform various actions (create, update, delete)
   - Verify activities appear in real-time
   - Check timestamps and color coding

### Automated Tests

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useRealtimeInventory } from '@/hooks/use-realtime-inventory';

describe('useRealtimeInventory', () => {
  it('subscribes to products on mount', async () => {
    const { result } = renderHook(() => useRealtimeInventory());
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.products).toBeDefined();
    });
  });
});
```

## Troubleshooting

### Notifications not appearing

**Check**:
- Firebase Realtime Database is enabled in console
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL` is set
- User is authenticated
- Activities have `priority` field set

**Debug**:
```typescript
console.log('Notifications:', notifications);
console.log('Unread count:', unreadCount);
```

### Presence not updating

**Check**:
- Realtime Database rules allow writes to `/status/{uid}`
- `.info/connected` is accessible
- User object has `uid` property

**Debug**:
```typescript
console.log('RTDB instance:', rtdb);
console.log('User:', user);
console.log('Online users:', onlineUsers);
```

### Real-time updates delayed

**Causes**:
- Network latency
- Large result sets (use limits)
- Missing indexes (check console warnings)

**Solutions**:
- Add Firestore composite indexes
- Reduce query limits
- Use pagination for large datasets

### Memory leaks

**Symptoms**:
- App slows down over time
- Console warnings about state updates on unmounted components

**Fix**:
- Ensure all hooks return cleanup functions
- Check unsubscribe callbacks are called

## Migration Guide

### From Static to Real-time

1. **Replace useCollection**:
```typescript
// Old
const { data: products } = useCollection('products');

// New
const { products } = useRealtimeInventory();
```

2. **Add notification bell to header**:
```tsx
import { NotificationBell } from '@/components/realtime';
<NotificationBell />
```

3. **Add presence indicators**:
```tsx
import { OnlineUsers } from '@/components/realtime';
<OnlineUsers />
```

4. **Enable Realtime Database**:
- Go to Firebase Console
- Enable Realtime Database
- Deploy security rules
- Add `databaseURL` to env

## Performance Metrics

Expected performance:
- **Initial load**: < 500ms (with indexes)
- **Real-time update latency**: < 100ms
- **Presence update**: < 50ms
- **Memory overhead**: ~2MB per connection

## Future Enhancements

- [ ] Typing indicators for collaborative editing
- [ ] Read receipts for notifications
- [ ] Custom notification preferences
- [ ] Real-time chat/messaging
- [ ] Collaborative editing with operational transforms
- [ ] Video/audio call integration
- [ ] Screen sharing for remote support

## Browser Support

- **Chrome**: ✅ Full support
- **Firefox**: ✅ Full support
- **Safari**: ✅ Full support (iOS 14+)
- **Edge**: ✅ Full support

WebSocket connections required for optimal performance.

## Credits

- **Firebase Realtime Database**: Presence and connection state
- **Firestore**: Real-time data synchronization
- **date-fns**: Timestamp formatting
- **Radix UI**: Popover and badge components

---

**Update Completed**: December 2024  
**Version**: 1.0.0  
**Status**: ✅ Production Ready  
**Next**: Deploy and enable Firebase Realtime Database
