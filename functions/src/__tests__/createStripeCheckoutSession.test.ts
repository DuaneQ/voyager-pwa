/**
 * Unit tests for createStripeCheckoutSession
 *
 * Covers authentication guard, Stripe customer creation, and session URL response.
 * Stripe SDK and Firestore are fully mocked; no real API calls are made.
 */

export {};

// ─── Mocks ─────────────────────────────────────────────────────────────────

const mockSessionCreate = jest.fn();
const mockCustomerCreate = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: { create: mockCustomerCreate },
    checkout: { sessions: { create: mockSessionCreate } },
  }));
});

const mockUserDocGet = jest.fn();
const mockUserDocUpdate = jest.fn().mockResolvedValue({});
const mockUserDocRef = jest.fn().mockReturnValue({
  get: mockUserDocGet,
  update: mockUserDocUpdate,
});
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

function makeContext(uid = 'user-123') {
  return { auth: { uid } };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

// Lazy-load after mocks are established
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let createStripeCheckoutSession: (data: any, context: any) => Promise<any>;

beforeAll(() => {
  process.env.STRIPE_API_KEY = 'sk_test_fake';
  process.env.STRIPE_PRICE_ID = 'price_test_fake';
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    createStripeCheckoutSession = require('../createStripeCheckoutSession').createStripeCheckoutSession;
  });
});

describe('createStripeCheckoutSession', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Auth ───────────────────────────────────────────────────────────────

  describe('authentication', () => {
    it('throws unauthenticated when no auth context', async () => {
      await expect(
        createStripeCheckoutSession({}, { auth: null })
      ).rejects.toThrow('User must be authenticated');
    });
  });

  // ─── Existing customer ──────────────────────────────────────────────────

  describe('existing Stripe customer', () => {
    it('reuses existing stripeCustomerId without creating a new customer', async () => {
      mockUserDocGet.mockResolvedValue(makeUserDoc({ stripeCustomerId: 'cus_existing' }));
      mockSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/existing' });

      const result = await createStripeCheckoutSession({}, makeContext());

      expect(mockCustomerCreate).not.toHaveBeenCalled();
      expect(result.url).toBe('https://checkout.stripe.com/pay/existing');
    });

    it('passes existing customer id to session create', async () => {
      mockUserDocGet.mockResolvedValue(makeUserDoc({ stripeCustomerId: 'cus_existing' }));
      mockSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/existing' });

      await createStripeCheckoutSession({}, makeContext());

      expect(mockSessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({ customer: 'cus_existing' })
      );
    });
  });

  // ─── New customer ────────────────────────────────────────────────────────

  describe('new Stripe customer', () => {
    it('creates Stripe customer when stripeCustomerId is absent', async () => {
      mockUserDocGet.mockResolvedValue(makeUserDoc({ stripeCustomerId: undefined }));
      mockCustomerCreate.mockResolvedValue({ id: 'cus_new' });
      mockSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/new' });

      const result = await createStripeCheckoutSession({}, makeContext());

      expect(mockCustomerCreate).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'user@test.com', metadata: { uid: 'user-123' } })
      );
      expect(result.url).toBe('https://checkout.stripe.com/pay/new');
    });

    it('saves new stripeCustomerId to Firestore', async () => {
      mockUserDocGet.mockResolvedValue(makeUserDoc({ stripeCustomerId: undefined }));
      mockCustomerCreate.mockResolvedValue({ id: 'cus_new' });
      mockSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/new' });

      await createStripeCheckoutSession({}, makeContext());

      expect(mockUserDocUpdate).toHaveBeenCalledWith({ stripeCustomerId: 'cus_new' });
    });
  });

  // ─── Origin / redirect URLs ─────────────────────────────────────────────

  describe('redirect URLs', () => {
    it('uses default travalpass.com origin when none provided', async () => {
      mockUserDocGet.mockResolvedValue(makeUserDoc());
      mockSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/x' });

      await createStripeCheckoutSession({}, makeContext());

      expect(mockSessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: expect.stringContaining('travalpass.com'),
          cancel_url: expect.stringContaining('travalpass.com'),
        })
      );
    });

    it('uses client-provided http origin for redirect URLs', async () => {
      mockUserDocGet.mockResolvedValue(makeUserDoc());
      mockSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/x' });

      await createStripeCheckoutSession(
        { origin: 'http://localhost:5173' },
        makeContext()
      );

      expect(mockSessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: expect.stringContaining('localhost:5173'),
          cancel_url: expect.stringContaining('localhost:5173'),
        })
      );
    });

    it('ignores non-http origin strings', async () => {
      mockUserDocGet.mockResolvedValue(makeUserDoc());
      mockSessionCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/pay/x' });

      await createStripeCheckoutSession(
        { origin: 'javascript:alert(1)' },
        makeContext()
      );

      expect(mockSessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: expect.stringContaining('travalpass.com'),
        })
      );
    });
  });
});
