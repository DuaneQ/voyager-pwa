import { renderHook, act } from '@testing-library/react-hooks';
import { useStripePortal } from '../../hooks/useStripePortal';

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(),
  httpsCallable: jest.fn(),
}));

const { httpsCallable } = require('firebase/functions');

describe('useStripePortal', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to Stripe portal on success', async () => {
    const assignMock = jest.fn();
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = { assign: assignMock };

    httpsCallable.mockImplementation(() => jest.fn(() => Promise.resolve({ data: { url: 'https://stripe-portal.com' } })));

    const { result } = renderHook(() => useStripePortal());
    await act(async () => {
      await result.current.openPortal();
    });
    expect(assignMock).toHaveBeenCalledWith('https://stripe-portal.com');
  });

  it('sets error if no url returned', async () => {
    httpsCallable.mockImplementation(() => jest.fn(() => Promise.resolve({ data: {} })));
    const { result } = renderHook(() => useStripePortal());
    await act(async () => {
      await result.current.openPortal();
    });
    expect(result.current.error).toBe('Failed to get portal link.');
  });

  it('sets error on exception', async () => {
    httpsCallable.mockImplementation(() => jest.fn(() => Promise.reject(new Error('Test error'))));
    const { result } = renderHook(() => useStripePortal());
    await act(async () => {
      await result.current.openPortal();
    });
    expect(result.current.error).toBe('Test error');
  });
});
