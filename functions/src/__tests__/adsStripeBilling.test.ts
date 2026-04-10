/**
 * Unit tests for adsStripeBilling
 *
 * Covers:
 * - createAdsCampaignCheckoutSession callable guards and session creation
 * - applyAdsCheckoutSessionCompleted webhook fulfillment behavior
 */

export {};

const mockSessionCreate = jest.fn();
const mockCustomerCreate = jest.fn();

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: { create: mockCustomerCreate },
    checkout: { sessions: { create: mockSessionCreate } },
  }));
});

const campaignStore = new Map<string, any>();
const userStore = new Map<string, any>();

const mockServerTimestamp = jest.fn(() => 'SERVER_TS');

function makeDocStore(store: Map<string, any>, id: string) {
  return {
    get: jest.fn(async () => ({
      exists: store.has(id),
      data: () => store.get(id),
    })),
    set: jest.fn(async (data: any, options?: { merge?: boolean }) => {
      const prev = store.get(id) ?? {};
      store.set(id, options?.merge ? { ...prev, ...data } : data);
      return {};
    }),
    update: jest.fn(async (data: any) => {
      const prev = store.get(id) ?? {};
      store.set(id, { ...prev, ...data });
      return {};
    }),
  };
}

const firestoreImpl = {
  collection: jest.fn((name: string) => ({
    doc: jest.fn((id: string) => {
      if (name === 'ads_campaigns') return makeDocStore(campaignStore, id);
      if (name === 'users') return makeDocStore(userStore, id);
      return makeDocStore(new Map<string, any>(), id);
    }),
  })),
};

const firestoreFactory: any = jest.fn(() => firestoreImpl);
firestoreFactory.FieldValue = {
  serverTimestamp: mockServerTimestamp,
};

jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  firestore: firestoreFactory,
}));

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: class HttpsError extends Error {
    constructor(public code: string, message: string) {
      super(message);
      this.name = 'HttpsError';
    }
  },
  onCall: jest.fn((opts: unknown, fn?: unknown) => {
    if (typeof opts === 'function') return opts;
    return fn;
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let createAdsCampaignCheckoutSession: (request: any) => Promise<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let applyAdsCheckoutSessionCompleted: (session: any, db?: any) => Promise<boolean>;

beforeAll(() => {
  process.env.STRIPE_API_KEY = 'sk_test_fake';
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../adsStripeBilling');
    createAdsCampaignCheckoutSession = mod.createAdsCampaignCheckoutSession;
    applyAdsCheckoutSessionCompleted = mod.applyAdsCheckoutSessionCompleted;
  });
});

beforeEach(() => {
  campaignStore.clear();
  userStore.clear();
  jest.clearAllMocks();
});

describe('createAdsCampaignCheckoutSession', () => {
  it('requires authentication', async () => {
    await expect(
      createAdsCampaignCheckoutSession({ data: { campaignId: 'camp1' }, auth: null })
    ).rejects.toThrow('User must be authenticated');
  });

  it('creates one-time checkout session and marks campaign checkout_created', async () => {
    campaignStore.set('camp1', { uid: 'user-123', budgetAmount: '100' });

    mockSessionCreate.mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/pay/cs_test_123',
    });

    const result = await createAdsCampaignCheckoutSession({
      auth: { uid: 'user-123' },
      data: { campaignId: 'camp1', origin: 'http://localhost:5173' },
    });

    expect(result).toEqual({
      url: 'https://checkout.stripe.com/pay/cs_test_123',
      sessionId: 'cs_test_123',
    });

    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        customer_creation: 'always',
        allow_promotion_codes: true,
        client_reference_id: 'camp1',
        metadata: expect.objectContaining({
          flow: 'ads',
          uid: 'user-123',
          campaignId: 'camp1',
          paymentRequiredCents: '10000',
        }),
      })
    );

    expect(mockCustomerCreate).not.toHaveBeenCalled();

    expect(campaignStore.get('camp1')).toEqual(
      expect.objectContaining({
        paymentStatus: 'checkout_created',
        paymentRequiredCents: 10000,
        paymentCurrency: 'usd',
        paymentSessionId: 'cs_test_123',
      })
    );
  });

  it('passes auth email to checkout when available', async () => {
    campaignStore.set('camp2', { uid: 'user-456', budgetAmount: '25' });
    mockSessionCreate.mockResolvedValue({
      id: 'cs_test_new',
      url: 'https://checkout.stripe.com/pay/cs_test_new',
    });

    await createAdsCampaignCheckoutSession({
      auth: { uid: 'user-456', token: { email: 'new@test.com' } },
      data: { campaignId: 'camp2' },
    });

    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_email: 'new@test.com',
      })
    );

    expect(mockCustomerCreate).not.toHaveBeenCalled();
  });

  it('rejects non-owner campaign access', async () => {
    campaignStore.set('camp3', { uid: 'owner-1', budgetAmount: '15' });

    await expect(
      createAdsCampaignCheckoutSession({
        auth: { uid: 'owner-2' },
        data: { campaignId: 'camp3' },
      })
    ).rejects.toThrow('You do not own this campaign');
  });

  it('rejects campaigns with invalid budget amount', async () => {
    campaignStore.set('camp4', { uid: 'user-123', budgetAmount: '0' });

    await expect(
      createAdsCampaignCheckoutSession({
        auth: { uid: 'user-123' },
        data: { campaignId: 'camp4' },
      })
    ).rejects.toThrow('Campaign budget amount must be greater than zero');
  });

  it('rejects checkout when campaign is already paid', async () => {
    campaignStore.set('camp-already-paid', { uid: 'user-123', budgetAmount: '100', paymentStatus: 'paid' });

    await expect(
      createAdsCampaignCheckoutSession({
        auth: { uid: 'user-123' },
        data: { campaignId: 'camp-already-paid' },
      })
    ).rejects.toThrow('This campaign has already been paid');

    expect(mockSessionCreate).not.toHaveBeenCalled();
  });

  it('rejects checkout when dev project is configured with a live Stripe key', async () => {
    const previousProject = process.env.GCLOUD_PROJECT;
    const previousKey = process.env.STRIPE_API_KEY;

    process.env.GCLOUD_PROJECT = 'mundo1-dev';
    process.env.STRIPE_API_KEY = 'sk_live_should_not_be_used';

    campaignStore.set('camp-live-key', { uid: 'user-123', budgetAmount: '100' });

    await expect(
      createAdsCampaignCheckoutSession({
        auth: { uid: 'user-123' },
        data: { campaignId: 'camp-live-key' },
      })
    ).rejects.toThrow('Dev project cannot create checkout with a live Stripe key');

    process.env.GCLOUD_PROJECT = previousProject;
    process.env.STRIPE_API_KEY = previousKey;
  });
});

describe('applyAdsCheckoutSessionCompleted', () => {
  it('returns false when session is not ads flow', async () => {
    const result = await applyAdsCheckoutSessionCompleted({ metadata: { flow: 'premium' } });
    expect(result).toBe(false);
  });

  it('marks campaign paid and stores totals', async () => {
    campaignStore.set('campPaid', { uid: 'user-1', budgetAmount: '100' });

    const session = {
      id: 'cs_paid_1',
      currency: 'usd',
      amount_total: 7500,
      total_details: { amount_discount: 2500 },
      metadata: {
        flow: 'ads',
        campaignId: 'campPaid',
        paymentRequiredCents: '10000',
      },
    };

    const handled = await applyAdsCheckoutSessionCompleted(session as any);
    expect(handled).toBe(true);

    expect(campaignStore.get('campPaid')).toEqual(
      expect.objectContaining({
        paymentStatus: 'paid',
        paymentRequiredCents: 10000,
        paymentPaidCents: 7500,
        paymentDiscountCents: 2500,
        paymentCurrency: 'usd',
        paymentSessionId: 'cs_paid_1',
      })
    );
  });

  it('throws when paymentRequiredCents metadata is missing or invalid', async () => {
    await expect(
      applyAdsCheckoutSessionCompleted({
        id: 'cs_missing_metadata',
        metadata: {
          flow: 'ads',
          campaignId: 'camp1',
          // missing paymentRequiredCents
        },
      } as any)
    ).rejects.toThrow('Invalid paymentRequiredCents');
  });

  it('is idempotent when campaign is already paid', async () => {
    campaignStore.set('campAlreadyPaid', {
      uid: 'user-1',
      budgetAmount: '100',
      paymentStatus: 'paid',
      paymentSessionId: 'cs_original',
    });

    const session = {
      id: 'cs_duplicate',
      currency: 'usd',
      amount_total: 10000,
      metadata: {
        flow: 'ads',
        campaignId: 'campAlreadyPaid',
        paymentRequiredCents: '10000',
      },
    };

    const handled = await applyAdsCheckoutSessionCompleted(session as any);
    expect(handled).toBe(true);

    // Original payment session must NOT be overwritten
    expect(campaignStore.get('campAlreadyPaid')).toEqual(
      expect.objectContaining({
        paymentStatus: 'paid',
        paymentSessionId: 'cs_original',
      })
    );
  });
});
