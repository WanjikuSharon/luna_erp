// src/lib/accessibility/focus-trap.ts

/**
 * Focus Trap Utilities
 * Helps trap focus within modals, dialogs, and other contained elements
 * for better keyboard navigation accessibility
 */

const FOCUSABLE_ELEMENTS = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
].join(',');

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS)
  ).filter((element) => {
    // Check if element is visible and not disabled
    return (
      element.offsetWidth > 0 &&
      element.offsetHeight > 0 &&
      !element.hasAttribute('disabled') &&
      !element.getAttribute('aria-hidden')
    );
  });
}

/**
 * Trap focus within a container
 * Returns cleanup function to remove event listener
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = getFocusableElements(container);
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  // Focus first element
  firstFocusable?.focus();

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;

    if (event.shiftKey) {
      // Shift + Tab (backward)
      if (document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      // Tab (forward)
      if (document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable?.focus();
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown);

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Hook-friendly focus trap for React components
 */
export function useFocusTrap(enabled: boolean = true) {
  if (typeof window === 'undefined') return { trapRef: null };

  return {
    trapRef: (element: HTMLElement | null) => {
      if (!element || !enabled) return;

      const cleanup = trapFocus(element);

      // Return cleanup for useEffect
      return cleanup;
    },
  };
}

/**
 * Restore focus to a specific element
 * Useful for returning focus after closing a dialog
 */
export function restoreFocus(element: HTMLElement | null) {
  if (element && typeof element.focus === 'function') {
    // Small delay to ensure DOM is ready
    requestAnimationFrame(() => {
      element.focus();
    });
  }
}

/**
 * Focus management for route changes
 * Moves focus to main content after navigation
 */
export function focusMainContent() {
  const main = document.querySelector('main');
  if (main) {
    main.setAttribute('tabindex', '-1');
    main.focus();
    // Remove tabindex after focus to prevent it from being in tab order
    main.addEventListener(
      'blur',
      () => {
        main.removeAttribute('tabindex');
      },
      { once: true }
    );
  }
}
