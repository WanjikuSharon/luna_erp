'use client';
    
import { useState, useEffect } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useDoc hook.
 * @template T Type of the document data.
 */
export interface UseDocResult<T> {
  data: WithId<T> | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/**
 * React hook to subscribe to a single Firestore document in real-time.
 * Handles nullable references.
 * 
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {DocumentReference<DocumentData> | null | undefined} docRef -
 * The Firestore DocumentReference. Waits if null/undefined.
 * @returns {UseDocResult<T>} Object with data, isLoading, error.
 */
export function useDoc<T = any>(
  memoizedDocRef: DocumentReference<DocumentData> | null | undefined,
): UseDocResult<T> {
  type StateDataType = WithId<T> | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    if (!memoizedDocRef) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    // Optional: setData(null); // Clear previous data instantly

    let unsubscribe: (() => void) | null = null;
    let isSubscribed = true;

    try {
      unsubscribe = onSnapshot(
        memoizedDocRef,
        (snapshot: DocumentSnapshot<DocumentData>) => {
          if (!isSubscribed) return;
          
          if (snapshot.exists()) {
            const newData = { ...(snapshot.data() as T), id: snapshot.id };
            
            // Only update state if data actually changed
            setData(prevData => {
              // If no previous data, always update
              if (!prevData) return newData;
              
              // Deep comparison - check if document changed
              if (JSON.stringify(prevData) !== JSON.stringify(newData)) {
                return newData;
              }
              
              // No changes, return previous data to prevent re-render
              return prevData;
            });
          } else {
            // Document does not exist
            setData(null);
          }
          setError(null); // Clear any previous error on successful snapshot (even if doc doesn't exist)
          setIsLoading(false);
        },
        (error: FirestoreError) => {
          if (!isSubscribed) return;
          
          const contextualError = new FirestorePermissionError({
            operation: 'get',
            path: memoizedDocRef.path,
          })

          setError(contextualError)
          setData(null)
          setIsLoading(false)

          // trigger global error propagation
          errorEmitter.emit('permission-error', contextualError);
        }
      );
    } catch (error) {
      // Handle initialization errors (e.g., Firestore internal state errors)
      console.error('useDoc: Failed to create snapshot listener:', error);
      setError(error as Error);
      setData(null);
      setIsLoading(false);
    }

    return () => {
      isSubscribed = false;
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (error) {
          // Silently handle cleanup errors
          console.warn('useDoc: Error during cleanup:', error);
        }
      }
    };
  }, [memoizedDocRef]); // Re-run if the memoizedDocRef changes.

  return { data, isLoading, error };
}
