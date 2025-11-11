// src/services/__tests__/activity_logger.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { logActivity, logActivityWithUser, logSalesActivity, logOperationsActivity } from '../activity_logger';
import type { User as FirebaseUser } from 'firebase/auth';

vi.mock('firebase/firestore');

describe('ActivityLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(serverTimestamp).mockReturnValue('mock-timestamp' as any);
  });

  const mockFirestore = {} as any;
  const mockUser: FirebaseUser = {
    uid: 'user-123',
    email: 'test@luna.co.ke',
    displayName: 'Test User',
  } as FirebaseUser;

  describe('logActivity', () => {
    it('should log activity successfully', async () => {
      vi.mocked(addDoc).mockResolvedValue({ id: 'activity-123' } as any);

      await logActivity({
        firestore: mockFirestore,
        module: 'sales',
        action: 'created sale',
        userId: 'user-123',
        userEmail: 'test@luna.co.ke',
        userName: 'Test User',
        details: 'Sold 10 items',
      });

      expect(collection).toHaveBeenCalledWith(mockFirestore, 'sales_activities');
      expect(addDoc).toHaveBeenCalledWith(expect.anything(), {
        user: {
          uid: 'user-123',
          email: 'test@luna.co.ke',
          name: 'Test User',
        },
        action: 'created sale',
        module: 'sales',
        details: 'Sold 10 items',
        timestamp: 'mock-timestamp',
      });
    });

    it('should handle missing optional parameters', async () => {
      vi.mocked(addDoc).mockResolvedValue({ id: 'activity-123' } as any);

      await logActivity({
        firestore: mockFirestore,
        module: 'operations',
        action: 'updated inventory',
        userId: 'user-123',
        userEmail: 'test@luna.co.ke',
      });

      expect(addDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        action: 'updated inventory',
        module: 'operations',
      }));
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(addDoc).mockRejectedValue(new Error('Firestore error'));

      await expect(
        logActivity({
          firestore: mockFirestore,
          module: 'admin',
          action: 'deleted user',
          userId: 'user-123',
          userEmail: 'test@luna.co.ke',
        })
      ).resolves.not.toThrow();
    });
  });

  describe('logActivityWithUser', () => {
    it('should log activity with Firebase user', async () => {
      vi.mocked(addDoc).mockResolvedValue({ id: 'activity-123' } as any);

      await logActivityWithUser(
        mockFirestore,
        mockUser,
        'production',
        'started batch',
        'Batch #123'
      );

      expect(addDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        action: 'started batch',
        module: 'production',
        details: 'Batch #123',
        user: expect.objectContaining({
          uid: 'user-123',
          email: 'test@luna.co.ke',
        }),
      }));
    });

    it('should handle user without displayName', async () => {
      vi.mocked(addDoc).mockResolvedValue({ id: 'activity-123' } as any);

      const userWithoutName = {
        uid: 'user-456',
        email: 'noname@luna.co.ke',
      } as FirebaseUser;

      await logActivityWithUser(
        mockFirestore,
        userWithoutName,
        'sales',
        'created report'
      );

      expect(addDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        user: expect.objectContaining({
          uid: 'user-456',
          email: 'noname@luna.co.ke',
        }),
      }));
    });
  });

  describe('logSalesActivity', () => {
    it('should log sales activity', async () => {
      vi.mocked(addDoc).mockResolvedValue({ id: 'activity-123' } as any);

      await logSalesActivity(mockFirestore, mockUser, 'submitted report', 'Daily sales');

      expect(collection).toHaveBeenCalledWith(mockFirestore, 'sales_activities');
      expect(addDoc).toHaveBeenCalled();
    });
  });

  describe('logOperationsActivity', () => {
    it('should log operations activity', async () => {
      vi.mocked(addDoc).mockResolvedValue({ id: 'activity-123' } as any);

      await logOperationsActivity(mockFirestore, mockUser, 'verified delivery');

      expect(collection).toHaveBeenCalledWith(mockFirestore, 'operations_activities');
      expect(addDoc).toHaveBeenCalled();
    });
  });
});
