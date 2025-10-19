import { renderHook, act } from '@testing-library/react';
import useUpdateItinerary from '../../hooks/useUpdateItinerary';
import useGetUserId from '../../hooks/useGetUserId';

// Ensure httpsCallable returns a callable function that consults global handlers
jest.mock('firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: (functions: any, name: string) => {
    return async (payload: any) => {
      const handlerKey = `__mock_httpsCallable_${name}`;
      if ((global as any)[handlerKey] && typeof (global as any)[handlerKey] === 'function') {
        return (global as any)[handlerKey](payload);
      }
      if ((global as any).__mockHttpsCallableReturn) return (global as any).__mockHttpsCallableReturn;
      return { data: { success: true, data: [] } };
    };
  },
}));

jest.mock('../../hooks/useGetUserId');

describe('useUpdateItinerary', () => {
  const originalError = console.error;
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    // reset function mocks
    (global as any).__mock_httpsCallable_updateItinerary = undefined;
    (global as any).__mockHttpsCallableReturn = undefined;
    try {
      const mf: any = require('firebase/functions');
      if (mf && mf.httpsCallable && typeof mf.httpsCallable.mockImplementation === 'function') {
        mf.httpsCallable.mockImplementation((functions: any, name: string) => {
          const handlerKey = `__mock_httpsCallable_${name}`;
          if ((global as any)[handlerKey] && typeof (global as any)[handlerKey] === 'function') return (global as any)[handlerKey];
          if (mf.__rpcMocks && typeof mf.__rpcMocks[name] === 'function') return mf.__rpcMocks[name];
          return async (payload: any) => ({ data: { success: true, data: [] } });
        });
      }
    } catch (e) {}
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('updates itinerary successfully', async () => {
    (useGetUserId as jest.Mock).mockReturnValue('user-1');

    // Provide a per-function handler that simulates successful RPC
    const rpcHandler = jest.fn().mockResolvedValue({ data: { success: true, data: { id: 'it-1' } } });
  (global as any).__mock_httpsCallable_updateItinerary = rpcHandler;
  const mf: any = require('firebase/functions');
  mf.__rpcMocks = mf.__rpcMocks || {};
  mf.__rpcMocks.updateItinerary = rpcHandler;

    const { result } = renderHook(() => useUpdateItinerary());

    await act(async () => {
      await result.current.updateItinerary('it-1', { destination: 'New Place' } as any);
    });

    // Ensure the RPC handler was called with expected payload
    expect(rpcHandler).toHaveBeenCalledWith({ itineraryId: 'it-1', updates: { destination: 'New Place' } });
    expect(result.current.error).toBeNull();
  });

  it('throws when user is not authenticated', async () => {
    (useGetUserId as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useUpdateItinerary());

    await act(async () => {
      await expect(result.current.updateItinerary('it-1', { destination: 'X' } as any)).rejects.toThrow('User not authenticated');
    });
  });

  it('sets error and rethrows when RPC fails', async () => {
    (useGetUserId as jest.Mock).mockReturnValue('user-1');
    const err = new Error('rpc down');
    const rpcHandler = jest.fn().mockRejectedValue(err);
  (global as any).__mock_httpsCallable_updateItinerary = rpcHandler;
  const mf2: any = require('firebase/functions');
  mf2.__rpcMocks = mf2.__rpcMocks || {};
  mf2.__rpcMocks.updateItinerary = rpcHandler;

    const { result } = renderHook(() => useUpdateItinerary());

    await act(async () => {
      await expect(result.current.updateItinerary('it-2', { destination: 'Y' } as any)).rejects.toThrow('rpc down');
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(console.error).toHaveBeenCalled();
  });
});
