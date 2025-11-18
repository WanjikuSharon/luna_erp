// src/lib/security/api-auth.ts
import { cookies } from 'next/headers';
import { admin, getAdminAuth } from '@/lib/firebase-admin';

/**
 * API Route Authentication Utilities
 * Provides utilities for authenticating API requests using Firebase Auth
 */

/**
 * Extract Firebase ID token from request headers
 */
function getAuthToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7);
}

/**
 * Verify Firebase ID token and return decoded token
 */
export async function verifyAuthToken(request: Request) {
  const token = getAuthToken(request);
  
  if (!token) {
    return null;
  }
  
  // Check if Firebase Admin is initialized
  const auth = getAdminAuth();
  if (!auth) {
    console.error('Firebase Admin not initialized');
    return null;
  }
  
  try {
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Require authentication for API route
 * Returns 401 if not authenticated
 */
export async function requireAuth(request: Request) {
  const decodedToken = await verifyAuthToken(request);
  
  if (!decodedToken) {
    return {
      authenticated: false,
      response: new Response('Unauthorized', { status: 401 }),
    };
  }
  
  return {
    authenticated: true,
    user: decodedToken,
  };
}

/**
 * Require specific role for API route
 * Returns 403 if user doesn't have required role
 */
export async function requireRole(
  request: Request,
  allowedRoles: string[]
) {
  const decodedToken = await verifyAuthToken(request);
  
  if (!decodedToken) {
    return {
      authorized: false,
      response: new Response('Unauthorized', { status: 401 }),
    };
  }
  
  const userRole = decodedToken.role as string | undefined;
  
  if (!userRole || !allowedRoles.includes(userRole)) {
    return {
      authorized: false,
      response: new Response('Forbidden - Insufficient permissions', { status: 403 }),
    };
  }
  
  return {
    authorized: true,
    user: decodedToken,
  };
}

/**
 * Role-based access control helpers
 */
export const ROLES = {
  ADMIN: 'admin',
  OPERATIONS_MANAGER: 'operations_manager',
  PRODUCTION_PERSONNEL: 'production_personnel',
  SALES: 'sales',
  OPERATIONS: 'operations',
  PRODUCTION: 'production',
} as const;

/**
 * Common role groups for convenience
 */
export const ROLE_GROUPS = {
  ALL: Object.values(ROLES) as string[],
  MANAGEMENT: [ROLES.ADMIN, ROLES.OPERATIONS_MANAGER] as string[],
  OPERATIONS: [ROLES.ADMIN, ROLES.OPERATIONS_MANAGER, ROLES.OPERATIONS] as string[],
  PRODUCTION: [ROLES.ADMIN, ROLES.OPERATIONS_MANAGER, ROLES.PRODUCTION_PERSONNEL, ROLES.PRODUCTION] as string[],
  SALES_TEAM: [ROLES.ADMIN, ROLES.SALES] as string[],
};

/**
 * Example usage in API route:
 * 
 * ```typescript
 * import { requireRole, ROLE_GROUPS } from '@/lib/security/api-auth';
 * 
 * export async function POST(request: Request) {
 *   // Check authentication and authorization
 *   const authResult = await requireRole(request, ROLE_GROUPS.MANAGEMENT);
 *   
 *   if (!authResult.authorized) {
 *     return authResult.response;
 *   }
 *   
 *   // User is authenticated and has required role
 *   const user = authResult.user;
 *   
 *   // ... rest of handler
 * }
 * ```
 */

/**
 * Create authenticated response with user context
 */
export function createAuthenticatedResponse(
  data: unknown,
  status = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create error response with proper status code
 */
export function createErrorResponse(
  message: string,
  status = 400
): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
