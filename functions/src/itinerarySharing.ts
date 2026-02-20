import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import express from "express";
import logger from './utils/logger';

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const app = express();

// Helper function to detect social media crawlers
function isSocialMediaCrawler(userAgent: string): boolean {
  const crawlerPatterns = [
    /facebookexternalhit/i,
    /twitterbot/i,
    /linkedinbot/i,
    /whatsapp/i,
    /telegrambot/i,
    /slackbot/i,
    /discordbot/i,
    /skype/i,
    /pinterest/i,
    /redditbot/i,
    /applebot/i,
    /googlebot/i,
    /bingbot/i
  ];
  return crawlerPatterns.some(pattern => pattern.test(userAgent));
}

// Helper function to generate HTML for itinerary sharing
function generateItineraryHTML(itinerary: any, itineraryId: string): string {
  const itineraryData = itinerary?.response?.data?.itinerary;
  const costBreakdown = itinerary?.response?.data?.costBreakdown;
  const metadata = itinerary?.response?.data?.metadata;
  const recommendations = itinerary?.response?.data?.recommendations;
  
  const destination = itineraryData?.destination || itinerary.destination || 'Travel Itinerary';
  const startDate = itineraryData?.startDate || itinerary.startDate;
  const endDate = itineraryData?.endDate || itinerary.endDate;
  // Use the personalized description if available (could be at multiple locations)
  const description = itineraryData?.description || itinerary.description || itinerary.personalizedMessage || `AI-generated travel itinerary for ${destination}`;
  const dailyData = itineraryData?.days || itineraryData?.dailyPlans;

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric', 
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatLongDate = (dateString: string) => {
    if (!dateString) return 'Date not specified';
    try {
      const date = dateString.includes('T') 
        ? new Date(dateString)
        : new Date(dateString + 'T12:00:00');
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
      });
    } catch {
      return dateString;
    }
  };

  const formatPrice = (amount: number, currency: string = 'USD') => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
    } catch {
      return `${currency} ${amount}`;
    }
  };

  const appUrl = 'https://travalpass.com';
  // Use the public site URL for canonical shares and social previews
  const shareUrl = `${appUrl}/share-itinerary/${itineraryId}`;
  // Prefer recommendations only. Do NOT use externalData or vendorRaw fallbacks for
  // prices or invented data. However, it's acceptable to use vendorRaw/vendorRaw.details
  // as a fallback for official website/booking URL when an explicit `bookingUrl` is
  // not provided in `recommendations`. This preserves the "no price fallbacks" rule
  // while allowing the shared page to link to the hotel's official site when available.
  const flightList = (recommendations && recommendations.flights && recommendations.flights.length > 0)
    ? recommendations.flights
    : [];
  const accommodationsList = (recommendations && recommendations.accommodations && recommendations.accommodations.length > 0)
    ? recommendations.accommodations
    : [];

  // Choose a preview image for social link previews. Prefer the first accommodation
  // photo when available, then any metadata-provided preview image, then a site fallback.
  const firstAccommodation = accommodationsList && accommodationsList.length > 0 ? accommodationsList[0] : null;
  const firstAccPhoto = firstAccommodation
    ? (firstAccommodation.photos && firstAccommodation.photos.length > 0 ? firstAccommodation.photos[0]
       : (firstAccommodation.vendorRaw && firstAccommodation.vendorRaw.photos && firstAccommodation.vendorRaw.photos.length > 0 ? firstAccommodation.vendorRaw.photos[0] : null))
    : null;
  const previewImage = firstAccPhoto || (metadata && metadata.previewImage) || `${appUrl}/og-image.png`;

  // Direct assumptions object saved by the generator (contains providers, steps, tips)
  const assumptions = itinerary?.response?.data?.assumptions;

  // Use the same transport access the frontend uses and render properties directly
  let rawTransport = (itinerary?.response?.data?.transportation ?? itinerary?.response?.data?.recommendations?.transportation) as any;
  
  // Handle nested transportation format where transportation object contains another transportation object
  if (rawTransport && rawTransport.transportation && typeof rawTransport.transportation === 'object') {
    rawTransport = rawTransport.transportation;
  }

  // Normalize a variety of key names that the AI or saved docs might use
  const getFirst = (obj: any, ...keys: string[]) => {
    if (!obj) return null;
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return null;
  };

  const mode = getFirst(rawTransport, 'mode', 'transportationMode');
  // estimated time may be a string or a numeric hours field
  const estimatedTimeRaw = getFirst(rawTransport, 'estimatedTime', 'estimated_time', 'estimated_duration_hours', 'estimatedDurationHours');
  const estimatedTime = typeof estimatedTimeRaw === 'number' ? `${estimatedTimeRaw} hours` : estimatedTimeRaw;
  // estimated distance may be provided in miles or a string
  const estimatedDistanceRaw = getFirst(rawTransport, 'estimatedDistance', 'estimated_distance', 'estimated_distance_miles', 'estimatedDistanceMiles');
  const estimatedDistance = typeof estimatedDistanceRaw === 'number' ? `${estimatedDistanceRaw} miles` : estimatedDistanceRaw;
  // estimated cost may be numeric, object, or a usd-specific field
  const estimatedCostRaw = getFirst(rawTransport, 'estimatedCost', 'estimated_cost', 'estimated_cost_usd', 'estimatedCostUsd');
  let estimatedCostDisplay = null;
  if (estimatedCostRaw !== null && estimatedCostRaw !== undefined) {
    if (typeof estimatedCostRaw === 'object' && (estimatedCostRaw.amount || estimatedCostRaw.price)) {
      const amt = estimatedCostRaw.amount ?? estimatedCostRaw.price;
      const cur = estimatedCostRaw.currency || 'USD';
      estimatedCostDisplay = typeof amt === 'number' ? `${amt} ${cur}` : `${amt}`;
    } else {
      estimatedCostDisplay = String(estimatedCostRaw);
    }
  }

  const providers = getFirst(rawTransport, 'providers', 'provider');
  const tips = getFirst(rawTransport, 'tips');

  let transportHTML = '';
    // Show Travel Recommendations if:
    // 1. Transport data exists with useful content (steps/tips/providers), regardless of mode
    // 2. OR assumptions exist with content
    // 3. OR transport has a mode that's not 'flight'
    
    const transportProviders = providers && (Array.isArray(providers) ? providers : [providers]) || [];
    const transportTips = tips && (Array.isArray(tips) ? tips : [tips]) || [];
    const transportSteps = rawTransport && Array.isArray(rawTransport.steps) ? rawTransport.steps : [];
    
    const hasTransportContent = Boolean(
      rawTransport && (
        transportProviders.length > 0 ||
        transportTips.length > 0 ||
        transportSteps.length > 0 ||
        (mode && String(mode).toLowerCase() !== 'flight')
      )
    );
    
    const hasAssumptionsContent = Boolean(
      assumptions && (
        (assumptions.providers && assumptions.providers.length > 0) ||
        (assumptions.steps && assumptions.steps.length > 0) ||
        (assumptions.tips && assumptions.tips.length > 0)
      )
    );
    
    const shouldShowRecommendations = hasTransportContent || hasAssumptionsContent;
    
    logger.info('[itineraryShare] Transport data check:', {
      hasRawTransport: !!rawTransport,
      mode: mode,
      transportProvidersCount: transportProviders.length,
      transportTipsCount: transportTips.length,
      transportStepsCount: transportSteps.length,
      hasTransportContent,
      hasAssumptionsContent,
      shouldShowRecommendations
    });
    
    if (shouldShowRecommendations) {
    // If the generator saved additional assumptions on the itinerary, prefer showing
    // those provider/steps/tips alongside any transport-level providers. Do not
    // surface assumptions when there's no transport — they should appear with
    // transport recommendations only.
    const assumptionProviders = assumptions && Array.isArray(assumptions.providers) ? assumptions.providers : [];
    const transportProviders = providers && Array.isArray(providers) ? providers : (providers ? [providers] : []);

    // Combine and dedupe providers by URL when available, otherwise by name.
    const mergedProvidersRaw = [...transportProviders, ...assumptionProviders];
    const providerKey = (p: any) => (p && (p.url || p.website || p.link || p.bookingUrl || (p.details && p.details.website))) || (typeof p === 'string' ? p : (p && p.name) || JSON.stringify(p));
    const seen = new Set<string>();
    const combinedProviders: Array<any> = [];
    for (const p of mergedProvidersRaw) {
      const key = providerKey(p) || '';
      if (!seen.has(key)) {
        seen.add(key);
        combinedProviders.push(p);
      }
    }

    const assumptionSteps = assumptions && Array.isArray(assumptions.steps) ? assumptions.steps : [];
    const transportSteps = rawTransport && Array.isArray(rawTransport.steps) ? rawTransport.steps : [];
    // Combine and dedupe steps/tips preserving order
    const combinedSteps = [...transportSteps, ...assumptionSteps].filter(Boolean).reduce((acc: string[], s) => {
      if (!acc.includes(s)) acc.push(s);
      return acc;
    }, [] as string[]);

    const transportTips = tips && (Array.isArray(tips) ? tips : [tips]) || [];
    const assumptionTips = assumptions && (Array.isArray(assumptions.tips) ? assumptions.tips : (assumptions.tips ? [assumptions.tips] : [])) || [];
    const combinedTips = [...transportTips, ...assumptionTips].filter(Boolean).reduce((acc: string[], t) => {
      if (!acc.includes(t)) acc.push(t);
      return acc;
    }, [] as string[]);

    // Render provider links as underlined white links (match frontend style)
    const renderProviderLink = (p: any) => {
      const name = typeof p === 'string' ? p : (p && (p.name || p.title || p.provider || p.label)) || 'Provider';
      const url = typeof p === 'string' ? null : (p && (p.bookingUrl || p.website || p.url || (p.details && p.details.website) || p.link)) || null;
      if (url) {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: white; text-decoration: underline;">${name}</a>`;
      }
      return `<span style="color: white;">${name}</span>`;
    };

    transportHTML = `
      <div class="details-section">
        <div class="accordion">
          <div class="accordion-header">
            <button class="accordion-toggle" aria-expanded="false" aria-controls="transport-panel">🚗 Travel Recommendations</button>
          </div>
          <div id="transport-panel" class="accordion-content" hidden>
            <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 16px; margin-bottom: 12px;">
              <h3 style="color: white; margin-bottom: 16px;">🚗 Transportation Details</h3>
              <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 16px;">
                ${mode ? `<span class="chip">Mode: ${mode}</span>` : ''}
                ${estimatedTime ? `<span class="chip">Estimated Time: ${estimatedTime}</span>` : ''}
                ${estimatedDistance ? `<span class="chip">Estimated Distance: ${estimatedDistance}</span>` : ''}
                ${estimatedCostDisplay ? `<span class="chip">Estimated Cost: ${estimatedCostDisplay}</span>` : ''}
              </div>

              ${combinedSteps.length > 0 ? `<div style="margin-top:8px; text-align: left;"><strong>Steps:</strong><ol style="color: rgba(255,255,255,0.9); margin-left: 20px;">${combinedSteps.map((s: any) => `<li style="margin-bottom:6px; text-align: left;">${s}</li>`).join('')}</ol></div>` : ''}

              ${combinedTips.length > 0 ? `<div style="color: rgba(255, 255, 255, 0.9); margin-top: 16px; text-align: left;"><strong>Tips:</strong><div style="margin-top:8px;">${combinedTips.map(t => `<div style="margin-bottom:6px;">${t}</div>`).join('')}</div></div>` : ''}

              ${combinedProviders.length > 0 ? `<div style="margin-top:12px; text-align: left;"><strong>Providers:</strong><div style="margin-top:8px; display:flex; flex-direction: column; gap:6px;">${combinedProviders.map(p => `<div>${renderProviderLink(p)}</div>`).join('')}</div></div>` : ''}

            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${destination} - TravalPass AI Itinerary</title>
      
      <!-- Basic Meta Tags -->
      <meta name="description" content="${description.substring(0, 160)}">
      
      <!-- Open Graph Meta Tags for Facebook/LinkedIn -->
      <meta property="og:title" content="${destination} - AI Travel Itinerary">
      <meta property="og:description" content="${description.substring(0, 300)}">
      <meta property="og:url" content="${shareUrl}">
  <meta property="og:image" content="${previewImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${destination} travel preview">
      <meta property="og:type" content="website">
      <meta property="og:site_name" content="TravalPass.com">
      
      <!-- Twitter Card Meta Tags -->
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="${destination} - AI Travel Itinerary">
      <meta name="twitter:description" content="${description.substring(0, 200)}">
  <meta name="twitter:image" content="${previewImage}">
  <link rel="image_src" href="${previewImage}">
      
      <!-- Mobile optimization -->
      <meta name="theme-color" content="#1976d2">
      
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #0a0a0a;
          background-image: radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3), transparent 50%), 
                          radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3), transparent 50%), 
                          radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.3), transparent 50%);
          color: white;
          min-height: 100vh;
          padding: 16px;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .brand-header {
          text-align: center;
          margin-bottom: 24px;
          padding: 24px;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .brand-title {
          font-size: 2.5rem;
          font-weight: bold;
          margin-bottom: 8px;
        }
        
        .brand-subtitle {
          color: rgba(255, 255, 255, 0.8);
          font-size: 1rem;
        }
        
        .itinerary-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 24px;
          margin-bottom: 24px;
        }
        
        .destination {
          font-size: 2rem;
          font-weight: bold;
          margin-bottom: 8px;
          text-align: center;
        }
        
        .dates {
          color: rgba(255, 255, 255, 0.7);
          text-align: center;
          margin-bottom: 16px;
          font-size: 1.1rem;
        }
        
        .description {
          font-style: italic;
          color: white;
          text-align: center;
          line-height: 1.6;
          margin-bottom: 24px;
        }
        
        .cta-section {
          text-align: center;
          padding: 32px 24px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .cta-title {
          font-size: 1.5rem;
          margin-bottom: 8px;
        }
        
        .cta-subtitle {
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 24px;
        }
        
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #1976d2, #42a5f5);
          color: white;
          text-decoration: none;
          padding: 16px 32px;
          border-radius: 8px;
          font-weight: bold;
          font-size: 1.1rem;
          transition: transform 0.2s ease;
        }
        
        .cta-button:hover {
          transform: translateY(-2px);
        }
        
        .travalpass-brand {
          font-size: 1.5rem;
          font-weight: bold;
          color: rgba(33, 150, 243, 0.9);
          margin-top: 16px;
        }
        
        .details-section {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 24px;
          margin-bottom: 24px;
        }
        
        .section-title {
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .cost-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        
        .cost-item h3 {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
          margin-bottom: 4px;
        }
        
        .cost-item .amount {
          font-size: 1.5rem;
          font-weight: bold;
          color: white;
        }
        
        .day-card {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 20px;
          margin-bottom: 16px;
        }
        
        .day-header {
          font-size: 1.25rem;
          font-weight: bold;
          margin-bottom: 16px;
          color: white;
        }
        
        .activity-card {
          background: rgba(33, 150, 243, 0.1);
          border: 1px solid rgba(33, 150, 243, 0.3);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 12px;
        }
        
        .meal-card {
          background: rgba(76, 175, 80, 0.1);
          border: 1px solid rgba(76, 175, 80, 0.3);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 12px;
        }
        
        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        
        .card-title {
          font-weight: bold;
          color: white;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .card-badge {
          background: rgba(255, 255, 255, 0.2);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8rem;
          color: white;
        }
        
        .card-details {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
          line-height: 1.4;
        }
        
        .flight-card, .hotel-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 12px;
          display: grid;
          grid-template-columns: 2fr 3fr 1fr;
          gap: 16px;
          align-items: center;
        }
        
        .chip {
          display: inline-block;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 4px;
          padding: 4px 8px;
          font-size: 0.8rem;
          color: white;
          margin: 2px;
        }
        
        .website-link {
          color: #42a5f5;
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s ease;
        }
        
        .website-link:hover {
          color: #66bb6a;
          text-decoration: underline;
        }

          /* Accordion styles */
          .accordion { margin-bottom: 16px; }
          .accordion-header { display:flex; }
          .accordion-toggle {
            width:100%;
            text-align:left;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.06);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 1rem;
            cursor: pointer;
          }
          /* Add a visual caret so users know the section is expandable */
          .accordion-toggle::after {
            content: '▾';
            float: right;
            font-size: 1.1rem;
            color: rgba(255,255,255,0.9);
            transition: transform 0.2s ease;
            transform-origin: center;
          }
          .accordion-toggle[aria-expanded="true"] { background: rgba(255,255,255,0.06); }
          .accordion-toggle[aria-expanded="true"]::after { transform: rotate(180deg); }
          .accordion-content { margin-top: 8px; }
        
        @media (max-width: 768px) {
          .brand-title {
            font-size: 1.8rem;
          }
          
          .destination {
            font-size: 1.5rem;
          }
          
          .dates {
            font-size: 1rem;
          }
          
          .cta-title {
            font-size: 1.25rem;
          }
          
          .cta-button {
            padding: 12px 24px;
            font-size: 1rem;
          }
          
          .cost-grid {
            grid-template-columns: 1fr;
          }
          
          .flight-card, .hotel-card {
            grid-template-columns: 1fr;
            text-align: center;
          }
          
          .details-section {
            padding: 16px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- TravalPass Branding Header -->
        <div class="brand-header">
          <div class="brand-title">🌍 TravalPass</div>
          <div class="brand-subtitle">AI-Generated Travel Itinerary</div>
        </div>

        <!-- Itinerary Header -->
        <div class="itinerary-card">
          <div class="destination">${destination}</div>
          ${startDate && endDate ? `<div class="dates">${formatLongDate(startDate)} - ${formatLongDate(endDate)}</div>` : ''}
          ${description ? `<div class="description">"${description}"</div>` : ''}
          
          ${metadata ? `
            <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 16px;">
              ${metadata.confidence ? `<span class="chip">Confidence: ${Math.round(metadata.confidence * 100)}%</span>` : ''}
              ${metadata.aiModel ? `<span class="chip">${metadata.aiModel}</span>` : ''}
              ${metadata.processingTime ? `<span class="chip">Generated in ${Math.round(metadata.processingTime / 1000)}s</span>` : ''}
            </div>
          ` : ''}
        </div>

        <!-- Cost Breakdown -->
        ${costBreakdown && costBreakdown.total ? `
          <div class="details-section">
            <div class="section-title">💰 Cost Breakdown - ${formatPrice(costBreakdown.total)} Total</div>
            <div class="cost-grid">
              <div class="cost-item">
                <h3>Total Cost</h3>
                <div class="amount">${formatPrice(costBreakdown.total)}</div>
              </div>
              <div class="cost-item">
                <h3>Per Person</h3>
                <div class="amount">${formatPrice(costBreakdown.perPerson || 0)}</div>
              </div>
            </div>
            ${costBreakdown.byCategory ? `
              <div>
                <h3 style="margin-bottom: 8px; color: white;">By Category</h3>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  ${Object.entries(costBreakdown.byCategory).map(([category, amount]) => 
                    `<span class="chip">${category}: ${formatPrice(amount as number)}</span>`
                  ).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Flights -->
        ${flightList && flightList.length > 0 ? `
          <div class="details-section">
            <div class="accordion">
              <div class="accordion-header">
                <button class="accordion-toggle" aria-expanded="false" aria-controls="flights-panel">✈️ Flight Options (${flightList.length})</button>
              </div>
              <div id="flights-panel" class="accordion-content" hidden>
            ${flightList.map((flight: any) => `
              <div class="flight-card">
                <div>
                  <div style="font-weight: bold; color: white;">${flight.airline || 'Airline'}</div>
                  <div style="color: rgba(255, 255, 255, 0.7); font-size: 0.9rem;">${flight.flightNumber || 'Flight'}</div>
                </div>
                <div>
                  <div style="color: rgba(255, 255, 255, 0.8);">${flight.route || `${flight.departure?.airport || 'DEP'} → ${flight.arrival?.airport || 'ARR'}`}</div>
                  <div style="color: rgba(255, 255, 255, 0.6); font-size: 0.9rem;">Duration: ${flight.duration || 'N/A'} • Stops: ${flight.stops || 0}</div>
                </div>
                ${flight.price?.amount ? `
                <div style="text-align: right;">
                  <div style="font-weight: bold; color: white; font-size: 1.2rem;">${formatPrice(flight.price.amount, flight.price.currency)}</div>
                </div>
                ` : ''}
              </div>
            `).join('')}
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Hotels -->
        ${accommodationsList && accommodationsList.length > 0 ? `
          <div class="details-section">
            <div class="accordion">
              <div class="accordion-header">
                <button class="accordion-toggle" aria-expanded="false" aria-controls="hotels-panel">🏨 Hotels (${accommodationsList.length})</button>
              </div>
              <div id="hotels-panel" class="accordion-content" hidden>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
              ${accommodationsList.map((accommodation: any) => {
                // Match React app price structure exactly: only render a numeric price when present
                const priceAmount = accommodation.pricePerNight?.amount ?? accommodation.price?.amount ?? accommodation.priceAmount;
                const priceCurrency = accommodation.pricePerNight?.currency ?? accommodation.price?.currency ?? 'USD';
                let priceDisplay = '';

                if (typeof priceAmount === 'number') {
                  priceDisplay = formatPrice(priceAmount, priceCurrency);
                }

                // Match React app website structure and include booking link when present.
                // Allow fallbacks for booking URL from vendorRaw.details (Place Details) or vendorRaw fields,
                // or a Google Maps place URL when placeId is present. Do NOT fall back for price.
                const vendorDetails = accommodation.vendorRaw && (accommodation.vendorRaw.details || accommodation.vendorRaw);
                const mapsPlaceUrl = accommodation.placeId ? `https://www.google.com/maps/place/?q=place_id:${accommodation.placeId}` : null;
                const bookingLink = accommodation.bookingUrl || accommodation.website || vendorDetails?.website || vendorDetails?.url || mapsPlaceUrl || null;
                const hotelName = accommodation.name || accommodation.vendorRaw?.name || (accommodation.location?.name) || 'Hotel';
                // Use first photo when present (match frontend behavior)
                const photoUrl = accommodation.photos && Array.isArray(accommodation.photos) && accommodation.photos.length > 0 ? accommodation.photos[0] : (accommodation.vendorRaw && accommodation.vendorRaw.photos && accommodation.vendorRaw.photos.length > 0 ? accommodation.vendorRaw.photos[0] : null);

                // Render the hotel as a card with a full-bleed background image and gradient overlay (match frontend)
                return `
                <div class="hotel-card" style="grid-template-columns: 1fr; border-radius:8px; overflow:hidden; position:relative;">
                  <div style="width:100%; display:block; padding-top:95%;"></div>
                  ${photoUrl ? `<div style="position:absolute; inset:0; background-image: url('${photoUrl}'); background-size: cover; background-position: center;"></div>` : `<div style="position:absolute; inset:0; background-color: #111;"></div>`}
                  <div style="position:absolute; left:0; right:0; bottom:0; padding:16px; background: linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0.08)); color: white;">
                    <div style="font-weight: bold; color: white; margin-bottom: 4px; font-size:1.05rem;">${hotelName}</div>
                    ${accommodation.address ? `<div style="color: rgba(255, 255, 255, 0.8); margin-bottom: 8px; font-size:0.9rem;">${accommodation.address}</div>` : ''}
                    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                      <div style="background: rgba(255,255,255,0.08); padding:4px 8px; border-radius:4px; color:white; font-size:0.85rem;">⭐ ${accommodation.rating ?? accommodation.starRating ?? 'N/A'}</div>
                      <div style="background: rgba(255,255,255,0.08); padding:4px 8px; border-radius:4px; color:white; font-size:0.85rem;">${accommodation.userRatingsTotal ?? accommodation.user_ratings_total ?? 0} reviews</div>
                      ${priceDisplay ? `<div style="background: rgba(255,255,255,0.08); padding:4px 8px; border-radius:4px; color:white; font-size:0.95rem; font-weight:bold;">${priceDisplay}</div>` : ''}
                      ${bookingLink ? `<a href="${bookingLink}" target="_blank" style="margin-left:auto; display:inline-block; padding:8px 12px; background:#1976d2; color:white; text-decoration:none; border-radius:6px; font-weight:600;">Book</a>` : ''}
                    </div>
                  </div>
                </div>
                `;
              }).join('')}
            </div>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Travel Recommendations Section - For non-flight transportation -->
        ${transportHTML}

        <!-- Note: assumptions (providers/steps/tips) are rendered inside the Transportation Details when transport exists -->

        <!-- Daily Itinerary -->
        ${dailyData && dailyData.length > 0 ? `
          <div class="details-section">
            <div class="accordion">
              <div class="accordion-header">
                <button class="accordion-toggle" aria-expanded="false" aria-controls="daily-panel">📅 Daily Itinerary</button>
              </div>
              <div id="daily-panel" class="accordion-content" hidden>
            ${dailyData.map((day: any, index: number) => `
              <div class="day-card">
                <div class="day-header">
                  Day ${index + 1} - ${formatLongDate(day.date)}
                  <span style="font-size: 0.8rem; font-weight: normal; color: rgba(255, 255, 255, 0.7);">
                    (${(day.activities?.length || 0) + (day.meals?.length || 0)} items)
                  </span>
                </div>
                
                ${day.activities ? day.activities.map((activity: any) => {
                  // Match React app price structure exactly
                  const priceAmount = activity.estimatedCost?.amount ?? activity.estimatedCost?.price ?? activity.price?.amount ?? activity.priceAmount;
                  const priceCurrency = activity.estimatedCost?.currency ?? activity.price?.currency ?? 'USD';
                  let priceDisplay = 'Price TBD';
                  
                  if (typeof priceAmount === 'number') {
                    priceDisplay = formatPrice(priceAmount, priceCurrency);
                  } else {
                    const lvl = activity.price_level ?? activity.priceLevel ?? activity.estimatedCost?.price_level;
                    if (lvl !== undefined && lvl !== null) {
                      priceDisplay = '$'.repeat(Math.max(1, Math.min(4, Number(lvl) || 1)));
                    }
                  }
                  
                  // Only use explicit fields present on the activity. No vendorRaw/external fallbacks.
                  const activityWebsite = activity.website || null;
                  const activityBookingUrl = activity.bookingUrl || null;
                  const activityLocationName = activity.location?.name || null;
                  const activityLocationAddress = activity.location?.address || null;
                  const activityDuration = activity.duration || activity.timing?.duration || null;
                  const activityRating = activity.rating ?? null;
                  
                  // Extract insider tips - check both snake_case and camelCase
                  const insiderTip = activity.insider_tip || activity.insiderTip || (activity.tips && Array.isArray(activity.tips) && activity.tips.length > 0 ? activity.tips[0] : activity.tips) || (activity.recommendations && activity.recommendations.length > 0 ? activity.recommendations[0] : null);
                  
                  // Generate Google Maps link if we have location data
                  // Check multiple possible field names for place ID (place_id, placeId, external.place_id)
                  let googleMapsLink = null;
                  const placeId = activity.place_id || activity.placeId || activity.external?.place_id || null;
                  if (placeId) {
                    googleMapsLink = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
                  } else if (activity.location?.coordinates?.lat && activity.location?.coordinates?.lng) {
                    googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${activity.location.coordinates.lat},${activity.location.coordinates.lng}`;
                  } else if (activity.external?.coordinates?.lat && activity.external?.coordinates?.lng) {
                    googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${activity.external.coordinates.lat},${activity.external.coordinates.lng}`;
                  } else if (activityLocationAddress) {
                    googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activityLocationAddress)}`;
                  } else if (activity.location?.name) {
                    googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.location.name)}`;
                  } else if (activity.name) {
                    googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.name + ' ' + destination)}`;
                  }

                  return `
                    <div class="activity-card">
                          <div class="card-header">
                            <div class="card-title">
                              <span>🎯</span>
                              <span>${activity.name || activity.external?.name || 'Activity'}</span>
                            </div>
                            ${priceDisplay ? `<div class="card-badge">${priceDisplay}</div>` : ''}
                          </div>
                      ${activity.description ? `<div class="card-details" style="margin-bottom: 8px;">${activity.description}</div>` : ''}
                      <div class="card-details">
                        ${activity.timing?.startTime || activity.startTime || ''} ${activity.timing?.endTime || activity.endTime ? '- ' + (activity.timing?.endTime || activity.endTime) : ''}
                        ${activityLocationName ? ` • ${activityLocationName}` : ''}
                        ${activityLocationAddress ? ` • ${activityLocationAddress}` : ''}
                      </div>
                      ${activityDuration ? `<div class="card-details" style="margin-top: 4px;">Duration: ${activityDuration}</div>` : ''}
                      ${activityRating ? `<div class="card-details" style="margin-top: 4px;">Rating: ${activityRating}</div>` : ''}
                      ${googleMapsLink ? `<div style="margin-top: 8px;"><a href="${googleMapsLink}" target="_blank" rel="noopener noreferrer" class="website-link">📍 View on Google Maps</a></div>` : ''}
                      ${activityWebsite ? `<div style="margin-top: 4px;"><a href="${activityWebsite}" target="_blank" rel="noopener noreferrer" class="website-link">🌐 Visit Website</a></div>` : ''}
                      ${activityBookingUrl ? `<div style="margin-top: 4px;"><a href="${activityBookingUrl}" target="_blank" rel="noopener noreferrer" class="website-link">🎫 Book Now</a></div>` : ''}
                      ${insiderTip ? `<div style="margin-top: 12px; padding: 12px; background: rgba(255, 152, 0, 0.15); border-left: 3px solid #ff9800; border-radius: 4px;"><div style="color: #ff9800; font-weight: bold; margin-bottom: 4px; font-size: 0.85rem;">💡 Insider tip:</div><div style="color: rgba(255, 255, 255, 0.9); font-size: 0.9rem;">${insiderTip}</div></div>` : ''}
                    </div>
                    `;
                }).join('') : ''}
                
                  ${day.meals ? day.meals.map((meal: any) => {
                    const restaurant = meal.restaurant || {};
                    // Only show links when explicit fields are present on the meal/restaurant object
                    const restaurantPhone = restaurant.phone || meal.bookingInfo?.phone || null;
                    const restaurantWebsite = restaurant.website || meal.bookingInfo?.website || null;
                    const restaurantBooking = restaurant.bookingUrl || meal.bookingInfo?.reservationUrl || null;
                    const restaurantLocation = restaurant.location || meal.location || null;
                    
                    // Generate Google Maps link for restaurant
                    let googleMapsLink = null;
                    const mealPlaceId = restaurant.place_id || meal.place_id || restaurant.placeId || meal.placeId || restaurant.external?.place_id || null;
                    if (mealPlaceId) {
                      googleMapsLink = `https://www.google.com/maps/place/?q=place_id:${mealPlaceId}`;
                    } else if (restaurantLocation?.coordinates?.lat && restaurantLocation?.coordinates?.lng) {
                      googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${restaurantLocation.coordinates.lat},${restaurantLocation.coordinates.lng}`;
                    } else if (restaurant.external?.coordinates?.lat && restaurant.external?.coordinates?.lng) {
                      googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${restaurant.external.coordinates.lat},${restaurant.external.coordinates.lng}`;
                    } else if (restaurantLocation?.address || restaurant.address) {
                      const address = restaurantLocation?.address || restaurant.address;
                      googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
                    } else if (restaurant.name || meal.name) {
                      const name = restaurant.name || meal.name;
                      googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + destination)}`;
                    }

                    return `
                  <div class="meal-card">
                    <div class="card-header">
                      <div class="card-title">
                        <span>🍽️</span>
                        <span>${restaurant.name || meal.name || 'Restaurant'}</span>
                      </div>
                      <div class="card-badge">${meal.type?.charAt(0).toUpperCase() + meal.type?.slice(1) || 'Meal'}</div>
                    </div>
                    <div class="card-details">
                      ${meal.timing?.time || meal.time || ''}
                      ${restaurant.cuisine ? ` • ${restaurant.cuisine} Cuisine` : ''}
                      ${restaurant.priceRange ? ` • ${restaurant.priceRange}` : ''}
                      ${restaurantLocation?.address || restaurant.address ? ` • ${restaurantLocation?.address || restaurant.address}` : ''}
                    </div>
                    <div style="margin-top:8px;">
                      ${googleMapsLink ? `<a href="${googleMapsLink}" target="_blank" rel="noopener noreferrer" class="website-link">📍 View on Google Maps</a>` : ''}
                      ${restaurantPhone ? ` <a href="tel:${restaurantPhone}" class="website-link">📞 Call</a>` : ''}
                      ${restaurantWebsite ? ` <a href="${restaurantWebsite}" target="_blank" rel="noopener noreferrer" class="website-link">🌐 Website</a>` : ''}
                      ${restaurantBooking ? ` <a href="${restaurantBooking}" target="_blank" rel="noopener noreferrer" class="website-link">🎫 Book</a>` : ''}
                    </div>
                  </div>
                `}).join('') : ''}
              </div>
            `).join('')}
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Call to Action -->
          <div class="cta-section">
          <div class="cta-title">✨ Create Your Own AI Travel Itinerary</div>
          <div class="cta-subtitle">Get personalized travel recommendations powered by AI</div>
          <a href="${appUrl}" class="cta-button">Get Started on TravalPass</a>
                    <div class="travalpass-brand"><a href="${appUrl}" style="color: rgba(33, 150, 243, 0.9); text-decoration: none;">🌍 TravalPass.com</a></div>
        </div>
      </div>
    </body>
      <script>
        (function(){
          function toggle(e){
            var btn = e.currentTarget;
            var expanded = btn.getAttribute('aria-expanded') === 'true';
            var panelId = btn.getAttribute('aria-controls');
            var panel = document.getElementById(panelId);
            if(!panel) return;
            btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
            if(expanded){ panel.setAttribute('hidden',''); }
            else { panel.removeAttribute('hidden'); }
          }
          document.querySelectorAll('.accordion-toggle').forEach(function(b){ b.addEventListener('click', toggle); });
        })();
      </script>
    </html>
  `;
}

// Express route handler for itinerary sharing
// Lightweight JSON preview endpoint for programmatic link previews (mobile apps, bots)
app.get('/share-itinerary/:itineraryId/preview.json', async (req, res) => {
  try {
    const itineraryId = req.params.itineraryId;

    // Fetch itinerary from Firestore
    const itineraryDoc = await db.collection('itineraries').doc(itineraryId).get();
    if (!itineraryDoc.exists) {
      return res.status(404).json({ success: false, error: 'Itinerary not found' });
    }

    const itinerary = itineraryDoc.data();
    const itineraryData = itinerary?.response?.data?.itinerary;
    const metadata = itinerary?.response?.data?.metadata;
    const recommendations = itinerary?.response?.data?.recommendations;

  const safeItinerary = itinerary || {};
  const destination = itineraryData?.destination || safeItinerary.destination || 'Travel Itinerary';
  const startDate = itineraryData?.startDate || safeItinerary.startDate || null;
  const endDate = itineraryData?.endDate || safeItinerary.endDate || null;
  const description = itineraryData?.description || `AI-generated travel itinerary for ${destination}`;

    const accommodationsList = (recommendations && recommendations.accommodations && recommendations.accommodations.length > 0)
      ? recommendations.accommodations
      : [];

    const firstAccommodation = accommodationsList && accommodationsList.length > 0 ? accommodationsList[0] : null;
    const firstAccPhoto = firstAccommodation
      ? (firstAccommodation.photos && firstAccommodation.photos.length > 0 ? firstAccommodation.photos[0]
         : (firstAccommodation.vendorRaw && firstAccommodation.vendorRaw.photos && firstAccommodation.vendorRaw.photos.length > 0 ? firstAccommodation.vendorRaw.photos[0] : null))
      : null;
  const appUrl = 'https://travalpass.com';
  const shareUrl = `${appUrl}/share-itinerary/${itineraryId}`;
    const previewImage = firstAccPhoto || (metadata && metadata.previewImage) || `${appUrl}/og-image.png`;

    // Cache for a short period to allow quick revalidation
    res.set('Cache-Control', 'public, max-age=300');
    return res.json({
      success: true,
      data: {
        id: itineraryId,
        title: `${destination} - AI Travel Itinerary`,
        description: description.substring(0, 300),
        startDate,
        endDate,
        image: previewImage,
        url: shareUrl,
        previewType: 'summary_large_image'
      }
    });
  } catch (err) {
    logger.error('[itineraryShare][preview] Error fetching preview', err);
    return res.status(500).json({ success: false, error: 'Internal error' });
  }
});

app.get('/share-itinerary/:itineraryId', async (req, res) => {
  try {
    const itineraryId = req.params.itineraryId;
    const userAgent = req.get('User-Agent') || '';
    
    // Fetch itinerary from Firestore
    const itineraryDoc = await db.collection('itineraries').doc(itineraryId).get();
    
    if (!itineraryDoc.exists) {
      logger.info(`Itinerary not found: ${itineraryId}`);
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Itinerary Not Found - TravalPass</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
              text-align: center; 
              padding: 50px; 
              background: #f5f5f5; 
            }
          </style>
        </head>
        <body>
          <h1>🌍 TravalPass</h1>
          <h2>Itinerary Not Found</h2>
          <p>This travel itinerary may have been removed or the link is invalid.</p>
          <a href="https://travalpass.com" style="color: #1976d2; text-decoration: none;">← Back to TravalPass</a>
        </body>
        </html>
      `);
    }

    const itinerary = itineraryDoc.data();
    
    // Generate and serve the HTML page
    const html = generateItineraryHTML(itinerary, itineraryId);
    
    // Set caching headers
    res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    res.set('Content-Type', 'text/html');
    res.send(html);
    
  } catch (error) {
    logger.error('Error serving itinerary share page:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error - TravalPass</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background: #f5f5f5; 
          }
        </style>
      </head>
      <body>
        <h1>🌍 TravalPass.com</h1>
        <h2>Something went wrong</h2>
        <p>We're having trouble loading this itinerary. Please try again later.</p>
        <a href="https://travalpass.com" style="color: #1976d2; text-decoration: none;">← Back to TravalPass</a>
      </body>
      </html>
    `);
  }
});

// Export the function
export const itineraryShare = functions.https.onRequest(app);