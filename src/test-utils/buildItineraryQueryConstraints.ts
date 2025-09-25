/* istanbul ignore file */

import { where, orderBy, limit, QueryConstraint } from "firebase/firestore";
import { Itinerary } from "../types/Itinerary";

type QueryBuilderParams = {
  currentUserItinerary: Itinerary;
  userStartDay: number;
};

export function buildItineraryQueryConstraints({ currentUserItinerary, userStartDay }: QueryBuilderParams): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];
  // Always include destination (even if undefined)
  constraints.push(where("destination", "==", currentUserItinerary.destination));

  // Gender filter
  if (
    typeof currentUserItinerary.gender === "string" &&
    currentUserItinerary.gender !== "No Preference" &&
    currentUserItinerary.gender !== ""
  ) {
    constraints.push(where("userInfo.gender", "==", currentUserItinerary.gender));
  }

  // Status filter (from userInfo)
  if (
    currentUserItinerary.userInfo &&
    typeof currentUserItinerary.userInfo.status === "string" &&
    currentUserItinerary.userInfo.status !== "No Preference" &&
    currentUserItinerary.userInfo.status !== ""
  ) {
    constraints.push(where("userInfo.status", "==", currentUserItinerary.userInfo.status));
  }

  // Sexual orientation filter
  if (
    typeof currentUserItinerary.sexualOrientation === "string" &&
    currentUserItinerary.sexualOrientation !== "No Preference" &&
    currentUserItinerary.sexualOrientation !== ""
  ) {
    constraints.push(where("userInfo.sexualOrientation", "==", currentUserItinerary.sexualOrientation));
  }

  // Always include endDay >= userStartDay
  constraints.push(where("endDay", ">=", userStartDay));
  // Always order by endDay
  constraints.push(orderBy("endDay"));
  // Always limit
  constraints.push(limit(20));
  return constraints;
}
