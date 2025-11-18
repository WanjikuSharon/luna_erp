// src/lib/accessibility/aria-helpers.ts

/**
 * ARIA Helpers
 * Utilities for managing ARIA attributes and improving accessibility
 */

/**
 * Generate a unique ID for ARIA relationships
 */
export function generateAriaId(prefix: string = 'aria'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * ARIA label generator for common UI patterns
 */
export const ariaLabels = {
  /**
   * Loading state
   */
  loading: (itemName?: string) =>
    itemName ? `Loading ${itemName}...` : 'Loading...',

  /**
   * Error state
   */
  error: (message: string) => `Error: ${message}`,

  /**
   * Success state
   */
  success: (message: string) => `Success: ${message}`,

  /**
   * Sort button
   */
  sort: (column: string, direction: 'asc' | 'desc' | 'none') => {
    if (direction === 'none') return `Sort by ${column}`;
    const directionText = direction === 'asc' ? 'ascending' : 'descending';
    return `Sorted by ${column}, ${directionText}. Click to reverse order.`;
  },

  /**
   * Pagination
   */
  pagination: {
    page: (current: number, total: number) =>
      `Page ${current} of ${total}`,
    next: () => 'Go to next page',
    previous: () => 'Go to previous page',
    first: () => 'Go to first page',
    last: () => 'Go to last page',
  },

  /**
   * Form fields
   */
  form: {
    required: (fieldName: string) => `${fieldName}, required field`,
    optional: (fieldName: string) => `${fieldName}, optional field`,
    invalid: (fieldName: string, error: string) =>
      `${fieldName}, invalid: ${error}`,
    characterCount: (current: number, max: number) =>
      `${current} of ${max} characters used`,
  },

  /**
   * Dialog/Modal
   */
  dialog: {
    open: (title: string) => `${title} dialog opened`,
    close: () => 'Close dialog',
  },

  /**
   * Menu
   */
  menu: {
    toggle: (menuName: string, isOpen: boolean) =>
      `${menuName} menu, ${isOpen ? 'expanded' : 'collapsed'}`,
    item: (itemName: string, index: number, total: number) =>
      `${itemName}, ${index} of ${total}`,
  },

  /**
   * Tabs
   */
  tabs: {
    tab: (tabName: string, index: number, total: number, isSelected: boolean) =>
      `${tabName}, tab ${index} of ${total}${isSelected ? ', selected' : ''}`,
    panel: (tabName: string) => `${tabName} panel`,
  },

  /**
   * Table
   */
  table: {
    caption: (tableName: string, rowCount: number) =>
      `${tableName}, ${rowCount} rows`,
    row: (index: number, total: number) => `Row ${index} of ${total}`,
    cell: (column: string, row: number) => `${column}, row ${row}`,
  },

  /**
   * Search
   */
  search: {
    input: () => 'Search',
    results: (count: number, query: string) =>
      `${count} results found for "${query}"`,
    noResults: (query: string) => `No results found for "${query}"`,
  },

  /**
   * Navigation
   */
  navigation: {
    main: () => 'Main navigation',
    breadcrumb: () => 'Breadcrumb navigation',
    link: (text: string, isCurrent: boolean) =>
      `${text}${isCurrent ? ', current page' : ''}`,
  },
};

/**
 * ARIA live region types
 */
export const ARIA_LIVE = {
  POLITE: 'polite',
  ASSERTIVE: 'assertive',
  OFF: 'off',
} as const;

/**
 * Common ARIA role mappings
 */
export const ARIA_ROLES = {
  ALERT: 'alert',
  ALERTDIALOG: 'alertdialog',
  BUTTON: 'button',
  CHECKBOX: 'checkbox',
  DIALOG: 'dialog',
  GRID: 'grid',
  GRIDCELL: 'gridcell',
  LINK: 'link',
  LOG: 'log',
  MAIN: 'main',
  MENU: 'menu',
  MENUBAR: 'menubar',
  MENUITEM: 'menuitem',
  NAVIGATION: 'navigation',
  PROGRESSBAR: 'progressbar',
  RADIO: 'radio',
  RADIOGROUP: 'radiogroup',
  REGION: 'region',
  SEARCH: 'search',
  STATUS: 'status',
  TAB: 'tab',
  TABLIST: 'tablist',
  TABPANEL: 'tabpanel',
  TEXTBOX: 'textbox',
  TOOLBAR: 'toolbar',
  TOOLTIP: 'tooltip',
  TREE: 'tree',
  TREEITEM: 'treeitem',
} as const;

/**
 * Manage focus visibility (show focus ring only for keyboard users)
 */
export function initializeFocusVisible() {
  if (typeof window === 'undefined') return;

  let isUsingKeyboard = false;

  // Detect keyboard usage
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      isUsingKeyboard = true;
      document.body.classList.add('keyboard-user');
    }
  });

  // Detect mouse usage
  window.addEventListener('mousedown', () => {
    isUsingKeyboard = false;
    document.body.classList.remove('keyboard-user');
  });

  return () => {
    document.body.classList.remove('keyboard-user');
  };
}

/**
 * Announce message to screen readers using ARIA live region
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) {
  if (typeof window === 'undefined') return;

  const announcer = document.createElement('div');
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', priority);
  announcer.setAttribute('aria-atomic', 'true');
  announcer.className = 'sr-only';
  announcer.textContent = message;

  document.body.appendChild(announcer);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcer);
  }, 1000);
}
