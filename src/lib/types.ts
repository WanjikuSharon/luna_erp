export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'operations_manager' | 'production_personnel';
  avatarUrl: string;
};

export type RawMaterial = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unit: 'kg' | 'liters' | 'units';
  reorderPoint: number;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unit: 'units';
};

export type MaterialRequest = {
  id: string;
  materialId: string;
  quantity: number;
  requestedBy: string;
  status: 'pending' | 'approved' | 'delivered' | 'rejected';
  createdAt: string;
  updatedAt: string;
};

export type Activity = {
  id: string;
  user: {
    name: string;
    avatarUrl: string;
  };
  action: string;
  timestamp: string;
  details: string;
};
