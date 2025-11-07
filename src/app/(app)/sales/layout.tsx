// src/app/(app)/sales/layout.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
// Import icons for the Sales sidebar
import {
  Users,
  PackageCheck,
  PackageOpen,
  BookMarked,
  FileText
} from 'lucide-react'; 
import { cn } from '@/lib/utils';

// Define the navigation items for the Sales sidebar
const sidebarNavItems = [
  {
    title: 'Sales Dashboard', // Maina's dashboard
    href: '/sales/dashboard',
    icon: Users,
  },
  {
    title: 'Stock Out', // Form from 1000497322.jpg
    href: '/sales/stock-out',
    icon: PackageOpen,
  },
  {
    title: 'Stock In / Returns', // Form from 1000497323.jpg
    href: '/sales/stock-in',
    icon: PackageCheck,
  },
  {
    title: 'Daily Sales Ledger', // Form from 1000497324.jpg
    href: '/sales/ledger',
    icon: BookMarked,
  },
  {
    title: 'Daily Reconciliation', // The page we already built
    href: '/sales/reconciliation',
    icon: FileText,
  },
];

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r bg-muted/40 p-4 no-print">
        <nav className="flex flex-col gap-2">
          <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight font-headline">
            Sales Portal
          </h2>
          {sidebarNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                pathname === item.href && 'bg-muted text-primary'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6">
        {children} {/* This is where the Sales pages will be rendered */}
      </main>
    </div>
  );
}
