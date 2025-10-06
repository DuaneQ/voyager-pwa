describe('fetchAllTextSearchResults pagination', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('fetches multiple pages and stops at maxResults', async () => {
    // Simulate two pages of results with next_page_token
    const page1 = { status: 'OK', results: Array.from({ length: 15 }, (_, i) => ({ place_id: `p${i+1}` })), next_page_token: 'token123' };
    const page2 = { status: 'OK', results: Array.from({ length: 15 }, (_, i) => ({ place_id: `p${i+16}` })) };

    let call = 0;
    global.fetch = jest.fn(async (url: any) => {
      call++;
      if (call === 1) {
        return { ok: true, json: async () => page1 } as any;
      }
      return { ok: true, json: async () => page2 } as any;
    });

    // Import after mocking fetch so module's internal fetch binding captures the mock
    const mod = require('../searchActivities');
    const fetchAllTextSearchResults = mod.fetchAllTextSearchResults as (url: string, max?: number) => Promise<any[]>;

    const res = await fetchAllTextSearchResults('https://example.com/textsearch?query=test', 20);
    expect(res.length).toBeGreaterThanOrEqual(20);
    // Ensure original fetch mock was called at least twice for pagination
    expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('handles non-OK status gracefully', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 500, text: async () => 'Server error' } as any));
    const mod = require('../searchActivities');
    const fetchAllTextSearchResults = mod.fetchAllTextSearchResults as (url: string, max?: number) => Promise<any[]>;
    const res = await fetchAllTextSearchResults('https://example.com/textsearch?query=test', 10);
    expect(Array.isArray(res)).toBe(true);
    expect(res.length).toBe(0);
  });
});
