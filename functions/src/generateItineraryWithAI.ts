import * as functions from 'firebase-functions/v1';

// Minimal callable function: accept origin, destination, transportType, call OpenAI, return assistant output.
// WARNING: Hardcoded API key embedded by user request.
const OPENAI_API_KEY = '';

export async function _generateItineraryWithAIImpl(data: any, context: any) {
  const payload = (data && data.data) ? data.data : data || {};
  const origin = payload.origin || payload.departure || null;
  const destination = payload.destination || null;
  // Derive transportType from explicit payload or from preferenceProfile if provided
  const transportTypeFromProfile = payload.preferenceProfile?.transportation?.primaryMode || null;
  const transportType = (payload.transportType || transportTypeFromProfile || null);
  

  // Accept two valid shapes from clients:
  // 1) transport-specific: { origin, destination, transportType, ... }
  // 2) canonical server request: { destination, startDate, endDate, generationId?, preferenceProfile }
  const hasDates = Boolean(payload.startDate && payload.endDate);
  const hasOriginAndDestination = Boolean(origin && destination);
  const hasDestinationWithDates = Boolean(destination && hasDates);
  if (!hasOriginAndDestination && !hasDestinationWithDates) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: provide either origin+destination OR destination+startDate+endDate');
  }

  // Enforce a concrete transportType (no 'any'). If none provided or derived, reject the call.
  if (!transportType || String(transportType).toLowerCase() === 'any') {
    throw new functions.https.HttpsError('invalid-argument', 'Missing or generic transportType: please provide a concrete transportType (e.g., driving, train, flight, ferry, walk) or include it in preferenceProfile.transportation.primaryMode');
  }

  if (!OPENAI_API_KEY) {
    throw new functions.https.HttpsError('failed-precondition', 'OpenAI API key not configured');
  }

  const systemPrompt = `You are an expert travel agent. When given an origin, a destination, and a transportType, produce focused, practical recommendations tailored to that transport mode.

Requirements:
- Output only valid JSON (no surrounding commentary).
- Top-level object must contain a "transportation" object with these fields:
  - mode: string (recommended mode, e.g. driving, flight, train, ferry, walk)
  - estimated_distance_miles: number (approximate distance in miles)
  - estimated_duration_hours: number (approximate travel time in hours)
  - estimated_cost_usd: string or number (estimate or range; include currency)
  - steps: array of strings (key steps the traveler should take)
  - providers: array of objects { name: string, url?: string, notes?: string }
  - tips: array of short strings (practical tips)
  - assumptions: object (e.g. average speed, route assumptions, transfer times)
  - confidence: number (0.0-1.0 indicating how confident the estimate is)

Focus the response on the requested transportType when provided. Use reasonable routing/speed assumptions for calculations (e.g., average driving speed 55 mph on highways, train speeds for intercity service). Be concise and factual.`;
  console.log('system prompt', systemPrompt);

  const startDateLine = payload.startDate ? `StartDate: ${payload.startDate}\n` : '';
  const endDateLine = payload.endDate ? `EndDate: ${payload.endDate}\n` : '';
  const userPrompt = `Origin: ${origin || ''}\nDestination: ${destination}\n${startDateLine}${endDateLine}TransportType: ${transportType}\nReturn only JSON meeting the schema described.`;
  console.log('user prompt', userPrompt);

  const body = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.0,
    max_tokens: 800
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new functions.https.HttpsError('internal', `OpenAI error: ${res.status} ${txt}`);
  }

  const json = await res.json();
  const assistant = json?.choices?.[0]?.message?.content || json?.choices?.[0]?.text || '';

  // Return the raw assistant output unchanged.
  return { success: true, data: { assistant } };
}

export const generateItineraryWithAI = functions
  .runWith({ timeoutSeconds: 120 })
  .https.onCall(_generateItineraryWithAIImpl);

export default {};
