// src/lib/firebase-admin.ts
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
// - IGNORE -
/**
 * Safe Firebase Admin SDK initialization
 * Prevents build crashes when credentials are missing
 */

// Parse service account from environment variable
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) 
  : undefined;

/**
 * Initialize Firebase Admin SDK
 * Returns null if credentials are missing (e.g., during build)
 */
export function initAdmin(): App | null {
  // Return existing app if already initialized
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Check if we have valid credentials
  if (!serviceAccount || !serviceAccount.project_id) {
    console.warn('⚠️ Firebase Admin credentials missing. Skipping initialization during build.');
    return null;
  }

  try {
    return initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    return null;
  }
}

// Initialize the admin app
export const admin = initAdmin();

/**
 * Get Firebase Admin Auth instance
 * Returns null if admin is not initialized
 */
export function getAdminAuth() {
  if (!admin) {
    return null;
  }
  return getAuth(admin);
}
