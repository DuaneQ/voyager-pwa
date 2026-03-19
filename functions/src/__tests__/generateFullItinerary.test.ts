/**
 * Unit tests for generateFullItinerary
 *
 * Validates input validation and that OPENAI_API_KEY is required.
 * The internal _generateFullItineraryImpl is tested in isolation using
 * jest.isolateModules so the module-level OPENAI_API_KEY const is captured
 * with the test env var already set.
 *
 * OpenAI fetch calls are mocked to avoid real API costs.
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
  },
  runWith: jest.fn().mockReturnValue({
    https: { onCall: jest.fn((fn: unknown) => fn) },
  }),
}));

jest.mock('./utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}), { virtual: true });

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const mockFetch = jest.fn();

// ─── Module lazy-loaded after env var is set ───────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _generateFullItineraryImpl: (data: any, context: any) => Promise<any>;

beforeAll(() => {
  process.env.OPENAI_API_KEY = 'test-key';
  global.fetch = mockFetch as typeof fetch;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _generateFullItineraryImpl = require('../generateFullItinerary')._generateFullItineraryImpl;
  });
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeItineraryResponse(days = 1) {
  const daily_plans = Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    date: `2026-06-0${i + 1}`,
    theme: `Day ${i + 1} - Explore`,
    activities: [{ name: 'Museum', type: 'museum', insider_tip: 'Arrive early', best_time: 'morning', duration: '2 hours' }],
    meals: [{ meal: 'dinner', name: 'La Table', cuisine: 'French', price_range: '$$' }],
  }));

  return {
    ok: true,
    json: async () => ({
      choices: [{
        message: {
          content: JSON.stringify({
            travel_agent_summary: 'Welcome, Traveler!',
            cultural_context: {},
            daily_plans,
            hotel_recommendation: null,
          }),
        },
      }],
    }),
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('generateFullItinerary — _generateFullItineraryImpl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Input validation ─────────────────────────────────────────────────

  describe('input validation', () => {
    it('throws invalid-argument when destination is missing', async () => {
      await expect(
        _generateFullItineraryImpl(
          { data: { startDate: '2026-06-01', endDate: '2026-06-07' } },
          {}
        )
      ).rejects.toThrow('destination');
    });

    it('throws invalid-argument when startDate is missing', async () => {
      await expect(
        _generateFullItineraryImpl(
          { data: { destination: 'Paris', endDate: '2026-06-07' } },
          {}
        )
      ).rejects.toThrow();
    });

    it('throws invalid-argument when endDate is missing', async () => {
      await expect(
        _generateFullItineraryImpl(
          { data: { destination: 'Paris', startDate: '2026-06-01' } },
          {}
        )
      ).rejects.toThrow();
    });

    it('accepts flat payload without data wrapper', async () => {
      mockFetch.mockResolvedValue(makeItineraryResponse(1));

      const result = await _generateFullItineraryImpl(
        { destination: 'Paris', startDate: '2026-06-01', endDate: '2026-06-01' },
        {}
      );

      expect(result.success).toBe(true);
    });
  });

  // ─── OpenAI integration ───────────────────────────────────────────────

  describe('OpenAI call', () => {
    it('returns success with aiOutput on valid request', async () => {
      mockFetch.mockResolvedValue(makeItineraryResponse(3));

      const result = await _generateFullItineraryImpl(
        {
          data: {
            destination: 'Rome, Italy',
            startDate: '2026-07-01',
            endDate: '2026-07-03',
          },
        },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.data?.aiOutput).toBeDefined();
      expect(result.data?.aiOutput.travel_agent_summary).toBe('Welcome, Traveler!');
      expect(result.data?.aiOutput.daily_plans).toHaveLength(3);
    });

    it('includes Authorization header with API key', async () => {
      mockFetch.mockResolvedValue(makeItineraryResponse(1));

      await _generateFullItineraryImpl(
        { data: { destination: 'Tokyo', startDate: '2026-08-01', endDate: '2026-08-01' } },
        {}
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key',
          }),
        })
      );
    });

    it('returns success: false when OpenAI returns non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const result = await _generateFullItineraryImpl(
        { data: { destination: 'Paris', startDate: '2026-06-01', endDate: '2026-06-01' } },
        {}
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/500/);
    });

    it('includes metadata in the response', async () => {
      mockFetch.mockResolvedValue(makeItineraryResponse(2));

      const result = await _generateFullItineraryImpl(
        {
          data: {
            destination: 'Barcelona',
            startDate: '2026-09-01',
            endDate: '2026-09-02',
          },
        },
        {}
      );

      expect(result.data?.metadata).toMatchObject({
        destination: 'Barcelona',
        startDate: '2026-09-01',
        endDate: '2026-09-02',
        tripDays: 2,
      });
    });

    it('skips transportation call when origin is absent', async () => {
      mockFetch.mockResolvedValue(makeItineraryResponse(1));

      await _generateFullItineraryImpl(
        { data: { destination: 'Amsterdam', startDate: '2026-10-01', endDate: '2026-10-01' } },
        {}
      );

      // Only one fetch call (itinerary), no second call for transportation
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('includes preferenceProfile context in prompt', async () => {
      mockFetch.mockResolvedValue(makeItineraryResponse(1));

      await _generateFullItineraryImpl(
        {
          data: {
            destination: 'Ibiza',
            startDate: '2026-08-01',
            endDate: '2026-08-01',
            preferenceProfile: { tripType: 'bachelor', budget: 'luxury' },
          },
        },
        {}
      );

      // Verify the user prompt body sent to OpenAI mentions the trip type
      const callBody = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
      const userMessage = callBody.messages.find((m: { role: string }) => m.role === 'user')?.content ?? '';
      expect(userMessage).toMatch(/BACHELOR|bachelor/i);
    });
  });
});
