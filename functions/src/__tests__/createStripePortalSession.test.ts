/**
 * Unit tests for createStripePortalSession
 *
 * Covers authentication guard, missing stripeCustomerId, portal session URL response,
 * and custom origin redirect URL handling.
 * Stripe SDK and Firestore are fully mocked; no real API calls are made.
 */

export {};

// ─── Mocks ─────────────────────────────────────────────────────────────────

const mockPortalSessionCreate = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    billingPortal: { sessions: { create: mockPortalSessionCreate } },
  }));
});

const mockUserDocGet = jest.fn();
const mockUserDocRef = jest.fn().mockReturnValue({ get: mockUserDocGet });
const mockCollection = jest.fn().mockReturnValue({ doc: mockUserDocRef });

jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  firestore: jest.fn(() => ({ collection: mockCollection })),
}));

jest.mock('firebase-functions/v1', () => ({
  https: {
    HttpsError: class HttpsError extends Error {
      constructor(public code: string, message: string) {
        super(message);
        this.name = 'HttpsError';
      }
    },
    onCall: jest.fn((fn: unknown) => fn),
  },
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeUserDoc(overrides: Record<string, unknown> = {}) {
  return {
    exists: true,
    data: () => ({
      email: 'user@test.com',
      stripeCustomerId: 'cus_existing',
      ...overrides,
    }),
  };
}

function makeContext(uid = 'user-456') {
  return { auth: { uid } };
}

// ─── Module lazy-loaded after mocks ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let createStripePortalSession: (data: any, context: any) => Promise<any>;

beforeAll(() => {
  process.env.STRIPE_API_KEY = 'sk_test_fake';
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    createStripePortalSession = require('../createStripePortalSession').createStripePortalSession;
  });
});

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('createStripePortalSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Auth ───────────────────────────────────────────────────────────────

  describe('authentication', () => {
    it('throws when no auth context', async () => {
      await expect(
        createStripePortalSession({}, { auth: null })
      ).rejects.toThrow('User must be authenticated');
    });
  });

  // ─── Missing customer ────────────────────────────────────────────────────

  describe('missing Stripe customer', () => {
    it('throws not-found when user has no stripeCustomerId', async () => {
      mockUserDocGet.mockResolvedValue(makeUserDoc({ stripeCustomerId: undefined }));

      await expect(
        createStripePortalSession({}, makeContext())
      ).rejects.toThrow('Stripe customer ID not found');
    });

    it('throws not-found when user document has no data', async () => {
      mockUserDocGet.mockResolvedValue({ exists: false, data: () => null });

      await expect(
        createStripePortalSession({}, makeContext())
      ).rejects.toThrow('Stripe customer ID not found');
    });
  });

  // ─── Successful session ─────────────────────────────────────────────────

  describe('portal session creation', () => {
    it('returns portal session URL', async () => {
      mockUserDocGet.mockResolvedValue(makeUserDoc());
      mockPortalSessionCreate.mockResolvedValue({
        url: 'https://billing.stripe.com/session/test',
      });

      const result = await createStripePortalSession({}, makeContext());

      expect(result.url).toBe('https://billing.stripe.com/session/test');
    });

    it('passes stripeCustomerId to Stripe portal session create', async () => {
      mockUserDocGet.mockResolvedValue(makeUserDoc({ stripeCustomerId: 'cus_abc' }));
      mockPortalSessionCreate.mockResolvedValue({ url: 'https://billing.stripe.com/x' });

      await createStripePortalSession({}, makeContext());

      expect(mockPortalSessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({ customer: 'cus_abc' })
      );
    });
  });

  // ─── Return URL ──────────────────────────────────────────────────────────

  describe('return URL', () => {
    it('defaults to travalpass.com when no origin provided', async () => {
      mockUserDocGet.mockResolvedValue(makeUserDoc());
      mockPortalSessionCreate.mockResolvedValue({ url: 'https://billing.stripe.com/x' });

      await createStripePortalSession({}, makeContext());

      expect(mockPortalSessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          return_url: expect.stringContaining('travalpass.com'),
        })
      );
    });

    it('uses provided http origin for return URL', async () => {
      mockUserDocGet.mockResolvedValue(makeUserDoc());
      mockPortalSessionCreate.mockResolvedValue({ url: 'https://billing.stripe.com/x' });

      await createStripePortalSession(
        { origin: 'http://localhost:5173' },
        makeContext()
      );

      expect(mockPortalSessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          return_url: expect.stringContaining('localhost:5173'),
        })
      );
    });

    it('ignores non-http origin strings', async () => {
      mockUserDocGet.mockResolvedValue(makeUserDoc());
      mockPortalSessionCreate.mockResolvedValue({ url: 'https://billing.stripe.com/x' });

      await createStripePortalSession(
        { origin: 'javascript:void(0)' },
        makeContext()
      );

      expect(mockPortalSessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          return_url: expect.stringContaining('travalpass.com'),
        })
      );
    });
  });
});
