import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { UserProfileContext, UserProfileProvider } from '../../Context/UserProfileContext';

const TestComponent = () => {
  const { userProfile, setUserProfile, updateUserProfile } = React.useContext(UserProfileContext);
  return (
    <div>
      <button onClick={() => setUserProfile({ username: 'test', email: 'test@email.com' })}>Set</button>
      <button onClick={() => updateUserProfile({ username: 'updated', extra: 'field' })}>Update</button>
      <span data-testid="profile">{userProfile ? JSON.stringify(userProfile) : 'null'}</span>
    </div>
  );
};

describe('UserProfileContext', () => {
  it('provides default userProfile as null', () => {
    render(
      <UserProfileProvider>
        <TestComponent />
      </UserProfileProvider>
    );
    expect(screen.getByTestId('profile').textContent).toBe('null');
  });

  it('setUserProfile sets the userProfile', () => {
    render(
      <UserProfileProvider>
        <TestComponent />
      </UserProfileProvider>
    );
    act(() => {
      screen.getByText('Set').click();
    });
    expect(screen.getByTestId('profile').textContent).toContain('test@email.com');
  });

  it('updateUserProfile replaces the userProfile', () => {
    render(
      <UserProfileProvider>
        <TestComponent />
      </UserProfileProvider>
    );
    act(() => {
      screen.getByText('Set').click();
    });
    act(() => {
      screen.getByText('Update').click();
    });
    expect(screen.getByTestId('profile').textContent).toContain('updated');
    expect(screen.getByTestId('profile').textContent).toContain('extra');
  });
});