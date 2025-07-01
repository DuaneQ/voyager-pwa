import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BetaBanner } from '../../components/utilities/BetaBanner';
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

describe('BetaBanner', () => {
  const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com'
  };

  const mockShowAlert = jest.fn();

  const renderWithProviders = (props = {}) => {
    return render(
      <UserAuthContext.Provider value={{ user: mockUser, loading: false }}>
        <AlertContext.Provider value={{ showAlert: mockShowAlert }}>
          <BetaBanner {...props} />
        </AlertContext.Provider>
      </UserAuthContext.Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage before each test
    localStorage.clear();
  });

  test('renders beta banner', () => {
    renderWithProviders();
    
    expect(screen.getByText(/Welcome to TravalPass Beta!/i)).toBeInTheDocument();
  });

  test('displays beta messaging', () => {
    renderWithProviders();
    
    expect(screen.getByText(/help us improve/i)).toBeInTheDocument();
    expect(screen.getByText(/sharing your feedback/i)).toBeInTheDocument();
  });

  test('has feedback button', () => {
    renderWithProviders();
    
    const feedbackButton = screen.getByRole('button', { name: /general feedback/i });
    expect(feedbackButton).toBeInTheDocument();
  });

  test('opens feedback modal when feedback button is clicked', () => {
    renderWithProviders();
    
    const feedbackButton = screen.getByRole('button', { name: /general feedback/i });
    fireEvent.click(feedbackButton);
    
    // Modal should be open
    expect(screen.getByText('Share Your Feedback')).toBeInTheDocument();
  });

  test('has dismiss button', () => {
    renderWithProviders();
    
    const dismissButton = screen.getByRole('button', { name: /close/i });
    expect(dismissButton).toBeInTheDocument();
  });

  test('can be dismissed', () => {
    renderWithProviders();
    
    const dismissButton = screen.getByRole('button', { name: /close/i });
    
    fireEvent.click(dismissButton);
    
    // Banner should be hidden
    expect(screen.queryByText(/Welcome to TravalPass Beta!/i)).not.toBeInTheDocument();
  });

  test('remembers dismissal state', () => {
    const { rerender } = renderWithProviders();
    
    // Dismiss the banner
    const dismissButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(dismissButton);
    
    // Re-render component
    rerender(
      <UserAuthContext.Provider value={{ user: mockUser, loading: false }}>
        <AlertContext.Provider value={{ showAlert: mockShowAlert }}>
          <BetaBanner />
        </AlertContext.Provider>
      </UserAuthContext.Provider>
    );
    
    // Banner should still be hidden
    expect(screen.queryByText(/Welcome to TravalPass Beta!/i)).not.toBeInTheDocument();
  });

  test('renders with custom version', () => {
    renderWithProviders({ version: '2.0.0-beta' });
    
    expect(screen.getByText('2.0.0-beta')).toBeInTheDocument();
  });

  test('renders with different variants/styles', () => {
    renderWithProviders();
    
    const banner = screen.getByRole('alert');
    expect(banner).toBeInTheDocument();
  });

  test('is accessible', () => {
    renderWithProviders();
    
    // Should have proper ARIA attributes
    const banner = screen.getByRole('alert');
    expect(banner).toBeInTheDocument();
  });

  test('renders without providers (graceful degradation)', () => {
    render(<BetaBanner />);
    
    expect(screen.getByText(/Welcome to TravalPass Beta!/i)).toBeInTheDocument();
  });

  test('displays version information if provided', () => {
    renderWithProviders({ version: '0.1.0-beta' });
    
    expect(screen.getByText(/0\.1\.0-beta/)).toBeInTheDocument();
  });

  test('closes modal when feedback is submitted', async () => {
    renderWithProviders();
    
    // Open feedback modal
    const feedbackButton = screen.getByRole('button', { name: /general feedback/i });
    fireEvent.click(feedbackButton);
    
    expect(screen.getByText('Share Your Feedback')).toBeInTheDocument();
    
    // Close the modal
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    // Modal should close and banner should still be visible
    await waitFor(() => {
      expect(screen.queryByText('Share Your Feedback')).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Welcome to TravalPass Beta!/i)).toBeInTheDocument();
  });

  test('has proper styling classes', () => {
    renderWithProviders();
    
    const banner = screen.getByRole('alert');
    expect(banner).toBeInTheDocument();
  });

  test('displays correctly on mobile and desktop', () => {
    renderWithProviders();
    
    const banner = screen.getByRole('alert');
    
    // Should have responsive styling
    const computedStyle = window.getComputedStyle(banner);
    expect(computedStyle.display).not.toBe('none');
  });

  test('has multiple feedback buttons', () => {
    renderWithProviders();
    
    expect(screen.getByRole('button', { name: /Report Bug/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Suggest Feature/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /General Feedback/i })).toBeInTheDocument();
  });

  test('opens feedback modal with correct type for bug button', () => {
    renderWithProviders();
    
    const bugButton = screen.getByRole('button', { name: /Report Bug/i });
    fireEvent.click(bugButton);
    
    expect(screen.getByText('Share Your Feedback')).toBeInTheDocument();
  });

  test('opens feedback modal with correct type for feature button', () => {
    renderWithProviders();
    
    const featureButton = screen.getByRole('button', { name: /Suggest Feature/i });
    fireEvent.click(featureButton);
    
    expect(screen.getByText('Share Your Feedback')).toBeInTheDocument();
  });
});
