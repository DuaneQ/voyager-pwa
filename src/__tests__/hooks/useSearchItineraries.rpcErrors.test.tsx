/**
 * useSearchItineraries - Cloud SQL RPC Error Handling Tests
 * 
 * Tests critical failure modes when interacting with Cloud SQL via RPC:
 * - Timeout scenarios
 * - Connection failures  
 * - Malformed responses
 * - BigInt parsing errors
 * - JSONB field validation
 * - Retry logic
 */

// Ensure the auto-mocked `firebase/functions` returns a callable that
// consults per-RPC global handlers. This follows the project's test
// guidance in `.github/develop_unit_tests_prompt.md` and works with the
// `jest.setup.js` auto-mock installed from `__mocks__/firebase-functions.js`.
try {
  const { httpsCallable } = require('firebase/functions');
  if (httpsCallable && typeof httpsCallable.mockImplementation === 'function') {
    httpsCallable.mockImplementation((functions: any, name: string) => {
      return async (payload: any) => {
        const handlerKey = `__mock_httpsCallable_${name}`;
        if ((global as any)[handlerKey] && typeof (global as any)[handlerKey] === 'function') {
          return (global as any)[handlerKey](payload);
        }
        if ((global as any).__mockHttpsCallableReturn) return (global as any).__mockHttpsCallableReturn;
        return { data: { success: true, data: [] } };
      };
    });
  }
} catch (e) {
  // If require/mock APIs aren't available in this environment, tests that
  // rely on the shim will set globals directly. Swallow errors silently.
}

import { renderHook, act, waitFor } from '@testing-library/react';
import useSearchItineraries from '../../hooks/useSearchItineraries';
import {
  mockCloudSqlSuccess,
  mockCloudSqlError,
  mockCloudSqlTimeout,
  mockCloudSqlMalformed,
  mockCloudSqlConnectionFailure,
  mockPrismaConstraintViolation,
  createMockItinerary,
  createInvalidBigIntItinerary,
  createMalformedMetadataItinerary,
  cleanupCloudSqlMocks,
} from '../../test-utils/cloudSqlTestHelpers';

describe('useSearchItineraries - Cloud SQL RPC Error Handling', () => {
  const mockItinerary = createMockItinerary({
    id: 'current-user-itin',
    destination: 'Paris',
  });

  const mockUserId = 'test-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    cleanupCloudSqlMocks();
  });

  afterEach(() => {
    cleanupCloudSqlMocks();
  });

  describe('Timeout Scenarios', () => {
    it('should handle Cloud SQL RPC timeout gracefully', async () => {
      mockCloudSqlTimeout('searchItineraries');

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        try {
          await result.current.searchItineraries(mockItinerary, mockUserId);
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.error).toContain('timeout');
        expect(result.current.loading).toBe(false);
        expect(result.current.matchingItineraries).toHaveLength(0);
      });
    });

    it('should set hasMore to false after timeout', async () => {
      mockCloudSqlTimeout('searchItineraries');

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        try {
          await result.current.searchItineraries(mockItinerary, mockUserId);
        } catch (e) {
          // Expected
        }
      });

      await waitFor(() => {
        expect(result.current.hasMore).toBe(false);
      });
    });
  });

  describe('Connection Failures', () => {
    it('should handle Cloud SQL connection refused error', async () => {
      mockCloudSqlConnectionFailure('searchItineraries');

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        try {
          await result.current.searchItineraries(mockItinerary, mockUserId);
        } catch (e) {
          // Expected
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.error).toMatch(/connection|ECONNREFUSED/i);
        expect(result.current.matchingItineraries).toHaveLength(0);
      });
    });

    it('should handle network error during search', async () => {
      mockCloudSqlError('searchItineraries', new Error('Network request failed'));

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        try {
          await result.current.searchItineraries(mockItinerary, mockUserId);
        } catch (e) {
          // Expected
        }
      });

      await waitFor(() => {
        expect(result.current.error).toContain('Network');
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle Cloud SQL proxy disconnection', async () => {
      mockCloudSqlError(
        'searchItineraries',
        new Error('Cloud SQL proxy not running')
      );

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        try {
          await result.current.searchItineraries(mockItinerary, mockUserId);
        } catch (e) {
          // Expected
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.matchingItineraries).toHaveLength(0);
      });
    });
  });

  describe('Malformed Response Handling', () => {
    it('should handle response missing success field', async () => {
      mockCloudSqlMalformed('searchItineraries', {
        // Missing 'success' field
        data: [createMockItinerary()],
      });

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        try {
          await result.current.searchItineraries(mockItinerary, mockUserId);
        } catch (e) {
          // Expected
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle response with success=false', async () => {
      mockCloudSqlSuccess('searchItineraries', null);
      const mockCallable = jest.fn(() =>
        Promise.resolve({
          data: {
            success: false,
            error: 'Database query failed',
          },
        })
      );
      (global as any).__mock_httpsCallable_searchItineraries = mockCallable;

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        try {
          await result.current.searchItineraries(mockItinerary, mockUserId);
        } catch (e) {
          // Expected
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });

    it('should handle response where data is not an array', async () => {
      mockCloudSqlMalformed('searchItineraries', {
        success: true,
        data: 'invalid-not-an-array',
      });

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        try {
          await result.current.searchItineraries(mockItinerary, mockUserId);
        } catch (e) {
          // Expected
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });

    it('should handle null response data', async () => {
      mockCloudSqlMalformed('searchItineraries', {
        success: true,
        data: null,
      });

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        try {
          await result.current.searchItineraries(mockItinerary, mockUserId);
        } catch (e) {
          // Expected
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });
  });

  describe('BigInt Parsing Errors', () => {
    it('should filter out results with invalid BigInt startDay', async () => {
      const invalidResult = createInvalidBigIntItinerary();
      mockCloudSqlSuccess('searchItineraries', [invalidResult]);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockItinerary, mockUserId);
      });

      await waitFor(() => {
        // Should filter out invalid results
        expect(result.current.matchingItineraries).toHaveLength(0);
        expect(result.current.error).toBeFalsy();
      });
    });

    it('should handle mix of valid and invalid BigInt values', async () => {
      const validResult = createMockItinerary({ id: 'valid-1' });
      const invalidResult = createInvalidBigIntItinerary();

      mockCloudSqlSuccess('searchItineraries', [validResult, invalidResult]);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockItinerary, mockUserId);
      });

      await waitFor(() => {
        // Should include only valid result
        expect(result.current.matchingItineraries).toHaveLength(1);
        expect(result.current.matchingItineraries[0].id).toBe('valid-1');
      });
    });

    it('should handle BigInt overflow gracefully', async () => {
      const overflowResult = createMockItinerary({
        startDay: Number.MAX_SAFE_INTEGER + 1,
        endDay: Number.MAX_SAFE_INTEGER + 2,
      });

      mockCloudSqlSuccess('searchItineraries', [overflowResult]);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockItinerary, mockUserId);
      });

      // Should not crash, may filter or include based on validation
      await waitFor(() => {
        expect(result.current.error).toBeFalsy();
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('JSONB Field Validation', () => {
    it('should handle malformed JSONB metadata field', async () => {
      const malformedResult = createMalformedMetadataItinerary();
      mockCloudSqlSuccess('searchItineraries', [malformedResult]);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockItinerary, mockUserId);
      });

      // Should handle gracefully, not crash
      await waitFor(() => {
        expect(result.current.error).toBeFalsy();
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle JSONB field exceeding size limit', async () => {
      // Create very large metadata object (> 1MB)
      const largeMetadata: any = {
        filtering: {
          activities: new Array(100000).fill('activity'),
        },
      };

      const largeResult = createMockItinerary({
        id: 'large-metadata',
      }) as any;
      largeResult.metadata = largeMetadata;

      mockCloudSqlSuccess('searchItineraries', [largeResult]);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockItinerary, mockUserId);
      });

      // Should handle large payloads
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Prisma Constraint Violations', () => {
    it('should handle unique constraint violation', async () => {
      mockPrismaConstraintViolation('searchItineraries');

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        try {
          await result.current.searchItineraries(mockItinerary, mockUserId);
        } catch (e) {
          // Expected
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.matchingItineraries).toHaveLength(0);
      });
    });
  });

  describe('Partial Results Handling', () => {
    it('should handle partial results with some invalid entries', async () => {
      const validResults = [
        createMockItinerary({ id: 'valid-1', destination: 'Paris' }),
        createMockItinerary({ id: 'valid-2', destination: 'Rome' }),
      ];

      const invalidResult = { id: 'invalid', invalid: true };

      mockCloudSqlSuccess('searchItineraries', [
        validResults[0],
        invalidResult,
        validResults[1],
      ]);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockItinerary, mockUserId);
      });

      await waitFor(() => {
        // Should filter out invalid and keep valid
        expect(result.current.matchingItineraries.length).toBeGreaterThanOrEqual(2);
        expect(result.current.error).toBeFalsy();
      });
    });

    it('should set hasMore correctly with partial results', async () => {
      // Return exactly 10 results (PAGE_SIZE)
      const results = new Array(10)
        .fill(null)
        .map((_, i) => createMockItinerary({ id: `result-${i}` }));

      mockCloudSqlSuccess('searchItineraries', results);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockItinerary, mockUserId);
      });

      await waitFor(() => {
        // Should have hasMore=true if results.length >= PAGE_SIZE
        expect(result.current.hasMore).toBe(true);
      });
    });
  });

  describe('Error Recovery', () => {
    it('should clear error state on successful retry', async () => {
      // First call fails
      mockCloudSqlError('searchItineraries', new Error('First attempt failed'));

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        try {
          await result.current.searchItineraries(mockItinerary, mockUserId);
        } catch (e) {
          // Expected
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      // Second call succeeds
      mockCloudSqlSuccess('searchItineraries', [
        createMockItinerary({ id: 'success-result' }),
      ]);

      await act(async () => {
        await result.current.searchItineraries(mockItinerary, mockUserId);
      });

      await waitFor(() => {
        expect(result.current.error).toBeFalsy();
        expect(result.current.matchingItineraries).toHaveLength(1);
      });
    });

    it('should reset loading state after error', async () => {
      mockCloudSqlError('searchItineraries', new Error('Test error'));

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        try {
          await result.current.searchItineraries(mockItinerary, mockUserId);
        } catch (e) {
          // Expected
        }
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Edge Case: Empty Database', () => {
    it('should handle empty results correctly', async () => {
      mockCloudSqlSuccess('searchItineraries', []);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(mockItinerary, mockUserId);
      });

      await waitFor(() => {
        expect(result.current.matchingItineraries).toHaveLength(0);
        expect(result.current.hasMore).toBe(false);
        expect(result.current.error).toBeFalsy();
        expect(result.current.loading).toBe(false);
      });
    });
  });
});
