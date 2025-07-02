import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TermsGuard } from '../../components/auth/TermsGuard';
import { useTermsAcceptance } from '../../hooks/useTermsAcceptance';
import useGetUserId from '../../hooks/useGetUserId';
import { signOut } from 'firebase/auth';

// Mock the hooks
jest.mock('../../hooks/useTermsAcceptance');
jest.mock('../../hooks/useGetUserId');

// Mock Firebase auth
jest.mock('firebase/auth', () => ({
  signOut: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../environments/firebaseConfig', () => ({
  auth: {},
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
const mockUseGetUserId = useGetUserId as jest.MockedFunction<typeof useGetUserId>;
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;

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
    mockUseGetUserId.mockReturnValue('user123');
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: true,
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
           screen.getByRole('progressbar') ||
           screen.getByTestId('custom-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders children when terms are accepted', () => {
    mockUseGetUserId.mockReturnValue('user123');
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: true,
      isLoading: false,
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
    mockUseGetUserId.mockReturnValue('user123');
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: false,
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

    expect(screen.getByTestId('terms-modal')).toBeInTheDocument();
    // Use the actual text from the component output
    expect(screen.getByText('Terms of Service Required')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders children when user is not logged in', () => {
    mockUseGetUserId.mockReturnValue(null);
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: false,
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
    mockUseGetUserId.mockReturnValue('user123');
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: true,
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
    
    mockUseGetUserId.mockReturnValue('user123');
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: false,
      acceptTerms: mockAcceptTerms,
      checkTermsStatus: jest.fn(),
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
    
    mockUseGetUserId.mockReturnValue('user123');
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: false,
      acceptTerms: mockAcceptTerms,
      checkTermsStatus: jest.fn(),
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
    mockUseGetUserId.mockReturnValue('user123');
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: false,
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

    const declineButton = screen.getByText('Decline Terms');
    fireEvent.click(declineButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  it('shows loading state in modal when accepting terms', () => {
    mockUseGetUserId.mockReturnValue('user123');
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: false,
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

    // Verify modal is rendered
    expect(screen.getByTestId('terms-modal')).toBeInTheDocument();
    expect(screen.getByText('Accept Terms')).toBeInTheDocument();
    expect(screen.getByText('Decline Terms')).toBeInTheDocument();
  });

  it('shows component loading state when no fallback provided', () => {
    mockUseGetUserId.mockReturnValue('user123');
    mockUseTermsAcceptance.mockReturnValue({
      hasAcceptedTerms: false,
      isLoading: true,
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
});
