// src/lib/security/sanitize.ts

/**
 * Input Sanitization Utilities
 * Provides functions to sanitize user input and prevent XSS attacks.
 */

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Remove HTML tags from string
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize string for safe display
 * Removes HTML and escapes special characters
 */
export function sanitizeString(input: string): string {
  const stripped = stripHtml(input);
  return escapeHtml(stripped);
}

/**
 * Sanitize email address
 * Validates and normalizes email format
 */
export function sanitizeEmail(email: string): string {
  // Remove whitespace and convert to lowercase
  const cleaned = email.trim().toLowerCase();
  
  // Basic email validation pattern
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailPattern.test(cleaned)) {
    throw new Error('Invalid email format');
  }
  
  return cleaned;
}

/**
 * Sanitize URL
 * Ensures URL is safe and uses allowed protocols
 */
export function sanitizeUrl(url: string, allowedProtocols = ['http:', 'https:']): string {
  try {
    const parsed = new URL(url);
    
    if (!allowedProtocols.includes(parsed.protocol)) {
      throw new Error(`Protocol ${parsed.protocol} not allowed`);
    }
    
    return parsed.toString();
  } catch {
    throw new Error('Invalid URL format');
  }
}

/**
 * Sanitize phone number
 * Removes non-numeric characters except + at start
 */
export function sanitizePhoneNumber(phone: string): string {
  const cleaned = phone.trim();
  
  // Allow + at start, then only digits
  const phonePattern = /^\+?[0-9]+$/;
  
  if (!phonePattern.test(cleaned)) {
    throw new Error('Invalid phone number format');
  }
  
  return cleaned;
}

/**
 * Sanitize file name
 * Removes potentially dangerous characters and path traversal attempts
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path separators and dangerous characters
  const cleaned = fileName
    .replace(/[\/\\]/g, '')
    .replace(/\.\./g, '')
    .replace(/[<>:"|?*\x00-\x1f]/g, '')
    .trim();
  
  if (cleaned.length === 0) {
    throw new Error('Invalid file name');
  }
  
  if (cleaned.length > 255) {
    throw new Error('File name too long');
  }
  
  return cleaned;
}

/**
 * Sanitize numeric input
 * Ensures value is a valid number within optional range
 */
export function sanitizeNumber(
  input: string | number,
  options?: {
    min?: number;
    max?: number;
    integer?: boolean;
  }
): number {
  const num = typeof input === 'string' ? parseFloat(input) : input;
  
  if (isNaN(num) || !isFinite(num)) {
    throw new Error('Invalid number');
  }
  
  if (options?.integer && !Number.isInteger(num)) {
    throw new Error('Number must be an integer');
  }
  
  if (options?.min !== undefined && num < options.min) {
    throw new Error(`Number must be at least ${options.min}`);
  }
  
  if (options?.max !== undefined && num > options.max) {
    throw new Error(`Number must be at most ${options.max}`);
  }
  
  return num;
}

/**
 * Sanitize object by applying sanitization to all string values
 * Useful for sanitizing form data
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options?: {
    escapeHtml?: boolean;
    stripHtml?: boolean;
  }
): T {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      let sanitizedValue = value;
      
      if (options?.stripHtml) {
        sanitizedValue = stripHtml(sanitizedValue);
      }
      
      if (options?.escapeHtml) {
        sanitizedValue = escapeHtml(sanitizedValue);
      }
      
      sanitized[key] = sanitizedValue;
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>, options);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

/**
 * Validate and sanitize JSON input
 * Safely parses JSON and optionally validates against a schema
 */
export function sanitizeJson<T = unknown>(
  input: string,
  maxSize = 1024 * 1024 // 1MB default
): T {
  if (input.length > maxSize) {
    throw new Error('Input exceeds maximum size');
  }
  
  try {
    return JSON.parse(input) as T;
  } catch {
    throw new Error('Invalid JSON');
  }
}

/**
 * SQL injection prevention - parameterize values
 * Note: This is a basic helper. Always use parameterized queries from your ORM/database library.
 */
export function sanitizeSqlString(input: string): string {
  // Remove common SQL injection patterns
  const dangerous = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)|(-{2}|\/\*|\*\/)/gi;
  
  if (dangerous.test(input)) {
    throw new Error('Potentially dangerous SQL pattern detected');
  }
  
  // Escape single quotes
  return input.replace(/'/g, "''");
}

/**
 * Sanitization presets for common use cases
 */
export const SANITIZERS = {
  /**
   * User-generated content (comments, descriptions, etc.)
   */
  USER_CONTENT: (input: string) => {
    return sanitizeString(input);
  },
  
  /**
   * Search queries
   */
  SEARCH_QUERY: (input: string) => {
    return escapeHtml(stripHtml(input.trim()));
  },
  
  /**
   * Display names
   */
  DISPLAY_NAME: (input: string) => {
    const cleaned = stripHtml(input.trim());
    if (cleaned.length < 1 || cleaned.length > 100) {
      throw new Error('Display name must be 1-100 characters');
    }
    return cleaned;
  },
} as const;
