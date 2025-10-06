import * as actsModule from '../searchActivities';

describe('searchActivities callable', () => {
  it('returns normalized activities when fetchAllTextSearchResults yields places', async () => {
    // Mock fetchAllTextSearchResults to return two place objects
    const mockPlaces = [
      { place_id: 'pa1', name: 'A Place', geometry: { location: { lat: 1, lng: 2 } }, rating: 4.2 },
      { place_id: 'pa2', name: 'B Place', geometry: { location: { lat: 3, lng: 4 } }, rating: 4.0 }
    ];

    const original = actsModule.fetchAllTextSearchResults;
    (actsModule.fetchAllTextSearchResults as any) = jest.fn(async () => mockPlaces);

    try {
      // Call the raw implementation directly to avoid functions wrapper stream requirements
      const res = await (actsModule._searchActivitiesImpl as any)({ destination: 'Testville' }, { auth: { uid: 'user1' } });
      expect(res).toHaveProperty('success', true);
      expect(res.data).toBeDefined();
      expect(Array.isArray(res.data.activities)).toBe(true);
      expect(res.data.activities.length).toBeGreaterThanOrEqual(2);
      expect(res.metadata.provider).toBe('Google Places');
    } finally {
      // Restore
      (actsModule.fetchAllTextSearchResults as any) = original;
    }
  });
});
