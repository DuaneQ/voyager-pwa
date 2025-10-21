# Test Data Seed - Expected Results

## Test Scenario: Joy's Actual Itinerary

**Test User:** OPoJ6tPN3DaCAXxCmXwGFjOF7SI3 (Joy)  
**Search Criteria:**
- Destination: `Miami, FL, USA`
- Dates: `November 11-30, 2025` (19 days)
- Age Range: `18-100` (very wide)
- Gender Preference: `Female`
- Status: `couple`
- Sexual Orientation: `No Preference`

## Test Data Breakdown

Total test itineraries created: **28**

### Should Match (✅ Expected Results: 15 itineraries)

1. **PERFECT_MATCH** (5 itineraries)
   - `test-match-perfect-1` - Age 25, Female, couple, No Preference
   - `test-match-perfect-2` - Age 30, Female, couple, No Preference
   - `test-match-perfect-3` - Age 35, Female, couple, No Preference
   - `test-match-perfect-4` - Age 40, Female, couple, No Preference
   - `test-match-perfect-5` - Age 45, Female, couple, No Preference
   - **Why they match:** All criteria align perfectly

2. **AGE_EDGE_CASES** (2 itineraries match)
   - `test-match-age-18` - Age 18 (lower bound, SHOULD match)
   - `test-match-age-100` - Age 100 (upper bound, SHOULD match)
   - **Why they match:** Ages 18 and 100 are within Joy's 18-100 range

3. **ORIENTATION_MATCH** (3 itineraries)
   - `test-match-orientation-gay` - Gay orientation
   - `test-match-orientation-lesbian` - Lesbian orientation
   - `test-match-orientation-bisexual` - Bisexual orientation
   - **Why they match:** Joy has "No Preference" so ALL orientations should match

4. **DATE_OVERLAP** (2 itineraries)
   - `test-match-date-overlap` - Nov 5-15 (overlaps with Nov 11-30)
   - `test-match-date-containing` - Nov 1 - Dec 15 (contains Nov 11-30)
   - **Why they match:** Date ranges overlap with Joy's Nov 11-30 trip

5. **ALREADY_VIEWED** (3 itineraries - excluded by frontend)
   - `test-viewed-1` - Perfect match but in excludedIds
   - `test-viewed-2` - Perfect match but in excludedIds
   - `test-viewed-3` - Perfect match but in excludedIds
   - **Why excluded:** Frontend passes these IDs in `excludedIds` parameter

### Should NOT Match (❌ Expected Exclusions: 13 itineraries)

1. **AGE_OUT_OF_RANGE** (2 itineraries)
   - `test-fail-age-17` - Age 17 (below 18)
   - `test-fail-age-101` - Age 101 (above 100)
   - **Why excluded:** Outside Joy's 18-100 age range

2. **STATUS_MISMATCH** (3 itineraries)
   - `test-fail-status-single` - Status: Single
   - `test-fail-status-married` - Status: Married
   - `test-fail-status-divorced` - Status: Divorced
   - **Why excluded:** Joy is looking for 'couple' status only

3. **GENDER_MISMATCH** (2 itineraries)
   - `test-fail-gender-male` - Gender: Male
   - `test-fail-gender-non-binary` - Gender: Non-binary
   - **Why excluded:** Joy is looking for 'Female' only

4. **DATE_NO_OVERLAP** (2 itineraries)
   - `test-fail-date-before` - Ends Nov 10 (before Joy's Nov 11 start)
   - `test-fail-date-after` - Starts Dec 1 (after Joy's Nov 30 end)
   - **Why excluded:** No date overlap with Joy's Nov 11-30 trip

5. **DESTINATION_MISMATCH** (3 itineraries)
   - `test-fail-destination-new-york` - New York, NY
   - `test-fail-destination-los-angeles` - Los Angeles, CA
   - `test-fail-destination-chicago` - Chicago, IL
   - **Why excluded:** Not Miami, FL

6. **MULTIPLE_FAILURES** (2 itineraries)
   - `test-fail-multi-age-dest` - Age 101 (too old) + Paris destination
   - `test-fail-multi-gender-status` - Male gender + Single status
   - **Why excluded:** Multiple criteria violations

## Key Differences from Original Test

### Original Test Scenario
- Age Range: 23-35 (narrow)
- Status: Single
- Sexual Orientation: Straight
- Expected Matches: ~7 itineraries

### Joy's Actual Scenario
- Age Range: 18-100 (very wide)
- Status: couple
- Sexual Orientation: No Preference
- Expected Matches: ~15 itineraries

### Impact of Changes

1. **Wider Age Range (18-100 vs 23-35)**
   - Ages 18 and 100 now match (edge cases)
   - Ages 17 and 101 still fail (out of range)
   - Ages 25, 30, 35, 40, 45 all match (wider acceptance)

2. **"No Preference" Sexual Orientation**
   - Gay, Lesbian, Bisexual now ALL MATCH
   - Original test had these as mismatches
   - Significantly increases match count

3. **Status Changed to "couple"**
   - Single, Married, Divorced now fail
   - Original test had "Married" and "Divorced" as mismatches

4. **Longer Trip Duration (19 days vs 7 days)**
   - More potential for date overlaps
   - Edge cases updated to Nov 10 (before) and Dec 1 (after)

## Testing Instructions

### 1. Run the Seed Script
```bash
cd functions
./run-seed-test.sh
```

Expected output:
- ✅ 28 test itineraries created
- ✅ All inserts successful
- ✅ Summary showing 15 should match, 13 should not match

### 2. Test Search Query

Use this query in your test:

```typescript
const viewedIds = ["test-viewed-1", "test-viewed-2", "test-viewed-3"];

const results = await searchItineraries({
  destination: "Miami, FL, USA",
  gender: "Female",
  status: "couple",
  sexualOrientation: "No Preference",
  minStartDay: 1731283200000, // Nov 11, 2025
  lowerRange: 18,
  upperRange: 100,
  excludedIds: viewedIds,
  pageSize: 50
});

console.log("Results found:", results.length); // Should be 12
console.log("Result IDs:", results.map(r => r.id));
```

### 3. Verify Results

**Expected Result Count: 12** (15 matches - 3 viewed)

**Should See These IDs:**
```
test-match-perfect-1
test-match-perfect-2
test-match-perfect-3
test-match-perfect-4
test-match-perfect-5
test-match-age-18
test-match-age-100
test-match-orientation-gay
test-match-orientation-lesbian
test-match-orientation-bisexual
test-match-date-overlap
test-match-date-containing
```

**Should NOT See These IDs:**
- ❌ `test-fail-age-17` (too young)
- ❌ `test-fail-age-101` (too old)
- ❌ `test-fail-status-*` (3 itineraries - wrong status)
- ❌ `test-fail-gender-*` (2 itineraries - wrong gender)
- ❌ `test-fail-date-*` (2 itineraries - no date overlap)
- ❌ `test-fail-destination-*` (3 itineraries - wrong destination)
- ❌ `test-fail-multi-*` (2 itineraries - multiple failures)
- ❌ `test-viewed-*` (3 itineraries - in excludedIds)

### 4. Validation Queries

Check specific categories:

```typescript
// 1. Verify age filtering works
const ageMatches = results.filter(r => r.age >= 18 && r.age <= 100);
console.log("Age matches:", ageMatches.length); // Should be 12

// 2. Verify gender filtering works
const genderMatches = results.filter(r => r.gender === 'Female');
console.log("Gender matches:", genderMatches.length); // Should be 12

// 3. Verify status filtering works
const statusMatches = results.filter(r => r.status === 'couple');
console.log("Status matches:", statusMatches.length); // Should be 12

// 4. Verify no excluded IDs appear
const hasExcluded = results.some(r => viewedIds.includes(r.id));
console.log("Has excluded IDs:", hasExcluded); // Should be false
```

## Debugging

If results don't match expectations:

1. **Check Database Records:**
   ```sql
   SELECT id, age, gender, status, "sexualOrientation", destination
   FROM itinerary
   WHERE id LIKE 'test-%'
   ORDER BY id;
   ```

2. **Verify Age Filtering:**
   ```sql
   SELECT id, age
   FROM itinerary
   WHERE id LIKE 'test-%'
   AND age >= 18 AND age <= 100;
   ```

3. **Check Date Overlaps:**
   ```sql
   SELECT id, "startDate", "endDate"
   FROM itinerary
   WHERE id LIKE 'test-%'
   AND "startDate" <= '2025-11-30'
   AND "endDate" >= '2025-11-11';
   ```

4. **Verify Function Logs:**
   ```bash
   # Watch function logs during search
   firebase functions:log --only searchItineraries
   ```

## Success Criteria

- ✅ All 28 test itineraries insert successfully
- ✅ Search returns exactly 12 results (15 matches - 3 viewed)
- ✅ All returned IDs match expected list
- ✅ No excluded IDs appear in results
- ✅ No unexpected IDs appear in results
- ✅ Age filtering works correctly (18-100 range)
- ✅ Gender filtering works correctly (Female only)
- ✅ Status filtering works correctly (couple only)
- ✅ Sexual orientation filtering works correctly (No Preference matches all)
- ✅ Date overlap filtering works correctly
- ✅ Destination filtering works correctly (Miami only)
