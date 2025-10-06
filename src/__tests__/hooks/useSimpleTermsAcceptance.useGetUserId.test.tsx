import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mocks for firebase/firestore used by useSimpleTermsAcceptance
jest.mock('firebase/firestore', () => ({
  updateDoc: jest.fn(() => Promise.resolve()),
  getFirestore: jest.fn(),
  doc: jest.fn(),
}));

// Mock the firebaseConfig module so tests can safely set auth.currentUser
jest.mock('../../environments/firebaseConfig', () => ({
  auth: { currentUser: null },
  app: {},
}));

import { UserProfileContext } from '../../Context/UserProfileContext';
import { useSimpleTermsAcceptance } from '../../hooks/useSimpleTermsAcceptance';
import { act } from 'react-dom/test-utils';

describe('useSimpleTermsAcceptance', () => {
  afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // reset mocked auth
    const firebaseConfig = require('../../environments/firebaseConfig');
    firebaseConfig.auth.currentUser = null;
  });

  it('throws when used outside UserProfileProvider', () => {
    const Consumer = () => {
      // calling the hook outside provider should throw synchronously
      useSimpleTermsAcceptance();
      return null;
    };

    expect(() => render(<Consumer />)).toThrow('useSimpleTermsAcceptance must be used within a UserProfileProvider');
  });

  it('acceptTerms updates profile, calls updateDoc and stores in localStorage when user is logged in', async () => {
    // Provide a minimal profile and spy for updateUserProfile
    const mockUpdateUserProfile = jest.fn();
    const profile = { id: 'me', name: 'Test User' };

  // Set a fake authenticated user by mutating the mocked firebaseConfig.auth
  const firebaseConfig = require('../../environments/firebaseConfig');
  firebaseConfig.auth.currentUser = { uid: 'user-123' };

    const TestComponent = () => {
      const { hasAcceptedTerms, acceptTerms, isAccepting } = useSimpleTermsAcceptance();

      return (
        <div>
          <div data-testid="hasAccepted">{String(hasAcceptedTerms)}</div>
          <button onClick={() => acceptTerms()} data-testid="accept">Accept</button>
          <div data-testid="loading">{isAccepting ? 'loading' : 'idle'}</div>
        </div>
      );
    };

    render(
      <UserProfileContext.Provider value={{ userProfile: profile, updateUserProfile: mockUpdateUserProfile, isLoading: false }}>
        <TestComponent />
      </UserProfileContext.Provider>
    );

    // Click accept
    await userEvent.click(screen.getByTestId('accept'));

  // updateDoc should be called with a doc ref (we don't assert doc args deeply)
  const { updateDoc: mockedUpdateDoc } = require('firebase/firestore');
  await waitFor(() => expect(mockedUpdateDoc).toHaveBeenCalled());

    // updateUserProfile should have been called to update local context
    expect(mockUpdateUserProfile).toHaveBeenCalled();

    // localStorage should contain PROFILE_INFO
    const saved = localStorage.getItem('PROFILE_INFO');
    expect(saved).toBeTruthy();
    const parsed = JSON.parse(saved as string);
    expect(parsed.termsAcceptance).toBeTruthy();
  });

  it('throws when accepting terms while not authenticated', async () => {
    // Ensure no user by mutating mocked firebaseConfig
    const firebaseConfig = require('../../environments/firebaseConfig');
    firebaseConfig.auth.currentUser = null;

    const mockUpdateUserProfile = jest.fn();
    const profile = { id: 'me' };

    // Capture the acceptTerms function so we can call it directly and assert rejection
    const acceptRef: { fn?: () => Promise<void> } = {};
    const TestComponent = () => {
      const { acceptTerms } = useSimpleTermsAcceptance();
      // @ts-ignore
      acceptRef.fn = acceptTerms;
      return <div />;
    };

    render(
      <UserProfileContext.Provider value={{ userProfile: profile, updateUserProfile: mockUpdateUserProfile, isLoading: false }}>
        <TestComponent />
      </UserProfileContext.Provider>
    );

    // Calling acceptTerms directly should reject with a 'User must be logged in' error
    await expect(acceptRef.fn!()).rejects.toThrow('User must be logged in to accept terms');
    // updateDoc should not have been called
    const { updateDoc: mockedUpdateDoc2 } = require('firebase/firestore');
    expect(mockedUpdateDoc2).not.toHaveBeenCalled();
  });
});

// -----------------------
// Tests for useGetUserId
// -----------------------

// Mock firebase/auth by capturing the auth state callback into a mock-prefixed variable.
let mockCapturedAuthCallback: any = null;
jest.mock('firebase/auth', () => {
  const onAuthStateChanged = jest.fn((auth: any, cb: any) => {
    // record the callback via mock.calls; return an unsubscribe function
    return () => {};
  });

  return {
    getAuth: jest.fn(() => ({})),
    onAuthStateChanged,
  };
});

import useGetUserId from '../../hooks/useGetUserId';

describe('useGetUserId', () => {
  afterEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('sets userId when onAuthStateChanged reports a user and stores credentials', async () => {
    const Consumer = () => {
      const userId = useGetUserId();
      return <div data-testid="uid">{userId ?? 'null'}</div>;
    };

    const { rerender } = render(<Consumer />);

  // Simulate auth state change: user logs in by invoking the recorded callback
  const { onAuthStateChanged } = require('firebase/auth');
  expect(onAuthStateChanged).toHaveBeenCalled();
  const recordedCb = onAuthStateChanged.mock.calls[0][1];
    const fakeUser = { uid: 'u-1', email: 'a@b.com', emailVerified: true, isAnonymous: false, providerData: [] };
    // call callback as firebase would
  act(() => {
    recordedCb(fakeUser);
  });

    // Expect the UID to be set in the DOM
    await waitFor(() => expect(screen.getByTestId('uid').textContent).toBe('u-1'));

    // And USER_CREDENTIALS should be in localStorage
    const creds = JSON.parse(localStorage.getItem('USER_CREDENTIALS') || '{}');
    expect(creds.user.uid).toBe('u-1');
  });

  it('sets userId to null when onAuthStateChanged reports null', async () => {
    const Consumer = () => {
      const userId = useGetUserId();
      return <div data-testid="uid">{userId ?? 'null'}</div>;
    };

    render(<Consumer />);

  const { onAuthStateChanged: onAuthStateChanged2 } = require('firebase/auth');
  expect(onAuthStateChanged2).toHaveBeenCalled();
  const recordedCb2 = onAuthStateChanged2.mock.calls[0][1];
  act(() => {
    recordedCb2(null);
  });

    await waitFor(() => expect(screen.getByTestId('uid').textContent).toBe('null'));
  });
});
