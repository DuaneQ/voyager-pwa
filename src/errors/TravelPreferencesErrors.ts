/**
 * Custom error types for Travel Preferences operations
 */

export enum TravelPreferencesErrorCode {
  // Authentication errors
  USER_NOT_AUTHENTICATED = 'USER_NOT_AUTHENTICATED',
  
  // Profile errors
  PROFILE_NOT_FOUND = 'PROFILE_NOT_FOUND',
  DUPLICATE_PROFILE_NAME = 'DUPLICATE_PROFILE_NAME',
  DEFAULT_PROFILE_DELETION = 'DEFAULT_PROFILE_DELETION',
  LAST_PROFILE_DELETION = 'LAST_PROFILE_DELETION',
  
  // Data validation errors
  INVALID_PROFILE_DATA = 'INVALID_PROFILE_DATA',
  INVALID_TRAVEL_STYLE = 'INVALID_TRAVEL_STYLE',
  INVALID_BUDGET_RANGE = 'INVALID_BUDGET_RANGE',
  INVALID_ACTIVITY_SCORES = 'INVALID_ACTIVITY_SCORES',
  
  // Network/Database errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  DATABASE_WRITE_ERROR = 'DATABASE_WRITE_ERROR',
  DATABASE_READ_ERROR = 'DATABASE_READ_ERROR',
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class TravelPreferencesError extends Error {
  public readonly code: TravelPreferencesErrorCode;
  public readonly userMessage: string;
  public readonly originalError?: Error;

  constructor(
    code: TravelPreferencesErrorCode,
    userMessage: string,
    originalError?: Error,
    developerMessage?: string
  ) {
    super(developerMessage || userMessage);
    this.name = 'TravelPreferencesError';
    this.code = code;
    this.userMessage = userMessage;
    this.originalError = originalError;
  }
}

/**
 * Factory functions to create specific error types with user-friendly messages
 */
export const TravelPreferencesErrors = {
  // Authentication errors
  userNotAuthenticated: () => new TravelPreferencesError(
    TravelPreferencesErrorCode.USER_NOT_AUTHENTICATED,
    "Please sign in to manage your travel preferences.",
    undefined,
    "User must be authenticated to perform this operation"
  ),

  // Profile errors
  profileNotFound: (profileId: string) => new TravelPreferencesError(
    TravelPreferencesErrorCode.PROFILE_NOT_FOUND,
    "The requested travel profile could not be found. It may have been deleted.",
    undefined,
    `Profile with ID '${profileId}' not found`
  ),

  duplicateProfileName: (name: string) => new TravelPreferencesError(
    TravelPreferencesErrorCode.DUPLICATE_PROFILE_NAME,
    `A profile named "${name}" already exists. Please choose a different name.`,
    undefined,
    `Duplicate profile name: ${name}`
  ),

  defaultProfileDeletion: () => new TravelPreferencesError(
    TravelPreferencesErrorCode.DEFAULT_PROFILE_DELETION,
    "Cannot delete your default profile. Please set another profile as default first.",
    undefined,
    "Attempt to delete default profile"
  ),

  lastProfileDeletion: () => new TravelPreferencesError(
    TravelPreferencesErrorCode.LAST_PROFILE_DELETION,
    "Cannot delete your only travel profile. You must have at least one profile.",
    undefined,
    "Attempt to delete the last remaining profile"
  ),

  // Data validation errors
  invalidProfileData: (field: string, reason: string) => new TravelPreferencesError(
    TravelPreferencesErrorCode.INVALID_PROFILE_DATA,
    `Invalid ${field}: ${reason}`,
    undefined,
    `Profile validation failed for field '${field}': ${reason}`
  ),

  invalidTravelStyle: (style: string) => new TravelPreferencesError(
    TravelPreferencesErrorCode.INVALID_TRAVEL_STYLE,
    "Please select a valid travel style from the available options.",
    undefined,
    `Invalid travel style: ${style}`
  ),

  invalidBudgetRange: (min: number, max: number) => new TravelPreferencesError(
    TravelPreferencesErrorCode.INVALID_BUDGET_RANGE,
    "Budget maximum must be greater than minimum. Please adjust your budget range.",
    undefined,
    `Invalid budget range: min=${min}, max=${max}`
  ),

  invalidActivityScores: (activity: string, score: number) => new TravelPreferencesError(
    TravelPreferencesErrorCode.INVALID_ACTIVITY_SCORES,
    "Activity preferences must be between 0 and 10.",
    undefined,
    `Invalid activity score for '${activity}': ${score}`
  ),

  // Network/Database errors
  networkError: (originalError: Error) => new TravelPreferencesError(
    TravelPreferencesErrorCode.NETWORK_ERROR,
    "Connection failed. Please check your internet connection and try again.",
    originalError,
    `Network error: ${originalError.message}`
  ),

  databaseWriteError: (operation: string, originalError: Error) => new TravelPreferencesError(
    TravelPreferencesErrorCode.DATABASE_WRITE_ERROR,
    "Failed to save your changes. Please try again.",
    originalError,
    `Database write error during ${operation}: ${originalError.message}`
  ),

  databaseReadError: (originalError: Error) => new TravelPreferencesError(
    TravelPreferencesErrorCode.DATABASE_READ_ERROR,
    "Failed to load your travel preferences. Please refresh the page and try again.",
    originalError,
    `Database read error: ${originalError.message}`
  ),

  documentNotFound: () => new TravelPreferencesError(
    TravelPreferencesErrorCode.DOCUMENT_NOT_FOUND,
    "Your profile data could not be found. This might be your first time using the app.",
    undefined,
    "User document not found in database"
  ),

  // General errors
  unknownError: (originalError?: Error) => new TravelPreferencesError(
    TravelPreferencesErrorCode.UNKNOWN_ERROR,
    "An unexpected error occurred. Please try again or contact support if the problem persists.",
    originalError,
    `Unknown error: ${originalError?.message || 'No additional details'}`
  )
};

/**
 * Utility function to convert generic errors to TravelPreferencesError
 */
export function wrapError(error: unknown, context: string): TravelPreferencesError {
  if (error instanceof TravelPreferencesError) {
    return error;
  }

  if (error instanceof Error) {
    // Try to categorize the error based on its message or type
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return TravelPreferencesErrors.networkError(error);
    }
    
    if (message.includes('permission') || message.includes('unauthorized')) {
      return TravelPreferencesErrors.userNotAuthenticated();
    }
    
    if (message.includes('not found') || message.includes('does not exist')) {
      return TravelPreferencesErrors.documentNotFound();
    }
    
    // Default to database error for Firebase-related operations
    if (context.includes('save') || context.includes('update') || context.includes('create')) {
      return TravelPreferencesErrors.databaseWriteError(context, error);
    }
    
    if (context.includes('load') || context.includes('read') || context.includes('get')) {
      return TravelPreferencesErrors.databaseReadError(error);
    }
    
    return TravelPreferencesErrors.unknownError(error);
  }

  // Handle non-Error objects
  return TravelPreferencesErrors.unknownError(
    new Error(typeof error === 'string' ? error : 'Unknown error occurred')
  );
}
