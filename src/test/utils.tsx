// src/test/utils.tsx
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import type { User } from '@/lib/types';

// Mock user data for testing
export const mockUser: User = {
  uid: 'test-user-123',
  email: 'test@luna.co.ke',
  displayName: 'Test User',
  name: 'Test User',
  role: 'admin',
  isActive: true,
  createdAt: new Date(),
  lastLogin: new Date(),
};

export const mockOperationsUser: User = {
  uid: 'ops-user-123',
  email: 'ops@luna.co.ke',
  displayName: 'Operations User',
  name: 'Operations User',
  role: 'operations',
  isActive: true,
  createdAt: new Date(),
  lastLogin: new Date(),
};

export const mockProductionUser: User = {
  uid: 'prod-user-123',
  email: 'production@luna.co.ke',
  displayName: 'Production User',
  name: 'Production User',
  role: 'production',
  isActive: true,
  createdAt: new Date(),
  lastLogin: new Date(),
};

export const mockSalesUser: User = {
  uid: 'sales-user-123',
  email: 'sales@luna.co.ke',
  displayName: 'Sales User',
  name: 'Sales User',
  role: 'sales',
  isActive: true,
  createdAt: new Date(),
  lastLogin: new Date(),
};

// Custom render function with providers
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { ...options });
}

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { renderWithProviders as render };
