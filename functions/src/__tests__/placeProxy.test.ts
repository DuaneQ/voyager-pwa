/**
 * Unit tests for placeProxy (placeSearch and geocodePlace)
 *
 * Both functions use a module-level GOOGLE_PLACES_API_KEY const, so they are
 * loaded via jest.isolateModules after setting the env var.
 * fetch is mocked globally; no real Google Places calls are made.
 */

export {};

// ─── Mocks ─────────────────────────────────────────────────────────────────

jest.mock('firebase-functions/v1', () => ({
  https: {
    HttpsError: class HttpsError extends Error {
      constructor(public code: string, message: string) {
        super(message);
        this.name = 'HttpsError';
      }
    },
    onCall: jest.fn((fn: unknown) => fn),
  },
}));

const mockFetch = jest.fn();

// ─── Module lazy-loaded after env var is set ───────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let placeSearch: (data: any, context: any) => Promise<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let geocodePlace: (data: any, context: any) => Promise<any>;

beforeAll(() => {
  process.env.GOOGLE_PLACES_API_KEY = 'test-google-key';
  global.fetch = mockFetch as typeof fetch;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../placeProxy');
    placeSearch = mod.placeSearch;
    geocodePlace = mod.geocodePlace;
  });
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function makePlacesResponse(results: unknown[] = []) {
  return {
    ok: true,
    json: async () => ({ results }),
    text: async () => '',
  };
}

function makeGeocodeResponse(lat: number, lng: number) {
  return {
    ok: true,
    json: async () => ({
      status: 'OK',
      results: [{ geometry: { location: { lat, lng } } }],
    }),
    text: async () => '',
  };
}

// ─── placeSearch tests ─────────────────────────────────────────────────────

describe('placeSearch', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws invalid-argument when q is missing', async () => {
    await expect(placeSearch({}, {})).rejects.toThrow('Missing required field: q');
  });

  it('returns success with empty results when Places API returns none', async () => {
    mockFetch.mockResolvedValue(makePlacesResponse([]));

    const result = await placeSearch({ q: 'JFK Airport' }, {});

    expect(result.success).toBe(true);
    expect(result.data.results).toHaveLength(0);
  });

  it('returns normalized place results', async () => {
    const rawPlace = {
      name: 'John F. Kennedy International Airport',
      formatted_address: 'Queens, NY 11430',
      geometry: { location: { lat: 40.6413, lng: -73.7781 } },
      types: ['airport'],
      place_id: 'ChIJaXQRs6lZwokRY6EFpJnhNNE',
      rating: 3.8,
    };
    mockFetch.mockResolvedValue(makePlacesResponse([rawPlace]));

    const result = await placeSearch({ q: 'JFK Airport' }, {});

    expect(result.success).toBe(true);
    expect(result.data.results[0]).toMatchObject({
      name: rawPlace.name,
      formatted_address: rawPlace.formatted_address,
      place_id: rawPlace.place_id,
      rating: rawPlace.rating,
    });
  });

  it('respects maxResults cap', async () => {
    const places = Array.from({ length: 20 }, (_, i) => ({
      name: `Airport ${i}`,
      formatted_address: `Address ${i}`,
      geometry: { location: { lat: 0, lng: 0 } },
      types: [],
      place_id: `place_${i}`,
    }));
    mockFetch.mockResolvedValue(makePlacesResponse(places));

    // maxResults defaults to 10
    const result = await placeSearch({ q: 'airport' }, {});
    expect(result.data.results).toHaveLength(10);
  });

  it('respects custom maxResults from caller', async () => {
    const places = Array.from({ length: 20 }, (_, i) => ({
      name: `Airport ${i}`,
      formatted_address: `Address ${i}`,
      geometry: { location: { lat: 0, lng: 0 } },
      types: [],
      place_id: `place_${i}`,
    }));
    mockFetch.mockResolvedValue(makePlacesResponse(places));

    const result = await placeSearch({ q: 'airport', maxResults: 5 }, {});
    expect(result.data.results).toHaveLength(5);
  });

  it('includes location bias when lat/lng provided', async () => {
    mockFetch.mockResolvedValue(makePlacesResponse([]));

    await placeSearch({ q: 'airport', location: { lat: 40.64, lng: -73.78 } }, {});

    const calledUrl: string = mockFetch.mock.calls[0][0];
    expect(calledUrl).toMatch(/location=40\.64/);
  });

  it('includes Authorization-like API key query param in Places URL', async () => {
    mockFetch.mockResolvedValue(makePlacesResponse([]));

    await placeSearch({ q: 'LAX' }, {});

    const calledUrl: string = mockFetch.mock.calls[0][0];
    expect(calledUrl).toMatch(/key=test-google-key/);
  });

  it('throws internal error when fetch fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'REQUEST_DENIED',
    });

    await expect(placeSearch({ q: 'LAX' }, {})).rejects.toThrow();
  });
});

// ─── geocodePlace tests ────────────────────────────────────────────────────

describe('geocodePlace', () => {
  beforeEach(() => jest.clearAllMocks());

  it('throws invalid-argument when address is missing', async () => {
    await expect(geocodePlace({}, {})).rejects.toThrow('Missing required field: address');
  });

  it('returns lat/lng on successful geocode', async () => {
    mockFetch.mockResolvedValue(makeGeocodeResponse(40.6413, -73.7781));

    const result = await geocodePlace({ address: 'JFK Airport, Queens NY' }, {});

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ lat: 40.6413, lng: -73.7781 });
  });

  it('returns null data when geocode status is not OK', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ZERO_RESULTS', results: [] }),
      text: async () => '',
    });

    const result = await geocodePlace({ address: 'Nowhere Land' }, {});

    expect(result.success).toBe(true);
    expect(result.data).toBeNull();
  });

  it('accepts data wrapped in a data property', async () => {
    mockFetch.mockResolvedValue(makeGeocodeResponse(51.5074, -0.1278));

    const result = await geocodePlace({ data: { address: 'London, UK' } }, {});

    expect(result.data).toMatchObject({ lat: 51.5074, lng: -0.1278 });
  });
});
