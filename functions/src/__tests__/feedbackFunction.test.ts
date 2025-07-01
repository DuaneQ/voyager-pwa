import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';
import { notifyFeedbackSubmission } from '../index';

// Mock Firebase Admin
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({
          data: () => ({ username: 'testuser', email: 'test@example.com' })
        })),
        update: jest.fn(() => Promise.resolve())
      })),
      add: jest.fn(() => Promise.resolve({ id: 'mail-doc-id' }))
    }))
  }))
}));

// Mock console methods to avoid cluttering test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

describe('notifyFeedbackSubmission', () => {
  let mockDb: any;
  let mockCollection: any;
  let mockDoc: any;
  let mockAdd: any;
  let mockUpdate: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUpdate = jest.fn(() => Promise.resolve());
    mockAdd = jest.fn(() => Promise.resolve({ id: 'mail-doc-id' }));
    mockDoc = jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({
        data: () => ({ username: 'testuser', email: 'test@example.com' })
      })),
      update: mockUpdate
    }));
    mockCollection = jest.fn((collectionName) => {
      if (collectionName === 'mail') {
        return { add: mockAdd };
      }
      if (collectionName === 'feedback') {
        return { doc: mockDoc };
      }
      return { doc: mockDoc, add: mockAdd };
    });
    
    mockDb = {
      collection: mockCollection
    };
    
    // Mock the admin.firestore() call
    (admin.firestore as unknown as jest.Mock).mockReturnValue(mockDb);
  });

  const createMockSnapshot = (data: any) => ({
    data: () => data
  });

  const createMockContext = (feedbackId: string) => ({
    params: { feedbackId },
    eventId: 'test-event-id',
    eventType: 'providers/cloud.firestore/eventTypes/document.create',
    resource: {
      service: 'firestore.googleapis.com',
      name: `projects/test-project/databases/(default)/documents/feedback/${feedbackId}`
    },
    timestamp: new Date().toISOString()
  });

  test('handles successful feedback notification', async () => {
    const feedbackData = {
      type: 'bug',
      severity: 'high',
      title: 'Test Bug Report',
      description: 'This is a test bug description',
      userId: 'test-user-id',
      userEmail: 'user@example.com',
      deviceInfo: {
        platform: 'Web',
        userAgent: 'Mozilla/5.0',
        screenResolution: '1920x1080',
        url: 'http://localhost:3000',
        online: true
      },
      version: '1.0.0-beta',
      createdAt: new Date()
    };

    const mockSnap = createMockSnapshot(feedbackData);
    const mockContext = createMockContext('test-feedback-id');

    const result = await notifyFeedbackSubmission(
      mockSnap as functions.firestore.DocumentSnapshot,
      mockContext as unknown as functions.EventContext
    );

    expect(result).toBeNull();
    expect(mockCollection).toHaveBeenCalledWith('users');
    expect(mockCollection).toHaveBeenCalledWith('mail');
    expect(mockCollection).toHaveBeenCalledWith('feedback');
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'feedback@travalpass.com',
        from: 'no-reply@travalpass.com',
        message: expect.objectContaining({
          subject: expect.stringContaining('[BETA FEEDBACK]'),
          text: expect.stringContaining('Test Bug Report'),
          html: expect.stringContaining('Test Bug Report')
        })
      })
    );
    expect(mockUpdate).toHaveBeenCalledWith({
      emailSent: true,
      emailSentTimestamp: expect.any(Object)
    });
  });

  test('handles anonymous user feedback', async () => {
    const feedbackData = {
      type: 'general',
      title: 'Anonymous Feedback',
      description: 'This is anonymous feedback',
      userId: 'anonymous',
      userEmail: 'anon@example.com',
      deviceInfo: {
        platform: 'Mobile',
        online: true
      },
      createdAt: new Date()
    };

    const mockSnap = createMockSnapshot(feedbackData);
    const mockContext = createMockContext('anonymous-feedback-id');

    const result = await notifyFeedbackSubmission(
      mockSnap as functions.firestore.DocumentSnapshot,
      mockContext as unknown as functions.EventContext
    );

    expect(result).toBeNull();
    expect(mockAdd).toHaveBeenCalled();
    
    const emailCall = mockAdd.mock.calls[0][0];
    expect(emailCall.message.text).toContain('Anonymous');
    expect(emailCall.message.html).toContain('Anonymous');
  });

  test('handles missing user data gracefully', async () => {
    // Mock user doc that doesn't exist
    mockDoc = jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({
        data: () => null
      })),
      update: mockUpdate
    }));
    
    mockCollection = jest.fn((collectionName) => {
      if (collectionName === 'mail') {
        return { add: mockAdd };
      }
      if (collectionName === 'feedback') {
        return { doc: mockDoc };
      }
      return { doc: mockDoc, add: mockAdd };
    });
    
    mockDb.collection = mockCollection;

    const feedbackData = {
      type: 'bug',
      title: 'Test Bug',
      description: 'Test description',
      userId: 'non-existent-user',
      createdAt: new Date()
    };

    const mockSnap = createMockSnapshot(feedbackData);
    const mockContext = createMockContext('test-feedback-id');

    const result = await notifyFeedbackSubmission(
      mockSnap as functions.firestore.DocumentSnapshot,
      mockContext as unknown as functions.EventContext
    );

    expect(result).toBeNull();
    expect(mockAdd).toHaveBeenCalled();
    
    const emailCall = mockAdd.mock.calls[0][0];
    expect(emailCall.message.text).toContain('N/A');
  });

  test('handles different feedback types correctly', async () => {
    const feedbackTypes = [
      { type: 'bug', emoji: '🐛' },
      { type: 'feature', emoji: '💡' },
      { type: 'improvement', emoji: '⚡' },
      { type: 'general', emoji: '💭' }
    ];

    for (const { type, emoji } of feedbackTypes) {
      const feedbackData = {
        type,
        title: `Test ${type}`,
        description: `Test ${type} description`,
        createdAt: new Date()
      };

      const mockSnap = createMockSnapshot(feedbackData);
      const mockContext = createMockContext(`${type}-feedback-id`);

      await notifyFeedbackSubmission(
        mockSnap as functions.firestore.DocumentSnapshot,
        mockContext as unknown as functions.EventContext
      );

      const emailCall = mockAdd.mock.calls[mockAdd.mock.calls.length - 1][0];
      expect(emailCall.message.subject).toContain(emoji);
    }
  });

  test('handles different severity levels', async () => {
    const severities = ['low', 'medium', 'high', 'critical'];
    
    for (const severity of severities) {
      const feedbackData = {
        type: 'bug',
        severity,
        title: 'Test Bug',
        description: 'Test description',
        createdAt: new Date()
      };

      const mockSnap = createMockSnapshot(feedbackData);
      const mockContext = createMockContext(`${severity}-bug-id`);

      await notifyFeedbackSubmission(
        mockSnap as functions.firestore.DocumentSnapshot,
        mockContext as unknown as functions.EventContext
      );

      const emailCall = mockAdd.mock.calls[mockAdd.mock.calls.length - 1][0];
      expect(emailCall.message.html).toContain(severity.toUpperCase());
    }
  });

  test('includes all bug report fields in email', async () => {
    const feedbackData = {
      type: 'bug',
      severity: 'high',
      title: 'Complex Bug Report',
      description: 'Detailed bug description',
      stepsToReproduce: '1. Do this\n2. Do that\n3. Bug occurs',
      expectedBehavior: 'Should work correctly',
      actualBehavior: 'Does not work',
      rating: 2,
      userId: 'test-user',
      createdAt: new Date()
    };

    const mockSnap = createMockSnapshot(feedbackData);
    const mockContext = createMockContext('complex-bug-id');

    await notifyFeedbackSubmission(
      mockSnap as functions.firestore.DocumentSnapshot,
      mockContext as unknown as functions.EventContext
    );

    const emailCall = mockAdd.mock.calls[0][0];
    expect(emailCall.message.html).toContain('Steps to Reproduce:');
    expect(emailCall.message.html).toContain('Expected Behavior:');
    expect(emailCall.message.html).toContain('Actual Behavior:');
    expect(emailCall.message.html).toContain('⭐⭐ (2/5)');
  });

  test('handles empty feedback data', async () => {
    const mockSnap = createMockSnapshot(null);
    const mockContext = createMockContext('empty-feedback-id');

    const result = await notifyFeedbackSubmission(
      mockSnap as functions.firestore.DocumentSnapshot,
      mockContext as unknown as functions.EventContext
    );

    expect(result).toBeNull();
    expect(mockAdd).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('No feedback data found:', null);
  });

  test('handles database errors gracefully', async () => {
    const feedbackData = {
      type: 'bug',
      title: 'Test Bug',
      description: 'Test description',
      createdAt: new Date()
    };

    // Mock database error
    mockAdd.mockRejectedValueOnce(new Error('Database error'));

    const mockSnap = createMockSnapshot(feedbackData);
    const mockContext = createMockContext('error-feedback-id');

    const result = await notifyFeedbackSubmission(
      mockSnap as functions.firestore.DocumentSnapshot,
      mockContext as unknown as functions.EventContext
    );

    expect(result).toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      'Error sending feedback notification email:',
      expect.any(Error)
    );
  });

  test('generates correct Firebase console link', async () => {
    const feedbackData = {
      type: 'bug',
      title: 'Test Bug',
      description: 'Test description',
      createdAt: new Date()
    };

    const mockSnap = createMockSnapshot(feedbackData);
    const mockContext = createMockContext('console-link-test-id');

    await notifyFeedbackSubmission(
      mockSnap as functions.firestore.DocumentSnapshot,
      mockContext as unknown as functions.EventContext
    );

    const emailCall = mockAdd.mock.calls[0][0];
    expect(emailCall.message.html).toContain(
      'https://console.firebase.google.com/project/mundo1-dev/firestore/data/feedback/console-link-test-id'
    );
  });

  test('formats timestamp correctly', async () => {
    const testDate = new Date('2023-01-01T12:00:00Z');
    const feedbackData = {
      type: 'bug',
      title: 'Test Bug',
      description: 'Test description',
      createdAt: {
        toDate: () => testDate
      }
    };

    const mockSnap = createMockSnapshot(feedbackData);
    const mockContext = createMockContext('timestamp-test-id');

    await notifyFeedbackSubmission(
      mockSnap as functions.firestore.DocumentSnapshot,
      mockContext as unknown as functions.EventContext
    );

    const emailCall = mockAdd.mock.calls[0][0];
    expect(emailCall.message.text).toContain(testDate.toLocaleString());
    expect(emailCall.message.html).toContain(testDate.toLocaleString());
  });
});
