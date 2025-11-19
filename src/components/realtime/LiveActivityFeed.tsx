// src/components/realtime/LiveActivityFeed.tsx
'use client';

import { Activity as ActivityIcon, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRealtimeActivities } from '@/hooks/use-realtime-activities';
import { formatDistanceToNow } from 'date-fns';

/**
 * Live activity feed component
 * Shows real-time updates of all system activities
 */
export function LiveActivityFeed({ limit = 20 }: { limit?: number }) {
  const { activities, isLoading, error } = useRealtimeActivities(limit);

  const getActionColor = (action: string) => {
    if (action.includes('created') || action.includes('added')) return 'bg-green-500/10 text-green-700';
    if (action.includes('updated') || action.includes('modified')) return 'bg-blue-500/10 text-blue-700';
    if (action.includes('deleted') || action.includes('removed')) return 'bg-red-500/10 text-red-700';
    return 'bg-gray-500/10 text-gray-700';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <ActivityIcon className="h-5 w-5" />
          <CardTitle>Live Activity Feed</CardTitle>
          {!isLoading && (
            <Badge variant="outline" className="animate-pulse">
              Live
            </Badge>
          )}
        </div>
        {isLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-center py-8 text-sm text-destructive">
            Error loading activities: {error.message}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No recent activities
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {activities.map((activity) => {
                const timestamp = activity.timestamp?.toDate?.() || new Date(activity.timestamp);
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 pb-4 border-b last:border-0"
                  >
                    <div className={`mt-1 rounded-full p-2 ${getActionColor(activity.action)}`}>
                      <ActivityIcon className="h-3 w-3" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{activity.userName}</p>
                        <Badge variant="secondary" className="text-xs">
                          {activity.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{activity.action}</p>
                      {activity.details && (
                        <p className="text-xs text-muted-foreground">{activity.details}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(timestamp, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
