import { config } from 'dotenv';
config({ path: '.env.local' }); // <-- Tell it to read the .env.local file

import '@/ai/flows/explain-inventory-discrepancy.ts';
import '@/ai/flows/suggest-inventory-update.ts';

// Add these lines from our previous steps
import '@/ai/flows/notify-admins.ts';
import '@/ai/flows/send-request-email.ts';