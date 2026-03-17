/**
 * Unit tests for sendContactInvite
 *
 * Covers authentication guard, input validation (contactIdentifier hash format,
 * inviteMethod enum), daily rate limiting, duplicate-invite deduplication, and
 * successful invite creation.
 * Firestore and crypto are mocked; no real API calls are made.
 */

export {};

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Valid 64-char lowercase hex SHA-256-shaped string */
function validHash(seed = '0') {
  return seed.padEnd(64, '0');
}

// ─── Mocks ─────────────────────────────────────────────────────────────────

const mockCountGet = jest.fn();
const mockCount = jest.fn().mockReturnValue({ get: mockCountGet });

const mockRecentInviteGet = jest.fn();
const mockLimit = jest.fn().mockReturnValue({ get: mockRecentInviteGet });

const mockAdd = jest.fn().mockResolvedValue({});
const mockUpdate = jest.fn().mockResolvedValue({});
const mockDocRef = jest.fn().mockReturnValue({ update: mockUpdate });

// where chain: .where().where().where().count() or .limit()
// We need to return both .count() and .limit() from the same chain object.
const mockWhereChain = {
  where: jest.fn().mockReturnThis() as jest.Mock,
  count: mockCount,
  limit: mockLimit,
};
mockWhereChain.where.mockReturnValue(mockWhereChain);

const mockCollection = jest.fn((name: string) => {
  if (name === 'users') return { doc: mockDocRef };
  // contactInvites
  return { where: mockWhereChain.where, add: mockAdd };
});

jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  firestore: Object.assign(
    jest.fn(() => ({ collection: mockCollection })),
    {
      Timestamp: { fromDate: jest.fn((d: Date) => d) },
      FieldValue: {
        serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
        increment: jest.fn((n: number) => ({ _increment: n })),
      },
    }
  ),
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

// ─── Module lazy-loaded via isolateModules ─────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sendContactInvite: (data: any, context: any) => Promise<any>;

beforeAll(() => {
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    sendContactInvite = require('../sendContactInvite').sendContactInvite;
  });
});

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('sendContactInvite', () => {
  const authedContext = { auth: { uid: 'user-123' } };
  const validPayload = { contactIdentifier: validHash('a'), inviteMethod: 'sms' };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: under rate limit (0 invites today)
    mockCountGet.mockResolvedValue({ data: () => ({ count: 0 }) });
    // Default: no recent duplicate invite
    mockRecentInviteGet.mockResolvedValue({ empty: true, docs: [] });
  });

  // ─── Auth ──────────────────────────────────────────────────────────────

  describe('authentication', () => {
    it('throws when no auth context', async () => {
      await expect(
        sendContactInvite(validPayload, { auth: null })
      ).rejects.toThrow('User must be authenticated');
    });
  });

  // ─── Input validation ──────────────────────────────────────────────────

  describe('input validation', () => {
    it('throws when contactIdentifier is missing', async () => {
      await expect(
        sendContactInvite({ inviteMethod: 'sms' }, authedContext)
      ).rejects.toThrow('contactIdentifier is required');
    });

    it('throws when contactIdentifier is not a string', async () => {
      await expect(
        sendContactInvite({ contactIdentifier: 123, inviteMethod: 'sms' }, authedContext)
      ).rejects.toThrow('contactIdentifier is required');
    });

    it('throws when contactIdentifier is not a valid SHA-256 hash', async () => {
      await expect(
        sendContactInvite({ contactIdentifier: 'short', inviteMethod: 'sms' }, authedContext)
      ).rejects.toThrow('SHA-256 hash');
    });

    it('throws when inviteMethod is invalid', async () => {
      await expect(
        sendContactInvite({ contactIdentifier: validHash('b'), inviteMethod: 'carrier_pigeon' }, authedContext)
      ).rejects.toThrow('inviteMethod must be one of');
    });

    it('accepts all valid inviteMethod values', async () => {
      for (const method of ['sms', 'email', 'link', 'share']) {
        mockCountGet.mockResolvedValue({ data: () => ({ count: 0 }) });
        mockRecentInviteGet.mockResolvedValue({ empty: true, docs: [] });

        const result = await sendContactInvite(
          { contactIdentifier: validHash('c'), inviteMethod: method },
          authedContext
        );
        expect(result.success).toBe(true);
      }
    });
  });

  // ─── Rate limiting ─────────────────────────────────────────────────────

  describe('rate limiting', () => {
    it('throws resource-exhausted when 100 invites already sent today', async () => {
      mockCountGet.mockResolvedValue({ data: () => ({ count: 100 }) });

      await expect(
        sendContactInvite(validPayload, authedContext)
      ).rejects.toThrow('Daily invite limit reached');
    });

    it('allows exactly 99 invites (boundary)', async () => {
      mockCountGet.mockResolvedValue({ data: () => ({ count: 99 }) });
      mockRecentInviteGet.mockResolvedValue({ empty: true, docs: [] });

      const result = await sendContactInvite(validPayload, authedContext);

      expect(result.success).toBe(true);
    });
  });

  // ─── Duplicate detection ───────────────────────────────────────────────

  describe('duplicate invite prevention', () => {
    it('returns existing referral code when same contact was invited within 7 days', async () => {
      mockRecentInviteGet.mockResolvedValue({
        empty: false,
        docs: [{ data: () => ({ referralCode: 'EXISTING01' }) }],
      });

      const result = await sendContactInvite(validPayload, authedContext);

      expect(result.success).toBe(true);
      expect(result.referralCode).toBe('EXISTING01');
      // Should not write a new record
      expect(mockAdd).not.toHaveBeenCalled();
    });
  });

  // ─── Successful invite ─────────────────────────────────────────────────

  describe('successful invite creation', () => {
    it('returns success with referralCode and inviteLink', async () => {
      const result = await sendContactInvite(validPayload, authedContext);

      expect(result.success).toBe(true);
      expect(result.referralCode).toBeDefined();
      expect(typeof result.referralCode).toBe('string');
      expect(result.inviteLink).toBe('https://travalpass.com');
    });

    it('writes invite record to Firestore contactInvites collection', async () => {
      await sendContactInvite(validPayload, authedContext);

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          inviterUserId: 'user-123',
          contactIdentifier: validHash('a'),
          inviteMethod: 'sms',
          referralCode: expect.any(String),
          status: 'sent',
        })
      );
    });

    it('increments user invite analytics', async () => {
      await sendContactInvite(validPayload, authedContext);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          'analytics.totalInvitesSent': expect.anything(),
        })
      );
    });
  });
});
