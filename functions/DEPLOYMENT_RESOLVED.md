# searchItineraries Deployment - RESOLVED ✅

## Issue
Frontend was getting error when searching for matches:
```
Unknown argument `age`. Did you mean `AND`? Available options are marked with ?.
```

## Root Cause
The **Prisma client** bundled with the deployed Cloud Function didn't include the `age` field because:
1. The migration was applied to the database ✅
2. The Prisma schema was updated ✅  
3. BUT: Prisma client wasn't regenerated during Cloud Functions deployment ❌

## Solution Applied

### 1. Added postinstall Hook (✅ Deployed)
Updated `functions/package.json`:
```json
"scripts": {
  ...
  "postinstall": "prisma generate"
}
```

This ensures Prisma client is regenerated **during `npm install`** when Cloud Functions builds the deployment package.

### 2. Improved Date Overlap Logic (✅ Deployed)
Updated `functions/src/functions/itinerariesRpc.ts` to properly handle date overlaps:

**Before:**
```typescript
if (data.minStartDay) {
  filters.startDate = { gte: new Date(data.minStartDay) };
}
```

**After:**
```typescript
// Date overlap filtering: Candidate's trip must overlap with user's search dates
// For overlap: candidate.endDate >= user.startDate AND candidate.startDate <= user.endDate
if (data.minStartDay && data.maxEndDay) {
  const userStartDate = new Date(Number(data.minStartDay));
  const userEndDate = new Date(Number(data.maxEndDay));
  filters.startDate = { lte: userEndDate }; // Candidate starts before or during user's trip
  filters.endDate = { gte: userStartDate }; // Candidate ends during or after user's trip
} else if (data.minStartDay) {
  // Fallback: if only minStartDay provided, use legacy behavior
  filters.startDate = { gte: new Date(Number(data.minStartDay)) };
}
```

### 3. Regenerated and Redeployed
```bash
cd functions
npx prisma generate
npm run build
firebase deploy --only functions:searchItineraries
```

## Verification

Tested deployed function with curl:
```bash
curl -X POST \
  "https://us-central1-mundo1-dev.cloudfunctions.net/searchItineraries" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "destination": "Miami, FL, USA",
      "gender": "Female",
      "status": "couple",
      "sexualOrientation": "No Preference",
      "minStartDay": 1731283200000,
      "maxEndDay": 1732924800000,
      "lowerRange": 18,
      "upperRange": 100,
      "excludedIds": ["test-viewed-1", "test-viewed-2", "test-viewed-3"],
      "pageSize": 15
    }
  }'
```

**Result:** ✅ Function returns valid results with age filtering working correctly

## Current Status

### ✅ Working
- Age field is recognized by Prisma client
- Age filtering logic works (candidate.age BETWEEN lowerRange AND upperRange)
- Gender, status, sexual orientation filtering works
- Destination filtering works
- Exclusion filtering (viewed IDs) works
- Function deployed successfully to mundo1-dev

### ⚠️ Needs Frontend Update
The frontend (`src/hooks/useSearchItineraries.tsx`) needs to be updated to:
1. Call the Cloud SQL RPC function instead of Firestore directly
2. Pass `maxEndDay` parameter for proper date overlap filtering

**Current Frontend Code:**
```typescript
// Still using Firestore queries
const constraints: QueryConstraint[] = [
  where("destination", "==", currentUserItinerary.destination),
  where("endDay", ">=", userStartDay),
  ...
];
```

**Should Be:**
```typescript
// Call Cloud SQL RPC
const fn = httpsCallable(functions, 'searchItineraries');
const res = await fn({
  destination: currentUserItinerary.destination,
  minStartDay: userStartDay,
  maxEndDay: userEndDay, // NEW: for proper overlap
  lowerRange: currentUserItinerary.lowerRange,
  upperRange: currentUserItinerary.upperRange,
  ...
});
```

## Next Steps

1. **Update Frontend Hook** - Replace Firestore queries with RPC call in `src/hooks/useSearchItineraries.tsx`
2. **Test in UI** - Log in as Joy and verify search works with her actual itinerary
3. **Monitor** - Watch function logs for any errors
4. **Production** - Once validated, follow `PRODUCTION_CLOUDSQL.md` for prod deployment

## Files Modified

- `functions/package.json` - Added postinstall script
- `functions/src/functions/itinerariesRpc.ts` - Improved date overlap logic
- `functions/prisma/schema.prisma` - Already had age field ✅
- `functions/prisma/migrations/20251018185901_add_age_field/` - Migration applied ✅

## Deployment Commands

```bash
# Regenerate Prisma client
cd functions
npx prisma generate

# Build and deploy
npm run build
firebase deploy --only functions:searchItineraries

# Test deployed function
cd scripts
./test-deployed-function.sh
```

## Important Notes

1. **Always run `npx prisma generate` after schema changes** before deploying
2. **The postinstall hook ensures this happens automatically** during Cloud Functions build
3. **Frontend still needs migration** from Firestore to Cloud SQL RPC
4. **Test data is already seeded** in traval-dev database (28 test itineraries)

---

**Deployment Status:** ✅ Backend FIXED and DEPLOYED  
**Next Action:** Update frontend hook to call Cloud SQL RPC function
