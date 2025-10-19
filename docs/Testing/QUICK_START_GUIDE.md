# Quick Start: Implementing Critical Tests

**Goal**: Get the 24 most critical tests implemented and passing in 1 week  
**Date**: October 18, 2025

---

## 🚀 Day 1: Setup & Cloud SQL RPC Tests

### Morning: Test Infrastructure (2 hours)

1. **Create test utilities file**:
```bash
touch src/test-utils/cloudSqlTestHelpers.ts
```

```typescript
// src/test-utils/cloudSqlTestHelpers.ts
import { httpsCallable } from 'firebase/functions';

export const mockCloudSqlSuccess = (rpcName: string, data: any) => {
  (global as any).__mock_httpsCallable = jest.fn((_, name) => {
    if (name === rpcName) {
      return jest.fn(() => Promise.resolve({ data: { success: true, data } }));
    }
  });
};

export const mockCloudSqlError = (rpcName: string, error: Error) => {
  (global as any).__mock_httpsCallable = jest.fn((_, name) => {
    if (name === rpcName) {
      return jest.fn(() => Promise.reject(error));
    }
  });
};

export const mockCloudSqlTimeout = (rpcName: string) => {
  mockCloudSqlError(rpcName, new Error('Request timeout'));
};

export const createMockItinerary = (overrides = {}) => ({
  id: 'test-itin-1',
  userId: 'test-user',
  destination: 'Paris',
  startDate: '2025-12-01',
  endDate: '2025-12-07',
  gender: 'female',
  status: 'single',
  lowerRange: 25,
  upperRange: 35,
  ...overrides,
});
```

2. **Create test file**:
```bash
touch src/__tests__/hooks/useSearchItineraries.rpcErrors.test.tsx
```

### Afternoon: Implement RPC Error Tests (4 hours)

Copy Template 1 from `CRITICAL_TEST_TEMPLATES.md` and run:
```bash
npm test -- useSearchItineraries.rpcErrors.test.tsx --watchAll=false
```

**Expected Failures**: All 6 tests should fail initially

**Fix Implementation**: Add error handling to `src/hooks/useSearchItineraries.tsx`:
```typescript
// In fetchFromCloudSQL function
try {
  const searchFn = httpsCallable(functions, 'searchItineraries');
  const res: any = await searchFn({ /* params */ });
  
  // Add timeout handling
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Request timeout')), 30000)
  );
  
  const result = await Promise.race([searchFn({ /* params */ }), timeoutPromise]);
  
  // Validate response structure
  if (!result?.data?.success) {
    throw new Error(result?.data?.error || 'Unexpected RPC response');
  }
  
  // Validate data array
  if (!Array.isArray(result.data.data)) {
    throw new Error('Invalid response: data is not an array');
  }
  
  return result.data.data;
} catch (err) {
  console.error('❌ useSearchItineraries: RPC error:', err);
  setError('Failed to search itineraries: ' + (err?.message || String(err)));
  throw err;
}
```

**Verify**: All 6 tests passing ✅

---

## 🚀 Day 2: Profile Validation Integration Tests

### Morning: Setup (2 hours)

1. **Create test file**:
```bash
touch src/__tests__/flows/ProfileValidation.integration.test.tsx
```

2. **Create test helper**:
```typescript
// Add to src/test-utils/cloudSqlTestHelpers.ts
export const createMockUserProfile = (overrides = {}) => ({
  uid: 'test-user-123',
  username: 'Test User',
  email: 'test@example.com',
  dob: '1990-01-01',
  gender: 'female',
  status: 'single',
  ...overrides,
});

export const renderWithFullContext = (component, { userProfile = null } = {}) => {
  return render(
    <BrowserRouter>
      <UserProfileContext.Provider 
        value={{ 
          userProfile, 
          updateUserProfile: jest.fn(),
          setUserProfile: jest.fn()
        }}
      >
        <AlertProvider>
          {component}
        </AlertProvider>
      </UserProfileContext.Provider>
    </BrowserRouter>
  );
};
```

### Afternoon: Implement Profile Tests (4 hours)

Copy Template 2 from `CRITICAL_TEST_TEMPLATES.md` and run:
```bash
npm test -- ProfileValidation.integration.test.tsx --watchAll=false
```

**Expected Failures**: All 5 tests should fail initially

**Fix Implementation**: Ensure validation is working:
```typescript
// In AddItineraryModal.tsx - validateItinerary function
const validateItinerary = (): string | null => {
  if (!userProfile?.dob || !userProfile?.gender) {
    return "Please complete your profile by setting your date of birth and gender before creating an itinerary.";
  }
  // ... rest of validation
};
```

**Verify**: All 5 tests passing ✅

---

## 🚀 Day 3: AI Itinerary Dropdown - Part 1

### All Day: Setup & Initial Tests (6 hours)

1. **Create test file**:
```bash
touch src/__tests__/pages/Search.aiItinerary.test.tsx
```

2. **Implement first 5 tests from Template 3**:
   - Both manual and AI in dropdown
   - Visual distinction with icon
   - Call searchItineraries with AI metadata
   - Handle missing metadata
   - Exclude expired itineraries

**Run tests**:
```bash
npm test -- Search.aiItinerary.test.tsx --watchAll=false
```

**Fix Implementation**: Update `Search.tsx`:
```typescript
// In Search component
const itinerariesWithType = useMemo(() => {
  return itineraries.map(itin => ({
    ...itin,
    displayName: itin.ai_status === 'completed' 
      ? `🤖 ${itin.title || itin.destination}` 
      : itin.title || itin.destination,
    isAI: itin.ai_status === 'completed',
  })).filter(itin => {
    // Exclude expired itineraries
    if (itin.endDay && BigInt(Date.now()) > itin.endDay) {
      return false;
    }
    return true;
  });
}, [itineraries]);
```

**Verify**: 5 tests passing ✅

---

## 🚀 Day 4: AI Itinerary Dropdown - Part 2

### All Day: Matching Logic Tests (6 hours)

1. **Add remaining 5 tests from Template 3**:
   - RPC integration tests
   - Matching with AI metadata
   - Error handling
   - Loading states
   - Refresh on selection change

**Fix Implementation**: Update search logic:
```typescript
// In Search.tsx - handleItinerarySelect
const handleItinerarySelect = async (itineraryId: string) => {
  const selected = itineraries.find(it => it.id === itineraryId);
  if (!selected) return;
  
  // Pass AI itinerary metadata to search if exists
  const searchParams = {
    ...selected,
    // Use AI metadata for filtering if available
    filteringMetadata: selected.response?.data?.metadata?.filtering,
  };
  
  await searchItineraries(searchParams, userId);
};
```

**Verify**: All 10 tests passing ✅

---

## 🚀 Day 5: Final Integration & Documentation

### Morning: Run Full Test Suite (2 hours)

```bash
npm test -- --watchAll=false
```

**Expected Result**: 
- Original: 883 tests passing
- New: 24 tests passing
- **Total**: 907 tests passing ✅

### Afternoon: Documentation & Review (4 hours)

1. **Update README**:
```markdown
## Test Coverage

- **Total Tests**: 907 passing
- **Critical Flows**: 80%+ coverage
- **Cloud SQL RPC**: Fully tested with error scenarios
- **AI Integration**: Dropdown, matching, and display tested
- **Profile Validation**: Integration tests for all flows
```

2. **Create PR with checklist**:
```markdown
## Critical Test Coverage PR

### Tests Added
- [x] Cloud SQL RPC error handling (6 tests)
- [x] Profile validation integration (5 tests)
- [x] AI itinerary in Search dropdown (10 tests)
- [x] Test utilities and helpers created

### Verified
- [x] All new tests passing
- [x] No regression in existing tests (907/907 passing)
- [x] Code coverage increased by X%
- [x] Documentation updated

### Next Steps
- [ ] Sprint 2 tests (AIItineraryDisplay edit/share)
- [ ] Sprint 3 tests (Blocked users, usage tracking)
- [ ] E2E tests for critical flows
```

---

## 📋 Daily Checklist

### Day 1: Cloud SQL RPC Tests ✅
- [ ] Create `cloudSqlTestHelpers.ts`
- [ ] Create test file
- [ ] Implement 6 RPC error tests
- [ ] Add error handling to hook
- [ ] Verify all tests passing

### Day 2: Profile Validation ✅
- [ ] Create integration test file
- [ ] Create test helpers
- [ ] Implement 5 profile validation tests
- [ ] Verify validation logic
- [ ] All tests passing

### Day 3: AI Dropdown Part 1 ✅
- [ ] Create test file
- [ ] Implement first 5 dropdown tests
- [ ] Update Search component
- [ ] Add AI visual distinction
- [ ] Filter expired itineraries

### Day 4: AI Dropdown Part 2 ✅
- [ ] Implement remaining 5 tests
- [ ] Add matching logic
- [ ] Handle AI metadata
- [ ] Error handling
- [ ] All 10 tests passing

### Day 5: Integration & Docs ✅
- [ ] Run full test suite
- [ ] Verify 907+ tests passing
- [ ] Update documentation
- [ ] Create PR with checklist
- [ ] Code review

---

## 🚨 Troubleshooting

### Test Failing: "Cannot find module"
```bash
# Make sure all imports are correct
npm run build
```

### Test Failing: "RPC not mocked"
```typescript
// Add to test file
beforeEach(() => {
  (global as any).__mock_httpsCallable = undefined;
  jest.clearAllMocks();
});
```

### Test Failing: "UserProfileContext is undefined"
```typescript
// Wrap component with provider
const { UserProfileContext } = require('../../Context/UserProfileContext');
render(
  <UserProfileContext.Provider value={{ userProfile: {...}, ... }}>
    <YourComponent />
  </UserProfileContext.Provider>
);
```

### All Tests Slow
```bash
# Run tests in parallel with coverage disabled
npm test -- --maxWorkers=4 --no-coverage
```

---

## 📊 Progress Tracking

| Day | Tests Added | Total Tests | Status |
|-----|-------------|-------------|--------|
| Day 1 | 6 | 889 | 🟡 In Progress |
| Day 2 | 5 | 894 | 🟡 In Progress |
| Day 3 | 5 | 899 | 🟡 In Progress |
| Day 4 | 5 | 904 | 🟡 In Progress |
| Day 5 | 3 (docs) | 907 | 🟡 In Progress |
| **Total** | **24** | **907** | ✅ **COMPLETE** |

---

## 🎯 Success Metrics

### Code Coverage
- **Before**: ~75% (estimated)
- **Target**: ~82%
- **After Sprint 1**: Should reach target ✅

### Test Execution Time
- **Before**: ~15 seconds for full suite
- **After**: ~18 seconds (acceptable increase)

### Critical Bugs Found
- **Target**: Identify and fix 3-5 bugs during test implementation
- **Common Bugs**:
  - Missing error handling in RPC calls
  - Profile validation not blocking modal
  - AI metadata not used in search
  - Expired itineraries shown in dropdown

---

## 🎓 Tips for Success

### Write Tests First
- Copy template → Run test (fails) → Implement fix → Test passes ✅

### One Test at a Time
- Don't try to implement all tests at once
- Run `npm test -- <file> --watch` for fast feedback

### Use Console Logs for Debugging
```typescript
it('should handle error', async () => {
  console.log('Test starting...');
  const result = await myFunction();
  console.log('Result:', result);
  expect(result).toBe(expected);
});
```

### Ask for Help
- If stuck for > 30 minutes, ask team
- Share error messages and code snippets
- Pair program on complex tests

---

## 📞 Need Help?

**Stuck on Day 1-2?** → Check `CRITICAL_TEST_TEMPLATES.md` for exact code  
**Stuck on Day 3-4?** → See `EDGE_CASES_QUICK_REFERENCE.md` for flows  
**General questions?** → See `TEST_COVERAGE_GAPS_ANALYSIS.md` for context

---

**Status**: 📝 Ready to implement  
**Estimated Completion**: 5 working days  
**Team Size**: 1-2 developers  
**Priority**: 🔴 **CRITICAL** - Must complete before production
