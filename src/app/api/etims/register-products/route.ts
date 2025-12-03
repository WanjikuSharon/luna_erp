// src/app/api/etims/register-products/route.ts
/**
 * API Route: Register Products with KRA eTIMS
 * 
 * This endpoint registers products from the ERP with eTIMS.
 * This should be done once for each product before they can be invoiced.
 */

import { NextRequest, NextResponse } from 'next/server';
import { registerProducts, type EtimsProductRegistration } from '@/services/etims_service';
import { createLogger } from '@/lib/logger';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdmin } from '@/lib/firebase-admin';

const logger = createLogger('api-etims-register');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { products } = body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: 'Products array is required' },
        { status: 400 }
      );
    }

    logger.info(`Registering ${products.length} products with eTIMS`);

    // Transform products to eTIMS format
    const etimsProducts: EtimsProductRegistration[] = products.map((p: any) => ({
      itemCode: p.sku || p.id,
      itemName: p.name,
      barcode: p.barcode || p.sku || p.id,
      taxType: 'A', // VAT Standard (16%) - adjust as needed
      unitPrice: p.unitPrice || 0,
      packagingUnit: 'PC', // Piece - adjust as needed
    }));

    const result = await registerProducts(etimsProducts);

    logger.info(`Registration complete. Success: ${result.succeeded.length}, Failed: ${result.failed.length}`);

    // Update products in Firestore with eTIMS registration status
    const adminApp = initAdmin();
    if (!adminApp) {
      logger.error('Firebase Admin not initialized');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    const db = getFirestore(adminApp);
    const batch = db.batch();

    for (const itemCode of result.succeeded) {
      const productRef = db.collection('products').doc(itemCode);
      batch.update(productRef, {
        etimsRegistered: true,
        etimsRegisteredAt: new Date(),
      });
    }

    for (const failed of result.failed) {
      const productRef = db.collection('products').doc(failed.itemCode);
      batch.update(productRef, {
        etimsRegistered: false,
        etimsRegistrationError: failed.error,
      });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      succeeded: result.succeeded,
      failed: result.failed,
      total: products.length,
    });

  } catch (error: any) {
    logger.error('Error in eTIMS registration endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check registration status of products
 */
export async function GET(request: NextRequest) {
  try {
    const adminApp = initAdmin();
    if (!adminApp) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    const db = getFirestore(adminApp);
    
    const productsSnapshot = await db.collection('products').get();
    
    const registered = productsSnapshot.docs.filter(doc => 
      doc.data().etimsRegistered === true
    ).length;
    
    const notRegistered = productsSnapshot.docs.filter(doc => 
      doc.data().etimsRegistered !== true
    ).length;

    return NextResponse.json({
      total: productsSnapshot.size,
      registered,
      notRegistered,
    });

  } catch (error: any) {
    logger.error('Error checking product registration status:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
