// src/components/CombinedActivityLog.tsx
'use client';

import { useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { Activity } from '@/lib/types';
import { useCollection } from '@/firebase';
import type { Query } from 'firebase/firestore';

interface CombinedActivityLogProps {
  /**
   * An array of Firestore Queries to combine into a single activity feed.
   * All queries should return Activity-shaped documents.
   */
  queries: Array<{ query: Query; label: string; variant?: 'default' | 'secondary' | 'destructive' | 'outline' }>;
  
  /**
   * Optional: Maximum number of activities to display after merging.
   */
  maxItems?: number;
  
  /**
   * Optional: Message to display when there are no activities.
   */
  emptyMessage?: string;
  
  /**
   * Optional: Whether to show source badges (Admin, Operations, etc.)
   */
  showSourceBadges?: boolean;
  
  /**
   * Optional: Custom className for the container.
   */
  className?: string;
}

type ActivityWithSource = Activity & { source: string; sourceVariant?: 'default' | 'secondary' | 'destructive' | 'outline' };

/**
 * A reusable Activity Log component that combines multiple Firestore queries
 * into a single, merged, time-sorted activity feed.
 * 
 * Usage:
 * ```tsx
 * const queries = [
 *   { query: query(collection(firestore, 'admin_activities'), orderBy('timestamp', 'desc')), label: 'Admin', variant: 'destructive' },
 *   { query: query(collection(firestore, 'operations_activities'), orderBy('timestamp', 'desc')), label: 'Operations', variant: 'default' },
 * ];
 * 
 * <CombinedActivityLog queries={queries} maxItems={20} showSourceBadges={true} />
 * ```
 */
export function CombinedActivityLog({
  queries,
  maxItems,
  emptyMessage = 'No activities to display.',
  showSourceBadges = false,
  className = '',
}: CombinedActivityLogProps) {
  // Fetch data from all queries
  const queryResults = queries.map(({ query: q }) => useCollection<Activity>(q));

  // Check if any query is still loading
  const isLoading = queryResults.some(result => result.isLoading);

  // Merge and sort all activities
  const mergedActivities = useMemo(() => {
    const allActivities: ActivityWithSource[] = [];

    queryResults.forEach((result, index) => {
      if (result.data) {
        const activitiesWithSource = result.data.map(activity => ({
          ...activity,
          source: queries[index].label,
          sourceVariant: queries[index].variant || 'default',
        }));
        allActivities.push(...activitiesWithSource);
      }
    });

    // Sort by timestamp (newest first)
    allActivities.sort((a, b) => {
      const timeA = a.timestamp?.toDate?.()?.getTime() || 0;
      const timeB = b.timestamp?.toDate?.()?.getTime() || 0;
      return timeB - timeA;
    });

    // Limit if maxItems is specified
    if (maxItems) {
      return allActivities.slice(0, maxItems);
    }

    return allActivities;
  }, [queryResults, queries, maxItems]);

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (mergedActivities.length === 0) {
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
      {mergedActivities.map((activity: ActivityWithSource) => (
        <div key={`${activity.source}-${activity.id}`} className="flex items-start gap-4">
          <Avatar className="h-9 w-9 border">
            <AvatarImage src={activity.user.avatarUrl} alt={activity.user.name} />
            <AvatarFallback>{activity.user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                <span className="font-semibold text-foreground">{activity.user.name}</span>
                {' '}{activity.action}
              </p>
              {showSourceBadges && (
                <Badge variant={activity.sourceVariant} className="text-xs">
                  {activity.source}
                </Badge>
              )}
            </div>
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
}
