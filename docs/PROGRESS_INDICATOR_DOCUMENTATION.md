# AI Itinerary Generation Progress Indicator Documentation

## Overview
The AI Itinerary Generation system uses a real-time progress tracking mechanism that provides users with live updates during the generation process. This document details exactly how the progress indicator works.

## Architecture Components

### 1. Backend Progress System (Firebase Functions)
**File:** `/functions/src/aiItineraryProcessor.ts`

The backend uses Firestore as a real-time communication channel to update progress:

```typescript
// Progress tracking document structure in Firestore
{
  id: "gen_1692806904000_abcd1234",
  userId: "user123",
  status: "processing", // "processing" | "completed" | "failed"
  progress: {
    stage: 2,           // Current stage number (1-5)
    totalStages: 5,     // Total number of stages
    message: "Finding hotels..."  // Human-readable status message
  },
  percent: 25,          // Overall completion percentage (0-100)
  createdAt: Timestamp,
  updatedAt: Timestamp,
  // ... other fields
}
```

### 2. Frontend Progress System (React)
**File:** `/src/hooks/useAIGeneration.ts`

The frontend listens to Firestore changes in real-time using `onSnapshot`:

```typescript
const unsubscribe = onSnapshot(generationDoc, (doc) => {
  if (doc.exists()) {
    const data = doc.data();
    
    // Extract progress data
    if (data.progress) {
      setProgress({
        stage: firebaseProgress.stage,
        totalStages: firebaseProgress.totalStages,
        message: firebaseProgress.message,
        percent: data.percent || 0,  // Use backend-calculated percentage
        stages: mappedStages
      });
    }
  }
});
```

## Stage-by-Stage Progress Flow

### Stage 1: Finding Flights (15%)
```typescript
// Backend updates
await db.collection('ai_generations').doc(generationId).update({
  progress: {
    stage: 1,
    totalStages: 5,
    message: 'Finding flights...'
  },
  percent: 15,
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
});

// API Call
const flights = await findFlights(data);
```

### Stage 2: Finding Hotels (25%)
```typescript
// Deferred update (non-blocking)
setTimeout(() => {
  db.collection('ai_generations').doc(generationId).update({
    progress: {
      stage: 2,
      totalStages: 5,
      message: 'Finding hotels...'
    },
    percent: 25,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}, 0);

// API Call
const hotels = await findHotels(data);
```

### Stage 3: Gathering Points of Interest (45%)
```typescript
// Deferred update (non-blocking)
setTimeout(() => {
  db.collection('ai_generations').doc(generationId).update({
    progress: {
      stage: 3,
      totalStages: 5,
      message: 'Gathering points of interest...'
    },
    percent: 45,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}, 0);

// API Call
const attractions = await findAttractions(data);
```

### Stage 4: Finding Restaurants (55%)
```typescript
// Deferred update (non-blocking)
setTimeout(() => {
  db.collection('ai_generations').doc(generationId).update({
    progress: {
      stage: 4,
      totalStages: 5,
      message: 'Finding restaurants...'
    },
    percent: 55,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}, 0);

// Currently skipped - empty array
const restaurants = [];
```

### Stage 5: Generating Itinerary (85%)
```typescript
// Deferred update (non-blocking)
setTimeout(() => {
  db.collection('ai_generations').doc(generationId).update({
    progress: {
      stage: 5,
      totalStages: 5,
      message: 'Generating your personalized itinerary...'
    },
    percent: 85,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}, 0);

// AI Generation
const aiResult = await generateItineraryWithAI(...);
```

### Final: Completion (100%)
```typescript
// Final update with completed status
await db.collection('ai_generations').doc(generationId).update({
  status: 'completed',
  percent: 100,
  progress: {
    stage: 5,
    totalStages: 5,
    message: 'Generation completed!'
  },
  response: finalResult,
  completedAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
});
```

## UI Components

### 1. Progress Bar Component
**File:** `/src/components/common/AIGenerationProgress.tsx`

Displays the visual progress indicator:

```tsx
<LinearProgress 
  variant="determinate" 
  value={progress.percent || 0}  // Uses backend-calculated percentage
  sx={{ height: 8, borderRadius: 4 }}
/>
```

### 2. Stage Indicators
The UI shows 5 visual stages mapped to backend stages:

```typescript
const DEFAULT_STAGES = [
  {
    id: 'analyzing',
    label: 'Analyzing preferences',
    description: 'Processing your travel preferences and requirements',
    status: 'pending', // 'pending' | 'active' | 'completed' | 'error'
    estimatedDuration: 15
  },
  {
    id: 'finding',
    label: 'Finding activities', 
    description: 'Discovering the best activities and attractions',
    status: 'pending',
    estimatedDuration: 30
  },
  {
    id: 'optimizing',
    label: 'Optimizing schedule',
    description: 'Creating the perfect daily schedule', 
    status: 'pending',
    estimatedDuration: 25
  },
  {
    id: 'calculating',
    label: 'Calculating costs',
    description: 'Estimating costs and finding the best deals',
    status: 'pending', 
    estimatedDuration: 20
  },
  {
    id: 'finalizing',
    label: 'Finalizing itinerary',
    description: 'Putting the finishing touches on your trip',
    status: 'pending',
    estimatedDuration: 10
  }
];
```

### 3. Stage Status Mapping
Frontend maps backend stages to UI stage status:

```typescript
stages: stages.map((stage, index) => ({
  ...stage,
  status: index < currentStageIndex ? 'completed' : 
         index === currentStageIndex ? 'active' : 'pending'
}))
```

## Real-time Communication Flow

```
Backend Function                    Firestore                    Frontend Hook
      │                               │                             │
      ├─ Update progress ─────────────┤                             │
      │  { stage: 1, percent: 15 }    │                             │
      │                               ├─ onSnapshot trigger ───────┤
      │                               │                             ├─ setProgress()
      │                               │                             │
      ├─ Update progress ─────────────┤                             │
      │  { stage: 2, percent: 25 }    │                             │
      │                               ├─ onSnapshot trigger ───────┤
      │                               │                             ├─ setProgress()
      │                               │                             │
      └─ Final completion ────────────┤                             │
         { status: 'completed',        │                             │
           percent: 100 }              ├─ onSnapshot trigger ───────┤
                                       │                             ├─ Generation complete
                                       │                             └─ Show success alert
```

## Key Implementation Details

### 1. Non-blocking Progress Updates
To prevent progress updates from interfering with API calls, most updates use `setTimeout`:

```typescript
// Non-blocking update
setTimeout(() => {
  db.collection('ai_generations').doc(generationId).update({...});
}, 0);

// vs Blocking update (causes API timeouts)
await db.collection('ai_generations').doc(generationId).update({...});
```

### 2. Error Handling
Progress continues even if individual API calls fail:

```typescript
try {
  hotels = await findHotels(data);
} catch (error) {
  hotelError = error.message;
  hotels = []; // Continue with empty array
}
// Progress update still happens
```

### 3. Generation ID Tracking
Each generation gets a unique ID for progress tracking:

```typescript
const generationId = `gen_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
```

### 4. Cleanup and Memory Management
Frontend cleans up listeners when generation completes:

```typescript
useEffect(() => {
  return () => {
    console.log('🔕 Cleaning up Firestore listener');
    unsubscribe();
  };
}, [currentGenerationId]);
```

## Percentage Calculation

The backend manually sets percentage values for each stage:
- Stage 1 (Flights): 15%
- Stage 2 (Hotels): 25%  
- Stage 3 (Attractions): 45%
- Stage 4 (Restaurants): 55%
- Stage 5 (AI Generation): 85%
- Completion: 100%

The frontend no longer calculates percentages and relies entirely on backend values:

```typescript
// Current implementation
percent: data.percent || 0

// Previous implementation (removed)
percent: data.percent || (firebaseProgress.stage / firebaseProgress.totalStages * 100)
```

## Troubleshooting

### Common Issues

1. **Progress stuck at certain percentage**
   - Check Firestore document updates in Firebase Console
   - Verify backend function isn't timing out

2. **Progress jumps or skips stages**
   - Check network connectivity for real-time updates
   - Verify Firestore security rules allow reads

3. **API timeouts during progress**
   - Ensure progress updates are non-blocking (`setTimeout`)
   - Check external API rate limits

### Debug Logging

Backend logs:
```typescript
console.log('📊 Progress updated: finding_hotels (25%)');
```

Frontend logs:
```typescript
console.log('📊 Firestore progress update:', data.progress);
```

## Files Modified for Progress Tracking

- **Backend:** `/functions/src/aiItineraryProcessor.ts`
- **Frontend Hook:** `/src/hooks/useAIGeneration.ts`
- **UI Component:** `/src/components/modals/AIItineraryGenerationModal.tsx`
- **Progress Component:** `/src/components/common/AIGenerationProgress.tsx`
- **Parent Component:** `/src/components/forms/TravelPreferencesTab.tsx`
