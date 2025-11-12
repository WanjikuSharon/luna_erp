// src/ai/flows/generate-upload-signature.ts
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { v2 as cloudinary } from 'cloudinary'; // Import the SDK
import { createModuleLogger } from '@/lib/logger';

const logger = createModuleLogger('ai-generate-upload-signature');

// Get Cloudinary credentials from .env.local
// Ensure these are in your .env.local file!
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  logger.error("Cloudinary credentials are not set in .env.local");
  // In a real app, you might throw an error, but we'll let it fail at runtime
  // if the flow is called without keys.
}

// Configure the Cloudinary SDK
cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
  secure: true,
});

export const generateUploadSignature = ai.defineFlow(
  {
    name: 'generateUploadSignature',
    inputSchema: z.object({}), // No input needed
    outputSchema: z.object({
      signature: z.string(),
      timestamp: z.number(),
      api_key: z.string(),
      cloud_name: z.string(),
    }),
  },
  async () => {
    // This timestamp proves the signature is new
    const timestamp = Math.round(new Date().getTime() / 1000);

    // This is the function your senior dev mentioned
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp: timestamp,
        // You can add other parameters here if you want to be stricter
        // e.g., folder: 'delivery_notes'
      },
      API_SECRET! // Use the secret key
    );

    return {
      signature,
      timestamp,
      api_key: API_KEY!,
      cloud_name: CLOUD_NAME!,
    };
  }
);