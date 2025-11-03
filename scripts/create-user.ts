/**
 * Script to create a user document in Firestore
 * Run this with: npx tsx scripts/create-user.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin
if (!getApps().length) {
  // You'll need to download your service account key from Firebase Console
  // Go to: Project Settings > Service Accounts > Generate New Private Key
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
const auth = getAuth();

async function createUserDocument() {
  const uid = 'UBtYhUrpgAaXA9NNAqa62weGLAN2'; // Your UID
  
  try {
    // Get the user from Firebase Auth
    const authUser = await auth.getUser(uid);
    console.log('Found auth user:', authUser.email);

    // Create the user document in Firestore
    const userData = {
      id: uid,
      name: 'Mercy Mugati', // Update with actual name
      email: authUser.email || 'mercy.mugati@luna.co.ke',
      role: 'operations_manager', // Change to: 'admin', 'operations_manager', or 'production_personnel'
      avatarUrl: 'https://ui-avatars.com/api/?name=Mercy+Mugati&background=096394&color=fff',
      notificationSettings: {
        receiveEmails: true,
        reportFrequency: 'daily',
      },
    };

    await db.collection('users').doc(uid).set(userData);
    console.log('✅ User document created successfully!');
    console.log('User data:', userData);

  } catch (error) {
    console.error('❌ Error creating user document:', error);
  }
}

createUserDocument();
