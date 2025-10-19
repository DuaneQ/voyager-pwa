# Critical Test Templates

**Purpose**: Copy-paste test templates for the most critical missing test coverage  
**Date**: October 18, 2025

---

## Template 1: Cloud SQL RPC Error Handling

```typescript
// src/__tests__/hooks/useSearchItineraries.rpcErrors.test.tsx

import { renderHook, act, waitFor } from '@testing-library/react';
import useSearchItineraries from '../../hooks/useSearchItineraries';
import { Itinerary } from '../../types/Itinerary';

// Mock firebase functions
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(),
  httpsCallable: jest.fn(),
}));

describe('useSearchItineraries - Cloud SQL RPC Error Handling', () => {
  const mockItinerary: Itinerary = {
    id: 'test-itin-1',
    userId: 'test-user',
    destination: 'Paris',
    startDate: '2025-12-01',
    endDate: '2025-12-07',
    gender: 'female',
    status: 'single',
    lowerRange: 25,
    upperRange: 35,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should handle Cloud SQL RPC timeout gracefully', async () => {
    // Mock RPC that times out after 30 seconds
    const mockCallable = jest.fn(() => 
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      )
    );
    
    (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

    const { result } = renderHook(() => useSearchItineraries());

    await act(async () => {
      await result.current.searchItineraries(mockItinerary, 'test-user');
    });

    // Verify error state is set
    expect(result.current.error).toContain('timeout');
    expect(result.current.loading).toBe(false);
    expect(result.current.matchingItineraries).toHaveLength(0);
  });

  it('should handle malformed RPC response', async () => {
    const mockCallable = jest.fn(() => 
      Promise.resolve({ 
        data: { 
          // Missing 'success' field
          results: [] 
        } 
      })
    );
    
    (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

    const { result } = renderHook(() => useSearchItineraries());

    await act(async () => {
      await result.current.searchItineraries(mockItinerary, 'test-user');
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.loading).toBe(false);
  });

  it('should handle Cloud SQL connection failure', async () => {
    const mockCallable = jest.fn(() => 
      Promise.reject(new Error('ECONNREFUSED: Connection refused'))
    );
    
    (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

    const { result } = renderHook(() => useSearchItineraries());

    await act(async () => {
      await result.current.searchItineraries(mockItinerary, 'test-user');
    });

    expect(result.current.error).toContain('connection');
    expect(result.current.matchingItineraries).toHaveLength(0);
  });

  it('should handle BigInt parsing errors', async () => {
    const mockCallable = jest.fn(() => 
      Promise.resolve({
        data: {
          success: true,
          data: [{
            id: 'test-match-1',
            destination: 'Paris',
            startDay: 'invalid-bigint', // Invalid BigInt
            endDay: 9999999999999999n,
          }]
        }
      })
    );
    
    (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

    const { result } = renderHook(() => useSearchItineraries());

    await act(async () => {
      await result.current.searchItineraries(mockItinerary, 'test-user');
    });

    // Should filter out invalid results
    expect(result.current.matchingItineraries).toHaveLength(0);
  });

  it('should handle JSONB parsing errors in metadata field', async () => {
    const mockCallable = jest.fn(() => 
      Promise.resolve({
        data: {
          success: true,
          data: [{
            id: 'test-match-1',
            destination: 'Paris',
            metadata: 'invalid-json', // Invalid JSONB
          }]
        }
      })
    );
    
    (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

    const { result } = renderHook(() => useSearchItineraries());

    await act(async () => {
      await result.current.searchItineraries(mockItinerary, 'test-user');
    });

    // Should handle gracefully, not crash
    expect(result.current.error).toBeFalsy();
    expect(result.current.matchingItineraries.length).toBeGreaterThanOrEqual(0);
  });

  it('should retry RPC on transient network error', async () => {
    let callCount = 0;
    const mockCallable = jest.fn(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({
        data: {
          success: true,
          data: []
        }
      });
    });
    
    (httpsCallable as jest.Mock).mockReturnValue(mockCallable);

    const { result } = renderHook(() => useSearchItineraries());

    await act(async () => {
      await result.current.searchItineraries(mockItinerary, 'test-user');
    });

    // Verify retry happened
    expect(callCount).toBe(2);
    expect(result.current.error).toBeFalsy();
  });
});
```

---

## Template 2: Profile Validation Integration Tests

```typescript
// src/__tests__/flows/ProfileValidation.integration.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { UserProfileContext } from '../../Context/UserProfileContext';
import AddItineraryModal from '../../components/forms/AddItineraryModal';
import { AIItineraryGenerationModal } from '../../components/modals/AIItineraryGenerationModal';
import { UserProfile } from '../../types/UserProfile';

// Mock hooks
jest.mock('../../hooks/useCreateItinerary', () => ({
  __esModule: true,
  default: () => ({ createItinerary: jest.fn(), loading: false, error: null })
}));

jest.mock('../../hooks/useTravelPreferences', () => ({
  useTravelPreferences: () => ({
    preferences: null,
    loading: false,
    error: null,
    loadPreferences: jest.fn(),
    getProfileById: jest.fn(),
  })
}));

describe('Profile Validation - Integration Tests', () => {
  const renderWithProfile = (userProfile: UserProfile | null) => {
    return render(
      <BrowserRouter>
        <UserProfileContext.Provider 
          value={{ 
            userProfile, 
            updateUserProfile: jest.fn(),
            setUserProfile: jest.fn()
          }}
        >
          <AddItineraryModal 
            show={true} 
            handleClose={jest.fn()} 
            onItineraryAdded={jest.fn()}
          />
        </UserProfileContext.Provider>
      </BrowserRouter>
    );
  };

  it('should block manual itinerary creation if DOB is missing', async () => {
    const incompleteProfile: UserProfile = {
      uid: 'test-user',
      username: 'Test User',
      email: 'test@example.com',
      gender: 'female',
      // dob is missing
      status: 'single',
    };

    renderWithProfile(incompleteProfile);

    // Try to submit form
    const submitButton = screen.getByText(/Save/i);
    fireEvent.click(submitButton);

    // Verify error message shown
    await waitFor(() => {
      expect(screen.getByText(/complete your profile/i)).toBeInTheDocument();
      expect(screen.getByText(/date of birth/i)).toBeInTheDocument();
    });
  });

  it('should block manual itinerary creation if gender is missing', async () => {
    const incompleteProfile: UserProfile = {
      uid: 'test-user',
      username: 'Test User',
      email: 'test@example.com',
      dob: '1990-01-01',
      // gender is missing
      status: 'single',
    };

    renderWithProfile(incompleteProfile);

    const submitButton = screen.getByText(/Save/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/complete your profile/i)).toBeInTheDocument();
      expect(screen.getByText(/gender/i)).toBeInTheDocument();
    });
  });

  it('should allow manual itinerary creation when profile is complete', async () => {
    const completeProfile: UserProfile = {
      uid: 'test-user',
      username: 'Test User',
      email: 'test@example.com',
      dob: '1990-01-01',
      gender: 'female',
      status: 'single',
    };

    renderWithProfile(completeProfile);

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/Destination/i), {
      target: { value: 'Paris' }
    });
    fireEvent.change(screen.getByLabelText(/Start Date/i), {
      target: { value: '2025-12-01' }
    });
    fireEvent.change(screen.getByLabelText(/End Date/i), {
      target: { value: '2025-12-07' }
    });

    const submitButton = screen.getByText(/Save/i);
    fireEvent.click(submitButton);

    // Should not show profile error
    await waitFor(() => {
      expect(screen.queryByText(/complete your profile/i)).not.toBeInTheDocument();
    });
  });

  it('should show link to profile page when profile incomplete', async () => {
    const incompleteProfile: UserProfile = {
      uid: 'test-user',
      username: 'Test User',
      email: 'test@example.com',
      // Missing dob and gender
      status: 'single',
    };

    renderWithProfile(incompleteProfile);

    const submitButton = screen.getByText(/Save/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      const profileLink = screen.getByText(/complete.*profile/i);
      expect(profileLink).toBeInTheDocument();
      expect(profileLink.closest('a')).toHaveAttribute('href', '/profile');
    });
  });
});
```

---

## Template 3: AI Itinerary in Search Dropdown

```typescript
// src/__tests__/pages/Search.aiItinerary.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Search } from '../../components/pages/Search';
import { UserProfileContext } from '../../Context/UserProfileContext';

// Mock all hooks
jest.mock('../../hooks/useGetItinerariesFromFirestore', () => ({
  __esModule: true,
  default: () => ({
    fetchItineraries: jest.fn().mockResolvedValue([
      {
        id: 'manual-1',
        destination: 'Paris',
        title: 'Paris Trip',
        ai_status: null, // Manual itinerary
      },
      {
        id: 'ai-1',
        destination: 'Rome',
        title: 'AI Rome Adventure',
        ai_status: 'completed', // AI itinerary
        response: {
          data: {
            metadata: {
              filtering: {
                budget: { min: 1000, max: 2000 },
                activities: ['Museums', 'Food Tours']
              }
            }
          }
        }
      }
    ]),
    loading: false,
    error: null,
  })
}));

jest.mock('../../hooks/useSearchItineraries', () => ({
  __esModule: true,
  default: () => ({
    matchingItineraries: [],
    searchItineraries: jest.fn(),
    getNextItinerary: jest.fn(),
    loading: false,
    hasMore: false,
  })
}));

describe('Search - AI Itinerary Selection', () => {
  const renderSearch = () => {
    return render(
      <BrowserRouter>
        <UserProfileContext.Provider 
          value={{ 
            userProfile: { uid: 'test-user' }, 
            updateUserProfile: jest.fn(),
            setUserProfile: jest.fn()
          }}
        >
          <Search />
        </UserProfileContext.Provider>
      </BrowserRouter>
    );
  };

  it('should show both manual and AI itineraries in dropdown', async () => {
    renderSearch();

    await waitFor(() => {
      const dropdown = screen.getByLabelText(/Select Itinerary/i);
      fireEvent.mouseDown(dropdown);
    });

    // Verify both itineraries appear
    expect(screen.getByText(/Paris Trip/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Rome Adventure/i)).toBeInTheDocument();
  });

  it('should visually distinguish AI itineraries with icon', async () => {
    renderSearch();

    await waitFor(() => {
      const dropdown = screen.getByLabelText(/Select Itinerary/i);
      fireEvent.mouseDown(dropdown);
    });

    // Look for AI icon or "🤖" emoji
    const aiOption = screen.getByText(/AI Rome Adventure/i).closest('li');
    expect(aiOption).toHaveTextContent(/🤖|AI/i);
  });

  it('should call searchItineraries with AI itinerary metadata', async () => {
    const mockSearchItineraries = jest.fn();
    jest.spyOn(require('../../hooks/useSearchItineraries'), 'default')
      .mockReturnValue({
        searchItineraries: mockSearchItineraries,
        matchingItineraries: [],
        getNextItinerary: jest.fn(),
        loading: false,
        hasMore: false,
      });

    renderSearch();

    await waitFor(() => {
      const dropdown = screen.getByLabelText(/Select Itinerary/i);
      fireEvent.mouseDown(dropdown);
    });

    // Select AI itinerary
    fireEvent.click(screen.getByText(/AI Rome Adventure/i));

    await waitFor(() => {
      expect(mockSearchItineraries).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'ai-1',
          destination: 'Rome',
          ai_status: 'completed',
        }),
        'test-user'
      );
    });
  });

  it('should handle AI itinerary with missing metadata gracefully', async () => {
    jest.spyOn(require('../../hooks/useGetItinerariesFromFirestore'), 'default')
      .mockReturnValue({
        fetchItineraries: jest.fn().mockResolvedValue([
          {
            id: 'ai-incomplete',
            destination: 'Berlin',
            ai_status: 'completed',
            // Missing response.data.metadata
          }
        ]),
        loading: false,
        error: null,
      });

    renderSearch();

    await waitFor(() => {
      const dropdown = screen.getByLabelText(/Select Itinerary/i);
      fireEvent.mouseDown(dropdown);
    });

    // Should still appear in dropdown
    expect(screen.getByText(/Berlin/i)).toBeInTheDocument();

    // Should not crash when selected
    fireEvent.click(screen.getByText(/Berlin/i));
    
    // No error message shown
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  it('should exclude expired AI itineraries from dropdown', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);

    jest.spyOn(require('../../hooks/useGetItinerariesFromFirestore'), 'default')
      .mockReturnValue({
        fetchItineraries: jest.fn().mockResolvedValue([
          {
            id: 'ai-expired',
            destination: 'Tokyo',
            ai_status: 'completed',
            endDate: pastDate.toISOString(),
            endDay: BigInt(pastDate.getTime()),
          }
        ]),
        loading: false,
        error: null,
      });

    renderSearch();

    await waitFor(() => {
      const dropdown = screen.getByLabelText(/Select Itinerary/i);
      fireEvent.mouseDown(dropdown);
    });

    // Expired itinerary should NOT appear
    expect(screen.queryByText(/Tokyo/i)).not.toBeInTheDocument();
  });
});
```

---

## Template 4: AIItineraryDisplay Edit & Share

```typescript
// src/__tests__/components/AIItineraryDisplay.editShare.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AIItineraryDisplay from '../../components/ai/AIItineraryDisplay';

// Mock update hook
const mockUpdateItinerary = jest.fn();
jest.mock('../../hooks/useUpdateItinerary', () => ({
  __esModule: true,
  default: () => ({ 
    updateItinerary: mockUpdateItinerary, 
    loading: false, 
    error: null 
  })
}));

describe('AIItineraryDisplay - Edit & Share', () => {
  const mockAIItinerary = {
    id: 'ai-itin-1',
    userId: 'test-user',
    destination: 'Paris',
    title: 'AI Paris Adventure',
    ai_status: 'completed',
    startDate: '2025-12-01',
    endDate: '2025-12-07',
    response: {
      data: {
        activities: [
          { name: 'Eiffel Tower', time: '10:00 AM' },
          { name: 'Louvre Museum', time: '2:00 PM' }
        ],
        metadata: {
          filtering: {
            budget: { min: 1000, max: 2000 }
          }
        }
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show edit button for owner', () => {
    render(
      <BrowserRouter>
        <AIItineraryDisplay 
          itinerary={mockAIItinerary} 
          currentUserId="test-user" 
        />
      </BrowserRouter>
    );

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('should NOT show edit button for non-owner', () => {
    render(
      <BrowserRouter>
        <AIItineraryDisplay 
          itinerary={mockAIItinerary} 
          currentUserId="different-user" 
        />
      </BrowserRouter>
    );

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('should open edit modal when edit button clicked', async () => {
    render(
      <BrowserRouter>
        <AIItineraryDisplay 
          itinerary={mockAIItinerary} 
          currentUserId="test-user" 
        />
      </BrowserRouter>
    );

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText(/Edit Itinerary/i)).toBeInTheDocument();
    });
  });

  it('should preserve AI-generated content when editing basic fields', async () => {
    render(
      <BrowserRouter>
        <AIItineraryDisplay 
          itinerary={mockAIItinerary} 
          currentUserId="test-user" 
        />
      </BrowserRouter>
    );

    // Open edit modal
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    // Change destination
    const destinationInput = screen.getByLabelText(/Destination/i);
    fireEvent.change(destinationInput, { target: { value: 'Lyon' } });

    // Save
    fireEvent.click(screen.getByText(/Save/i));

    await waitFor(() => {
      expect(mockUpdateItinerary).toHaveBeenCalledWith({
        id: 'ai-itin-1',
        destination: 'Lyon',
        // response.data should NOT be modified
      });
    });

    // Verify original activities are preserved
    const callArg = mockUpdateItinerary.mock.calls[0][0];
    expect(callArg.response).toBeUndefined(); // Not included in update
  });

  it('should call updateItinerary RPC with partial payload', async () => {
    render(
      <BrowserRouter>
        <AIItineraryDisplay 
          itinerary={mockAIItinerary} 
          currentUserId="test-user" 
        />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    
    // Change title only
    const titleInput = screen.getByLabelText(/Title/i);
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

    fireEvent.click(screen.getByText(/Save/i));

    await waitFor(() => {
      expect(mockUpdateItinerary).toHaveBeenCalledWith({
        id: 'ai-itin-1',
        title: 'Updated Title',
        // Only changed fields included
      });
    });
  });

  it('should show share button for owner', () => {
    render(
      <BrowserRouter>
        <AIItineraryDisplay 
          itinerary={mockAIItinerary} 
          currentUserId="test-user" 
        />
      </BrowserRouter>
    );

    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
  });

  it('should copy share link to clipboard when share clicked', async () => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });

    render(
      <BrowserRouter>
        <AIItineraryDisplay 
          itinerary={mockAIItinerary} 
          currentUserId="test-user" 
        />
      </BrowserRouter>
    );

    const shareButton = screen.getByRole('button', { name: /share/i });
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('/ai-itinerary/ai-itin-1')
      );
    });

    // Verify success message
    expect(screen.getByText(/Link copied/i)).toBeInTheDocument();
  });

  it('should handle RPC failure during edit gracefully', async () => {
    mockUpdateItinerary.mockRejectedValueOnce(new Error('Network error'));

    render(
      <BrowserRouter>
        <AIItineraryDisplay 
          itinerary={mockAIItinerary} 
          currentUserId="test-user" 
        />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    fireEvent.change(screen.getByLabelText(/Destination/i), { 
      target: { value: 'Lyon' } 
    });
    fireEvent.click(screen.getByText(/Save/i));

    await waitFor(() => {
      expect(screen.getByText(/Failed to update/i)).toBeInTheDocument();
    });
  });
});
```

---

## Template 5: Travel Preferences AI Requirements

```typescript
// src/__tests__/hooks/useTravelPreferences.aiRequirements.test.tsx

import { renderHook, act, waitFor } from '@testing-library/react';
import { useTravelPreferences } from '../../hooks/useTravelPreferences';
import * as firestore from 'firebase/firestore';

jest.mock('firebase/firestore');

describe('Travel Preferences - AI Generation Requirements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load preferences from Firestore on mount', async () => {
    const mockGetDoc = jest.fn().mockResolvedValue({
      exists: () => true,
      data: () => ({
        profiles: [{
          id: 'profile-1',
          name: 'Default',
          isDefault: true,
          budgetRange: { min: 1000, max: 2000, currency: 'USD' },
          groupSize: { preferred: 2, sizes: [1, 2, 3] },
        }],
        defaultProfileId: 'profile-1',
      })
    });

    (firestore.getDoc as jest.Mock) = mockGetDoc;

    const { result } = renderHook(() => useTravelPreferences());

    await waitFor(() => {
      expect(result.current.preferences).not.toBeNull();
      expect(result.current.preferences?.profiles).toHaveLength(1);
    });
  });

  it('should return null if no preference profiles exist', async () => {
    const mockGetDoc = jest.fn().mockResolvedValue({
      exists: () => false,
    });

    (firestore.getDoc as jest.Mock) = mockGetDoc;

    const { result } = renderHook(() => useTravelPreferences());

    await waitFor(() => {
      expect(result.current.preferences).toBeNull();
    });
  });

  it('should validate profile has required fields', async () => {
    const incompleteProfile = {
      id: 'profile-1',
      name: 'Incomplete',
      isDefault: true,
      // Missing budgetRange
      // Missing groupSize
    };

    const mockGetDoc = jest.fn().mockResolvedValue({
      exists: () => true,
      data: () => ({
        profiles: [incompleteProfile],
        defaultProfileId: 'profile-1',
      })
    });

    (firestore.getDoc as jest.Mock) = mockGetDoc;

    const { result } = renderHook(() => useTravelPreferences());

    await waitFor(() => {
      const profile = result.current.getProfileById('profile-1');
      
      // Validation should catch missing fields
      expect(profile?.budgetRange).toBeUndefined();
      expect(profile?.groupSize).toBeUndefined();
    });
  });

  it('should allow AI generation with complete default profile', async () => {
    const completeProfile = {
      id: 'profile-1',
      name: 'Complete',
      isDefault: true,
      budgetRange: { min: 1000, max: 2000, currency: 'USD' },
      groupSize: { preferred: 2, sizes: [1, 2, 3] },
      activities: {
        'Museums': 8,
        'Food Tours': 7,
      },
    };

    const mockGetDoc = jest.fn().mockResolvedValue({
      exists: () => true,
      data: () => ({
        profiles: [completeProfile],
        defaultProfileId: 'profile-1',
      })
    });

    (firestore.getDoc as jest.Mock) = mockGetDoc;

    const { result } = renderHook(() => useTravelPreferences());

    await waitFor(() => {
      const profile = result.current.getProfileById('profile-1');
      
      expect(profile).toBeTruthy();
      expect(profile?.budgetRange).toBeDefined();
      expect(profile?.groupSize).toBeDefined();
      expect(profile?.activities).toBeDefined();
    });
  });
});
```

---

## Usage Instructions

### How to Use These Templates

1. **Copy the entire test file** to your `src/__tests__/` directory
2. **Update imports** to match your project structure
3. **Run the test** to see current failures:
   ```bash
   npm test -- path/to/new-test.tsx --watchAll=false
   ```
4. **Implement fixes** in the source code to make tests pass
5. **Verify all tests pass**

### Priority Order

1. Start with Template 1 (Cloud SQL RPC errors) - CRITICAL
2. Then Template 3 (AI itinerary in Search) - CRITICAL
3. Then Template 2 (Profile validation) - CRITICAL
4. Then Template 4 (Edit/Share) - HIGH
5. Finally Template 5 (Travel preferences) - HIGH

### Test Data Helpers

Create this helper file to reduce duplication:

```typescript
// src/test-utils/testData.ts

export const createMockUserProfile = (overrides?: Partial<UserProfile>): UserProfile => ({
  uid: 'test-user-123',
  username: 'Test User',
  email: 'test@example.com',
  dob: '1990-01-01',
  gender: 'female',
  status: 'single',
  ...overrides,
});

export const createMockItinerary = (overrides?: Partial<Itinerary>): Itinerary => ({
  id: 'test-itin-123',
  userId: 'test-user-123',
  destination: 'Paris',
  title: 'Paris Trip',
  startDate: '2025-12-01',
  endDate: '2025-12-07',
  gender: 'female',
  status: 'single',
  lowerRange: 25,
  upperRange: 35,
  ...overrides,
});

export const createMockAIItinerary = (overrides?: Partial<AIItinerary>): AIItinerary => ({
  ...createMockItinerary(),
  ai_status: 'completed',
  response: {
    data: {
      activities: [],
      flights: [],
      hotels: [],
      metadata: {
        filtering: {
          budget: { min: 1000, max: 2000 },
          activities: [],
        }
      }
    }
  },
  ...overrides,
});
```

---

**Next Steps**: 
1. Create `testData.ts` helper file
2. Implement Template 1 (RPC errors)
3. Run tests and fix implementation
4. Move to next template

**Estimated Time**: 
- Template setup: 30 minutes
- Test implementation: 2-3 hours per template
- Bug fixes: 1-2 hours per template
- **Total**: ~15-20 hours for all 5 templates
