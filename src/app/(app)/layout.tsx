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
import { useEffect } from 'react';

const navItems = [
  { href: '/admin', icon: Shield, label: 'Admin', roles: ['admin'] },
  { href: '/operations', icon: Group, label: 'Operations', roles: ['admin', 'operations'] },
  { href: '/production', icon: Factory, label: 'Production', roles: ['admin', 'production'] },
  { href: '/sales', icon: Users, label: 'Sales', roles: ['admin', 'sales'] },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const newLogoUrl = 'https://i.postimg.cc/9FzKTLkD/WhatsApp_Image_2025-10-15_at_00.18.06_514d4d8f.jpg';

  // Fetch user data from Firestore to get role
  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
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

      if (!hasAccess && currentRoute !== '/login') {
        // Redirect to user's default dashboard
        switch (userData.role) {
          case 'admin':
            router.push('/admin');
            break;
          case 'operations':
            router.push('/operations');
            break;
          case 'production':
            router.push('/production');
            break;
          case 'sales':
            router.push('/sales');
            break;
          default:
            router.push('/login');
        }
      }
    }
  }, [pathname, userData, isUserLoading, isUserDataLoading, router]);

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

  // If no user, redirect to login
  if (!user) {
    router.push('/login');
    return null;
  }

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
              suppressHydrationWarning
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
