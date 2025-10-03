// Unit tests for ItineraryCard AI activity rendering functionality
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock Firebase before importing any components that use it
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn()
}));

jest.mock('../../environments/firebaseConfig', () => ({
  app: {},
  db: {},
  auth: { currentUser: { uid: 'test-user-id' } }
}));

import ItineraryCard from '../../components/forms/ItineraryCard';
import { Itinerary } from '../../types/Itinerary';

// Mock the hooks
jest.mock('../../hooks/useGetUserProfilePhoto', () => ({
  useGetUserProfilePhoto: jest.fn(() => '/mock-profile.png')
}));

jest.mock('../../environments/firebaseConfig', () => ({
  auth: {
    currentUser: { uid: 'current-user-id' }
  }
}));

describe('ItineraryCard AI Activity Rendering', () => {
  const regularItinerary: Itinerary = {
    id: '1',
    destination: 'Rome, Italy',
    startDate: '2025-12-01',
    endDate: '2025-12-05',
    description: 'A classic Roman holiday',
    activities: ['Colosseum Tour', 'Vatican Museums', 'Trevi Fountain'],
    gender: 'Any',
    status: 'single',
    sexualOrientation: 'heterosexual',
    startDay: 0,
    endDay: 0,
    lowerRange: 25,
    upperRange: 35,
    likes: [],
    userInfo: {
      username: 'TravelLover',
      gender: 'Female',
      dob: '1990-01-01',
      uid: 'user-123',
      email: 'travel@example.com',
      status: 'single',
      sexualOrientation: 'heterosexual',
      blocked: []
    }
  };

  const aiGeneratedItinerary = {
    ...regularItinerary,
    id: '2',
    destination: 'Paris, France',
    description: 'AI-generated romantic getaway',
    activities: [], // This should be ignored for AI itineraries
    ai_status: 'completed',
    aiGenerated: true,
    response: {
      data: {
        itinerary: {
          destination: 'Paris, France',
          startDate: '2025-12-01',
          endDate: '2025-12-05',
          description: 'AI-generated romantic getaway',
          days: [
            {
              day: 1,
              date: '2025-12-01',
              activities: [
                {
                  id: 'activity-1',
                  name: 'Eiffel Tower Visit',
                  description: 'Iconic iron lattice tower',
                  category: 'Sightseeing'
                },
                {
                  id: 'activity-2',
                  name: 'Seine River Cruise',
                  description: 'Scenic boat trip',
                  category: 'Tour'
                }
              ]
            },
            {
              day: 2,
              date: '2025-12-02',
              activities: [
                {
                  id: 'activity-3',
                  name: 'Louvre Museum',
                  description: 'World famous art museum',
                  category: 'Museum'
                },
                {
                  id: 'activity-4',
                  name: 'Champs-Élysées Shopping',
                  description: 'Shopping on famous avenue',
                  category: 'Shopping'
                }
              ]
            }
          ]
        }
      }
    }
  } as any;

  const aiGeneratedWithDailyPlans = {
    ...aiGeneratedItinerary,
    response: {
      data: {
        itinerary: {
          ...aiGeneratedItinerary.response.data.itinerary,
          dailyPlans: aiGeneratedItinerary.response.data.itinerary.days,
          days: undefined
        }
      }
    }
  };

  const mockHandlers = {
    onLike: jest.fn(),
    onDislike: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders regular itinerary activities from activities array', () => {
    render(
      <ItineraryCard 
        itinerary={regularItinerary} 
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Activities:')).toBeInTheDocument();
    expect(screen.getByText('Colosseum Tour')).toBeInTheDocument();
    expect(screen.getByText('Vatican Museums')).toBeInTheDocument();
    expect(screen.getByText('Trevi Fountain')).toBeInTheDocument();
  });

  test('renders AI-generated itinerary activities from nested days structure', () => {
    render(
      <ItineraryCard 
        itinerary={aiGeneratedItinerary} 
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Activities:')).toBeInTheDocument();
    
    // Should show activities extracted from nested structure
    expect(screen.getByText('Eiffel Tower Visit')).toBeInTheDocument();
    expect(screen.getByText('Seine River Cruise')).toBeInTheDocument();
    expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    expect(screen.getByText('Champs-Élysées Shopping')).toBeInTheDocument();
  });

  test('renders AI-generated itinerary activities from nested dailyPlans structure', () => {
    render(
      <ItineraryCard 
        itinerary={aiGeneratedWithDailyPlans} 
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Activities:')).toBeInTheDocument();
    
    // Should show activities extracted from nested structure
    expect(screen.getByText('Eiffel Tower Visit')).toBeInTheDocument();
    expect(screen.getByText('Seine River Cruise')).toBeInTheDocument();
    expect(screen.getByText('Louvre Museum')).toBeInTheDocument();
    expect(screen.getByText('Champs-Élysées Shopping')).toBeInTheDocument();
  });

  test('ignores regular activities array for AI-generated itineraries', () => {
    const mixedItinerary = {
      ...aiGeneratedItinerary,
      activities: ['This Should Not Show', 'Neither Should This']
    };

    render(
      <ItineraryCard 
        itinerary={mixedItinerary} 
        {...mockHandlers}
      />
    );

    // Should not show activities from the regular activities array
    expect(screen.queryByText('This Should Not Show')).not.toBeInTheDocument();
    expect(screen.queryByText('Neither Should This')).not.toBeInTheDocument();
    
    // Should show activities from nested structure
    expect(screen.getByText('Eiffel Tower Visit')).toBeInTheDocument();
  });

  test('falls back to regular activities array when AI data is malformed', () => {
    const malformedAI = {
      ...aiGeneratedItinerary,
      activities: ['Fallback Activity 1', 'Fallback Activity 2'],
      response: {
        data: {
          itinerary: {
            // Missing or malformed activities structure
            days: []
          }
        }
      }
    };

    render(
      <ItineraryCard 
        itinerary={malformedAI} 
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Activities:')).toBeInTheDocument();
    expect(screen.getByText('Fallback Activity 1')).toBeInTheDocument();
    expect(screen.getByText('Fallback Activity 2')).toBeInTheDocument();
  });

  test('handles AI itinerary with empty activities gracefully', () => {
    const emptyActivitiesAI = {
      ...aiGeneratedItinerary,
      response: {
        data: {
          itinerary: {
            ...aiGeneratedItinerary.response.data.itinerary,
            days: [
              {
                day: 1,
                activities: [] // Empty activities
              },
              {
                day: 2,
                activities: [
                  { name: '', description: '' }, // Empty activity names
                  { name: '   ', description: 'Whitespace only name' } // Whitespace only
                ]
              }
            ]
          }
        }
      }
    };

    render(
      <ItineraryCard 
        itinerary={emptyActivitiesAI} 
        {...mockHandlers}
      />
    );

    // Should not show Activities section if no valid activities
    expect(screen.queryByText('Activities:')).not.toBeInTheDocument();
  });

  test('handles activities with missing name/title properties', () => {
    const incompleteActivitiesAI = {
      ...aiGeneratedItinerary,
      response: {
        data: {
          itinerary: {
            days: [
              {
                day: 1,
                activities: [
                  { title: 'Activity with Title' }, // Has title but no name
                  { name: 'Activity with Name' }, // Has name but no title
                  { description: 'Only Description' }, // Has neither name nor title
                  { name: 'Valid Activity', description: 'Valid activity with both' }
                ]
              }
            ]
          }
        }
      }
    };

    render(
      <ItineraryCard 
        itinerary={incompleteActivitiesAI} 
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Activities:')).toBeInTheDocument();
    expect(screen.getByText('Activity with Title')).toBeInTheDocument();
    expect(screen.getByText('Activity with Name')).toBeInTheDocument();
    expect(screen.getByText('Valid Activity')).toBeInTheDocument();
    
    // Should not show activity with neither name nor title
    expect(screen.queryByText('Only Description')).not.toBeInTheDocument();
  });

  test('identifies AI itineraries using ai_status property', () => {
    const aiWithStatus = {
      ...regularItinerary,
      ai_status: 'completed',
      response: {
        data: {
          itinerary: {
            days: [{
              activities: [{ name: 'AI Activity from Status' }]
            }]
          }
        }
      }
    };

    render(
      <ItineraryCard 
        itinerary={aiWithStatus} 
        {...mockHandlers}
      />
    );

    expect(screen.getByText('AI Activity from Status')).toBeInTheDocument();
    // Should not show regular activities
    expect(screen.queryByText('Colosseum Tour')).not.toBeInTheDocument();
  });
});