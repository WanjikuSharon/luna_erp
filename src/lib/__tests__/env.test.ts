// src/lib/__tests__/env.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Environment Validation', () => {
  beforeEach(() => {
    // Clear any cached env modules
    vi.resetModules();
  });

  it('should validate all required environment variables', () => {
    // This test will pass if env.ts loads successfully
    // If any required variables are missing, it will throw during import
    expect(() => {
      require('../env');
    }).not.toThrow();
  });

  it('should export validated environment variables', () => {
    const { env } = require('../env');
    
    // Check that Firebase variables are present
    expect(env.NEXT_PUBLIC_FIREBASE_API_KEY).toBeDefined();
    expect(env.NEXT_PUBLIC_FIREBASE_PROJECT_ID).toBeDefined();
    expect(env.NEXT_PUBLIC_FIREBASE_APP_ID).toBeDefined();
    
    // Check that Cloudinary variables are present
    expect(env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME).toBeDefined();
    expect(env.NEXT_PUBLIC_CLOUDINARY_API_KEY).toBeDefined();
    expect(env.CLOUDINARY_API_SECRET).toBeDefined();
    
    // Check that email service variable is present
    expect(env.ZEPTOMAIL_API_KEY).toBeDefined();
  });

  it('should export helper boolean flags', () => {
    const { isDevelopment, isProduction, isTest } = require('../env');
    
    // In test environment, isTest should be true
    expect(typeof isDevelopment).toBe('boolean');
    expect(typeof isProduction).toBe('boolean');
    expect(typeof isTest).toBe('boolean');
  });
});
