// src/ai/flows/generate-upload-signature.ts
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { v2 as cloudinary } from 'cloudinary'; // Import the SDK
import { createLogger } from '@/lib/logger';
import { env } from '@/lib/env';

const logger = createLogger('ai-generate-upload-signature');

// Configure the Cloudinary SDK with validated environment variables
cloudinary.config({
  cloud_name: env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
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
      env.CLOUDINARY_API_SECRET // Use the secret key
    );

    return {
      signature,
      timestamp,
      api_key: env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
      cloud_name: env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    };
  }
);

