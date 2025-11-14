// src/components/ActivityLog.tsx
'use client';

import { useMemo, memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import type { Activity } from '@/lib/types';
import { useCollection } from '@/firebase';
import type { Query } from 'firebase/firestore';

interface ActivityLogProps {
  /**
   * A Firestore Query for the activity collection(s) to display.
   * This allows the component to be reused across different pages
   * with different queries (filtered, combined, etc.)
   */
  query: Query;
  
  /**
   * Optional: Maximum number of activities to display.
   * If not provided, all activities from the query will be shown.
   */
  maxItems?: number;
  
  /**
   * Optional: Message to display when there are no activities.
   */
  emptyMessage?: string;
  
  /**
   * Optional: Custom className for the container.
   */
  className?: string;
}

/**
 * A reusable Activity Log component that displays a feed of activities.
 * 
 * Usage:
 * ```tsx
 * const myQuery = query(
 *   collection(firestore, 'production_activities'),
 *   orderBy('timestamp', 'desc')
 * );
 * 
 * <ActivityLog query={myQuery} maxItems={10} />
 * ```
 */
export const ActivityLog = memo(function ActivityLog({
  query: activityQuery,
  maxItems,
  emptyMessage = 'No activities to display.',
  className = '',
}: ActivityLogProps) {
  const { data: activities, isLoading } = useCollection<Activity>(activityQuery);

  // Limit the number of activities if maxItems is specified
  const displayedActivities = useMemo(() => {
    if (!activities) return [];
    if (maxItems) {
      return activities.slice(0, maxItems);
    }
    return activities;
  }, [activities, maxItems]);

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (displayedActivities.length === 0) {
    return (
      <div className={className}>
        <p className="text-sm text-muted-foreground text-center py-8">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {displayedActivities.map((activity: Activity) => (
        <div key={activity.id} className="flex items-start gap-4">
          <Avatar className="h-9 w-9 border">
            <AvatarImage src={activity.user.avatarUrl} alt={activity.user.name} />
            <AvatarFallback>{activity.user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              <span className="font-semibold text-foreground">{activity.user.name}</span>
              {' '}{activity.action}
            </p>
            {activity.details && (
              <p className="text-xs text-muted-foreground">{activity.details}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {activity.timestamp?.toDate 
                ? format(activity.timestamp.toDate(), "MMM dd, yyyy 'at' h:mm a")
                : 'just now'
              }
            </p>
          </div>
        </div>
      ))}
    </div>
  );
});
