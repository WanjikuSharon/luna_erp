// src/app/(app)/operations/layout.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardList, Package, PackageSearch, Recycle, Warehouse } from 'lucide-react'; // Import icons

import { cn } from '@/lib/utils';

// UPDATED: Sidebar navigation
const sidebarNavItems = [
  {
    title: 'Overview',
    href: '/operations/overview',
    icon: LayoutDashboard,
  },
  {
    title: 'Products Inventory',
    href: '/operations/products',
    icon: Package,
  },
  {
    title: 'Raw Materials Stock',
    href: '/operations/raw-materials',
    icon: Warehouse,
  },
  {
    title: 'Raw Materials Suppliers', // UPDATED
    href: '/operations/inventory',
    icon: PackageSearch, // Use a more fitting icon
  },
  {
    title: 'Packaging', // <-- ADD THIS
    href: '/operations/packaging',
    icon: PackageSearch, // <-- USE NEW ICON
  },
  {
    title: 'Requests List', // RENAMED
    href: '/operations/requests',
    icon: ClipboardList,
  },
  {
    title: 'Daily Reconciliation',
    href: '/operations/reconciliation',
    icon: Recycle,
  },
];

export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[calc(100vh-4rem)]"> {/* Adjust height based on header */}
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r bg-muted/40 p-4">
        <nav className="flex flex-col gap-2">
          <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight font-headline">
            Operations Menu
          </h2>
          {sidebarNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                  // Make 'Overview' active when on /operations too
                  (isActive || (item.href === '/operations/overview' && pathname === '/operations')) && 'bg-muted text-primary'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6">
        {children} {/* This is where the page content (Overview, Inventory, Reconciliation) will be rendered */}
      </main>
    </div>
  );
}
