// src/lib/error-handler.ts
import { FirebaseError } from 'firebase/app';
import { createLogger } from './logger';

const logger = createLogger('error-handler');

/**
 * Maps Firebase error codes to user-friendly messages
 */
const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  // Auth errors
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/user-not-found': 'No account found with this email address.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password is too weak. Please use a stronger password.',
  'auth/requires-recent-login': 'This action requires recent authentication. Please log in again.',
  'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Please check your connection and try again.',
  
  // Firestore errors
  'permission-denied': "You don't have permission to perform this action. Please contact your administrator.",
  'not-found': 'The requested resource was not found.',
  'already-exists': 'This item already exists.',
  'resource-exhausted': 'Too many requests. Please try again later.',
  'failed-precondition': 'Unable to complete this operation. Please check the prerequisites.',
  'aborted': 'The operation was aborted. Please try again.',
  'out-of-range': 'The value is out of the acceptable range.',
  'unimplemented': 'This feature is not yet implemented.',
  'internal': 'An internal error occurred. Please try again.',
  'unavailable': 'The service is currently unavailable. Please try again later.',
  'data-loss': 'Data loss detected. Please contact support immediately.',
  'unauthenticated': 'You must be logged in to perform this action.',
  
  // Storage errors
  'storage/unauthorized': "You don't have permission to upload files.",
  'storage/canceled': 'Upload was canceled.',
  'storage/unknown': 'An unknown error occurred during upload.',
  'storage/object-not-found': 'File not found.',
  'storage/bucket-not-found': 'Storage bucket not found.',
  'storage/project-not-found': 'Project configuration error.',
  'storage/quota-exceeded': 'Storage quota exceeded.',
  'storage/unauthenticated': 'You must be logged in to upload files.',
  'storage/retry-limit-exceeded': 'Upload failed after multiple retries.',
  'storage/invalid-checksum': 'File upload failed due to checksum mismatch.',
  'storage/canceled': 'Upload was canceled.',
  'storage/invalid-event-name': 'Invalid upload event.',
  'storage/invalid-url': 'Invalid file URL.',
  'storage/invalid-argument': 'Invalid upload parameters.',
  'storage/no-default-bucket': 'No storage bucket configured.',
  'storage/cannot-slice-blob': 'Failed to process the file.',
  'storage/server-file-wrong-size': 'File size mismatch.',
};

/**
 * Error type enumeration for categorizing errors
 */
export enum ErrorType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NETWORK = 'network',
  NOT_FOUND = 'not_found',
  SERVER = 'server',
  UNKNOWN = 'unknown',
}

/**
 * Structured error object with user-friendly message and metadata
 */
export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: Error;
  code?: string;
  retryable: boolean;
  timestamp: Date;
}

/**
 * Determines if an error is retryable based on its type
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof FirebaseError) {
    const retryableCodes = [
      'unavailable',
      'resource-exhausted',
      'aborted',
      'network-request-failed',
      'storage/retry-limit-exceeded',
      'storage/unknown',
    ];
    return retryableCodes.includes(error.code);
  }
  
  if (error instanceof Error) {
    // Network errors are typically retryable
    return error.message.toLowerCase().includes('network') ||
           error.message.toLowerCase().includes('timeout') ||
           error.message.toLowerCase().includes('fetch');
  }
  
  return false;
}

/**
 * Categorizes error type based on error code
 */
function categorizeError(error: unknown): ErrorType {
  if (error instanceof FirebaseError) {
    if (error.code.startsWith('auth/')) {
      if (error.code === 'auth/unauthenticated') return ErrorType.AUTHENTICATION;
      if (error.code === 'auth/requires-recent-login') return ErrorType.AUTHENTICATION;
      return ErrorType.AUTHENTICATION;
    }
    
    if (error.code === 'permission-denied' || error.code === 'storage/unauthorized') {
      return ErrorType.AUTHORIZATION;
    }
    
    if (error.code === 'not-found' || error.code === 'storage/object-not-found') {
      return ErrorType.NOT_FOUND;
    }
    
    if (error.code.includes('network') || error.code === 'unavailable') {
      return ErrorType.NETWORK;
    }
    
    if (error.code.includes('invalid') || error.code === 'out-of-range') {
      return ErrorType.VALIDATION;
    }
    
    return ErrorType.SERVER;
  }
  
  return ErrorType.UNKNOWN;
}

/**
 * Transforms any error into a structured AppError with user-friendly message
 */
export function handleError(error: unknown, context?: string): AppError {
  logger.error(`Error in ${context || 'unknown context'}:`, error);
  
  let message = 'An unexpected error occurred. Please try again.';
  let code: string | undefined;
  
  // Handle Firebase errors
  if (error instanceof FirebaseError) {
    code = error.code;
    message = FIREBASE_ERROR_MESSAGES[error.code] || error.message;
  }
  // Handle standard Error objects
  else if (error instanceof Error) {
    message = error.message;
  }
  // Handle string errors
  else if (typeof error === 'string') {
    message = error;
  }
  
  const appError: AppError = {
    type: categorizeError(error),
    message,
    originalError: error instanceof Error ? error : undefined,
    code,
    retryable: isRetryableError(error),
    timestamp: new Date(),
  };
  
  return appError;
}

/**
 * Gets a user-friendly error message from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    return FIREBASE_ERROR_MESSAGES[error.code] || error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Checks if an error is a Firebase authentication error
 */
export function isAuthError(error: unknown): boolean {
  return error instanceof FirebaseError && error.code.startsWith('auth/');
}

/**
 * Checks if an error is a permission error
 */
export function isPermissionError(error: unknown): boolean {
  return error instanceof FirebaseError && 
    (error.code === 'permission-denied' || error.code === 'storage/unauthorized');
}

/**
 * Checks if an error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof FirebaseError) {
    return error.code === 'unavailable' || 
           error.code === 'network-request-failed' ||
           error.code.includes('network');
  }
  
  if (error instanceof Error) {
    return error.message.toLowerCase().includes('network') ||
           error.message.toLowerCase().includes('fetch') ||
           error.message.toLowerCase().includes('timeout');
  }
  
  return false;
}

/**
 * Retry helper function with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Only retry if error is retryable
      if (!isRetryableError(error)) {
        throw error;
      }
      
      // Don't wait after the last attempt
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        logger.debug(`Retry attempt ${attempt + 1} failed. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}
