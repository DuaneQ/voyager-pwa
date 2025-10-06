import { renderHook, act } from '@testing-library/react';
import useUpdateItinerary from '../../hooks/useUpdateItinerary';
import useGetUserId from '../../hooks/useGetUserId';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { app } from '../../environments/firebaseConfig';

jest.mock('firebase/firestore');
jest.mock('../../hooks/useGetUserId');

describe('useUpdateItinerary', () => {
  const originalError = console.error;
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('updates itinerary successfully', async () => {
    (useGetUserId as jest.Mock).mockReturnValue('user-1');
    (getFirestore as jest.Mock).mockReturnValue({});
    (doc as jest.Mock).mockReturnValue({});
    (updateDoc as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useUpdateItinerary());

    await act(async () => {
      await result.current.updateItinerary('it-1', { destination: 'New Place' } as any);
    });

    expect(getFirestore).toHaveBeenCalledWith(app);
    expect(doc).toHaveBeenCalledWith({}, 'itineraries', 'it-1');
    expect(updateDoc).toHaveBeenCalledWith({}, { destination: 'New Place' });
    expect(result.current.error).toBeNull();
  });

  it('throws when user is not authenticated', async () => {
    (useGetUserId as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useUpdateItinerary());

    await act(async () => {
      await expect(result.current.updateItinerary('it-1', { destination: 'X' } as any)).rejects.toThrow('User not authenticated');
    });
  });

  it('sets error and rethrows when updateDoc fails', async () => {
    (useGetUserId as jest.Mock).mockReturnValue('user-1');
    (getFirestore as jest.Mock).mockReturnValue({});
    (doc as jest.Mock).mockReturnValue({});
    const err = new Error('firestore down');
    (updateDoc as jest.Mock).mockRejectedValue(err);

    const { result } = renderHook(() => useUpdateItinerary());

    await act(async () => {
      await expect(result.current.updateItinerary('it-2', { destination: 'Y' } as any)).rejects.toThrow('firestore down');
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(console.error).toHaveBeenCalled();
  });
});
