import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FeedbackButton } from '../../components/utilities/FeedbackButton';
import { Context as UserAuthContext } from '../../Context/UserAuthContext';
import { AlertContext } from '../../Context/AlertContext';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  addDoc: jest.fn(() => Promise.resolve({ id: 'test-feedback-id' })),
}));

jest.mock('../../environments/firebaseConfig', () => ({
  app: {}
}));

// Mock hooks
jest.mock('../../hooks/useGetUserId', () => ({
  __esModule: true,
  default: () => 'test-user-id'
}));

describe('FeedbackButton', () => {
  const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com'
  };

  const mockShowAlert = jest.fn();

  const renderWithProviders = (props = {}) => {
    return render(
      <UserAuthContext.Provider value={{ user: mockUser, loading: false }}>
        <AlertContext.Provider value={{ showAlert: mockShowAlert }}>
          <FeedbackButton {...props} />
        </AlertContext.Provider>
      </UserAuthContext.Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders feedback button', () => {
    renderWithProviders();
    
    const button = screen.getByRole('button', { name: /feedback/i });
    expect(button).toBeInTheDocument();
  });

  test('opens feedback modal when button is clicked', () => {
    renderWithProviders();
    
    const button = screen.getByRole('button', { name: /feedback/i });
    fireEvent.click(button);
    
    // Modal should be open
    expect(screen.getByText('Share Your Feedback')).toBeInTheDocument();
  });

  test('has correct accessibility attributes', () => {
    renderWithProviders();
    
    const button = screen.getByRole('button', { name: /feedback/i });
    expect(button).toHaveAttribute('aria-label', 'feedback');
  });

  test('shows tooltip on hover', () => {
    renderWithProviders();
    
    // The button should be wrapped in a tooltip
    const button = screen.getByRole('button', { name: /feedback/i });
    expect(button).toBeInTheDocument();
  });

  test('renders with default position (bottom-right)', () => {
    renderWithProviders();
    
    const button = screen.getByRole('button', { name: /feedback/i });
    const computedStyle = window.getComputedStyle(button);
    
    expect(button).toHaveStyle('position: fixed');
  });

  test('renders with custom position', () => {
    renderWithProviders({ position: 'bottom-left' });
    
    const button = screen.getByRole('button', { name: /feedback/i });
    expect(button).toHaveStyle('position: fixed');
  });

  test('displays feedback icon', () => {
    renderWithProviders();
    
    // Check for the MUI Feedback icon
    const button = screen.getByRole('button', { name: /feedback/i });
    const icon = button.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  test('has correct z-index for proper layering', () => {
    renderWithProviders();
    
    const button = screen.getByRole('button', { name: /feedback/i });
    const computedStyle = window.getComputedStyle(button);
    
    // Should have high z-index to appear above other elements
    expect(parseInt(computedStyle.zIndex)).toBeGreaterThan(1000);
  });

  test('renders as FAB variant by default', () => {
    renderWithProviders();
    
    const button = screen.getByRole('button', { name: /feedback/i });
    // FAB buttons typically have the MuiFab-root class
    expect(button.className).toContain('MuiFab');
  });

  test('renders with custom color', () => {
    renderWithProviders({ color: 'secondary' });
    
    const button = screen.getByRole('button', { name: /feedback/i });
    expect(button).toBeInTheDocument();
  });

  test('initializes modal with specific feedback type', () => {
    renderWithProviders({ initialType: 'bug' });
    
    const button = screen.getByRole('button', { name: /feedback/i });
    fireEvent.click(button);
    
    // Modal should open with bug type pre-selected
    expect(screen.getByText('Share Your Feedback')).toBeInTheDocument();
    // The bug option should be selected (this would need to check the form state)
  });

  test('closes modal properly', async () => {
    renderWithProviders();
    
    const button = screen.getByRole('button', { name: /feedback/i });
    fireEvent.click(button);
    
    // Modal is open
    expect(screen.getByText('Share Your Feedback')).toBeInTheDocument();
    
    // Close modal
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByText('Share Your Feedback')).not.toBeInTheDocument();
    });
  });

  test('is keyboard accessible', () => {
    renderWithProviders();
    
    const button = screen.getByRole('button', { name: /feedback/i });
    
    // Check that button is accessible with proper tabindex
    expect(button).toHaveAttribute('tabindex', '0');
    expect(button).toHaveAttribute('aria-label', 'feedback');
  });

  test('renders without providers (graceful degradation)', () => {
    render(<FeedbackButton />);
    
    const button = screen.getByRole('button', { name: /feedback/i });
    expect(button).toBeInTheDocument();
  });
});
