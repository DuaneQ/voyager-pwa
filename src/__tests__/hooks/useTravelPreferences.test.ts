import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { useTravelPreferences } from '../../hooks/useTravelPreferences';
import { TravelPreferenceProfile } from '../../types/TravelPreferences';
import { TravelPreferencesError } from '../../errors/TravelPreferencesErrors';
import { UserProfileContext } from '../../Context/UserProfileContext';

// Mock Firebase
jest.mock('../../environments/firebaseConfig', () => ({
  db: {},
  auth: {
    currentUser: { uid: 'test-user-id' }
  }
}));

// Mock all Firebase functions
const mockUpdateDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockServerTimestamp = jest.fn(() => ({ 
  seconds: Math.floor(Date.now() / 1000), 
  nanoseconds: 0,
  toDate: () => new Date()
}));
const mockDeleteDoc = jest.fn();
const mockDoc = jest.fn(() => 'mock-doc-ref');

jest.mock('firebase/firestore', () => ({
  doc: (...args: any[]) => mockDoc(...args),
  updateDoc: (...args: any[]) => mockUpdateDoc(...args),
  getDoc: (...args: any[]) => mockGetDoc(...args),
  setDoc: (...args: any[]) => mockSetDoc(...args),
  deleteDoc: (...args: any[]) => mockDeleteDoc(...args),
  serverTimestamp: () => mockServerTimestamp()
}));

describe('useTravelPreferences Hook', () => {
  // Mock UserProfileContext functions
  const mockUpdateUserProfile = jest.fn();
  
  // Test wrapper that provides UserProfileContext
  const createWrapper = (initialUserProfile = null) => {    
    const TestWrapper = ({ children }: { children: React.ReactNode }) => {
      const [userProfile, setUserProfile] = React.useState(initialUserProfile);
      
      // Mock updateUserProfile to actually update the state
      const updateUserProfile = React.useCallback((newProfile: any) => {
        setUserProfile(newProfile);
        mockUpdateUserProfile(newProfile);
      }, []);
      
      return React.createElement(
        UserProfileContext.Provider,
        {
          value: { 
            userProfile, 
            updateUserProfile,
            setUserProfile,
            isLoading: false
          }
        },
        children
      );
    };
    return TestWrapper;
  };

  const mockProfile: TravelPreferenceProfile = {
    id: 'test-profile-id',
    name: 'Test Profile',
    isDefault: true,
    travelStyle: 'mid-range',
    budgetRange: {
      min: 1000,
      max: 5000,
      currency: 'USD'
    },
    activities: {
      cultural: 7,
      adventure: 5,
      relaxation: 6,
      nightlife: 3,
      shopping: 4,
      food: 8,
      nature: 7,
      photography: 6
    },
    foodPreferences: {
      dietaryRestrictions: ['vegetarian'],
      cuisineTypes: ['italian', 'local'],
      foodBudgetLevel: 'medium'
    },
    accommodation: {
      type: 'hotel',
      starRating: 3
    },
    transportation: {
      primaryMode: 'mixed',
      maxWalkingDistance: 20
    },
    groupSize: {
      preferred: 2,
      sizes: [1, 2, 4]
    },
    accessibility: {
      mobilityNeeds: false,
      visualNeeds: false,
      hearingNeeds: false
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock behaviors
    mockUpdateDoc.mockResolvedValue(undefined);
    mockGetDoc.mockResolvedValue({ 
      exists: () => false, 
      data: () => undefined 
    });
    mockSetDoc.mockResolvedValue(undefined);
    mockDeleteDoc.mockResolvedValue(undefined);
    mockDoc.mockReturnValue('mock-doc-ref');
    mockServerTimestamp.mockReturnValue({ 
      seconds: Math.floor(Date.now() / 1000), 
      nanoseconds: 0,
      toDate: () => new Date()
    });
    
    // Clear context mocks
    mockUpdateUserProfile.mockClear();
  });

  describe('Hook Initialization', () => {
    it('initializes with correct default state', async () => {
      // Mock no authenticated user for initialization test
      const mockAuth = require('../../environments/firebaseConfig').auth;
      mockAuth.currentUser = null;
      
      const wrapper = createWrapper(null);
      const { result } = renderHook(() => useTravelPreferences(), { wrapper });
      
      // Wait for any async operations to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      expect(result.current.error).toBe(null);
      expect(result.current.preferences).toBe(null);
      expect(typeof result.current.loadPreferences).toBe('function');
      expect(typeof result.current.savePreferences).toBe('function');
      expect(typeof result.current.createProfile).toBe('function');
      expect(typeof result.current.updateProfile).toBe('function');
      expect(typeof result.current.deleteProfile).toBe('function');
      expect(typeof result.current.duplicateProfile).toBe('function');
      expect(typeof result.current.setDefaultProfile).toBe('function');
      expect(typeof result.current.getProfileById).toBe('function');
      expect(typeof result.current.getDefaultProfile).toBe('function');
      expect(typeof result.current.recordPreferenceSignal).toBe('function');
      expect(typeof result.current.resetError).toBe('function');
      
      // Restore the mock for other tests
      mockAuth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('loadPreferences', () => {
    it('successfully loads existing preferences', async () => {
      const mockPreferences = {
        profiles: [mockProfile],
        defaultProfileId: 'test-profile-id',
        preferenceSignals: []
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ travelPreferences: mockPreferences })
      });

      const { result } = renderHook(() => useTravelPreferences());
      
      await act(async () => {
        await result.current.loadPreferences();
      });
      
      expect(result.current.preferences).toEqual(mockPreferences);
      expect(result.current.loading).toBe(false);
    });

    it('initializes empty preferences for new users', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false,
        data: () => undefined
      });

      const { result } = renderHook(() => useTravelPreferences());
      
      await act(async () => {
        await result.current.loadPreferences();
      });
      
      expect(result.current.preferences).toEqual({
        profiles: [],
        defaultProfileId: null,
        preferenceSignals: []
      });
    });

    it('handles unauthenticated users', async () => {
      const originalMock = jest.requireMock('../../environments/firebaseConfig');
      originalMock.auth.currentUser = null;

      const { result } = renderHook(() => useTravelPreferences());
      
      await act(async () => {
        await result.current.loadPreferences();
      });
      
      expect(result.current.preferences).toBe(null);
      
      // Restore mock
      originalMock.auth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('savePreferences', () => {
    it('successfully saves preferences for existing user', async () => {
      const mockPreferences = {
        profiles: [mockProfile],
        defaultProfileId: 'test-profile-id',
        preferenceSignals: []
      };

      // Mock existing user document
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ travelPreferences: {} })
      });

      // Create wrapper with user profile containing the travel preferences
      const userProfile = { 
        username: 'test-user',
        uid: 'test-user-id',
        travelPreferences: mockPreferences 
      };
      const wrapper = createWrapper(userProfile);

      const { result } = renderHook(() => useTravelPreferences(), { wrapper });
      
      await act(async () => {
        await result.current.savePreferences(mockPreferences);
      });
      
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          travelPreferences: mockPreferences,
          updatedAt: expect.any(Object)
        })
      );
      expect(result.current.preferences).toEqual(mockPreferences);
    });

    it('successfully saves preferences for new user', async () => {
      const mockPreferences = {
        profiles: [mockProfile],
        defaultProfileId: 'test-profile-id',
        preferenceSignals: []
      };

      // Mock non-existent user document
      mockGetDoc.mockResolvedValue({
        exists: () => false,
        data: () => undefined
      });

      // Create wrapper with user profile (no travel preferences yet)
      const userProfile = { 
        username: 'test-user',
        uid: 'test-user-id'
      };
      const wrapper = createWrapper(userProfile);

      const { result } = renderHook(() => useTravelPreferences(), { wrapper });
      
      await act(async () => {
        await result.current.savePreferences(mockPreferences);
      });
      
      expect(mockSetDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          travelPreferences: mockPreferences,
          createdAt: expect.any(Object),
          updatedAt: expect.any(Object)
        })
      );
      expect(result.current.preferences).toEqual(mockPreferences);
    });

    it('requires authenticated user for save', async () => {
      const originalMock = jest.requireMock('../../environments/firebaseConfig');
      originalMock.auth.currentUser = null;

      const { result } = renderHook(() => useTravelPreferences());
      
      await act(async () => {
        await expect(
          result.current.savePreferences({
            profiles: [],
            defaultProfileId: null,
            preferenceSignals: []
          })
        ).rejects.toBeInstanceOf(TravelPreferencesError);
      });
      
      // Restore mock
      originalMock.auth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('updateProfile', () => {
    it('successfully updates an existing profile', async () => {
      // Mock existing user document with the profile to update
      const existingPreferences = {
        profiles: [mockProfile],
        defaultProfileId: 'test-profile-id',
        preferenceSignals: []
      };

      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ travelPreferences: existingPreferences })
      });

      const { result } = renderHook(() => useTravelPreferences());
      
      const updates = { name: 'Updated Profile Name' };
      
      await act(async () => {
        await result.current.updateProfile('test-profile-id', updates);
      });
      
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          travelPreferences: expect.objectContaining({
            profiles: expect.arrayContaining([
              expect.objectContaining({
                ...mockProfile,
                ...updates,
                updatedAt: expect.any(Date)
              })
            ])
          }),
          updatedAt: expect.any(Object)
        })
      );
    });

    it('successfully creates a new profile when profile does not exist', async () => {
      // Mock existing user document but no profiles
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ 
          travelPreferences: {
            profiles: [],
            defaultProfileId: null,
            preferenceSignals: []
          }
        })
      });

      const { result } = renderHook(() => useTravelPreferences());
      
      const newProfileData = {
        name: 'New Profile',
        travelStyle: 'luxury' as const
      };
      
      await act(async () => {
        await result.current.updateProfile('new-profile-id', newProfileData);
      });
      
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          travelPreferences: expect.objectContaining({
            profiles: expect.arrayContaining([
              expect.objectContaining({
                id: 'new-profile-id',
                name: 'New Profile',
                travelStyle: 'luxury',
                isDefault: true, // First profile should be default
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date)
              })
            ]),
            defaultProfileId: 'new-profile-id'
          }),
          updatedAt: expect.any(Object)
        })
      );
    });

    it('creates user document if it does not exist', async () => {
      // Mock non-existent user document
      mockGetDoc.mockResolvedValue({
        exists: () => false,
        data: () => undefined
      });

      const { result } = renderHook(() => useTravelPreferences());
      
      const newProfileData = {
        name: 'First Profile',
        travelStyle: 'budget' as const
      };
      
      await act(async () => {
        await result.current.updateProfile('first-profile-id', newProfileData);
      });
      
      expect(mockSetDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          travelPreferences: expect.objectContaining({
            profiles: expect.arrayContaining([
              expect.objectContaining({
                id: 'first-profile-id',
                name: 'First Profile',
                travelStyle: 'budget',
                isDefault: true
              })
            ]),
            defaultProfileId: 'first-profile-id'
          }),
          createdAt: expect.any(Object),
          updatedAt: expect.any(Object)
        })
      );
    });

    it('handles update errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock user document exists
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ 
          travelPreferences: {
            profiles: [mockProfile],
            defaultProfileId: 'test-profile-id',
            preferenceSignals: []
          }
        })
      });
      
      mockUpdateDoc.mockRejectedValue(new Error('Update failed'));
      
      const userProfile = { 
        username: 'test-user',
        uid: 'test-user-id',
        travelPreferences: {
          profiles: [mockProfile],
          defaultProfileId: 'test-profile-id',
          preferenceSignals: []
        }
      };
      const wrapper = createWrapper(userProfile);
      
      const { result } = renderHook(() => useTravelPreferences(), { wrapper });
      
      await act(async () => {
        await expect(
          result.current.updateProfile('test-profile-id', { name: 'New Name' })
        ).rejects.toThrow();
      });
      
      // Check that the error was set in the hook state
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.userMessage).toBeDefined();
      
      consoleSpy.mockRestore();
    });

    it('requires authenticated user for update', async () => {
      // Mock no current user by temporarily changing the mock
      const originalMock = jest.requireMock('../../environments/firebaseConfig');
      originalMock.auth.currentUser = null;
      
      const { result } = renderHook(() => useTravelPreferences());
      
      await act(async () => {
        await expect(
          result.current.updateProfile('test-profile-id', { name: 'New Name' })
        ).rejects.toBeInstanceOf(TravelPreferencesError);
      });
      
      // Restore the original mock
      originalMock.auth.currentUser = { uid: 'test-user-id' };
    });
  });

  describe('resetError', () => {
    it('can reset error state', () => {
      const { result } = renderHook(() => useTravelPreferences());
      
      act(() => {
        result.current.resetError();
      });
      
      expect(result.current.error).toBe(null);
    });
  });

  describe('Edge Cases', () => {
    it('handles Firebase errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock user document exists but updateDoc fails
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ 
          travelPreferences: {
            profiles: [mockProfile],
            defaultProfileId: 'test-profile-id',
            preferenceSignals: []
          }
        })
      });
      
      mockUpdateDoc.mockRejectedValue(new Error('Firebase connection failed'));
      
      const userProfile = { 
        username: 'test-user',
        uid: 'test-user-id',
        travelPreferences: {
          profiles: [mockProfile],
          defaultProfileId: 'test-profile-id',
          preferenceSignals: []
        }
      };
      const wrapper = createWrapper(userProfile);
      
      const { result } = renderHook(() => useTravelPreferences(), { wrapper });
      
      await act(async () => {
        try {
          await result.current.updateProfile('test-profile-id', { name: 'New Name' });
        } catch (error) {
          // Expected to throw
        }
      });
      
      // Check that the error was set in the hook state with user-friendly message
      expect(result.current.error).toBeTruthy();
      expect(result.current.error?.userMessage).toBeDefined();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Type Safety', () => {
    it('enforces correct profile structure', async () => {
      // Mock user document exists
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ 
          travelPreferences: {
            profiles: [mockProfile],
            defaultProfileId: 'test-profile-id',
            preferenceSignals: []
          }
        })
      });

      const { result } = renderHook(() => useTravelPreferences());
      
      // This test ensures TypeScript compilation
      const validUpdates = {
        travelStyle: 'luxury' as const // Valid travel style
      };
      
      await act(async () => {
        await result.current.updateProfile('test-profile-id', validUpdates);
      });
      
      expect(mockUpdateDoc).toHaveBeenCalled();
    });
  });
});
