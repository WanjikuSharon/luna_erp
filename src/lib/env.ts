// src/lib/env.ts
import { z } from 'zod';

/**
 * Environment Variable Validation
 * 
 * This file validates all environment variables at startup to ensure:
 * 1. Required variables are present
 * 2. Variables have the correct format
 * 3. TypeScript knows these variables exist (no more `string | undefined`)
 * 
 * If validation fails, the app will throw a clear error message
 * listing exactly which variables are missing or invalid.
 */

// Define the schema for environment variables
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Firebase Configuration (Public - used in client-side code)
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1, 'Firebase API key is required'),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1, 'Firebase auth domain is required'),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, 'Firebase project ID is required'),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional(), // Optional - not all projects use Storage
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1, 'Firebase messaging sender ID is required'),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1, 'Firebase app ID is required'),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(), // Optional - for Analytics
  
  // Cloudinary Configuration
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().min(1, 'Cloudinary cloud name is required'),
  NEXT_PUBLIC_CLOUDINARY_API_KEY: z.string().min(1, 'Cloudinary API key is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'Cloudinary API secret is required (server-side only)'),
  
  // Email Service (ZeptoMail)
  ZEPTOMAIL_API_KEY: z.string().min(1, 'ZeptoMail API key is required'),
  
  // KRA eTIMS Configuration (Optional - only needed for tax invoicing)
  ETIMS_API_KEY: z.string().optional(),
  ETIMS_API_SECRET: z.string().optional(),
  ETIMS_DEVICE_SERIAL: z.string().optional(),
  ETIMS_COMPANY_PIN: z.string().optional(),
  ETIMS_BRANCH_ID: z.string().optional(),
  ETIMS_USE_SANDBOX: z.string().optional(),
  ETIMS_SANDBOX_URL: z.string().optional(),
  ETIMS_PRODUCTION_URL: z.string().optional(),
});

// Type for the validated environment variables
export type Env = z.infer<typeof envSchema>;

/**
 * Validate and parse environment variables
 * 
 * This will throw an error if any required variables are missing
 * or if they don't match the expected format.
 * 
 * During build/compile phase, validation is skipped to prevent build failures.
 */
function validateEnv(): Env {
  // Skip validation in browser (client-side) - only validate on server
  const isBrowser = typeof window !== 'undefined';
  
  // Skip validation during build phase (when NEXT_PHASE is set)
  // or when running in CI environments without full env setup
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' || 
                       process.env.NEXT_PHASE === 'phase-development-build' ||
                       process.env.CI === 'true';
  
  if (isBrowser || isBuildPhase) {
    if (isBrowser) {
      console.warn('⚠️ Skipping environment validation in browser (use process.env directly for NEXT_PUBLIC_ vars)');
    } else {
      console.warn('⚠️ Skipping environment validation during build phase');
    }
    // Return a mock object with empty strings for build-time
    return {
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
      NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
      NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '',
      NEXT_PUBLIC_CLOUDINARY_API_KEY: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || '',
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
      ZEPTOMAIL_API_KEY: process.env.ZEPTOMAIL_API_KEY || '',
      ETIMS_API_KEY: process.env.ETIMS_API_KEY,
      ETIMS_API_SECRET: process.env.ETIMS_API_SECRET,
      ETIMS_DEVICE_SERIAL: process.env.ETIMS_DEVICE_SERIAL,
      ETIMS_COMPANY_PIN: process.env.ETIMS_COMPANY_PIN,
      ETIMS_BRANCH_ID: process.env.ETIMS_BRANCH_ID,
      ETIMS_USE_SANDBOX: process.env.ETIMS_USE_SANDBOX,
      ETIMS_SANDBOX_URL: process.env.ETIMS_SANDBOX_URL,
      ETIMS_PRODUCTION_URL: process.env.ETIMS_PRODUCTION_URL,
    };
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(JSON.stringify(parsed.error.format(), null, 2));
    throw new Error(
      'Environment validation failed. Please check your .env.local file.\n' +
      'Missing or invalid variables:\n' +
      Object.entries(parsed.error.flatten().fieldErrors)
        .map(([key, errors]) => `  - ${key}: ${errors?.join(', ')}`)
        .join('\n')
    );
  }

  return parsed.data;
}

/**
 * Validated environment variables
 * 
 * Use this instead of process.env to get type-safe access to environment variables.
 * 
 * @example
 * import { env } from '@/lib/env';
 * const apiKey = env.NEXT_PUBLIC_FIREBASE_API_KEY; // TypeScript knows this is a string
 */
export const env = validateEnv();

/**
 * Check if we're in development mode
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Check if we're in production mode
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Check if we're in test mode
 */
export const isTest = env.NODE_ENV === 'test';
