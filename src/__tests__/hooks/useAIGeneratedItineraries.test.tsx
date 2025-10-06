import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { useAIGeneratedItineraries } from '../../hooks/useAIGeneratedItineraries';

// Mock firestore helpers
const mockGetDocs = jest.fn();
const mockCollection = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockDoc = jest.fn();
const mockGetDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  getDocs: (...args: any[]) => mockGetDocs(...args),
  collection: (...args: any[]) => mockCollection(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  orderBy: (...args: any[]) => mockOrderBy(...args),
  doc: (...args: any[]) => mockDoc(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args)
}));

// Mock env config (db + auth)
jest.mock('../../environments/firebaseConfig', () => ({ db: {}, auth: { currentUser: { uid: 'user-1' } } }));

describe('useAIGeneratedItineraries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches and filters non-expired itineraries', async () => {
    // Prepare two mock docs: one non-expired, one expired
    const today = new Date().toISOString().split('T')[0];
    const futureDate = '2999-12-31';
    const pastDate = '2000-01-01';

    const docs = [
      {
        id: 'doc1',
        data: () => ({ response: { data: { itinerary: { endDate: futureDate } } } })
      },
      {
        id: 'doc2',
        data: () => ({ response: { data: { itinerary: { endDate: pastDate } } } })
      }
    ];

    mockGetDocs.mockResolvedValue({
      size: docs.length,
      forEach: (fn: any) => docs.forEach((d) => fn(d))
    });

    const { result } = renderHook(() => useAIGeneratedItineraries());

    // Wait for the effect to complete
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Only the non-expired doc should be present
    expect(result.current.itineraries.length).toBe(1);
    expect(result.current.itineraries[0].id).toBe('doc1');
  });

  it('sets error when unauthenticated', async () => {
    const original = jest.requireMock('../../environments/firebaseConfig');
    original.auth.currentUser = null;

    const { result } = renderHook(() => useAIGeneratedItineraries());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toMatch(/User not authenticated/);

    // restore
    original.auth.currentUser = { uid: 'user-1' };
  });

  it('getItineraryById returns data when exists and null when not', async () => {
    const docSnap = {
      exists: () => true,
      id: 'doc1',
      data: () => ({ response: { data: { itinerary: { endDate: '2999-01-01' } } } })
    };

    mockGetDoc.mockResolvedValueOnce(docSnap);

    const { result } = renderHook(() => useAIGeneratedItineraries());

    const found = await act(async () => {
      return await result.current.getItineraryById('doc1');
    });

    expect(found).not.toBeNull();
    expect(found?.id).toBe('doc1');

    // Non-existent case
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    const notFound = await act(async () => {
      return await result.current.getItineraryById('missing');
    });
    expect(notFound).toBeNull();
  });
});
