// src/lib/accessibility/skip-nav.tsx
'use client';

import { useEffect } from 'react';
import { cn } from '@/lib/utils';

/**
 * Skip Navigation Link
 * Allows keyboard users to skip directly to main content
 * WCAG 2.1 Level A requirement
 */

interface SkipNavProps {
  /**
   * ID of the main content element to skip to
   * @default "main-content"
   */
  mainContentId?: string;
  
  /**
   * Custom className for styling
   */
  className?: string;
  
  /**
   * Link text
   * @default "Skip to main content"
   */
  text?: string;
}

export function SkipNav({
  mainContentId = 'main-content',
  className,
  text = 'Skip to main content',
}: SkipNavProps) {
  useEffect(() => {
    // Ensure main content element exists
    const mainContent = document.getElementById(mainContentId);
    if (!mainContent) {
      console.warn(
        `SkipNav: Element with id "${mainContentId}" not found. ` +
        `Make sure your main content has this id attribute.`
      );
    }
  }, [mainContentId]);

  return (
    <a
      href={`#${mainContentId}`}
      className={cn(
        // Position absolute, off-screen by default
        'absolute left-0 top-0 z-[9999]',
        'bg-primary text-primary-foreground',
        'px-4 py-2 font-medium',
        'transform -translate-y-full',
        // Show on focus
        'focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        // Smooth transition
        'transition-transform duration-200',
        className
      )}
      onClick={(e) => {
        // Ensure smooth scroll and focus
        e.preventDefault();
        const target = document.getElementById(mainContentId);
        if (target) {
          target.setAttribute('tabindex', '-1');
          target.focus();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Remove tabindex after focus
          target.addEventListener(
            'blur',
            () => {
              target.removeAttribute('tabindex');
            },
            { once: true }
          );
        }
      }}
    >
      {text}
    </a>
  );
}

/**
 * Main Content Wrapper
 * Wraps main content with proper ARIA landmarks and skip target
 */
export function MainContent({
  children,
  id = 'main-content',
  className,
}: {
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <main
      id={id}
      role="main"
      aria-label="Main content"
      className={className}
    >
      {children}
    </main>
  );
}
