import { renderHook, act, waitFor } from '@testing-library/react';
import usePostUserProfileToStorage from '../../hooks/usePostUserProfileToStorage';

describe('usePostUserProfileToStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('runs effect and sets isLoading to false', async () => {
    const { result } = renderHook(() => usePostUserProfileToStorage());

    // effect should complete and set isLoading false
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('saves PROFILE_INFO to localStorage when setUserStorageData is called', async () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    const { result } = renderHook(() => usePostUserProfileToStorage());

    act(() => {
      result.current.setUserStorageData({ name: 'alice', avatar: 'x' });
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(setItemSpy).toHaveBeenCalledWith('PROFILE_INFO', JSON.stringify({ name: 'alice', avatar: 'x' }));

    setItemSpy.mockRestore();
  });

  it('handles localStorage.setItem throwing without crashing', async () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('nope'); });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const { result } = renderHook(() => usePostUserProfileToStorage());

    act(() => {
      result.current.setUserStorageData({ foo: 'bar' });
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(logSpy).toHaveBeenCalled();

    setItemSpy.mockRestore();
    logSpy.mockRestore();
  });
});
