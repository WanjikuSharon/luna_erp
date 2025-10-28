import { config } from 'dotenv';
config();

import '@/ai/flows/explain-inventory-discrepancy.ts';
import '@/ai/flows/suggest-inventory-update.ts';