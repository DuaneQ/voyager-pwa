// Mocks must be defined before any imports!
jest.mock('firebase/auth'); // Use the manual mock

var mockAuth = { currentUser: { email: 'test@example.com' } };
var mockShowAlert = jest.fn();

jest.mock('firebase/app', () => ({ initializeApp: jest.fn() }));
jest.mock('../../environments/firebaseConfig', () => ({
  get auth() { return mockAuth; }
}));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AlertContext } from '../../Context/AlertContext';

describe('ResendEmail', () => {
  // Get the mock function from the manual mock
  const { sendEmailVerification } = require('firebase/auth');

  function renderWithProviders(Component) {
    return render(
      <AlertContext.Provider value={{ showAlert: mockShowAlert }}>
        <MemoryRouter>
          <Component />
        </MemoryRouter>
      </AlertContext.Provider>
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.currentUser = { email: 'test@example.com' }; // reset for each test
    sendEmailVerification.mockImplementation(() => Promise.resolve());
  });

  it('renders and sends verification email when button is clicked', async () => {
    const { ResendEmail } = require('../../components/auth/ResendEmail');
    renderWithProviders(ResendEmail);
    const button = screen.getByRole('button', { name: /resend email verification link/i });
    fireEvent.click(button);
    await waitFor(() => {
      expect(sendEmailVerification).toHaveBeenCalledWith(mockAuth.currentUser);
      expect(mockShowAlert).toHaveBeenCalledWith('Success', expect.stringMatching(/verification email sent/i));
    });
  });

  it('shows error if firebase throws', async () => {
    sendEmailVerification.mockRejectedValueOnce(new Error('fail'));
    const { ResendEmail } = require('../../components/auth/ResendEmail');
    renderWithProviders(ResendEmail);
    const button = screen.getByRole('button', { name: /resend email verification link/i });
    fireEvent.click(button);
    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith('Error', 'fail');
    });
  });

  it('does not call sendEmailVerification if no currentUser', async () => {
    mockAuth.currentUser = null;
    const { ResendEmail } = require('../../components/auth/ResendEmail');
    renderWithProviders(ResendEmail);
    const button = screen.getByRole('button', { name: /resend email verification link/i });
    fireEvent.click(button);
    await waitFor(() => {
      expect(sendEmailVerification).not.toHaveBeenCalled();
      expect(mockShowAlert).not.toHaveBeenCalled();
    });
  });
});
