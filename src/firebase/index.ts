'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

// Initialize Firebase app and export instances
let firebaseApp: FirebaseApp | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;
let rtdb: ReturnType<typeof getDatabase> | null = null;

if (typeof window !== 'undefined') {
  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp();
  }
  
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
  
  // Only initialize Realtime Database if URL is configured
  if (firebaseConfig.databaseURL) {
    rtdb = getDatabase(firebaseApp);
  }
}

export { auth, db, rtdb };

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    const firebaseApp = initializeApp(firebaseConfig);
    return getSdks(firebaseApp);
  }

  // If already initialized, return the SDKs with the already initialized App
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  const sdks: {
    firebaseApp: FirebaseApp;
    auth: ReturnType<typeof getAuth>;
    firestore: ReturnType<typeof getFirestore>;
    database?: ReturnType<typeof getDatabase>;
  } = {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
  };
  
  // Only initialize Realtime Database if URL is configured
  if (firebaseConfig.databaseURL) {
    sdks.database = getDatabase(firebaseApp);
  }
  
  return sdks;
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
