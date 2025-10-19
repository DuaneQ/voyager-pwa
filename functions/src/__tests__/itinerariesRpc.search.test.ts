// We'll mock firebase-functions onCall to capture the handler when the module loads
jest.resetModules();

const captured: any = {};
const mockOnCall = jest.fn((handler: any) => {
  // Capture the handler under a predictable name if the module registers it
  // We'll let the handler be returned so it can be invoked directly in tests
  captured.searchItineraries = handler;
  return handler;
});

jest.mock('firebase-functions/v2/https', () => ({
  onCall: mockOnCall,
  // Minimal HttpsError shim for tests
  HttpsError: class HttpsError extends Error {
    code: string;
    constructor(code: string, message?: string) { super(message); this.code = code; }
  }
}));

import prisma from '../db/prismaClient';

// Mock the prisma proxy by stubbing itinerary.findMany
jest.mock('../db/prismaClient', () => ({
  __esModule: true,
  default: {
    itinerary: {
      findMany: jest.fn(),
    },
  },
}));

const mockedPrisma: any = prisma as any;

// Now require the module under test so our mocked onCall runs and captures the handler
require('../functions/itinerariesRpc');

describe('searchItineraries RPC', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const makeReq = (data: any, uid?: string) => ({ data, auth: uid ? { uid } : undefined } as any);

  it('filters by age range, status, and destination and respects excludedIds', async () => {
    // current user's preferences
    const payload = {
      lowerRange: 25,
      upperRange: 35,
      status: 'Couple',
      destination: 'Paris',
      pageSize: 50,
      excludedIds: ['excluded-1'],
    };

    // Candidate itineraries in DB (some matching, some not)
    const now = Date.now();
    const candidates = [
      // should match: age 30, status Couple, destination Paris, date overlap
      {
        id: 'match-1',
        age: 30,
        status: 'Couple',
        destination: 'Paris',
        startDate: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
        endDate: new Date(now + 1000 * 60 * 60 * 24).toISOString(),
        userInfo: JSON.stringify({ uid: 'u1', blocked: [] }),
      },
      // wrong age
      {
        id: 'too-old',
        age: 45,
        status: 'Couple',
        destination: 'Paris',
        startDate: new Date(now).toISOString(),
        endDate: new Date(now + 1000 * 60 * 60 * 24).toISOString(),
        userInfo: JSON.stringify({ uid: 'u2', blocked: [] }),
      },
      // wrong destination
      {
        id: 'wrong-dest',
        age: 29,
        status: 'Couple',
        destination: 'London',
        startDate: new Date(now).toISOString(),
        endDate: new Date(now + 1000 * 60 * 60 * 24).toISOString(),
        userInfo: JSON.stringify({ uid: 'u3', blocked: [] }),
      },
      // excluded id should not be returned
      {
        id: 'excluded-1',
        age: 28,
        status: 'Couple',
        destination: 'Paris',
        startDate: new Date(now).toISOString(),
        endDate: new Date(now + 1000 * 60 * 60 * 24).toISOString(),
        userInfo: JSON.stringify({ uid: 'u4', blocked: [] }),
      },
    ];

    // Simulate Prisma returning only the matching row (Prisma should have filtered)
    mockedPrisma.itinerary.findMany.mockResolvedValue([candidates[0]]);

    // Invoke the captured handler as the callable function would be invoked
    const res: any = await captured.searchItineraries({ data: payload, auth: { uid: 'current-user' } });
    expect(res).toHaveProperty('success', true);
    const data = res.data as any[];
    // Only match-1 should be returned
    expect(data.map(d => d.id)).toEqual(['match-1']);

    // Verify prisma.findMany was called with the expected filters that reflect the user's preferences
    expect(mockedPrisma.itinerary.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        destination: 'Paris',
        status: 'Couple',
        age: { gte: 25, lte: 35 },
        id: { notIn: ['excluded-1'] },
      }),
      orderBy: { startDate: 'asc' },
      take: 50,
    }));
  });

  it('filters out items from users current user has blocked and candidates who blocked the current user', async () => {
    const payload = { pageSize: 50, blockedUserIds: ['blocked-by-me'], currentUserId: 'me' };
    const now = Date.now();
    const candidates = [
      // blocked by current user -> removed
      {
        id: 'blocked-1',
        userInfo: JSON.stringify({ uid: 'blocked-by-me', blocked: [] }),
        startDate: new Date(now).toISOString(),
        endDate: new Date(now + 1000 * 60 * 60 * 24).toISOString(),
      },
      // candidate who blocked current user -> removed
      {
        id: 'blocked-me',
        userInfo: JSON.stringify({ uid: 'other', blocked: ['me'] }),
        startDate: new Date(now).toISOString(),
        endDate: new Date(now + 1000 * 60 * 60 * 24).toISOString(),
      },
      // allowed
      {
        id: 'ok-1',
        userInfo: JSON.stringify({ uid: 'friend', blocked: [] }),
        startDate: new Date(now).toISOString(),
        endDate: new Date(now + 1000 * 60 * 60 * 24).toISOString(),
      },
    ];

  mockedPrisma.itinerary.findMany.mockResolvedValue(candidates);

  const res: any = await captured.searchItineraries({ data: payload, auth: { uid: 'me' } });
  expect(res).toHaveProperty('success', true);
  const data = res.data as any[];
    expect(data.map(d => d.id)).toEqual(['ok-1']);
  });

  it('handles JSON fields returned as objects already and returns sanitized results', async () => {
    const payload = { pageSize: 50 };
    const now = Date.now();
    const candidates = [
      {
        id: 'obj-1',
        userInfo: { uid: 'uobj', blocked: [] },
        likes: JSON.stringify(['a','b']),
        startDate: new Date(now).toISOString(),
        endDate: new Date(now + 1000 * 60 * 60 * 24).toISOString(),
      },
    ];

  mockedPrisma.itinerary.findMany.mockResolvedValue(candidates);

  const res: any = await captured.searchItineraries({ data: payload, auth: { uid: 'me' } });
  expect(res).toHaveProperty('success', true);
  const data = res.data as any[];
    expect(data[0].id).toBe('obj-1');
    // userInfo should be an object
    expect(typeof data[0].userInfo).toBe('object');
    // likes should have been parsed to array
    expect(Array.isArray(data[0].likes)).toBe(true);
  });

  describe('preference-to-filter mapping', () => {
    const genders = ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'No Preference'];
    test.each(genders)('gender preference "%s" maps to Prisma where correctly', async (g) => {
      const payload = { pageSize: 10, gender: g };
      mockedPrisma.itinerary.findMany.mockResolvedValue([]);
      await captured.searchItineraries({ data: payload, auth: { uid: 'u' } });
      const calledArg = mockedPrisma.itinerary.findMany.mock.calls.slice(-1)[0][0];
      if (g === 'No Preference') {
        expect(calledArg.where).not.toHaveProperty('gender');
      } else {
        expect(calledArg.where).toHaveProperty('gender', g);
      }
    });

    const statuses = ['Single', 'Couple', 'Group', 'No Preference'];
    test.each(statuses)('status preference "%s" maps to Prisma where correctly', async (s) => {
      const payload = { pageSize: 10, status: s };
      mockedPrisma.itinerary.findMany.mockResolvedValue([]);
      await captured.searchItineraries({ data: payload, auth: { uid: 'u' } });
      const calledArg = mockedPrisma.itinerary.findMany.mock.calls.slice(-1)[0][0];
      if (s === 'No Preference') {
        expect(calledArg.where).not.toHaveProperty('status');
      } else {
        expect(calledArg.where).toHaveProperty('status', s);
      }
    });

    const orientations = ['Heterosexual','Homosexual','Bisexual','Asexual','Pansexual','Queer','Questioning','Other','Prefer not to say','No Preference'];
    test.each(orientations)('sexualOrientation preference "%s" maps to Prisma where correctly', async (o) => {
      const payload = { pageSize: 10, sexualOrientation: o };
      mockedPrisma.itinerary.findMany.mockResolvedValue([]);
      await captured.searchItineraries({ data: payload, auth: { uid: 'u' } });
      const calledArg = mockedPrisma.itinerary.findMany.mock.calls.slice(-1)[0][0];
      if (o === 'No Preference') {
        expect(calledArg.where).not.toHaveProperty('sexualOrientation');
      } else {
        expect(calledArg.where).toHaveProperty('sexualOrientation', o);
      }
    });

    it('maps minStartDay+maxEndDay to startDate.lte and endDate.gte', async () => {
      const now = Date.now();
      const payload = { pageSize: 10, minStartDay: now, maxEndDay: now + 1000 };
      mockedPrisma.itinerary.findMany.mockResolvedValue([]);
      await captured.searchItineraries({ data: payload, auth: { uid: 'u' } });
      const calledArg = mockedPrisma.itinerary.findMany.mock.calls.slice(-1)[0][0];
      expect(calledArg.where).toHaveProperty('startDate');
      expect(calledArg.where.startDate).toHaveProperty('lte');
      expect(calledArg.where.endDate).toHaveProperty('gte');
      expect(calledArg.where.startDate.lte).toEqual(expect.any(Date));
      expect(calledArg.where.endDate.gte).toEqual(expect.any(Date));
    });

    it('maps minStartDay-only to startDate.gte', async () => {
      const now = Date.now();
      const payload = { pageSize: 10, minStartDay: now };
      mockedPrisma.itinerary.findMany.mockResolvedValue([]);
      await captured.searchItineraries({ data: payload, auth: { uid: 'u' } });
      const calledArg = mockedPrisma.itinerary.findMany.mock.calls.slice(-1)[0][0];
      expect(calledArg.where).toHaveProperty('startDate');
      expect(calledArg.where.startDate).toHaveProperty('gte');
      expect(calledArg.where.startDate.gte).toEqual(expect.any(Date));
    });

    it('includes excludedIds as id.notIn', async () => {
      const payload = { pageSize: 10, excludedIds: ['a','b'] };
      mockedPrisma.itinerary.findMany.mockResolvedValue([]);
      await captured.searchItineraries({ data: payload, auth: { uid: 'u' } });
      const calledArg = mockedPrisma.itinerary.findMany.mock.calls.slice(-1)[0][0];
      expect(calledArg.where).toHaveProperty('id');
      expect(calledArg.where.id).toHaveProperty('notIn', ['a','b']);
    });
  });
});
