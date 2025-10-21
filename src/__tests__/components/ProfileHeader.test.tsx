import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mocks for internals used by ProfileHeader
jest.mock('../../hooks/useGetUserProfile', () => jest.fn());
jest.mock('../../components/forms/ProfilePhoto', () => ({ 
  ProfilePhoto: () => <div data-testid="profile-photo" />
}));
jest.mock('../../components/forms/EditProfileModal', () => ({ EditProfileModal: ({ show }: any) => show ? <div data-testid="edit-modal" /> : null }));

// Prevent importing the real firebase config which initializes SDKs in test env
jest.mock('../../environments/firebaseConfig', () => ({ auth: {} }));

// Mock firebase auth signOut
const mockSignOut = jest.fn(() => Promise.resolve());
jest.mock('firebase/auth', () => ({ signOut: () => mockSignOut() }));

import { ProfileHeader } from '../../components/forms/ProfileHeader';
import { UserProfileContext } from '../../Context/UserProfileContext';

describe('ProfileHeader', () => {
  beforeEach(() => {
    mockSignOut.mockClear();
    // reset window location before tests
    delete (window as any).location;
    (window as any).location = { href: '' };
  });

  it('renders the username and profile photo', () => {
    render(
      <UserProfileContext.Provider value={{ userProfile: { username: 'Tester' } } as any}>
        <ProfileHeader />
      </UserProfileContext.Provider>
    );

    expect(screen.getByText('Tester')).toBeInTheDocument();
    expect(screen.getByTestId('profile-photo')).toBeInTheDocument();
  });

  it('opens menu and shows edit modal when Edit Profile is clicked', async () => {
    render(
      <UserProfileContext.Provider value={{ userProfile: { username: 'Tester' } } as any}>
        <ProfileHeader />
      </UserProfileContext.Provider>
    );

    await userEvent.click(screen.getByLabelText(/more options/i));

    // Click Edit Profile MenuItem
    const editItem = screen.getByText(/Edit Profile/i);
    await userEvent.click(editItem);

    // The mocked EditProfileModal renders a node when show is true
    expect(screen.getByTestId('edit-modal')).toBeInTheDocument();
  });

  it('calls signOut and redirects on Logout click', async () => {
    render(
      <UserProfileContext.Provider value={{ userProfile: { username: 'Tester' } } as any}>
        <ProfileHeader />
      </UserProfileContext.Provider>
    );

    await userEvent.click(screen.getByLabelText(/more options/i));
    const logoutItem = screen.getByText(/Logout/i);
    await userEvent.click(logoutItem);

    // signOut should be called and window.location.href updated
    expect(mockSignOut).toHaveBeenCalled();
    expect((window as any).location.href).toBe('/login');
  });
});

export {};
