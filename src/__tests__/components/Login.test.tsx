import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock SignInForm to a simple placeholder so Login can render quickly
jest.mock('../../../src/components/forms/SignInForm', () => () => (<div>MockSignInForm</div>));

// Mock firebase analytics functions
const mockGetAnalytics = jest.fn();
const mockLogEvent = jest.fn();
jest.mock('firebase/analytics', () => ({
  getAnalytics: () => mockGetAnalytics(),
  logEvent: (...args: any[]) => mockLogEvent(...args)
}));

describe('Login', () => {
  it('renders SignInForm', () => {
    // Import Login normally and assert child form renders
    const { Login } = require('../../../src/components/auth/Login');
    render(<Login />);
    expect(screen.getByText('MockSignInForm')).toBeInTheDocument();
  });
});
