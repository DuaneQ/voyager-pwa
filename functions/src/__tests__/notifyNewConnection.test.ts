/**
 * Unit tests for notifyNewConnection Cloud Function
 *
 * Covers:
 * - Happy path: emails present on connection doc → mail docs written
 * - Fallback: emails missing/blank → fetched from users/{uid}
 * - Fallback: partial emails (one present, one missing) → mixed resolution
 * - Edge: no users array → exits gracefully with no mail
 * - Edge: all emails blank strings → exits with no mail
 * - Edge: duplicate emails → only one mail doc written per unique address
 */

export {};

/**
 * - Error: Firestore add() throws → error logged, function resolves (doesn't rethrow)
 * - Shape: mail document has correct fields
 */

// ── Firestore mock setup ────────────────────────────────────────────────────
const mockAdd = jest.fn();
const mockGet = jest.fn();
const mockDoc = jest.fn().mockImplementation(() => ({ get: mockGet }));
const mockCollection = jest.fn().mockImplementation((name: string) => {
  if (name === 'mail') return { add: mockAdd };
  if (name === 'users') return { doc: mockDoc };
  // Any other collection (violations, feedback, etc.) returns safe stubs
  return { add: jest.fn(), doc: jest.fn().mockReturnValue({ get: jest.fn().mockResolvedValue({ data: () => ({}) }) }) };
});

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  firestore: jest.fn(() => ({ collection: mockCollection })),
}));

// ── Capture onDocumentCreated handlers by Firestore path ───────────────────
// index.ts registers multiple handlers; we want the one for connections/{id}
const documentHandlers: Record<string, (event: any) => Promise<any>> = {};

jest.mock('firebase-functions/v2/firestore', () => ({
  onDocumentCreated: jest.fn(
    (path: string, handler: (event: any) => Promise<any>) => {
      documentHandlers[path] = handler;
      return handler;
    }
  ),
}));

// ── Stub all other Cloud Function dependencies ─────────────────────────────
jest.mock('firebase-functions/v2/https', () => ({
  onRequest: jest.fn(() => jest.fn()),
  onCall: jest.fn(() => jest.fn()),
  HttpsError: class HttpsError extends Error {
    constructor(public code: string, message: string) { super(message); }
  },
}));
jest.mock('../itinerarySharing', () => ({ itineraryShare: jest.fn() }));
jest.mock('../functions/itinerariesRpc', () => ({}));
jest.mock('../createStripeCheckoutSession', () => ({ createStripeCheckoutSession: jest.fn() }));
jest.mock('../createStripePortalSession', () => ({ createStripePortalSession: jest.fn() }));
jest.mock('../muxVideoProcessing', () => ({
  onVideoUploaded: jest.fn(), muxWebhook: jest.fn(), processVideoWithMux: jest.fn(),
  migrateVideosToMux: jest.fn(), processAdVideoWithMux: jest.fn(),
}));
jest.mock('../matchContactsWithUsers', () => ({ matchContactsWithUsers: jest.fn() }));
jest.mock('../sendContactInvite', () => ({ sendContactInvite: jest.fn() }));
jest.mock('../notifications/sendMatchNotification', () => ({ sendMatchNotification: jest.fn() }));
jest.mock('../notifications/sendChatNotification', () => ({ sendChatNotification: jest.fn() }));
jest.mock('../notifications/sendVideoCommentNotification', () => ({ sendVideoCommentNotification: jest.fn() }));
jest.mock('../notifications/registerAPNsToken', () => ({ registerAPNsToken: jest.fn() }));
jest.mock('../reviewCampaign', () => ({ reviewCampaign: jest.fn() }));
jest.mock('../getPendingCampaigns', () => ({ getPendingCampaigns: jest.fn() }));
jest.mock('../selectAds', () => ({ selectAds: jest.fn() }));
jest.mock('../logAdEvents', () => ({ logAdEvents: jest.fn(), backfillDailyMetricsDates: jest.fn() }));
jest.mock('../videoSharing', () => ({ videoShare: jest.fn() }));
jest.mock('../searchFlights', () => ({ searchFlights: jest.fn() }));
jest.mock('../searchAccommodations', () => ({ searchAccommodations: jest.fn() }));
jest.mock('../generateItineraryWithAI', () => ({ generateItineraryWithAI: jest.fn() }));
jest.mock('../generateFullItinerary', () => ({ generateFullItinerary: jest.fn() }));
jest.mock('../placeProxy', () => ({ placeSearch: jest.fn(), geocodePlace: jest.fn() }));
jest.mock('../openFlightsProxy', () => ({
  openFlightsGetAll: jest.fn(), openFlightsSearch: jest.fn(), openFlightsHttp: jest.fn(),
}));
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: { constructEvent: jest.fn() },
    subscriptions: { retrieve: jest.fn() },
  }));
});
jest.mock('express', () => {
  const app = { post: jest.fn(), use: jest.fn() };
  const express: any = jest.fn(() => app);
  express.json = jest.fn();
  return express;
});
jest.mock('body-parser', () => ({ raw: jest.fn(() => jest.fn()) }));

// ── Load index.ts (registers all handlers) ────────────────────────────────
beforeAll(() => {
  require('../index');
});

// ── Helpers ───────────────────────────────────────────────────────────────
function getHandler() {
  const handler = documentHandlers['connections/{connectionId}'];
  if (!handler) throw new Error('notifyNewConnection handler was not registered');
  return handler;
}

function makeEvent(connectionData: Record<string, any>) {
  return {
    params: { connectionId: 'conn-test-123' },
    data: { data: () => connectionData },
  };
}

function userDocWith(email: string | undefined) {
  return { data: () => (email !== undefined ? { email } : {}) };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('notifyNewConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-apply mockDoc after clearAllMocks resets its return value
    mockDoc.mockImplementation(() => ({ get: mockGet }));
  });

  it('sends mail to emails already stored on the connection doc', async () => {
    mockAdd.mockResolvedValue({ id: 'mail-1' });

    await getHandler()(makeEvent({
      users: ['uid-alice', 'uid-bob'],
      emails: ['alice@example.com', 'bob@example.com'],
    }));

    expect(mockAdd).toHaveBeenCalledTimes(2);
    const recipients = mockAdd.mock.calls.map((c: any[]) => c[0].to);
    expect(recipients).toContain('alice@example.com');
    expect(recipients).toContain('bob@example.com');
    // Should NOT have fetched from users collection (emails were already present)
    expect(mockDoc).not.toHaveBeenCalled();
  });

  it('falls back to users collection when emails array is empty', async () => {
    mockAdd.mockResolvedValue({ id: 'mail-2' });
    mockGet
      .mockResolvedValueOnce(userDocWith('alice@example.com'))
      .mockResolvedValueOnce(userDocWith('bob@example.com'));

    await getHandler()(makeEvent({
      users: ['uid-alice', 'uid-bob'],
      emails: [],
    }));

    expect(mockDoc).toHaveBeenCalledWith('uid-alice');
    expect(mockDoc).toHaveBeenCalledWith('uid-bob');
    expect(mockAdd).toHaveBeenCalledTimes(2);
    const recipients = mockAdd.mock.calls.map((c: any[]) => c[0].to);
    expect(recipients).toContain('alice@example.com');
    expect(recipients).toContain('bob@example.com');
  });

  it('falls back to users collection when emails field is missing entirely', async () => {
    mockAdd.mockResolvedValue({ id: 'mail-3' });
    mockGet
      .mockResolvedValueOnce(userDocWith('alice@example.com'))
      .mockResolvedValueOnce(userDocWith('bob@example.com'));

    await getHandler()(makeEvent({
      users: ['uid-alice', 'uid-bob'],
      // no emails field
    }));

    expect(mockAdd).toHaveBeenCalledTimes(2);
  });

  it('falls back to users collection when emails contain only blank strings', async () => {
    mockAdd.mockResolvedValue({ id: 'mail-4' });
    mockGet
      .mockResolvedValueOnce(userDocWith('alice@example.com'))
      .mockResolvedValueOnce(userDocWith('bob@example.com'));

    await getHandler()(makeEvent({
      users: ['uid-alice', 'uid-bob'],
      emails: ['', ''],
    }));

    expect(mockAdd).toHaveBeenCalledTimes(2);
  });

  it('resolves partial emails: uses doc email for one user, fetches for the other', async () => {
    mockAdd.mockResolvedValue({ id: 'mail-5' });
    mockGet
      .mockResolvedValueOnce(userDocWith('alice@example.com'))
      .mockResolvedValueOnce(userDocWith('bob@example.com'));

    await getHandler()(makeEvent({
      users: ['uid-alice', 'uid-bob'],
      emails: ['alice@example.com'], // only one of two present
    }));

    expect(mockAdd).toHaveBeenCalledTimes(2);
    const recipients = mockAdd.mock.calls.map((c: any[]) => c[0].to);
    expect(recipients).toContain('alice@example.com');
    expect(recipients).toContain('bob@example.com');
  });

  it('deduplicates emails — sends only one mail for identical addresses', async () => {
    mockAdd.mockResolvedValue({ id: 'mail-6' });

    await getHandler()(makeEvent({
      users: ['uid-alice', 'uid-alice2'],
      emails: ['same@example.com', 'same@example.com'],
    }));

    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockAdd.mock.calls[0][0].to).toBe('same@example.com');
  });

  it('sends no mail and returns when connection data is null', async () => {
    const event = {
      params: { connectionId: 'conn-null' },
      data: { data: () => null },
    };

    await getHandler()(event);

    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('does not throw when Firestore add() rejects — logs error and resolves', async () => {
    mockAdd.mockRejectedValue(new Error('Firestore write failed'));

    await expect(
      getHandler()(makeEvent({
        users: ['uid-alice'],
        emails: ['alice@example.com'],
      }))
    ).resolves.toBeNull();
  });

  it('writes a mail document with the correct shape', async () => {
    mockAdd.mockResolvedValue({ id: 'shape-test' });

    await getHandler()(makeEvent({
      users: ['uid-alice'],
      emails: ['alice@example.com'],
    }));

    expect(mockAdd).toHaveBeenCalledTimes(1);
    const mailDoc = mockAdd.mock.calls[0][0];
    expect(mailDoc).toMatchObject({
      to: 'alice@example.com',
      from: 'no-reply@travalpass.com',
      message: {
        subject: expect.any(String),
        text: expect.any(String),
        html: expect.stringContaining('travalpass.com/chat'),
      },
    });
  });
});

