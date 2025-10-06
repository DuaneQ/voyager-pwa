import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('../../../src/components/forms/SignUpForm', () => () => (<div>MockSignUpForm</div>));

describe('Register', () => {
  it('renders SignUpForm', () => {
    const { Register } = require('../../../src/components/auth/Register');
    render(<Register />);
    expect(screen.getByText('MockSignUpForm')).toBeInTheDocument();
  });
});
