// src/services/activity_logger.ts
import { collection, addDoc, serverTimestamp, Firestore } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';

export interface ActivityLogParams {
  action: string;
  module: 'sales' | 'operations' | 'production' | 'admin';
  userId?: string;
  userName?: string;
  userAvatar?: string;
  details?: string;
  metadata?: Record<string, any>;
}

/**
 * Centralized activity logging service.
 * Logs user actions across different modules for audit trail.
 */
export async function logActivity(
  firestore: Firestore,
  params: ActivityLogParams
): Promise<void> {
  try {
    const collectionName = `${params.module}_activities`;
    
    await addDoc(collection(firestore, collectionName), {
      action: params.action,
      user: {
        name: params.userName || 'Unknown User',
        avatarUrl: params.userAvatar || '',
        uid: params.userId || '',
      },
      details: params.details || '',
      metadata: params.metadata || {},
      timestamp: serverTimestamp(),
    });
    
    console.log(`Activity logged: ${params.action} in ${params.module}`);
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - logging failures shouldn't break the main flow
  }
}

/**
 * Helper to log activity with Firebase Auth user.
 */
export async function logActivityWithUser(
  firestore: Firestore,
  authUser: FirebaseUser | null,
  action: string,
  module: ActivityLogParams['module'],
  details?: string,
  metadata?: Record<string, any>
): Promise<void> {
  if (!authUser) {
    console.warn('Cannot log activity: No authenticated user');
    return;
  }

  await logActivity(firestore, {
    action,
    module,
    userId: authUser.uid,
    userName: authUser.displayName || authUser.email || 'Unknown User',
    userAvatar: authUser.photoURL || '',
    details,
    metadata,
  });
}

/**
 * Log sales activity.
 */
export async function logSalesActivity(
  firestore: Firestore,
  authUser: FirebaseUser | null,
  action: string,
  details?: string
): Promise<void> {
  await logActivityWithUser(firestore, authUser, action, 'sales', details);
}

/**
 * Log operations activity.
 */
export async function logOperationsActivity(
  firestore: Firestore,
  authUser: FirebaseUser | null,
  action: string,
  details?: string
): Promise<void> {
  await logActivityWithUser(firestore, authUser, action, 'operations', details);
}

/**
 * Log production activity.
 */
export async function logProductionActivity(
  firestore: Firestore,
  authUser: FirebaseUser | null,
  action: string,
  details?: string
): Promise<void> {
  await logActivityWithUser(firestore, authUser, action, 'production', details);
}

/**
 * Log admin activity.
 */
export async function logAdminActivity(
  firestore: Firestore,
  authUser: FirebaseUser | null,
  action: string,
  details?: string
): Promise<void> {
  await logActivityWithUser(firestore, authUser, action, 'admin', details);
}
