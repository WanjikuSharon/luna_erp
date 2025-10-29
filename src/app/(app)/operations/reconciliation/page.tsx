// src/app/(app)/operations/reconciliation/page.tsx
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function ReconciliationPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Inventory Reconciliation</h1>
        <p className="text-muted-foreground">
          Compare physical stock counts with system records. (Coming Soon)
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation Tools</CardTitle>
          <CardDescription>
            This section will contain tools for stock counts and discrepancy reporting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Feature under development.</p>
        </CardContent>
      </Card>
    </div>
  );
}
