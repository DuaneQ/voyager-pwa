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

  console.log('🧹 FILTER DEBUG: Starting client-side filtering');
  console.log('🧹 FILTER DEBUG: Current user ID:', currentUserId);
  console.log('🧹 FILTER DEBUG: Input results to filter:', results.map(r => ({ 
    id: r.id, 
    userUid: r.userInfo?.uid, 
    username: r.userInfo?.username 
  })));
  console.log('🧹 FILTER DEBUG: User date range:', {
    startDate: currentUserItinerary.startDate,
    endDate: currentUserItinerary.endDate,
    startDay: userStartDay,
    endDay: userEndDay
  });
  console.log('🧹 FILTER DEBUG: Viewed itineraries:', viewedItineraries);

  const filteredResults = results.filter((itinerary) => {
    console.log(`🧹 FILTER DEBUG: Checking itinerary ${itinerary.id} (${itinerary.userInfo?.username || 'No username'})`);
    
    // 1. Exclude current user's itineraries (must be done client-side due to Firestore limitations)
    // Also exclude itineraries with missing/invalid userInfo
    console.log(`🧹 FILTER DEBUG: User ID comparison for ${itinerary.id}:`, {
      itineraryUserId: itinerary.userInfo?.uid,
      currentUserId: currentUserId,
      areEqual: itinerary.userInfo?.uid === currentUserId,
      itineraryUserIdType: typeof itinerary.userInfo?.uid,
      currentUserIdType: typeof currentUserId,
      hasUserInfo: !!itinerary.userInfo
    });
    
    // Exclude if no userInfo at all
    if (!itinerary.userInfo) {
      console.log(`🧹 FILTER DEBUG: ❌ Excluded ${itinerary.id} - missing userInfo`);
      return false;
    }
    
    // Exclude if no uid in userInfo
    if (!itinerary.userInfo.uid) {
      console.log(`🧹 FILTER DEBUG: ❌ Excluded ${itinerary.id} - missing uid in userInfo`);
      return false;
    }
    
    if (itinerary.userInfo.uid === currentUserId) {
      console.log(`🧹 FILTER DEBUG: ❌ Excluded ${itinerary.id} - same user (${itinerary.userInfo.uid} === ${currentUserId})`);
      return false;
    }

    // 2. Exclude already viewed itineraries
    if (viewedItineraries.includes(itinerary.id)) {
      console.log(`🧹 FILTER DEBUG: ❌ Excluded ${itinerary.id} - already viewed`);
      return false;
    }

    // 3. Check precise date overlap (skip if current user has invalid dates)
    if (itinerary.startDay && itinerary.endDay && userStartDay !== null && userEndDay !== null) {
      const overlaps = datesOverlap(userStartDay, userEndDay, itinerary.startDay, itinerary.endDay);
      console.log(`🧹 FILTER DEBUG: Date overlap check for ${itinerary.id}:`, {
        itineraryStart: new Date(itinerary.startDay).toISOString(),
        itineraryEnd: new Date(itinerary.endDay).toISOString(),
        userStart: new Date(userStartDay).toISOString(),
        userEnd: new Date(userEndDay).toISOString(),
        overlaps
      });
      if (!overlaps) {
        console.log(`🧹 FILTER DEBUG: ❌ Excluded ${itinerary.id} - no date overlap`);
        return false;
      }
    } else if (userStartDay === null || userEndDay === null) {
      console.log(`🧹 FILTER DEBUG: ⚠️ Skipping date overlap check for ${itinerary.id} - current user has invalid dates`);
    }

    // 4. Check age range compatibility
    if (itinerary.userInfo?.dob && currentUserItinerary.lowerRange !== undefined && currentUserItinerary.upperRange !== undefined) {
      const otherUserAge = calculateAge(itinerary.userInfo.dob);
      
      // Skip age filtering if DOB is invalid
      if (otherUserAge === null) {
        console.log(`🧹 FILTER DEBUG: ⚠️ Skipping age check for ${itinerary.id} - invalid DOB: ${itinerary.userInfo.dob}`);
      } else {
        const ageInRange = otherUserAge >= currentUserItinerary.lowerRange && otherUserAge <= currentUserItinerary.upperRange;
        
        console.log(`🧹 FILTER DEBUG: Other user age check for ${itinerary.id}:`, {
          otherUserDob: itinerary.userInfo.dob,
          otherUserAge,
          currentUserAgeRange: `${currentUserItinerary.lowerRange}-${currentUserItinerary.upperRange}`,
          ageInRange
        });
        
        if (!ageInRange) {
          console.log(`🧹 FILTER DEBUG: ❌ Excluded ${itinerary.id} - other user age ${otherUserAge} not in range ${currentUserItinerary.lowerRange}-${currentUserItinerary.upperRange}`);
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
    
    console.log(`🧹 FILTER DEBUG: ✅ Included ${itinerary.id} - passed all filters`);
    return true;
  });
  
  console.log(`🧹 FILTER DEBUG: Final results: ${filteredResults.length} passed filters out of ${results.length} input`);
  return filteredResults;
};