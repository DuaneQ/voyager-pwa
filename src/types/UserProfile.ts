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
}