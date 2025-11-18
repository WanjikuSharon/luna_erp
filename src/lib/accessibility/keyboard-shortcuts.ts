// src/lib/accessibility/keyboard-shortcuts.ts

/**
 * Keyboard Shortcuts Utilities
 * Provides utilities for implementing accessible keyboard shortcuts
 */

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  handler: (event: KeyboardEvent) => void;
}

export class KeyboardShortcutManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private enabled: boolean = true;

  /**
   * Register a keyboard shortcut
   */
  register(id: string, shortcut: KeyboardShortcut) {
    this.shortcuts.set(id, shortcut);
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregister(id: string) {
    this.shortcuts.delete(id);
  }

  /**
   * Enable keyboard shortcuts
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable keyboard shortcuts
   */
  disable() {
    this.enabled = false;
  }

  /**
   * Handle keyboard event
   */
  handleKeyDown(event: KeyboardEvent) {
    if (!this.enabled) return;

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    for (const shortcut of this.shortcuts.values()) {
      if (this.matchesShortcut(event, shortcut)) {
        event.preventDefault();
        shortcut.handler(event);
        break;
      }
    }
  }

  /**
   * Check if event matches shortcut
   */
  private matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
    return (
      event.key.toLowerCase() === shortcut.key.toLowerCase() &&
      !!event.ctrlKey === !!shortcut.ctrl &&
      !!event.shiftKey === !!shortcut.shift &&
      !!event.altKey === !!shortcut.alt &&
      !!event.metaKey === !!shortcut.meta
    );
  }

  /**
   * Get all registered shortcuts
   */
  getShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Format shortcut for display
   */
  static formatShortcut(shortcut: KeyboardShortcut): string {
    const parts: string[] = [];
    
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.meta) parts.push('Cmd');
    
    parts.push(shortcut.key.toUpperCase());
    
    return parts.join(' + ');
  }
}

/**
 * Global keyboard shortcut manager instance
 */
export const globalShortcuts = new KeyboardShortcutManager();

/**
 * Initialize global keyboard shortcuts listener
 */
export function initializeKeyboardShortcuts() {
  if (typeof window === 'undefined') return;

  const handler = (event: KeyboardEvent) => {
    globalShortcuts.handleKeyDown(event);
  };

  window.addEventListener('keydown', handler);

  return () => {
    window.removeEventListener('keydown', handler);
  };
}

/**
 * Common keyboard shortcuts
 */
export const COMMON_SHORTCUTS = {
  SEARCH: { key: '/', description: 'Open search' },
  HELP: { key: '?', shift: true, description: 'Show keyboard shortcuts' },
  ESCAPE: { key: 'Escape', description: 'Close dialog or cancel' },
  SAVE: { key: 's', ctrl: true, description: 'Save changes' },
  NEW: { key: 'n', ctrl: true, description: 'Create new item' },
  EDIT: { key: 'e', ctrl: true, description: 'Edit current item' },
  DELETE: { key: 'Delete', description: 'Delete current item' },
  NAVIGATE_UP: { key: 'ArrowUp', description: 'Navigate up' },
  NAVIGATE_DOWN: { key: 'ArrowDown', description: 'Navigate down' },
  NAVIGATE_LEFT: { key: 'ArrowLeft', description: 'Navigate left' },
  NAVIGATE_RIGHT: { key: 'ArrowRight', description: 'Navigate right' },
} as const;
