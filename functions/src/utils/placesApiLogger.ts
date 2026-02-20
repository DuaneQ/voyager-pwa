/**
 * Server-side Google Places API Usage Logger (Cloud Functions)
 * 
 * Tracks ALL Places API calls to identify cost spikes.
 * Logs to Firebase Functions logger for analysis.
 * 
 * PRICING (per Google Maps Platform pricing):
 * - Autocomplete Per Request: $0.00283/call
 * - Autocomplete Per Session: $0.017/session (if followed by Place Details)
 * - Text Search: $0.032/call ← MOST EXPENSIVE
 * - Place Details: $0.017/call
 * - Nearby Search: $0.032/call
 */

import logger from './logger';

interface PlacesApiCall {
  timestamp: number;
  apiType: 'autocomplete' | 'textSearch' | 'placeDetails' | 'nearbySearch' | 'other';
  estimatedCostUSD: number;
  functionName?: string;
  query?: string;
  place_id?: string;
  pageToken?: string;
  maxResults?: number;
}

// Cost per call (in USD)
const API_COSTS: Record<string, number> = {
  autocomplete: 0.00283,      // Per keystroke WITHOUT session token
  autocompleteSession: 0.017,  // Per session WITH session token
  textSearch: 0.032,          // ← MOST EXPENSIVE
  placeDetails: 0.017,
  nearbySearch: 0.032,
};

// In-memory stats (resets on cold start)
let sessionStats = {
  totalCalls: 0,
  totalEstimatedCost: 0,
  callsByType: {} as Record<string, number>,
  costByType: {} as Record<string, number>,
  callsByFunction: {} as Record<string, number>,
};

class PlacesApiLogger {
  /**
   * Log an autocomplete API call
   */
  logAutocomplete(params: {
    query: string;
    sessionToken?: string;
    functionName?: string;
  }) {
    const cost = params.sessionToken ? API_COSTS.autocompleteSession : API_COSTS.autocomplete;
    const call: PlacesApiCall = {
      timestamp: Date.now(),
      apiType: 'autocomplete',
      estimatedCostUSD: cost,
      functionName: params.functionName,
      query: params.query,
    };

    this.recordCall(call);

    logger.info(
      `🔍 [Places API] Autocomplete: "${params.query}" | Session: ${params.sessionToken ? 'YES✅' : 'NO❌'} | Cost: $${cost.toFixed(5)} | Function: ${params.functionName || 'unknown'}`
    );
  }

  /**
   * Log a text search API call
   */
  logTextSearch(params: {
    query: string;
    functionName?: string;
    pageToken?: string;
    maxResults?: number;
  }) {
    const call: PlacesApiCall = {
      timestamp: Date.now(),
      apiType: 'textSearch',
      estimatedCostUSD: API_COSTS.textSearch,
      functionName: params.functionName,
      query: params.query,
      pageToken: params.pageToken,
      maxResults: params.maxResults,
    };

    this.recordCall(call);

    logger.warn(
      `⚠️ [Places API] TEXT SEARCH (EXPENSIVE): "${params.query}" | Page: ${params.pageToken ? 'YES' : 'NO'} | MaxResults: ${params.maxResults || 'default'} | Cost: $${API_COSTS.textSearch.toFixed(3)} | Function: ${params.functionName || 'unknown'}`
    );
  }

  /**
   * Log a place details API call
   */
  logPlaceDetails(params: {
    place_id: string;
    functionName?: string;
  }) {
    const call: PlacesApiCall = {
      timestamp: Date.now(),
      apiType: 'placeDetails',
      estimatedCostUSD: API_COSTS.placeDetails,
      functionName: params.functionName,
      place_id: params.place_id,
    };

    this.recordCall(call);

    logger.warn(
      `⚠️ [Places API] PLACE DETAILS (EXPENSIVE): ${params.place_id} | Cost: $${API_COSTS.placeDetails.toFixed(3)} | Function: ${params.functionName || 'unknown'}`
    );
  }

  /**
   * Log a nearby search API call
   */
  logNearbySearch(params: {
    location?: string;
    radius?: number;
    functionName?: string;
  }) {
    const call: PlacesApiCall = {
      timestamp: Date.now(),
      apiType: 'nearbySearch',
      estimatedCostUSD: API_COSTS.nearbySearch,
      functionName: params.functionName,
    };

    this.recordCall(call);

    logger.warn(
      `⚠️ [Places API] NEARBY SEARCH (EXPENSIVE): ${params.location || 'unknown'} | Cost: $${API_COSTS.nearbySearch.toFixed(3)} | Function: ${params.functionName || 'unknown'}`
    );
  }

  /**
   * Record a call and update stats
   */
  private recordCall(call: PlacesApiCall) {
    sessionStats.totalCalls++;
    sessionStats.totalEstimatedCost += call.estimatedCostUSD;

    // Track by type
    sessionStats.callsByType[call.apiType] = (sessionStats.callsByType[call.apiType] || 0) + 1;
    sessionStats.costByType[call.apiType] = (sessionStats.costByType[call.apiType] || 0) + call.estimatedCostUSD;

    // Track by function
    if (call.functionName) {
      sessionStats.callsByFunction[call.functionName] = (sessionStats.callsByFunction[call.functionName] || 0) + 1;
    }
  }

  /**
   * Log summary to Firebase logger
   */
  logSummary() {
    logger.info('📊 Google Places API Usage Summary (this instance)');
    logger.info(`Total Calls: ${sessionStats.totalCalls}`);
    logger.info(`Estimated Cost: $${sessionStats.totalEstimatedCost.toFixed(2)}`);
    logger.info('By API Type:', sessionStats.callsByType);
    logger.info('Cost by Type:', Object.fromEntries(
      Object.entries(sessionStats.costByType).map(([k, v]) => [k, `$${v.toFixed(2)}`])
    ));
    logger.info('By Function:', sessionStats.callsByFunction);
  }

  /**
   * Get current stats
   */
  getStats() {
    return { ...sessionStats };
  }

  /**
   * Reset stats (for testing)
   */
  resetStats() {
    sessionStats = {
      totalCalls: 0,
      totalEstimatedCost: 0,
      callsByType: {},
      costByType: {},
      callsByFunction: {},
    };
    logger.info('✅ Places API stats reset');
  }
}

// Singleton instance
export const placesApiLogger = new PlacesApiLogger();

// Log summary on function termination (best-effort)
process.on('beforeExit', () => {
  if (sessionStats.totalCalls > 0) {
    placesApiLogger.logSummary();
  }
});
