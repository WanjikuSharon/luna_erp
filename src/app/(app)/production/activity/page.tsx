// src/app/(app)/production/activity/page.tsx
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

// We will fetch from 'production_activities' collection here later
// For now, it's just a placeholder.

export default function ActivityLogPage() {
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
            This feature is under construction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>This page will soon show a list of all activities, like "Batch B-1045 created," "QC Approved," etc.</p>
        </CardContent>
      </Card>
    </div>
  );
}