import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import useGetUserProfile from '../../hooks/useGetUserProfile';
import { UserProfileContext } from '../../Context/UserProfileContext';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app, auth } from '../../environments/firebaseConfig';

jest.mock('firebase/firestore');

describe('useGetUserProfile', () => {
  const updateUserProfile = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // default: auth has a user
    (auth as any).currentUser = { uid: 'u1' };
  });

  it('fetches profile from firestore and updates context + localStorage', async () => {
    const profile = { username: 'alice' };
    const mockSnap = { exists: () => true, data: () => profile };

    (getFirestore as jest.Mock).mockReturnValue({});
    (doc as jest.Mock).mockReturnValue({});
    (getDoc as jest.Mock).mockResolvedValue(mockSnap);

    const wrapper = ({ children }: any) => (
      <UserProfileContext.Provider value={{ updateUserProfile, userProfile: null, setUserProfile: jest.fn(), isLoading: false }}>
        {children}
      </UserProfileContext.Provider>
    );

    const { result } = renderHook(() => useGetUserProfile(), { wrapper });

    // wait for effect to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));

  expect(updateUserProfile).toHaveBeenCalledWith(profile);
  // PROFILE_INFO should have been set
    const stored = JSON.parse(window.localStorage.getItem('PROFILE_INFO') as string);
    expect(stored).toEqual(profile);
  });

  it('falls back to localStorage when getDoc throws', async () => {
    (getFirestore as jest.Mock).mockReturnValue({});
    (doc as jest.Mock).mockReturnValue({});
    (getDoc as jest.Mock).mockRejectedValue(new Error('boom'));

    // pre-fill localStorage
    const cached = { username: 'cached' };
    window.localStorage.setItem('PROFILE_INFO', JSON.stringify(cached));

    const wrapper = ({ children }: any) => (
      <UserProfileContext.Provider value={{ updateUserProfile, userProfile: null, setUserProfile: jest.fn(), isLoading: false }}>
        {children}
      </UserProfileContext.Provider>
    );

    const { result } = renderHook(() => useGetUserProfile(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(updateUserProfile).toHaveBeenCalledWith(cached);
  });

  it('does nothing when no auth user exists', async () => {
    (auth as any).currentUser = null;

    const wrapper = ({ children }: any) => (
      <UserProfileContext.Provider value={{ updateUserProfile, userProfile: null, setUserProfile: jest.fn(), isLoading: false }}>
        {children}
      </UserProfileContext.Provider>
    );

    const { result } = renderHook(() => useGetUserProfile(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // updateUserProfile should not have been called
    expect(updateUserProfile).not.toHaveBeenCalled();
  });
});
