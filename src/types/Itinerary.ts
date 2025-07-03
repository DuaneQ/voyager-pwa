export interface Itinerary {
  id: string;
  destination: string;
  gender?: string;
  sexualOrientation?: string; 
  likes?: string[];
  startDate?: string;
  endDate?: string;
  startDay?: number;  
  endDay?: number;      
  description?: string;
  activities?: string[];
  lowerRange?: number; 
  upperRange?: number;
  status?: string;
  userInfo?: {
    username: string;
    gender: string;
    dob: string;
    uid: string;
    email: string;
    status: string;
    sexualOrientation: string; 
    blocked?: string[];
  };
}
