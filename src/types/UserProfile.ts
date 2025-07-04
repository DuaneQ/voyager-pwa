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
  dailyUsage?: {
    date: string; // YYYY-MM-DD format
    viewCount: number;
  };
}