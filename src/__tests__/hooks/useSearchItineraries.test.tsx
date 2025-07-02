import { renderHook, act, waitFor } from "@testing-library/react";
import useSearchItineraries from '../../hooks/useSearchItineraries';
import { Itinerary } from '../../types/Itinerary';

// Mock Firebase modules
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn()
}));

// Mock Firebase config
jest.mock('../../environments/firebaseConfig', () => ({
  app: {}
}));

// Import mocked Firebase functions
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';

describe('useSearchItineraries', () => {
  // Sample itinerary data for testing
  const mockItinerary: Itinerary = {
    id: '1',
    destination: 'Paris',
    gender: 'female',
    startDate: '2023-10-01',
    endDate: '2023-10-10'
  };
  
  // Sample data that would be returned from Firestore
  const mockMatchingItineraries = [
    {
      id: '2',
      destination: 'Paris',
      gender: 'female',
      startDate: '2023-10-02',
      endDate: '2023-10-12',
      userInfo: {
        uid: 'user123',
        gender: 'female',
        email: 'user@example.com'
      }
    },
    {
      id: '3',
      destination: 'Paris',
      gender: 'female',
      startDate: '2023-10-05',
      endDate: '2023-10-15',
      userInfo: {
        uid: 'user456',
        gender: 'female',
        email: 'another@example.com'
      }
    }
  ];

  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up basic mocks that all tests will use
    const mockDb = {};
    (getFirestore as jest.Mock).mockReturnValue(mockDb);
    (collection as jest.Mock).mockReturnValue('itineraries-collection');
    (query as jest.Mock).mockReturnValue('filtered-query');
    (where as jest.Mock).mockImplementation((field, op, value) => ({ field, op, value }));
  });

  it('should initialize with empty state', () => {
    // Render the hook
    const { result } = renderHook(() => useSearchItineraries());
    
    // Check initial state
    expect(result.current.matchingItineraries).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should set loading to true while fetching data', async () => {
    // Mock the Firestore query to return a promise that doesn't resolve immediately
    const queryPromise = new Promise(resolve => {
      // This promise won't resolve during this test
      setTimeout(resolve, 1000);
    });
    (getDocs as jest.Mock).mockReturnValue(queryPromise);
    
    // Render the hook
    const { result } = renderHook(() => useSearchItineraries());
    
    // Call the search function
    act(() => {
      result.current.searchItineraries(mockItinerary);
    });
    
    // Verify loading state is true while waiting
    expect(result.current.loading).toBe(true);
    
    // Cleanup by mocking a quick resolution to avoid test hanging
    (getDocs as jest.Mock).mockResolvedValueOnce({
      docs: []
    });
  });

  it('should populate matchingItineraries on successful API call', async () => {
    // Mock the Firestore query to return our sample data
    (getDocs as jest.Mock).mockResolvedValueOnce({
      docs: mockMatchingItineraries.map(item => ({
        id: item.id,
        data: () => ({ ...item })
      }))
    });
    
    // Render the hook
    const { result } = renderHook(() => useSearchItineraries());
    
    // Call the search function
    await act(async () => {
      result.current.searchItineraries(mockItinerary);
    });
    
    // Wait for the async operation to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // Verify the data is loaded correctly
    expect(result.current.matchingItineraries).toHaveLength(mockMatchingItineraries.length);
    expect(result.current.matchingItineraries[0].id).toBe(mockMatchingItineraries[0].id);
    expect(result.current.matchingItineraries[1].id).toBe(mockMatchingItineraries[1].id);
    expect(result.current.error).toBeNull();
  });

  it('should set error state on API error', async () => {
    // Mock the Firestore query to throw an error
    const mockError = new Error('Firestore error');
    (getDocs as jest.Mock).mockRejectedValueOnce(mockError);
    
    // Render the hook
    const { result } = renderHook(() => useSearchItineraries());
    
    // Call the search function
    await act(async () => {
      result.current.searchItineraries(mockItinerary);
    });
    
    // Wait for the async operation to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // Verify error state
    expect(result.current.error).toBe('Failed to search itineraries. Please try again later.');
    expect(result.current.matchingItineraries).toEqual([]);
  });

  it('should clear previous results when starting a new search', async () => {
    // For the first search, return some data
    (getDocs as jest.Mock).mockResolvedValueOnce({
      docs: [mockMatchingItineraries[0]].map(item => ({
        id: item.id,
        data: () => ({ ...item })
      }))
    });
    
    // Render the hook
    const { result } = renderHook(() => useSearchItineraries());
    
    // Call the first search
    await act(async () => {
      result.current.searchItineraries(mockItinerary);
    });
    
    // Wait for the first async operation
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // Verify first search results
    expect(result.current.matchingItineraries).toHaveLength(1);
    expect(result.current.matchingItineraries[0].id).toBe(mockMatchingItineraries[0].id);
    
    // For the second search, return different data
    (getDocs as jest.Mock).mockResolvedValueOnce({
      docs: [mockMatchingItineraries[1]].map(item => ({
        id: item.id,
        data: () => ({ ...item })
      }))
    });
    
    // Call the second search with different parameters
    const secondItinerary = { ...mockItinerary, destination: 'London' };
    
    // Verify that loading is reset to true and previous results are maintained until new data arrives
    await act(async () => {
      result.current.searchItineraries(secondItinerary);
    });
    
    // Wait for the second async operation
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // Verify second search results completely replaced the first
    expect(result.current.matchingItineraries).toHaveLength(1);
    expect(result.current.matchingItineraries[0].id).toBe(mockMatchingItineraries[1].id);
  });

  it('should correctly compose the Firestore query', async () => {
    // Mock successful response
    (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [] });
    
    // Render the hook
    const { result } = renderHook(() => useSearchItineraries());
    
    // Call the search function
    await act(async () => {
      result.current.searchItineraries(mockItinerary);
    });
    
    // Wait for the async operation
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // Verify the query was constructed correctly
    expect(getFirestore).toHaveBeenCalled();
    expect(collection).toHaveBeenCalledWith(expect.anything(), 'itineraries');
    
    // Verify the where clauses were applied correctly
    expect(where).toHaveBeenCalledWith('destination', '==', mockItinerary.destination);
    expect(where).toHaveBeenCalledWith('userInfo.gender', '==', mockItinerary.gender);
    
    // Verify query and getDocs were called with the right parameters
    expect(query).toHaveBeenCalledWith(
      'itineraries-collection', 
      expect.anything(), 
      expect.anything()
    );
    expect(getDocs).toHaveBeenCalledWith('filtered-query');
  });
});