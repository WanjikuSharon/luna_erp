import { config } from 'dotenv';
config();

import '@/ai/flows/explain-inventory-discrepancy.ts';
import '@/ai/flows/suggest-inventory-update.ts';
import '@/ai/flows/notify-admins.ts';         // NEW
import '@/ai/flows/send-request-email.ts';    // NEW
// Import Cloudinary flow later when you build it
// import '@/ai/flows/generate-upload-signature.ts';