import { UserTravelPreferences } from './TravelPreferences';

export interface UserProfile {
  username?: string;
  email?: string;
  uid?: string;
  bio?: string;
  dob?: string;
  gender?: string;
  sexualOrientation?: string;
  status?: string;
  edu?: string;
  drinking?: string;
  smoking?: string;
  blocked?: string[];
  subscriptionType?: 'free' | 'premium';
  subscriptionStartDate?: string;
  subscriptionEndDate?: string; 
  subscriptionCancelled?: boolean;
  stripeCustomerId?: string;
  dailyUsage?: {
    date: string; 
    viewCount: number;
  };
  /**
   * User photos, organized by slot. 'profile' is the main photo, 'slot1'-'slot4' are additional slots.
   * Each value is a URL string or undefined if not set.
   */
  photos?: {
    profile?: string;
    slot1?: string;
    slot2?: string;
    slot3?: string;
    slot4?: string;
    [key: string]: string | undefined;
  };
  /**
   * Travel preferences for AI itinerary generation and personalization
   */
  travelPreferences?: UserTravelPreferences;
  /**
   * Additional profile fields can be added here later
   */
}