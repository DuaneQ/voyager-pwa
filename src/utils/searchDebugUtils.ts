/**
 * Debug utilities for testing search edge cases
 * Add this to your Search component for quick testing
 */

// Add this to localStorage to enable debug mode
export const enableDebugMode = () => {
  localStorage.setItem('searchDebugMode', 'true');
  console.log('🐛 Search debug mode enabled');
};

export const disableDebugMode = () => {
  localStorage.removeItem('searchDebugMode');
  console.log('✅ Search debug mode disabled'); 
};

export const isDebugMode = () => {
  return localStorage.getItem('searchDebugMode') === 'true';
};

// Mock test data that can be injected into search results
export const mockTestItineraries = [
  {
    id: 'debug-match-1',
    destination: 'Paris, France',
    startDate: '2025-12-15',
    endDate: '2025-12-22',
    startDay: new Date('2025-12-15').getTime(),
    endDay: new Date('2025-12-22').getTime(),
    description: '🧪 DEBUG: First Paris match',
    activities: ['Louvre Museum', 'Eiffel Tower', 'Christmas Markets'],
    userInfo: {
      uid: 'debug-user-1',
      username: '🧪 Debug User 1',
      email: 'debug1@test.com',
      dob: '1990-03-20',
      gender: 'Male',
      status: 'Single',
      sexualOrientation: 'Straight'
    },
    lowerRange: 25,
    upperRange: 45,
    isTestData: true
  },
  {
    id: 'debug-match-2', 
    destination: 'Paris, France',
    startDate: '2025-12-15',
    endDate: '2025-12-22',
    startDay: new Date('2025-12-15').getTime(),
    endDay: new Date('2025-12-22').getTime(), 
    description: '🧪 DEBUG: Second Paris match',
    activities: ['Shopping', 'Notre Dame', 'Seine River Cruise'],
    userInfo: {
      uid: 'debug-user-2',
      username: '🧪 Debug User 2', 
      email: 'debug2@test.com',
      dob: '1992-08-10',
      gender: 'Female',
      status: 'Single',
      sexualOrientation: 'Straight'
    },
    lowerRange: 28,
    upperRange: 42,
    isTestData: true
  },
  {
    id: 'debug-match-3',
    destination: 'Paris, France', 
    startDate: '2025-12-15',
    endDate: '2025-12-22',
    startDay: new Date('2025-12-15').getTime(),
    endDay: new Date('2025-12-22').getTime(),
    description: '🧪 DEBUG: Third Paris match',
    activities: ['Wine Tasting', 'French Cuisine', 'Montmartre'],
    userInfo: {
      uid: 'debug-user-3',
      username: '🧪 Debug User 3',
      email: 'debug3@test.com', 
      dob: '1988-12-05',
      gender: 'Male',
      status: 'Single',
      sexualOrientation: 'Straight'
    },
    lowerRange: 30,
    upperRange: 50,
    isTestData: true
  }
];

// Debug scenarios for different edge cases
export const debugScenarios = {
  multipleMatches: mockTestItineraries,
  noMatches: [], // Empty array to test example display
  singleMatch: [mockTestItineraries[0]],
  ageFilteredOut: [
    {
      ...mockTestItineraries[0],
      id: 'debug-filtered-age',
      userInfo: {
        ...mockTestItineraries[0].userInfo,
        dob: '2001-01-01', // Too young
        username: '🧪 Too Young User'
      },
      lowerRange: 18,
      upperRange: 25
    }
  ]
};

// Helper to inject debug data into search hook
export const injectDebugData = (scenario: keyof typeof debugScenarios) => {
  if (!isDebugMode()) return null;
  
  console.log(`🧪 DEBUG: Injecting ${scenario} scenario`);
  return debugScenarios[scenario];
};

// Console commands for easy testing
(window as any).searchDebug = {
  enable: enableDebugMode,
  disable: disableDebugMode, 
  scenarios: debugScenarios,
  inject: injectDebugData,
  reset: () => {
    localStorage.removeItem('hasSeenExampleItinerary');
    console.log('🔄 Reset example seen status');
  }
};

console.log('🧪 Search debug utilities loaded. Use window.searchDebug for testing.');