import { parseAIServerResponse } from '../../hooks/parseAIServerResponse';

// Mock parseAssistantJSON to control parsing behavior
jest.mock('../../utils/ai/parsers', () => ({ parseAssistantJSON: jest.fn() }));
jest.mock('../../environments/firebaseConfig', () => ({ auth: { currentUser: { uid: 'test-uid', email: 'me@example.com' } } }));

import { parseAssistantJSON } from '../../utils/ai/parsers';

describe('parseAIServerResponse', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('parses assistant text and returns transportation when assistant string is present', () => {
    const assistantStr = '{"transportation":{"mode":"train","estimatedTime":"5h"}}';
    (parseAssistantJSON as jest.Mock).mockReturnValue({ transportation: { mode: 'train', estimatedTime: '5h' } });

    const aiSettled = { status: 'fulfilled', value: { data: assistantStr } };

    const res = parseAIServerResponse({
      aiSettled,
      generationId: 'gen-test-1',
      request: { destination: 'Testville', startDate: '2025-10-01', endDate: '2025-10-02' },
      userProfile: {},
      alternativeActivities: [],
      alternativeRestaurants: [],
      accommodations: []
    });

    expect(res.aiData).toBe(assistantStr);
    expect(res.parsedTransportation).toEqual({ mode: 'train', estimatedTime: '5h' });
    expect(res.serverToSave).toBeNull();
    expect(parseAssistantJSON).toHaveBeenCalledWith(assistantStr);
  });

  it('returns serverToSave when aiData contains an itinerary object', () => {
    (parseAssistantJSON as jest.Mock).mockReturnValue(null);
    const aiObj = { itinerary: { id: 'it-1' }, metadata: { source: 'test' }, recommendations: { alternativeActivities: [] } };
    const aiSettled = { status: 'fulfilled', value: { data: aiObj } };

    const res = parseAIServerResponse({
      aiSettled,
      generationId: 'gen-test-2',
      request: { destination: 'Elsewhere', startDate: '2025-11-01', endDate: '2025-11-02' },
      userProfile: { username: 'tester' },
      alternativeActivities: [],
      alternativeRestaurants: [],
      accommodations: []
    });

    expect(res.aiData).toBe(aiObj);
    expect(res.serverToSave).toBeDefined();
    expect(res.serverToSave.response.data.itinerary).toBeDefined();
    expect(res.parsedTransportation).toBeNull();
  });
});
