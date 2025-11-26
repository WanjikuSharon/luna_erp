'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

// Single source of truth for Firebase instances
let firebaseApp: FirebaseApp | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;
let rtdb: ReturnType<typeof getDatabase> | null = null;

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
    
    // Initialize Firestore with proper settings to prevent internal errors
    try {
      db = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({ 
          tabManager: persistentMultipleTabManager() 
        })
      });
    } catch (error) {
      // If already initialized, just get the instance
      db = getFirestore(firebaseApp);
    }
    
    auth = getAuth(firebaseApp);
    
    // Only initialize Realtime Database if URL is configured
    if (firebaseConfig.databaseURL) {
      rtdb = getDatabase(firebaseApp);
    }
  } else {
    firebaseApp = getApp();
    db = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);
    
    if (firebaseConfig.databaseURL) {
      rtdb = getDatabase(firebaseApp);
    }
  }

  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  const sdks: {
    firebaseApp: FirebaseApp;
    auth: ReturnType<typeof getAuth>;
    firestore: ReturnType<typeof getFirestore>;
    database?: ReturnType<typeof getDatabase>;
  } = {
    firebaseApp,
    auth: auth || getAuth(firebaseApp),
    firestore: db || getFirestore(firebaseApp),
  };
  
  // Only initialize Realtime Database if URL is configured
  if (firebaseConfig.databaseURL) {
    sdks.database = rtdb || getDatabase(firebaseApp);
  }
  
  return sdks;
}

// Export for backward compatibility (but don't initialize here)
export { auth, db as firestore, db, rtdb };

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
