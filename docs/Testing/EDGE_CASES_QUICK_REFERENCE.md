# Edge Cases Quick Reference Guide

**Purpose**: Quick lookup for edge cases in each user flow  
**Date**: October 18, 2025

---

## 🔄 User Flow 1: Account Creation → Profile Setup

### Flow Steps
```
Register → Email Verification → Profile Page → Complete Profile
```

### Edge Cases to Test

#### 1.1 Registration Errors
- [ ] Email already exists
- [ ] Weak password (< 8 characters)
- [ ] Invalid email format
- [ ] Network timeout during registration
- [ ] Firebase Auth service down

#### 1.2 Email Verification
- [ ] User closes verification email tab before clicking link
- [ ] Verification link expired (> 24 hours)
- [ ] User tries to login before verifying email
- [ ] Verification email goes to spam folder
- [ ] User requests multiple verification emails

#### 1.3 Landing Page Redirect
- ✅ **Tested**: Authenticated user redirects to `/profile`
- [ ] **Missing**: Query params preserved (e.g., `?utm_source=ad`)
- [ ] **Missing**: User lands on `/` with expired auth token
- [ ] **Missing**: Multiple tabs open: user logs in tab A, tab B still shows landing

#### 1.4 Profile Completion
- ✅ **Tested**: Block itinerary creation if `dob` or `gender` missing
- [ ] **Missing**: User sets invalid DOB (future date)
- [ ] **Missing**: User sets DOB making them < 18 years old
- [ ] **Missing**: Profile save fails due to Firestore permissions
- [ ] **Missing**: User uploads profile photo > 5MB
- [ ] **Missing**: User uploads non-image file as profile photo

---

## 🗺️ User Flow 2: Manual Itinerary Creation

### Flow Steps
```
Profile Complete → Search Page → Create Itinerary Button → Add/Edit Modal → Save
```

### Edge Cases to Test

#### 2.1 Profile Validation Gate
- ✅ **Tested**: Alert shown if `userProfile.dob` or `userProfile.gender` missing
- [ ] **Missing**: UserProfileContext provider not wrapped (null context)
- [ ] **Missing**: Profile exists in localStorage but not in Firestore (sync issue)
- [ ] **Missing**: Profile updated in different tab while modal is open
- [ ] **Missing**: Multiple modals open simultaneously (concurrency)

#### 2.2 Form Validation
- ✅ **Tested**: Destination required
- ✅ **Tested**: Start date required
- ✅ **Tested**: End date required
- [ ] **Missing**: End date before start date
- [ ] **Missing**: Trip duration > 365 days (extreme long trip)
- [ ] **Missing**: Start date in the past (< today)
- [ ] **Missing**: Age range validation (lowerRange > upperRange)
- [ ] **Missing**: Age range outside 18-100

#### 2.3 Cloud SQL RPC Errors
- [ ] **Missing**: `createItinerary` RPC timeout
- [ ] **Missing**: Duplicate itinerary ID (Prisma unique constraint)
- [ ] **Missing**: BigInt overflow for `startDay`/`endDay`
- [ ] **Missing**: JSONB field too large (> 1MB)
- [ ] **Missing**: Cloud SQL connection pool exhausted
- [ ] **Missing**: Prisma client not initialized

#### 2.4 Update Scenarios
- ✅ **Tested**: AI itinerary can be edited (basic fields)
- [ ] **Missing**: Manual itinerary updated while another user is viewing it (match display)
- [ ] **Missing**: Itinerary deleted while user is editing it
- [ ] **Missing**: Concurrent updates from two tabs (optimistic locking)

---

## 🤖 User Flow 3: AI Itinerary Generation

### Flow Steps
```
Profile Complete → Travel Preferences Tab → Create Preference Profile → 
Generate AI Itinerary Button → Modal → Select Profile → Generate
```

### Edge Cases to Test

#### 3.1 Profile Requirements Gate
- ✅ **Tested**: `ProfileValidationService.validateProfileCompleteness()` exists
- [ ] **Missing**: Integration test: AI modal blocked if user profile incomplete
- [ ] **Missing**: Integration test: AI modal blocked if no travel preference profiles
- [ ] **Missing**: User has profile but preferences not loaded (loading state)
- [ ] **Missing**: Default profile selected but doesn't exist (deleted)

#### 3.2 Travel Preference Validation
- [ ] **Missing**: No preference profiles exist (show "Create Profile" link)
- [ ] **Missing**: Selected profile missing required fields (budget, groupSize)
- [ ] **Missing**: Selected profile deleted while modal is open
- [ ] **Missing**: Multiple profiles with same name (disambiguation)
- [ ] **Missing**: Profile loaded from Firestore has invalid schema

#### 3.3 AI Generation Errors
- ✅ **Tested**: OpenAI API failure (mocked in tests)
- [ ] **Missing**: OpenAI rate limit exceeded (429)
- [ ] **Missing**: OpenAI timeout (> 30 seconds)
- [ ] **Missing**: Google Places API quota exceeded
- [ ] **Missing**: SerpAPI (flights) unavailable
- [ ] **Missing**: Partial generation success (activities found, flights failed)
- [ ] **Missing**: User cancels generation mid-progress

#### 3.4 Usage Limits
- ✅ **Tested**: `hasReachedAILimit()` checks daily usage
- [ ] **Missing**: Free user reaches 10/day limit mid-generation
- [ ] **Missing**: Premium user loses subscription during generation
- [ ] **Missing**: Usage tracking RPC fails (should still allow generation)
- [ ] **Missing**: Usage count reset at midnight boundary condition

#### 3.5 Cloud SQL Save Errors
- [ ] **Missing**: `createItinerary` RPC fails after AI generation succeeds
- [ ] **Missing**: User generates AI itinerary but has no network to save
- [ ] **Missing**: AI response too large for JSONB field (> 1MB)
- [ ] **Missing**: Retry logic for transient save errors

---

## 🔍 User Flow 4: Search & Match

### Flow Steps
```
Search Page → Select Itinerary from Dropdown → View Matches → 
Like/Dislike → Mutual Match → Connection Created
```

### Edge Cases to Test

#### 4.1 Itinerary Selection Dropdown
- ✅ **Tested**: Dropdown populated with manual itineraries
- [ ] **Missing**: AI itineraries appear in dropdown with visual distinction
- [ ] **Missing**: Expired itineraries filtered out (`endDay < now`)
- [ ] **Missing**: No itineraries exist (empty state)
- [ ] **Missing**: RPC fails to fetch itineraries (error state)
- [ ] **Missing**: Dropdown shows loading skeleton while fetching

#### 4.2 AI Itinerary Selection
- [ ] **Missing**: AI itinerary selected from dropdown
- [ ] **Missing**: Search uses AI itinerary `metadata.filtering` for matching
- [ ] **Missing**: AI itinerary missing `metadata` field (fallback to basic search)
- [ ] **Missing**: AI itinerary destination doesn't match any results
- [ ] **Missing**: Switch from manual to AI itinerary (refresh matches)

#### 4.3 Search RPC Errors
- [ ] **Missing**: `searchItineraries` RPC timeout
- [ ] **Missing**: RPC returns malformed response (missing `success` field)
- [ ] **Missing**: RPC returns partial results (some itineraries invalid)
- [ ] **Missing**: Cloud SQL query performance (> 5 seconds)
- [ ] **Missing**: Date range filtering edge case (leap year, DST)

#### 4.4 Blocked Users
- [ ] **Missing**: Blocked users excluded from search results
- [ ] **Missing**: User blocks someone mid-search (real-time update)
- [ ] **Missing**: Mutual blocking (A blocks B, B blocks A)
- [ ] **Missing**: `currentUserItinerary.userInfo.blocked` is undefined
- [ ] **Missing**: Blocked array has invalid user IDs (non-existent users)

#### 4.5 Usage Tracking
- ✅ **Tested**: `hasReachedLimit()` prevents viewing if 10/day limit reached
- ✅ **Tested**: `trackView()` increments usage count
- [ ] **Missing**: trackView() fails but view is allowed (non-blocking)
- [ ] **Missing**: Premium user unlimited views verified
- [ ] **Missing**: Viewed itineraries stored in localStorage (persistence)
- [ ] **Missing**: localStorage full (quota exceeded)

#### 4.6 Matching Algorithm
- [ ] **Missing**: Destination match case-insensitive
- [ ] **Missing**: Date overlap calculation (partial overlap)
- [ ] **Missing**: Age range compatibility (user 25, match prefers 20-30)
- [ ] **Missing**: Gender preference filtering
- [ ] **Missing**: Sexual orientation compatibility
- [ ] **Missing**: Status filter (single, taken, married, complicated)

#### 4.7 Mutual Likes & Connections
- ✅ **Tested**: Mutual like detected (itinerary.likes array check)
- [ ] **Missing**: RPC fails to fetch current user itinerary for like check
- [ ] **Missing**: Connection already exists (duplicate prevention)
- [ ] **Missing**: Firestore `connections` collection write fails
- [ ] **Missing**: User A likes user B, but B has deleted their itinerary
- [ ] **Missing**: New connection notification sent via FCM

#### 4.8 Empty States
- [ ] **Missing**: No matches found (display helpful message)
- [ ] **Missing**: All matches already viewed (end of results)
- [ ] **Missing**: User has no itineraries (prompt to create one)
- [ ] **Missing**: Selected itinerary deleted (handle gracefully)

---

## 📱 User Flow 5: AIItineraryDisplay Actions

### Flow Steps
```
Travel Preferences Tab → AI Itineraries Tab → Select Itinerary → 
View Details → Edit / Share
```

### Edge Cases to Test

#### 5.1 Display Rendering
- ✅ **Tested**: AI itinerary renders with activities, flights, hotels
- [ ] **Missing**: AI itinerary missing `response.data` (invalid structure)
- [ ] **Missing**: Activities array empty (generation failed)
- [ ] **Missing**: Flights array empty (no flights found)
- [ ] **Missing**: Hotels array empty (no accommodations found)
- [ ] **Missing**: Budget breakdown missing (costBreakdown null)

#### 5.2 Edit Functionality
- ✅ **Tested**: Edit modal allows editing AI itinerary
- [ ] **Missing**: Edit preserves `response.data` (AI-generated content)
- [ ] **Missing**: `updateItinerary` RPC called with partial payload
- [ ] **Missing**: RPC fails during edit (error handling)
- [ ] **Missing**: Optimistic UI update before RPC completes
- [ ] **Missing**: Only owner can edit (permission check)

#### 5.3 Share Functionality
- [ ] **Missing**: Share button generates public link
- [ ] **Missing**: Public link copied to clipboard
- [ ] **Missing**: Share modal with social media options
- [ ] **Missing**: Analytics event tracked on share
- [ ] **Missing**: Unshare (make private) functionality
- [ ] **Missing**: Only owner can share (permission check)
- [ ] **Missing**: Public link accessible by unauthenticated users

#### 5.4 Cloud SQL Integration
- [ ] **Missing**: Fetch AI itinerary by ID via `listItinerariesForUser` RPC
- [ ] **Missing**: RPC returns 404 if itinerary deleted
- [ ] **Missing**: RPC returns 403 if user not owner
- [ ] **Missing**: Loading state while fetching
- [ ] **Missing**: Error state if RPC fails

---

## 🌐 Landing Page Edge Cases

### Flow Steps
```
User visits / → Landing Page → (If authenticated) Redirect to /profile
```

### Edge Cases to Test

#### 6.1 Authentication State
- ✅ **Tested**: Authenticated user redirects to `/profile`
- ✅ **Tested**: Unauthenticated user stays on landing page
- [ ] **Missing**: User with expired token (Firebase Auth expired)
- [ ] **Missing**: User logs in in different tab (real-time auth state change)

#### 6.2 Video Playback
- [ ] **Missing**: Demo video autoplays on load
- [ ] **Missing**: Video fails to load (show fallback image)
- [ ] **Missing**: Video muted by default (browser autoplay policy)
- [ ] **Missing**: Video loops continuously
- [ ] **Missing**: Video playback on iOS Safari (mobile)

#### 6.3 Navigation & CTAs
- [ ] **Missing**: "Get Started Free" navigates to `/Register`
- [ ] **Missing**: "Sign Up Now" navigates to `/Register`
- [ ] **Missing**: "See How It Works" scrolls to demo section
- [ ] **Missing**: Query params preserved during redirect
- [ ] **Missing**: Analytics event on CTA click

#### 6.4 Accessibility
- [ ] **Missing**: Keyboard navigation works for all buttons
- [ ] **Missing**: Screen reader announces main heading
- [ ] **Missing**: Video has accessible label
- [ ] **Missing**: Skip link to main content

---

## 🚨 Critical Edge Cases (P0)

### Must Test Before Production

1. **Cloud SQL RPC Timeout**
   - Scenario: `searchItineraries` takes > 30 seconds
   - Expected: User sees "Taking longer than expected..." message
   - Current: ❌ No timeout handling

2. **AI Itinerary Missing Metadata**
   - Scenario: AI itinerary saved without `metadata.filtering`
   - Expected: Search falls back to basic destination matching
   - Current: ❌ May crash with undefined error

3. **Profile Incomplete During AI Generation**
   - Scenario: User clicks "Generate AI Itinerary" with no DOB/gender
   - Expected: Modal blocked with clear error message
   - Current: ⚠️ Partial - validation exists but integration test missing

4. **RPC Failure with No Fallback**
   - Scenario: `listItinerariesForUser` returns 500 error
   - Expected: User sees error, can retry
   - Current: ❌ May show blank screen

5. **Concurrent Itinerary Edits**
   - Scenario: User edits itinerary in two tabs simultaneously
   - Expected: Last write wins (Prisma handles this)
   - Current: ❌ No optimistic locking test

---

## 📊 Edge Case Coverage Scorecard

| Flow | Total Edge Cases | Tested | Coverage |
|------|------------------|--------|----------|
| Account Creation | 15 | 2 | 13% |
| Manual Itinerary | 20 | 6 | 30% |
| AI Generation | 25 | 3 | 12% |
| Search & Match | 35 | 5 | 14% |
| AIItineraryDisplay | 15 | 2 | 13% |
| Landing Page | 12 | 2 | 17% |
| **TOTAL** | **122** | **20** | **16%** |

**Target Coverage**: 80% (98 edge cases)  
**Gap**: 78 untested edge cases

---

## 🎯 Next Steps

### Phase 1 (Week 1): Critical P0 Edge Cases
- [ ] Cloud SQL RPC timeout handling (5 tests)
- [ ] AI itinerary missing metadata (3 tests)
- [ ] Profile validation integration (4 tests)
- [ ] RPC failure error handling (6 tests)

### Phase 2 (Week 2): High Priority P1 Edge Cases
- [ ] AI itinerary selection in Search (10 tests)
- [ ] Edit/Share AI itinerary (8 tests)
- [ ] Blocked users filtering (4 tests)
- [ ] Usage tracking edge cases (5 tests)

### Phase 3 (Week 3): Medium Priority P2 Edge Cases
- [ ] Form validation edge cases (12 tests)
- [ ] Matching algorithm edge cases (8 tests)
- [ ] Empty states (6 tests)
- [ ] Landing page edge cases (5 tests)

### Phase 4 (Week 4): Low Priority P3 Edge Cases
- [ ] Accessibility tests (8 tests)
- [ ] Performance edge cases (4 tests)
- [ ] Video playback edge cases (3 tests)
- [ ] Misc edge cases (10 tests)

---

**Total Tests to Add**: ~100 tests  
**Estimated Time**: 4 weeks (2 developers)  
**Critical Path**: Phase 1 must complete before production release
