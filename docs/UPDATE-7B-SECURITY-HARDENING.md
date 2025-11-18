# Update #7B: Security Hardening

## Overview
This update implements comprehensive security measures to protect the LUNA ERP application from common web vulnerabilities including CSRF attacks, rate limiting abuse, XSS attacks, and unauthorized API access.

## Security Enhancements Implemented

### 1. CSRF Protection
**File: `src/lib/security/csrf.ts`**

Cross-Site Request Forgery (CSRF) protection using cryptographically secure tokens:

```typescript
import { validateCsrfToken, setCsrfToken } from '@/lib/security';

// In API route
export async function POST(request: Request) {
  const csrfValid = await validateCsrfToken(
    request.headers.get('x-csrf-token')
  );
  
  if (!csrfValid) {
    return new Response('Invalid CSRF token', { status: 403 });
  }
  
  // Process request...
}
```

**Features**:
- Secure token generation using Web Crypto API
- HttpOnly cookies to prevent XSS token theft
- Timing-safe comparison to prevent timing attacks
- 24-hour token expiration
- SameSite=Strict for additional protection

**Token Endpoint**: `GET /api/csrf-token`

### 2. Rate Limiting
**File: `src/lib/security/rate-limit.ts`**

In-memory rate limiting to prevent API abuse and DoS attacks:

```typescript
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/security';

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(
    getClientIp(request),
    RATE_LIMITS.WRITE
  );
  
  if (!rateLimit.success) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: createRateLimitHeaders(rateLimit),
    });
  }
  
  // Process request...
}
```

**Predefined Limits**:
- `RATE_LIMITS.AUTH`: 5 requests per 15 minutes (login, password reset)
- `RATE_LIMITS.API`: 100 requests per minute (general API)
- `RATE_LIMITS.READ`: 300 requests per minute (GET requests)
- `RATE_LIMITS.WRITE`: 30 requests per minute (POST/PUT/DELETE)
- `RATE_LIMITS.SENSITIVE`: 3 requests per hour (critical operations)

**Features**:
- IP-based identification with proxy support
- Standard rate limit headers (X-RateLimit-*)
- Automatic cleanup of expired entries
- Configurable windows and limits

**Note**: For production with multiple servers, use Redis or a database instead of in-memory storage.

### 3. Input Sanitization
**File: `src/lib/security/sanitize.ts`**

Comprehensive input sanitization to prevent XSS and injection attacks:

```typescript
import { sanitizeString, sanitizeEmail, sanitizeObject } from '@/lib/security';

// Sanitize user input
const safe = sanitizeString(userInput);

// Sanitize email
const email = sanitizeEmail('user@example.com');

// Sanitize entire form object
const sanitizedData = sanitizeObject(formData, {
  escapeHtml: true,
  stripHtml: true,
});
```

**Available Sanitizers**:
- `escapeHtml()` - Escape HTML special characters
- `stripHtml()` - Remove all HTML tags
- `sanitizeString()` - Combination of strip + escape
- `sanitizeEmail()` - Validate and normalize email
- `sanitizeUrl()` - Validate URL with protocol whitelist
- `sanitizePhoneNumber()` - Clean phone number format
- `sanitizeFileName()` - Remove path traversal and dangerous chars
- `sanitizeNumber()` - Validate numeric input with range checks
- `sanitizeObject()` - Recursively sanitize object properties
- `sanitizeJson()` - Safe JSON parsing with size limits
- `sanitizeSqlString()` - Basic SQL injection prevention

**Presets**:
- `SANITIZERS.USER_CONTENT` - For comments, descriptions
- `SANITIZERS.SEARCH_QUERY` - For search inputs
- `SANITIZERS.DISPLAY_NAME` - For user names (1-100 chars)

### 4. Security Headers (Middleware)
**File: `src/middleware.ts`**

Next.js middleware that adds security headers to all responses:

```typescript
// Automatically applied to all routes
```

**Headers Applied**:

#### Content Security Policy (CSP)
```
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https: blob:;
font-src 'self' data:;
connect-src 'self' https://firestore.googleapis.com ...;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

**Why unsafe-inline**:
- `script-src 'unsafe-inline'`: Required for Next.js inline scripts
- `style-src 'unsafe-inline'`: Required for Tailwind CSS
- **Recommendation**: Use nonce-based CSP in production for better security

#### Other Security Headers
- **X-Frame-Options**: `DENY` - Prevents clickjacking
- **X-Content-Type-Options**: `nosniff` - Prevents MIME sniffing
- **X-XSS-Protection**: `1; mode=block` - Legacy XSS protection
- **Referrer-Policy**: `strict-origin-when-cross-origin`
- **Strict-Transport-Security** (production only): Forces HTTPS
- **Permissions-Policy**: Disables unused browser features
- **X-Powered-By**: Removed to hide server information

### 5. API Authentication & Authorization
**File: `src/lib/security/api-auth.ts`**

Firebase-based authentication and role-based access control:

```typescript
import { requireRole, ROLE_GROUPS } from '@/lib/security';

export async function POST(request: Request) {
  // Require admin or operations manager role
  const authResult = await requireRole(request, ROLE_GROUPS.MANAGEMENT);
  
  if (!authResult.authorized) {
    return authResult.response; // 401 or 403
  }
  
  // Access user info
  const userId = authResult.user.uid;
  const userRole = authResult.user.role;
  
  // Process request...
}
```

**Predefined Roles**:
```typescript
const ROLES = {
  ADMIN: 'admin',
  OPERATIONS_MANAGER: 'operations_manager',
  PRODUCTION_PERSONNEL: 'production_personnel',
  SALES: 'sales',
  OPERATIONS: 'operations',
  PRODUCTION: 'production',
};
```

**Role Groups** (for convenience):
- `ROLE_GROUPS.ALL` - All authenticated users
- `ROLE_GROUPS.MANAGEMENT` - Admin + Operations Manager
- `ROLE_GROUPS.OPERATIONS` - Admin + Ops Manager + Operations
- `ROLE_GROUPS.PRODUCTION` - Production-related roles
- `ROLE_GROUPS.SALES_TEAM` - Sales-related roles

**Helper Functions**:
- `verifyAuthToken()` - Verify Firebase ID token
- `requireAuth()` - Require any authenticated user
- `requireRole()` - Require specific role(s)
- `createAuthenticatedResponse()` - Create JSON response
- `createErrorResponse()` - Create error response

## Implementation Examples

### Complete Protected API Route

```typescript
// src/app/api/protected/route.ts
import { NextRequest } from 'next/server';
import {
  requireRole,
  ROLE_GROUPS,
  checkRateLimit,
  getClientIp,
  RATE_LIMITS,
  validateCsrfToken,
  sanitizeObject,
  createAuthenticatedResponse,
  createErrorResponse,
} from '@/lib/security';

export async function POST(request: NextRequest) {
  // 1. Rate limiting
  const rateLimit = checkRateLimit(getClientIp(request), RATE_LIMITS.WRITE);
  if (!rateLimit.success) {
    return new Response('Too Many Requests', { status: 429 });
  }
  
  // 2. CSRF protection
  const csrfValid = await validateCsrfToken(request.headers.get('x-csrf-token'));
  if (!csrfValid) {
    return createErrorResponse('Invalid CSRF token', 403);
  }
  
  // 3. Authentication & authorization
  const authResult = await requireRole(request, ROLE_GROUPS.MANAGEMENT);
  if (!authResult.authorized) {
    return authResult.response;
  }
  
  // 4. Input sanitization
  const body = await request.json();
  const sanitized = sanitizeObject(body, { escapeHtml: true, stripHtml: true });
  
  // 5. Process request
  return createAuthenticatedResponse({ success: true });
}
```

### Client-Side CSRF Token Usage

```typescript
// In React component
async function makeProtectedRequest() {
  // 1. Get CSRF token
  const tokenResponse = await fetch('/api/csrf-token');
  const { csrfToken } = await tokenResponse.json();
  
  // 2. Make request with token
  const response = await fetch('/api/protected', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
      'Authorization': `Bearer ${firebaseIdToken}`,
    },
    body: JSON.stringify(data),
  });
  
  return response.json();
}
```

## Security Best Practices

### 1. Input Validation
- Always validate input on the server side
- Use Zod schemas (already implemented in Update #5)
- Sanitize before displaying user-generated content
- Never trust client-side validation alone

### 2. Authentication
- Always verify Firebase ID tokens server-side
- Use role-based access control
- Implement proper session management
- Log authentication failures

### 3. Rate Limiting
- Apply appropriate limits based on endpoint sensitivity
- Use stricter limits for authentication endpoints
- Consider user-based limits (in addition to IP)
- Monitor for abuse patterns

### 4. CSRF Protection
- Require CSRF tokens for all state-changing operations
- Use SameSite cookies
- Validate tokens on server side
- Rotate tokens periodically

### 5. Content Security Policy
- Regularly review and tighten CSP directives
- Consider migrating to nonce-based CSP
- Test CSP in report-only mode first
- Monitor CSP violations

## Testing Security

### 1. Rate Limiting
```bash
# Test rate limit (should get 429 after limit)
for i in {1..40}; do
  curl http://localhost:9002/api/protected
done
```

### 2. CSRF Protection
```bash
# Should fail without CSRF token
curl -X POST http://localhost:9002/api/protected \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Should succeed with valid token
curl -X POST http://localhost:9002/api/protected \
  -H "x-csrf-token: <token>" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### 3. Security Headers
```bash
# Check security headers
curl -I http://localhost:9002

# Should see:
# Content-Security-Policy: ...
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# etc.
```

### 4. Input Sanitization
```typescript
// Test XSS prevention
const malicious = '<script>alert("XSS")</script>';
const safe = sanitizeString(malicious); // Returns escaped string
```

### 5. Authentication
```bash
# Should return 401 without auth token
curl http://localhost:9002/api/protected

# Should succeed with valid Firebase token
curl http://localhost:9002/api/protected \
  -H "Authorization: Bearer <firebase-id-token>"
```

## Environment Variables

Add to `.env.local`:

```bash
# Firebase Admin SDK (for API authentication)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# Or use individual variables
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY=your-private-key
```

## Production Considerations

### 1. Rate Limiting
- **Replace in-memory storage with Redis**:
  ```typescript
  // Use Redis for distributed rate limiting
  import Redis from 'ioredis';
  const redis = new Redis(process.env.REDIS_URL);
  ```

### 2. CSRF Tokens
- Current implementation is suitable for production
- Consider shorter expiration times (6 hours)
- Implement token rotation on sensitive operations

### 3. Content Security Policy
- **Migrate to nonce-based CSP**:
  ```typescript
  // Generate nonce per request
  const nonce = crypto.randomBytes(16).toString('base64');
  headers.set('Content-Security-Policy', 
    `script-src 'nonce-${nonce}' 'strict-dynamic'`
  );
  ```

### 4. Logging & Monitoring
- Log all authentication failures
- Monitor rate limit violations
- Track CSRF validation failures
- Set up alerts for suspicious patterns

### 5. HTTPS
- Enforce HTTPS in production
- Enable HSTS header
- Redirect HTTP to HTTPS
- Use secure cookies

## Files Created

1. **`src/lib/security/csrf.ts`** (168 lines)
   - CSRF token generation and validation
   
2. **`src/lib/security/rate-limit.ts`** (241 lines)
   - Rate limiting utilities and presets
   
3. **`src/lib/security/sanitize.ts`** (311 lines)
   - Input sanitization functions
   
4. **`src/lib/security/api-auth.ts`** (175 lines)
   - API authentication and authorization
   
5. **`src/lib/security/index.ts`** (46 lines)
   - Barrel export for all security utilities
   
6. **`src/middleware.ts`** (71 lines)
   - Security headers middleware
   
7. **`src/app/api/csrf-token/route.ts`** (24 lines)
   - CSRF token endpoint
   
8. **`src/app/api/examples/protected-route/route.ts`** (105 lines)
   - Example protected API route

## Migration Guide

### Updating Existing API Routes

**Before**:
```typescript
export async function POST(request: Request) {
  const body = await request.json();
  // Process...
}
```

**After**:
```typescript
import { requireRole, ROLE_GROUPS, sanitizeObject } from '@/lib/security';

export async function POST(request: Request) {
  // Add authentication
  const auth = await requireRole(request, ROLE_GROUPS.ALL);
  if (!auth.authorized) return auth.response;
  
  // Add sanitization
  const body = await request.json();
  const safe = sanitizeObject(body, { escapeHtml: true });
  
  // Process...
}
```

## Common Issues & Solutions

### Issue: CSP Blocking Resources
**Solution**: Update CSP directives in `src/middleware.ts`:
```typescript
"img-src 'self' data: https://your-domain.com",
"connect-src 'self' https://your-api.com",
```

### Issue: Rate Limit Too Strict
**Solution**: Adjust limits in `RATE_LIMITS` or use custom config:
```typescript
checkRateLimit(ip, { maxRequests: 200, windowSeconds: 60 });
```

### Issue: CSRF Token Expired
**Solution**: Client should fetch new token from `/api/csrf-token`

### Issue: Firebase Admin Init Error
**Solution**: Ensure `FIREBASE_SERVICE_ACCOUNT_KEY` is set correctly

## Next Steps (Update #7C-E)

### Update #7C: Accessibility
- ARIA labels and landmarks
- Keyboard navigation improvements
- Screen reader support
- Focus management
- Color contrast compliance

### Update #7D: Data Export/Import
- CSV export functionality
- PDF report generation
- Excel import support
- Batch data operations
- Data validation on import

### Update #7E: Real-time Features
- WebSocket connections
- Live notifications
- Real-time inventory updates
- Collaborative editing
- Presence indicators

## Status: ✅ COMPLETE

All security hardening components have been successfully implemented:
1. ✅ CSRF Protection (tokens, validation, endpoint)
2. ✅ Rate Limiting (IP-based, configurable, presets)
3. ✅ Input Sanitization (comprehensive sanitizers)
4. ✅ Security Headers (CSP, HSTS, XSS protection)
5. ✅ API Authentication (Firebase Admin, role-based)

**Ready to proceed to Update #7C: Accessibility**
