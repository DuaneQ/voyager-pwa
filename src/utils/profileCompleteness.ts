/**
 * Utility to check if a user profile is complete with all required fields
 * for creating itineraries and using the app
 */

export interface ProfileCompletenessResult {
  isComplete: boolean;
  missingFields: string[];
  message?: string;
}

/**
 * Check if user profile has all required fields for creating itineraries
 * Required fields: username, dob, gender, status, sexualOrientation
 */
export const checkProfileCompleteness = (
  userProfile: any
): ProfileCompletenessResult => {
  const missingFields: string[] = [];

  // Required fields for itinerary creation
  if (!userProfile?.username || userProfile.username.trim() === "") {
    missingFields.push("username");
  }

  if (!userProfile?.dob) {
    missingFields.push("date of birth");
  }

  if (!userProfile?.gender) {
    missingFields.push("gender");
  }

  if (!userProfile?.status) {
    missingFields.push("status");
  }

  if (!userProfile?.sexualOrientation) {
    missingFields.push("sexual orientation");
  }

  const isComplete = missingFields.length === 0;

  return {
    isComplete,
    missingFields,
    message: !isComplete
      ? `Please complete your profile by setting: ${missingFields.join(", ")}`
      : undefined,
  };
};
