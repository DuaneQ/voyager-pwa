## Debugging Guide: No Search Results

### Step 1: Check Your Itinerary Data

Open your browser console and look for these log messages when you select your Miami itinerary:

```
🔍 useSearchItineraries: Calling Cloud SQL RPC with params: {
  destination: "Miami, FL, USA",
  gender: "Female",
  status: "couple",
  sexualOrientation: "No Preference",
  minStartDay: 1731283200000,
  maxEndDay: 1733011200000,
  lowerRange: 18,
  upperRange: 100,
  currentUserId: "OPoJ6tPN3DaCAXxCmXwGFjOF7SI3"
}
```

### Common Issues:

#### Issue 1: Missing Age Range
**Problem:** Your itinerary doesn't have `lowerRange` or `upperRange` set
**Solution:** Edit your itinerary in the UI to set age preferences (18-100)

#### Issue 2: Destination Mismatch
**Problem:** Your itinerary says "Miami, Florida" instead of "Miami, FL, USA"
**Solution:** The test data uses "Miami, FL, USA" - update your itinerary to match exactly

#### Issue 3: Dates Don't Overlap
**Problem:** Your trip dates don't overlap with Nov 11-30, 2025
**Solution:** Update your trip dates to be within or overlapping Nov 11-30, 2025

#### Issue 4: Status/Gender Mismatch
**Problem:** Your itinerary is looking for "Male" or "Single" status
**Solution:** Test data has "Female" and "couple" - update your preferences

### Step 2: Verify Database Connection

Run this in terminal:
```bash
cd functions
./scripts/check-test-data.sh
```

Should show:
- Total test itineraries: 29
- Miami itineraries: 25

### Step 3: Test the RPC Directly

Run this in browser console:
```javascript
const { httpsCallable } = await import('firebase/functions');
const { functions } = await import('./src/environments/firebaseConfig');

const searchFn = httpsCallable(functions, 'searchItineraries');
const result = await searchFn({
  destination: 'Miami, FL, USA',
  gender: 'Female',
  status: 'couple',
  sexualOrientation: 'No Preference',
  minStartDay: 1731283200000,  // Nov 11, 2025
  maxEndDay: 1733011200000,     // Nov 30, 2025
  lowerRange: 18,
  upperRange: 100,
  pageSize: 50,
  excludedIds: []
});

console.log('Direct RPC result:', result.data);
```

Should return ~12 matching itineraries.

### Step 4: Check Your Itinerary in Firestore

1. Go to Firebase Console → Firestore
2. Find your itinerary document
3. Check these fields:
   - `destination`: Should be "Miami, FL, USA"
   - `lowerRange`: Should be a number (e.g., 18)
   - `upperRange`: Should be a number (e.g., 100)
   - `gender`: Should be "Female" to match test data
   - `status`: Should be "couple" to match test data
   - `sexualOrientation`: Should be "No Preference" to match test data
   - `startDate`: Should be a Timestamp
   - `endDate`: Should be a Timestamp

### Step 5: Clear Cache and Retry

1. Open browser console
2. Run: `localStorage.clear()`
3. Refresh the page
4. Select your Miami itinerary again

### Expected Console Output

If everything is working, you should see:
```
🔍 useSearchItineraries: Calling Cloud SQL RPC with params: {...}
🔍 useSearchItineraries: RPC response: {...}
🔍 useSearchItineraries: Got 12 results from server
✅ Cloud SQL RPC returned 12 results, 12 after removing current user's itineraries
```

### If You Still See 0 Results

Check the RPC error message in console. Common errors:

1. **"Unknown argument `age`"** - Prisma client not regenerated. Run:
   ```bash
   cd functions
   npx prisma generate
   firebase deploy --only functions:searchItineraries
   ```

2. **"Environment variable not found: DATABASE_URL"** - Missing `.env` file in functions folder

3. **"Connection refused"** - Cloud SQL proxy not running or wrong credentials

4. **Empty result but no error** - Your search criteria don't match any test data. Double-check destination, dates, and preferences.
