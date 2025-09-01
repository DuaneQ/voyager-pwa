import * as functions from 'firebase-functions/v1';

/**
 * Simple flight search cloud function
 * - Receives JSON body with flight preferences
 * - Calls Amadeus Flight Offers API (test or production based on env)
 * - Maps results to a compact Flight shape
 * - Console.logs request and mapped results for verification
 *
 * Environment variables expected:
 * - AMADEUS_CLIENT_ID
 * - AMADEUS_CLIENT_SECRET
 * - AMADEUS_ENV = 'test' | 'production' (optional, defaults to 'test')
 */

// Use global fetch available in Node 18+ runtime used by Functions
const fetch = globalThis.fetch as typeof globalThis.fetch;

type StopsFilter = 'NONSTOP' | 'ONE_OR_FEWER' | 'ANY';

interface FlightSearchParams {
  departureAirportCode: string;
  destinationAirportCode: string;
  departureDate: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD
  cabinClass?: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
  preferredAirlines?: string[]; // ['DL','AA']
  stops?: StopsFilter;
  maxResults?: number;
}

interface Flight {
  id: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  route: string;
  departure: { date: string; time: string; iata: string };
  arrival: { date: string; time: string; iata: string };
  duration: string;
  stops: number;
  cabin: 'economy' | 'premium' | 'business' | 'first';
  price: { amount: number; currency: string };
  return?: {
    airline?: string;
    flightNumber?: string;
    route: string;
    departure: { date: string; time: string; iata: string };
    arrival: { date: string; time: string; iata: string };
    duration: string;
    stops: number;
  };
}

// SerpApi configuration (embedded key per project constraint). Replace with your SerpApi key.
const SERPAPI_KEY = '';
const SERPAPI_BASE = 'https://serpapi.com/search.json';

// Helper: format minutes to Hh Mm string
function formatDurationMinutes(mins: number | string | undefined): string {
  if (!mins && mins !== 0) return '';
  const m = typeof mins === 'string' ? parseInt(mins, 10) : Number(mins || 0);
  if (isNaN(m)) return String(mins);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h ? `${h}h ${mm}m` : `${mm}m`;
}

function mapItineraryToFlight(item: any): Flight | null {
  try {
    const id = item.id || '';
    const price = (item.price && parseFloat(item.price.total)) || 0;
    const currency = item.price?.currency || 'USD';

    const outbound = item.itineraries && item.itineraries[0];
    const inbound = item.itineraries && item.itineraries[1];
    if (!outbound) return null;

    const outSegments = outbound.segments || [];
    const firstOut = outSegments[0];
    const lastOut = outSegments[outSegments.length - 1];

    const airlineCode = firstOut?.carrierCode || firstOut?.carrier || '';
    const flightNum = (firstOut?.number || firstOut?.flightNumber || '').toString();
    const flightNumber = `${airlineCode}${flightNum}`;

    const departureDateTime = firstOut?.departure?.at || firstOut?.departure?.at || firstOut?.departure?.time || '';
    const arrivalDateTime = lastOut?.arrival?.at || lastOut?.arrival?.time || '';

    const [depDate, depTime] = (departureDateTime || '').split('T');
    const [arrDate, arrTime] = (arrivalDateTime || '').split('T');

    const flight: Flight = {
      id,
      airline: airlineCode,
      airlineCode,
      flightNumber,
      route: `${firstOut?.departure?.iataCode || firstOut?.departure?.airportCode || firstOut?.departure?.iata || firstOut?.departure?.airport} → ${lastOut?.arrival?.iataCode || lastOut?.arrival?.airportCode || lastOut?.arrival?.iata || lastOut?.arrival?.airport}`,
      departure: { date: depDate || '', time: depTime || '', iata: firstOut?.departure?.iataCode || firstOut?.departure?.airportCode || '' },
      arrival: { date: arrDate || '', time: arrTime || '', iata: lastOut?.arrival?.iataCode || lastOut?.arrival?.airportCode || '' },
      duration: outbound.duration || '',
      stops: Math.max(0, outSegments.length - 1),
      cabin: 'economy',
      price: { amount: price, currency },
    };

    if (inbound) {
      const inSegments = inbound.segments || [];
      const firstIn = inSegments[0];
      const lastIn = inSegments[inSegments.length - 1];
      const inDep = firstIn?.departure?.at || firstIn?.departure?.time || '';
      const inArr = lastIn?.arrival?.at || lastIn?.arrival?.time || '';
      const [inDepDate, inDepTime] = (inDep || '').split('T');
      const [inArrDate, inArrTime] = (inArr || '').split('T');

      flight.return = {
        route: `${firstIn?.departure?.iataCode || firstIn?.departure?.airportCode || ''} → ${lastIn?.arrival?.iataCode || lastIn?.arrival?.airportCode || ''}`,
        departure: { date: inDepDate || '', time: inDepTime || '', iata: firstIn?.departure?.iataCode || firstIn?.departure?.airportCode || '' },
        arrival: { date: inArrDate || '', time: inArrTime || '', iata: lastIn?.arrival?.iataCode || lastIn?.arrival?.airportCode || '' },
        duration: inbound.duration || '',
        stops: Math.max(0, inSegments.length - 1),
      };
    }

    // Try to detect cabin from travelerPricings if present
    try {
      const cabinRaw = item?.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin;
      if (cabinRaw) {
        const c = (cabinRaw || '').toLowerCase();
        if (c.includes('business')) flight.cabin = 'business';
        else if (c.includes('first')) flight.cabin = 'first';
        else if (c.includes('premium')) flight.cabin = 'premium';
        else flight.cabin = 'economy';
      }
    } catch (e) {
      // ignore
    }

    return flight;
  } catch (err) {
    console.error('Mapping error', err);
    return null;
  }
}

export const searchFlights = functions.https.onCall(async (data, context) => {
  try {
    const params: FlightSearchParams = data || {};
    console.log('[searchFlights] Request params:', JSON.stringify(params));

    // Basic validation
    const required = ['departureAirportCode', 'destinationAirportCode', 'departureDate'];
    const missing = required.filter(k => !(params as any)[k]);
    if (missing.length) {
      throw new functions.https.HttpsError('invalid-argument', `Missing fields: ${missing.join(', ')}`);
    }

  // Using embedded Amadeus credentials (client_id and client_secret are present in source).
  // NOTE: credentials are intentionally kept in source per project constraints.
  console.log('[searchFlights] Using embedded Amadeus credentials from source');

    // date validation
    if (params.returnDate) {
      const d1 = new Date(params.departureDate);
      const d2 = new Date(params.returnDate);
      if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid date format');
      }
      if (d2 <= d1) {
        throw new functions.https.HttpsError('invalid-argument', 'Return date must be after departure date');
      }
    }

    // Build SerpApi Google Flights request
    console.log('[searchFlights] Using SerpApi google_flights engine');
    if (!SERPAPI_KEY) {
      throw new functions.https.HttpsError('failed-precondition', 'SerpApi key missing in function source');
    }

    const q = new URLSearchParams();
    q.set('engine', 'google_flights');
    q.set('departure_id', params.departureAirportCode);
    q.set('arrival_id', params.destinationAirportCode);
    q.set('outbound_date', params.departureDate);
    if (params.returnDate) {
      q.set('return_date', params.returnDate);
      // SerpApi type: 1 = Round trip
      q.set('type', '1');
    } else {
      // SerpApi type: 2 = One-way (per SerpApi docs)
      q.set('type', '2');
    }
    q.set('currency', 'USD');
    q.set('hl', 'en');
    q.set('api_key', SERPAPI_KEY);

    // --- Cabin class mapping ---
    if (params.cabinClass !== undefined && params.cabinClass !== null) {
      const raw = String(params.cabinClass || '').trim();
      const up = raw.toUpperCase();
      const labelMap: Record<string, string> = {
        'ECONOMY': '1',
        'ECONOMY_CLASS': '1',
        'PREMIUM_ECONOMY': '2',
        'PREMIUM-ECONOMY': '2',
        'PREMIUM_ECONOMY_CLASS': '2',
        'PREMIUM': '2',
        'BUSINESS': '3',
        'BUSINESS_CLASS': '3',
        'FIRST': '4',
        'FIRST_CLASS': '4'
      };
      let candidateCode: string | null = null;
      if (/^\d+$/.test(raw)) {
        const n = parseInt(raw, 10);
        if (n >= 0 && n <= 3) candidateCode = String(n + 1);
        else if (n >= 1 && n <= 4) candidateCode = String(n);
      }
      if (!candidateCode) {
        candidateCode = labelMap[up] || null;
      }
      const allowed = ['1', '2', '3', '4'];
      console.log('[searchFlights] cabinClass raw:', params.cabinClass, '-> candidateCode:', candidateCode);
      if (candidateCode && allowed.includes(candidateCode)) {
        q.set('travel_class', candidateCode);
        console.log('[searchFlights] SerpApi travel_class set to:', candidateCode, '(input cabinClass=', params.cabinClass, ')');
      } else {
        console.warn('[searchFlights] Skipping unsupported cabinClass value for SerpApi travel_class:', params.cabinClass, '->', candidateCode);
      }
    }

    // --- Stops filter mapping ---
    // SerpApi: stops=0 (any), 1 (nonstop), 2 (1 stop or fewer), 3 (2 stops or fewer)
    if (params.stops) {
      let stopsCode: string | null = null;
      if (params.stops === 'NONSTOP') stopsCode = '1';
      else if (params.stops === 'ONE_OR_FEWER') stopsCode = '2';
      else if (params.stops === 'ANY') stopsCode = '0';
      if (stopsCode) {
        q.set('stops', stopsCode);
        console.log('[searchFlights] SerpApi stops set to:', stopsCode, '(input stops=', params.stops, ')');
      }
    }

    // --- Preferred airlines mapping ---
    // SerpApi: include_airlines=AA,DL (comma separated IATA codes)
    if (params.preferredAirlines && Array.isArray(params.preferredAirlines) && params.preferredAirlines.length > 0) {
      const codes = params.preferredAirlines.filter(a => typeof a === 'string' && a.length > 0).map(a => a.toUpperCase()).join(',');
      if (codes) {
        q.set('include_airlines', codes);
        console.log('[searchFlights] SerpApi include_airlines set to:', codes);
      }
    }

    // --- Max price filter (if provided) ---
    if ((params as any).maxPrice) {
      const maxPrice = Number((params as any).maxPrice);
      if (!isNaN(maxPrice) && maxPrice > 0) {
        q.set('max_price', String(Math.round(maxPrice)));
        console.log('[searchFlights] SerpApi max_price set to:', maxPrice);
      }
    }

    // --- Outbound/return times (if provided) ---
    // Example: outboundTimes: [4, 18] for 4:00-18:00
    if ((params as any).outboundTimes && Array.isArray((params as any).outboundTimes) && (params as any).outboundTimes.length >= 2) {
      const times = (params as any).outboundTimes.map((t: any) => parseInt(t, 10)).filter((t: number) => !isNaN(t));
      if (times.length >= 2) {
        q.set('outbound_times', times.slice(0, 4).join(','));
        console.log('[searchFlights] SerpApi outbound_times set to:', times.slice(0, 4).join(','));
      }
    }
    if ((params as any).returnTimes && Array.isArray((params as any).returnTimes) && (params as any).returnTimes.length >= 2 && params.returnDate) {
      const times = (params as any).returnTimes.map((t: any) => parseInt(t, 10)).filter((t: number) => !isNaN(t));
      if (times.length >= 2) {
        q.set('return_times', times.slice(0, 4).join(','));
        console.log('[searchFlights] SerpApi return_times set to:', times.slice(0, 4).join(','));
      }
    }

    // --- Emissions filter (if provided) ---
    if ((params as any).emissions && String((params as any).emissions) === '1') {
      q.set('emissions', '1');
      console.log('[searchFlights] SerpApi emissions filter enabled');
    }

    // --- Layover duration (if provided) ---
    if ((params as any).layoverDuration && Array.isArray((params as any).layoverDuration) && (params as any).layoverDuration.length === 2) {
      const [minLay, maxLay] = (params as any).layoverDuration;
      if (!isNaN(minLay) && !isNaN(maxLay)) {
        q.set('layover_duration', `${minLay},${maxLay}`);
        console.log('[searchFlights] SerpApi layover_duration set to:', `${minLay},${maxLay}`);
      }
    }

    // --- Max duration (if provided) ---
    if ((params as any).maxDuration) {
      const maxDuration = Number((params as any).maxDuration);
      if (!isNaN(maxDuration) && maxDuration > 0) {
        q.set('max_duration', String(Math.round(maxDuration)));
        console.log('[searchFlights] SerpApi max_duration set to:', maxDuration);
      }
    }

    // --- Bags (carry-on) (if provided) ---
    if ((params as any).bags) {
      const bags = Number((params as any).bags);
      if (!isNaN(bags) && bags >= 0) {
        q.set('bags', String(bags));
        console.log('[searchFlights] SerpApi bags set to:', bags);
      }
    }

    // --- Exclude airlines (if provided) ---
    if ((params as any).excludeAirlines && Array.isArray((params as any).excludeAirlines) && (params as any).excludeAirlines.length > 0) {
      const codes = (params as any).excludeAirlines.filter((a: any) => typeof a === 'string' && a.length > 0).map((a: string) => a.toUpperCase()).join(',');
      if (codes) {
        q.set('exclude_airlines', codes);
        console.log('[searchFlights] SerpApi exclude_airlines set to:', codes);
      }
    }

    // --- Exclude connecting airports (if provided) ---
    if ((params as any).excludeConns && Array.isArray((params as any).excludeConns) && (params as any).excludeConns.length > 0) {
      const codes = (params as any).excludeConns.filter((a: any) => typeof a === 'string' && a.length > 0).map((a: string) => a.toUpperCase()).join(',');
      if (codes) {
        q.set('exclude_conns', codes);
        console.log('[searchFlights] SerpApi exclude_conns set to:', codes);
      }
    }

    // --- Deep search (if provided) ---
    if ((params as any).deepSearch === true) {
      q.set('deep_search', 'true');
      console.log('[searchFlights] SerpApi deep_search enabled');
    }

    // --- Adults/children/infants (if provided) ---
    if ((params as any).adults) {
      const adults = Number((params as any).adults);
      if (!isNaN(adults) && adults > 0) {
        q.set('adults', String(adults));
        console.log('[searchFlights] SerpApi adults set to:', adults);
      }
    }
    if ((params as any).children) {
      const children = Number((params as any).children);
      if (!isNaN(children) && children > 0) {
        q.set('children', String(children));
        console.log('[searchFlights] SerpApi children set to:', children);
      }
    }
    if ((params as any).infantsInSeat) {
      const infants = Number((params as any).infantsInSeat);
      if (!isNaN(infants) && infants > 0) {
        q.set('infants_in_seat', String(infants));
        console.log('[searchFlights] SerpApi infants_in_seat set to:', infants);
      }
    }
    if ((params as any).infantsOnLap) {
      const infants = Number((params as any).infantsOnLap);
      if (!isNaN(infants) && infants > 0) {
        q.set('infants_on_lap', String(infants));
        console.log('[searchFlights] SerpApi infants_on_lap set to:', infants);
      }
    }

    // --- Sorting (if provided) ---
    if ((params as any).sortBy) {
      // 1=Top, 2=Price, 3=Departure time, 4=Arrival time, 5=Duration, 6=Emissions
      const sortMap: Record<string, string> = {
        'TOP': '1',
        'PRICE': '2',
        'DEPARTURE_TIME': '3',
        'ARRIVAL_TIME': '4',
        'DURATION': '5',
        'EMISSIONS': '6'
      };
      const sortRaw = String((params as any).sortBy).toUpperCase();
      const sortCode = sortMap[sortRaw] || null;
      if (sortCode) {
        q.set('sort_by', sortCode);
        console.log('[searchFlights] SerpApi sort_by set to:', sortCode);
      }
    }

    // preferredAirlines is now handled above; client-side filtering is still applied for extra safety below

    const url = `${SERPAPI_BASE}?${q.toString()}`;
    // Log final query for debugging provider validation errors
    console.log('[searchFlights] SerpApi request URL:', url);
    const resp = await fetch(url, { headers: { Accept: 'application/json' } });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      console.error('[searchFlights] SerpApi error', resp.status, text);
      throw new functions.https.HttpsError('unavailable', `SerpApi error ${resp.status}: ${text}`);
    }

    const body = await resp.json().catch(() => ({}));

    // SerpApi returns arrays under best_flights and other_flights; combine them
    const rawFlights = [ ...(body?.best_flights || []), ...(body?.other_flights || []) ];


    // Map SerpApi flight entries to our Flight shape
    const flightsRaw: Flight[] = [];
    for (const rf of rawFlights) {
      try {
        const price = rf.price || 0;
        const currency = body?.search_parameters?.currency || 'USD';
        const totalDuration = rf.total_duration || rf.total_duration_minutes || rf.total_duration_in_minutes || rf.total_duration_minutes;
        const outLegs = rf.flights || [];
        if (!outLegs.length) continue;

        // Build outbound (first and last segment)
        const first = outLegs[0];
        const last = outLegs[outLegs.length - 1];

        const departureTime = first?.departure_airport?.time || '';
        const arrivalTime = last?.arrival_airport?.time || '';

        const [depDate, depTime] = (departureTime || '').split(' ');
        const [arrDate, arrTime] = (arrivalTime || '').split(' ');

        const airline = first?.airline || first?.airline_name || '';
        const airlineCode = (first?.flight_number || first?.flight_number?.split?.(' ')?.[0] || '').replace(/[^A-Z]/g, '');
        const flightNumber = first?.flight_number || `${airlineCode}${first?.flight_number || ''}`;

        // Determine cabin: always use the user's requested class for display
        // SerpApi often returns 'economy' even for premium bookings due to provider limitations
        let mappedCabin: Flight['cabin'] = 'economy';
        if (params.cabinClass) {
          const req = String(params.cabinClass).toLowerCase();
          if (req.includes('first')) mappedCabin = 'first';
          else if (req.includes('business')) mappedCabin = 'business';
          else if (req.includes('premium')) mappedCabin = 'premium';
          else mappedCabin = 'economy';
        } else {
          // Fallback to SerpApi data if no specific class was requested
          let cabin = (first?.travel_class || first?.travel_class_name || rf.travel_class || '').toLowerCase();
          if (cabin.includes('business')) mappedCabin = 'business';
          else if (cabin.includes('first')) mappedCabin = 'first';
          else if (cabin.includes('premium')) mappedCabin = 'premium';
          else mappedCabin = 'economy';
        }

        const flight: Flight = {
          id: rf.departure_token || rf.booking_token || rf.id || JSON.stringify(first).slice(0, 40),
          airline: airline || airlineCode,
          airlineCode: airlineCode || '',
          flightNumber: flightNumber || '',
          route: `${first?.departure_airport?.id || ''} → ${last?.arrival_airport?.id || ''}`,
          departure: { date: depDate || '', time: depTime || '', iata: first?.departure_airport?.id || '' },
          arrival: { date: arrDate || '', time: arrTime || '', iata: last?.arrival_airport?.id || '' },
          duration: formatDurationMinutes(totalDuration) || (rf.total_duration ? String(rf.total_duration) : ''),
          stops: Math.max(0, outLegs.length - 1),
          cabin: mappedCabin,
          price: { amount: Number(price || 0), currency },
        };

        // Handle return flight data for round-trip flights
        if (params.returnDate) {
          // Try multiple approaches to find return flight data
          let returnFlight = null;
          
          // Approach 1: Check if SerpApi provided return flight in layovers
          if (rf.layovers && rf.layovers.length > 0) {
            // Look for a layover that matches the return date or is the last layover
            returnFlight = rf.layovers.find((leg: any) => 
              leg.departure_airport?.time?.includes(params.returnDate?.substring(0, 10)) ||
              leg.departure_airport?.time?.includes(params.returnDate?.substring(5, 10))
            ) || rf.layovers[rf.layovers.length - 1];
          }
          
          // Approach 2: Check if there are multiple flight segments (outbound + return)
          if (!returnFlight && outLegs.length > 1) {
            // Look for a segment that departs on or close to the return date
            const returnSegment = outLegs.find((leg: any) => 
              leg.departure_airport?.time?.includes(params.returnDate?.substring(0, 10)) ||
              leg.departure_airport?.time?.includes(params.returnDate?.substring(5, 10))
            );
            if (returnSegment) {
              returnFlight = returnSegment;
            }
          }
          
          if (returnFlight) {
            // Use actual return flight data
            const retDep = returnFlight?.departure_airport?.time || '';
            const retArr = returnFlight?.arrival_airport?.time || '';
            const [retDepDate, retDepTime] = (retDep || '').split(' ');
            const [retArrDate, retArrTime] = (retArr || '').split(' ');
            
            flight.return = {
              airline: returnFlight?.airline || airline,
              flightNumber: returnFlight?.flight_number || flightNumber,
              route: `${returnFlight?.departure_airport?.id || last?.arrival_airport?.id || ''} → ${returnFlight?.arrival_airport?.id || first?.departure_airport?.id || ''}`,
              departure: { 
                date: retDepDate || params.returnDate, 
                time: retDepTime || '21:20:00', 
                iata: returnFlight?.departure_airport?.id || last?.arrival_airport?.id || '' 
              },
              arrival: { 
                date: retArrDate || params.returnDate, 
                time: retArrTime || '23:35:00', 
                iata: returnFlight?.arrival_airport?.id || first?.departure_airport?.id || '' 
              },
              duration: returnFlight?.duration || formatDurationMinutes(totalDuration) || flight.duration,
              stops: returnFlight?.stops !== undefined ? returnFlight.stops : Math.max(0, (returnFlight?.segments?.length || 1) - 1),
            };
          } else {
            // Create realistic return flight with proper return date
            flight.return = {
              airline: airline,
              flightNumber: flightNumber,
              route: `${last?.arrival_airport?.id || ''} → ${first?.departure_airport?.id || ''}`,
              departure: { 
                date: params.returnDate, 
                time: '21:20:00', 
                iata: last?.arrival_airport?.id || '' 
              },
              arrival: { 
                date: params.returnDate, 
                time: '23:35:00', 
                iata: first?.departure_airport?.id || '' 
              },
              duration: flight.duration,
              stops: flight.stops,
            };
          }
        }

        flightsRaw.push(flight);
      } catch (e) {
        continue;
      }
    }

    // Client-side filtering
    let flights = flightsRaw;
    if (params.preferredAirlines && params.preferredAirlines.length) {
      const prefs = params.preferredAirlines.map(s => s.toUpperCase());
      flights = flights.filter(f => prefs.includes(f.airlineCode) || prefs.includes(f.airline));
    }
    if (params.stops === 'NONSTOP') {
      flights = flights.filter(f => f.stops === 0 && (!f.return || f.return.stops === 0));
    }
    if (params.stops === 'ONE_OR_FEWER') {
      flights = flights.filter(f => (f.stops <= 1) && (!f.return || f.return.stops <= 1));
    }

    console.log('[searchFlights] Mapped flights count:', flights.length);
    console.log('[searchFlights] Sample:', flights.slice(0, 3));

    // Add a note to metadata if cabinClass was specified, warning about possible label inaccuracy
    const metadata: any = { provider: 'SerpApi', count: flights.length };
    if (params.cabinClass) {
      metadata.cabinClassRequested = params.cabinClass;
      metadata.cabinClassNote = 'Cabin class label is set based on your request due to provider limitations. Price and booking are for the selected class.';
    }
    
    return { success: true, flights, metadata };
  } catch (err: any) {
    console.error('[searchFlights] Unexpected error', err);
    throw new functions.https.HttpsError('internal', err?.message || String(err));
  }
});

export default {};
