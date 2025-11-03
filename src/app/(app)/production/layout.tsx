// src/app/(app)/production/layout.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Factory, List, ListChecks } from 'lucide-react'; // Production-related icons

import { cn } from '@/lib/utils';

// Define the navigation items for the Production sidebar
const sidebarNavItems = [
  {
    title: 'Log Production',
    href: '/production/log', // This will be our main form page
    icon: Factory,
  },
  {
    title: 'Activity Log',
    href: '/production/history', // Placeholder for a future page
    icon: List,
  },
  {
    title: 'Quality Control',
    href: '/production/qc', // Placeholder for a future page
    icon: ListChecks,
  },
];

export default function ProductionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r bg-muted/40 p-4">
        <nav className="flex flex-col gap-2">
          <h2 className="mb-2 px-2 text-lg font-semibold tracking-tight font-headline">
            Production Menu
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
        {children} {/* This is where the page content will be rendered */}
      </main>
    </div>
  );
}
