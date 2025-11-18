// src/lib/security/index.ts

/**
 * Security Utilities - Barrel Export
 * Centralized exports for all security-related utilities
 */

// CSRF Protection
export {
  generateCsrfToken,
  setCsrfToken,
  getCsrfToken,
  validateCsrfToken,
  CSRF_HEADER,
  CSRF_COOKIE,
} from './csrf';

// Rate Limiting
export {
  checkRateLimit,
  getClientIp,
  createRateLimitHeaders,
  RATE_LIMITS,
  type RateLimitConfig,
  type RateLimitResult,
} from './rate-limit';

// Input Sanitization
export {
  escapeHtml,
  stripHtml,
  sanitizeString,
  sanitizeEmail,
  sanitizeUrl,
  sanitizePhoneNumber,
  sanitizeFileName,
  sanitizeNumber,
  sanitizeObject,
  sanitizeJson,
  sanitizeSqlString,
  SANITIZERS,
} from './sanitize';

// API Authentication
export {
  verifyAuthToken,
  requireAuth,
  requireRole,
  createAuthenticatedResponse,
  createErrorResponse,
  ROLES,
  ROLE_GROUPS,
} from './api-auth';
