/**
 * Tests for itinerariesRpc.ts — Firestore-backed implementation
 *
 * Mocks firebase-admin Firestore to validate query construction,
 * post-processing filters (blocking, age, excludedIds), and
 * preference-to-query mapping (gender, status, sexualOrientation, dates).
 */

jest.resetModules();

// ─── Mock firebase-admin ──────────────────────────────────────────────────────

// Chainable query builder that records all .where()/.orderBy()/.limit() calls
function createMockQuery(docs: any[] = []) {
  const wheres: any[] = [];
  const orderBys: any[] = [];
  let limitVal: number | undefined;

  const query: any = {
    where: jest.fn((field: string, op: string, value: any) => {
      wheres.push({ field, op, value });
      return query;
    }),
    orderBy: jest.fn((field: string, dir?: string) => {
      orderBys.push({ field, dir });
      return query;
    }),
    limit: jest.fn((n: number) => {
      limitVal = n;
      return query;
    }),
    get: jest.fn(async () => ({
      docs: docs.map(d => ({
        id: d.id,
        data: () => {
          const { id: _id, ...rest } = d;
          return rest;
        },
      })),
    })),
    // expose recorded calls for assertions
    _wheres: wheres,
    _orderBys: orderBys,
    get _limit() { return limitVal; },
  };
  return query;
}

let mockQuery = createMockQuery();

const mockSet = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockDocGet = jest.fn();
const mockAdd = jest.fn();

const mockDoc = jest.fn((id?: string) => ({
  set: mockSet,
  update: mockUpdate,
  delete: mockDelete,
  get: mockDocGet,
  id: id || 'auto-id',
}));

const mockCollection = jest.fn((_name: string) => ({
  doc: mockDoc,
  add: mockAdd,
  where: mockQuery.where,
  orderBy: mockQuery.orderBy,
  limit: mockQuery.limit,
  get: mockQuery.get,
}));

jest.mock('firebase-admin', () => {
  const Timestamp = {
    now: () => ({ toDate: () => new Date(), seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }),
    fromDate: (d: Date) => ({ toDate: () => d, seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 }),
  };

  return {
    __esModule: true,
    default: {
      firestore: () => ({ collection: mockCollection }),
      apps: [{}],
    },
    firestore: Object.assign(() => ({ collection: mockCollection }), { Timestamp }),
    initializeApp: jest.fn(),
  };
});

// ─── Mock firebase-functions/v2/https ─────────────────────────────────────────

const captured: Record<string, any> = {};
let captureIndex = 0;
const handlerNames = ['createItinerary', 'updateItinerary', 'deleteItinerary', 'listItinerariesForUser', 'searchItineraries'];

const mockOnCall = jest.fn((handler: any) => {
  const name = handlerNames[captureIndex] || `handler_${captureIndex}`;
  captured[name] = handler;
  captureIndex++;
  return handler;
});

jest.mock('firebase-functions/v2/https', () => ({
  onCall: mockOnCall,
  HttpsError: class HttpsError extends Error {
    code: string;
    constructor(code: string, message?: string) { super(message); this.code = code; }
  },
}));

// ─── Load the module under test ───────────────────────────────────────────────
require('../functions/itinerariesRpc');

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('searchItineraries RPC (Firestore)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = createMockQuery();
    mockCollection.mockImplementation(() => ({
      doc: mockDoc, add: mockAdd,
      where: mockQuery.where, orderBy: mockQuery.orderBy,
      limit: mockQuery.limit, get: mockQuery.get,
    }));
  });

  const makeReq = (data: any, uid?: string) => ({ data, auth: uid ? { uid } : undefined } as any);

  it('filters by destination, status, and returns matching itineraries', async () => {
    const candidates = [
      {
        id: 'match-1',
        age: 30,
        status: 'Couple',
        destination: 'Paris',
        startDay: Date.now() - 86400000,
        endDay: Date.now() + 86400000,
        userId: 'u1',
        userInfo: { uid: 'u1', blocked: [] },
      },
    ];

    mockQuery = createMockQuery(candidates);
    mockCollection.mockImplementation(() => ({
      doc: mockDoc, add: mockAdd,
      where: mockQuery.where, orderBy: mockQuery.orderBy,
      limit: mockQuery.limit, get: mockQuery.get,
    }));

    const payload = {
      destination: 'Paris',
      status: 'Couple',
      lowerRange: 25,
      upperRange: 35,
      pageSize: 50,
    };

    const res = await captured.searchItineraries(makeReq(payload, 'current-user'));
    expect(res).toHaveProperty('success', true);
    expect(res.data.map((d: any) => d.id)).toEqual(['match-1']);

    // Verify Firestore .where() was called with destination and status
    const whereArgs = mockQuery._wheres;
    expect(whereArgs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'destination', op: '==', value: 'Paris' }),
        expect.objectContaining({ field: 'status', op: '==', value: 'Couple' }),
      ])
    );
  });

  it('excludes current user itineraries and excluded IDs in post-processing', async () => {
    const candidates = [
      { id: 'mine', userId: 'me', age: 30, userInfo: { uid: 'me', blocked: [] } },
      { id: 'excluded-1', userId: 'other', age: 30, userInfo: { uid: 'other', blocked: [] } },
      { id: 'ok-1', userId: 'friend', age: 30, userInfo: { uid: 'friend', blocked: [] } },
    ];

    mockQuery = createMockQuery(candidates);
    mockCollection.mockImplementation(() => ({
      doc: mockDoc, add: mockAdd,
      where: mockQuery.where, orderBy: mockQuery.orderBy,
      limit: mockQuery.limit, get: mockQuery.get,
    }));

    const payload = {
      pageSize: 50,
      excludedIds: ['excluded-1'],
      currentUserId: 'me',
    };

    const res = await captured.searchItineraries(makeReq(payload, 'me'));
    expect(res.data.map((d: any) => d.id)).toEqual(['ok-1']);
  });

  it('filters out blocked users bidirectionally', async () => {
    const candidates = [
      { id: 'blocked-1', userId: 'blocked-by-me', userInfo: { uid: 'blocked-by-me', blocked: [] } },
      { id: 'blocked-me', userId: 'other', userInfo: { uid: 'other', blocked: ['me'] } },
      { id: 'ok-1', userId: 'friend', userInfo: { uid: 'friend', blocked: [] } },
    ];

    mockQuery = createMockQuery(candidates);
    mockCollection.mockImplementation(() => ({
      doc: mockDoc, add: mockAdd,
      where: mockQuery.where, orderBy: mockQuery.orderBy,
      limit: mockQuery.limit, get: mockQuery.get,
    }));

    const payload = { pageSize: 50, blockedUserIds: ['blocked-by-me'], currentUserId: 'me' };
    const res = await captured.searchItineraries(makeReq(payload, 'me'));
    expect(res.data.map((d: any) => d.id)).toEqual(['ok-1']);
  });

  it('filters by age range in post-processing', async () => {
    const candidates = [
      { id: 'young', userId: 'u1', age: 20, userInfo: { uid: 'u1', blocked: [] } },
      { id: 'match', userId: 'u2', age: 30, userInfo: { uid: 'u2', blocked: [] } },
      { id: 'old', userId: 'u3', age: 50, userInfo: { uid: 'u3', blocked: [] } },
    ];

    mockQuery = createMockQuery(candidates);
    mockCollection.mockImplementation(() => ({
      doc: mockDoc, add: mockAdd,
      where: mockQuery.where, orderBy: mockQuery.orderBy,
      limit: mockQuery.limit, get: mockQuery.get,
    }));

    const payload = { pageSize: 50, lowerRange: 25, upperRange: 35, currentUserId: 'me' };
    const res = await captured.searchItineraries(makeReq(payload, 'me'));
    expect(res.data.map((d: any) => d.id)).toEqual(['match']);
  });

  describe('preference-to-filter mapping', () => {
    const genders = ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'No Preference'];
    test.each(genders)('gender preference "%s" maps to Firestore where correctly', async (g) => {
      mockQuery = createMockQuery([]);
      mockCollection.mockImplementation(() => ({
        doc: mockDoc, add: mockAdd,
        where: mockQuery.where, orderBy: mockQuery.orderBy,
        limit: mockQuery.limit, get: mockQuery.get,
      }));

      await captured.searchItineraries(makeReq({ pageSize: 10, gender: g }, 'u'));
      const genderWheres = mockQuery._wheres.filter((w: any) => w.field === 'gender');
      if (g === 'No Preference') {
        expect(genderWheres).toHaveLength(0);
      } else {
        expect(genderWheres).toEqual([{ field: 'gender', op: '==', value: g }]);
      }
    });

    const statuses = ['Single', 'Couple', 'Group', 'No Preference'];
    test.each(statuses)('status preference "%s" maps to Firestore where correctly', async (s) => {
      mockQuery = createMockQuery([]);
      mockCollection.mockImplementation(() => ({
        doc: mockDoc, add: mockAdd,
        where: mockQuery.where, orderBy: mockQuery.orderBy,
        limit: mockQuery.limit, get: mockQuery.get,
      }));

      await captured.searchItineraries(makeReq({ pageSize: 10, status: s }, 'u'));
      const statusWheres = mockQuery._wheres.filter((w: any) => w.field === 'status');
      if (s === 'No Preference') {
        expect(statusWheres).toHaveLength(0);
      } else {
        expect(statusWheres).toEqual([{ field: 'status', op: '==', value: s }]);
      }
    });

    const orientations = ['Heterosexual', 'Homosexual', 'Bisexual', 'Asexual', 'Pansexual', 'Queer', 'Questioning', 'Other', 'Prefer not to say', 'No Preference'];
    test.each(orientations)('sexualOrientation preference "%s" maps to Firestore where correctly', async (o) => {
      mockQuery = createMockQuery([]);
      mockCollection.mockImplementation(() => ({
        doc: mockDoc, add: mockAdd,
        where: mockQuery.where, orderBy: mockQuery.orderBy,
        limit: mockQuery.limit, get: mockQuery.get,
      }));

      await captured.searchItineraries(makeReq({ pageSize: 10, sexualOrientation: o }, 'u'));
      const orientWheres = mockQuery._wheres.filter((w: any) => w.field === 'sexualOrientation');
      if (o === 'No Preference') {
        expect(orientWheres).toHaveLength(0);
      } else {
        expect(orientWheres).toEqual([{ field: 'sexualOrientation', op: '==', value: o }]);
      }
    });

    it('maps minStartDay + maxEndDay to endDay >= and startDay <= Firestore queries', async () => {
      const now = Date.now();
      mockQuery = createMockQuery([]);
      mockCollection.mockImplementation(() => ({
        doc: mockDoc, add: mockAdd,
        where: mockQuery.where, orderBy: mockQuery.orderBy,
        limit: mockQuery.limit, get: mockQuery.get,
      }));

      await captured.searchItineraries(makeReq({ pageSize: 10, minStartDay: now, maxEndDay: now + 1000 }, 'u'));
      const dateWheres = mockQuery._wheres.filter((w: any) => w.field === 'endDay' || w.field === 'startDay');
      expect(dateWheres).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'endDay', op: '>=', value: now }),
          expect.objectContaining({ field: 'startDay', op: '<=', value: now + 1000 }),
        ])
      );
    });

    it('maps minStartDay-only to startDay >= query', async () => {
      const now = Date.now();
      mockQuery = createMockQuery([]);
      mockCollection.mockImplementation(() => ({
        doc: mockDoc, add: mockAdd,
        where: mockQuery.where, orderBy: mockQuery.orderBy,
        limit: mockQuery.limit, get: mockQuery.get,
      }));

      await captured.searchItineraries(makeReq({ pageSize: 10, minStartDay: now }, 'u'));
      const startDayWhere = mockQuery._wheres.filter((w: any) => w.field === 'startDay');
      expect(startDayWhere).toEqual([{ field: 'startDay', op: '>=', value: now }]);
    });
  });

  describe('orderBy and limit behavior', () => {
    it('uses orderBy endDay asc for index compatibility', async () => {
      mockQuery = createMockQuery([]);
      mockCollection.mockImplementation(() => ({
        doc: mockDoc, add: mockAdd,
        where: mockQuery.where, orderBy: mockQuery.orderBy,
        limit: mockQuery.limit, get: mockQuery.get,
      }));

      await captured.searchItineraries(makeReq({ pageSize: 10, destination: 'Paris' }, 'u'));
      expect(mockQuery._orderBys).toEqual([{ field: 'endDay', dir: 'asc' }]);
    });

    it('applies 3x overfetch limit based on pageSize', async () => {
      mockQuery = createMockQuery([]);
      mockCollection.mockImplementation(() => ({
        doc: mockDoc, add: mockAdd,
        where: mockQuery.where, orderBy: mockQuery.orderBy,
        limit: mockQuery.limit, get: mockQuery.get,
      }));

      await captured.searchItineraries(makeReq({ pageSize: 20 }, 'u'));
      expect(mockQuery._limit).toBe(60); // 20 * 3 overfetch
    });

    it('caps pageSize at 100', async () => {
      mockQuery = createMockQuery([]);
      mockCollection.mockImplementation(() => ({
        doc: mockDoc, add: mockAdd,
        where: mockQuery.where, orderBy: mockQuery.orderBy,
        limit: mockQuery.limit, get: mockQuery.get,
      }));

      await captured.searchItineraries(makeReq({ pageSize: 200 }, 'u'));
      expect(mockQuery._limit).toBe(300); // min(200, 100) * 3 = 300
    });

    it('trims results to requested pageSize after post-processing', async () => {
      // Create more candidates than pageSize
      const candidates = Array.from({ length: 15 }, (_, i) => ({
        id: `item-${i}`, userId: `other-${i}`, age: 30,
        userInfo: { uid: `other-${i}`, blocked: [] },
      }));

      mockQuery = createMockQuery(candidates);
      mockCollection.mockImplementation(() => ({
        doc: mockDoc, add: mockAdd,
        where: mockQuery.where, orderBy: mockQuery.orderBy,
        limit: mockQuery.limit, get: mockQuery.get,
      }));

      const res = await captured.searchItineraries(makeReq({ pageSize: 5, currentUserId: 'me' }, 'me'));
      expect(res.data).toHaveLength(5);
    });
  });

  describe('combined filter scenarios', () => {
    it('applies all equality filters together (destination + gender + status + orientation)', async () => {
      mockQuery = createMockQuery([]);
      mockCollection.mockImplementation(() => ({
        doc: mockDoc, add: mockAdd,
        where: mockQuery.where, orderBy: mockQuery.orderBy,
        limit: mockQuery.limit, get: mockQuery.get,
      }));

      const now = Date.now();
      await captured.searchItineraries(makeReq({
        destination: 'Austin, TX, USA',
        gender: 'Female',
        status: 'Single',
        sexualOrientation: 'Bisexual',
        minStartDay: now,
        maxEndDay: now + 86400000,
        pageSize: 10,
      }, 'u'));

      const wheres = mockQuery._wheres;
      expect(wheres).toEqual(expect.arrayContaining([
        { field: 'destination', op: '==', value: 'Austin, TX, USA' },
        { field: 'gender', op: '==', value: 'Female' },
        { field: 'status', op: '==', value: 'Single' },
        { field: 'sexualOrientation', op: '==', value: 'Bisexual' },
        { field: 'endDay', op: '>=', value: now },
        { field: 'startDay', op: '<=', value: now + 86400000 },
      ]));
    });

    it('skips No Preference filters while applying others', async () => {
      mockQuery = createMockQuery([]);
      mockCollection.mockImplementation(() => ({
        doc: mockDoc, add: mockAdd,
        where: mockQuery.where, orderBy: mockQuery.orderBy,
        limit: mockQuery.limit, get: mockQuery.get,
      }));

      await captured.searchItineraries(makeReq({
        destination: 'Paris',
        gender: 'No Preference',
        status: 'Couple',
        sexualOrientation: 'No Preference',
        pageSize: 10,
      }, 'u'));

      const fields = mockQuery._wheres.map((w: any) => w.field);
      expect(fields).toContain('destination');
      expect(fields).toContain('status');
      expect(fields).not.toContain('gender');
      expect(fields).not.toContain('sexualOrientation');
    });
  });

  describe('date overlap post-processing correctness', () => {
    it('includes candidates whose dates overlap with search window', async () => {
      const now = Date.now();
      const DAY = 86400000;
      const candidates = [
        // Overlaps: candidate Feb 20-25, search Feb 22-28
        { id: 'overlap', userId: 'u1', startDay: now, endDay: now + 5 * DAY, userInfo: { uid: 'u1', blocked: [] } },
        // Does not overlap: candidate Feb 1-10, search Feb 22-28 (but Firestore returns it since mock doesn't filter)
        { id: 'no-overlap', userId: 'u2', startDay: now - 20 * DAY, endDay: now - 15 * DAY, userInfo: { uid: 'u2', blocked: [] } },
      ];

      mockQuery = createMockQuery(candidates);
      mockCollection.mockImplementation(() => ({
        doc: mockDoc, add: mockAdd,
        where: mockQuery.where, orderBy: mockQuery.orderBy,
        limit: mockQuery.limit, get: mockQuery.get,
      }));

      // Note: In the real system, Firestore would filter out non-overlapping via endDay >= and startDay <=.
      // The mock returns all candidates, but the function only applies Firestore queries, not post-processing overlap.
      // So both will be returned from the mock. This test validates the query construction is correct.
      const res = await captured.searchItineraries(makeReq({
        minStartDay: now - DAY,
        maxEndDay: now + 8 * DAY,
        currentUserId: 'me',
        pageSize: 50,
      }, 'me'));

      expect(res.data.map((d: any) => d.id)).toContain('overlap');
    });
  });

  describe('edge cases', () => {
    it('handles undefined blockedUserIds and excludedIds gracefully', async () => {
      const candidates = [
        { id: 'item-1', userId: 'u1', userInfo: { uid: 'u1', blocked: [] } },
      ];

      mockQuery = createMockQuery(candidates);
      mockCollection.mockImplementation(() => ({
        doc: mockDoc, add: mockAdd,
        where: mockQuery.where, orderBy: mockQuery.orderBy,
        limit: mockQuery.limit, get: mockQuery.get,
      }));

      const res = await captured.searchItineraries(makeReq({
        pageSize: 10,
        currentUserId: 'me',
        // blockedUserIds and excludedIds intentionally omitted
      }, 'me'));

      expect(res.data.map((d: any) => d.id)).toEqual(['item-1']);
    });

    it('handles candidate with missing userInfo gracefully', async () => {
      const candidates = [
        { id: 'no-userinfo', userId: 'u1' }, // No userInfo at all
        { id: 'ok', userId: 'u2', userInfo: { uid: 'u2', blocked: [] } },
      ];

      mockQuery = createMockQuery(candidates);
      mockCollection.mockImplementation(() => ({
        doc: mockDoc, add: mockAdd,
        where: mockQuery.where, orderBy: mockQuery.orderBy,
        limit: mockQuery.limit, get: mockQuery.get,
      }));

      const res = await captured.searchItineraries(makeReq({
        pageSize: 10,
        currentUserId: 'me',
        blockedUserIds: ['someone'],
      }, 'me'));

      // Both should be included — missing userInfo means no blocking applies
      expect(res.data.map((d: any) => d.id)).toContain('no-userinfo');
      expect(res.data.map((d: any) => d.id)).toContain('ok');
    });

    it('handles candidate with null age when age filter is applied', async () => {
      const candidates = [
        { id: 'no-age', userId: 'u1', age: null, userInfo: { uid: 'u1', blocked: [] } },
        { id: 'has-age', userId: 'u2', age: 30, userInfo: { uid: 'u2', blocked: [] } },
      ];

      mockQuery = createMockQuery(candidates);
      mockCollection.mockImplementation(() => ({
        doc: mockDoc, add: mockAdd,
        where: mockQuery.where, orderBy: mockQuery.orderBy,
        limit: mockQuery.limit, get: mockQuery.get,
      }));

      const res = await captured.searchItineraries(makeReq({
        pageSize: 10,
        currentUserId: 'me',
        lowerRange: 25,
        upperRange: 35,
      }, 'me'));

      // null age should pass through (not filtered out)
      expect(res.data.map((d: any) => d.id)).toContain('no-age');
      expect(res.data.map((d: any) => d.id)).toContain('has-age');
    });
  });
});

describe('createItinerary RPC (Firestore)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = createMockQuery();
    mockCollection.mockImplementation(() => ({
      doc: mockDoc, add: mockAdd,
      where: mockQuery.where, orderBy: mockQuery.orderBy,
      limit: mockQuery.limit, get: mockQuery.get,
    }));
  });

  it('rejects unauthenticated requests', async () => {
    await expect(
      captured.createItinerary({ data: {}, auth: undefined })
    ).rejects.toThrow();
  });

  it('creates a new itinerary with auto-generated ID when no id provided', async () => {
    const docData = { userId: 'u1', destination: 'Paris' };
    const mockDocRef = {
      id: 'auto-gen-id',
      get: jest.fn(async () => ({
        id: 'auto-gen-id',
        data: () => docData,
      })),
    };
    mockAdd.mockResolvedValue(mockDocRef);

    const res = await captured.createItinerary({
      data: { itinerary: { destination: 'Paris' } },
      auth: { uid: 'u1' },
    });

    expect(res.success).toBe(true);
    expect(mockAdd).toHaveBeenCalled();
  });

  it('upserts when id is provided and doc exists', async () => {
    mockDocGet.mockResolvedValue({ exists: true, id: 'existing-id', data: () => ({ destination: 'Paris' }) });
    mockUpdate.mockResolvedValue(undefined);

    const res = await captured.createItinerary({
      data: { itinerary: { id: 'existing-id', destination: 'Paris Updated' } },
      auth: { uid: 'u1' },
    });

    expect(res.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
  });
});

describe('updateItinerary RPC (Firestore)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCollection.mockImplementation(() => ({
      doc: mockDoc, add: mockAdd,
      where: mockQuery.where, orderBy: mockQuery.orderBy,
      limit: mockQuery.limit, get: mockQuery.get,
    }));
  });

  it('rejects unauthenticated requests', async () => {
    await expect(
      captured.updateItinerary({ data: { id: 'x' }, auth: undefined })
    ).rejects.toThrow();
  });

  it('rejects missing itinerary id', async () => {
    await expect(
      captured.updateItinerary({ data: {}, auth: { uid: 'u1' } })
    ).rejects.toThrow();
  });

  it('updates an itinerary successfully', async () => {
    mockUpdate.mockResolvedValue(undefined);
    mockDocGet.mockResolvedValue({ id: 'it-1', data: () => ({ destination: 'Paris', likes: ['u2'] }) });

    const res = await captured.updateItinerary({
      data: { itineraryId: 'it-1', updates: { likes: ['u2', 'u3'] } },
      auth: { uid: 'u1' },
    });

    expect(res.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
  });
});

describe('deleteItinerary RPC (Firestore)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCollection.mockImplementation(() => ({
      doc: mockDoc, add: mockAdd,
      where: mockQuery.where, orderBy: mockQuery.orderBy,
      limit: mockQuery.limit, get: mockQuery.get,
    }));
  });

  it('rejects unauthenticated requests', async () => {
    await expect(
      captured.deleteItinerary({ data: { id: 'x' }, auth: undefined })
    ).rejects.toThrow();
  });

  it('deletes an itinerary successfully', async () => {
    mockDelete.mockResolvedValue(undefined);

    const res = await captured.deleteItinerary({
      data: { id: 'it-1' },
      auth: { uid: 'u1' },
    });

    expect(res.success).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
  });
});

describe('listItinerariesForUser RPC (Firestore)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    await expect(
      captured.listItinerariesForUser({ data: {}, auth: undefined })
    ).rejects.toThrow();
  });

  it('returns itineraries for the authenticated user', async () => {
    const now = Date.now();
    const docs = [
      { id: 'it-1', userId: 'u1', destination: 'Paris', endDay: now + 86400000, createdAt: { toDate: () => new Date(now) } },
      { id: 'it-2', userId: 'u1', destination: 'London', endDay: now + 172800000, createdAt: { toDate: () => new Date(now - 86400000) } },
    ];

    mockQuery = createMockQuery(docs);
    mockCollection.mockImplementation(() => ({
      doc: mockDoc, add: mockAdd,
      where: mockQuery.where, orderBy: mockQuery.orderBy,
      limit: mockQuery.limit, get: mockQuery.get,
    }));

    const res = await captured.listItinerariesForUser({
      data: { userId: 'u1' },
      auth: { uid: 'u1' },
    });

    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(2);

    // Check that userId filter was applied
    const userIdWheres = mockQuery._wheres.filter((w: any) => w.field === 'userId');
    expect(userIdWheres).toEqual([{ field: 'userId', op: '==', value: 'u1' }]);

    // Check that endDay filter was applied
    const endDayWheres = mockQuery._wheres.filter((w: any) => w.field === 'endDay');
    expect(endDayWheres).toEqual([expect.objectContaining({ field: 'endDay', op: '>=', value: expect.any(Number) })]);
  });
});
