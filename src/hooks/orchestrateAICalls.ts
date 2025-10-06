export async function orchestrateAICalls(params: {
  searchFlights: any;
  searchAccommodations: any;
  searchActivities: any;
  generateItineraryWithAI: any;
  request: any;
  includeFlights: boolean;
  preferredAirlineCodes: string[];
  accommodationParams: any;
  basePayload: any;
  generationId: string;
  userMustInclude: string[];
  userMustAvoid: string[];
  specialRequestsHint: string | null;
  reqTripType: string | null;
  transportType: string | null;
}) {
  const {
    searchFlights,
    searchAccommodations,
    searchActivities,
    generateItineraryWithAI,
    request,
    includeFlights,
    preferredAirlineCodes,
    accommodationParams,
    basePayload,
    generationId,
    userMustInclude,
    userMustAvoid,
    specialRequestsHint,
    reqTripType,
    transportType
  } = params;

  let flightCall: Promise<any> | null = null;
  if (includeFlights) {
    try {
      flightCall = searchFlights({
        departureAirportCode: request.departureAirportCode,
        destinationAirportCode: request.destinationAirportCode,
        departureDate: request.startDate,
        returnDate: request.endDate,
        cabinClass: request.flightPreferences?.class?.toUpperCase() || 'ECONOMY',
        stopPreference: request.flightPreferences?.stopPreference === 'non-stop' ? 'NONSTOP' :
          request.flightPreferences?.stopPreference === 'one-stop' ? 'ONE_OR_FEWER' : 'ANY',
        preferredAirlines: preferredAirlineCodes
      });
    } catch (e) {
      flightCall = null;
    }
  }

  const accommodationsCall = searchAccommodations({
    destination: request.destination,
    destinationLatLng: (request as any).destinationLatLng || undefined,
    startDate: request.startDate,
    endDate: request.endDate,
    accommodationType: (request as any).accommodationType || 'any',
    maxResults: 8,
    ...accommodationParams
  });

  const activitiesCall = searchActivities(basePayload);

  let aiCall: Promise<any> | null = null;
  if (!includeFlights) {
    try {
      const originCandidate = (request as any).departure || (request as any).origin || (request as any).departureAirportCode || null;
      const destinationAirportCodeCandidate = (request as any).destinationAirportCode || null;
      aiCall = generateItineraryWithAI({
        destination: request.destination,
        startDate: request.startDate,
        endDate: request.endDate,
        origin: originCandidate,
        originAirportCode: (request as any).departureAirportCode || null,
        destinationAirportCode: destinationAirportCodeCandidate,
        transportType: transportType || null,
        preferenceProfile: (request as any)?.preferenceProfile || null,
        generationId,
        mustInclude: userMustInclude,
        mustAvoid: userMustAvoid,
        specialRequests: specialRequestsHint,
        tripType: reqTripType
      });
    } catch (e) {
      aiCall = null;
    }
  }

  // Build a labeled list of promises so the caller can map results back to names
  const promiseList: Promise<any>[] = [];
  const promiseKeys: string[] = [];
  if (flightCall) { promiseList.push(flightCall); promiseKeys.push('flight'); }
  promiseList.push(accommodationsCall); promiseKeys.push('accommodations');
  promiseList.push(activitiesCall); promiseKeys.push('activities');
  if (aiCall) { promiseList.push(aiCall); promiseKeys.push('ai'); }

  const settledAll = await Promise.allSettled(promiseList);

  // Map settled results back to named slots
  let flightSettled: any = null, accSettled: any = null, activitiesSettled: any = null, aiSettled: any = null;
  settledAll.forEach((res, idx) => {
    const key = promiseKeys[idx];
    if (key === 'flight') flightSettled = res;
    else if (key === 'accommodations') accSettled = res;
    else if (key === 'activities') activitiesSettled = res;
    else if (key === 'ai') aiSettled = res;
  });

  // Return the settled results so the caller can handle them as before
  return { flightSettled, accSettled, activitiesSettled, aiSettled };
}

export default orchestrateAICalls;
