// src/services/inventory_service.ts
import type { RawMaterial, Product, PackagingMaterial } from '@/lib/types';

// Central place for collection names
export const COLLECTIONS = {
    RAW_MATERIALS: 'raw_materials',
    PRODUCTS: 'products',
    PACKAGING: 'packaging_materials',
    REQUESTS: 'material_requests',
    USERS: 'users',
    VENDORS: 'vendors',
    SALESPEOPLE: 'salespeople',
    SALES_LEDGER: 'sales_ledger',
    PRODUCTION_BATCHES: 'production_batches',
    ACTIVITIES: 'activities',
} as const;

// Re-export types for potentially easier access if needed elsewhere
export type { RawMaterial, Product, PackagingMaterial };

// You could add functions here later for more complex inventory logic,
// e.g., function calculateTotalStockValue(...) { ... }
