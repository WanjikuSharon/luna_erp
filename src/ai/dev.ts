// src/ai/dev.ts
import { config } from 'dotenv';
config({ path: '.env.local' });

import '@/ai/flows/explain-inventory-discrepancy.ts';
import '@/ai/flows/suggest-inventory-update.ts';
import '@/ai/flows/notify-admins.ts';
import '@/ai/flows/send-request-email.ts';
import '@/ai/flows/generate-upload-signature.ts'; // Ensure this flow is loaded
