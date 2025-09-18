import { renderHook, act } from '@testing-library/react';
import useDeleteItinerary from '../../hooks/useDeleteItinerary';
import useGetUserId from '../../hooks/useGetUserId';
import { getFirestore, doc, deleteDoc } from 'firebase/firestore';
import { app } from '../../environments/firebaseConfig';

jest.mock('firebase/firestore');
jest.mock('../../hooks/useGetUserId');

describe('useDeleteItinerary', () => {
  const originalError = console.error;
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it('deletes itinerary successfully', async () => {
    (useGetUserId as jest.Mock).mockReturnValue('user-1');
    (getFirestore as jest.Mock).mockReturnValue({});
    (doc as jest.Mock).mockReturnValue({});
    (deleteDoc as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteItinerary());

    await act(async () => {
      await result.current.deleteItinerary('it-1');
    });

    expect(getFirestore).toHaveBeenCalledWith(app);
    expect(doc).toHaveBeenCalledWith({}, 'itineraries', 'it-1');
    expect(deleteDoc).toHaveBeenCalledWith({});
    expect(result.current.error).toBeNull();
  });

  it('throws when user is not authenticated', async () => {
    (useGetUserId as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useDeleteItinerary());

    await act(async () => {
      await expect(result.current.deleteItinerary('it-1')).rejects.toThrow('User not authenticated');
    });
  });

  it('sets error and rethrows when deleteDoc fails', async () => {
    (useGetUserId as jest.Mock).mockReturnValue('user-1');
    (getFirestore as jest.Mock).mockReturnValue({});
    (doc as jest.Mock).mockReturnValue({});
    const err = new Error('delete failed');
    (deleteDoc as jest.Mock).mockRejectedValue(err);

    const { result } = renderHook(() => useDeleteItinerary());

    await act(async () => {
      await expect(result.current.deleteItinerary('it-2')).rejects.toThrow('delete failed');
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(console.error).toHaveBeenCalled();
  });
});
