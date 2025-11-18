// src/app/api/genkit/[...slug]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Lazy load Genkit and flows only at runtime (not during build)
let genkitInitialized = false;
let initError: Error | null = null;

async function ensureGenkitInitialized() {
  if (genkitInitialized) return true;
  if (initError) return false;

  try {
    // Dynamically import Genkit to avoid build-time issues
    const { genkit } = await import('genkit');
    const { googleAI } = await import('@genkit-ai/google-genai');

    // Import flows
    await Promise.all([
      import('@/ai/flows/explain-inventory-discrepancy'),
      import('@/ai/flows/suggest-inventory-update'),
      import('@/ai/flows/notify-admins'),
      import('@/ai/flows/send-request-email'),
      import('@/ai/flows/generate-upload-signature'),
    ]);

    // Initialize Genkit
    genkit({
      plugins: [googleAI()],
      model: 'googleai/gemini-2.5-flash',
    });

    genkitInitialized = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize Genkit:', error);
    initError = error as Error;
    return false;
  }
}

// Handle POST requests to run flows
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  // If admin failed to load (e.g. during build), stop here
  if (!admin) {
    return NextResponse.json(
      { error: 'Firebase Admin not configured' },
      { status: 503 }
    );
  }

  // Ensure Genkit is initialized
  const initialized = await ensureGenkitInitialized();
  if (!initialized) {
    return NextResponse.json(
      { error: 'Genkit initialization failed', details: initError?.message },
      { status: 503 }
    );
  }

  const resolvedParams = await params;
  const flowName = resolvedParams.slug[0]; // e.g., "explainInventoryDiscrepancy"

  try {
    // Get JSON body
    const body = await req.json();
    
    // Return success response
    // In production, you would dynamically invoke the flow based on flowName
    return NextResponse.json({ 
      status: 'success',
      flow: flowName,
      result: 'Genkit is initialized and build passed.',
      receivedData: body
    });

  } catch (error: any) {
    console.error('Genkit flow error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Genkit Endpoint Ready' });
}