import { _searchActivitiesImpl } from '../searchActivities';

// Helper to create a fake Places textsearch response
const makeTextSearchRes = (names: string[]) => ({
  status: 'OK',
  results: names.map((n, i) => ({
    place_id: `place_${i}_${n.replace(/\s+/g, '_')}`,
    name: n,
    types: ['point_of_interest'],
    vicinity: `${n} vicinity`,
    formatted_address: `${n} address`,
    rating: 4.5,
  }))
});

// Minimal details response
const makeDetailsRes = (name: string) => ({
  status: 'OK',
  result: {
    name,
    formatted_address: `${name} address`,
    rating: 4.5,
    user_ratings_total: 120,
    editorial_summary: { overview: `${name} is great` }
  }
});

describe('searchActivities filtering (mocked Places)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // Mock fetch to return different payloads based on URL
    (globalThis as any).fetch = jest.fn((url: string) => {
      // Textsearch
      if (url.includes('/textsearch/json')) {
        if (url.includes('Kyoto')) {
          return Promise.resolve({ ok: true, json: async () => makeTextSearchRes(['Kiyomizu Temple', 'Ryoanji Zen Garden', 'Downtown Nightclub']) });
        }
        if (url.includes('Paris')) {
          return Promise.resolve({ ok: true, json: async () => makeTextSearchRes(['Eiffel Tower', 'Le Croissant', 'McDonalds Paris']) });
        }
        // default
        return Promise.resolve({ ok: true, json: async () => makeTextSearchRes(['Generic Place A', 'Generic Place B']) });
      }

      // Details
      if (url.includes('/details/json')) {
        const m = /place_id=([^&]+)/.exec(url);
        const id = m ? decodeURIComponent(m[1]) : 'unknown';
        return Promise.resolve({ ok: true, json: async () => makeDetailsRes(id) });
      }

      return Promise.resolve({ ok: true, json: async () => ({ status: 'ZERO_RESULTS', results: [] }) });
    });
  });

  afterEach(() => {
    (globalThis as any).fetch = originalFetch;
    jest.clearAllMocks();
  });

  test('spiritual trip: mustAvoid filters out nightclub', async () => {
    const payload = {
      data: {
        destination: 'Kyoto, Japan',
        tripType: 'spiritual',
        mustInclude: ['temple', 'zen garden'],
        mustAvoid: ['nightclub'],
        specialRequests: 'quiet, meditation-friendly'
      }
    };

    const res: any = await _searchActivitiesImpl(payload, {});
    expect(res.success).toBe(true);
    const acts = res.data.activities.map((a: any) => a.name.toLowerCase());
    const rests = res.data.restaurants.map((r: any) => r.name.toLowerCase());

    // Nightclub should be filtered out
    expect(acts.find((n: string) => n.includes('nightclub'))).toBeUndefined();
    // Must include matches should be present for temple and zen garden
    expect(res.metadata.filtering.mustIncludeMatchesCount).toBeGreaterThanOrEqual(1);
    expect(res.metadata.filtering.specialRequestsUsed).toBe(true);
  });

  test('food trip: mustInclude marks croissant and eiffel tower and mustAvoid removes mcdonalds', async () => {
    const payload = {
      data: {
        destination: 'Paris, France',
        tripType: 'food',
        mustInclude: ['croissant', 'eiffel tower'],
        mustAvoid: ['mcdonalds'],
        specialRequests: 'vegetarian friendly'
      }
    };

    const res: any = await _searchActivitiesImpl(payload, {});
    expect(res.success).toBe(true);

    // mcdonalds should be filtered out from results
    const hasMc = [...res.data.activities, ...res.data.restaurants].some((i: any) => /mcdonalds/i.test(i.name || ''));
    expect(hasMc).toBe(false);

    // mustInclude matches should be annotated on at least one item
    const found = [...res.data.activities, ...res.data.restaurants].some((i: any) => Array.isArray(i._mustIncludeMatches) && i._mustIncludeMatches.length > 0);
    expect(found).toBe(true);
    expect(res.metadata.filtering.specialRequestsUsed).toBe(true);
  });

  test('specialRequests empty flag false when not provided', async () => {
    const payload = { data: { destination: 'Nowhere', tripType: 'leisure' } };
    const res: any = await _searchActivitiesImpl(payload, {});
    expect(res.success).toBe(true);
    expect(res.metadata.filtering.specialRequestsUsed).toBe(false);
  });
});
