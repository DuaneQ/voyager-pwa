/**
 * Unit tests for notification utilities
 * Tests token retrieval and cleanup functions
 */

import * as admin from 'firebase-admin';
import { getTokensForUser, cleanupInvalidTokens, truncateText, getUserDisplayName } from '../../notifications/utils';
import type { BatchResponse } from 'firebase-admin/messaging';

// Mock firebase-admin
jest.mock('firebase-admin', () => {
  const mockFieldValue = {
    arrayRemove: jest.fn((...tokens: string[]) => ({ _methodName: 'FieldValue.arrayRemove', _elements: tokens })),
  };

  const mockUpdate = jest.fn();
  const mockGet = jest.fn();
  const mockDoc = jest.fn(() => ({
    get: mockGet,
    update: mockUpdate,
  }));
  const mockCollection = jest.fn(() => ({
    doc: mockDoc,
  }));

  const mockFirestore: any = jest.fn(() => ({
    doc: mockDoc,
    collection: mockCollection,
  }));
  mockFirestore.FieldValue = mockFieldValue;

  return {
    firestore: mockFirestore,
    FieldValue: mockFieldValue,
  };
});

describe('Notification Utils', () => {
  let mockDoc: jest.Mock;
  let mockGet: jest.Mock;
  let mockUpdate: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get references to mocked functions
    const firestoreMock = admin.firestore() as any;
    mockDoc = firestoreMock.doc;
    mockGet = mockDoc().get;
    mockUpdate = mockDoc().update;
  });

  describe('getTokensForUser', () => {
    it('should return tokens for valid user', async () => {
      const mockTokens = ['ExponentPushToken[abc123]', 'ExponentPushToken[def456]'];
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ fcmTokens: mockTokens }),
      });

      const tokens = await getTokensForUser('user123');

      expect(tokens).toEqual(mockTokens);
      expect(mockDoc).toHaveBeenCalledWith('users/user123');
    });

    it('should return empty array for user without tokens', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({}),
      });

      const tokens = await getTokensForUser('user123');

      expect(tokens).toEqual([]);
    });

    it('should return empty array for non-existent user', async () => {
      mockGet.mockResolvedValue({
        exists: false,
      });

      const tokens = await getTokensForUser('nonexistent');

      expect(tokens).toEqual([]);
    });

    it('should filter out empty/invalid tokens', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ fcmTokens: ['valid-token', '', null, 'another-valid', undefined] }),
      });

      const tokens = await getTokensForUser('user123');

      expect(tokens).toEqual(['valid-token', 'another-valid']);
    });

    it('should handle errors gracefully', async () => {
      mockGet.mockRejectedValue(new Error('Firestore error'));

      const tokens = await getTokensForUser('user123');

      expect(tokens).toEqual([]);
    });
  });

  describe('cleanupInvalidTokens', () => {
    it('should remove tokens with invalid-registration-token error', async () => {
      const tokensSent = ['token1', 'token2', 'token3'];
      const response: BatchResponse = {
        successCount: 1,
        failureCount: 2,
        responses: [
          { success: true, messageId: 'msg1' },
          { success: false, error: { code: 'messaging/invalid-registration-token', message: 'Invalid token' } as any },
          { success: false, error: { code: 'messaging/registration-token-not-registered', message: 'Not registered' } as any },
        ],
      };

      await cleanupInvalidTokens('user123', tokensSent, response);

      expect(mockUpdate).toHaveBeenCalledWith({
        fcmTokens: expect.objectContaining({
          _methodName: 'FieldValue.arrayRemove',
          _elements: ['token2', 'token3'],
        }),
      });
    });

    it('should not remove tokens with temporary errors', async () => {
      const tokensSent = ['token1', 'token2'];
      const response: BatchResponse = {
        successCount: 1,
        failureCount: 1,
        responses: [
          { success: true, messageId: 'msg1' },
          { success: false, error: { code: 'messaging/server-error', message: 'Temporary error' } as any },
        ],
      };

      await cleanupInvalidTokens('user123', tokensSent, response);

      // Update should not be called because no permanent failures
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should handle all successful sends', async () => {
      const tokensSent = ['token1', 'token2'];
      const response: BatchResponse = {
        successCount: 2,
        failureCount: 0,
        responses: [
          { success: true, messageId: 'msg1' },
          { success: true, messageId: 'msg2' },
        ],
      };

      await cleanupInvalidTokens('user123', tokensSent, response);

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should handle errors during cleanup gracefully', async () => {
      const tokensSent = ['token1'];
      const response: BatchResponse = {
        successCount: 0,
        failureCount: 1,
        responses: [
          { success: false, error: { code: 'messaging/invalid-registration-token', message: 'Invalid' } as any },
        ],
      };

      mockUpdate.mockRejectedValue(new Error('Update failed'));

      // Should not throw
      await expect(cleanupInvalidTokens('user123', tokensSent, response)).resolves.not.toThrow();
    });
  });

  describe('truncateText', () => {
    it('should not truncate text shorter than max length', () => {
      expect(truncateText('Hello', 10)).toBe('Hello');
    });

    it('should truncate text longer than max length', () => {
      expect(truncateText('This is a very long message that should be truncated', 20)).toBe('This is a very long ...');
    });

    it('should handle text exactly at max length', () => {
      expect(truncateText('Exactly20Characters!', 20)).toBe('Exactly20Characters!');
    });

    it('should handle empty text', () => {
      expect(truncateText('', 10)).toBe('');
    });
  });

  describe('getUserDisplayName', () => {
    it('should return username if available', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ username: 'johndoe', displayName: 'John Doe' }),
      });

      const name = await getUserDisplayName('user123');

      expect(name).toBe('johndoe');
    });

    it('should fall back to displayName if username not available', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({ displayName: 'John Doe' }),
      });

      const name = await getUserDisplayName('user123');

      expect(name).toBe('John Doe');
    });

    it('should return "Someone" for non-existent user', async () => {
      mockGet.mockResolvedValue({
        exists: false,
      });

      const name = await getUserDisplayName('nonexistent');

      expect(name).toBe('Someone');
    });

    it('should return "Someone" for user with no name fields', async () => {
      mockGet.mockResolvedValue({
        exists: true,
        data: () => ({}),
      });

      const name = await getUserDisplayName('user123');

      expect(name).toBe('Someone');
    });

    it('should handle errors gracefully', async () => {
      mockGet.mockRejectedValue(new Error('Firestore error'));

      const name = await getUserDisplayName('user123');

      expect(name).toBe('Someone');
    });
  });
});
