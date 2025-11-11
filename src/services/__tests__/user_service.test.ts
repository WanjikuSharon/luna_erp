// src/services/__tests__/user_service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getUserRole, getUserData, updateUserRole, getUserDisplayName } from '../user_service';

vi.mock('firebase/firestore');

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserRole', () => {
    it('should return user role when user exists', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({ role: 'admin' }),
      };
      vi.mocked(getDoc).mockResolvedValue(mockDocSnap as any);

      const firestore = {} as any;
      const role = await getUserRole(firestore, 'user-123');

      expect(role).toBe('admin');
      expect(doc).toHaveBeenCalled();
      expect(getDoc).toHaveBeenCalled();
    });

    it('should return null when user does not exist', async () => {
      const mockDocSnap = {
        exists: () => false,
      };
      vi.mocked(getDoc).mockResolvedValue(mockDocSnap as any);

      const firestore = {} as any;
      const role = await getUserRole(firestore, 'non-existent-user');

      expect(role).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(getDoc).mockRejectedValue(new Error('Firestore error'));

      const firestore = {} as any;
      const role = await getUserRole(firestore, 'user-123');

      expect(role).toBeNull();
    });
  });

  describe('getUserData', () => {
    it('should return user data when user exists', async () => {
      const mockUserData = {
        uid: 'user-123',
        email: 'test@luna.co.ke',
        role: 'admin',
        isActive: true,
      };
      const mockDocSnap = {
        exists: () => true,
        data: () => mockUserData,
      };
      vi.mocked(getDoc).mockResolvedValue(mockDocSnap as any);

      const firestore = {} as any;
      const userData = await getUserData(firestore, 'user-123');

      expect(userData).toEqual(mockUserData);
    });

    it('should return null when user does not exist', async () => {
      const mockDocSnap = {
        exists: () => false,
      };
      vi.mocked(getDoc).mockResolvedValue(mockDocSnap as any);

      const firestore = {} as any;
      const userData = await getUserData(firestore, 'non-existent-user');

      expect(userData).toBeNull();
    });
  });

  describe('updateUserRole', () => {
    it('should update user role successfully', async () => {
      vi.mocked(updateDoc).mockResolvedValue(undefined);

      const firestore = {} as any;
      await updateUserRole(firestore, 'user-123', 'operations');

      expect(doc).toHaveBeenCalled();
      expect(updateDoc).toHaveBeenCalledWith(expect.anything(), { role: 'operations' });
    });

    it('should handle errors when updating role', async () => {
      vi.mocked(updateDoc).mockRejectedValue(new Error('Update failed'));

      const firestore = {} as any;
      
      await expect(updateUserRole(firestore, 'user-123', 'admin')).rejects.toThrow();
    });
  });

  describe('getUserDisplayName', () => {
    it('should return displayName when available', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({ displayName: 'John Doe', email: 'john@luna.co.ke' }),
      };
      vi.mocked(getDoc).mockResolvedValue(mockDocSnap as any);

      const firestore = {} as any;
      const name = await getUserDisplayName(firestore, 'user-123');

      expect(name).toBe('John Doe');
    });

    it('should return name when displayName is not available', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({ name: 'Jane Doe', email: 'jane@luna.co.ke' }),
      };
      vi.mocked(getDoc).mockResolvedValue(mockDocSnap as any);

      const firestore = {} as any;
      const name = await getUserDisplayName(firestore, 'user-123');

      expect(name).toBe('Jane Doe');
    });

    it('should return email when neither displayName nor name is available', async () => {
      const mockDocSnap = {
        exists: () => true,
        data: () => ({ email: 'test@luna.co.ke' }),
      };
      vi.mocked(getDoc).mockResolvedValue(mockDocSnap as any);

      const firestore = {} as any;
      const name = await getUserDisplayName(firestore, 'user-123');

      expect(name).toBe('test@luna.co.ke');
    });

    it('should return Unknown User when user does not exist', async () => {
      const mockDocSnap = {
        exists: () => false,
      };
      vi.mocked(getDoc).mockResolvedValue(mockDocSnap as any);

      const firestore = {} as any;
      const name = await getUserDisplayName(firestore, 'non-existent-user');

      expect(name).toBe('Unknown User');
    });
  });
});
