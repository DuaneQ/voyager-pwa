import { ModernGooglePlacesService } from '../../../src/services/ModernGooglePlacesService';

describe('ModernGooglePlacesService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    (global as any).fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('getPlaceDetails returns coordinates when geocode yields a result', async () => {
    const mockResponse = {
      status: 'OK',
      results: [{ geometry: { location: { lat: 12.34, lng: 56.78 } } }]
    };

    (global as any).fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockResponse) }));

    const svc = new ModernGooglePlacesService('FAKE_KEY');
    const coords = await svc.getPlaceDetails('Test Place');
    expect(coords).toEqual({ lat: 12.34, lng: 56.78 });
  });

  it('searchAirports returns mapped place results for textsearch', async () => {
    const mockResponse = {
      status: 'OK',
      results: [
        {
          name: 'Test Airport',
          formatted_address: '123 Test Ave',
          geometry: { location: { lat: 1.23, lng: 4.56 } },
          types: ['airport'],
          place_id: 'abc123',
          rating: 4.5
        }
      ]
    };

    (global as any).fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockResponse) }));

    const svc = new ModernGooglePlacesService('FAKE_KEY');
    const results = await svc.searchAirports('Test');
    expect(Array.isArray(results)).toBe(true);
    expect(results[0]).toMatchObject({ name: 'Test Airport', formatted_address: '123 Test Ave' });
  });

  it('getPlaceById returns result when details API responds', async () => {
    const mockResponse = { status: 'OK', result: { name: 'ById Airport' } };
    (global as any).fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockResponse) }));

    const svc = new ModernGooglePlacesService('FAKE_KEY');
    const res = await svc.getPlaceById('abc123');
    expect(res).toMatchObject({ name: 'ById Airport' });
  });

  it('autocompletePlace returns predictions when API responds', async () => {
    const mockResponse = { status: 'OK', predictions: [{ description: 'Pred 1' }] };
    (global as any).fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockResponse) }));

    const svc = new ModernGooglePlacesService('FAKE_KEY');
    const res = await svc.autocompletePlace('Pred');
    expect(Array.isArray(res)).toBe(true);
    expect(res[0]).toEqual({ description: 'Pred 1' });
  });
});
