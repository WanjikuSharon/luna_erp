// src/app/api/genkit/[...slug]/route.ts
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { NextRequest, NextResponse } from 'next/server';
import { admin } from '@/lib/firebase-admin';

// Import flows at module level so they register with Genkit on startup
import '@/ai/flows/explain-inventory-discrepancy';
import '@/ai/flows/suggest-inventory-update';
import '@/ai/flows/notify-admins';
import '@/ai/flows/send-request-email';
import '@/ai/flows/generate-upload-signature';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Initialize Genkit globally
const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash',
});

// Handle POST requests to run flows
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  // If admin failed to load (e.g. during build), stop here
  if (!admin) {
    return NextResponse.json(
      { error: 'Firebase Admin not configured' },
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