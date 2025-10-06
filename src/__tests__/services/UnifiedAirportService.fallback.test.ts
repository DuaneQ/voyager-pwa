import { UnifiedAirportService } from '../../../src/services/UnifiedAirportService';

describe('UnifiedAirportService - Google Places fallback and helpers', () => {
  let service: UnifiedAirportService;

  beforeEach(() => {
    service = new UnifiedAirportService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('extractIataFromName finds IATA code in parentheses', () => {
    const anySvc = service as any;
    expect(anySvc.extractIataFromName('Some Airport (ABC)')).toBe('ABC');
    expect(anySvc.extractIataFromName('No code here')).toBeNull();
  });

  it('extractCityFromAddress and extractCountryFromAddress parse formatted address', () => {
    const anySvc = service as any;
    const address = 'Los Angeles, California, United States';
    expect(anySvc.extractCityFromAddress(address)).toBe('Los Angeles');
    expect(anySvc.extractCountryFromAddress(address)).toBe('United States');

    // Single-word fallback
    expect(anySvc.extractCityFromAddress('UnknownPlace')).toBe('UnknownPlace');
  });

  it('searchWithGooglePlacesFallback maps google places to Airport shape', async () => {
    const anySvc = service as any;

    // Mock googlePlacesService methods
    anySvc.googlePlacesService = {
      getPlaceDetails: jest.fn(async (q: string) => ({ lat: 1, lng: 2 })),
      searchAirports: jest.fn(async (q: string) => [
        {
          name: 'Test Airport (TST)',
          formatted_address: 'Test City, Test Country',
          geometry: { location: { lat: 1.1, lng: 2.2 } }
        }
      ])
    };

    const res = await anySvc.searchWithGooglePlacesFallback('Test City');
    expect(res).toBeDefined();
    expect(res.airports.length).toBeGreaterThan(0);
    const a = res.airports[0];
    expect(a.iataCode).toBe('TST');
    expect(a.name).toBe('Test Airport (TST)');
    expect(a.city).toBe('Test City');
    expect(a.country).toBe('Test Country');
    expect(a.coordinates).toEqual({ lat: 1.1, lng: 2.2 });
  });

  it('searchAirportsNearLocation falls back to Google Places when OpenFlights returns empty', async () => {
    const anySvc = service as any;

    // Mock openFlightsService to return empty result
    anySvc.openFlightsService = {
      searchAirportsNearLocation: jest.fn(async () => ({ airports: [], searchLocation: { name: 'X', coordinates: { lat: 0, lng: 0 } } })),
      isInternationalAirport: jest.fn(() => true)
    };

    anySvc.googlePlacesService = {
      getPlaceDetails: jest.fn(async () => ({ lat: 10, lng: 20 })),
      searchAirports: jest.fn(async () => [
        { name: 'Fallback Airport (FBK)', formatted_address: 'CityX, CountryX', geometry: { location: { lat: 10, lng: 20 } } }
      ])
    };

    const res = await anySvc.searchAirportsNearLocation('X');
    expect(res.airports.length).toBeGreaterThan(0);
    expect(res.airports[0].iataCode).toBe('FBK');
  });

  it('searchAirportsByQuery uses Google when OpenFlights results are limited', async () => {
    const anySvc = service as any;

    anySvc.openFlightsService = {
      searchAirportsByQuery: jest.fn(async () => [{ iataCode: '' }]) ,
      isInternationalAirport: jest.fn(() => false)
    };

    anySvc.googlePlacesService = {
      searchAirports: jest.fn(async () => [
        { name: 'GPlace Airport (GPL)', formatted_address: 'GCity, GCountry', geometry: { location: { lat: 0, lng: 0 } } }
      ])
    };

    const res = await anySvc.searchAirportsByQuery('GPL');
    expect(res.length).toBeGreaterThan(0);
    expect(res.some((r: any) => r.iataCode === 'GPL')).toBe(true);
  });

  it('getCoordinatesForLocation delegates to googlePlacesService when present', async () => {
    const anySvc = service as any;
    anySvc.googlePlacesService = { getPlaceDetails: jest.fn(async () => ({ lat: 5, lng: 6 })) };
    const coords = await anySvc.getCoordinatesForLocation('Place');
    expect(coords).toEqual({ lat: 5, lng: 6 });
  });
});
