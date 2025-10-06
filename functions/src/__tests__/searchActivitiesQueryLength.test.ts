import * as actsModule from '../searchActivities';

describe('searchActivities query length trimming', () => {
  it('trims long composed queries to a safe length', async () => {
    // Create many keywords to force a long query
    const manyKeywords = Array.from({ length: 30 }, (_, i) => `keyword${i}`);

    // Mock fetchAllTextSearchResults to return empty arrays (we only care about metadata)
    const original = actsModule.fetchAllTextSearchResults;
    (actsModule.fetchAllTextSearchResults as any) = jest.fn(async () => []);

    try {
      const params = {
        destination: 'Testville',
        keywords: manyKeywords,
        mustInclude: manyKeywords.slice(0, 10)
      } as any;

      const res = await (actsModule._searchActivitiesImpl as any)(params, { auth: { uid: 'user1' } });
      expect(res).toHaveProperty('success', true);
      expect(res.data).toBeDefined();
      // activitiesQuery should exist and be reasonably short
      const aq = res.metadata?.activitiesQuery || res.data?.metadata?.activitiesQuery || res.activitiesQuery || null;
      expect(aq).toBeTruthy();
      expect(aq.length).toBeLessThanOrEqual(200); // allow some buffer but ensure trimming occurred
    } finally {
      (actsModule.fetchAllTextSearchResults as any) = original;
    }
  });
});
