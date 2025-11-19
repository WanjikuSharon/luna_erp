// src/hooks/use-realtime-activities.ts
'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit, Unsubscribe, where } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Activity } from '@/lib/types';

/**
 * Hook for real-time activity feed
 * Shows live updates of all system activities
 */
export function useRealtimeActivities(limitCount: number = 50) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const activitiesQuery = query(
      collection(db, 'activities'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(
      activitiesQuery,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Activity[];
        setActivities(items);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error listening to activities:', err);
        setError(err as Error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [limitCount]);

  return { activities, isLoading, error };
}

/**
 * Hook for real-time user-specific activities
 */
export function useRealtimeUserActivities(userId: string | null, limitCount: number = 20) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!db || !userId) {
      setIsLoading(false);
      setActivities([]);
      return;
    }

    setIsLoading(true);

    const activitiesQuery = query(
      collection(db, 'activities'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(
      activitiesQuery,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Activity[];
        setActivities(items);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error listening to user activities:', err);
        setError(err as Error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, limitCount]);

  return { activities, isLoading, error };
}

/**
 * Hook for real-time notifications
 * Filters activities that should notify the user
 */
export function useRealtimeNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<Activity[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !userId) {
      setIsLoading(false);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setIsLoading(true);

    // Listen to activities that mention this user or are critical
    const notificationsQuery = query(
      collection(db, 'activities'),
      where('priority', 'in', ['high', 'critical']),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Activity[];
        
        setNotifications(items);
        
        // Count unread (activities from last 24 hours)
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        const unread = items.filter((item) => {
          const timestamp = item.timestamp?.toDate?.() || new Date(item.timestamp);
          return timestamp > oneDayAgo;
        }).length;
        
        setUnreadCount(unread);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error listening to notifications:', err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { notifications, unreadCount, isLoading };
}
