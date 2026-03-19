/**
 * Unit tests for matchContactsWithUsers
 *
 * Covers authentication guard, input validation (array type, size limit,
 * hash format), empty list fast-path, successful matching, duplicate
 * supression, and self-match exclusion.
 * Firestore is fully mocked; no real DB reads are made.
 */

export {};

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Returns a valid 64-char lowercase hex SHA-256-shaped string */
function validHash(seed = '0') {
  return seed.padEnd(64, '0');
}

function makeForEachDocs(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    forEach: (cb: (doc: { id: string; data: () => Record<string, unknown> }) => void) => {
      docs.forEach(d => cb({ id: d.id, data: () => d.data }));
    },
  };
}

// ─── Mocks ─────────────────────────────────────────────────────────────────

// Build select / where / get chain
const mockGet = jest.fn();
const mockSelect = jest.fn().mockReturnValue({ get: mockGet });
const mockWhere = jest.fn().mockReturnValue({ select: mockSelect });
const mockAdd = jest.fn().mockResolvedValue({});

const mockCollection = jest.fn((name: string) => {
  if (name === 'contactSyncs') return { add: mockAdd };
  return { where: mockWhere };
});

jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  firestore: Object.assign(
    jest.fn(() => ({ collection: mockCollection })),
    {
      FieldValue: { serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP') },
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

// ─── Import ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let matchContactsWithUsers: (data: any, context: any) => Promise<any>;

beforeAll(() => {
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    matchContactsWithUsers = require('../matchContactsWithUsers').matchContactsWithUsers;
  });
});

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('matchContactsWithUsers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: all queries return empty results
    mockGet.mockResolvedValue(makeForEachDocs([]));
  });

  const authedContext = { auth: { uid: 'self-uid' } };

  // ─── Auth ──────────────────────────────────────────────────────────────

  describe('authentication', () => {
    it('throws unauthenticated when no auth context', async () => {
      await expect(
        matchContactsWithUsers({ hashedIdentifiers: [validHash()] }, { auth: null })
      ).rejects.toThrow('User must be authenticated');
    });
  });

  // ─── Input validation ──────────────────────────────────────────────────

  describe('input validation', () => {
    it('throws invalid-argument when hashedIdentifiers is missing', async () => {
      await expect(
        matchContactsWithUsers({} as any, authedContext)
      ).rejects.toThrow('hashedIdentifiers must be an array');
    });

    it('throws invalid-argument when hashedIdentifiers is not an array', async () => {
      await expect(
        matchContactsWithUsers({ hashedIdentifiers: 'not-an-array' } as any, authedContext)
      ).rejects.toThrow('hashedIdentifiers must be an array');
    });

    it('returns empty result immediately for empty array', async () => {
      const result = await matchContactsWithUsers({ hashedIdentifiers: [] }, authedContext);

      expect(result).toEqual({
        success: true,
        matches: [],
        totalHashes: 0,
        totalMatches: 0,
      });
      // No Firestore queries issued
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('throws invalid-argument when more than 1000 hashes provided', async () => {
      const hashes = Array.from({ length: 1001 }, (_, i) => validHash(String(i)));

      await expect(
        matchContactsWithUsers({ hashedIdentifiers: hashes }, authedContext)
      ).rejects.toThrow('Maximum 1000 identifiers per request');
    });

    it('throws invalid-argument when any hash is not 64 hex characters', async () => {
      await expect(
        matchContactsWithUsers(
          { hashedIdentifiers: ['not-a-valid-hash'] },
          authedContext
        )
      ).rejects.toThrow('Invalid hash format');
    });

    it('throws when hash has correct length but non-hex characters', async () => {
      const badHash = 'z'.repeat(64); // 64 chars but not hex
      await expect(
        matchContactsWithUsers({ hashedIdentifiers: [badHash] }, authedContext)
      ).rejects.toThrow('Invalid hash format');
    });
  });

  // ─── Matching logic ────────────────────────────────────────────────────

  describe('contact matching', () => {
    const hash1 = validHash('a');
    const hash2 = validHash('b');

    it('returns matches found via phoneHash query', async () => {
      mockGet
        .mockResolvedValueOnce(
          makeForEachDocs([
            { id: 'user-abc', data: { displayName: 'Alice', phoneHash: hash1, username: 'alice' } },
          ])
        )
        .mockResolvedValue(makeForEachDocs([])); // emailHash query → empty

      const result = await matchContactsWithUsers({ hashedIdentifiers: [hash1] }, authedContext);

      expect(result.success).toBe(true);
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0]).toMatchObject({ userId: 'user-abc', displayName: 'Alice', hash: hash1 });
    });

    it('returns matches found via emailHash query', async () => {
      mockGet
        .mockResolvedValueOnce(makeForEachDocs([])) // phoneHash query → empty
        .mockResolvedValueOnce(
          makeForEachDocs([
            { id: 'user-xyz', data: { displayName: 'Bob', emailHash: hash2, username: 'bob' } },
          ])
        );

      const result = await matchContactsWithUsers({ hashedIdentifiers: [hash2] }, authedContext);

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].userId).toBe('user-xyz');
    });

    it('deduplicates users found via both phone and email queries', async () => {
      // Same user found in both phoneHash and emailHash queries
      mockGet
        .mockResolvedValueOnce(
          makeForEachDocs([{ id: 'user-dup', data: { displayName: 'Carol', phoneHash: hash1 } }])
        )
        .mockResolvedValueOnce(
          makeForEachDocs([{ id: 'user-dup', data: { displayName: 'Carol', emailHash: hash1 } }])
        );

      const result = await matchContactsWithUsers({ hashedIdentifiers: [hash1] }, authedContext);

      expect(result.matches).toHaveLength(1);
    });

    it('excludes the calling user from matches (self-match prevention)', async () => {
      mockGet
        .mockResolvedValueOnce(
          makeForEachDocs([{ id: 'self-uid', data: { displayName: 'Me', phoneHash: hash1 } }])
        )
        .mockResolvedValue(makeForEachDocs([]));

      const result = await matchContactsWithUsers({ hashedIdentifiers: [hash1] }, authedContext);

      expect(result.matches).toHaveLength(0);
    });

    it('returns correct totalHashes and totalMatches counts', async () => {
      mockGet
        .mockResolvedValueOnce(
          makeForEachDocs([{ id: 'user-1', data: { displayName: 'D1', phoneHash: hash1 } }])
        )
        .mockResolvedValue(makeForEachDocs([]));

      const result = await matchContactsWithUsers(
        { hashedIdentifiers: [hash1, hash2] },
        authedContext
      );

      expect(result.totalHashes).toBe(2);
      expect(result.totalMatches).toBe(1);
    });

    it('falls back to "TravalPass User" when displayName is absent', async () => {
      mockGet
        .mockResolvedValueOnce(
          makeForEachDocs([{ id: 'user-nd', data: { phoneHash: hash1 } }])
        )
        .mockResolvedValue(makeForEachDocs([]));

      const result = await matchContactsWithUsers({ hashedIdentifiers: [hash1] }, authedContext);

      expect(result.matches[0].displayName).toBe('TravalPass User');
    });
  });
});
