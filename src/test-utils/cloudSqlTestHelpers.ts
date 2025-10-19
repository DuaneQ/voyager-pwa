/**
 * Cloud SQL Test Utilities
 * Helpers for mocking Cloud SQL RPC calls and creating test data
 */

import { Itinerary } from '../types/Itinerary';
import { UserProfile } from '../types/UserProfile';
import { TravelPreferenceProfile } from '../types/TravelPreferences';

/**
 * Mock a successful Cloud SQL RPC call
 */
export const mockCloudSqlSuccess = (rpcName: string, data: any) => {
  const mockCallable = jest.fn(() => 
    Promise.resolve({ 
      data: { 
        success: true, 
        data 
      } 
    })
  );
  
  (global as any)[`__mock_httpsCallable_${rpcName}`] = mockCallable;
  return mockCallable;
};

/**
 * Mock a Cloud SQL RPC error
 */
export const mockCloudSqlError = (rpcName: string, error: Error) => {
  const mockCallable = jest.fn(() => Promise.reject(error));
  (global as any)[`__mock_httpsCallable_${rpcName}`] = mockCallable;
  return mockCallable;
};

/**
 * Mock a Cloud SQL RPC timeout (30+ seconds)
 */
export const mockCloudSqlTimeout = (rpcName: string) => {
  return mockCloudSqlError(rpcName, new Error('Request timeout'));
};

/**
 * Mock a malformed Cloud SQL RPC response (missing success field)
 */
export const mockCloudSqlMalformed = (rpcName: string, response: any) => {
  const mockCallable = jest.fn(() => Promise.resolve({ data: response }));
  (global as any)[`__mock_httpsCallable_${rpcName}`] = mockCallable;
  return mockCallable;
};

/**
 * Mock Cloud SQL connection failure
 */
export const mockCloudSqlConnectionFailure = (rpcName: string) => {
  return mockCloudSqlError(
    rpcName, 
    new Error('ECONNREFUSED: Connection refused')
  );
};

/**
 * Mock Prisma constraint violation
 */
export const mockPrismaConstraintViolation = (rpcName: string) => {
  return mockCloudSqlError(
    rpcName,
    new Error('Unique constraint failed on the fields: (`id`)')
  );
};

/**
 * Create a mock itinerary with Cloud SQL schema
 */
export const createMockItinerary = (overrides: Partial<Itinerary> = {}): any => ({
  id: 'test-itin-1',
  userId: 'test-user-123',
  destination: 'Paris',
  title: 'Paris Adventure',
  description: 'A wonderful trip to Paris',
  startDate: '2025-12-01',
  endDate: '2025-12-07',
  startDay: new Date('2025-12-01').getTime(),
  endDay: new Date('2025-12-07').getTime(),
  gender: 'female',
  status: 'single',
  lowerRange: 25,
  upperRange: 35,
  sexualOrientation: 'straight',
  likes: [],
  activities: [],
  userInfo: {
    uid: 'other-user-456', // Different from test-user-123 to avoid filtering as "own itinerary"
    username: 'Test User',
    email: 'test@example.com',
    gender: 'female',
    dob: '1990-01-01',
    status: 'single',
    sexualOrientation: 'straight',
    blocked: [],
  },
  ...overrides,
});

/**
 * Create a mock AI itinerary with response data
 */
export const createMockAIItinerary = (overrides: Partial<Itinerary> = {}): any => ({
  ...createMockItinerary(),
  ai_status: 'completed',
  aiGenerated: true,
  response: {
    data: {
      activities: [
        { name: 'Eiffel Tower', time: '10:00 AM', description: 'Visit iconic landmark' },
        { name: 'Louvre Museum', time: '2:00 PM', description: 'See the Mona Lisa' }
      ],
      flights: [],
      hotels: [],
      metadata: {
        filtering: {
          budget: { min: 1000, max: 2000, currency: 'USD' },
          activities: ['Museums', 'Food Tours'],
          preferredActivities: ['Museums', 'Food Tours']
        }
      }
    }
  },
  metadata: {
    filtering: {
      budget: { min: 1000, max: 2000, currency: 'USD' },
      activities: ['Museums', 'Food Tours'],
      preferredActivities: ['Museums', 'Food Tours']
    }
  },
  ...overrides,
});

/**
 * Create a mock user profile
 */
export const createMockUserProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  uid: 'test-user-123',
  username: 'Test User',
  email: 'test@example.com',
  dob: '1990-01-01',
  gender: 'female',
  status: 'single',
  sexualOrientation: 'straight',
  blocked: [],
  ...overrides,
});

/**
 * Create an incomplete user profile (missing dob/gender)
 */
export const createIncompleteUserProfile = (missing: 'dob' | 'gender' | 'both' = 'both'): UserProfile => {
  const profile = createMockUserProfile();
  
  if (missing === 'dob' || missing === 'both') {
    delete (profile as any).dob;
  }
  
  if (missing === 'gender' || missing === 'both') {
    delete (profile as any).gender;
  }
  
  return profile;
};

/**
 * Create a mock travel preference profile
 */
export const createMockTravelPreference = (
  overrides: Partial<TravelPreferenceProfile> = {}
): any => ({
  id: 'profile-1',
  name: 'Default Profile',
  isDefault: true,
  travelStyle: 'mid-range',
  budgetRange: {
    min: 1000,
    max: 2000,
    currency: 'USD',
  },
  groupSize: {
    preferred: 2,
    sizes: [1, 2, 3, 4],
  },
  activities: ['Museums', 'Food Tours', 'Shopping'],
  transportation: {
    primaryMode: 'airplane',
    maxWalkingDistance: 5,
    includeFlights: true,
  },
  ...overrides,
});

/**
 * Create an expired itinerary (endDay in the past)
 */
export const createExpiredItinerary = (overrides: Partial<Itinerary> = {}): any => {
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 10);
  
  return createMockItinerary({
    endDate: pastDate.toISOString(),
    endDay: pastDate.getTime(),
    ...overrides,
  });
};

/**
 * Create an itinerary with invalid BigInt values
 */
export const createInvalidBigIntItinerary = (): any => ({
  id: 'test-invalid-bigint',
  destination: 'Paris',
  startDay: 'invalid-bigint', // Invalid
  endDay: 'not-a-number', // Invalid
});

/**
 * Create an itinerary with malformed JSONB metadata
 */
export const createMalformedMetadataItinerary = (): any => ({
  id: 'test-malformed-json',
  destination: 'Paris',
  metadata: 'invalid-json-string', // Should be object
  response: '<xml>not json</xml>', // Should be object
});

/**
 * Mock firebase/functions module for RPC testing
 */
export const setupCloudSqlMocks = () => {
  jest.mock('firebase/functions', () => {
    const actual = jest.requireActual('firebase/functions');
    return {
      ...actual,
      httpsCallable: jest.fn((functions, name) => {
        // Check if a specific mock exists for this RPC
        const specificMock = (global as any)[`__mock_httpsCallable_${name}`];
        if (specificMock) {
          return specificMock;
        }
        
        // Default mock returns empty success response
        return jest.fn(() => Promise.resolve({ 
          data: { success: true, data: [] } 
        }));
      }),
      getFunctions: jest.fn(() => ({})),
    };
  });
};

/**
 * Clean up all Cloud SQL mocks
 */
export const cleanupCloudSqlMocks = () => {
  const globalAny = global as any;
  Object.keys(globalAny).forEach(key => {
    if (key.startsWith('__mock_httpsCallable_')) {
      delete globalAny[key];
    }
  });
};
