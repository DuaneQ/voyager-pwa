# TravalPass Cloud Functions

Firebase Cloud Functions (v2) powering the TravalPass ecosystem — ad delivery, itinerary generation, payments, notifications, and proxy services.

## Stack

- **Runtime:** Node.js 20
- **Framework:** Firebase Functions v2 (`onCall`, `onRequest`, `onDocumentCreated`)
- **Database:** Firestore (shared with `voyager-RN` and `voyager-ads`)
- **Testing:** Jest (419 tests)
- **Deploy target:** `mundo1-dev` (dev), `mundo1-1` (production)

## Function Index

### Ad System

| Function | Type | Purpose |
|----------|------|---------|
| `selectAds` | onCall | Returns eligible ad campaigns for a placement. Scores candidates on targeting signals (destination, dates, activities, demographics). 5-min in-memory cache. |
| `logAdEvents` | onCall | Ingests batched impression/click/quartile events. CPM billing ($5/1000), CPC billing ($0.50/click). Atomic budget decrement with auto-pause at $0. |
| `reviewCampaign` | onCall | Admin-only: approve or reject campaigns. UID-gated. |
| `getPendingCampaigns` | onCall | Admin-only: returns campaigns with `isUnderReview: true`. |
| `processAdVideoWithMux` | onDocumentCreated | Triggered on new `ads_campaigns` docs with video creatives. Uploads to Mux, writes back playback URL and thumbnail. |
| `backfillDailyMetricsDates` | onRequest | One-shot migration: adds `date` field to legacy daily_metrics sub-docs. |

### Itinerary & AI

| Function | Type | Purpose |
|----------|------|---------|
| `generateFullItinerary` | onCall | AI-powered full itinerary generation |
| `generateItineraryWithAI` | onCall | AI itinerary with activity suggestions |
| `itinerarySharing` | group | Share/unshare itineraries between users |

### Payments

| Function | Type | Purpose |
|----------|------|---------|
| `createStripeCheckoutSession` | onCall | Creates Stripe checkout for campaign budgets |
| `createStripePortalSession` | onCall | Creates Stripe customer portal session |

### Proxy & Utility

| Function | Type | Purpose |
|----------|------|---------|
| `openFlightsProxy` | onCall | Proxies OpenFlights airport data lookups |
| `placeProxy` | onCall | Proxies Google Places API calls (cost control) |
| `searchAccommodations` | onCall | Accommodation search proxy |
| `matchContactsWithUsers` | onCall | Matches phone contacts with registered users |
| `muxVideoProcessing` | onCall | Manual Mux video processing trigger |

### Notifications

| Function | Type | Purpose |
|----------|------|---------|
| `sendMatchNotification` | onDocumentCreated | Sends push notifications when users match |

## Local Development

```bash
npm install
npm test             # Run all 419 tests
npx tsc --noEmit     # Type check
```

## Deployment

```bash
# Deploy a single function to dev
npx firebase-tools@14.25.1 deploy --only functions:selectAds --project mundo1-dev

# Deploy all ad functions to production
npx firebase-tools@14.25.1 deploy \
  --only functions:selectAds,functions:logAdEvents,functions:reviewCampaign,functions:getPendingCampaigns,functions:processAdVideoWithMux,functions:backfillDailyMetricsDates \
  --project mundo1-1

# Deploy ALL functions
npx firebase-tools@14.25.1 deploy --only functions --project mundo1-dev
```

**Security:** Always use a pinned `firebase-tools` version (not `@latest`).

## Ad Billing Model

| Model | Rate | Charged on |
|-------|------|-----------|
| CPM | $5.00 per 1,000 impressions | Every impression (0.5¢ each) |
| CPC | $0.50 per click | Every click |

Budget is stored in cents (`budgetCents`) and decremented atomically via Firestore transactions. Campaigns auto-pause when budget reaches $0.

## Key Architecture Decisions

- **In-memory campaign cache** in `selectAds`: 5-minute TTL reduces Firestore reads from ~5M/day to ~1K/day at scale.
- **Atomic budget decrement**: Uses Firestore `FieldValue.increment(-chargeCents)` with a transaction-based init to prevent race conditions.
- **Noon-UTC date parsing**: All `YYYY-MM-DD` strings are parsed as noon UTC to prevent timezone-related date shifts.
- **FNV-1a tie-breaking**: Equal-scored campaigns are shuffled per-user-per-day using a deterministic hash, preventing any single campaign from monopolising impressions.

## Directory Structure

```
src/
├── selectAds.ts              # Ad selection + scoring
├── logAdEvents.ts            # Event ingestion + billing
├── reviewCampaign.ts         # Admin campaign review
├── getPendingCampaigns.ts    # Admin pending list
├── processAdVideoWithMux.ts  # Mux video processing
├── generateFullItinerary.ts  # AI itinerary generation
├── index.ts                  # Function exports
├── types/
│   └── adDelivery.ts         # Shared ad system types
└── __tests__/                # Jest unit tests
```
