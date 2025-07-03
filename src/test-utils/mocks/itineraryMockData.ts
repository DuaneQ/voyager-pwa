import { Itinerary } from "../../types/Itinerary";

export const mockItineraries: Itinerary[] = [
  // Basic matching case
  {
    id: "itinerary-1",
    destination: "Paris",
    startDate: "2025-06-01",
    endDate: "2025-06-10",
    startDay: new Date("2025-06-01").getTime(),
    endDay: new Date("2025-06-10").getTime(),
    gender: "Female",
    status: "single",
    sexualOrientation: "heterosexual", // Add this field
    lowerRange: 25,
    upperRange: 35,
    description: "Art and culture trip",
    activities: ["Museums", "Cafes"],
    likes: [],
    userInfo: {
      username: "alice_traveler",
      gender: "Male",
      dob: "1990-03-15", // Age 35
      uid: "user-alice",
      email: "alice@example.com",
      status: "single",
      sexualOrientation: "heterosexual",
      blocked: [],
    },
  },
  
  // Age range mismatch (too young)
  {
    id: "itinerary-2", 
    destination: "Paris",
    startDate: "2025-06-05",
    endDate: "2025-06-15",
    startDay: new Date("2025-06-05").getTime(),
    endDay: new Date("2025-06-15").getTime(),
    gender: "Female",
    status: "single",
    sexualOrientation: "heterosexual",
    lowerRange: 40,
    upperRange: 50,
    description: "Luxury shopping",
    activities: ["Shopping", "Fine dining"],
    likes: [],
    userInfo: {
      username: "young_bob",
      gender: "Male",
      dob: "2002-01-01", // Age 23
      uid: "user-bob",
      email: "bob@example.com", 
      status: "single",
      sexualOrientation: "heterosexual",
      blocked: [],
    },
  },

  // Date overlap - no overlap
  {
    id: "itinerary-3",
    destination: "Paris", 
    startDate: "2025-07-01",
    endDate: "2025-07-10",
    startDay: new Date("2025-07-01").getTime(),
    endDay: new Date("2025-07-10").getTime(),
    gender: "Female",
    status: "single",
    sexualOrientation: "heterosexual",
    lowerRange: 25,
    upperRange: 40,
    description: "Summer vacation",
    activities: ["Sightseeing"],
    likes: [],
    userInfo: {
      username: "carol_summer",
      gender: "Male",
      dob: "1988-05-20", // Age 37
      uid: "user-carol",
      email: "carol@example.com",
      status: "single",
      sexualOrientation: "heterosexual", 
      blocked: [],
    },
  },

  // Different destination
  {
    id: "itinerary-4",
    destination: "Tokyo",
    startDate: "2025-06-05",
    endDate: "2025-06-12",
    startDay: new Date("2025-06-05").getTime(),
    endDay: new Date("2025-06-12").getTime(),
    gender: "Female",
    status: "single",
    sexualOrientation: "heterosexual",
    lowerRange: 25,
    upperRange: 40,
    description: "Cultural exploration",
    activities: ["Temples", "Food tours"],
    likes: [],
    userInfo: {
      username: "david_tokyo",
      gender: "Male",
      dob: "1985-12-10", // Age 39
      uid: "user-david",
      email: "david@example.com",
      status: "single", 
      sexualOrientation: "heterosexual",
      blocked: [],
    },
  },

  // Status mismatch
  {
    id: "itinerary-5",
    destination: "Paris",
    startDate: "2025-06-03",
    endDate: "2025-06-13", 
    startDay: new Date("2025-06-03").getTime(),
    endDay: new Date("2025-06-13").getTime(),
    gender: "Female",
    status: "relationship",
    sexualOrientation: "heterosexual",
    lowerRange: 25,
    upperRange: 40,
    description: "Romantic getaway", 
    activities: ["Romantic dinners"],
    likes: [],
    userInfo: {
      username: "emma_couple",
      gender: "Male",
      dob: "1992-08-25", // Age 32
      uid: "user-emma",
      email: "emma@example.com",
      status: "relationship",
      sexualOrientation: "heterosexual",
      blocked: [],
    },
  },

  // Sexual orientation mismatch 
  {
    id: "itinerary-6",
    destination: "Paris",
    startDate: "2025-06-04",
    endDate: "2025-06-14",
    startDay: new Date("2025-06-04").getTime(), 
    endDay: new Date("2025-06-14").getTime(),
    gender: "Female",
    status: "single",
    sexualOrientation: "bisexual", // Different sexual orientation preference
    lowerRange: 25,
    upperRange: 40,
    description: "Art and wine",
    activities: ["Art galleries", "Wine tasting"],
    likes: [],
    userInfo: {
      username: "frank_artist",
      gender: "Male", 
      dob: "1987-11-30", // Age 37
      uid: "user-frank",
      email: "frank@example.com",
      status: "single",
      sexualOrientation: "homosexual", // User's actual orientation
      blocked: [],
    },
  },

  // Perfect match - all criteria align
  {
    id: "itinerary-7",
    destination: "Paris",
    startDate: "2025-06-06",
    endDate: "2025-06-16",
    startDay: new Date("2025-06-06").getTime(),
    endDay: new Date("2025-06-16").getTime(), 
    gender: "Female",
    status: "single",
    sexualOrientation: "heterosexual", // Matches base user preference
    lowerRange: 28,
    upperRange: 45,
    description: "Perfect match trip",
    activities: ["Everything"], 
    likes: [],
    userInfo: {
      username: "grace_perfect",
      gender: "Male",
      dob: "1995-04-10", // Age 30
      uid: "user-grace",
      email: "grace@example.com",
      status: "single",
      sexualOrientation: "heterosexual", // User's actual orientation matches
      blocked: [],
    },
  },

  // Current user's own itinerary (should be excluded)
  {
    id: "itinerary-8", 
    destination: "Paris",
    startDate: "2025-06-02",
    endDate: "2025-06-12",
    startDay: new Date("2025-06-02").getTime(),
    endDay: new Date("2025-06-12").getTime(),
    gender: "Male",
    status: "single",
    sexualOrientation: "heterosexual",
    lowerRange: 25,
    upperRange: 35,
    description: "My own trip",
    activities: ["Solo travel"],
    likes: [],
    userInfo: {
      username: "current_user",
      gender: "Female",
      dob: "1990-01-01", // Age 35
      uid: "current-user-id",
      email: "current@example.com",
      status: "single",
      sexualOrientation: "heterosexual", 
      blocked: [],
    },
  },

  // Edge case: Minimal age range overlap
  {
    id: "itinerary-9",
    destination: "Paris",
    startDate: "2025-06-07",
    endDate: "2025-06-17",
    startDay: new Date("2025-06-07").getTime(),
    endDay: new Date("2025-06-17").getTime(),
    gender: "Female", 
    status: "single",
    sexualOrientation: "heterosexual",
    lowerRange: 35,
    upperRange: 35,
    description: "Age boundary test",
    activities: ["Boundary testing"],
    likes: [],
    userInfo: {
      username: "boundary_user",
      gender: "Male",
      dob: "1990-01-01", // Age 35
      uid: "user-boundary",
      email: "boundary@example.com",
      status: "single",
      sexualOrientation: "heterosexual",
      blocked: [],
    },
  },

  // Date edge case: Exact same dates
  {
    id: "itinerary-10",
    destination: "Paris",
    startDate: "2025-06-01",
    endDate: "2025-06-10",
    startDay: new Date("2025-06-01").getTime(),
    endDay: new Date("2025-06-10").getTime(),
    gender: "Female",
    status: "single", 
    sexualOrientation: "heterosexual", // Matches base user preference
    lowerRange: 30,
    upperRange: 40,
    description: "Same dates",
    activities: ["Synchronized travel"],
    likes: [],
    userInfo: {
      username: "sync_traveler",
      gender: "Male",
      dob: "1992-06-15", // Age 33
      uid: "user-sync",
      email: "sync@example.com",
      status: "single",
      sexualOrientation: "heterosexual", // User's actual orientation matches
      blocked: [],
    },
  },
];

// Base user itinerary for testing against
export const baseUserItinerary: Itinerary = {
  id: "base-user-itinerary",
  destination: "Paris", 
  startDate: "2025-06-01",
  endDate: "2025-06-10",
  startDay: new Date("2025-06-01").getTime(),
  endDay: new Date("2025-06-10").getTime(),
  gender: "Male", // Looking for male companions
  status: "single",
  sexualOrientation: "heterosexual", // Looking for heterosexual companions
  lowerRange: 25, // Looking for ages 25-35
  upperRange: 35,
  description: "Base user trip",
  activities: ["Base activities"],
  likes: [],
  userInfo: {
    username: "base_user",
    gender: "Female", // User is female
    dob: "1990-01-01", // Age 35 
    uid: "current-user-id",
    email: "base@example.com",
    status: "single",
    sexualOrientation: "heterosexual", // User's actual orientation
    blocked: [],
  },
};

export const currentUserId = "current-user-id";