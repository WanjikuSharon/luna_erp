// src/app/(app)/inventory/layout.tsx
'use client';

import { usePathname } from 'next/navigation';
import { useUserRole } from '@/hooks/use-user-role';

// Import layouts from different departments
import OperationsLayout from '../operations/layout';
import ProductionLayout from '../production/layout';
import SalesLayout from '../sales/layout';
import AdminLayout from '../admin/layout';

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { role, isLoading } = useUserRole();

  // Show loading state
  if (isLoading) {
    return <div>{children}</div>;
  }

  // Determine which layout to use based on user role
  // This ensures the inventory pages show the appropriate sidebar
  if (role === 'admin') {
    return <AdminLayout>{children}</AdminLayout>;
  } else if (role === 'operations' || role === 'operations_manager') {
    return <OperationsLayout>{children}</OperationsLayout>;
  } else if (role === 'production' || role === 'production_personnel') {
    return <ProductionLayout>{children}</ProductionLayout>;
  } else if (role === 'sales') {
    return <SalesLayout>{children}</SalesLayout>;
  }

  // Default: render without sidebar
  return <div className="p-6">{children}</div>;
}
