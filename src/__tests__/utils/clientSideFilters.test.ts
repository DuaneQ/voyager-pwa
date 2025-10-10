import { applyClientSideFilters, SearchParams } from "../../utils/clientSideFilters";
import { Itinerary } from "../../types/Itinerary";

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe("Client-Side Filtering - applyClientSideFilters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    // Reset Date to a specific time for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-10-09T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // Helper to create test itinerary
  const createTestItinerary = (overrides: Partial<Itinerary> = {}): Itinerary => ({
    id: "test-id",
    destination: "Miami",
    startDate: "2025-11-01",
    endDate: "2025-11-07", 
    startDay: new Date("2025-11-01").getTime(),
    endDay: new Date("2025-11-07").getTime(),
    lowerRange: 25,
    upperRange: 35, // Includes current user age 30
    userInfo: {
      uid: "other-user-id",
      username: "testuser",
      email: "testuser@example.com",
      dob: "1995-01-01", // Age 30 as of 2025-10-09 - fits in current user's 28-40 range
      gender: "Male",
      status: "Single",
      sexualOrientation: "Straight"
    },
    ...overrides
  });

  const createCurrentUserItinerary = (overrides: Partial<Itinerary> = {}): Itinerary => ({
    id: "current-user-itinerary",
    destination: "Miami",
    startDate: "2025-11-03",
    endDate: "2025-11-10",
    startDay: new Date("2025-11-03").getTime(),
    endDay: new Date("2025-11-10").getTime(),
    lowerRange: 28,
    upperRange: 40,
    userInfo: {
      uid: "current-user-id",
      username: "currentuser",
      email: "currentuser@example.com", 
      dob: "1995-05-15", // Age 30 as of 2025-10-09 - fits in other user's 25-35 range
      gender: "Female",
      status: "Single",
      sexualOrientation: "Straight"
    },
    ...overrides
  });

  describe("User ID filtering", () => {
    test("should exclude current user's own itineraries", () => {
      const currentUserItinerary = createCurrentUserItinerary();
      const params: SearchParams = {
        currentUserItinerary,
        currentUserId: "current-user-id"
      };

      const itineraries = [
        createTestItinerary({ id: "other-1" }), // Different user
        createTestItinerary({ 
          id: "own-itinerary", 
          userInfo: { ...createTestItinerary().userInfo!, uid: "current-user-id" } // Same user
        }),
        createTestItinerary({ id: "other-2" }) // Different user
      ];

      const result = applyClientSideFilters(itineraries, params);
      
      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toEqual(["other-1", "other-2"]);
      expect(result.find(r => r.id === "own-itinerary")).toBeUndefined();
    });
  });

  describe("Viewed itineraries filtering", () => {
    test("should exclude already viewed itineraries", () => {
      mockLocalStorage.setItem("VIEWED_ITINERARIES", JSON.stringify(["viewed-1", "viewed-2"]));
      
      const currentUserItinerary = createCurrentUserItinerary();
      const params: SearchParams = {
        currentUserItinerary,
        currentUserId: "current-user-id"
      };

      const itineraries = [
        createTestItinerary({ id: "viewed-1" }), // Should be excluded
        createTestItinerary({ id: "new-1" }),    // Should be included
        createTestItinerary({ id: "viewed-2" }), // Should be excluded
        createTestItinerary({ id: "new-2" })     // Should be included
      ];

      const result = applyClientSideFilters(itineraries, params);
      
      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toEqual(["new-1", "new-2"]);
    });

    test("should handle malformed localStorage gracefully", () => {
      mockLocalStorage.setItem("VIEWED_ITINERARIES", "invalid-json{");
      
      const currentUserItinerary = createCurrentUserItinerary();
      const params: SearchParams = {
        currentUserItinerary,
        currentUserId: "current-user-id"
      };

      const itineraries = [createTestItinerary({ id: "test-1" })];

      // Should not throw and should include the itinerary
      const result = applyClientSideFilters(itineraries, params);
      expect(result).toHaveLength(1);
    });
  });

  describe("Date overlap filtering", () => {
    test("should include itineraries with overlapping dates", () => {
      const currentUserItinerary = createCurrentUserItinerary({
        startDate: "2025-11-03",
        endDate: "2025-11-10"
      });
      const params: SearchParams = {
        currentUserItinerary,
        currentUserId: "current-user-id"
      };

      const itineraries = [
        // Overlaps: Nov 1-7 overlaps with Nov 3-10 (Nov 3-7)
        createTestItinerary({
          id: "overlapping",
          startDate: "2025-11-01",
          endDate: "2025-11-07",
          startDay: new Date("2025-11-01").getTime(),
          endDay: new Date("2025-11-07").getTime()
        })
      ];

      const result = applyClientSideFilters(itineraries, params);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("overlapping");
    });

    test("should exclude itineraries with no date overlap", () => {
      const currentUserItinerary = createCurrentUserItinerary({
        startDate: "2025-11-15",
        endDate: "2025-11-22"
      });
      const params: SearchParams = {
        currentUserItinerary,
        currentUserId: "current-user-id"
      };

      const itineraries = [
        // No overlap: Nov 1-7 does not overlap with Nov 15-22
        createTestItinerary({
          id: "no-overlap",
          startDate: "2025-11-01",
          endDate: "2025-11-07",
          startDay: new Date("2025-11-01").getTime(),
          endDay: new Date("2025-11-07").getTime()
        })
      ];

      const result = applyClientSideFilters(itineraries, params);
      expect(result).toHaveLength(0);
    });

    test("should include touching date ranges (same day)", () => {
      const currentUserItinerary = createCurrentUserItinerary({
        startDate: "2025-11-07",
        endDate: "2025-11-14"
      });
      const params: SearchParams = {
        currentUserItinerary,
        currentUserId: "current-user-id"
      };

      const itineraries = [
        // Touching: Nov 1-7 touches Nov 7-14 on Nov 7
        createTestItinerary({
          id: "touching",
          startDate: "2025-11-01",
          endDate: "2025-11-07",
          startDay: new Date("2025-11-01").getTime(),
          endDay: new Date("2025-11-07").getTime()
        })
      ];

      const result = applyClientSideFilters(itineraries, params);
      expect(result).toHaveLength(1);
    });

    test("should handle missing startDay/endDay gracefully", () => {
      const currentUserItinerary = createCurrentUserItinerary();
      const params: SearchParams = {
        currentUserItinerary,
        currentUserId: "current-user-id"
      };

      const itineraries = [
        createTestItinerary({
          id: "missing-timestamps",
          startDay: undefined,
          endDay: undefined
        })
      ];

      // Should include when timestamps are missing (no date filter applied)
      const result = applyClientSideFilters(itineraries, params);
      expect(result).toHaveLength(1);
    });
  });

  describe("Age range filtering", () => {
    test("should include when other user's age is within current user's range", () => {
      const currentUserItinerary = createCurrentUserItinerary({
        lowerRange: 25,
        upperRange: 35
      });
      const params: SearchParams = {
        currentUserItinerary,
        currentUserId: "current-user-id"
      };

      const itineraries = [
        createTestItinerary({
          id: "age-30",
          userInfo: {
            ...createTestItinerary().userInfo!,
            dob: "1995-06-15" // Age 30 (within 25-35 range)
          }
        })
      ];

      const result = applyClientSideFilters(itineraries, params);
      expect(result).toHaveLength(1);
    });

    test("should exclude when other user's age is outside current user's range", () => {
      const currentUserItinerary = createCurrentUserItinerary({
        lowerRange: 25,
        upperRange: 35
      });
      const params: SearchParams = {
        currentUserItinerary,
        currentUserId: "current-user-id"
      };

      const itineraries = [
        createTestItinerary({
          id: "age-45",
          userInfo: {
            ...createTestItinerary().userInfo!,
            dob: "1980-01-01" // Age 45 (outside 25-35 range)
          }
        })
      ];

      const result = applyClientSideFilters(itineraries, params);
      expect(result).toHaveLength(0);
    });

    // Note: Bidirectional age filtering (current user age within other user's range) is disabled

    test("should handle birthday not yet reached this year", () => {
      // Set current date to before birthday
      jest.setSystemTime(new Date('2025-06-01T00:00:00Z'));
      
      const currentUserItinerary = createCurrentUserItinerary({
        lowerRange: 34,
        upperRange: 44
      });
      const params: SearchParams = {
        currentUserItinerary,
        currentUserId: "current-user-id"
      };

      const itineraries = [
        createTestItinerary({
          id: "birthday-not-reached",
          userInfo: {
            ...createTestItinerary().userInfo!,
            dob: "1990-12-25" // Birthday Dec 25, should be 34 years old on June 1
          }
        })
      ];

      const result = applyClientSideFilters(itineraries, params);
      expect(result).toHaveLength(1); // Should include age 34
    });

    test("should handle leap year birthdays", () => {
      const currentUserItinerary = createCurrentUserItinerary({
        lowerRange: 32,
        upperRange: 42
      });
      const params: SearchParams = {
        currentUserItinerary,
        currentUserId: "current-user-id"
      };

      const itineraries = [
        createTestItinerary({
          id: "leap-year-birthday",
          userInfo: {
            ...createTestItinerary().userInfo!,
            dob: "1992-02-29" // Leap year birthday
          }
        })
      ];

      const result = applyClientSideFilters(itineraries, params);
      expect(result).toHaveLength(1); // Should handle leap year correctly
    });

    test("should handle missing age ranges gracefully", () => {
      const currentUserItinerary = createCurrentUserItinerary({
        lowerRange: undefined,
        upperRange: undefined
      });
      const params: SearchParams = {
        currentUserItinerary,
        currentUserId: "current-user-id"
      };

      const itineraries = [
        createTestItinerary({
          id: "no-age-filter",
          lowerRange: undefined,
          upperRange: undefined
        })
      ];

      // Should include when age ranges are missing (no age filtering)
      const result = applyClientSideFilters(itineraries, params);
      expect(result).toHaveLength(1);
    });

    test("should handle missing date of birth gracefully", () => {
      const currentUserItinerary = createCurrentUserItinerary({
        userInfo: {
          ...createCurrentUserItinerary().userInfo!,
          dob: undefined as any
        }
      });
      const params: SearchParams = {
        currentUserItinerary,
        currentUserId: "current-user-id"
      };

      const itineraries = [
        createTestItinerary({
          id: "no-dob",
          userInfo: {
            ...createTestItinerary().userInfo!,
            dob: undefined as any
          }
        })
      ];

      // Should include when DOB is missing (no age filtering)
      const result = applyClientSideFilters(itineraries, params);
      expect(result).toHaveLength(1);
    });

    test("should handle invalid date strings", () => {
      const currentUserItinerary = createCurrentUserItinerary();
      const params: SearchParams = {
        currentUserItinerary,
        currentUserId: "current-user-id"
      };

      const itineraries = [
        createTestItinerary({
          id: "invalid-dob",
          userInfo: {
            ...createTestItinerary().userInfo!,
            dob: "invalid-date"
          }
        })
      ];

      // Should handle invalid dates gracefully (likely exclude due to NaN age)
      const result = applyClientSideFilters(itineraries, params);
      // The actual behavior depends on how calculateAge handles invalid dates
      expect(result).toBeDefined(); // Just ensure it doesn't crash
    });
  });

  describe("Combined filtering scenarios", () => {
    test("should apply all filters correctly", () => {
      mockLocalStorage.setItem("VIEWED_ITINERARIES", JSON.stringify(["viewed-itinerary"]));

      const currentUserItinerary = createCurrentUserItinerary({
        startDate: "2025-11-03",
        endDate: "2025-11-10",
        lowerRange: 25,
        upperRange: 35,
        userInfo: {
          ...createCurrentUserItinerary().userInfo!,
          dob: "1988-05-15" // Age 37
        }
      });
      const params: SearchParams = {
        currentUserItinerary,
        currentUserId: "current-user-id"
      };

      const itineraries = [
        // Should be excluded - own itinerary
        createTestItinerary({
          id: "own-itinerary",
          userInfo: { ...createTestItinerary().userInfo!, uid: "current-user-id" }
        }),
        // Should be excluded - already viewed
        createTestItinerary({
          id: "viewed-itinerary"
        }),
        // Should be excluded - no date overlap
        createTestItinerary({
          id: "no-date-overlap",
          startDate: "2025-12-01",
          endDate: "2025-12-07",
          startDay: new Date("2025-12-01").getTime(),
          endDay: new Date("2025-12-07").getTime()
        }),
        // Should be excluded - other user age outside current user's range
        createTestItinerary({
          id: "age-too-old",
          userInfo: { ...createTestItinerary().userInfo!, dob: "1970-01-01" } // Age 55
        }),
        // Should be included - passes all filters (bidirectional age filtering disabled)
        createTestItinerary({
          id: "passes-with-disabled-bidirectional-filter",
          startDate: "2025-11-01",
          endDate: "2025-11-07", // Overlaps with Nov 3-10
          startDay: new Date("2025-11-01").getTime(),
          endDay: new Date("2025-11-07").getTime(),
          lowerRange: 20,
          upperRange: 30, // Would exclude current user age 30 if bidirectional filtering was enabled
          userInfo: { ...createTestItinerary().userInfo!, dob: "1995-01-01" } // Age 30, within current user's 28-40 range
        }),
        // Should be included - passes all filters
        createTestItinerary({
          id: "valid-match",
          startDate: "2025-11-01",
          endDate: "2025-11-07", // Overlaps with Nov 3-10
          startDay: new Date("2025-11-01").getTime(),
          endDay: new Date("2025-11-07").getTime(),
          lowerRange: 25, 
          upperRange: 35, // Includes other user age 30
          userInfo: { ...createTestItinerary().userInfo!, dob: "1995-01-01" } // Age 30, within current user's 28-40 range
        })
      ];

      const result = applyClientSideFilters(itineraries, params);
      
      expect(result).toHaveLength(2); // Two should pass now that bidirectional age filtering is disabled
      expect(result.map(r => r.id).sort()).toEqual(["passes-with-disabled-bidirectional-filter", "valid-match"]);
    });

    test("should return empty array when no itineraries pass filters", () => {
      const currentUserItinerary = createCurrentUserItinerary();
      const params: SearchParams = {
        currentUserItinerary,
        currentUserId: "current-user-id"
      };

      const itineraries = [
        // All should be excluded for various reasons
        createTestItinerary({
          id: "own-itinerary",
          userInfo: { ...createTestItinerary().userInfo!, uid: "current-user-id" }
        }),
        createTestItinerary({
          id: "no-date-overlap",
          startDate: "2025-12-01",
          endDate: "2025-12-07",
          startDay: new Date("2025-12-01").getTime(),
          endDay: new Date("2025-12-07").getTime()
        })
      ];

      const result = applyClientSideFilters(itineraries, params);
      expect(result).toHaveLength(0);
    });

    test("should handle empty input array", () => {
      const currentUserItinerary = createCurrentUserItinerary();
      const params: SearchParams = {
        currentUserItinerary,
        currentUserId: "current-user-id"
      };

      const result = applyClientSideFilters([], params);
      expect(result).toHaveLength(0);
    });

    test("should handle null/undefined userInfo", () => {
      const currentUserItinerary = createCurrentUserItinerary();
      const params: SearchParams = {
        currentUserItinerary,
        currentUserId: "current-user-id"
      };

      const itinerariesWithNullUserInfo = [
        createTestItinerary({ 
          id: "null-userinfo",
          userInfo: null as any
        }),
        createTestItinerary({ 
          id: "undefined-userinfo",
          userInfo: undefined as any  
        }),
        createTestItinerary({ 
          id: "partial-userinfo",
          userInfo: { 
            uid: "other-user",
            username: "partialuser",
            email: "partial@test.com"
            // Missing dob, gender, status, etc. - but has uid so should pass userInfo check
          } as any 
        })
      ];

      const result = applyClientSideFilters(itinerariesWithNullUserInfo, params);
      
      // Should exclude null/undefined userInfo but include partial userInfo (has uid)
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("partial-userinfo");
    });

    test("should handle edge case: zero and negative age ranges", () => {
      const currentUserItinerary = createCurrentUserItinerary({
        lowerRange: 0,
        upperRange: 0 // Edge case: zero range
      });
      const params: SearchParams = {
        currentUserItinerary,
        currentUserId: "current-user-id"
      };

      const itineraries = [
        createTestItinerary({
          id: "zero-age-user",
          userInfo: {
            ...createTestItinerary().userInfo!,
            dob: "2025-01-01" // Age 0 (born this year)
          }
        })
      ];

      const result = applyClientSideFilters(itineraries, params);
      expect(result).toHaveLength(1); // Should include age 0 user
    });

    test("should handle very large age ranges", () => {
      const currentUserItinerary = createCurrentUserItinerary({
        lowerRange: 18,
        upperRange: 120 // Very wide range
      });
      const params: SearchParams = {
        currentUserItinerary,
        currentUserId: "current-user-id"
      };

      const itineraries = [
        createTestItinerary({
          id: "very-old-user",
          userInfo: {
            ...createTestItinerary().userInfo!,
            dob: "1900-01-01" // Age ~125
          }
        })
      ];

      const result = applyClientSideFilters(itineraries, params);
      expect(result).toHaveLength(0); // Should exclude age 125 (outside range)
    });

    test("should handle invalid DOB formats", () => {
      const currentUserItinerary = createCurrentUserItinerary();
      const params: SearchParams = {
        currentUserItinerary,
        currentUserId: "current-user-id"
      };

      const itineraries = [
        createTestItinerary({
          id: "invalid-dob-1",
          userInfo: {
            ...createTestItinerary().userInfo!,
            dob: "not-a-date"
          }
        }),
        createTestItinerary({
          id: "invalid-dob-2", 
          userInfo: {
            ...createTestItinerary().userInfo!,
            dob: "13/45/2000" // Invalid date format
          }
        }),
        createTestItinerary({
          id: "empty-dob",
          userInfo: {
            ...createTestItinerary().userInfo!,
            dob: ""
          }
        })
      ];

      // Should not crash and should skip age filtering for invalid DOBs
      const result = applyClientSideFilters(itineraries, params);
      expect(result).toHaveLength(3); // All should pass (age filtering skipped for invalid DOBs)
    });

    test("should handle missing startDate/endDate on current user", () => {
      const currentUserItinerary = createCurrentUserItinerary({
        startDate: undefined as any,
        endDate: undefined as any
      });
      const params: SearchParams = {
        currentUserItinerary,
        currentUserId: "current-user-id"
      };

      const itineraries = [createTestItinerary()];

      // Should not crash when current user has missing dates
      const result = applyClientSideFilters(itineraries, params);
      expect(result).toHaveLength(1); // Should include (date filtering may be skipped)
    });

    test("should handle exact boundary ages", () => {
      // Reset system time for this test
      jest.setSystemTime(new Date('2025-06-15T00:00:00Z')); // Mid-year
      
      const currentUserItinerary = createCurrentUserItinerary({
        lowerRange: 30,
        upperRange: 40
      });
      const params: SearchParams = {
        currentUserItinerary,
        currentUserId: "current-user-id"
      };

      const itineraries = [
        createTestItinerary({
          id: "exactly-30",
          userInfo: {
            ...createTestItinerary().userInfo!,
            dob: "1995-06-15" // Exactly 30 today
          }
        }),
        createTestItinerary({
          id: "exactly-40",
          userInfo: {
            ...createTestItinerary().userInfo!,
            dob: "1985-06-15" // Exactly 40 today
          }
        }),
        createTestItinerary({
          id: "just-under-30",
          userInfo: {
            ...createTestItinerary().userInfo!,
            dob: "1996-01-01" // Age 29 (clearly under 30)
          }
        }),
        createTestItinerary({
          id: "just-over-40",
          userInfo: {
            ...createTestItinerary().userInfo!,
            dob: "1984-01-01" // Age 41 (clearly over 40)
          }
        })
      ];

      const result = applyClientSideFilters(itineraries, params);
      
      // Should include exactly 30 and exactly 40 (boundary inclusive)
      // Should exclude just under 30 and just over 40  
      expect(result).toHaveLength(2);
      expect(result.map(r => r.id).sort()).toEqual(["exactly-30", "exactly-40"]);
    });

    test("should handle same-day date overlaps", () => {
      // Reset time to avoid conflicts with other tests
      jest.setSystemTime(new Date('2025-10-09T00:00:00Z'));
      
      const currentUserItinerary = createCurrentUserItinerary({
        startDate: "2025-11-05",
        endDate: "2025-11-05", // Same day trip
        startDay: new Date("2025-11-05").getTime(),
        endDay: new Date("2025-11-05").getTime()
      });
      const params: SearchParams = {
        currentUserItinerary,
        currentUserId: "current-user-id"
      };

      const itineraries = [
        createTestItinerary({
          id: "same-day-overlap",
          startDate: "2025-11-05",
          endDate: "2025-11-05",
          startDay: new Date("2025-11-05").getTime(),
          endDay: new Date("2025-11-05").getTime()
        })
      ];

      const result = applyClientSideFilters(itineraries, params);
      expect(result).toHaveLength(1); // Should include same day overlap
    });
  });
});