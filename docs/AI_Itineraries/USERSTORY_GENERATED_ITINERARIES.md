# User Story: Flight Search Integration for AI Itineraries

## Title
Search Flights (Round-Trip) using user preferences with Stops & Airline filters

## Description
As a traveler using the AI Itinerary Generator  
I want the system to retrieve flight options from a flight API based on my preferences (airports, dates, cabin, preferred airlines, stops)  
So that I can review relevant flight options before finalizing my itinerary.

## Implementation Status: ✅ **COMPLETED**
- **Provider**: Amadeus Self-Service Flight Offers Search (/v2/shopping/flight-offers) 
- **Integration**: Part of `generateItineraryWithAI` function
- **Current Implementation**: Parallel processing with 45-second timeout
- **Fallback Strategy**: Mock flight data on API failures

## Scope (v1 - Implemented)

- **Provider**: Amadeus Flight API with OAuth token management
- **Call Site**: Integrated into AI generation pipeline (not standalone hook)
- **Trip Type**: Round-trip only (outbound + inbound itinerary)
- **Passengers**: 1 adult
- **Currency**: USD
- **Max Results**: 10 flight options
- **Pagination**: None (single request)
- **Booking**: Read-only search (no booking functionality)
- **Caching**: 5-minute cache implemented for cost optimization

Input Contract (to FlightService)
type FlightSearchParams = {
  departureAirportCode: string;   // IATA (e.g., ATL) - required
  destinationAirportCode: string; // IATA (e.g., LAX) - required
  departureDate: string;          // YYYY-MM-DD - required
  returnDate: string;             // YYYY-MM-DD - required
  cabinClass?: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
  preferredAirlines?: string[];   // IATA 2-letter, e.g., ["DL","AA","UA"]
  // Stops filter:
  // 'NONSTOP' => 0 stops, 'ONE_OR_FEWER' => <= 1 stop, 'ANY' => no filter
  stops?: 'NONSTOP' | 'ONE_OR_FEWER' | 'ANY';
};


Mapping to Amadeus request (query/body):

Required: originLocationCode, destinationLocationCode, departureDate, returnDate, adults=1, currencyCode=USD, max=10. 
Amadeus IT Group SA

Optional:

travelClass ← cabinClass (ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST). 
Amadeus IT Group SA

includedAirlineCodes (comma-separated from preferredAirlines). 
Amadeus IT Group SA

Stops filter:

If stops === 'NONSTOP' → send nonStop=true (Amadeus supports direct vs non-direct).

If stops === 'ONE_OR_FEWER' → do not send nonStop; post-filter results where each itinerary’s segments count ≤ 2 (≤1 stop) after parsing the response.

If stops === 'ANY' → no stops param; no post-filter.
(Amadeus exposes nonStop for direct only; finer stop limits must be handled client-side by counting itineraries[].segments.) 
Stack Overflow

Output Contract (from FlightService)

Return an array of simplified flights derived from Amadeus data[] items:

type Flight = {
  id: string;
  airline: string;          // marketing carrier name if available; otherwise code
  airlineCode: string;      // e.g., "DL"
  flightNumber: string;     // e.g., "DL1234" (first segment’s marketing flight)
  route: string;            // "ATL → LAX" (outbound summary)
  departure: { date: string; time: string; iata: string };
  arrival:   { date: string; time: string; iata: string };
  duration: string;         // total itinerary duration, e.g., "4h 55m"
  stops: number;            // number of connections on outbound (segments - 1)
  cabin: 'economy'|'premium'|'business'|'first';
  price: { amount: number; currency: 'USD' };
  // Optional mirror for inbound leg (round-trip details)
  return?: {
    route: string;
    departure: { date: string; time: string; iata: string };
    arrival:   { date: string; time: string; iata: string };
    duration: string;
    stops: number;
  };
};


Mapping notes from Amadeus response:

Outbound leg: itineraries[0].segments[*] (use first and last segment for times/airports; count segments for stops; use itineraries[0].duration).

Inbound leg: itineraries[1] (same logic).

Marketing carrier + number: itineraries[0].segments[0].carrierCode + number.

Price: price.total + price.currency.

Cabin: use travelerPricings[0].fareDetailsBySegment[0].cabin when present; fall back to request travelClass.
Docs confirm these fields on Flight Offers Search. 
Amadeus IT Group SA
Postman

Hook Behavior (useFlightSearch)

Single responsibility: accept FlightSearchParams, manage loading/error/data, call FlightService.searchFlights(params).

Returns { flights: Flight[], loading: boolean, error?: { code: string; message: string } }.

No business logic besides invoking the service and optional client-side stop filtering for ONE_OR_FEWER.

Error Handling (explicit)

Return structured, human-readable errors; never throw uncaught:

MISSING_FIELDS: if any required param missing.

INVALID_DATE_RANGE: return date is before departure or malformed.

AUTH_ERROR: OAuth/token failure from Amadeus.

RATE_LIMITED: HTTP 429 with retry-after (optional v1: show message only).

NO_RESULTS: not an error; simply return [].

PROVIDER_ERROR: any non-2xx from Amadeus with provider message.

NETWORK_ERROR: fetch failed or timed out (default timeout 10s).

Acceptance Criteria

Given valid params, one request is sent to Amadeus and ≤10 flight offers are returned. 
Amadeus IT Group SA

If stops='NONSTOP', only direct flights are returned (uses nonStop=true). 
Stack Overflow

If stops='ONE_OR_FEWER', results include only itineraries where segments per leg ≤ 2 (client post-filter). 
Stack Overflow

If preferredAirlines provided, request includes includedAirlineCodes with comma-separated IATA codes. 
Amadeus IT Group SA

If cabinClass provided, request sets travelClass accordingly (ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST). 
Amadeus IT Group SA

Service maps the Amadeus payload to the Output Contract fields (outbound + inbound). 
Amadeus IT Group SA
Postman

All error cases return structured errors; UI never crashes and can display error.message.

Missing airport codes or dates prevents the call and returns MISSING_FIELDS.

Non-Goals / v2 ideas (explicitly excluded in v1)

Multi-city, one-way, or open-jaw itineraries.

Multiple passengers or PTCs.

Sorting, advanced ranking, or price-history logic.

Pricing confirmation / fare rules (/pricing), seat availability, ancillaries. (Can be added later.) 
Amadeus IT Group SA

Notes for Copilot (keep it simple)

One file for FlightService with one exported function searchFlights(params).

One hook useFlightSearch(params) that only calls the service.

Use fetch and a tiny mapResponse() helper; no classes, no extra abstractions.

Keep types small and colocated; export Flight & FlightSearchParams.

If later we add another provider, we’ll keep the same Flight interface and add a second implementation behind the same function name (OCP/LSP friendly).