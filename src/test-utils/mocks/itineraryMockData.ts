// Minimal mock data for useSearchItineraries tests
export const currentUserId = 'current-user-123';

export const baseUserItinerary = {
  id: 'base-itin',
  destination: 'Paris',
  startDate: '2026-06-01',
  endDate: '2026-06-10',
  startDay: new Date('2026-06-01').getTime(),
  endDay: new Date('2026-06-10').getTime(),
  gender: 'Male',
  lowerRange: 25,
  upperRange: 40,
  sexualOrientation: 'heterosexual',
  userInfo: {
    uid: currentUserId,
    username: 'base_user',
    dob: '1995-05-20',
    status: 'single',
    gender: 'Male',
    email: 'current@example.com',
    sexualOrientation: 'heterosexual',
  },
};

// Create a small set of mock itineraries used by tests. Keep them conservative.
export const mockItineraries = Array.from({ length: 11 }, (_, i) => {
  const idNum = i + 1;
  // default: overlapping dates near baseUserItinerary
  const overlappingDates = [
    ['2026-06-03', '2026-06-08'], // idx0 -> itinerary-1
    ['2027-01-01', '2027-01-05'], // idx1 -> itinerary-2 (no overlap)
    ['2026-07-01', '2026-07-05'], // idx2 -> itinerary-3 (no overlap)
    ['2026-06-04', '2026-06-07'], // idx3 -> itinerary-4
    ['2026-06-05', '2026-06-09'], // idx4 -> itinerary-5
    ['2026-06-03', '2026-06-07'], // idx5 -> itinerary-6
    ['2026-06-05', '2026-06-09'], // idx6 -> itinerary-7
    ['2026-06-03', '2026-06-08'], // idx7 -> itinerary-8 (made current user's itinerary)
    ['2026-06-02', '2026-06-06'], // idx8 -> itinerary-9
    ['2026-06-05', '2026-06-09'], // idx9 -> itinerary-10 (used by Date Overlap test)
    ['2026-06-15', '2026-06-18'], // idx10 -> itinerary-11 (no overlap)
  ];

  const [startDate, endDate] = overlappingDates[i] || overlappingDates[0];

  const userUid = idNum === 8 ? currentUserId : `user-${idNum}`; // make itinerary-8 belong to current user

  return {
    id: `itinerary-${idNum}`,
    destination: 'Paris',
    startDate,
    endDate,
    startDay: new Date(startDate).getTime(),
    endDay: new Date(endDate).getTime(),
    userInfo: {
      uid: userUid,
      username: idNum === 1 ? 'alice_traveler' : idNum === 7 ? 'grace_perfect' : `user_${idNum}`,
      dob: idNum === 2 ? '1960-02-02' : '1995-01-01',
      status: 'single',
      gender: idNum % 2 === 0 ? 'Male' : 'Female',
      email: `user${idNum}@example.com`,
      sexualOrientation: 'heterosexual',
    },
    gender: idNum % 2 === 0 ? 'Male' : 'Female',
    lowerRange: 20,
    upperRange: 40,
    sexualOrientation: 'heterosexual',
  };
});

export default mockItineraries;
