import { renderHook, act, waitFor } from '@testing-library/react';
import { useTermsAcceptance } from '../../hooks/useTermsAcceptance';
import { doc, updateDoc, getDoc, getFirestore } from 'firebase/firestore';
import useGetUserId from '../../hooks/useGetUserId';

// Mock Firebase functions
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
  getDoc: jest.fn(),
  getFirestore: jest.fn(),
}));

jest.mock('../../hooks/useGetUserId');
jest.mock('../../environments/firebaseConfig', () => ({
  app: {},
}));

const mockDoc = doc as jest.MockedFunction<typeof doc>;
const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockGetFirestore = getFirestore as jest.MockedFunction<typeof getFirestore>;
const mockUseGetUserId = useGetUserId as jest.MockedFunction<typeof useGetUserId>;

describe('useTermsAcceptance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFirestore.mockReturnValue({} as any);
    mockDoc.mockReturnValue({} as any);
  });

  it('initializes with correct loading state', () => {
    mockUseGetUserId.mockReturnValue(null);
    
    const { result } = renderHook(() => useTermsAcceptance());
    
    expect(result.current.hasAcceptedTerms).toBe(false);
    expect(result.current.isLoading).toBe(false); // No user, so not loading
  });

  it('shows loading when user is present initially', () => {
    mockUseGetUserId.mockReturnValue('user123');
    mockGetDoc.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    const { result } = renderHook(() => useTermsAcceptance());
    
    expect(result.current.hasAcceptedTerms).toBe(false);
    expect(result.current.isLoading).toBe(true); // Should be loading when user exists
  });

  it('checks terms status when user is logged in', async () => {
    const mockUserData = {
      termsAcceptance: {
        hasAcceptedTerms: true,
        termsVersion: '1.0.0',
        acceptanceDate: new Date(),
      }
    };

    mockUseGetUserId.mockReturnValue('user123');
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockUserData,
    } as any);

    const { result } = renderHook(() => useTermsAcceptance());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasAcceptedTerms).toBe(true);
    expect(mockGetDoc).toHaveBeenCalledTimes(1);
  });

  it('returns false when user has not accepted terms', async () => {
    const mockUserData = {};

    mockUseGetUserId.mockReturnValue('user123');
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockUserData,
    } as any);

    const { result } = renderHook(() => useTermsAcceptance());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasAcceptedTerms).toBe(false);
  });

  it('returns false when user accepted old version of terms', async () => {
    const mockUserData = {
      termsAcceptance: {
        hasAcceptedTerms: true,
        termsVersion: '0.9.0', // Old version
        acceptanceDate: new Date(),
      }
    };

    mockUseGetUserId.mockReturnValue('user123');
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockUserData,
    } as any);

    const { result } = renderHook(() => useTermsAcceptance());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasAcceptedTerms).toBe(false);
  });

  it('accepts terms successfully', async () => {
    mockUseGetUserId.mockReturnValue('user123');
    mockUpdateDoc.mockResolvedValue(undefined);
    mockGetDoc.mockResolvedValue({
      exists: () => false,
    } as any);

    const { result } = renderHook(() => useTermsAcceptance());

    // Wait for initial check to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.acceptTerms();
    });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(), // doc reference
      expect.objectContaining({
        termsAcceptance: expect.objectContaining({
          hasAcceptedTerms: true,
          termsVersion: '1.0.0',
          acceptanceDate: expect.any(Date),
          userAgent: expect.any(String),
        }),
        lastUpdated: expect.any(Date),
      })
    );

    expect(result.current.hasAcceptedTerms).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('handles accept terms error', async () => {
    mockUseGetUserId.mockReturnValue('user123');
    mockUpdateDoc.mockRejectedValue(new Error('Firestore error'));
    mockGetDoc.mockResolvedValue({
      exists: () => false,
    } as any);

    const { result } = renderHook(() => useTermsAcceptance());

    // Wait for initial check to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await expect(result.current.acceptTerms()).rejects.toThrow('Firestore error');
    expect(result.current.isLoading).toBe(false);
  });

  it('throws error when accepting terms without user', async () => {
    mockUseGetUserId.mockReturnValue(null);

    const { result } = renderHook(() => useTermsAcceptance());

    await expect(result.current.acceptTerms()).rejects.toThrow('User must be logged in to accept terms');
  });

  it('handles checkTermsStatus error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    mockUseGetUserId.mockReturnValue('user123');
    mockGetDoc.mockRejectedValue(new Error('Firestore error'));

    const { result } = renderHook(() => useTermsAcceptance());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasAcceptedTerms).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith('Error checking terms acceptance:', expect.any(Error));

    consoleSpy.mockRestore();
  });

  it('handles non-existent user document', async () => {
    mockUseGetUserId.mockReturnValue('user123');
    mockGetDoc.mockResolvedValue({
      exists: () => false,
    } as any);

    const { result } = renderHook(() => useTermsAcceptance());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasAcceptedTerms).toBe(false);
  });

  it('updates state when user changes', async () => {
    const { result, rerender } = renderHook(() => useTermsAcceptance());

    // Initially no user
    mockUseGetUserId.mockReturnValue(null);
    rerender();

    expect(result.current.hasAcceptedTerms).toBe(false);
    expect(result.current.isLoading).toBe(false);

    // User logs in
    mockUseGetUserId.mockReturnValue('user123');
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        termsAcceptance: {
          hasAcceptedTerms: true,
          termsVersion: '1.0.0',
        }
      }),
    } as any);

    rerender();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasAcceptedTerms).toBe(true);
  });
});
