// src/services/security_service.ts
import { collection, addDoc, serverTimestamp, Firestore, query, where, orderBy, limit } from 'firebase/firestore';
import { createLogger } from '@/lib/logger';

const logger = createLogger('SecurityService');

export type SecurityEventType = 
  | 'failed_login'
  | 'rate_limit_exceeded'
  | 'unauthorized_access'
  | 'suspicious_activity'
  | 'password_reset'
  | 'account_locked'
  | 'unusual_location'
  | 'multiple_sessions';

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface SecurityEvent {
  id?: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  details: string;
  metadata?: Record<string, any>;
  timestamp: any; // Firestore Timestamp
  resolved?: boolean;
  resolvedBy?: string;
  resolvedAt?: any;
}

export interface LogSecurityEventParams {
  type: SecurityEventType;
  severity: SecuritySeverity;
  userId?: string;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  details: string;
  metadata?: Record<string, any>;
}

/**
 * Log a security event to Firestore
 */
export async function logSecurityEvent(
  firestore: Firestore,
  params: LogSecurityEventParams
): Promise<void> {
  try {
    await addDoc(collection(firestore, 'security_events'), {
      type: params.type,
      severity: params.severity,
      userId: params.userId || null,
      email: params.email || null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
      details: params.details,
      metadata: params.metadata || {},
      timestamp: serverTimestamp(),
      resolved: false,
    });

    logger.info(`Security event logged: ${params.type} (${params.severity})`);
  } catch (error) {
    logger.error('Failed to log security event:', error);
    // Don't throw - security logging failures shouldn't break app flow
  }
}

/**
 * Log a failed login attempt
 */
export async function logFailedLogin(
  firestore: Firestore,
  email: string,
  reason: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logSecurityEvent(firestore, {
    type: 'failed_login',
    severity: 'medium',
    email,
    details: `Failed login attempt: ${reason}`,
    metadata,
  });
}

/**
 * Log rate limit exceeded
 */
export async function logRateLimitExceeded(
  firestore: Firestore,
  identifier: string,
  endpoint: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logSecurityEvent(firestore, {
    type: 'rate_limit_exceeded',
    severity: 'high',
    details: `Rate limit exceeded for ${endpoint} by ${identifier}`,
    metadata,
  });
}

/**
 * Log unauthorized access attempt
 */
export async function logUnauthorizedAccess(
  firestore: Firestore,
  userId: string,
  resource: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logSecurityEvent(firestore, {
    type: 'unauthorized_access',
    severity: 'high',
    userId,
    details: `Unauthorized access attempt to ${resource}`,
    metadata,
  });
}

/**
 * Get security event severity color
 */
export function getSeverityColor(severity: SecuritySeverity): string {
  switch (severity) {
    case 'critical':
      return 'text-red-600';
    case 'high':
      return 'text-orange-600';
    case 'medium':
      return 'text-yellow-600';
    case 'low':
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
}

/**
 * Get security event severity badge variant
 */
export function getSeverityVariant(severity: SecuritySeverity): 'default' | 'destructive' | 'outline' | 'secondary' {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'destructive';
    case 'medium':
      return 'outline';
    case 'low':
      return 'secondary';
    default:
      return 'default';
  }
}

/**
 * Get human-readable event type label
 */
export function getEventTypeLabel(type: SecurityEventType): string {
  const labels: Record<SecurityEventType, string> = {
    failed_login: 'Failed Login',
    rate_limit_exceeded: 'Rate Limit Exceeded',
    unauthorized_access: 'Unauthorized Access',
    suspicious_activity: 'Suspicious Activity',
    password_reset: 'Password Reset',
    account_locked: 'Account Locked',
    unusual_location: 'Unusual Location',
    multiple_sessions: 'Multiple Sessions',
  };
  return labels[type] || type;
}
