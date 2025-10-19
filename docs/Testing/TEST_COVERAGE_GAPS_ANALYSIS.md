# Test Coverage Gaps & Edge Cases Analysis

**Date**: October 18, 2025  
**Context**: Migration from Firestore to Cloud SQL (Prisma), Landing Page addition, Profile route changes

## Executive Summary

This analysis identifies critical test coverage gaps based on the major architectural changes:
1. **Cloud SQL Migration**: Itinerary storage moved from Firestore to PostgreSQL via Prisma
2. **Landing Page**: New unauthenticated entry point with redirect to `/profile`
3. **Profile Route**: Changed routing logic for authenticated users
4. **User Flow Requirements**: Multi-step profile completion required before itinerary creation

---

## 🔴 CRITICAL GAPS - High Priority

### 1. **Cloud SQL RPC Failure Scenarios**

**Risk Level**: 🔴 CRITICAL  
**Current Coverage**: ❌ Minimal

**Missing Test Cases**:

```typescript
// src/__tests__/hooks/useSearchItineraries.cloudsql.test.tsx
describe('Cloud SQL Integration - Error Scenarios', () => {
  it('should handle Cloud SQL connection timeout gracefully');
  it('should fallback behavior when Prisma client fails to initialize');
  it('should display user-friendly error when searchItineraries RPC times out');
  it('should handle partial results when RPC response is malformed');
  it('should retry searchItineraries RPC on transient network errors');
  it('should handle database constraint violations (e.g., duplicate itinerary IDs)');
  it('should validate BigInt conversion for startDay/endDay fields');
});
```

**Why Critical**: 
- All search functionality now depends on Cloud SQL RPC calls
- No fallback to Firestore in production (by design)
- Users will see blank screens if RPC fails without proper error handling

**Edge Cases**:
- ❌ Cloud SQL proxy disconnects mid-operation
- ❌ Prisma schema mismatch between dev/prod
- ❌ BigInt overflow for date ranges beyond 2038
- ❌ JSONB field parsing errors for `metadata`, `response`, `userInfo`

---

### 2. **User Profile Validation Flow**

**Risk Level**: 🔴 CRITICAL  
**Current Coverage**: ⚠️ Partial (only in AddItineraryModal tests)

**Missing Test Cases**:

```typescript
// src/__tests__/flows/UserProfileValidation.test.tsx
describe('User Profile Completion Flow - Integration', () => {
  describe('Manual Itinerary Creation', () => {
    it('should block manual itinerary creation if dob is missing');
    it('should block manual itinerary creation if gender is missing');
    it('should allow itinerary creation when profile is complete');
    it('should show specific error message for incomplete profile');
    it('should navigate to profile page when clicking "complete profile" link');
  });

  describe('AI Itinerary Generation', () => {
    it('should block AI generation if user profile is incomplete');
    it('should block AI generation if travel preference profile is missing');
    it('should require BOTH user profile AND travel preferences');
    it('should validate user profile before checking travel preferences');
    it('should display profile completion progress (e.g., "2 of 3 steps complete")');
  });

  describe('Profile Route Redirect', () => {
    it('should redirect authenticated user from landing page to /profile');
    it('should keep user on landing page if not authenticated');
    it('should preserve query params during redirect (e.g., ?ref=promo)');
  });
});
```

**Current State**:
- ✅ AddItineraryModal validates `userProfile.dob` and `userProfile.gender`
- ✅ ProfileValidationService exists with `validateProfileCompleteness()`
- ❌ NO integration tests for full user journey
- ❌ NO tests for AI generation blocking on incomplete profile
- ❌ NO tests for landing page → profile redirect flow

**Edge Cases**:
- User completes profile while modal is open (race condition)
- User has partial profile in localStorage but different in Firestore
- UserProfileContext provider missing in component tree
- Multiple tabs: profile updated in tab A, modal open in tab B

---

### 3. **AI Itinerary Selection in Search Dropdown**

**Risk Level**: 🔴 CRITICAL  
**Current Coverage**: ❌ None

**Missing Test Cases**:

```typescript
// src/__tests__/pages/Search.aiItinerarySelection.test.tsx
describe('Search - AI Itinerary Dropdown Selection', () => {
  it('should populate dropdown with both manual and AI itineraries');
  it('should distinguish AI itineraries visually (e.g., with 🤖 icon)');
  it('should filter matches based on selected AI itinerary preferences');
  it('should use AI itinerary metadata.filtering for search parameters');
  it('should handle AI itinerary with missing metadata gracefully');
  it('should refresh matches when switching from manual to AI itinerary');
  it('should preserve selected AI itinerary after page refresh');
  
  describe('RPC Integration', () => {
    it('should fetch AI itinerary from listItinerariesForUser RPC');
    it('should handle RPC failure when fetching AI itineraries');
    it('should show loading state while fetching AI itineraries');
  });

  describe('Matching Logic', () => {
    it('should match AI itinerary destination with manual itinerary destinations');
    it('should apply AI travel preferences to filter results');
    it('should respect budget constraints from AI itinerary');
    it('should exclude expired AI itineraries from dropdown (endDay < now)');
  });
});
```

**Current State**:
- ✅ Search component has itinerary dropdown
- ✅ useAIGeneratedItineraries hook fetches AI itineraries
- ❌ NO tests verifying AI itineraries appear in Search dropdown
- ❌ NO tests for matching logic with AI itinerary metadata

**Why Critical**:
- Core feature of AI integration
- Search.tsx calls `searchItineraries()` with selected itinerary
- AI itineraries have different structure (`response.data.metadata.filtering`)

---

### 4. **AIItineraryDisplay Edit & Share**

**Risk Level**: 🟡 HIGH  
**Current Coverage**: ⚠️ Partial

**Missing Test Cases**:

```typescript
// src/__tests__/components/AIItineraryDisplay.editShare.test.tsx
describe('AIItineraryDisplay - Edit & Share Actions', () => {
  describe('Edit Functionality', () => {
    it('should allow editing AI itinerary destination');
    it('should allow editing AI itinerary dates');
    it('should preserve AI-generated content when editing basic fields');
    it('should call updateItinerary RPC with partial payload');
    it('should NOT allow editing AI response.data.activities');
    it('should show edit button only for owner');
    it('should disable edit button while update is in progress');
  });

  describe('Share Functionality', () => {
    it('should generate public share link for AI itinerary');
    it('should copy share link to clipboard');
    it('should display share modal with social media options');
    it('should track share analytics event');
    it('should allow unsharing (making itinerary private again)');
    it('should validate that only owner can share');
  });

  describe('Cloud SQL Integration', () => {
    it('should fetch AI itinerary by ID from listItinerariesForUser RPC');
    it('should update AI itinerary via updateItinerary RPC');
    it('should handle RPC failure during edit operation');
    it('should show optimistic UI update before RPC completes');
  });
});
```

**Current State**:
- ✅ AIItineraryDisplay component exists
- ✅ Tests exist in `AIItineraryDisplay.test.tsx` (641 lines)
- ⚠️ Need to verify edit/share buttons are tested
- ❌ NO tests for Cloud SQL RPC update flow

---

## 🟡 HIGH PRIORITY GAPS

### 5. **Landing Page Integration Tests**

**Risk Level**: 🟡 HIGH  
**Current Coverage**: ✅ Basic rendering tests exist

**Missing Test Cases**:

```typescript
// src/__tests__/pages/LandingPage.integration.test.tsx
describe('LandingPage - User Journey Integration', () => {
  it('should render for unauthenticated users');
  it('should redirect to /profile for authenticated users');
  it('should preserve query params during redirect (e.g., ?utm_source=ad)');
  it('should show "Get Started Free" CTA for unauthenticated users');
  it('should navigate to /Register when clicking "Sign Up Now"');
  it('should navigate to /Login when clicking "Get Started Free"');
  it('should play demo video autoplay and loop');
  it('should handle video load failure gracefully');
  it('should track analytics event on CTA click');
  it('should be accessible (ARIA labels, keyboard navigation)');
});
```

**Current State**:
- ✅ Basic tests exist in `LandingPage.test.tsx` (301 lines)
- ✅ Tests cover content rendering and redirect
- ⚠️ Need to verify video autoplay tests exist
- ❌ NO tests for query param preservation

---

### 6. **Travel Preferences Profile Requirements**

**Risk Level**: 🟡 HIGH  
**Current Coverage**: ⚠️ Partial

**Missing Test Cases**:

```typescript
// src/__tests__/hooks/useTravelPreferences.aiGeneration.test.tsx
describe('Travel Preferences - AI Generation Requirements', () => {
  it('should load preferences from Firestore on mount');
  it('should block AI generation if no preference profiles exist');
  it('should block AI generation if selected profile is incomplete');
  it('should require at least one saved preference profile');
  it('should allow AI generation with default profile if exists');
  it('should validate profile has required fields (budget, groupSize, activities)');
  
  describe('Profile Selection in AI Modal', () => {
    it('should pre-select default profile in AI generation modal');
    it('should allow switching between multiple preference profiles');
    it('should validate selected profile before calling generateItinerary RPC');
    it('should show "Create Profile" link if no profiles exist');
  });
});
```

**Current State**:
- ✅ useTravelPreferences hook exists
- ✅ Validation tests exist in `useTravelPreferences.validation.test.tsx`
- ❌ NO integration tests with AI generation modal
- ❌ NO tests for "no profiles" edge case

---

## 🟢 MEDIUM PRIORITY GAPS

### 7. **Blocked Users Filter in Search**

**Risk Level**: 🟢 MEDIUM  
**Current Coverage**: ❌ None

**Missing Test Cases**:

```typescript
// src/__tests__/pages/Search.blockedUsers.test.tsx
describe('Search - Blocked Users Filtering', () => {
  it('should exclude blocked users from search results');
  it('should pass blocked user IDs to searchItineraries RPC');
  it('should update blocked list in real-time (if user blocks during search)');
  it('should handle empty blocked list');
  it('should handle mutual blocking (A blocks B, B blocks A)');
  it('should sync blocked list from userProfile context');
});
```

**Why Important**:
- `searchItineraries` RPC accepts `blockedUserIds` parameter
- `currentUserItinerary.userInfo?.blocked` array is passed to RPC
- Need to verify filtering happens on backend, not client

---

### 8. **Usage Tracking with Cloud SQL**

**Risk Level**: 🟢 MEDIUM  
**Current Coverage**: ✅ Good (useUsageTracking tests exist)

**Missing Test Cases**:

```typescript
// src/__tests__/hooks/useUsageTracking.cloudsql.test.tsx
describe('Usage Tracking - Cloud SQL Itineraries', () => {
  it('should count AI itineraries fetched from Cloud SQL in daily usage');
  it('should count manual itineraries fetched from Cloud SQL in daily usage');
  it('should not double-count itineraries viewed multiple times');
  it('should reset usage count at midnight UTC');
  it('should handle usage tracking failure gracefully (allow operation)');
});
```

**Current State**:
- ✅ useUsageTracking hook has comprehensive tests
- ⚠️ Verify tests cover Cloud SQL RPC calls (not just Firestore)

---

### 9. **Example Itinerary with Cloud SQL**

**Risk Level**: 🟢 MEDIUM  
**Current Coverage**: ⚠️ Unknown

**Missing Test Cases**:

```typescript
// src/__tests__/utils/exampleItinerary.cloudsql.test.tsx
describe('Example Itinerary - Cloud SQL Compatibility', () => {
  it('should create example itinerary with valid Cloud SQL schema');
  it('should mark example itinerary with special flag (isExample: true)');
  it('should exclude example itinerary from search results');
  it('should not save example itinerary to Cloud SQL');
  it('should persist "dismissed" state in localStorage');
});
```

**Current State**:
- ✅ Example itinerary utils exist (`createExampleItinerary`, `isExampleItinerary`)
- ❌ NO tests for Cloud SQL schema compatibility

---

## 🔵 LOW PRIORITY GAPS

### 10. **Pagination State Management**

**Risk Level**: 🔵 LOW  
**Current Coverage**: ✅ Good

**Notes**:
- Previous conversation confirmed pagination was intentionally REMOVED to preserve usage limits
- Tests updated to verify NO automatic pagination
- Edge case: user reaches end of results, should see "No more matches"

---

### 11. **Mutual Likes with Cloud SQL**

**Risk Level**: 🔵 LOW  
**Current Coverage**: ⚠️ Partial

**Missing Test Cases**:

```typescript
// src/__tests__/pages/Search.mutualLikes.test.tsx
describe('Search - Mutual Likes (Cloud SQL)', () => {
  it('should fetch current user itinerary from Cloud SQL via RPC');
  it('should check mutual like using itinerary.likes array from Cloud SQL');
  it('should create connection in Firestore when mutual like detected');
  it('should handle RPC failure when fetching user itinerary');
  it('should log error if itinerary not found in Cloud SQL');
});
```

**Current State**:
- Search.tsx calls `fetchItineraries()` to get user's itineraries
- Mutual like check: `myItinerary.likes.includes(otherUserUid)`
- Need to verify RPC-backed logic is tested

---

## 📋 Edge Cases Summary

### **Cloud SQL Migration Edge Cases**

| Edge Case | Tested? | Risk | Priority |
|-----------|---------|------|----------|
| RPC timeout during search | ❌ | 🔴 Critical | P0 |
| Prisma schema version mismatch | ❌ | 🔴 Critical | P0 |
| BigInt overflow for date fields | ❌ | 🟡 High | P1 |
| JSONB parsing errors | ❌ | 🟡 High | P1 |
| Partial results from RPC | ❌ | 🟡 High | P1 |
| Cloud SQL proxy disconnect | ❌ | 🔴 Critical | P0 |
| Concurrent writes to same itinerary | ❌ | 🟢 Medium | P2 |

### **User Profile Validation Edge Cases**

| Edge Case | Tested? | Risk | Priority |
|-----------|---------|------|----------|
| Profile incomplete (missing dob/gender) | ✅ Partial | 🔴 Critical | P0 |
| No travel preference profiles exist | ❌ | 🔴 Critical | P0 |
| Profile updated while modal open | ❌ | 🟡 High | P1 |
| UserProfileContext not provided | ⚠️ Partial | 🟡 High | P1 |
| localStorage vs Firestore profile conflict | ❌ | 🟢 Medium | P2 |

### **AI Itinerary Edge Cases**

| Edge Case | Tested? | Risk | Priority |
|-----------|---------|------|----------|
| AI itinerary missing metadata | ❌ | 🔴 Critical | P0 |
| AI itinerary in Search dropdown | ❌ | 🔴 Critical | P0 |
| Edit AI itinerary preserves response.data | ⚠️ Partial | 🟡 High | P1 |
| Share AI itinerary (public link) | ❌ | 🟡 High | P1 |
| AI itinerary expired (endDay < now) | ❌ | 🟢 Medium | P2 |

### **Landing Page Edge Cases**

| Edge Case | Tested? | Risk | Priority |
|-----------|---------|------|----------|
| Authenticated user redirect to /profile | ✅ Yes | 🟢 Low | P3 |
| Query param preservation during redirect | ❌ | 🟢 Medium | P2 |
| Video autoplay failure | ⚠️ Unknown | 🟢 Medium | P2 |

---

## 🎯 Recommended Test Implementation Priority

### **Sprint 1 (P0 - Critical)**
1. ✅ **Cloud SQL RPC failure scenarios** - 8 tests
2. ✅ **User profile validation integration** - 6 tests
3. ✅ **AI itinerary in Search dropdown** - 10 tests

### **Sprint 2 (P1 - High)**
4. ✅ **AIItineraryDisplay edit/share** - 8 tests
5. ✅ **Travel preferences AI requirements** - 6 tests
6. ✅ **Landing page integration** - 3 tests

### **Sprint 3 (P2 - Medium)**
7. ✅ **Blocked users filtering** - 4 tests
8. ✅ **Usage tracking Cloud SQL** - 3 tests
9. ✅ **Example itinerary Cloud SQL** - 4 tests

### **Sprint 4 (P3 - Low)**
10. ✅ **Mutual likes Cloud SQL** - 3 tests

**Total New Tests Needed**: ~55 tests across 10 test files

---

## 🔧 Testing Infrastructure Recommendations

### 1. **Create Cloud SQL Test Utilities**

```typescript
// src/test-utils/cloudSqlMocks.ts
export const mockCloudSqlRpc = (name: string, response: any) => {
  (global as any).__mock_httpsCallable = jest.fn((functions, rpcName) => {
    if (rpcName === name) {
      return jest.fn(() => Promise.resolve(response));
    }
  });
};

export const mockCloudSqlError = (name: string, error: Error) => {
  // Mock RPC failure
};

export const mockPrismaItinerary = (overrides?: Partial<Itinerary>) => {
  return {
    id: 'test-itin-1',
    userId: 'test-user',
    destination: 'Paris',
    // ... all required Prisma fields
    ...overrides
  };
};
```

### 2. **Create Integration Test Helper**

```typescript
// src/test-utils/integrationHelpers.tsx
export const renderWithFullContext = (component: React.ReactElement, options?: {
  userProfile?: UserProfile;
  authenticated?: boolean;
  itineraries?: Itinerary[];
}) => {
  // Wrap with all required providers
  return render(
    <BrowserRouter>
      <UserAuthContext.Provider value={...}>
        <UserProfileContext.Provider value={...}>
          <AlertProvider>
            {component}
          </AlertProvider>
        </UserProfileContext.Provider>
      </UserAuthContext.Provider>
    </BrowserRouter>
  );
};
```

### 3. **Add E2E Test for Critical Path**

```typescript
// cypress/e2e/userJourney.cy.ts
describe('User Journey - Profile to AI Itinerary', () => {
  it('should complete full flow: register → profile → travel prefs → AI gen → search', () => {
    // 1. Register new user
    cy.visit('/Register');
    // ... fill form
    
    // 2. Complete user profile
    cy.url().should('include', '/profile');
    // ... set dob, gender
    
    // 3. Create travel preference profile
    // ... fill travel prefs
    
    // 4. Generate AI itinerary
    // ... trigger AI generation
    
    // 5. Search for matches
    cy.visit('/Search');
    // ... select AI itinerary from dropdown
    // ... verify matches displayed
  });
});
```

---

## 📊 Current Test Coverage Analysis

Based on grep results:

| Component/Hook | Test Files | Coverage | Gaps |
|----------------|-----------|----------|------|
| useSearchItineraries | 1 (30 tests) | ✅ Good | Cloud SQL errors |
| AddItineraryModal | 3 files (32+ tests) | ✅ Good | Integration flow |
| AIItineraryDisplay | 3 files (many tests) | ✅ Good | Edit/Share RPC |
| LandingPage | 1 file (basic) | ⚠️ Partial | Redirect, video |
| Search | 1 file (large) | ✅ Good | AI dropdown |
| useTravelPreferences | 2 files | ✅ Good | AI integration |
| useAIGeneration | 1 file (14 tests) | ✅ Good | Profile validation |
| ProfileValidationService | 1 file | ✅ Yes | Integration |

**Overall Coverage**: ~75% (estimated)  
**Critical Gaps**: ~25% of user flows untested

---

## 🚨 Immediate Actions Required

1. **Add Cloud SQL RPC error handling tests** (Sprint 1)
2. **Test AI itinerary selection in Search dropdown** (Sprint 1)
3. **Integration test for profile validation flow** (Sprint 1)
4. **Verify AIItineraryDisplay edit/share with Cloud SQL** (Sprint 2)
5. **Add E2E test for critical user journey** (Sprint 2)

---

## 📝 Test Creation Checklist

For each new test file:
- [ ] Import Cloud SQL mock utilities
- [ ] Mock `httpsCallable` for RPC calls
- [ ] Mock `UserProfileContext` provider
- [ ] Test both success and error paths
- [ ] Test loading states
- [ ] Test edge cases (empty data, malformed responses)
- [ ] Verify console errors/warnings for debugging
- [ ] Add descriptive test names
- [ ] Group related tests in `describe` blocks

---

**Last Updated**: October 18, 2025  
**Status**: 🔴 Critical gaps identified - immediate action required
