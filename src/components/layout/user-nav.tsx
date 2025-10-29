'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User as UserIcon } from 'lucide-react';
import { ThemeToggleMenuItem } from '../theme-toggle';
import { useAuth, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import type { User as UserType } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';

export function UserNav() {
  // Get the Firebase Auth user
  const { user: authUser, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  // Create a memoized reference to the user's document in Firestore
  const userDocRef = useMemoFirebase(
    () => (authUser ? doc(firestore, 'users', authUser.uid) : null),
    [firestore, authUser]
  );

  // Fetch the document data (name, email, role)
  const { data: user, isLoading: isDocLoading } = useDoc<UserType>(userDocRef);

  const auth = useAuth();
  const router = useRouter();
  const newLogoUrl = 'https://i.postimg.cc/9FzKTLkD/WhatsApp_Image_2025-10-15_at_00.18.06_514d4d8f.jpg';


  const handleLogout = async () => {
    await auth.signOut();
    router.push('/login');
  };

  // Show loading state while fetching auth
  if (isAuthLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    );
  }

  // If no auth user, don't show anything
  if (!authUser) {
    return null;
  }

  // Use Firestore data if available, otherwise fallback to Firebase Auth data
  const displayName = user?.name || authUser.displayName || authUser.email?.split('@')[0] || 'User';
  const displayEmail = user?.email || authUser.email || 'No email';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.avatarUrl || newLogoUrl} alt={displayName} />
            <AvatarFallback>{avatarLetter}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">{displayEmail}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <UserIcon className="mr-2" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="mr-2" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <ThemeToggleMenuItem />
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
