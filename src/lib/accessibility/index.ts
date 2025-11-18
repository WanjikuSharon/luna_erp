// src/lib/accessibility/index.ts

/**
 * Accessibility Utilities - Barrel Export
 * Centralized exports for all accessibility utilities
 */

// Focus Management
export {
  getFocusableElements,
  trapFocus,
  useFocusTrap,
  restoreFocus,
  focusMainContent,
} from './focus-trap';

// Skip Navigation
export { SkipNav, MainContent } from './skip-nav';

// Screen Reader Announcements
export {
  ScreenReaderAnnouncer,
  announce,
  useAnnouncer,
  useRouteAnnouncer,
} from './announcer';

// Keyboard Shortcuts
export {
  KeyboardShortcutManager,
  globalShortcuts,
  initializeKeyboardShortcuts,
  COMMON_SHORTCUTS,
  type KeyboardShortcut,
} from './keyboard-shortcuts';

// ARIA Helpers
export {
  generateAriaId,
  ariaLabels,
  ARIA_LIVE,
  ARIA_ROLES,
  initializeFocusVisible,
  announceToScreenReader,
} from './aria-helpers';
