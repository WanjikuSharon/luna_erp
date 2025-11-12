// src/services/user_service.ts
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  Firestore 
} from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import type { User } from '@/lib/types';
import { createLogger } from '@/lib/logger';

const logger = createLogger('UserService');

export const USERS_COLLECTION = 'users';

/**
 * Syncs a Firebase Auth user to the Firestore users collection.
 * Creates a new user document if it doesn't exist, or updates lastLogin if it does.
 */
export async function syncUserToFirestore(
  firestore: Firestore, 
  authUser: FirebaseUser
): Promise<void> {
  const userRef = doc(firestore, USERS_COLLECTION, authUser.uid);
  
  try {
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      // User exists, just update lastLogin
      // Only include fields that are not undefined
      const updateData: any = {
        lastLogin: serverTimestamp(),
      };
      
      // Only update email if it exists
      if (authUser.email) {
        updateData.email = authUser.email;
      }
      
      // Only update displayName if it exists and is different
      if (authUser.displayName) {
        updateData.displayName = authUser.displayName;
      }
      
      // Only update photoURL if it exists
      if (authUser.photoURL) {
        updateData.photoURL = authUser.photoURL;
      }
      
      await updateDoc(userRef, updateData);
      logger.debug(`User ${authUser.uid} login updated`);
    } else {
      // New user, create the document
      const newUser: Omit<User, 'uid'> = {
        email: authUser.email || '',
        displayName: authUser.displayName || authUser.email?.split('@')[0] || 'User',
        role: 'operations', // Default role - should be updated by admin
        department: '',
        photoURL: authUser.photoURL || '',
        phoneNumber: authUser.phoneNumber || '',
        isActive: true,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        notificationSettings: {
          receiveEmails: true,
          reportFrequency: 'daily',
        },
      };
      
      await setDoc(userRef, newUser);
      logger.info(`New user ${authUser.uid} created in Firestore`);
    }
  } catch (error) {
    logger.error('Error syncing user to Firestore:', error);
    throw error;
  }
}

/**
 * Gets a user's role from Firestore.
 * Returns null if the user doesn't exist.
 */
export async function getUserRole(
  firestore: Firestore, 
  uid: string
): Promise<User['role'] | null> {
  try {
    const userRef = doc(firestore, USERS_COLLECTION, uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data().role as User['role'];
    }
    
    return null;
  } catch (error) {
    logger.error('Error fetching user role:', error);
    return null;
  }
}

/**
 * Gets full user data from Firestore.
 * Returns null if the user doesn't exist.
 */
export async function getUserData(
  firestore: Firestore, 
  uid: string
): Promise<User | null> {
  try {
    const userRef = doc(firestore, USERS_COLLECTION, uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { uid, ...userSnap.data() } as User;
    }
    
    return null;
  } catch (error) {
    logger.error('Error fetching user data:', error);
    return null;
  }
}

/**
 * Updates a user's role (admin only operation).
 */
export async function updateUserRole(
  firestore: Firestore, 
  uid: string, 
  newRole: User['role']
): Promise<void> {
  try {
    const userRef = doc(firestore, USERS_COLLECTION, uid);
    await updateDoc(userRef, { role: newRole });
    logger.info(`User ${uid} role updated to ${newRole}`);
  } catch (error) {
    logger.error('Error updating user role:', error);
    throw error;
  }
}

/**
 * Deactivates a user account (admin only operation).
 */
export async function deactivateUser(
  firestore: Firestore, 
  uid: string
): Promise<void> {
  try {
    const userRef = doc(firestore, USERS_COLLECTION, uid);
    await updateDoc(userRef, { isActive: false });
    logger.info(`User ${uid} deactivated`);
  } catch (error) {
    logger.error('Error deactivating user:', error);
    throw error;
  }
}

/**
 * Gets a user's display name for showing in UI.
 * Falls back to email or "Unknown User" if not found.
 */
export async function getUserDisplayName(
  firestore: Firestore, 
  uid: string
): Promise<string> {
  try {
    const userData = await getUserData(firestore, uid);
    return userData?.displayName || userData?.email || 'Unknown User';
  } catch (error) {
    logger.error('Error fetching user display name:', error);
    return 'Unknown User';
  }
}
