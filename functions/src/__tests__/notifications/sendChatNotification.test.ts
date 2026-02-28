/**
 * Unit tests for sendChatNotification Cloud Function
 * Tests the onCreate trigger for new messages
 */

import * as admin from 'firebase-admin';
import { sendChatNotification } from '../../notifications/sendChatNotification';
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

describe('sendChatNotification', () => {
  let mockMessaging: any;
  let mockSendEachForMulticast: jest.Mock;
  let mockGet: jest.Mock;
  let mockDoc: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup messaging mock
    mockSendEachForMulticast = jest.fn();
    mockMessaging = {
      sendEachForMulticast: mockSendEachForMulticast,
    };

    // Setup Firestore mock
    mockGet = jest.fn();
    mockDoc = jest.fn(() => ({
      get: mockGet,
    }));

    // Mock admin.messaging() and admin.firestore()
    (admin.messaging as jest.Mock) = jest.fn(() => mockMessaging);
    const mockFirestore = {
      doc: mockDoc,
    };
    (admin.firestore as unknown as jest.Mock) = jest.fn(() => mockFirestore) as any;

    // Mock connection document
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        users: ['user1', 'user2'],
      }),
    });

    // Mock utils functions
    (utils.getTokensForUser as jest.Mock).mockResolvedValue(['token1', 'token2']);
    (utils.getUserDisplayName as jest.Mock).mockResolvedValue('Alice');
    (utils.cleanupInvalidTokens as jest.Mock).mockResolvedValue(undefined);
    (utils.truncateText as jest.Mock).mockImplementation((text: string, max: number) => {
      if (text.length <= max) return text;
      return `${text.substring(0, max)}...`;
    });

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
    require('../../notifications/sendChatNotification');
  });

  it('should send notification to recipient when new message is created', async () => {
    const event = {
      params: {
        connectionId: 'conn123',
        messageId: 'msg123',
      },
      data: {
        data: () => ({
          sender: 'user1',
          senderName: 'Alice',
          text: 'Hello! How are you?',
          type: 'text',
          createdAt: { _seconds: Date.now() / 1000 },
        }),
      },
    };

    if (!onDocumentCreatedHandler) throw new Error('Handler not registered');

    await onDocumentCreatedHandler(event);

    // Should fetch connection document
    expect(mockDoc).toHaveBeenCalledWith('connections/conn123');

    // Should get tokens for recipient (user2, not sender user1)
    expect(utils.getTokensForUser).toHaveBeenCalledWith('user2');
    expect(utils.getTokensForUser).not.toHaveBeenCalledWith('user1');

    // Should send notification
    expect(mockSendEachForMulticast).toHaveBeenCalledTimes(1);

    // Verify notification content
    const notification = mockSendEachForMulticast.mock.calls[0][0];
    expect(notification.tokens).toEqual(['token1', 'token2']);
    expect(notification.notification.title).toBe('Alice');
    expect(notification.notification.body).toBe('Hello! How are you?');
    expect(notification.data.type).toBe('new_message');
    expect(notification.data.connectionId).toBe('conn123');
    expect(notification.data.senderId).toBe('user1');
    expect(notification.data.screen).toBe('ChatScreen');
    expect(notification.data.messageId).toBe('msg123');

    // Android config
    expect(notification.android.notification.channelId).toBe('chat-messages');
    expect(notification.android.collapseKey).toBe('chat_conn123');

    // Should call cleanup
    expect(utils.cleanupInvalidTokens).toHaveBeenCalled();
  });

  it('should use getUserDisplayName fallback if senderName not in message', async () => {
    (utils.getUserDisplayName as jest.Mock).mockResolvedValue('Bob');

    const event = {
      params: {
        connectionId: 'conn123',
        messageId: 'msg123',
      },
      data: {
        data: () => ({
          sender: 'user1',
          // No senderName field
          text: 'Hello!',
        }),
      },
    };

    if (!onDocumentCreatedHandler) throw new Error('Handler not registered');

    await onDocumentCreatedHandler(event);

    // Should call getUserDisplayName
    expect(utils.getUserDisplayName).toHaveBeenCalledWith('user1');

    const notification = mockSendEachForMulticast.mock.calls[0][0];
    expect(notification.notification.title).toBe('Bob');
  });

  it('should handle image messages with special body text', async () => {
    const event = {
      params: {
        connectionId: 'conn123',
        messageId: 'msg123',
      },
      data: {
        data: () => ({
          sender: 'user1',
          senderName: 'Alice',
          imageUrl: 'https://example.com/photo.jpg',
          type: 'image',
        }),
      },
    };

    if (!onDocumentCreatedHandler) throw new Error('Handler not registered');

    await onDocumentCreatedHandler(event);

    const notification = mockSendEachForMulticast.mock.calls[0][0];
    expect(notification.notification.body).toBe('📷 Sent a photo');
  });

  it('should handle video messages with special body text', async () => {
    const event = {
      params: {
        connectionId: 'conn123',
        messageId: 'msg123',
      },
      data: {
        data: () => ({
          sender: 'user1',
          senderName: 'Alice',
          videoUrl: 'https://example.com/video.mp4',
          type: 'video',
        }),
      },
    };

    if (!onDocumentCreatedHandler) throw new Error('Handler not registered');

    await onDocumentCreatedHandler(event);

    const notification = mockSendEachForMulticast.mock.calls[0][0];
    expect(notification.notification.body).toBe('🎥 Sent a video');
  });

  it('should truncate long message text', async () => {
    const longText = 'A'.repeat(150);

    const event = {
      params: {
        connectionId: 'conn123',
        messageId: 'msg123',
      },
      data: {
        data: () => ({
          sender: 'user1',
          senderName: 'Alice',
          text: longText,
        }),
      },
    };

    if (!onDocumentCreatedHandler) throw new Error('Handler not registered');

    await onDocumentCreatedHandler(event);

    // Should call truncateText
    expect(utils.truncateText).toHaveBeenCalledWith(longText, 100);
  });

  it('should skip notification if connection not found', async () => {
    mockGet.mockResolvedValue({
      exists: false,
    });

    const event = {
      params: {
        connectionId: 'conn123',
        messageId: 'msg123',
      },
      data: {
        data: () => ({
          sender: 'user1',
          text: 'Hello!',
        }),
      },
    };

    if (!onDocumentCreatedHandler) throw new Error('Handler not registered');

    await onDocumentCreatedHandler(event);

    // Should not send notifications
    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
  });

  it('should skip notification if recipient has no tokens', async () => {
    (utils.getTokensForUser as jest.Mock).mockResolvedValue([]);

    const event = {
      params: {
        connectionId: 'conn123',
        messageId: 'msg123',
      },
      data: {
        data: () => ({
          sender: 'user1',
          text: 'Hello!',
        }),
      },
    };

    if (!onDocumentCreatedHandler) throw new Error('Handler not registered');

    await onDocumentCreatedHandler(event);

    // Should not send notifications
    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
  });

  it('should handle invalid message data', async () => {
    const event = {
      params: {
        connectionId: 'conn123',
        messageId: 'msg123',
      },
      data: {
        data: () => ({
          // No senderId
          text: 'Hello!',
        }),
      },
    };

    if (!onDocumentCreatedHandler) throw new Error('Handler not registered');

    await onDocumentCreatedHandler(event);

    // Should not send notifications
    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
  });

  it('should handle missing event data', async () => {
    const event = {
      params: {
        connectionId: 'conn123',
        messageId: 'msg123',
      },
      data: null,
    };

    if (!onDocumentCreatedHandler) throw new Error('Handler not registered');

    await onDocumentCreatedHandler(event);

    // Should not send notifications
    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
  });

  it('should handle group chats with multiple recipients', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        users: ['user1', 'user2', 'user3'], // 3 users
      }),
    });

    const event = {
      params: {
        connectionId: 'conn123',
        messageId: 'msg123',
      },
      data: {
        data: () => ({
          sender: 'user1',
          senderName: 'Alice',
          text: 'Hello everyone!',
        }),
      },
    };

    if (!onDocumentCreatedHandler) throw new Error('Handler not registered');

    await onDocumentCreatedHandler(event);

    // Should send to both recipients (user2 and user3)
    expect(utils.getTokensForUser).toHaveBeenCalledWith('user2');
    expect(utils.getTokensForUser).toHaveBeenCalledWith('user3');
    expect(utils.getTokensForUser).not.toHaveBeenCalledWith('user1'); // Not sender

    expect(mockSendEachForMulticast).toHaveBeenCalledTimes(2);
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
      params: {
        connectionId: 'conn123',
        messageId: 'msg123',
      },
      data: {
        data: () => ({
          sender: 'user1',
          senderName: 'Alice',
          text: 'Hello!',
        }),
      },
    };

    if (!onDocumentCreatedHandler) throw new Error('Handler not registered');

    await onDocumentCreatedHandler(event);

    // Should call cleanup with the BatchResponse
    expect(utils.cleanupInvalidTokens).toHaveBeenCalledWith(
      'user2',
      ['token1', 'token2'],
      expect.objectContaining({
        successCount: 1,
        failureCount: 1,
      })
    );
  });

  it('should continue if one recipient fails', async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        users: ['user1', 'user2', 'user3'],
      }),
    });

    (utils.getTokensForUser as jest.Mock)
      .mockResolvedValueOnce(['token1']) // user2 succeeds
      .mockRejectedValueOnce(new Error('Firestore error')); // user3 fails

    const event = {
      params: {
        connectionId: 'conn123',
        messageId: 'msg123',
      },
      data: {
        data: () => ({
          sender: 'user1',
          text: 'Hello!',
        }),
      },
    };

    if (!onDocumentCreatedHandler) throw new Error('Handler not registered');

    await onDocumentCreatedHandler(event);

    // Should still send to user2
    expect(mockSendEachForMulticast).toHaveBeenCalledTimes(1);
  });
});
