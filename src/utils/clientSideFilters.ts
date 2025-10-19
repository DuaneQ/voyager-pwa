// Client-side filtering utilities
import { Itinerary } from "../types/Itinerary";

// Helper function to calculate age from date of birth
const calculateAge = (dob: string): number | null => {
  if (!dob || typeof dob !== 'string' || dob.trim() === '') {
    return null;
  }
  
  const birthDate = new Date(dob);
  
  // Check if date is valid
  if (isNaN(birthDate.getTime())) {
    return null;
  }
  
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  // Return null for impossible ages
  if (age < 0 || age > 150) {
    return null;
  }
  
  return age;
};

// Helper function to check date overlap
const datesOverlap = (userStart: number, userEnd: number, otherStart: number, otherEnd: number): boolean => {
  return userStart <= otherEnd && userEnd >= otherStart;
};

// Helper function to get viewed itineraries from localStorage
const getViewedItineraries = (): string[] => {
  try {
    const viewed = localStorage.getItem('VIEWED_ITINERARIES');
    return viewed ? JSON.parse(viewed) : [];
  } catch (error) {
    console.error("Error reading viewed itineraries:", error);
    return [];
  }
};

export interface SearchParams {
  currentUserItinerary: Itinerary;
  currentUserId: string;
}

// Apply client-side filters - Main export for testing
export const applyClientSideFilters = (results: Itinerary[], params: SearchParams): Itinerary[] => {
  const { currentUserItinerary, currentUserId } = params;
  
  // Handle invalid/missing dates in current user itinerary
  let userStartDay: number | null = null;
  let userEndDay: number | null = null;
  
  if (currentUserItinerary.startDate) {
    const startTime = new Date(currentUserItinerary.startDate).getTime();
    userStartDay = isNaN(startTime) ? null : startTime;
  }
  
  if (currentUserItinerary.endDate) {
    const endTime = new Date(currentUserItinerary.endDate).getTime();
    userEndDay = isNaN(endTime) ? null : endTime;
  }
  
  const viewedItineraries = getViewedItineraries();

  const filteredResults = results.filter((itinerary) => {
    // Exclude if no userInfo at all
    if (!itinerary.userInfo) {
      return false;
    }
    
    // Exclude if no uid in userInfo
    if (!itinerary.userInfo.uid) {
      return false;
    }
    
    if (itinerary.userInfo.uid === currentUserId) {
      return false;
    }

    // 2. Exclude already viewed itineraries
    if (viewedItineraries.includes(itinerary.id)) {
      return false;
    }

    // 3. Check precise date overlap (skip if current user has invalid dates)
    if (itinerary.startDay && itinerary.endDay && userStartDay !== null && userEndDay !== null) {
      const overlaps = datesOverlap(userStartDay, userEndDay, itinerary.startDay, itinerary.endDay);
      if (!overlaps) {
        return false;
      }
    } else if (userStartDay === null || userEndDay === null) {
      console.log(`🧹 FILTER DEBUG: ⚠️ Skipping date overlap check - current user has invalid dates`);
    }

    // 4. Check age range compatibility
    if (itinerary.userInfo?.dob && currentUserItinerary.lowerRange !== undefined && currentUserItinerary.upperRange !== undefined) {
      const otherUserAge = calculateAge(itinerary.userInfo.dob);
      
      // Skip age filtering if DOB is invalid
      if (otherUserAge === null) {
        console.log(`🧹 FILTER DEBUG: ⚠️ Skipping age check for `);
      } else {
        const ageInRange = otherUserAge >= currentUserItinerary.lowerRange && otherUserAge <= currentUserItinerary.upperRange;
        if (!ageInRange) {
          return false;
        }
      }
    }

    // 5. Check if current user's age falls within other user's range
    // TODO:  Will enable as the app matures.  Right now we don't need to filter out so much.
    // if (currentUserItinerary.userInfo?.dob && itinerary.lowerRange && itinerary.upperRange) {
    //   const currentUserAge = calculateAge(currentUserItinerary.userInfo.dob);
    //   const currentUserInRange = currentUserAge >= itinerary.lowerRange && currentUserAge <= itinerary.upperRange;
      
    //   console.log(`🧹 FILTER DEBUG: Current user age check for ${itinerary.id}:`, {
    //     currentUserDob: currentUserItinerary.userInfo.dob,
    //     currentUserAge,
    //     otherUserAgeRange: `${itinerary.lowerRange}-${itinerary.upperRange}`,
    //     currentUserInRange
    //   });
      
    //   if (!currentUserInRange) {
    //     console.log(`🧹 FILTER DEBUG: ❌ Excluded ${itinerary.id} - current user age ${currentUserAge} not in range ${itinerary.lowerRange}-${itinerary.upperRange}`);
    //     return false;
    //   }
    // }
    
    return true;
  });
  
  return filteredResults;
};