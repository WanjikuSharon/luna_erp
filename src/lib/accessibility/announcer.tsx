// src/lib/accessibility/announcer.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Live Region Announcer
 * Announces messages to screen readers without visual changes
 * Useful for dynamic content updates
 */

type PolitenessLevel = 'polite' | 'assertive' | 'off';

interface AnnouncerProps {
  /**
   * Politeness level for screen reader announcements
   * - polite: Wait for user to finish current task
   * - assertive: Interrupt immediately
   * - off: Don't announce
   * @default "polite"
   */
  politeness?: PolitenessLevel;
}

/**
 * Screen Reader Announcer Component
 * Place this once in your app layout
 */
export function ScreenReaderAnnouncer({ politeness = 'polite' }: AnnouncerProps = {}) {
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Listen for custom announcement events
    const handleAnnounce = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      setMessage(customEvent.detail);
      
      // Clear message after announcement to allow repeat announcements
      setTimeout(() => setMessage(''), 100);
    };

    window.addEventListener('announce-to-screen-reader', handleAnnounce);

    return () => {
      window.removeEventListener('announce-to-screen-reader', handleAnnounce);
    };
  }, []);

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

/**
 * Announce a message to screen readers
 * Use this function from anywhere in your app
 */
export function announce(message: string) {
  if (typeof window === 'undefined') return;

  const event = new CustomEvent('announce-to-screen-reader', {
    detail: message,
  });

  window.dispatchEvent(event);
}

/**
 * Hook for announcing messages to screen readers
 */
export function useAnnouncer() {
  return { announce };
}

/**
 * Route Announcement Hook
 * Announces route changes to screen readers
 */
export function useRouteAnnouncer(pageName: string) {
  const previousPageRef = useRef<string>('');

  useEffect(() => {
    if (previousPageRef.current !== pageName) {
      announce(`Navigated to ${pageName} page`);
      previousPageRef.current = pageName;
    }
  }, [pageName]);
}
