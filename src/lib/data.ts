import type { User, RawMaterial, Product, MaterialRequest, Activity } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const userAvatars = {
  mark: PlaceHolderImages.find(img => img.id === 'user-1')?.imageUrl || '',
  mercy: PlaceHolderImages.find(img => img.id === 'user-2')?.imageUrl || '',
  duncan: PlaceHolderImages.find(img => img.id === 'user-3')?.imageUrl || '',
  james: 'https://i.postimg.cc/9FzKTLkD/WhatsApp_Image_2025-10-15_at_00.18.06_514d4d8f.jpg',
  maina: 'https://i.postimg.cc/9FzKTLkD/WhatsApp_Image_2025-10-15_at_00.18.06_514d4d8f.jpg',
}

export const users: User[] = [
  { id: 'user-1', name: 'Mark Maina', email: 'mark.maina@luna.co', role: 'admin', avatarUrl: userAvatars.mark },
  { id: 'user-2', name: 'Mercy Mugati', email: 'mercy.mugati@luna.co', role: 'operations_manager', avatarUrl: userAvatars.mercy },
  { id: 'user-3', name: 'Duncan Mwangi', email: 'duncan.mwangi@luna.co', role: 'production_personnel', avatarUrl: userAvatars.duncan },
  { id: 'user-4', name: 'James Kimani', email: 'james.kimani@luna.co', role: 'production_personnel', avatarUrl: userAvatars.james },
  { id: 'user-5', name: 'Maina Kinyua', email: 'maina.kinyua@luna.co', role: 'operations_manager', avatarUrl: userAvatars.maina },
];

export let currentUser: User = users[1]; // Default to Mercy Mugati (Operations Manager)

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
  { id: 'req-2', materialId: 'mat-4', quantity: 20, requestedBy: 'user-5', status: 'pending', createdAt: '2023-10-27T14:30:00Z', updatedAt: '2023-10-27T14:30:00Z' },
  { id: 'req-3', materialId: 'mat-2', quantity: 50, requestedBy: 'user-2', status: 'delivered', createdAt: '2023-10-25T09:00:00Z', updatedAt: '2023-10-26T15:00:00Z' },
  { id: 'req-4', materialId: 'mat-5', quantity: 100, requestedBy: 'user-5', status: 'rejected', createdAt: '2023-10-24T16:00:00Z', updatedAt: '2023-10-24T17:00:00Z' },
];

const now = new Date();

export const adminActivities: Activity[] = [
    { id: 'act-adm-1', user: users[0], action: 'updated user roles for the production team.', timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), details: 'Updated Duncan Mwangi to Production Lead' },
    { id: 'act-adm-2', user: users[0], action: 'triggered a manual backup of the database.', timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(), details: 'Pre-update safety backup' },
    { id: 'act-adm-3', user: users[0], action: 'reset the password for Maina Kinyua.', timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), details: 'User requested reset via ICT support' },
    { id: 'act-adm-4', user: users[0], action: 'deactivated a user account.', timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), details: 'User account for former employee "Jane Doe" deactivated.' },
];

export const operationsActivities: Activity[] = [
  { id: 'act-ops-1', user: users[1], action: 'approved a material request for 20 liters of Natural Dyes.', timestamp: new Date(now.getTime() - 15 * 60 * 1000).toISOString(), details: 'Request #req-2 by Maina Kinyua' },
  { id: 'act-ops-2', user: users[4], action: 'uploaded delivery note for PO-0451.', timestamp: new Date(now.getTime() - 45 * 60 * 1000).toISOString(), details: 'Received 100kg of Acacia Wood' },
  { id: 'act-ops-3', user: users[1], action: 'updated the reorder point for Recycled Brass.', timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(), details: 'Changed from 50kg to 75kg' },
  { id: 'act-ops-4', user: users[4], action: 'rejected a material request for 200 units of Kenyan Leather.', timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(), details: 'Reason: Duplicate request.' },
  { id: 'act-ops-5', user: users[1], action: 'marked a delivery as complete.', timestamp: new Date(now.getTime() - 28 * 60 * 60 * 1000).toISOString(), details: '50kg Recycled Brass from supplier' },
];

export const productionActivities: Activity[] = [
    { id: 'act-prod-1', user: users[2], action: 'reported a production run of 50 Handcarved Bowls.', timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), details: 'Used 25kg of Acacia Wood' },
    { id: 'act-prod-2', user: users[3], action: 'logged the usage of 15kg of Recycled Brass.', timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), details: 'For production of 150 Brass Earrings sets' },
    { id: 'act-prod-3', user: users[2], action: 'submitted a quality control check.', timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(), details: 'Batch #PROD-BWL-01-B passed inspection' },
    { id: 'act-prod-4', user: users[3], action: 'reported a material discrepancy for Natural Dyes.', timestamp: new Date(now.getTime() - 7 * 60 * 60 * 1000).toISOString(), details: 'Used 5.5L instead of expected 5L' },
];

export const activities: Activity[] = [
  ...adminActivities,
  ...operationsActivities,
  ...productionActivities,
].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
