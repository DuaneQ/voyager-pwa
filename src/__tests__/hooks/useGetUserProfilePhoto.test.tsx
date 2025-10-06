import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';

// Mocks for firestore
const mockGetDoc = jest.fn();
const mockDoc = jest.fn();
const mockGetFirestore = jest.fn();

jest.mock('firebase/firestore', () => ({
  getFirestore: (...args: any[]) => mockGetFirestore(...args),
  doc: (...args: any[]) => mockDoc(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
}));

// Mock env config
jest.mock('../../environments/firebaseConfig', () => ({ app: {} }));

describe('useGetUserProfilePhoto', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns default avatar when no userId provided', async () => {
    const { result } = renderHook(() => require('../../hooks/useGetUserProfilePhoto').useGetUserProfilePhoto(null));
    expect(result.current).toBe('/default-profile.png');
  });

  it('returns profile photo URL when document has photos.profile', async () => {
    const docSnap = {
      exists: () => true,
      data: () => ({ photos: { profile: 'https://cdn.example.com/me.png' } }),
    };

    mockGetDoc.mockResolvedValueOnce(docSnap);
    mockDoc.mockReturnValue('users-doc-ref');

    const { result } = renderHook(() => require('../../hooks/useGetUserProfilePhoto').useGetUserProfilePhoto('user-1'));

    // wait for effect
    await waitFor(() => expect(result.current).toBe('https://cdn.example.com/me.png'));
  });

  it('falls back to default when doc exists but no profile photo', async () => {
    const docSnap = {
      exists: () => true,
      data: () => ({ photos: {} }),
    };
    mockGetDoc.mockResolvedValueOnce(docSnap);
    mockDoc.mockReturnValue('users-doc-ref');

    const { result } = renderHook(() => require('../../hooks/useGetUserProfilePhoto').useGetUserProfilePhoto('user-2'));

    await waitFor(() => expect(result.current).toBe('/default-profile.png'));
  });

  it('falls back to default when getDoc throws', async () => {
    mockGetDoc.mockRejectedValueOnce(new Error('boom'));
    mockDoc.mockReturnValue('users-doc-ref');

    const { result } = renderHook(() => require('../../hooks/useGetUserProfilePhoto').useGetUserProfilePhoto('user-3'));

    await waitFor(() => expect(result.current).toBe('/default-profile.png'));
  });
});
