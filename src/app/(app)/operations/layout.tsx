// src/app/(app)/operations/layout.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardList, Recycle } from 'lucide-react'; // Import icons

import { cn } from '@/lib/utils';

// Define the navigation items for the Operations sidebar
const sidebarNavItems = [
  {
    title: 'Overview',
    href: '/operations', // The main dashboard page
    icon: LayoutDashboard,
  },
  {
    title: 'Inventory Requests', // Renamed from "Requests" as requested
    href: '/operations/inventory', // New sub-page for requests
    icon: ClipboardList,
  },
  {
    title: 'Reconciliation',
    href: '/operations/reconciliation', // New sub-page for reconciliation
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
          {sidebarNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                pathname === item.href && 'bg-muted text-primary' // Highlight active link
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
        {children} {/* This is where the page content (Overview, Inventory, Reconciliation) will be rendered */}
      </main>
    </div>
  );
}
