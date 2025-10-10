// Utility functions for managing example itinerary seen status

const EXAMPLE_SEEN_KEY = 'hasSeenExampleItinerary';

/**
 * Check if user has seen an example itinerary before
 */
export const hasUserSeenExample = (): boolean => {
  try {
    return localStorage.getItem(EXAMPLE_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * Mark that user has seen an example itinerary
 */
export const markExampleAsSeen = (): void => {
  try {
    localStorage.setItem(EXAMPLE_SEEN_KEY, 'true');
  } catch (error) {
    console.error('Failed to save example seen status:', error);
  }
};

/**
 * Reset the example seen status (for testing/debugging)
 */
export const resetExampleSeenStatus = (): void => {
  try {
    localStorage.removeItem(EXAMPLE_SEEN_KEY);
  } catch (error) {
    console.error('Failed to reset example seen status:', error);
  }
};

/**
 * Get the localStorage key used for tracking example seen status
 */
export const getExampleSeenKey = (): string => EXAMPLE_SEEN_KEY;