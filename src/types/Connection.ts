import { Itinerary } from "./Itinerary";
import { Timestamp } from "firebase/firestore";

export interface Connection {
  id: string;
  users: string[];
  itineraryIds: string[];
  itineraries: Itinerary[];
  createdAt: Timestamp;
  unreadCounts: { [userId: string]: number };
  addedUsers?: Array<{ userId: string; addedBy: string }>;
}
