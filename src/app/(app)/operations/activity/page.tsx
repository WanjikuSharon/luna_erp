// src/app/(app)/operations/activity/page.tsx
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { ActivityLog } from '@/components/ActivityLog';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { ACTIVITY_COLLECTIONS, createActivityQuery } from '@/lib/activity-utils';

export default function OperationsActivityPage() {
  const firestore = useFirestore();
  
  const operationsActivityQuery = useMemoFirebase(
    () => createActivityQuery(firestore, ACTIVITY_COLLECTIONS.OPERATIONS),
    [firestore]
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Operations Activity Log</h1>
        <p className="text-muted-foreground">
          A real-time feed of all operations-related actions.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Live Activity Feed</CardTitle>
          <CardDescription>
            All operations activities including inventory updates, material requests, and delivery verifications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityLog 
            query={operationsActivityQuery}
            emptyMessage="No operations activities have been logged yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}
