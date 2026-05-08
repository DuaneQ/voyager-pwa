/**
 * Unit tests for generateItineraryWithAI
 *
 * Covers input validation logic in _generateItineraryWithAIImpl.
 * External calls (OpenAI fetch) are mocked to avoid real API costs.
 *
 * NOTE: The module captures OPENAI_API_KEY at load time, so we use
 * jest.isolateModules to load it after the env var is set.
 */

export {};

// ─── Mocks ─────────────────────────────────────────────────────────────────

jest.mock('firebase-functions/v1', () => ({
  https: {
    HttpsError: class HttpsError extends Error {
      code: string;
      constructor(code: string, message: string) {
        super(message);
        this.code = code;
        this.name = 'HttpsError';
      }
    },
  },
  runWith: jest.fn().mockReturnValue({
    https: { onCall: jest.fn() },
  }),
}));

const mockFetch = jest.fn();

function makeOpenAIResponse(content: string) {
  return {
    ok: true,
    json: async () => ({
      choices: [{ message: { content }, text: null }],
    }),
  };
}

// ─── Module lazy-loaded after env var is set ───────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _generateItineraryWithAIImpl: (data: any, context: any) => Promise<any>;
const AUTH_CONTEXT = { auth: { uid: 'test-user-123' } };

beforeAll(() => {
  process.env.OPENAI_API_KEY = 'test-key';
  global.fetch = mockFetch as typeof fetch;
  jest.isolateModules(() => {
    // Fresh require so OPENAI_API_KEY const captures our env var
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _generateItineraryWithAIImpl = require('../generateItineraryWithAI')._generateItineraryWithAIImpl;
  });
});

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('generateItineraryWithAI — _generateItineraryWithAIImpl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Input validation ──────────────────────────────────────────────────

  describe('input validation', () => {
    it('throws invalid-argument when origin and destination are missing', async () => {
      await expect(
        _generateItineraryWithAIImpl({ data: { transportType: 'driving' } }, AUTH_CONTEXT)
      ).rejects.toThrow('Missing required fields');
    });

    it('throws invalid-argument when only destination provided without dates or origin', async () => {
      await expect(
        _generateItineraryWithAIImpl({ data: { destination: 'Paris' } }, AUTH_CONTEXT)
      ).rejects.toThrow();
    });

    it('accepts origin + destination without dates', async () => {
      mockFetch.mockResolvedValue(makeOpenAIResponse(JSON.stringify({ transportation: {} })));

      await expect(
        _generateItineraryWithAIImpl(
          { data: { origin: 'NYC', destination: 'LA', transportType: 'driving' } },
          AUTH_CONTEXT
        )
      ).resolves.toBeDefined();
    });

    it('accepts destination + startDate + endDate without origin', async () => {
      mockFetch.mockResolvedValue(makeOpenAIResponse(JSON.stringify({ transportation: {} })));

      await expect(
        _generateItineraryWithAIImpl(
          { data: { destination: 'Paris', startDate: '2026-06-01', endDate: '2026-06-07', transportType: 'flight' } },
          AUTH_CONTEXT
        )
      ).resolves.toBeDefined();
    });

    it('throws invalid-argument when transportType is missing', async () => {
      await expect(
        _generateItineraryWithAIImpl(
          { data: { origin: 'NYC', destination: 'LA' } },
          AUTH_CONTEXT
        )
      ).rejects.toThrow('Missing or generic transportType');
    });

    it('throws invalid-argument when transportType is "any"', async () => {
      await expect(
        _generateItineraryWithAIImpl(
          { data: { origin: 'NYC', destination: 'LA', transportType: 'any' } },
          AUTH_CONTEXT
        )
      ).rejects.toThrow('Missing or generic transportType');
    });

    it('derives transportType from preferenceProfile when not explicit', async () => {
      mockFetch.mockResolvedValue(makeOpenAIResponse(JSON.stringify({ transportation: {} })));

      await expect(
        _generateItineraryWithAIImpl(
          {
            data: {
              origin: 'NYC',
              destination: 'LA',
              preferenceProfile: { transportation: { primaryMode: 'train' } },
            },
          },
          AUTH_CONTEXT
        )
      ).resolves.toBeDefined();
    });
  });

  // ─── Payload shapes ────────────────────────────────────────────────────

  describe('payload shape handling', () => {
    it('accepts flat payload without data wrapper', async () => {
      mockFetch.mockResolvedValue(makeOpenAIResponse(JSON.stringify({ transportation: {} })));

      await expect(
        _generateItineraryWithAIImpl(
          { origin: 'NYC', destination: 'LA', transportType: 'driving' },
          AUTH_CONTEXT
        )
      ).resolves.toBeDefined();
    });

    it('accepts departure as alias for origin', async () => {
      mockFetch.mockResolvedValue(makeOpenAIResponse(JSON.stringify({ transportation: {} })));

      await expect(
        _generateItineraryWithAIImpl(
          { data: { departure: 'NYC', destination: 'LA', transportType: 'driving' } },
          AUTH_CONTEXT
        )
      ).resolves.toBeDefined();
    });
  });

  // ─── OpenAI integration ────────────────────────────────────────────────

  describe('OpenAI call', () => {
    it('returns success with assistant content', async () => {
      const assistantContent = '{"transportation": {"mode": "driving"}}';
      mockFetch.mockResolvedValue(makeOpenAIResponse(assistantContent));

      const result = await _generateItineraryWithAIImpl(
        { data: { origin: 'NYC', destination: 'LA', transportType: 'driving' } },
        AUTH_CONTEXT
      );

      expect(result).toEqual({ success: true, data: { assistant: assistantContent } });
    });

    it('throws internal error when OpenAI returns non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'rate limited',
      });

      await expect(
        _generateItineraryWithAIImpl(
          { data: { origin: 'NYC', destination: 'LA', transportType: 'driving' } },
          AUTH_CONTEXT
        )
      ).rejects.toThrow('OpenAI error');
    });

    it('includes Authorization header with API key', async () => {
      mockFetch.mockResolvedValue(makeOpenAIResponse('{}'));

      await _generateItineraryWithAIImpl(
        { data: { origin: 'NYC', destination: 'LA', transportType: 'driving' } },
        AUTH_CONTEXT
      ).catch(() => {});

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key',
          }),
        })
      );
    });
  });
});
