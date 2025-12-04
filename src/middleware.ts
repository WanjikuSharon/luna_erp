// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware for Security Headers
 * Runs on every request to add security headers
 */

export function middleware(request: NextRequest) {
  // Create response
  const response = NextResponse.next();
  
  // Security Headers
  const headers = response.headers;
  
  // Content Security Policy (CSP)
  // Adjust based on your application's needs
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-inline for Next.js, consider nonce-based CSP
    "style-src 'self' 'unsafe-inline'", // unsafe-inline for Tailwind
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.cloudfunctions.net https://api.cloudinary.com https://res.cloudinary.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  
  headers.set('Content-Security-Policy', cspDirectives);
  
  // Prevent clickjacking
  headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  headers.set('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection (legacy browsers)
  headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // HSTS (HTTP Strict Transport Security)
  // Only enable in production with HTTPS
  if (process.env.NODE_ENV === 'production') {
    headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  
  // Permissions Policy (formerly Feature Policy)
  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );
  
  // Remove server identification
  headers.delete('X-Powered-By');
  
  return response;
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
