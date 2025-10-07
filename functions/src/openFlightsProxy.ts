import * as functions from 'firebase-functions/v1';

// Use global fetch available in Node 18+ runtime
const fetch = globalThis.fetch as typeof globalThis.fetch;

const OPENFLIGHTS_URL = 'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat';

interface OFAirportRaw {
  id: number;
  name: string;
  city: string;
  country: string;
  iata: string | null;
  icao: string | null;
  latitude: number;
  longitude: number;
  altitude: number;
  timezone: number;
  dst: string;
  tz: string;
  type: string;
  source: string;
}

let cachedAirports: OFAirportRaw[] | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

async function loadAirports(): Promise<OFAirportRaw[]> {
  const now = Date.now();
  if (cachedAirports && (now - cachedAt) < CACHE_TTL_MS) {
    return cachedAirports;
  }

  try {
    const res = await fetch(OPENFLIGHTS_URL);
    if (!res.ok) throw new Error(`Failed to fetch OpenFlights: ${res.status}`);
    const text = await res.text();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const airports: OFAirportRaw[] = [];
    for (const line of lines) {
      try {
        const parts = parseCSVLine(line);
        if (parts.length >= 14) {
          const a: OFAirportRaw = {
            id: Number(parts[0]) || 0,
            name: parts[1]?.replace(/"/g, '') || '',
            city: parts[2]?.replace(/"/g, '') || '',
            country: parts[3]?.replace(/"/g, '') || '',
            iata: parts[4]?.replace(/"/g, '') || null,
            icao: parts[5]?.replace(/"/g, '') || null,
            latitude: Number(parts[6]) || 0,
            longitude: Number(parts[7]) || 0,
            altitude: Number(parts[8]) || 0,
            timezone: Number(parts[9]) || 0,
            dst: parts[10]?.replace(/"/g, '') || '',
            tz: parts[11]?.replace(/"/g, '') || '',
            type: parts[12]?.replace(/"/g, '') || '',
            source: parts[13]?.replace(/"/g, '') || ''
          };
          // only include airports with IATA and coordinates
          if (a.iata && a.iata !== '\\N' && a.latitude && a.longitude && a.type === 'airport') {
            airports.push(a);
          }
        }
      } catch (e) {
        continue;
      }
    }

  cachedAirports = airports;
  cachedAt = Date.now();
  return airports;
  } catch (err) {
    console.error('[openFlightsProxy] Failed to load airports:', err);
    // Fallback to a tiny curated list to keep features working
    cachedAirports = [
      { id: 1, name: 'John F Kennedy International Airport', city: 'New York', country: 'United States', iata: 'JFK', icao: 'KJFK', latitude: 40.6413, longitude: -73.7781, altitude: 13, timezone: -5, dst: 'A', tz: 'America/New_York', type: 'airport', source: 'fallback' },
      { id: 2, name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'United States', iata: 'LAX', icao: 'KLAX', latitude: 33.9425, longitude: -118.4081, altitude: 125, timezone: -8, dst: 'A', tz: 'America/Los_Angeles', type: 'airport', source: 'fallback' }
    ];
    cachedAt = Date.now();
    return cachedAirports;
  }
}

function normalizeString(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export const openFlightsGetAll = functions.https.onCall(async (data, context) => {
  const airports = await loadAirports();
  // Return trimmed set to keep payload reasonable
  const trimmed = airports.slice(0, 1000).map(a => ({
    iata: a.iata,
    name: a.name,
    city: a.city,
    country: a.country,
    lat: a.latitude,
    lng: a.longitude
  }));
  return { success: true, data: trimmed };
});

// Public HTTP endpoint for OpenFlights data. This is intentionally
// an HTTP GET so browser clients can fetch the pre-parsed JSON from
// our Cloud Function (avoids client-side GitHub CORS/CSP issues).
export const openFlightsHttp = functions.https.onRequest((req, res) => {
  (async () => {
    try {
      // Handle CORS preflight and set permissive response headers for browsers.
      const origin = req.get('origin') || '';
      // Allow production origin and localhost for dev; default to wildcard if unknown.
      const allowedOrigins = ['https://travalpass.com', 'https://www.travalpass.com', 'http://localhost:3000', 'http://127.0.0.1:3000'];
      const allowOrigin = allowedOrigins.includes(origin) ? origin : '*';
      res.set('Access-Control-Allow-Origin', allowOrigin);
      res.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        // Respond to preflight immediately
        res.set('Cache-Control', 'public, max-age=300');
        return res.status(204).send('');
      }

      const airports = await loadAirports();
      const trimmed = airports.map(a => ({
        iata: a.iata,
        name: a.name,
        city: a.city,
        country: a.country,
        lat: a.latitude,
        lng: a.longitude
      }));

      // Small cache header to allow CDN/edges to cache briefly (5 minutes)
      res.set('Cache-Control', 'public, max-age=300');
      res.status(200).json({ success: true, data: trimmed });
    } catch (err: any) {
      console.error('[openFlightsHttp] Error', err);
      res.set('Access-Control-Allow-Origin', '*');
      res.status(500).json({ success: false, error: String(err) });
    }
  })();
});

export const openFlightsSearch = functions.https.onCall(async (data, context) => {
  try {
    const normalized = (data && (data.data !== undefined ? data.data : data)) || {};
    const { q, maxResults = 20 } = normalized as any;
    if (!q) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required field: q');
    }

    const airports = await loadAirports();
    const nq = normalizeString(q);
    const results = airports
      .map(a => ({ a, score: ((a.iata && a.iata.toLowerCase() === nq) ? 100 : 0) + (normalizeString(a.name).includes(nq) ? 50 : 0) + (normalizeString(a.city).includes(nq) ? 30 : 0) }))
      .filter(r => r.score > 0)
      .sort((x, y) => y.score - x.score)
      .slice(0, maxResults)
      .map(r => ({ iata: r.a.iata, name: r.a.name, city: r.a.city, country: r.a.country, lat: r.a.latitude, lng: r.a.longitude }));

    return { success: true, data: results };
  } catch (err: any) {
    console.error('[openFlightsSearch] Error', err);
    throw new functions.https.HttpsError('internal', err.message || String(err));
  }
});

export default {};
