// src/app/(app)/production/activity/page.tsx
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

export default function ActivityLogPage() {
  const firestore = useFirestore();
  
  const productionActivityQuery = useMemoFirebase(
    () => createActivityQuery(firestore, ACTIVITY_COLLECTIONS.PRODUCTION),
    [firestore]
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Production Activity Log</h1>
        <p className="text-muted-foreground">
          A real-time feed of all production-related actions.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Live Activity Feed</CardTitle>
          <CardDescription>
            All production activities including batch creation, QC approvals, and packaging operations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityLog 
            query={productionActivityQuery}
            emptyMessage="No production activities have been logged yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}
