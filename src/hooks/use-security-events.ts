// src/hooks/use-security-events.ts
'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where, Timestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { SecurityEvent } from '@/services/security_service';

/**
 * Hook to fetch recent security events in real-time
 */
export function useSecurityEvents(maxEvents: number = 50) {
  const firestore = useFirestore();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const eventsRef = collection(firestore, 'security_events');
    const q = query(
      eventsRef,
      orderBy('timestamp', 'desc'),
      limit(maxEvents)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const securityEvents: SecurityEvent[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SecurityEvent[];
        
        setEvents(securityEvents);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching security events:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, maxEvents]);

  return { events, isLoading };
}

/**
 * Hook to get unresolved security events count
 */
export function useUnresolvedSecurityCount() {
  const firestore = useFirestore();
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const eventsRef = collection(firestore, 'security_events');
    const q = query(
      eventsRef,
      where('resolved', '==', false),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setCount(snapshot.size);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching unresolved count:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore]);

  return { count, isLoading };
}

/**
 * Hook to get security events by severity
 */
export function useSecurityEventsBySeverity(severity: 'low' | 'medium' | 'high' | 'critical') {
  const firestore = useFirestore();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const eventsRef = collection(firestore, 'security_events');
    const q = query(
      eventsRef,
      where('severity', '==', severity),
      where('resolved', '==', false),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const securityEvents: SecurityEvent[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SecurityEvent[];
        
        setEvents(securityEvents);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching security events by severity:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, severity]);

  return { events, isLoading };
}

/**
 * Hook to get recent security events (last 24 hours)
 */
export function useRecentSecurityEvents() {
  const firestore = useFirestore();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayTimestamp = Timestamp.fromDate(yesterday);

    const eventsRef = collection(firestore, 'security_events');
    const q = query(
      eventsRef,
      where('timestamp', '>=', yesterdayTimestamp),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const securityEvents: SecurityEvent[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SecurityEvent[];
        
        setEvents(securityEvents);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching recent security events:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore]);

  return { events, isLoading };
}
