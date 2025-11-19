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
  Users,
} from 'lucide-react';
import { Logo } from '@/components/icons';
import { users } from '@/lib/data';
import type { User as UserType } from '@/lib/types';
import { UserNav } from '@/components/layout/user-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SkipNav, ScreenReaderAnnouncer } from '@/lib/accessibility';
import { KeyboardShortcutsDialog } from '@/components/accessibility/KeyboardShortcutsDialog';
import { AccessibilityMenu } from '@/components/accessibility/AccessibilityMenu';
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
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '/admin', icon: Shield, label: 'Admin', roles: ['admin'] },
  { href: '/operations', icon: Group, label: 'Operations', roles: ['admin', 'operations', 'operations_manager'] },
  { href: '/production', icon: Factory, label: 'Production', roles: ['admin', 'production', 'production_personnel'] },
  { href: '/sales', icon: Users, label: 'Sales', roles: ['admin', 'sales'] },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const newLogoUrl = 'https://i.postimg.cc/9FzKTLkD/WhatsApp_Image_2025-10-15_at_00.18.06_514d4d8f.jpg';
  const [showShortcuts, setShowShortcuts] = useState(false);

  // ALWAYS call useMemoFirebase - never conditionally
  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  
  // ALWAYS call useDoc - never conditionally
  const { data: userData, isLoading: isUserDataLoading } = useDoc<UserType>(userDocRef);

  // Filter nav items based on user role
  const filteredNavItems = userData?.role 
    ? navItems.filter(item => item.roles.includes(userData.role))
    : [];
  
  const dashboardLink = '/';

  // Protect routes - redirect if user tries to access unauthorized page
  useEffect(() => {
    if (!isUserLoading && !isUserDataLoading && userData && pathname !== '/') {
      const currentRoute = '/' + pathname.split('/')[1]; // Get first segment like /admin, /operations
      const hasAccess = navItems.find(item => 
        item.href === currentRoute && item.roles.includes(userData.role)
      );

      if (!hasAccess && currentRoute !== '/login' && currentRoute !== '/profile' && currentRoute !== '/settings') {
        // Redirect to user's default dashboard
        const role = userData.role;
        
        if (role === 'admin') {
          router.push('/admin');
        } else if (role === 'operations' || role === 'operations_manager') {
          router.push('/operations');
        } else if (role === 'production' || role === 'production_personnel') {
          router.push('/production');
        } else if (role === 'sales') {
          router.push('/sales');
        } else {
          router.push('/login');
        }
      }
    }
  }, [pathname, userData, isUserLoading, isUserDataLoading, router]);

  // Redirect to login if no user (after hooks are called)
  useEffect(() => {
    if (!isUserLoading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, isUserLoading, router, pathname]);

  // Show loading state while checking permissions
  if (isUserLoading || isUserDataLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="relative h-12 w-12 mx-auto mb-4">
            <Image src={newLogoUrl} alt="Luna Industries Logo" fill className="object-contain animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user after loading, show loading (redirect happens in useEffect)
  if (!user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="relative h-12 w-12 mx-auto mb-4">
            <Image src={newLogoUrl} alt="Luna Industries Logo" fill className="object-contain animate-pulse" />
          </div>
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <SkipNav mainContentId="main-content" />
      <ScreenReaderAnnouncer />
      <KeyboardShortcutsDialog isOpen={showShortcuts} onOpenChange={setShowShortcuts} />
      
      <header 
        className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-50"
        role="banner"
      >
        <nav 
          className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6"
          aria-label="Main navigation"
        >
          <Link
            href={dashboardLink}
            className="flex items-center gap-2 text-lg font-semibold md:text-base"
            aria-label="LUNA Home"
          >
             <div className="relative h-8 w-8">
                <Image src={newLogoUrl} alt="Luna Industries Logo" fill className="object-contain" />
            </div>
            <span className="sr-only">LUNA Industries</span>
          </Link>
          <NavigationMenu>
            <NavigationMenuList>
              {filteredNavItems.map((item) => (
                 <NavigationMenuItem key={item.href}>
                    <NavigationMenuLink 
                      asChild 
                      active={pathname.startsWith(item.href)} 
                      className={navigationMenuTriggerStyle()}
                    >
                        <Link 
                          href={item.href}
                          aria-current={pathname.startsWith(item.href) ? 'page' : undefined}
                        >
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
              suppressHydrationWarning
              aria-label="Toggle navigation menu"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <nav className="grid gap-6 text-lg font-medium" aria-label="Mobile navigation">
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
                  aria-current={pathname.startsWith(item.href) ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <div className="flex w-full items-center justify-end gap-4 md:ml-auto md:gap-2 lg:gap-4">
          <AccessibilityMenu onShowShortcuts={() => setShowShortcuts(true)} />
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
      <main 
        id="main-content"
        className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8"
        role="main"
        aria-label="Main content"
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  );
}
