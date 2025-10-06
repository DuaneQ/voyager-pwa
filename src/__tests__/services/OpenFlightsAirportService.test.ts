import { OpenFlightsAirportService } from '../../../src/services/OpenFlightsAirportService';
import { DistanceCalculator } from '../../../src/utils/DistanceCalculator';

describe('OpenFlightsAirportService', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Force fetch to fail so the service loads fallback data synchronously
    // The service catches fetch failures and loads fallback data
    // We mock fetch to throw to trigger fallback path
    // Also make a simple distance calculator that returns euclidean-like distances for predictability
    (global as any).fetch = jest.fn(() => Promise.reject(new Error('network')));
  });

  afterEach(() => {
    (global as any).fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('loads fallback data and can lookup by IATA code', async () => {
    const svc = new OpenFlightsAirportService(new DistanceCalculator());

    const jfk = await svc.getAirportByIataCode('JFK');
    expect(jfk).not.toBeNull();
    expect(jfk!.iataCode).toBe('JFK');
    expect(jfk!.name.toLowerCase()).toContain('john f kennedy');
  });

  it('searches airports by query scoring and returns matches', async () => {
    const svc = new OpenFlightsAirportService(new DistanceCalculator());

    const results = await svc.searchAirportsByQuery('Los Angeles');
    expect(Array.isArray(results)).toBe(true);
    // LAX should be in results
    const hasLax = results.some(r => r.iataCode === 'LAX');
    expect(hasLax).toBe(true);
  });

  it('searches airports near a location using fallback coordinates', async () => {
    const svc = new OpenFlightsAirportService(new DistanceCalculator());

    const res = await svc.searchAirportsNearLocation('New York', undefined, 500);
    expect(res).toHaveProperty('airports');
    expect(res.airports.length).toBeGreaterThan(0);
    // Expect at least one airport to be JFK
    const found = res.airports.some(a => a.iataCode === 'JFK');
    expect(found).toBe(true);
  });

  it('classifies international airports heuristically', async () => {
    const svc = new OpenFlightsAirportService(new DistanceCalculator());

    // Use string input
    const intlName = 'Some Big International Airport';
    const nonIntl = 'Small County Field';
    expect(svc['isInternationalAirport'](intlName)).toBe(true);
    expect(svc['isInternationalAirport'](nonIntl)).toBe(false);
  });
});
