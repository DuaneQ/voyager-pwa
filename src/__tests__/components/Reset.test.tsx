// Mocks must be defined before any imports!
var mockShowAlert = jest.fn();
var mockNavigate = jest.fn();

jest.mock('firebase/app', () => ({ initializeApp: jest.fn() }));
jest.mock('firebase/auth', () => {
  const sendPasswordResetEmail = jest.fn(() => Promise.resolve());
  return {
    __esModule: true,
    getAuth: jest.fn(() => ({ currentUser: {} })),
    sendPasswordResetEmail,
  };
});
jest.mock('../../environments/firebaseConfig', () => ({ auth: { currentUser: {} } }));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AlertContext } from '../../Context/AlertContext';

function renderWithProviders(Component) {
  return render(
    <AlertContext.Provider value={{ showAlert: mockShowAlert }}>
      <MemoryRouter>
        <Component />
      </MemoryRouter>
    </AlertContext.Provider>
  );
}

describe('Reset', () => {
  it('renders form and submits valid email', async () => {
    const { sendPasswordResetEmail } = require('firebase/auth');
    const { Reset } = require('../../components/auth/Reset');
    renderWithProviders(Reset);
    const emailInput = screen.getByPlaceholderText(/your@email.com/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    await waitFor(() => {
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com'
      );
      expect(mockShowAlert).toHaveBeenCalledWith('Info', expect.stringMatching(/check your email/i));
      expect(mockNavigate).toHaveBeenCalledWith('/Login');
    });
  });

  it('shows error for invalid email', async () => {
    const { Reset } = require('../../components/auth/Reset');
    renderWithProviders(Reset);
    const emailInput = screen.getByPlaceholderText(/your@email.com/i);
    fireEvent.change(emailInput, { target: { value: 'invalid' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(await screen.findByText(/please enter a valid email/i)).toBeInTheDocument();
  });

  it('shows error if firebase throws', async () => {
    const { sendPasswordResetEmail } = require('firebase/auth');
    sendPasswordResetEmail.mockRejectedValueOnce(new Error('fail'));
    const { Reset } = require('../../components/auth/Reset');
    renderWithProviders(Reset);
    const emailInput = screen.getByPlaceholderText(/your@email.com/i);
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith('Error', 'fail');
    });
  });
});
