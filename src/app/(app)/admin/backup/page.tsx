// src/app/(app)/admin/backup/page.tsx
'use client';

import { BackupManagementCard } from '@/components/admin/BackupManagementCard';

export default function BackupManagementPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-headline tracking-tight md:text-3xl">
          Data Backup & Export
        </h1>
        <p className="text-muted-foreground">Backup and export your data</p>
      </div>

      <BackupManagementCard />
    </div>
  );
}
