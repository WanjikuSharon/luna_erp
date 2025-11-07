// src/app/(app)/sales/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SalesPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the sales dashboard when someone visits /sales
    router.push('/sales/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground">Redirecting to Sales Dashboard...</p>
    </div>
  );
}
