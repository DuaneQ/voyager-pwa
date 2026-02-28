/**
 * generateFullItinerary - AI-First Itinerary Generation
 * 
 * This cloud function uses an AI-First approach:
 * 1. AI (GPT-4o-mini) generates a full personalized itinerary based on user preferences
 * 2. Output includes "why this fits you" explanations and insider tips
 * 3. Uses Google Maps links for places (no expensive Place Details API calls)
 * 
 * Cost savings: Skip Google Place Details (~$0.17-$0.34) → use Google Maps links instead
 * 
 * @created January 2026
 */

import * as functions from 'firebase-functions/v1';
import logger from './utils/logger';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

// ============================================================================
// Type Definitions
// ============================================================================

interface GenerateFullItineraryRequest {
  // Required fields
  destination: string;
  startDate: string;  // ISO date "YYYY-MM-DD"
  endDate: string;    // ISO date "YYYY-MM-DD"
  
  // Origin for transportation recommendations (user's departure city)
  origin?: string;
  
  // User preferences - deeply personalized generation
  preferenceProfile?: {
    tripType?: string;  // 'leisure' | 'adventure' | 'romantic' | 'family' | 'business' | 'spiritual' | 'nightlife'
    activityPreferences?: string[];  // ['history', 'nature', 'art', 'food', 'nightlife']
    dietaryRestrictions?: string[];  // ['vegetarian', 'vegan', 'halal', 'kosher', 'gluten-free']
    budget?: string;  // 'budget' | 'mid-range' | 'luxury'
    accessibility?: {
      mobilityNeeds?: boolean;
      wheelchairAccessible?: boolean;
      visualNeeds?: boolean;
      hearingNeeds?: boolean;
    };
    transportation?: {
      primaryMode?: string;  // 'driving' | 'public_transit' | 'walking' | 'flight'
    };
  };
  
  // User-provided constraints
  mustInclude?: string[];  // Specific places/activities user wants
  mustAvoid?: string[];    // Things to avoid
  specialRequests?: string;  // Free-form additional requests
  
  // Group info
  groupSize?: number;
  
  // User context for personalization
  userInfo?: {
    uid?: string;
    displayName?: string;
    age?: number;
  };
  
  // Coordinates for geographic context (from CityPicker)
  destinationLatLng?: { lat: number; lng: number };
}

interface AIActivity {
  name: string;
  type: string;  // 'museum' | 'restaurant' | 'walking' | 'attraction' | 'experience'
  insider_tip: string;  // One sentence
  best_time: string;  // 'morning' | 'afternoon' | 'evening'
  duration: string;  // '1 hour' | '2-3 hours'
  // Enhanced fields to replace Google Places data
  address?: string;  // Full street address
  neighborhood?: string;  // Area/district name
  estimated_cost_usd?: number;  // Approximate cost per person
  description?: string;  // 1-2 sentence description
}

interface AIMeal {
  meal: string;  // 'lunch' | 'dinner'
  name: string;  // Restaurant name
  cuisine: string;
  price_range: string;  // '$' | '$$' | '$$$'
  // Enhanced fields to replace Google Places data
  address?: string;  // Full street address
  neighborhood?: string;  // Area/district name
  estimated_cost_usd?: number;  // Approximate cost per person (for the meal)
  specialty_dish?: string;  // Signature dish to try
}

interface AIDay {
  day: number;
  date: string;
  theme: string;  // "Art & Romance in Historic Naples"
  activities: AIActivity[];
  meals: AIMeal[];
}

interface AIGeneratedOutput {
  travel_agent_summary: string;  // Personalized greeting like a travel agent speaking to the user
  cultural_context?: {
    safety_notes?: string;
    money_tips?: string;  // Tipping customs
  };
  daily_plans: AIDay[];
  hotel_recommendation?: {
    name: string;
    neighborhood?: string;
    price_range?: string;
    why_recommended?: string;
  } | null;
}

// Transportation recommendations for non-flight modes
interface TransportationRecommendation {
  mode: string;
  estimated_distance_miles?: number;
  estimated_duration_hours?: number;
  estimated_cost_usd?: string | number;
  steps?: string[];
  providers?: Array<{
    name: string;
    url?: string;
    notes?: string;
  }>;
  tips?: string[];
  assumptions?: Record<string, any>;
  confidence?: number;
  not_recommended?: boolean;  // True if this mode is impractical (e.g., train LA to Tokyo)
  not_recommended_reason?: string;
  alternative_suggestion?: string;
}

interface GenerateFullItineraryResponse {
  success: boolean;
  data?: {
    aiOutput: AIGeneratedOutput;
    transportation?: TransportationRecommendation;  // For non-flight modes
    metadata: {
      generatedBy: string;
      aiModel: string;
      processingTimeMs: number;
      destination: string;
      startDate: string;
      endDate: string;
      tripDays: number;
      hasTransportation?: boolean;
      transportMode?: string;
      parallelExecution?: boolean;
    };
  };
  error?: string;
}

// ============================================================================
// AI Prompt Builder
// ============================================================================

function buildSystemPrompt(userName?: string): string {
  const travelerName = userName || 'Traveler';

  return `You are an expert travel agent creating personalized itineraries with DETAILED place information.

IMPORTANT: Start with a travel_agent_summary - a warm, personalized 2-3 sentence greeting addressed directly to ${travelerName}. Write it like a real travel agent excited to present their curated trip. Mention:
- Their name
- The trip purpose/type (bachelorette, honeymoon, adventure, etc.)
- 1-2 highlights they'll experience
- A practical tip or excitement builder

Example: "${travelerName}, Paris is perfect for your romantic getaway! We've curated intimate rooftop dinners, charming walks through Montmartre, and a sunset at the Eiffel Tower. Pack comfortable shoes for the cobblestones!"

CRITICAL RULES FOR PLACE DATA:
1. Only recommend REAL places that actually exist - no made-up venues.
2. Use FULL OFFICIAL place names (e.g., "Basílica de la Sagrada Família").
3. Include REAL street addresses when you know them (e.g., "123 Main Street, Naples, Italy").
4. Include the neighborhood/district name (e.g., "Spaccanapoli", "Montmartre", "Shibuya").
5. Include estimated costs in USD (activities: $0-100, meals: $10-100 per person).
6. For restaurants, include a signature dish to try.
7. No duplicates - each place appears once.
8. Match the destination country ("Naples, Italy" not "Naples, FL").
9. Keep insider tips to ONE SENTENCE max.
10. Include a 1-2 sentence description for each activity.

Return ONLY valid JSON. No markdown.`;
}

/**
 * Get trip-type-specific guidance for the AI
 * This ensures the AI understands what activities/vibe each trip type expects
 */
function getTripTypeGuidance(tripType: string, activityPreferences?: string[]): string {
  const activities = activityPreferences?.join(', ') || '';
  
  const tripTypeInstructions: Record<string, string> = {
    'bachelor': `BACHELOR PARTY: Nightclubs, bars, pool parties, group adventures. No museums or quiet activities.`,
    'bachelorette': `BACHELORETTE: Brunch, spa, rooftop bars, trendy spots, nightlife. Keep it fun and Instagrammable.`,
    'romantic': `ROMANTIC: Intimate restaurants, sunset spots, couples activities, scenic walks. No loud venues.`,
    'family': `FAMILY: Theme parks, kid-friendly museums, zoos, casual restaurants. No adult-only venues.`,
    'adventure': `ADVENTURE: Hiking, water sports, outdoor activities, nature exploration. Active pace.`,
    'spiritual': `SPIRITUAL: Temples, meditation, yoga, peaceful gardens, mindful dining. Slow pace.`,
    'business': `BUSINESS: Efficient restaurants, professional venues, quick cultural highlights.`,
    'leisure': `LEISURE: Mix of landmarks and local gems, comfortable pace, varied dining.`
  };

  return tripTypeInstructions[tripType.toLowerCase()] || tripTypeInstructions['leisure'];
}

function buildUserPrompt(request: GenerateFullItineraryRequest): string {
  const profile = request.preferenceProfile || {};
  const tripDays = calculateTripDays(request.startDate, request.endDate);
  const userName = request.userInfo?.displayName;
  
  // Get trip-type-specific guidance
  const tripTypeGuidance = profile.tripType 
    ? getTripTypeGuidance(profile.tripType, profile.activityPreferences)
    : '';
  
  // Build preference description
  const preferences: string[] = [];
  
  if (profile.tripType) {
    preferences.push(`Trip type: ${profile.tripType.toUpperCase()}`);
  }
  
  if (profile.activityPreferences?.length) {
    preferences.push(`Activity interests: ${profile.activityPreferences.join(', ')} (incorporate these INTO the trip type context)`);
  }
  
  if (profile.dietaryRestrictions?.length) {
    preferences.push(`Dietary needs: ${profile.dietaryRestrictions.join(', ')}`);
  }
  
  if (profile.budget) {
    preferences.push(`Budget level: ${profile.budget}`);
  }
  
  if (profile.accessibility?.mobilityNeeds || profile.accessibility?.wheelchairAccessible) {
    preferences.push('Accessibility: Requires wheelchair accessible venues');
  }
  
  if (request.mustInclude?.length) {
    preferences.push(`Must include: ${request.mustInclude.join(', ')}`);
  }
  
  if (request.mustAvoid?.length) {
    preferences.push(`Must avoid: ${request.mustAvoid.join(', ')}`);
  }
  
  if (request.specialRequests) {
    preferences.push(`Special requests: ${request.specialRequests}`);
  }
  
  const preferencesText = preferences.length > 0 
    ? preferences.join('\n')
    : 'No specific preferences provided - create a balanced, well-rounded itinerary';

  const travelerIntro = userName 
    ? `Create a ${tripDays}-day itinerary for ${userName} visiting ${request.destination}.`
    : `Create a ${tripDays}-day itinerary for ${request.destination}.`;

  // Build the trip type section
  const tripTypeSection = tripTypeGuidance 
    ? `\n⭐ TRIP TYPE REQUIREMENTS (CRITICAL - follow these closely):\n${tripTypeGuidance}\n`
    : '';

  // Add coordinates info for disambiguation if available
  const coordsInfo = request.destinationLatLng 
    ? `- Exact location: Latitude ${request.destinationLatLng.lat.toFixed(4)}, Longitude ${request.destinationLatLng.lng.toFixed(4)} (use this to confirm the correct city - e.g., Naples, Italy NOT Naples, Florida)`
    : '';

  return `${travelerIntro}

TRIP DETAILS:
- Destination: ${request.destination}
${coordsInfo}
- Dates: ${request.startDate} to ${request.endDate} (${tripDays} days)
- Group size: ${request.groupSize || 1} travelers
${userName ? `- Traveler name: ${userName} (address them by name in personalized recommendations)` : ''}
${tripTypeSection}
USER PREFERENCES:
${preferencesText}

REQUIREMENTS:
- EXACTLY 1 activity + 1 dinner per day (keep it focused)
- Real place names with addresses
- Be concise - short field values

Return JSON (use SHORT field names to save tokens):
{
  "summary": "1-2 sentence personalized greeting",
  "days": [
    {
      "d": 1,
      "theme": "Day theme",
      "activity": {
        "name": "Place Name",
        "type": "attraction|museum|experience",
        "addr": "Address",
        "area": "Neighborhood",
        "cost": 15,
        "tip": "Insider tip",
        "time": "morning|afternoon|evening",
        "hrs": "2h"
      },
      "meal": {
        "name": "Restaurant Name",
        "cuisine": "Italian",
        "price": "$$",
        "addr": "Address",
        "area": "Neighborhood",
        "dish": "Must-try dish"
      }
    }
  ]
}`;
}

function calculateTripDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, Math.min(diffDays, 14)); // Cap at 14 days
}

// ============================================================================
// OpenAI API Call
// ============================================================================

async function callOpenAI(systemPrompt: string, userPrompt: string, tripDays: number): Promise<string> {
  // Scale max_tokens based on trip length: ~250 tokens/day (1 activity + 1 meal) + 800 buffer
  const maxTokens = Math.min(Math.max(tripDays * 250 + 800, 1500), 4000);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',  // Faster than gpt-4o-mini (~2-3x speed improvement)
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,  // Lower = faster & more deterministic
      max_tokens: maxTokens,
      response_format: { type: 'json_object' }  // Force JSON output
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    logger.error('[generateFullItinerary] OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content in OpenAI response');
  }
  
  // Check if response was truncated (finish_reason !== 'stop')
  const finishReason = json?.choices?.[0]?.finish_reason;
  if (finishReason === 'length') {
    logger.warn('[generateFullItinerary] OpenAI response was truncated (hit max_tokens)');
    throw new Error('AI response was truncated - itinerary may be too complex');
  }
  
  return content;
}

// ============================================================================
// Response Validation
// ============================================================================

function validateAIOutput(output: any): AIGeneratedOutput {
  // Support both old field names (daily_plans) and new short names (days)
  const dailyPlans = output.days || output.daily_plans;
  
  if (!dailyPlans || !Array.isArray(dailyPlans)) {
    throw new Error('Invalid AI output: missing days array');
  }
  
  if (dailyPlans.length === 0) {
    throw new Error('Invalid AI output: empty days');
  }
  
  // Validate and normalize each day
  const normalizedDays = dailyPlans.map((day: any, index: number) => {
    // Support both old (day) and new (d) field names
    const dayNum = day.d || day.day || index + 1;
    
    // Normalize activity (new format has single activity, old had array)
    let activities: any[] = [];
    if (day.activity) {
      // New format: single activity object
      activities = [{
        name: day.activity.name,
        type: day.activity.type,
        address: day.activity.addr || day.activity.address,
        neighborhood: day.activity.area || day.activity.neighborhood,
        estimated_cost_usd: day.activity.cost || day.activity.estimated_cost_usd,
        insider_tip: day.activity.tip || day.activity.insider_tip,
        best_time: day.activity.time || day.activity.best_time,
        duration: day.activity.hrs || day.activity.duration
      }];
    } else if (Array.isArray(day.activities)) {
      activities = day.activities;
    }
    
    // Normalize meal (new format has single meal, old had array)
    let meals: any[] = [];
    if (day.meal) {
      // New format: single meal object
      meals = [{
        meal: 'dinner',
        name: day.meal.name,
        cuisine: day.meal.cuisine,
        price_range: day.meal.price || day.meal.price_range,
        address: day.meal.addr || day.meal.address,
        neighborhood: day.meal.area || day.meal.neighborhood,
        specialty_dish: day.meal.dish || day.meal.specialty_dish
      }];
    } else if (Array.isArray(day.meals)) {
      meals = day.meals;
    }
    
    return {
      day: dayNum,
      date: day.date || '',
      theme: day.theme || `Day ${dayNum}`,
      activities,
      meals
    };
  });
  
  // Normalize hotel recommendation
  const hotel = output.hotel ? {
    name: output.hotel.name,
    neighborhood: output.hotel.area || output.hotel.neighborhood,
    price_range: output.hotel.price || output.hotel.price_range,
    why_recommended: output.hotel.why || output.hotel.why_recommended
  } : null;
  
  return {
    travel_agent_summary: output.summary || output.travel_agent_summary || '',
    cultural_context: output.cultural_context || {},
    daily_plans: normalizedDays,
    hotel_recommendation: hotel
  };
}

// ============================================================================
// Transportation Recommendations Generator
// ============================================================================

async function generateTransportationRecommendations(
  origin: string,
  destination: string,
  transportMode: string
): Promise<TransportationRecommendation> {
  const systemPrompt = `You are an expert travel logistics advisor. Given an origin, destination, and preferred transport mode, provide practical transportation recommendations.

CRITICAL RULES:
1. If the requested transport mode is IMPOSSIBLE or HIGHLY IMPRACTICAL for this route (e.g., train from Los Angeles to Tokyo, driving from New York to London), set "not_recommended": true and explain why, then suggest the best alternative.
2. Provide realistic estimates based on actual routes and services.
3. Include booking providers with actual website URLs.
4. Be honest about limitations and challenges.

Return ONLY valid JSON with this exact structure:
{
  "mode": "the recommended mode (may differ from requested if impractical)",
  "estimated_distance_miles": number,
  "estimated_duration_hours": number,
  "estimated_cost_usd": "range like $50-100 or specific amount",
  "steps": ["Step 1: ...", "Step 2: ...", ...],
  "providers": [
    {"name": "Provider Name", "url": "https://...", "notes": "optional notes"}
  ],
  "tips": ["Tip 1", "Tip 2", ...],
  "not_recommended": false,
  "not_recommended_reason": null,
  "alternative_suggestion": null,
  "confidence": 0.0-1.0
}

If the mode is impractical, include:
{
  "not_recommended": true,
  "not_recommended_reason": "Explanation of why this mode doesn't work",
  "alternative_suggestion": "Consider flying instead - it's the only practical option for this route",
  ...rest of fields with the ALTERNATIVE mode's data
}`;

  const userPrompt = `Origin: ${origin}
Destination: ${destination}
Requested Transport Mode: ${transportMode}

Provide transportation recommendations. If the requested mode is impractical for this route, explain why and provide the best alternative.`;

  const body = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.2,
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
    throw new Error(`OpenAI transportation error: ${res.status} ${txt}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content || '';
  
  // Parse and return the transportation recommendations
  const parsed = JSON.parse(content);
  return parsed as TransportationRecommendation;
}

// ============================================================================
// Main Function Implementation
// ============================================================================

export async function _generateFullItineraryImpl(
  data: any, 
  context: any
): Promise<GenerateFullItineraryResponse> {
  const startTime = Date.now();
  
  try {
    // Normalize input (support both { data: {...} } and direct payload)
    const payload = (data && data.data) ? data.data : data || {};
    const request: GenerateFullItineraryRequest = payload;
    
    // Validate required fields
    if (!request.destination) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required field: destination');
    }
    if (!request.startDate || !request.endDate) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: startDate and endDate');
    }
    
    // Validate API key
    if (!OPENAI_API_KEY) {
      throw new functions.https.HttpsError('failed-precondition', 'OpenAI API key not configured');
    }
    
    const tripDays = calculateTripDays(request.startDate, request.endDate);
    
    logger.info('[generateFullItinerary] ⏱️ START - Starting generation', {
      destination: request.destination,
      startDate: request.startDate,
      endDate: request.endDate,
      tripDays,
      tripType: request.preferenceProfile?.tripType,
      hasPreferences: !!request.preferenceProfile,
      userName: request.userInfo?.displayName
    });
    
    // Build prompts - pass username for personalization
    const promptStartTime = Date.now();
    const systemPrompt = buildSystemPrompt(request.userInfo?.displayName);
    const userPrompt = buildUserPrompt(request);
    logger.info(`[generateFullItinerary] ⏱️ CHECKPOINT 1 - Prompts built in ${Date.now() - promptStartTime}ms`);
    
    // ========================================================================
    // PARALLEL AI CALLS - Run itinerary and transportation generation together
    // ========================================================================
    const transportMode = request.preferenceProfile?.transportation?.primaryMode?.toLowerCase();
    const isFlightMode = transportMode === 'airplane' || transportMode === 'flight' || transportMode === 'air';
    const needsTransportation = !isFlightMode && request.origin;
    
    logger.info('[generateFullItinerary] ⏱️ Starting parallel AI calls...', {
      needsTransportation,
      transportMode,
      isFlightMode
    });
    
    const parallelStartTime = Date.now();
    
    // Create promises for parallel execution
    const itineraryPromise = callOpenAI(systemPrompt, userPrompt, tripDays);
    
    const transportationPromise = needsTransportation
      ? generateTransportationRecommendations(
          request.origin!,
          request.destination,
          transportMode || 'driving'
        ).catch(err => {
          logger.warn('[generateFullItinerary] Transportation generation failed:', err);
          return undefined;
        })
      : Promise.resolve(undefined);
    
    // Execute both in parallel
    const [aiResponseText, transportation] = await Promise.all([
      itineraryPromise,
      transportationPromise
    ]);
    
    logger.info(`[generateFullItinerary] ⏱️ CHECKPOINT 2 - Parallel AI calls completed in ${Date.now() - parallelStartTime}ms`);
    
    // Parse and validate JSON
    const parseStartTime = Date.now();
    let aiOutput: AIGeneratedOutput;
    try {
      const parsed = JSON.parse(aiResponseText);
      aiOutput = validateAIOutput(parsed);
      logger.info(`[generateFullItinerary] ⏱️ CHECKPOINT 3 - JSON parsed in ${Date.now() - parseStartTime}ms, days: ${aiOutput.daily_plans.length}`);
    } catch (parseError) {
      logger.error('[generateFullItinerary] Failed to parse AI response:', parseError);
      logger.error('[generateFullItinerary] Raw response:', aiResponseText.substring(0, 500));
      throw new Error('Failed to parse AI response as valid JSON');
    }
    
    const processingTime = Date.now() - startTime;
    
    logger.info(`[generateFullItinerary] ⏱️ COMPLETE - Total time: ${processingTime}ms`, {
      destination: request.destination,
      daysGenerated: aiOutput.daily_plans.length,
      processingTimeMs: processingTime,
      hasTransportation: !!transportation
    });
    
    return {
      success: true,
      data: {
        aiOutput,
        transportation,  // Include transportation recommendations (if generated)
        metadata: {
          generatedBy: 'ai-first-v2',
          aiModel: 'gpt-3.5-turbo',
          processingTimeMs: processingTime,
          destination: request.destination,
          startDate: request.startDate,
          endDate: request.endDate,
          tripDays,
          hasTransportation: !!transportation,
          transportMode: transportMode || 'not-specified',
          parallelExecution: true
        }
      }
    };
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('[generateFullItinerary] Generation failed', {
      error: errorMessage,
      processingTimeMs: processingTime
    });
    
    // Re-throw HttpsError as-is
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

// Export as Firebase Cloud Function
export const generateFullItinerary = functions
  .runWith({ 
    timeoutSeconds: 90,  // 90 seconds for OpenAI generation
    memory: '256MB'
  })
  .https.onCall(_generateFullItineraryImpl);

export default {};
