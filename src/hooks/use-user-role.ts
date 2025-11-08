// src/hooks/use-user-role.ts
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { getUserRole, getUserData } from '@/services/user_service';
import type { User } from '@/lib/types';

export interface UserRoleResult {
  role: User['role'] | null;
  userData: User | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch and manage the current user's role and data from Firestore.
 * Automatically refreshes when the auth user changes.
 */
export function useUserRole(): UserRoleResult {
  const { user: authUser, isUserLoading: authLoading } = useUser();
  const firestore = useFirestore();
  
  const [role, setRole] = useState<User['role'] | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }

    if (!authUser) {
      setRole(null);
      setUserData(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [fetchedRole, fetchedUserData] = await Promise.all([
          getUserRole(firestore, authUser.uid),
          getUserData(firestore, authUser.uid),
        ]);

        if (isMounted) {
          setRole(fetchedRole);
          setUserData(fetchedUserData);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch user data'));
          console.error('Error in useUserRole:', err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchUserData();

    return () => {
      isMounted = false;
    };
  }, [authUser, authLoading, firestore]);

  return { role, userData, isLoading, error };
}

/**
 * Hook to check if the current user has a specific role.
 */
export function useHasRole(requiredRole: User['role'] | User['role'][]): boolean {
  const { role, isLoading } = useUserRole();
  
  if (isLoading || !role) {
    return false;
  }

  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(role);
  }

  return role === requiredRole;
}

/**
 * Hook to check if the current user is an admin.
 */
export function useIsAdmin(): boolean {
  return useHasRole('admin');
}
