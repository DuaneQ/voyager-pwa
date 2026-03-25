/**
 * Tests for destinationStats Cloud Functions in itinerariesRpc.ts:
 *   onItineraryCreated, onItineraryDeleted, backfillDestinationStats
 *
 * Mocks firebase-admin and firebase-functions triggers/https to validate:
 *  - Counter creation on first itinerary for a destination
 *  - Counter increment for subsequent itineraries
 *  - Counter decrement (and deletion at zero) when an itinerary is removed
 *  - Backfill building counts from all existing itineraries
 *  - Auth guard on backfill (admin only)
 */

export {};

jest.resetModules();

// ─── Transaction mock ─────────────────────────────────────────────────────────

const mockTxGet = jest.fn();
const mockTxSet = jest.fn();
const mockTxUpdate = jest.fn();
const mockTxDelete = jest.fn();

const mockTx = {
  get: mockTxGet,
  set: mockTxSet,
  update: mockTxUpdate,
  delete: mockTxDelete,
};

const mockRunTransaction = jest.fn(async (cb: any) => cb(mockTx));

// ─── Batch mock ───────────────────────────────────────────────────────────────

const mockBatchSet = jest.fn();
const mockBatchDelete = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);
const makeBatch = () => ({ set: mockBatchSet, delete: mockBatchDelete, commit: mockBatchCommit });

// ─── Collection mocks ─────────────────────────────────────────────────────────

const mockStatDocSet = jest.fn().mockResolvedValue(undefined);
const mockStatDocRef = { id: 'mock-stat-doc', set: mockStatDocSet };
const mockStatDoc = jest.fn(() => mockStatDocRef);
const mockStatGet = jest.fn().mockResolvedValue({ docs: [] }); // empty by default
const mockStatCollection = { doc: mockStatDoc, get: mockStatGet };

const mockItinerariesGet = jest.fn();
const mockItinerariesCollection = { get: mockItinerariesGet };

const mockCollection = jest.fn((name: string) => {
  if (name === 'destinationStats') return mockStatCollection;
  return mockItinerariesCollection;
});

const mockDb = {
  collection: mockCollection,
  runTransaction: mockRunTransaction,
  batch: jest.fn(() => makeBatch()),
};

// ─── firebase-admin mock ──────────────────────────────────────────────────────

jest.mock('firebase-admin', () => {
  const FieldValue = {
    increment: jest.fn((n: number) => ({ _type: 'increment', n })),
    serverTimestamp: jest.fn(() => ({ _type: 'serverTimestamp' })),
  };
  const Timestamp = {
    now: () => ({ seconds: 0, nanoseconds: 0 }),
    fromDate: (d: Date) => ({ seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 }),
  };

  return {
    __esModule: true,
    default: {
      firestore: () => mockDb,
      apps: [{}],
    },
    firestore: Object.assign(() => mockDb, { Timestamp, FieldValue }),
    initializeApp: jest.fn(),
  };
});

// ─── firebase-functions/v2/firestore mock ─────────────────────────────────────

type FirestoreHandler = (event: any) => Promise<any>;
let capturedOnCreated: FirestoreHandler | null = null;
let capturedOnDeleted: FirestoreHandler | null = null;
let capturedOnUpdated: FirestoreHandler | null = null;

jest.mock('firebase-functions/v2/firestore', () => ({
  onDocumentCreated: jest.fn((_pattern: string, handler: FirestoreHandler) => {
    capturedOnCreated = handler;
    return handler;
  }),
  onDocumentDeleted: jest.fn((_pattern: string, handler: FirestoreHandler) => {
    capturedOnDeleted = handler;
    return handler;
  }),
  onDocumentUpdated: jest.fn((_pattern: string, handler: FirestoreHandler) => {
    capturedOnUpdated = handler;
    return handler;
  }),
}));

// ─── firebase-functions/v2/https mock ────────────────────────────────────────

const onCallHandlers: any[] = [];

jest.mock('firebase-functions/v2/https', () => ({
  onCall: jest.fn((handler: any) => {
    onCallHandlers.push(handler);
    return handler;
  }),
  HttpsError: class HttpsError extends Error {
    code: string;
    constructor(code: string, message?: string) {
      super(message);
      this.code = code;
    }
  },
}));

// ─── Load module under test ───────────────────────────────────────────────────

require('../functions/itinerariesRpc');

// backfillDestinationStats is the 6th (last) onCall registration
const backfillHandler = onCallHandlers[5];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeCreatedEvent = (data: Record<string, any> | undefined) => ({
  data: data ? { data: () => data } : undefined,
});

const makeDeletedEvent = (data: Record<string, any> | undefined) => ({
  data: data ? { data: () => data } : undefined,
});

const makeAdminReq = () => ({ auth: { token: { admin: true } } });
const makeNonAdminReq = (uid = 'user-123') => ({
  auth: { uid, token: {} },
});

const makeUpdatedEvent = (
  before?: Record<string, any>,
  after?: Record<string, any>,
) => ({
  data: {
    before: { data: () => before ?? {} },
    after:  { data: () => after  ?? {} },
  },
});

// ─── onItineraryCreated ───────────────────────────────────────────────────────

describe('onItineraryCreated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStatDocSet.mockResolvedValue(undefined);
  });

  it('does nothing when event data has no destination', async () => {
    await capturedOnCreated!(makeCreatedEvent({ title: 'No destination' }));

    expect(mockStatDocSet).not.toHaveBeenCalled();
  });

  it('does nothing when event data is undefined', async () => {
    await capturedOnCreated!(makeCreatedEvent(undefined));

    expect(mockStatDocSet).not.toHaveBeenCalled();
  });

  it('uses merge:true set with FieldValue.increment to upsert the stat doc', async () => {
    await capturedOnCreated!(makeCreatedEvent({ destination: 'Paris, France' }));

    expect(mockStatDoc).toHaveBeenCalledWith(encodeURIComponent('Paris, France'));
    expect(mockStatDocSet).toHaveBeenCalledTimes(1);
    expect(mockStatDocSet).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: 'Paris, France',
        count: expect.objectContaining({ _type: 'increment', n: 1 }),
      }),
      { merge: true }
    );
    // No transaction read needed
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('URL-encodes the destination as the document ID', async () => {
    await capturedOnCreated!(makeCreatedEvent({ destination: 'New York, USA' }));

    expect(mockStatDoc).toHaveBeenCalledWith('New%20York%2C%20USA');
  });
});

// ─── onItineraryDeleted ───────────────────────────────────────────────────────

describe('onItineraryDeleted', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRunTransaction.mockImplementation(async (cb: any) => cb(mockTx));
  });

  it('does nothing when event data has no destination', async () => {
    await capturedOnDeleted!(makeDeletedEvent({ title: 'No destination' }));

    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('does nothing when event data is undefined', async () => {
    await capturedOnDeleted!(makeDeletedEvent(undefined));

    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('does nothing when stat doc does not exist', async () => {
    mockTxGet.mockResolvedValue({ exists: false });

    await capturedOnDeleted!(makeDeletedEvent({ destination: 'Tokyo, Japan' }));

    expect(mockTxDelete).not.toHaveBeenCalled();
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it('deletes the stat doc when count would reach zero', async () => {
    mockTxGet.mockResolvedValue({
      exists: true,
      data: () => ({ destination: 'Tokyo, Japan', count: 1 }),
    });

    await capturedOnDeleted!(makeDeletedEvent({ destination: 'Tokyo, Japan' }));

    expect(mockTxDelete).toHaveBeenCalledWith(mockStatDocRef);
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it('decrements count when more than one itinerary remains', async () => {
    mockTxGet.mockResolvedValue({
      exists: true,
      data: () => ({ destination: 'Tokyo, Japan', count: 4 }),
    });

    await capturedOnDeleted!(makeDeletedEvent({ destination: 'Tokyo, Japan' }));

    expect(mockTxUpdate).toHaveBeenCalledWith(
      mockStatDocRef,
      expect.objectContaining({ count: expect.objectContaining({ _type: 'increment', n: -1 }) })
    );
    expect(mockTxDelete).not.toHaveBeenCalled();
  });

  it('URL-encodes the destination as the document ID', async () => {
    mockTxGet.mockResolvedValue({
      exists: true,
      data: () => ({ count: 1 }),
    });

    await capturedOnDeleted!(makeDeletedEvent({ destination: 'São Paulo, Brazil' }));

    expect(mockStatDoc).toHaveBeenCalledWith(encodeURIComponent('São Paulo, Brazil'));
  });
});

// ─── backfillDestinationStats ─────────────────────────────────────────────────

describe('backfillDestinationStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.batch.mockImplementation(() => makeBatch());
    // No stale docs by default
    mockStatGet.mockResolvedValue({ docs: [] });
  });

  it('throws permission-denied when caller is not an admin', async () => {
    await expect(backfillHandler(makeNonAdminReq())).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('throws permission-denied when auth is missing entirely', async () => {
    await expect(backfillHandler({ auth: undefined })).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });

  it('returns success and correct counts for multiple itineraries', async () => {
    mockItinerariesGet.mockResolvedValue({
      size: 4,
      docs: [
        { data: () => ({ destination: 'Paris, France' }) },
        { data: () => ({ destination: 'Paris, France' }) },
        { data: () => ({ destination: 'Tokyo, Japan' }) },
        { data: () => ({ destination: 'Tokyo, Japan' }) },
      ],
    });

    const result = await backfillHandler(makeAdminReq());

    expect(result).toEqual({ success: true, processed: 4, destinations: 2, staleDeleted: 0 });
    // One batch.set call per unique destination
    expect(mockBatchSet).toHaveBeenCalledTimes(2);
  });

  it('sets correct count per destination in the batch', async () => {
    mockItinerariesGet.mockResolvedValue({
      size: 3,
      docs: [
        { data: () => ({ destination: 'Bali, Indonesia' }) },
        { data: () => ({ destination: 'Bali, Indonesia' }) },
        { data: () => ({ destination: 'Lisbon, Portugal' }) },
      ],
    });

    await backfillHandler(makeAdminReq());

    const payloads = mockBatchSet.mock.calls.map((c: any[]) => c[1]);
    const baliPayload = payloads.find((p: any) => p.destination === 'Bali, Indonesia');
    const lisbonPayload = payloads.find((p: any) => p.destination === 'Lisbon, Portugal');

    expect(baliPayload).toMatchObject({ destination: 'Bali, Indonesia', count: 2 });
    expect(lisbonPayload).toMatchObject({ destination: 'Lisbon, Portugal', count: 1 });
  });

  it('skips itinerary docs that have no destination field', async () => {
    mockItinerariesGet.mockResolvedValue({
      size: 3,
      docs: [
        { data: () => ({ destination: 'Rome, Italy' }) },
        { data: () => ({}) },
        { data: () => ({ title: 'x' }) },
      ],
    });

    const result = await backfillHandler(makeAdminReq());

    expect(result).toEqual({ success: true, processed: 3, destinations: 1, staleDeleted: 0 });
    expect(mockBatchSet).toHaveBeenCalledTimes(1);
  });

  it('handles an empty itineraries collection', async () => {
    mockItinerariesGet.mockResolvedValue({ size: 0, docs: [] });

    const result = await backfillHandler(makeAdminReq());

    expect(result).toEqual({ success: true, processed: 0, destinations: 0, staleDeleted: 0 });
    expect(mockBatchSet).not.toHaveBeenCalled();
  });

  it('URL-encodes destination names as document IDs', async () => {
    mockItinerariesGet.mockResolvedValue({
      size: 1,
      docs: [{ data: () => ({ destination: 'New York, USA' }) }],
    });

    await backfillHandler(makeAdminReq());

    expect(mockStatDoc).toHaveBeenCalledWith('New%20York%2C%20USA');
  });

  it('deletes stale stat docs whose destination no longer has any itineraries', async () => {
    const staleRef = { id: 'stale-ref' };
    mockStatGet.mockResolvedValue({
      docs: [
        { ref: staleRef, data: () => ({ destination: 'Deleted City' }) },
      ],
    });
    mockItinerariesGet.mockResolvedValue({
      size: 1,
      docs: [{ data: () => ({ destination: 'Paris, France' }) }],
    });

    const result = await backfillHandler(makeAdminReq());

    expect(result).toMatchObject({ staleDeleted: 1 });
    expect(mockBatchDelete).toHaveBeenCalledWith(staleRef);
  });

  it('does not delete stat docs whose destination still has itineraries', async () => {
    const liveRef = { id: 'live-ref' };
    mockStatGet.mockResolvedValue({
      docs: [
        { ref: liveRef, data: () => ({ destination: 'Paris, France' }) },
      ],
    });
    mockItinerariesGet.mockResolvedValue({
      size: 1,
      docs: [{ data: () => ({ destination: 'Paris, France' }) }],
    });

    const result = await backfillHandler(makeAdminReq());

    expect(result).toMatchObject({ staleDeleted: 0 });
    expect(mockBatchDelete).not.toHaveBeenCalled();
  });

  it('chunks writes into multiple batches when destinations exceed 500', async () => {
    // Generate 501 unique destinations
    const docs = Array.from({ length: 501 }, (_, i) => ({
      data: () => ({ destination: `City ${i}` }),
    }));
    mockItinerariesGet.mockResolvedValue({ size: 501, docs });

    await backfillHandler(makeAdminReq());

    // 501 destinations split across 2 write batches (500 + 1)
    // Each batch() call returns a fresh batch; batch.commit is called once per batch
    expect(mockBatchCommit.mock.calls.length).toBeGreaterThanOrEqual(2);
    // All 501 destinations are written
    expect(mockBatchSet).toHaveBeenCalledTimes(501);
  });

  it('chunks deletes into multiple batches when stale docs exceed 500', async () => {
    // 501 stale docs, no current itineraries
    const staleDocs = Array.from({ length: 501 }, (_, i) => ({
      ref: { id: `stale-${i}` },
      data: () => ({ destination: `Old City ${i}` }),
    }));
    mockStatGet.mockResolvedValue({ docs: staleDocs });
    mockItinerariesGet.mockResolvedValue({ size: 0, docs: [] });

    const result = await backfillHandler(makeAdminReq());

    expect(result).toMatchObject({ staleDeleted: 501 });
    expect(mockBatchDelete).toHaveBeenCalledTimes(501);
    // At least 2 delete batches committed (500 + 1)
    expect(mockBatchCommit.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── onItineraryUpdated ───────────────────────────────────────────────────────

describe('onItineraryUpdated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRunTransaction.mockImplementation(async (cb: any) => cb(mockTx));
  });

  it('does nothing when destination is unchanged', async () => {
    await capturedOnUpdated!(
      makeUpdatedEvent({ destination: 'Paris, France' }, { destination: 'Paris, France' })
    );

    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('does nothing when both before and after have no destination', async () => {
    await capturedOnUpdated!(makeUpdatedEvent({}, {}));

    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('decrements old destination and increments existing new destination', async () => {
    // old stat: count 3, new stat: count 2
    mockTxGet
      .mockResolvedValueOnce({ exists: true, data: () => ({ count: 3 }) }) // old
      .mockResolvedValueOnce({ exists: true, data: () => ({ count: 2 }) }); // new

    await capturedOnUpdated!(
      makeUpdatedEvent({ destination: 'Paris, France' }, { destination: 'Tokyo, Japan' })
    );

    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    // Old stat decremented
    expect(mockTxUpdate).toHaveBeenCalledWith(
      mockStatDocRef,
      expect.objectContaining({ count: expect.objectContaining({ _type: 'increment', n: -1 }) })
    );
    // New stat incremented
    expect(mockTxUpdate).toHaveBeenCalledWith(
      mockStatDocRef,
      expect.objectContaining({ count: expect.objectContaining({ _type: 'increment', n: 1 }) })
    );
    expect(mockTxSet).not.toHaveBeenCalled();
    expect(mockTxDelete).not.toHaveBeenCalled();
  });

  it('deletes old stat doc when its count reaches zero', async () => {
    // old stat: count 1 → should be deleted; new stat: does not exist → should be created
    mockTxGet
      .mockResolvedValueOnce({ exists: true, data: () => ({ count: 1 }) }) // old
      .mockResolvedValueOnce({ exists: false });                             // new

    await capturedOnUpdated!(
      makeUpdatedEvent({ destination: 'Paris, France' }, { destination: 'Tokyo, Japan' })
    );

    expect(mockTxDelete).toHaveBeenCalledWith(mockStatDocRef);
    expect(mockTxSet).toHaveBeenCalledWith(
      mockStatDocRef,
      expect.objectContaining({ destination: 'Tokyo, Japan', count: 1 })
    );
    expect(mockTxUpdate).not.toHaveBeenCalled();
  });

  it('creates new stat doc when it does not exist yet', async () => {
    mockTxGet
      .mockResolvedValueOnce({ exists: true, data: () => ({ count: 2 }) }) // old
      .mockResolvedValueOnce({ exists: false });                             // new

    await capturedOnUpdated!(
      makeUpdatedEvent({ destination: 'Berlin, Germany' }, { destination: 'Bali, Indonesia' })
    );

    expect(mockTxSet).toHaveBeenCalledWith(
      mockStatDocRef,
      expect.objectContaining({ destination: 'Bali, Indonesia', count: 1 })
    );
  });

  it('skips decrement when old stat doc does not exist', async () => {
    mockTxGet
      .mockResolvedValueOnce({ exists: false })                             // old
      .mockResolvedValueOnce({ exists: true, data: () => ({ count: 1 }) }); // new

    await capturedOnUpdated!(
      makeUpdatedEvent({ destination: 'Ghost City' }, { destination: 'Tokyo, Japan' })
    );

    expect(mockTxDelete).not.toHaveBeenCalled();
    // Only the new stat is updated
    expect(mockTxUpdate).toHaveBeenCalledTimes(1);
    expect(mockTxUpdate).toHaveBeenCalledWith(
      mockStatDocRef,
      expect.objectContaining({ count: expect.objectContaining({ _type: 'increment', n: 1 }) })
    );
  });

  it('only increments new destination when before has no destination (itinerary gained a destination)', async () => {
    mockTxGet.mockResolvedValueOnce({ exists: false }); // new

    await capturedOnUpdated!(
      makeUpdatedEvent({}, { destination: 'Lisbon, Portugal' })
    );

    expect(mockRunTransaction).toHaveBeenCalledTimes(1);
    expect(mockTxSet).toHaveBeenCalledWith(
      mockStatDocRef,
      expect.objectContaining({ destination: 'Lisbon, Portugal', count: 1 })
    );
    expect(mockTxDelete).not.toHaveBeenCalled();
  });

  it('URL-encodes old and new destination as document IDs', async () => {
    mockTxGet
      .mockResolvedValueOnce({ exists: true, data: () => ({ count: 2 }) })
      .mockResolvedValueOnce({ exists: false });

    await capturedOnUpdated!(
      makeUpdatedEvent({ destination: 'São Paulo, Brazil' }, { destination: 'New York, USA' })
    );

    expect(mockStatDoc).toHaveBeenCalledWith(encodeURIComponent('São Paulo, Brazil'));
    expect(mockStatDoc).toHaveBeenCalledWith(encodeURIComponent('New York, USA'));
  });
});
