import { renderHook, act } from '@testing-library/react';
import useDeleteItinerary from '../../hooks/useDeleteItinerary';
import useGetUserId from '../../hooks/useGetUserId';

jest.mock('firebase/functions');
jest.mock('../../hooks/useGetUserId');

// Ensure httpsCallable returns a callable function that consults global handlers
const { httpsCallable } = require('firebase/functions');
if (httpsCallable && typeof httpsCallable.mockImplementation === 'function') {
  httpsCallable.mockImplementation((functions: any, name: string) => {
    return async (payload: any) => {
      const handlerKey = `__mock_httpsCallable_${name}`;
      if ((global as any)[handlerKey] && typeof (global as any)[handlerKey] === 'function') {
        return (global as any)[handlerKey](payload);
      }
      if ((global as any).__mockHttpsCallableReturn) return (global as any).__mockHttpsCallableReturn;
      return { data: { success: true, data: [] } };
    };
  });
}

describe('useDeleteItinerary', () => {
  const originalError = console.error;
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
    (global as any).__mock_httpsCallable_deleteItinerary = undefined;
    (global as any).__mockHttpsCallableReturn = undefined;
    // Re-apply httpsCallable mockImplementation after clearAllMocks
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

  it('deletes itinerary successfully', async () => {
    (useGetUserId as jest.Mock).mockReturnValue('user-1');

    const rpcHandler = jest.fn().mockResolvedValue({ data: { success: true } });
    (global as any).__mock_httpsCallable_deleteItinerary = rpcHandler;

    const { result } = renderHook(() => useDeleteItinerary());

    await act(async () => {
      await result.current.deleteItinerary('it-1');
    });

    expect(rpcHandler).toHaveBeenCalledWith({ itineraryId: 'it-1' });
    expect(result.current.error).toBeNull();
  });

  it('throws when user is not authenticated', async () => {
    (useGetUserId as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useDeleteItinerary());

    await act(async () => {
      await expect(result.current.deleteItinerary('it-1')).rejects.toThrow('User not authenticated');
    });
  });

  it('sets error and rethrows when RPC fails', async () => {
    (useGetUserId as jest.Mock).mockReturnValue('user-1');
    const err = new Error('rpc delete failed');
    const rpcHandler = jest.fn().mockRejectedValue(err);
    (global as any).__mock_httpsCallable_deleteItinerary = rpcHandler;

    const { result } = renderHook(() => useDeleteItinerary());

    await act(async () => {
      await expect(result.current.deleteItinerary('it-2')).rejects.toThrow('rpc delete failed');
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(console.error).toHaveBeenCalled();
  });
});
