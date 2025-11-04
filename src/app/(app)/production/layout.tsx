// src/app/(app)/production/layout.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Factory, FileText, List } from 'lucide-react'; // Import the icons we need

import { cn } from '@/lib/utils';

// NEW: Cleaned-up 3-item sidebar navigation
const sidebarNavItems = [
  {
    title: 'Log Production',
    href: '/production/log', 
    icon: Factory,
  },
  {
    title: 'Batch & QC History', // This is the "QC Reports" page
    href: '/production/history', 
    icon: FileText,
  },
  {
    title: 'Activity Log', // This is the audit trail
    href: '/production/activity',
    icon: List,
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
                // This logic correctly highlights the active link
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
        {children} {/* This renders the correct page */}
      </main>
    </div>
  );
}