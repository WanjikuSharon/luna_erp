// src/app/api/genkit/[...slug]/route.ts

// Force this route to be dynamic (not statically generated)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import type { NextRequest } from 'next/server';

// Lazy import genkit only when needed (not during build)
async function initializeGenkit() {
  // Only initialize on runtime, not during build
  if (typeof window !== 'undefined') return;
  
  try {
    const { genkit } = await import('genkit');
    const { googleAI } = await import('@genkit-ai/google-genai');
    
    // Import flows dynamically
    await import('@/ai/flows/explain-inventory-discrepancy');
    await import('@/ai/flows/suggest-inventory-update');
    await import('@/ai/flows/notify-admins');
    await import('@/ai/flows/send-request-email');
    await import('@/ai/flows/generate-upload-signature');
    
    genkit({
      plugins: [googleAI()],
      model: 'googleai/gemini-2.5-flash',
    });
  } catch (error) {
    console.error('Failed to initialize Genkit:', error);
  }
}

export async function GET(req: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  await initializeGenkit();
  const resolvedParams = await context.params;
  
  return new Response(JSON.stringify({ 
    message: 'Genkit flows endpoint',
    slug: resolvedParams.slug 
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  await initializeGenkit();
  const resolvedParams = await context.params;
  
  return new Response(JSON.stringify({ 
    message: 'Genkit flows endpoint',
    slug: resolvedParams.slug 
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}