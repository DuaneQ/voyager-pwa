import { Itinerary } from "./Itinerary";

export interface Connection {
  id: string;
  users: string[];
  itineraryIds: string[];
  itineraries: Itinerary[];
  createdAt: string;
}