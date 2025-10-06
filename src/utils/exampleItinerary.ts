import { Itinerary } from '../types/Itinerary';

/**
 * Static example itinerary used when no matches are found.
 * This is a completely separate, hardcoded example that doesn't interfere with real data.
 */
export const createExampleItinerary = (destination?: string): Itinerary => {
  return {
    id: 'static-example-123',
    destination: destination || 'Paris, France',
    gender: 'Any',
    sexualOrientation: 'Any',
    likes: [],
    startDate: '2025-03-15',
    endDate: '2025-03-22',
    startDay: new Date('2025-03-15T12:00:00.000Z').getTime(),
    endDay: new Date('2025-03-22T12:00:00.000Z').getTime(),
    description: 'This is an example of an AI Generated itinerary showing what a match would look like. No matches were found for your selected itinerary, but when you do have matches, they will appear here with real traveler details.  You can click the reject button if you don not want to match or the airplane icon if you do want to match.  If the other user likes your itinerary you can begin safely chatting on the Chat page.',
    activities: [
      'Visit iconic landmarks',
      'Explore local cuisine',
      'Walking tours',
      'Photography',
      'Shopping at local markets',
      'Museum visits'
    ],
    lowerRange: 25,
    upperRange: 35,
    status: 'new',
    userInfo: {
      username: 'Example Traveler',
      gender: 'Any',
      dob: '1990-01-01',
      uid: 'example-uid-123',
      email: 'example@voyager.com',
      status: 'Single',
      sexualOrientation: 'Any',
      blocked: [],
    }
  };
};

/**
 * Check if an itinerary is the static example
 */
export const isExampleItinerary = (itinerary: Itinerary): boolean => {
  return itinerary.id === 'static-example-123';
};