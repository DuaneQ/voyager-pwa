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

  test('blocks email signup when a users doc exists for the email', async () => {
    // Mock getDocs to return a non-empty snapshot
    const { getDocs } = require('firebase/firestore');
    getDocs.mockResolvedValue({ empty: false, docs: [{ id: 'u1' }] });

  const { getByTestId, getByPlaceholderText } = renderWithAlert(<SignUpForm />);

  const emailInput = getByPlaceholderText('your@email.com') as HTMLInputElement;
  fireEvent.change(emailInput, { target: { value: 'alice@example.com' } });

  // Submit the form
  fireEvent.click(getByTestId('email-signup-button'));

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith('Error', 'An account already exists for that email. Please sign in instead.');
    });

    const { setDoc } = require('firebase/firestore');
    expect(setDoc).not.toHaveBeenCalled();
  });

  test('blocks google signup when a users doc exists for the email', async () => {
    // Mock signInWithPopup to return a user
    const { signInWithPopup } = require('firebase/auth');
    signInWithPopup.mockResolvedValue({ user: { uid: 'u1', email: 'alice@example.com', displayName: 'Alice' } });

    const { getDocs } = require('firebase/firestore');
    getDocs.mockResolvedValue({ empty: false, docs: [{ id: 'u1' }] });

    const { getByTestId } = renderWithAlert(<SignUpForm />);

    fireEvent.click(getByTestId('google-signup-button'));

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith('Error', 'A profile already exists for this email. Please sign in instead.');
    });

    const { setDoc } = require('firebase/firestore');
    expect(setDoc).not.toHaveBeenCalled();
  });
});
