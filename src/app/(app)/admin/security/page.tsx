// src/app/(app)/admin/security/page.tsx
'use client';

import { SecurityAlertsCard } from '@/components/admin/SecurityAlertsCard';

export default function SecurityAlertsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight md:text-3xl">
          Security Alerts
        </h1>
        <p className="text-muted-foreground">Monitor and manage security events</p>
      </div>

      <SecurityAlertsCard />
    </div>
  );
}
