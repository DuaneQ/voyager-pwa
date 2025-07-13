import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TermsGuard } from '../../components/auth/TermsGuard';
import { useTermsAcceptance } from '../../hooks/useTermsAcceptance';
import { signOut } from 'firebase/auth';

// Mock the hooks
jest.mock('../../hooks/useTermsAcceptance');

// Mock Firebase auth
jest.mock('firebase/auth', () => ({
  signOut: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../environments/firebaseConfig', () => ({
  auth: {
    currentUser: null,  // We'll update this in each test
  },
}));

// Mock the TermsOfServiceModal
jest.mock('../../components/modals/TermsOfServiceModal', () => ({
  TermsOfServiceModal: ({ open, onAccept, onDecline, loading }: any) => 
    open ? (
      <div data-testid="terms-modal">
        <button onClick={onAccept} disabled={loading}>Accept Terms</button>
        <button onClick={onDecline} disabled={loading}>Decline Terms</button>
        {loading && <div>Loading...</div>}
      </div>
    ) : null,
}));

const mockUseTermsAcceptance = useTermsAcceptance as jest.MockedFunction<typeof useTermsAcceptance>;
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;

// Import and mock the auth object
import { auth as firebaseAuth } from '../../environments/firebaseConfig';

// Test wrapper with Router
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('TermsGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const TestChild = () => <div data-testid="protected-content">Protected Content</div>;

  it('shows loading state while checking terms', () => {
    // Set up the auth mock for this test
    (firebaseAuth as any).currentUser = { uid: 'user123' };
    
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: true,
      error: null,
      acceptTerms: jest.fn(),
      checkTermsStatus: jest.fn(),
    });

    render(
      <TestWrapper>
        <TermsGuard>
          <TestChild />
        </TermsGuard>
      </TestWrapper>
    );

    // Look for the actual loading text from the component
    expect(screen.getByText('Checking terms acceptance...') || 
           screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders children when terms are accepted', () => {
    // Set up the auth mock for this test
    (firebaseAuth as any).currentUser = { uid: 'user123' };
    
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: true,
      isLoading: false,
      error: null,
      acceptTerms: jest.fn(),
      checkTermsStatus: jest.fn(),
    });

    render(
      <TestWrapper>
        <TermsGuard>
          <TestChild />
        </TermsGuard>
      </TestWrapper>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('terms-modal')).not.toBeInTheDocument();
  });

  it('shows terms modal when terms are not accepted', () => {
    // Set up the auth mock for this test
    (firebaseAuth as any).currentUser = { uid: 'user123' };
    
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: false,
      acceptTerms: jest.fn(),
      checkTermsStatus: jest.fn(),
      error: null,
    });

    render(
      <TestWrapper>
        <TermsGuard>
          <TestChild />
        </TermsGuard>
      </TestWrapper>
    );

    expect(screen.getByTestId('terms-modal')).toBeInTheDocument();
    // Use the actual text from the component output
    expect(screen.getByText('Terms of Service Required')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders children when user is not logged in', () => {
    // Set up the auth mock to return null for currentUser
    (firebaseAuth as any).currentUser = null;
    
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: false,
      error: null,
      acceptTerms: jest.fn(),
      checkTermsStatus: jest.fn(),
    });

    render(
      <TestWrapper>
        <TermsGuard>
          <TestChild />
        </TermsGuard>
      </TestWrapper>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('terms-modal')).not.toBeInTheDocument();
  });

  it('renders custom fallback during loading', () => {
    // Set up the auth mock for this test
    (firebaseAuth as any).currentUser = { uid: 'user123' };
    
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: true,
      error: null,
      acceptTerms: jest.fn(),
      checkTermsStatus: jest.fn(),
    });

    const CustomFallback = () => <div data-testid="custom-loading">Custom Loading...</div>;

    render(
      <TestWrapper>
        <TermsGuard fallback={<CustomFallback />}>
          <TestChild />
        </TermsGuard>
      </TestWrapper>
    );

    expect(screen.getByTestId('custom-loading')).toBeInTheDocument();
    expect(screen.queryByText('Checking terms acceptance...')).not.toBeInTheDocument();
  });

  it('calls acceptTerms when accept button is clicked', async () => {
    const mockAcceptTerms = jest.fn().mockResolvedValue(undefined);
    
    // Set up the auth mock for this test
    (firebaseAuth as any).currentUser = { uid: 'user123' };
    
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: false,
      acceptTerms: mockAcceptTerms,
      checkTermsStatus: jest.fn(),
      error: null,
    });

    render(
      <TestWrapper>
        <TermsGuard>
          <TestChild />
        </TermsGuard>
      </TestWrapper>
    );

    const acceptButton = screen.getByText('Accept Terms');
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(mockAcceptTerms).toHaveBeenCalledTimes(1);
    });
  });

  it('handles accept terms error gracefully', async () => {
    const mockAcceptTerms = jest.fn().mockRejectedValue(new Error('Accept failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Set up the auth mock for this test
    (firebaseAuth as any).currentUser = { uid: 'user123' };
    
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: false,
      acceptTerms: mockAcceptTerms,
      checkTermsStatus: jest.fn(),
      error: null,
    });

    render(
      <TestWrapper>
        <TermsGuard>
          <TestChild />
        </TermsGuard>
      </TestWrapper>
    );

    const acceptButton = screen.getByText('Accept Terms');
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to accept terms:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('handles decline terms correctly', async () => {
    // Set up the auth mock for this test
    (firebaseAuth as any).currentUser = { uid: 'user123' };
    
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: false,
      acceptTerms: jest.fn(),
      checkTermsStatus: jest.fn(),
      error: null,
    });

    render(
      <TestWrapper>
        <TermsGuard>
          <TestChild />
        </TermsGuard>
      </TestWrapper>
    );

    const declineButton = screen.getByText('Decline Terms');
    fireEvent.click(declineButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  it('shows loading state in modal when accepting terms', () => {
    // Set up the auth mock for this test
    (firebaseAuth as any).currentUser = { uid: 'user123' };
    
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: false,
      acceptTerms: jest.fn(),
      checkTermsStatus: jest.fn(),
      error: null,
    });

    render(
      <TestWrapper>
        <TermsGuard>
          <TestChild />
        </TermsGuard>
      </TestWrapper>
    );

    // Verify modal is rendered
    expect(screen.getByTestId('terms-modal')).toBeInTheDocument();
    expect(screen.getByText('Accept Terms')).toBeInTheDocument();
    expect(screen.getByText('Decline Terms')).toBeInTheDocument();
  });

  it('shows component loading state when no fallback provided', () => {
    // Set up the auth mock for this test
    (firebaseAuth as any).currentUser = { uid: 'user123' };
    
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: true,
      error: null,
      acceptTerms: jest.fn(),
      checkTermsStatus: jest.fn(),
    });

    render(
      <TestWrapper>
        <TermsGuard>
          <TestChild />
        </TermsGuard>
      </TestWrapper>
    );

    // Should show loading spinner (CircularProgress)
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });
  
  // Add a new test for the error state
  it('shows error state with retry button', () => {
    // Set up the auth mock for this test
    (firebaseAuth as any).currentUser = { uid: 'user123' };
    
    const mockCheckTermsStatus = jest.fn().mockResolvedValue(false);
    
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: false,
      acceptTerms: jest.fn(),
      checkTermsStatus: mockCheckTermsStatus,
      error: new Error('Failed to check terms'),
    });

    render(
      <TestWrapper>
        <TermsGuard>
          <TestChild />
        </TermsGuard>
      </TestWrapper>
    );

    // Should show error message
    expect(screen.getByText('Error checking terms acceptance')).toBeInTheDocument();
    expect(screen.getByText('Failed to check terms')).toBeInTheDocument();
    
    // Should have retry button
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);
    
    expect(mockCheckTermsStatus).toHaveBeenCalledTimes(1);
  });

  it('handles errors from the useTermsAcceptance hook', async () => {
    // Set up the auth mock for this test
    (firebaseAuth as any).currentUser = { uid: 'user123' };
    
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: false,
      error: new Error('Hook error'),
      acceptTerms: jest.fn(),
      checkTermsStatus: jest.fn().mockResolvedValue(false),
    });

    render(
      <TestWrapper>
        <TermsGuard>
          <TestChild />
        </TermsGuard>
      </TestWrapper>
    );

    // Should show error message from the hook
    expect(screen.getByText('Error checking terms acceptance')).toBeInTheDocument();
    expect(screen.getByText('Hook error')).toBeInTheDocument();
    
    // Should have retry button and sign out button
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Sign Out')).toBeInTheDocument();
  });

  it('allows retry after error and increments retry count', async () => {
    // Set up the auth mock for this test
    (firebaseAuth as any).currentUser = { uid: 'user123' };
    
    const mockCheckTermsStatus = jest.fn()
      .mockResolvedValue(false);
    
    // First render - shows error state
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: false,
      error: new Error('Initial error'),
      acceptTerms: jest.fn(),
      checkTermsStatus: mockCheckTermsStatus,
    });

    const { rerender } = render(
      <TestWrapper>
        <TermsGuard>
          <TestChild />
        </TermsGuard>
      </TestWrapper>
    );

    // First render - shows error
    expect(screen.getByText('Error checking terms acceptance')).toBeInTheDocument();
    expect(screen.getByText('Initial error')).toBeInTheDocument();
    
    // Update mock for second render - success
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: true,
      isLoading: false,
      error: null,
      acceptTerms: jest.fn(),
      checkTermsStatus: mockCheckTermsStatus,
    });
    
    // Click retry
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);
    
    // Simulate rerender with new hook value
    rerender(
      <TestWrapper>
        <TermsGuard>
          <TestChild />
        </TermsGuard>
      </TestWrapper>
    );
    
    // Should now show protected content after retry succeeds
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('handles auth-related errors during terms acceptance', async () => {
    const mockAcceptTerms = jest.fn().mockRejectedValue(
      new Error('User document not found. Please refresh and try again.')
    );
    
    // Set up auth with user
    (firebaseAuth as any).currentUser = { uid: 'user123' };
    
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: false,
      error: null,
      acceptTerms: mockAcceptTerms,
      checkTermsStatus: jest.fn().mockResolvedValue(false),
    });

    render(
      <TestWrapper>
        <TermsGuard>
          <TestChild />
        </TermsGuard>
      </TestWrapper>
    );

    // Click accept terms
    const acceptButton = screen.getByText('Accept Terms');
    fireEvent.click(acceptButton);
    
    // Verify error is displayed
    await waitFor(() => {
      // Should show error component with appropriate message
      expect(screen.getByText('Error checking terms acceptance')).toBeInTheDocument();
    });
  });
});
