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
  console.log(`Starting sync for ${data.length} products...`);

  for (const product of data) {
    try {
      // Check if product exists by SKU
      const snapshot = await db.collection(COLLECTION_NAME)
        .where('sku', '==', product.sku)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        // UPDATE existing product (Update price/name, keep inventory safe)
        const docId = snapshot.docs[0].id;
        await db.collection(COLLECTION_NAME).doc(docId).update({
          name: product.name,
          price: product.price,
          category: product.category,
          packSize: product.packSize
          // NOTE: We do NOT update quantity here to avoid overwriting live stock
        });
        console.log(`  ↻ Updated: ${product.name}`);
      } else {
        // CREATE new product
        await db.collection(COLLECTION_NAME).add(product);
        console.log(`  + Created: ${product.name}`);
      }
    } catch (error) {
      console.error(`  ! FAILED: ${product.name}`, error);
    }
  }
  
  console.log('---------------------');
  console.log('✅ Product sync complete!');
}

importProducts();