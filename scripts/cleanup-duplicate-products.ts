// scripts/cleanup-duplicate-products.ts
/**
 * Clean up duplicate products in Firestore
 * 
 * This script will:
 * 1. Fetch all products from Firestore
 * 2. Group them by SKU (or ID)
 * 3. Keep only one of each, delete duplicates
 * 
 * Usage: npx ts-node scripts/cleanup-duplicate-products.ts
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Parse service account from environment variable
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) 
  : require('../serviceAccountKey.json');

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

interface Product {
  id: string;
  sku?: string;
  name?: string;
  [key: string]: any;
}

async function cleanupDuplicates() {
  console.log('🔍 Fetching all products from Firestore...\n');

  try {
    const productsSnapshot = await db.collection('products').get();
    const products: Product[] = [];

    productsSnapshot.forEach(doc => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`Found ${products.length} total products\n`);

    // Group products by SKU
    const productsBySku = new Map<string, Product[]>();

    products.forEach(product => {
      const key = product.sku || product.id;
      if (!productsBySku.has(key)) {
        productsBySku.set(key, []);
      }
      productsBySku.get(key)!.push(product);
    });

    // Find duplicates
    const duplicates: { sku: string; products: Product[] }[] = [];
    productsBySku.forEach((prods, sku) => {
      if (prods.length > 1) {
        duplicates.push({ sku, products: prods });
      }
    });

    if (duplicates.length === 0) {
      console.log('✅ No duplicates found!');
      return;
    }

    console.log(`Found ${duplicates.length} SKUs with duplicates:\n`);

    let totalToDelete = 0;
    duplicates.forEach(({ sku, products }) => {
      console.log(`  ${sku}: ${products.length} copies`);
      totalToDelete += products.length - 1;
    });

    console.log(`\n⚠️  This will delete ${totalToDelete} duplicate products, keeping 1 of each.\n`);
    console.log('Starting cleanup in 3 seconds...\n');

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Delete duplicates (keep the first one)
    const batch = db.batch();
    let deleteCount = 0;

    duplicates.forEach(({ sku, products }) => {
      // Sort by ID and keep the first one (usually the original)
      const sorted = products.sort((a, b) => a.id.localeCompare(b.id));
      const toKeep = sorted[0];
      const toDelete = sorted.slice(1);

      console.log(`  Keeping: ${toKeep.id} (${toKeep.name || 'N/A'})`);

      toDelete.forEach(product => {
        console.log(`    Deleting: ${product.id}`);
        batch.delete(db.collection('products').doc(product.id));
        deleteCount++;
      });
    });

    console.log(`\n🗑️  Deleting ${deleteCount} duplicate products...`);
    await batch.commit();

    console.log('\n✅ Cleanup complete!');
    console.log(`   Products before: ${products.length}`);
    console.log(`   Products after: ${products.length - deleteCount}`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Run the cleanup
cleanupDuplicates()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });
