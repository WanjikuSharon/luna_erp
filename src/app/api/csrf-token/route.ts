// src/app/api/csrf-token/route.ts

/**
 * CSRF Token Endpoint
 * Provides CSRF tokens to authenticated clients
 */

import { NextRequest } from 'next/server';
import { setCsrfToken, createAuthenticatedResponse } from '@/lib/security';

/**
 * GET /api/csrf-token
 * Returns a CSRF token for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Generate and set CSRF token in cookie
    const token = await setCsrfToken();
    
    // Return token to client (they'll need to include it in headers)
    return createAuthenticatedResponse({
      csrfToken: token,
    });
  } catch (error) {
    return new Response('Failed to generate CSRF token', {
      status: 500,
    });
  }
}
