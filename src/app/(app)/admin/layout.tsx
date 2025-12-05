// src/app/(app)/admin/layout.tsx
'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardCheck, 
  Settings, 
  Shield,
  FileText,
  Database,
  Package
} from 'lucide-react';

const adminNavItems = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    description: 'Overview, users, analytics',
  },
  {
    title: 'Products Inventory',
    href: '/admin/products',
    icon: Package,
    description: 'View all products inventory',
  },
  {
    title: 'Request Approvals',
    href: '/admin/approvals',
    icon: ClipboardCheck,
    description: 'Approve material requests',
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold font-headline">Admin Panel</h2>
          <p className="text-sm text-muted-foreground">System Management</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.title}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent transition-colors"
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="font-medium">Back to Dashboard</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
