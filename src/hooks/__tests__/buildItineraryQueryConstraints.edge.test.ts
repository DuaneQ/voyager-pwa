import { buildItineraryQueryConstraints } from "../../test-utils/buildItineraryQueryConstraints";
import { where, orderBy, limit, QueryConstraint } from "firebase/firestore";
import { Itinerary } from "../../types/Itinerary";

describe("buildItineraryQueryConstraints edge cases", () => {
  const userStartDay = 1720000000000;

  it("should handle missing userInfo object", () => {
    const itinerary = {
      destination: "Berlin",
      gender: "Male",
      sexualOrientation: "No Preference",
      // userInfo is undefined
    } as Itinerary;
    const constraints = buildItineraryQueryConstraints({ currentUserItinerary: itinerary, userStartDay });
    expect(constraints.some(c => c._field && c._field.segments && c._field.segments.join('.') === "userInfo.status" && c._op === "=="))
      .toBe(false);
  });

  it("should handle missing gender and sexualOrientation", () => {
    const itinerary = {
      destination: "Tokyo",
      // gender and sexualOrientation are undefined
      userInfo: { status: "No Preference" },
    } as Itinerary;
    const constraints = buildItineraryQueryConstraints({ currentUserItinerary: itinerary, userStartDay });
    expect(constraints.some(c => c._field && c._field.segments && c._field.segments.join('.') === "userInfo.gender" && c._op === "=="))
      .toBe(false);
    expect(constraints.some(c => c._field && c._field.segments && c._field.segments.join('.') === "userInfo.sexualOrientation" && c._op === "=="))
      .toBe(false);
  });

  it("should handle missing destination (should still build query)", () => {
    const itinerary = {
      // destination is undefined
      gender: "Female",
      sexualOrientation: "Straight",
      userInfo: { status: "Single" },
    } as Itinerary;
    const constraints = buildItineraryQueryConstraints({ currentUserItinerary: itinerary, userStartDay });
    expect(constraints.some(c => c._field && c._field.segments && c._field.segments.join('.') === "destination" && c._op === "=="))
      .toBe(true);
  });
});
