/**
 * Unit tests for sendMatchNotification Cloud Function
 * Tests the onCreate trigger for new connections
 */

import * as admin from 'firebase-admin';
import { sendMatchNotification } from '../../notifications/sendMatchNotification';
import * as utils from '../../notifications/utils';

// Mock dependencies
jest.mock('firebase-admin');
jest.mock('../../notifications/utils');

// Mock firebase-functions/v2/firestore
let onDocumentCreatedHandler: ((event: any) => Promise<void>) | null = null;

jest.mock('firebase-functions/v2/firestore', () => ({
  onDocumentCreated: jest.fn((path: string, handler: (event: any) => Promise<void>) => {
    onDocumentCreatedHandler = handler;
    return handler;
  }),
}));

describe('sendMatchNotification', () => {
  let mockMessaging: any;
  let mockSendEachForMulticast: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup messaging mock
    mockSendEachForMulticast = jest.fn();
    mockMessaging = {
      sendEachForMulticast: mockSendEachForMulticast,
    };

    // Mock admin.messaging()
    (admin.messaging as jest.Mock) = jest.fn(() => mockMessaging);

    // Mock utils functions
    (utils.getTokensForUser as jest.Mock).mockResolvedValue(['token1', 'token2']);
    (utils.getUserDisplayName as jest.Mock).mockImplementation(async (userId: string) => {
      if (userId === 'user1') return 'Alice';
      if (userId === 'user2') return 'Bob';
      return 'Someone';
    });
    (utils.cleanupInvalidTokens as jest.Mock).mockResolvedValue(undefined);

    // Mock successful send response
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 2,
      failureCount: 0,
      responses: [
        { success: true, messageId: 'msg1' },
        { success: true, messageId: 'msg2' },
      ],
    });

    // Load the module to register the handler
    require('../../notifications/sendMatchNotification');
  });

  it('should send notifications to both users on new connection', async () => {
    const event = {
      params: { connectionId: 'conn123' },
      data: {
        data: () => ({
          users: ['user1', 'user2'],
          createdAt: { _seconds: Date.now() / 1000 },
        }),
      },
    };

    if (!onDocumentCreatedHandler) {
      throw new Error('Handler not registered');
    }

    await onDocumentCreatedHandler(event);

    // Should get tokens for both users
    expect(utils.getTokensForUser).toHaveBeenCalledWith('user1');
    expect(utils.getTokensForUser).toHaveBeenCalledWith('user2');

    // Should get display names
    expect(utils.getUserDisplayName).toHaveBeenCalledWith('user1');
    expect(utils.getUserDisplayName).toHaveBeenCalledWith('user2');

    // Should send notifications
    expect(mockSendEachForMulticast).toHaveBeenCalledTimes(2);

    // Verify notification content for user1 (should mention user2)
    const notification1 = mockSendEachForMulticast.mock.calls[0][0];
    expect(notification1.tokens).toEqual(['token1', 'token2']);
    expect(notification1.notification.title).toBe('New Match! 🎉');
    expect(notification1.notification.body).toContain('Bob');
    expect(notification1.data.type).toBe('new_match');
    expect(notification1.data.connectionId).toBe('conn123');

    // Verify notification content for user2 (should mention user1)
    const notification2 = mockSendEachForMulticast.mock.calls[1][0];
    expect(notification2.notification.body).toContain('Alice');

    // Should call cleanup for both users
    expect(utils.cleanupInvalidTokens).toHaveBeenCalledTimes(2);
  });

  it('should include itinerary destination in notification if available', async () => {
    const event = {
      params: { connectionId: 'conn123' },
      data: {
        data: () => ({
          users: ['user1', 'user2'],
          itineraries: [
            {
              destination: 'Paris',
              startDate: '2025-08-01',
              endDate: '2025-08-07',
            },
          ],
        }),
      },
    };

    if (!onDocumentCreatedHandler) throw new Error('Handler not registered');

    await onDocumentCreatedHandler(event);

    const notification = mockSendEachForMulticast.mock.calls[0][0];
    expect(notification.notification.body).toContain('Paris');
    expect(notification.notification.body).toMatch(/Aug \d+/); // Date formatted
  });

  it('should skip users with no tokens', async () => {
    (utils.getTokensForUser as jest.Mock)
      .mockResolvedValueOnce([]) // user1 has no tokens
      .mockResolvedValueOnce(['token1']); // user2 has tokens

    const event = {
      params: { connectionId: 'conn123' },
      data: {
        data: () => ({
          users: ['user1', 'user2'],
        }),
      },
    };

    if (!onDocumentCreatedHandler) throw new Error('Handler not registered');

    await onDocumentCreatedHandler(event);

    // Should only send to user2
    expect(mockSendEachForMulticast).toHaveBeenCalledTimes(1);
    const notification = mockSendEachForMulticast.mock.calls[0][0];
    expect(notification.tokens).toEqual(['token1']);
  });

  it('should handle connections with invalid data', async () => {
    const event = {
      params: { connectionId: 'conn123' },
      data: {
        data: () => ({
          users: null, // Invalid
        }),
      },
    };

    if (!onDocumentCreatedHandler) throw new Error('Handler not registered');

    await onDocumentCreatedHandler(event);

    // Should not attempt to send notifications
    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
  });

  it('should handle connections with less than 2 users', async () => {
    const event = {
      params: { connectionId: 'conn123' },
      data: {
        data: () => ({
          users: ['user1'], // Only 1 user
        }),
      },
    };

    if (!onDocumentCreatedHandler) throw new Error('Handler not registered');

    await onDocumentCreatedHandler(event);

    // Should not attempt to send notifications
    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
  });

  it('should handle missing event data', async () => {
    const event = {
      params: { connectionId: 'conn123' },
      data: null,
    };

    if (!onDocumentCreatedHandler) throw new Error('Handler not registered');

    await onDocumentCreatedHandler(event);

    // Should not attempt to send notifications
    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
  });

  it('should continue processing if one user fails', async () => {
    (utils.getTokensForUser as jest.Mock)
      .mockResolvedValueOnce(['token1'])
      .mockRejectedValueOnce(new Error('Firestore error')); // user2 fails

    const event = {
      params: { connectionId: 'conn123' },
      data: {
        data: () => ({
          users: ['user1', 'user2'],
        }),
      },
    };

    if (!onDocumentCreatedHandler) throw new Error('Handler not registered');

    await onDocumentCreatedHandler(event);

    // Should still send to user1
    expect(mockSendEachForMulticast).toHaveBeenCalledTimes(1);
  });

  it('should call cleanupInvalidTokens when sends fail', async () => {
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 1,
      failureCount: 1,
      responses: [
        { success: true, messageId: 'msg1' },
        { success: false, error: { code: 'messaging/invalid-registration-token', message: 'Invalid' } },
      ],
    });

    const event = {
      params: { connectionId: 'conn123' },
      data: {
        data: () => ({
          users: ['user1', 'user2'],
        }),
      },
    };

    if (!onDocumentCreatedHandler) throw new Error('Handler not registered');

    await onDocumentCreatedHandler(event);

    // Should call cleanup with the BatchResponse
    expect(utils.cleanupInvalidTokens).toHaveBeenCalledWith(
      'user1',
      ['token1', 'token2'],
      expect.objectContaining({
        successCount: 1,
        failureCount: 1,
      })
    );
  });
});
