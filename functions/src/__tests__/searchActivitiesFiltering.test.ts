import * as actsModule from '../searchActivities';

describe('searchActivities filtering and hints', () => {
  it('filters out mustAvoid items and marks mustInclude matches', async () => {
    const mockPlaces = [
      { place_id: 'p1', name: 'Sunny Park', geometry: { location: { lat: 1, lng: 2 } }, rating: 4.2, types: ['park'], description: 'A great park' },
      { place_id: 'p2', name: 'Noisy Zoo', geometry: { location: { lat: 3, lng: 4 } }, rating: 4.0, types: ['zoo'], description: 'Animals everywhere' },
      { place_id: 'p3', name: 'Quiet Temple', geometry: { location: { lat: 5, lng: 6 } }, rating: 4.8, types: ['place_of_worship'], description: 'Peaceful spiritual site' },
      { place_id: 'p4', name: 'Vegan Delight', geometry: { location: { lat: 7, lng: 8 } }, rating: 4.6, types: ['restaurant'], description: 'Great vegan food' }
    ];

    const original = actsModule.fetchAllTextSearchResults;
    (actsModule.fetchAllTextSearchResults as any) = jest.fn(async () => mockPlaces);

    try {
      const params = {
        destination: 'Testville',
        keywords: ['park', 'restaurant'],
        mustAvoid: ['zoo'],
        mustInclude: ['vegan', 'temple'],
        specialRequests: 'quiet'
      } as any;

      const res = await (actsModule._searchActivitiesImpl as any)(params, { auth: { uid: 'user1' } });
      expect(res).toHaveProperty('success', true);
      expect(res.data).toBeDefined();
      const activities = res.data.activities || [];
      const restaurants = res.data.restaurants || [];

      // Ensure mustAvoid (zoo) was filtered out
      expect(activities.find((a: any) => a.name === 'Noisy Zoo')).toBeUndefined();

      // Ensure mustInclude matches are annotated
      const includes = [...activities, ...restaurants].filter((it: any) => it._mustIncludeMatches && it._mustIncludeMatches.length > 0);
      const matchedNames = includes.map((i: any) => i.name);
      expect(matchedNames).toContain('Quiet Temple');
      expect(matchedNames).toContain('Vegan Delight');

      // Check metadata
      expect(res.metadata).toBeDefined();
      expect(res.metadata.filtering).toBeDefined();
      expect(res.metadata.filtering.mustAvoidFilteredCount).toBeGreaterThanOrEqual(1);
      expect(res.metadata.filtering.mustIncludeMatchesCount).toBeGreaterThanOrEqual(2);
      expect(res.metadata.filtering.specialRequestsUsed).toBe(true);
    } finally {
      (actsModule.fetchAllTextSearchResults as any) = original;
    }
  });
});
