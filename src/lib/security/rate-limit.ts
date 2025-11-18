// src/lib/security/rate-limit.ts

/**
 * Rate Limiting Utilities
 * Provides in-memory rate limiting for API routes to prevent abuse.
 * For production, consider using Redis or a database for distributed rate limiting.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limits
// Note: This resets on server restart. Use Redis/DB for production.
const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed
   */
  maxRequests: number;
  
  /**
   * Time window in seconds
   */
  windowSeconds: number;
  
  /**
   * Optional: Custom identifier (defaults to IP address)
   */
  identifier?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check if request is within rate limit
 * 
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param config - Rate limit configuration
 * @returns Result indicating if request is allowed
 * 
 * @example
 * ```typescript
 * const result = checkRateLimit('192.168.1.1', {
 *   maxRequests: 100,
 *   windowSeconds: 60
 * });
 * 
 * if (!result.success) {
 *   return new Response('Too many requests', {
 *     status: 429,
 *     headers: {
 *       'X-RateLimit-Limit': result.limit.toString(),
 *       'X-RateLimit-Remaining': result.remaining.toString(),
 *       'X-RateLimit-Reset': result.reset.toString(),
 *     }
 *   });
 * }
 * ```
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const resetTime = now + windowMs;
  
  // Clean up expired entries periodically
  cleanupExpiredEntries(now);
  
  const entry = rateLimitStore.get(identifier);
  
  if (!entry || now > entry.resetTime) {
    // First request or window has expired
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime,
    });
    
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      reset: Math.floor(resetTime / 1000),
    };
  }
  
  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      reset: Math.floor(entry.resetTime / 1000),
    };
  }
  
  // Increment count
  entry.count++;
  
  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
    reset: Math.floor(entry.resetTime / 1000),
  };
}

/**
 * Get client IP address from request
 * Handles proxies and load balancers
 */
export function getClientIp(request: Request): string {
  // Check common headers set by proxies
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  
  // Fallback to generic identifier
  return 'unknown';
}

/**
 * Clean up expired entries to prevent memory leaks
 */
function cleanupExpiredEntries(now: number): void {
  // Only cleanup every 1000 requests to avoid performance impact
  if (Math.random() > 0.001) return;
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Rate limit presets for common use cases
 */
export const RATE_LIMITS = {
  // Strict limits for authentication endpoints
  AUTH: {
    maxRequests: 5,
    windowSeconds: 60 * 15, // 5 requests per 15 minutes
  },
  
  // Moderate limits for API endpoints
  API: {
    maxRequests: 100,
    windowSeconds: 60, // 100 requests per minute
  },
  
  // Generous limits for read operations
  READ: {
    maxRequests: 300,
    windowSeconds: 60, // 300 requests per minute
  },
  
  // Strict limits for write operations
  WRITE: {
    maxRequests: 30,
    windowSeconds: 60, // 30 requests per minute
  },
  
  // Very strict limits for sensitive operations
  SENSITIVE: {
    maxRequests: 3,
    windowSeconds: 60 * 60, // 3 requests per hour
  },
} as const;

/**
 * Create rate limit response headers
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };
}

/**
 * Rate limit middleware wrapper
 * 
 * @example
 * ```typescript
 * export async function POST(request: Request) {
 *   const rateLimit = checkRateLimit(
 *     getClientIp(request),
 *     RATE_LIMITS.WRITE
 *   );
 *   
 *   if (!rateLimit.success) {
 *     return new Response('Too Many Requests', {
 *       status: 429,
 *       headers: createRateLimitHeaders(rateLimit),
 *     });
 *   }
 *   
 *   // ... rest of handler
 * }
 * ```
 */
