// src/app/api/examples/protected-route/route.ts

/**
 * Example Protected API Route
 * Demonstrates how to use security utilities in API routes
 */

import { NextRequest } from 'next/server';
import {
  requireRole,
  ROLE_GROUPS,
  createAuthenticatedResponse,
  createErrorResponse,
  checkRateLimit,
  getClientIp,
  createRateLimitHeaders,
  RATE_LIMITS,
  validateCsrfToken,
  sanitizeObject,
} from '@/lib/security';

export async function POST(request: NextRequest) {
  // 1. Rate Limiting
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, RATE_LIMITS.WRITE);
  
  if (!rateLimit.success) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: createRateLimitHeaders(rateLimit),
    });
  }
  
  // 2. CSRF Protection
  const csrfToken = request.headers.get('x-csrf-token');
  const csrfValid = await validateCsrfToken(csrfToken);
  
  if (!csrfValid) {
    return createErrorResponse('Invalid CSRF token', 403);
  }
  
  // 3. Authentication & Authorization
  const authResult = await requireRole(request, ROLE_GROUPS.MANAGEMENT);
  
  if (!authResult.authorized) {
    return authResult.response;
  }
  
  // 4. Input Sanitization
  try {
    const body = await request.json();
    const sanitizedBody = sanitizeObject(body, {
      escapeHtml: true,
      stripHtml: true,
    });
    
    // Process the request with sanitized data
    const result = {
      message: 'Success',
      data: sanitizedBody,
      user: authResult.user.uid,
    };
    
    return createAuthenticatedResponse(result, 200);
  } catch (error) {
    return createErrorResponse('Invalid request body', 400);
  }
}

// Example GET request with read rate limits
export async function GET(request: NextRequest) {
  // Rate limiting for read operations
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, RATE_LIMITS.READ);
  
  if (!rateLimit.success) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: createRateLimitHeaders(rateLimit),
    });
  }
  
  // Authentication (but not role-based)
  const authResult = await requireRole(request, ROLE_GROUPS.ALL);
  
  if (!authResult.authorized) {
    return authResult.response;
  }
  
  // Return data
  const data = {
    message: 'Data retrieved successfully',
    timestamp: new Date().toISOString(),
  };
  
  const response = createAuthenticatedResponse(data);
  
  // Add rate limit headers to response
  const headers = createRateLimitHeaders(rateLimit);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}
