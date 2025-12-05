// src/app/(app)/inventory/layout.tsx
'use client';

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  // Simply render children - the parent (app) layout handles the department sidebar
  // This allows users to stay in their current department's context
  return <>{children}</>;
}

