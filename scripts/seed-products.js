// scripts/seed-products.js

// This script will upload all products from products.json to your Firestore 'products' collection.

const admin = require('firebase-admin');
const fs = require('fs');

// --- CONFIGURATION ---
// 1. Your Project ID (from your firebase/config.ts)
const PROJECT_ID = 'studio-8179379207-d2380'; 
// 2. Path to your service account key
const serviceAccount = require('../serviceAccountKey.json');
// 3. Path to your data
const data = require('../products.json');
// 4. Name of the collection to import to
const COLLECTION_NAME = 'products';
// ---------------------

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: PROJECT_ID,
});

const db = admin.firestore();

async function importProducts() {
  console.log(`Starting import for ${data.length} products into '${COLLECTION_NAME}' collection...`);

  // A batch write can only do 500 operations.
  // We'll do them one by one, which is safer for a small list.
  for (const product of data) {
    try {
      // Using .add() will create a new document with an auto-generated ID
      // and add all the fields from your JSON object.
      await db.collection(COLLECTION_NAME).add(product);
      console.log(`  > Added: ${product.name}`);
    } catch (error) {
      console.error(`  ! FAILED to add: ${product.name}`, error);
    }
  }
  
  console.log('---------------------');
  console.log('✅ Product import complete!');
}

importProducts();