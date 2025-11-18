// src/lib/security/csrf.ts
import { cookies } from 'next/headers';

/**
 * CSRF Token Management
 * Provides utilities for generating and validating CSRF tokens
 * to protect against Cross-Site Request Forgery attacks.
 */

const CSRF_TOKEN_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generates a cryptographically secure random token
 */
export function generateCsrfToken(): string {
  // Generate random bytes and convert to base64
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString('base64');
}

/**
 * Sets CSRF token in cookie (server-side)
 * Call this in API routes or server components
 */
export async function setCsrfToken(): Promise<string> {
  const token = generateCsrfToken();
  const cookieStore = await cookies();
  
  cookieStore.set(CSRF_TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
  
  return token;
}

/**
 * Gets CSRF token from cookie (server-side)
 */
export async function getCsrfToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_TOKEN_NAME)?.value;
}

/**
 * Validates CSRF token from request headers
 * Returns true if valid, false otherwise
 */
export async function validateCsrfToken(headerToken: string | null): Promise<boolean> {
  if (!headerToken) {
    return false;
  }
  
  const cookieToken = await getCsrfToken();
  
  if (!cookieToken) {
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(cookieToken, headerToken);
}

/**
 * Timing-safe string comparison
 * Prevents timing attacks by ensuring comparison takes constant time
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Middleware wrapper for CSRF protection
 * Usage in API routes:
 * ```typescript
 * export async function POST(request: Request) {
 *   const csrfValid = await validateCsrfToken(request.headers.get('x-csrf-token'));
 *   if (!csrfValid) {
 *     return new Response('Invalid CSRF token', { status: 403 });
 *   }
 *   // ... rest of handler
 * }
 * ```
 */
export const CSRF_HEADER = CSRF_HEADER_NAME;
export const CSRF_COOKIE = CSRF_TOKEN_NAME;
