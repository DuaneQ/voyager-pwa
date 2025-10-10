# REF-07: Add Comprehensive Error Boundaries

## Problem
**Type**: Safety & Reliability  
**Location**: Missing error boundaries around critical user flows  
**Risk**: High

The application lacks proper error boundaries, meaning JavaScript errors during AI generation or itinerary operations cause complete UI crashes instead of graceful degradation.

## Current Risk Areas

### AI Generation Flow - No Error Recovery
```typescript
// src/components/modals/AIItineraryGenerationModal.tsx
// ❌ No error boundary wrapping the complex AI generation process
const handleGenerate = async () => {
  // If ANY step fails, entire modal becomes unusable
  setProgress({ stage: 'searching', percent: 10 });
  const result = await generateItinerary(formData); // Can throw and crash UI
  setProgress({ stage: 'optimization', percent: 80 });
  // ... more steps that can fail
};
```

### Search Component - Unhandled Errors
```typescript  
// src/components/pages/Search.tsx
// ❌ No error boundary for search operations
const handleLike = async (itinerary: Itinerary) => {
  // Network errors, Firestore failures, etc. can crash the component
  await trackView(); // Can throw
  await updateDoc(userRef, { /* ... */ }); // Can throw
  // User loses entire search progress if any step fails
};
```

### Profile Management - Critical Data Loss Risk
```typescript
// src/components/forms/TravelPreferencesTab.tsx  
// ❌ Profile saves can fail silently or crash component
const saveCurrentProfile = async () => {
  // If this throws, user loses all their profile work
  await updateUserProfile(currentPreferences); // Can throw
};
```

## Solution: Layered Error Boundary Strategy

### Level 1: Application-Wide Error Boundary
```typescript
// src/components/error/AppErrorBoundary.tsx
interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

export class AppErrorBoundary extends Component<
  PropsWithChildren<{}>, 
  AppErrorBoundaryState
> {
  constructor(props: PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    // Generate unique error ID for tracking
    const errorId = `app-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Enhanced error reporting
    logger.error('Application Error Boundary Caught Error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Report to error tracking service (if available)
    if (process.env.NODE_ENV === 'production') {
      this.reportErrorToService(error, errorInfo);
    }
  }

  private reportErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // Integration with error tracking (Sentry, LogRocket, etc.)
    // For now, we'll use a simple fetch to a logging endpoint
    fetch('/api/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
        timestamp: new Date().toISOString(),
        userId: auth.currentUser?.uid
      })
    }).catch(() => {
      // Silently fail - don't crash on error reporting
    });
  };

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: 3,
            textAlign: 'center'
          }}
        >
          <Alert severity="error" sx={{ mb: 3, maxWidth: 600 }}>
            <AlertTitle>Something went wrong</AlertTitle>
            We apologize for the inconvenience. An unexpected error occurred.
          </Alert>
          
          <Typography variant="h6" gutterBottom>
            Error ID: {this.state.errorId}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Please try refreshing the page. If the problem persists, contact support with the error ID above.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={this.handleRetry}>
              Try Again
            </Button>
            <Button variant="contained" onClick={this.handleReload}>
              Reload Page
            </Button>
          </Box>
          
          {process.env.NODE_ENV === 'development' && (
            <Box sx={{ mt: 3, textAlign: 'left', maxWidth: 800 }}>
              <Typography variant="h6">Development Details:</Typography>
              <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                {this.state.error?.stack}
              </pre>
            </Box>
          )}
        </Box>
      );
    }

    return this.props.children;
  }
}
```

### Level 2: Feature-Specific Error Boundaries

#### AI Generation Error Boundary
```typescript
// src/components/error/AIGenerationErrorBoundary.tsx
interface AIErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

export class AIGenerationErrorBoundary extends Component<
  PropsWithChildren<{ onRetry?: () => void; onCancel?: () => void }>,
  AIErrorBoundaryState
> {
  private maxRetries = 2;
  
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): AIErrorBoundaryState {
    return { hasError: true, error, retryCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    logger.error('AI Generation Error', {
      error: error.message,
      stack: error.stack,
      retryCount: this.state.retryCount
    });
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prev => ({ 
        hasError: false, 
        error: undefined,
        retryCount: prev.retryCount + 1 
      }));
      this.props.onRetry?.();
    }
  };

  render() {
    if (this.state.hasError) {
      const canRetry = this.state.retryCount < this.maxRetries;
      
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>AI Generation Failed</AlertTitle>
            {this.state.error?.message || 'An error occurred during itinerary generation'}
          </Alert>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {canRetry 
              ? `Retry attempt ${this.state.retryCount + 1} of ${this.maxRetries + 1}`
              : 'Maximum retries exceeded. Please try again later.'
            }
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            {canRetry && (
              <Button variant="outlined" onClick={this.handleRetry}>
                Retry Generation
              </Button>
            )}
            <Button variant="contained" onClick={this.props.onCancel}>
              Close
            </Button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}
```

#### Search Operations Error Boundary
```typescript
// src/components/error/SearchErrorBoundary.tsx
export const SearchErrorBoundary: React.FC<PropsWithChildren<{
  onErrorRecovery?: () => void;
}>> = ({ children, onErrorRecovery }) => {
  return (
    <ErrorBoundary
      fallback={({ error, resetError }) => (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>Search Temporarily Unavailable</AlertTitle>
            There was a problem loading matches. Your itineraries are safe.
          </Alert>
          
          <Typography variant="body2" sx={{ mb: 2 }}>
            This is usually a temporary issue. Try refreshing or creating a new itinerary.
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button 
              variant="outlined" 
              onClick={() => {
                resetError();
                onErrorRecovery?.();
              }}
            >
              Try Again
            </Button>
            <Button variant="contained" href="/itineraries/create">
              Create New Itinerary
            </Button>
          </Box>
        </Box>
      )}
    >
      {children}
    </ErrorBoundary>
  );
};
```

### Level 3: Hook-Level Error Handling

#### Enhanced useAIGeneration with Error Recovery
```typescript
// src/hooks/useAIGeneration.ts - Enhanced error handling
export const useAIGeneration = () => {
  // ... existing state
  const [errorRecovery, setErrorRecovery] = useState<{
    step: string;
    retryCount: number;
    originalRequest?: AIGenerationRequest;
  } | null>(null);

  const generateItinerary = useCallback(async (request: AIGenerationRequest) => {
    let currentStep = 'initialization';
    
    try {
      setIsGenerating(true);
      setError(null);
      setErrorRecovery(null);

      // Store request for potential retry
      setErrorRecovery({ step: currentStep, retryCount: 0, originalRequest: request });

      currentStep = 'validation';
      setProgress({ stage: 'searching', percent: 10 });
      
      // ... existing generation logic with step tracking
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('AI Generation Failed', {
        step: currentStep,
        error: errorMessage,
        request: request
      });
      
      setError(`Generation failed at ${currentStep}: ${errorMessage}`);
      setErrorRecovery(prev => prev ? { ...prev, step: currentStep } : null);
      
      // Don't rethrow - handle gracefully
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const retryFromLastStep = useCallback(async () => {
    if (errorRecovery?.originalRequest && errorRecovery.retryCount < 2) {
      setErrorRecovery(prev => prev ? { ...prev, retryCount: prev.retryCount + 1 } : null);
      await generateItinerary(errorRecovery.originalRequest);
    }
  }, [errorRecovery, generateItinerary]);

  return {
    // ... existing returns
    errorRecovery,
    retryFromLastStep,
    canRetry: errorRecovery && errorRecovery.retryCount < 2
  };
};
```

## Integration Strategy

### App.tsx Integration
```typescript
// src/App.tsx
function App() {
  return (
    <AppErrorBoundary>
      <UserProfileProvider>
        <AlertProvider>
          <Router>
            <Routes>
              <Route path="/search" element={
                <SearchErrorBoundary>
                  <Search />
                </SearchErrorBoundary>
              } />
              {/* ... other routes */}
            </Routes>
          </Router>
        </AlertProvider>
      </UserProfileProvider>
    </AppErrorBoundary>
  );
}
```

### AI Modal Integration
```typescript
// src/components/modals/AIItineraryGenerationModal.tsx
export const AIItineraryGenerationModal: React.FC<Props> = (props) => {
  const { retryFromLastStep, canRetry } = useAIGeneration();
  
  return (
    <Dialog open={props.open} onClose={props.onClose}>
      <AIGenerationErrorBoundary 
        onRetry={retryFromLastStep}
        onCancel={props.onClose}
      >
        {/* Existing modal content */}
      </AIGenerationErrorBoundary>
    </Dialog>
  );
};
```

## Benefits Analysis

### User Experience
- **No More White Screens**: Crashes show helpful error messages instead
- **Graceful Degradation**: Critical errors don't break entire app
- **Recovery Options**: Users can retry operations without losing progress
- **Better Communication**: Clear error messages with actionable steps

### Development Benefits
- **Easier Debugging**: Structured error logging with context
- **Error Tracking**: Automatic error reporting in production
- **Reduced Support Load**: Users can self-recover from many errors
- **Better Monitoring**: Error boundaries provide metrics on app reliability

### Performance Impact
- **Bundle Size**: +3KB (error boundary components)
- **Runtime Performance**: Minimal overhead, only active during errors
- **Memory Usage**: Slight increase for error tracking state

## Implementation Timeline

### Phase 1: Core Error Boundaries (4 hours)
- Implement AppErrorBoundary with basic error UI
- Add AIGenerationErrorBoundary
- Create SearchErrorBoundary component

### Phase 2: Hook Error Handling (3 hours)
- Enhance useAIGeneration with retry logic
- Add error recovery to useUsageTracking
- Update useSearchItineraries error handling

### Phase 3: Integration & Testing (4 hours)
- Integrate error boundaries into main components
- Add error simulation for testing
- Create comprehensive error recovery tests

### Phase 4: Monitoring & Polish (2 hours)
- Add error reporting service integration
- Implement error metrics collection
- Polish error UI and messages

## Testing Strategy
```typescript
describe('Error Boundaries', () => {
  it('should catch errors in AI generation and show retry option', () => {
    const ThrowingComponent = () => {
      throw new Error('Test AI generation error');
    };
    
    render(
      <AIGenerationErrorBoundary onRetry={mockRetry} onCancel={mockCancel}>
        <ThrowingComponent />
      </AIGenerationErrorBoundary>
    );
    
    expect(screen.getByText(/AI Generation Failed/)).toBeInTheDocument();
    expect(screen.getByText('Retry Generation')).toBeInTheDocument();
  });
  
  it('should disable retry after max attempts', () => {
    // Simulate multiple failures
    // Verify retry button becomes disabled
  });
});
```

## Files to Create/Modify
- `src/components/error/AppErrorBoundary.tsx` (new)
- `src/components/error/AIGenerationErrorBoundary.tsx` (new)
- `src/components/error/SearchErrorBoundary.tsx` (new)
- `src/hooks/useAIGeneration.ts` (enhance error handling)
- `src/App.tsx` (add error boundaries)
- `src/components/modals/AIItineraryGenerationModal.tsx` (wrap with error boundary)

## Estimated Effort
**Time**: 13 hours  
**Complexity**: Medium-High  
**Risk**: Low (additive feature, improves stability)