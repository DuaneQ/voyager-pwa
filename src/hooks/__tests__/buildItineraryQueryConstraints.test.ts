import { buildItineraryQueryConstraints } from "../../test-utils/buildItineraryQueryConstraints";
import { where, orderBy, limit, QueryConstraint } from "firebase/firestore";
import { Itinerary } from "../../types/Itinerary";

describe("buildItineraryQueryConstraints", () => {
  /*
    These tests verify that buildItineraryQueryConstraints generates the correct Firestore query constraints array
    based on the input Itinerary. We check:
    - The presence and structure of required constraints (destination, endDay, orderBy, limit)
    - That gender, status, and sexualOrientation filters are only included if not 'No Preference'
    - That the internal structure of the QueryConstraint objects matches Firestore's actual implementation
    Console logs are added to show the structure of the generated constraints for each test.
  */
  const baseItinerary: Partial<Itinerary> = {
    destination: "Paris",
    gender: "No Preference",
    sexualOrientation: "No Preference",
    userInfo: { status: "No Preference" },
  };
  const userStartDay = 1720000000000;

  it("should always include destination, endDay, orderBy, and limit", () => {
    const itinerary = { ...baseItinerary, destination: "London" } as Itinerary;
    const constraints = buildItineraryQueryConstraints({ currentUserItinerary: itinerary, userStartDay });
    // Log the structure of the generated constraints
    console.log("[TEST] Query constraints for destination only:", JSON.stringify(constraints, null, 2));
    /*
      We expect:
      - a 'where' constraint for destination == 'London'
      - a 'where' constraint for endDay >= userStartDay
      - an orderBy on endDay
      - a limit(20)
    */
    expect(constraints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ _field: expect.objectContaining({ segments: ["destination"] }), _op: "==", _value: "London" }),
        expect.objectContaining({ _field: expect.objectContaining({ segments: ["endDay"] }), _op: ">=", _value: userStartDay }),
        expect.objectContaining({ _field: expect.objectContaining({ segments: ["endDay"] }) }),
        expect.objectContaining({ _limit: 20 }),
      ])
    );
  });

  it("should add gender filter if not 'No Preference'", () => {
    const itinerary = { ...baseItinerary, gender: "Female" } as Itinerary;
    const constraints = buildItineraryQueryConstraints({ currentUserItinerary: itinerary, userStartDay });
    console.log("[TEST] Query constraints with gender filter:", JSON.stringify(constraints, null, 2));
    /*
      We expect a 'where' constraint for userInfo.gender == 'Female' in addition to the required constraints.
    */
    expect(constraints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ _field: expect.objectContaining({ segments: ["userInfo", "gender"] }), _op: "==", _value: "Female" })
      ])
    );
  });

  it("should not add gender filter if 'No Preference'", () => {
    const itinerary = { ...baseItinerary, gender: "No Preference" } as Itinerary;
    const constraints = buildItineraryQueryConstraints({ currentUserItinerary: itinerary, userStartDay });
    console.log("[TEST] Query constraints with gender 'No Preference':", JSON.stringify(constraints, null, 2));
    /*
      We expect NO 'where' constraint for userInfo.gender.
    */
    expect(constraints.some(c => c._field && c._field.segments && c._field.segments.join('.') === "userInfo.gender" && c._op === "=="))
      .toBe(false);
  });

  it("should add status filter if not 'No Preference'", () => {
    const itinerary = { ...baseItinerary, userInfo: { status: "Single" } } as Itinerary;
    const constraints = buildItineraryQueryConstraints({ currentUserItinerary: itinerary, userStartDay });
    console.log("[TEST] Query constraints with status filter:", JSON.stringify(constraints, null, 2));
    /*
      We expect a 'where' constraint for userInfo.status == 'Single'.
    */
    expect(constraints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ _field: expect.objectContaining({ segments: ["userInfo", "status"] }), _op: "==", _value: "Single" })
      ])
    );
  });

  it("should add sexualOrientation filter if not 'No Preference'", () => {
    const itinerary = { ...baseItinerary, sexualOrientation: "LGBTQ+" } as Itinerary;
    const constraints = buildItineraryQueryConstraints({ currentUserItinerary: itinerary, userStartDay });
    console.log("[TEST] Query constraints with sexualOrientation filter:", JSON.stringify(constraints, null, 2));
    /*
      We expect a 'where' constraint for userInfo.sexualOrientation == 'LGBTQ+'.
    */
    expect(constraints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ _field: expect.objectContaining({ segments: ["userInfo", "sexualOrientation"] }), _op: "==", _value: "LGBTQ+" })
      ])
    );
  });

  it("should handle all filters at once", () => {
    const itinerary = {
      destination: "Rome",
      gender: "Male",
      sexualOrientation: "Straight",
      userInfo: { status: "Single" },
    } as Itinerary;
    const constraints = buildItineraryQueryConstraints({ currentUserItinerary: itinerary, userStartDay });
    console.log("[TEST] Query constraints with all filters:", JSON.stringify(constraints, null, 2));
    /*
      We expect all filters to be present: destination, gender, status, sexualOrientation, endDay, orderBy, limit.
    */
    expect(constraints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ _field: expect.objectContaining({ segments: ["destination"] }), _op: "==", _value: "Rome" }),
        expect.objectContaining({ _field: expect.objectContaining({ segments: ["userInfo", "gender"] }), _op: "==", _value: "Male" }),
        expect.objectContaining({ _field: expect.objectContaining({ segments: ["userInfo", "status"] }), _op: "==", _value: "Single" }),
        expect.objectContaining({ _field: expect.objectContaining({ segments: ["userInfo", "sexualOrientation"] }), _op: "==", _value: "Straight" }),
        expect.objectContaining({ _field: expect.objectContaining({ segments: ["endDay"] }), _op: ">=", _value: userStartDay }),
        expect.objectContaining({ _field: expect.objectContaining({ segments: ["endDay"] }) }),
        expect.objectContaining({ _limit: 20 }),
      ])
    );
  });
});
