// src/app/(app)/sales/activity/page.tsx
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

export default function SalesActivityPage() {
  const firestore = useFirestore();
  
  const salesActivityQuery = useMemoFirebase(
    () => createActivityQuery(firestore, ACTIVITY_COLLECTIONS.SALES),
    [firestore]
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Sales Activity Log</h1>
        <p className="text-muted-foreground">
          A real-time feed of all sales-related actions.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Live Activity Feed</CardTitle>
          <CardDescription>
            All sales activities including ledger entries, stock movements, and report submissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityLog 
            query={salesActivityQuery}
            emptyMessage="No sales activities have been logged yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}
