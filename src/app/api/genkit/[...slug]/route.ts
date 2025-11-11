// src/app/api/genkit/[...slug]/route.ts

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { startFlowsServer } from '@genkit-ai/flow';
import type { NextRequest } from 'next/server';

// Import all your flows
import '@/ai/flows/explain-inventory-discrepancy';
import '@/ai/flows/suggest-inventory-update';
import '@/ai/flows/notify-admins';
import '@/ai/flows/send-request-email';
import '@/ai/flows/generate-upload-signature';

// This file is your *production* entry point for flows.
// It configures Genkit just for the hosted server.
genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash',
});

// Export the Next.js handlers
// In Next.js 15, params is now a Promise
export async function GET(req: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  const resolvedParams = await context.params;
  return startFlowsServer()(req, { params: { slug: resolvedParams.slug.join('/') } });
}

export async function POST(req: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  const resolvedParams = await context.params;
  return startFlowsServer()(req, { params: { slug: resolvedParams.slug.join('/') } });
}