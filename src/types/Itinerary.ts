export interface Itinerary {
  id: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  startDay?: number;
  endDay?: number;
  description?: string;
  activities?: string[];
  lowerRange?: number; 
  upperRange?: number;
  userInfo?: {
    username: string;
    gender: string;
    dob: string;
    uid: string;
  };
}
