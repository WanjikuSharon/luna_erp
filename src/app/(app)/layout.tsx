'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Warehouse,
  Factory,
  ClipboardList,
  Shield,
  Settings,
  Group,
  Menu,
  LogIn,
} from 'lucide-react';
import { Logo } from '@/components/icons';
import { users } from '@/lib/data';
import type { User as UserType } from '@/lib/types';
import { UserNav } from '@/components/layout/user-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useUser } from '@/firebase';

const navItems = [
  { href: '/admin', icon: Shield, label: 'Admin' },
  { href: '/operations', icon: Group, label: 'Operations' },
  { href: '/production', icon: Factory, label: 'Production' },
  { href: '/requests', icon: ClipboardList, label: 'Requests' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const newLogoUrl = 'https://i.postimg.cc/9FzKTLkD/WhatsApp_Image_2025-10-15_at_00.18.06_514d4d8f.jpg';

  // Always show all nav items for now
  const filteredNavItems = navItems;
  const dashboardLink = '/';

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-50">
        <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
          <Link
            href={dashboardLink}
            className="flex items-center gap-2 text-lg font-semibold md:text-base"
          >
             <div className="relative h-8 w-8">
                <Image src={newLogoUrl} alt="Luna Industries Logo" fill className="object-contain" />
            </div>
            <span className="sr-only">LUNA</span>
          </Link>
          <NavigationMenu>
            <NavigationMenuList>
              {filteredNavItems.map((item) => (
                 <NavigationMenuItem key={item.href}>
                    <NavigationMenuLink asChild active={pathname.startsWith(item.href)} className={navigationMenuTriggerStyle()}>
                        <Link href={item.href}>
                            {item.label}
                        </Link>
                    </NavigationMenuLink>
                 </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </nav>
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <nav className="grid gap-6 text-lg font-medium">
              <Link
                href={dashboardLink}
                className="flex items-center gap-2 text-lg font-semibold"
              >
                <div className="relative h-6 w-6">
                    <Image src={newLogoUrl} alt="Luna Industries Logo" fill className="object-contain" />
                </div>
                <span>LUNA</span>
              </Link>
              {filteredNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn("hover:text-foreground", pathname.startsWith(item.href) ? "text-foreground" : "text-muted-foreground")}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <div className="flex w-full items-center justify-end gap-4 md:ml-auto md:gap-2 lg:gap-4">
          <ThemeToggle />
          {!isUserLoading && user ? (
            <UserNav />
          ) : (
            <Button variant="outline" asChild>
                <Link href="/login">
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                </Link>
            </Button>
          )}
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {children}
      </main>
    </div>
  );
}
