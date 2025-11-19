// src/components/realtime/NotificationBell.tsx
'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRealtimeNotifications } from '@/hooks/use-realtime-activities';
import { useAuth } from '@/firebase/provider';
import { formatDistanceToNow } from 'date-fns';

/**
 * Real-time notification bell component
 * Shows unread count and recent notifications
 */
export function NotificationBell() {
  const { user } = useAuth();
  const { notifications, unreadCount, isLoading } = useRealtimeNotifications(user?.uid || null);
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount} new</Badge>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No recent notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const timestamp = notification.timestamp?.toDate?.() || new Date(notification.timestamp);
                return (
                  <div
                    key={notification.id}
                    className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {notification.action}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {notification.details || notification.userName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(timestamp, { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
