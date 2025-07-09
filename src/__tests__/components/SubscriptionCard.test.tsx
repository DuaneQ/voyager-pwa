



// --- Robust window.location.assign mock for JSDOM ---
// Hoist this block to the very top of the file, before any imports
const originalLocation = window.location;
let assignedUrl = '';
beforeAll(() => {
  // @ts-ignore
  delete window.location;
  // @ts-ignore
  window.location = {
    ...originalLocation,
    assign: jest.fn((url) => { assignedUrl = url; }),
  };
});
afterAll(() => {
  window.location = originalLocation;
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserProfileContext } from '../../Context/UserProfileContext';
import { useUsageTracking } from '../../hooks/useUsageTracking';
import { useStripePortal } from '../../hooks/useStripePortal';
import { SnackbarProvider } from 'notistack';
import SubscriptionCard from '../../components/common/SubscriptionCard';

jest.mock('../../hooks/useUsageTracking');
jest.mock('../../hooks/useStripePortal');

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(),
  httpsCallable: jest.fn(() => async () => ({ data: { url: 'https://stripe.com/checkout-session' } })),
}));

const mockOpenPortal = jest.fn();
const mockEnqueueSnackbar = jest.fn();

jest.mock('notistack', () => ({
  ...jest.requireActual('notistack'),
  useSnackbar: () => ({ enqueueSnackbar: mockEnqueueSnackbar }),
}));

describe('SubscriptionCard', () => {
  const renderWithContext = (userProfile: any, props = {}) => {
    return render(
      <SnackbarProvider>
        <UserProfileContext.Provider value={{
          userProfile,
          setUserProfile: jest.fn(),
          updateUserProfile: jest.fn(),
        }}>
          <SubscriptionCard {...props} />
        </UserProfileContext.Provider>
      </SnackbarProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useStripePortal as jest.Mock).mockReturnValue({
      openPortal: mockOpenPortal,
      loading: false,
      error: null,
    });
  });

  it('renders Upgrade button for free users', () => {
    (useUsageTracking as jest.Mock).mockReturnValue({ hasPremium: () => false });
    renderWithContext({ subscriptionType: 'free' });
    expect(screen.getByText(/Upgrade/i)).toBeInTheDocument();
  });

  it('renders Premium label and Manage button for premium users', () => {
    (useUsageTracking as jest.Mock).mockReturnValue({ hasPremium: () => true });
    renderWithContext({ subscriptionType: 'premium' });
    expect(screen.getByText(/Premium/i)).toBeInTheDocument();
    expect(screen.getByText(/Manage/i)).toBeInTheDocument();
  });

  it('calls openPortal when Manage is clicked', () => {
    (useUsageTracking as jest.Mock).mockReturnValue({ hasPremium: () => true });
    renderWithContext({ subscriptionType: 'premium' });
    fireEvent.click(screen.getByText(/Manage/i));
    expect(mockOpenPortal).toHaveBeenCalled();
  });

  it('shows spinner when subscribing or managing', () => {
    (useUsageTracking as jest.Mock).mockReturnValue({ hasPremium: () => true });
    (useStripePortal as jest.Mock).mockReturnValue({ openPortal: mockOpenPortal, loading: true, error: null });
    renderWithContext({ subscriptionType: 'premium' });
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
  });

  it('shows error if useStripePortal returns error', () => {
    (useUsageTracking as jest.Mock).mockReturnValue({ hasPremium: () => true });
    (useStripePortal as jest.Mock).mockReturnValue({ openPortal: mockOpenPortal, loading: false, error: 'Test error' });
    renderWithContext({ subscriptionType: 'premium' });
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('renders compact style when compact prop is true', () => {
    (useUsageTracking as jest.Mock).mockReturnValue({ hasPremium: () => false });
    renderWithContext({ subscriptionType: 'free' }, { compact: true });
    // Check for style or className unique to compact mode
    expect(screen.getByText(/Upgrade/i).closest('div,button,span,section,article')).toHaveStyle('position: relative');
  });

  it('hides Manage button when hideManage is true', () => {
    (useUsageTracking as jest.Mock).mockReturnValue({ hasPremium: () => true });
    renderWithContext({ subscriptionType: 'premium' }, { hideManage: true });
    expect(screen.queryByText(/Manage/i)).not.toBeInTheDocument();
  });
});


