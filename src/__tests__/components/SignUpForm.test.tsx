import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import SignUpForm from '../../../src/components/forms/SignUpForm';
import { AlertContext } from '../../../src/Context/AlertContext';
import { MemoryRouter } from 'react-router-dom';

jest.mock('firebase/firestore');
jest.mock('firebase/auth');

const mockShowAlert = jest.fn();

function renderWithAlert(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <AlertContext.Provider value={{ showAlert: mockShowAlert } as any}>{ui}</AlertContext.Provider>
    </MemoryRouter>
  );
}

describe('SignUpForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('blocks email signup when Firebase Auth detects duplicate email', async () => {
    // Mock createUserWithEmailAndPassword to throw duplicate email error
    const { createUserWithEmailAndPassword } = require('firebase/auth');
    createUserWithEmailAndPassword.mockRejectedValue({ 
      code: 'auth/email-already-in-use',
      message: 'The email address is already in use by another account.'
    });

    const { getByTestId, getByPlaceholderText } = renderWithAlert(<SignUpForm />);

    const usernameInput = getByPlaceholderText('Username') as HTMLInputElement;
    const emailInput = getByPlaceholderText('your@email.com') as HTMLInputElement;
    const passwordInput = getByPlaceholderText('Enter your password') as HTMLInputElement;
    const confirmInput = getByPlaceholderText('Confirm your password') as HTMLInputElement;

    fireEvent.change(usernameInput, { target: { value: 'alice' } });
    fireEvent.change(emailInput, { target: { value: 'alice@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'password123' } });

    // Submit the form
    fireEvent.click(getByTestId('email-signup-button'));

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith('Error', 'An account already exists for that email. Please sign in instead.');
    });

    const { setDoc } = require('firebase/firestore');
    expect(setDoc).not.toHaveBeenCalled();
  });

  test('allows google signup even if user profile might exist (setDoc handles conflicts)', async () => {
    // Mock signInWithPopup to return a user
    const { signInWithPopup } = require('firebase/auth');
    signInWithPopup.mockResolvedValue({ user: { uid: 'u1', email: 'alice@example.com', displayName: 'Alice' } });

    // Mock setDoc to succeed
    const { setDoc } = require('firebase/firestore');
    setDoc.mockResolvedValue(undefined);

    const { getByTestId } = renderWithAlert(<SignUpForm />);

    fireEvent.click(getByTestId('google-signup-button'));

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith('Success', 'You have successfully signed up with Google!');
    });

    expect(setDoc).toHaveBeenCalled();
  });
});
