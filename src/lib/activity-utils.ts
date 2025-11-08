// src/lib/activity-utils.ts
import { collection, query, orderBy, Firestore } from 'firebase/firestore';
import type { Query } from 'firebase/firestore';

/**
 * Activity collection names in Firestore
 */
export const ACTIVITY_COLLECTIONS = {
  ADMIN: 'admin_activities',
  OPERATIONS: 'operations_activities',
  PRODUCTION: 'production_activities',
  SALES: 'sales_activities',
} as const;

/**
 * Creates a query for a specific activity collection
 */
export function createActivityQuery(firestore: Firestore, collectionName: string): Query {
  return query(
    collection(firestore, collectionName),
    orderBy('timestamp', 'desc')
  );
}

/**
 * Creates queries for all activity collections
 * Returns an array of queries that can be used with useCollection
 */
export function createAllActivityQueries(firestore: Firestore): Query[] {
  return Object.values(ACTIVITY_COLLECTIONS).map(collectionName =>
    createActivityQuery(firestore, collectionName)
  );
}
