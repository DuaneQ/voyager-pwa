import { renderHook, act } from '@testing-library/react';
import usePostItineraryToFirestore from '../../hooks/usePostItineraryToFirestore';
import useGetUserId from '../../hooks/useGetUserId';

jest.mock('firebase/functions');
jest.mock('../../hooks/useGetUserId');

describe('usePostItineraryToFirestore metadata persistence', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    (useGetUserId as jest.Mock).mockReturnValue(mockUserId);
    (global as any).__mock_httpsCallable_createItinerary = undefined;
    (global as any).__mockHttpsCallableReturn = undefined;
    try {
      const install = require('../../testUtils/installRpcShim').default;
      install();
    } catch (e) {}
  });

  test('returns created itinerary containing server metadata at response.data.metadata.filtering', async () => {
    const serverMetadata = { filtering: { foo: 'bar' } };
    const createdItinerary = {
      id: 'it-1',
      destination: 'Paris',
      response: { data: { metadata: serverMetadata } },
    };

    (global as any).__mock_httpsCallable_createItinerary = jest.fn().mockResolvedValue({ data: { success: true, data: createdItinerary } });

    const { result } = renderHook(() => usePostItineraryToFirestore());

    let res: any;
    await act(async () => {
      res = await result.current.postItinerary({ destination: 'Paris' } as any);
    });

    expect(res).toBeDefined();
    // the hook returns res.data.data which should contain response.data.metadata.filtering
    expect(res.response).toBeDefined();
    expect(res.response.data).toBeDefined();
    expect(res.response.data.metadata).toBeDefined();
    expect(res.response.data.metadata.filtering).toEqual(serverMetadata.filtering);
  });
});
