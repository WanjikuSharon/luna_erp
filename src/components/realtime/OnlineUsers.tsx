// src/components/realtime/OnlineUsers.tsx
'use client';

import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePresence } from '@/hooks/use-presence';

/**
 * Component showing online users
 * Displays avatars and presence status
 */
export function OnlineUsers() {
  const { onlineUsers } = usePresence();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Users className="h-5 w-5" />
          {onlineUsers.length > 0 && (
            <Badge
              variant="default"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-green-500"
            >
              {onlineUsers.length}
            </Badge>
          )}
          <span className="sr-only">Online Users</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Online Users</h3>
          <p className="text-xs text-muted-foreground">
            {onlineUsers.length} {onlineUsers.length === 1 ? 'user' : 'users'} active
          </p>
        </div>
        <ScrollArea className="max-h-[300px]">
          {onlineUsers.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No users online
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {onlineUsers.map((user) => (
                <div
                  key={user.uid}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {user.displayName?.substring(0, 2).toUpperCase() || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.displayName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
