import type { User, RawMaterial, Product, MaterialRequest, Activity } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const userAvatars = {
  admin: PlaceHolderImages.find(img => img.id === 'user-1')?.imageUrl || '',
  manager: PlaceHolderImages.find(img => img.id === 'user-2')?.imageUrl || '',
  production: PlaceHolderImages.find(img => img.id === 'user-3')?.imageUrl || '',
}

export const users: User[] = [
  { id: 'user-1', name: 'Admin Ali', email: 'admin@luna.co', role: 'admin', avatarUrl: userAvatars.admin },
  { id: 'user-2', name: 'Zola Kenyatta', email: 'manager@luna.co', role: 'operations_manager', avatarUrl: userAvatars.manager },
  { id: 'user-3', name: 'Baraka Odhiambo', email: 'production@luna.co', role: 'production_personnel', avatarUrl: userAvatars.production },
];

export let currentUser: User = users[1]; // Default to Operations Manager

export function setCurrentUser(role: 'admin' | 'operations_manager' | 'production_personnel') {
    const newUser = users.find(u => u.role === role);
    if (newUser) {
        currentUser = newUser;
    }
}


export const rawMaterials: RawMaterial[] = [
  { id: 'mat-1', name: 'Acacia Wood', sku: 'LUN-WD-ACA-01', quantity: 500, unit: 'kg', reorderPoint: 100 },
  { id: 'mat-2', name: 'Recycled Brass', sku: 'LUN-MT-BRS-02', quantity: 250, unit: 'kg', reorderPoint: 50 },
  { id: 'mat-3', name: 'Organic Cotton', sku: 'LUN-TX-COT-03', quantity: 800, unit: 'units', reorderPoint: 200 },
  { id: 'mat-4', name: 'Natural Dyes', sku: 'LUN-CH-DYE-04', quantity: 80, unit: 'liters', reorderPoint: 20 },
  { id: 'mat-5', name: 'Kenyan Leather', sku: 'LUN-TX-LTH-05', quantity: 300, unit: 'units', reorderPoint: 75 },
];

export const products: Product[] = [
  { id: 'prod-1', name: 'Handcarved Bowl', sku: 'LUN-PROD-BWL-01', quantity: 120, unit: 'units' },
  { id: 'prod-2', name: 'Brass Earrings', sku: 'LUN-PROD-JWL-02', quantity: 300, unit: 'units' },
  { id: 'prod-3', 'name': 'Cotton Tote Bag', sku: 'LUN-PROD-BAG-03', quantity: 500, unit: 'units' },
];

export const materialRequests: MaterialRequest[] = [
  { id: 'req-1', materialId: 'mat-1', quantity: 100, requestedBy: 'user-2', status: 'approved', createdAt: '2023-10-26T10:00:00Z', updatedAt: '2023-10-26T11:00:00Z' },
  { id: 'req-2', materialId: 'mat-4', quantity: 20, requestedBy: 'user-2', status: 'pending', createdAt: '2023-10-27T14:30:00Z', updatedAt: '2023-10-27T14:30:00Z' },
  { id: 'req-3', materialId: 'mat-2', quantity: 50, requestedBy: 'user-2', status: 'delivered', createdAt: '2023-10-25T09:00:00Z', updatedAt: '2023-10-26T15:00:00Z' },
  { id: 'req-4', materialId: 'mat-5', quantity: 100, requestedBy: 'user-2', status: 'rejected', createdAt: '2023-10-24T16:00:00Z', updatedAt: '2023-10-24T17:00:00Z' },
];

export const activities: Activity[] = [
  { id: 'act-1', user: { name: 'Zola Kenyatta', avatarUrl: userAvatars.manager }, action: 'Requested Material', details: '100 kg of Acacia Wood', timestamp: '3 hours ago' },
  { id: 'act-2', user: { name: 'Baraka Odhiambo', avatarUrl: userAvatars.production }, action: 'Production Logged', details: 'Used 10kg Recycled Brass for Brass Earrings', timestamp: '8 hours ago' },
  { id: 'act-3', user: { name: 'System', avatarUrl: '' }, action: 'Inventory Alert', details: 'Natural Dyes are below reorder point', timestamp: '1 day ago' },
  { id: 'act-4', user: { name: 'Zola Kenyatta', avatarUrl: userAvatars.manager }, action: 'Verified Delivery', details: '50 units of Kenyan Leather', timestamp: '2 days ago' },
  { id: 'act-5', user: { name: 'Admin Ali', avatarUrl: userAvatars.admin }, action: 'User Update', details: 'Changed role for new employee', timestamp: '4 days ago' },
];
