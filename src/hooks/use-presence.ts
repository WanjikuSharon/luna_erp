// src/hooks/use-presence.ts
'use client';

import { useEffect, useState } from 'react';
import { ref, onValue, set, onDisconnect, serverTimestamp } from 'firebase/database';
import { rtdb } from '@/firebase/config';
import { useAuth } from '@/firebase/provider';

export interface UserPresence {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: number;
}

/**
 * Hook to manage user presence status
 * Updates Realtime Database with online/offline status
 */
export function usePresence() {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);

  useEffect(() => {
    if (!rtdb || !user) return;

    const userStatusRef = ref(rtdb, `status/${user.uid}`);
    const connectedRef = ref(rtdb, '.info/connected');

    // Monitor connection state
    const unsubscribe = onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === true) {
        // Set user as online
        set(userStatusRef, {
          uid: user.uid,
          displayName: user.displayName || 'Unknown User',
          email: user.email || '',
          role: (user as any).role || 'user',
          status: 'online',
          lastSeen: serverTimestamp(),
        });

        // When disconnected, mark as offline
        onDisconnect(userStatusRef).set({
          uid: user.uid,
          displayName: user.displayName || 'Unknown User',
          email: user.email || '',
          role: (user as any).role || 'user',
          status: 'offline',
          lastSeen: serverTimestamp(),
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
      // Mark user as offline on cleanup
      set(userStatusRef, {
        uid: user.uid,
        displayName: user.displayName || 'Unknown User',
        email: user.email || '',
        role: (user as any).role || 'user',
        status: 'offline',
        lastSeen: Date.now(),
      });
    };
  }, [user]);

  // Listen to all users' presence
  useEffect(() => {
    if (!rtdb) return;

    const statusRef = ref(rtdb, 'status');
    const unsubscribe = onValue(statusRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const users = Object.values(data) as UserPresence[];
        setOnlineUsers(users.filter((u) => u.status === 'online'));
      } else {
        setOnlineUsers([]);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return { onlineUsers };
}
