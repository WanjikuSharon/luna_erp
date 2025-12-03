// src/app/api/etims/submit-invoice/route.ts
/**
 * API Route: Submit Invoice to KRA eTIMS
 * 
 * This endpoint receives sales data from the frontend and submits it to KRA eTIMS.
 * It then updates the sales ledger entry with the eTIMS invoice information.
 */

import { NextRequest, NextResponse } from 'next/server';
import { submitInvoice, type EtimsInvoiceRequest } from '@/services/etims_service';
import { createLogger } from '@/lib/logger';
import { getFirestore } from 'firebase-admin/firestore';
import { initAdmin } from '@/lib/firebase-admin';

const logger = createLogger('api-etims-submit');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      salesLedgerEntryId,
      customer,
      items,
      paymentMode,
      receiptType,
    } = body;

    // Validate required fields
    if (!salesLedgerEntryId) {
      return NextResponse.json(
        { error: 'Sales ledger entry ID is required' },
        { status: 400 }
      );
    }

    if (!customer || !customer.name) {
      return NextResponse.json(
        { error: 'Customer name is required' },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'At least one item is required' },
        { status: 400 }
      );
    }

    logger.info(`Submitting invoice to eTIMS for sales entry: ${salesLedgerEntryId}`);

    // Submit to eTIMS
    const etimsRequest: EtimsInvoiceRequest = {
      customer,
      items,
      paymentMode: paymentMode || 'CASH',
      receiptType: receiptType || 'SALE',
      invoiceNumber: salesLedgerEntryId, // Use the sales entry ID as internal invoice number
    };

    const etimsResponse = await submitInvoice(etimsRequest);

    if (!etimsResponse.success) {
      logger.error('eTIMS submission failed:', etimsResponse.error);
      
      // Update the sales entry with error status
      const adminApp = initAdmin();
      if (!adminApp) {
        logger.error('Firebase Admin not initialized');
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        );
      }
      const db = getFirestore(adminApp);
      
      await db.collection('daily_sales_ledger').doc(salesLedgerEntryId).update({
        etimsStatus: 'failed',
        etimsError: etimsResponse.error || 'Unknown error',
      });

      return NextResponse.json(
        { 
          error: 'Failed to submit to eTIMS',
          details: etimsResponse.error,
        },
        { status: 500 }
      );
    }

    // Update the sales entry with eTIMS information
    const adminApp = initAdmin();
    if (!adminApp) {
      logger.error('Firebase Admin not initialized');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    const db = getFirestore(adminApp);
    
    await db.collection('daily_sales_ledger').doc(salesLedgerEntryId).update({
      etimsInvoiceNumber: etimsResponse.invoiceNumber,
      etimsQrCode: etimsResponse.qrCodeData,
      etimsScuReceiptNumber: etimsResponse.scuReceiptNumber,
      etimsSubmittedAt: new Date(),
      etimsVerificationUrl: etimsResponse.verificationUrl,
      etimsStatus: 'submitted',
      etimsError: null,
    });

    logger.info(`Successfully submitted to eTIMS. Invoice: ${etimsResponse.invoiceNumber}`);

    return NextResponse.json({
      success: true,
      invoiceNumber: etimsResponse.invoiceNumber,
      qrCode: etimsResponse.qrCodeData,
      scuReceiptNumber: etimsResponse.scuReceiptNumber,
      verificationUrl: etimsResponse.verificationUrl,
    });

  } catch (error: any) {
    logger.error('Error in eTIMS submission endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
