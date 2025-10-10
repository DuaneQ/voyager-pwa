# REF-10: Implement Search Cache Cleanup Strategy

## Problem
**Type**: Safety & Performance  
**Location**: `src/utils/searchCache.ts` - Missing cleanup mechanism  
**Risk**: Medium

The search cache grows unboundedly without cleanup, leading to potential memory leaks and localStorage quota exhaustion, especially for power users.

## Current Issues

### No Cache Size Management
```typescript
// src/utils/searchCache.ts - Current implementation
class SearchCache {
  private cache = new Map<string, CacheEntry>();
  
  set(key: string, data: any) {
    // ❌ No size limits - cache grows indefinitely
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // ❌ No cleanup of expired entries
    this.persistToStorage();
  }
  
  // ❌ No automatic cleanup methods
}
```

### Potential Memory Issues
```typescript
// With heavy usage:
// - 50 searches per day × 30 days = 1,500 cache entries
// - Each entry ~5-15KB = 7.5-22.5MB in memory  
// - localStorage quota (5-10MB) easily exceeded
// - No LRU eviction strategy
```

### No Usage Analytics
```typescript
// Current cache provides no insights into:
// - Hit/miss ratios
// - Cache size growth
// - Most frequently accessed entries
// - Performance impact
```

## Solution: Comprehensive Cache Management

### Enhanced Cache with Cleanup
```typescript
// src/utils/searchCache.ts - Enhanced implementation
interface CacheEntry {
  data: any;
  timestamp: number;
  accessCount: number;    // ✅ Track usage frequency
  lastAccessed: number;   // ✅ Track recency for LRU
  size: number;          // ✅ Approximate entry size in bytes
}

interface CacheMetrics {
  totalEntries: number;
  totalSize: number;
  hitCount: number;
  missCount: number;
  evictionCount: number;
  oldestEntry: number;
  newestEntry: number;
}

interface CacheConfig {
  maxEntries: number;           // Max number of entries
  maxSizeBytes: number;         // Max total cache size
  ttlMs: number;               // Time to live for entries
  cleanupIntervalMs: number;    // How often to run cleanup
  evictionStrategy: 'lru' | 'lfu' | 'fifo';
}

class SearchCache {
  private cache = new Map<string, CacheEntry>();
  private metrics: CacheMetrics = {
    totalEntries: 0,
    totalSize: 0,
    hitCount: 0,
    missCount: 0,
    evictionCount: 0,
    oldestEntry: Date.now(),
    newestEntry: Date.now()
  };
  
  private config: CacheConfig = {
    maxEntries: 100,              // Reasonable limit for mobile
    maxSizeBytes: 2 * 1024 * 1024, // 2MB max cache size
    ttlMs: 5 * 60 * 1000,         // 5 minutes TTL
    cleanupIntervalMs: 60 * 1000,  // Cleanup every minute
    evictionStrategy: 'lru'
  };
  
  private cleanupTimer: NodeJS.Timeout | null = null;
  
  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...this.config, ...config };
    this.loadFromStorage();
    this.startCleanupTimer();
    
    // ✅ Cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.cleanup());
    }
  }
  
  // ✅ Enhanced get with metrics tracking
  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.metrics.missCount++;
      return null;
    }
    
    // ✅ Check if entry is expired
    const isExpired = Date.now() - entry.timestamp > this.config.ttlMs;
    if (isExpired) {
      this.cache.delete(key);
      this.updateMetrics();
      this.metrics.missCount++;
      return null;
    }
    
    // ✅ Update access tracking for LRU/LFU
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    
    this.metrics.hitCount++;
    return entry.data;
  }
  
  // ✅ Enhanced set with size management
  set(key: string, data: any): void {
    const serializedSize = this.estimateSize(data);
    
    // ✅ Check if single entry exceeds max size
    if (serializedSize > this.config.maxSizeBytes) {
      console.warn('SearchCache: Entry too large, not caching', { key, size: serializedSize });
      return;
    }
    
    const now = Date.now();
    const entry: CacheEntry = {
      data,
      timestamp: now,
      lastAccessed: now,
      accessCount: 1,
      size: serializedSize
    };
    
    // ✅ Remove existing entry if updating
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // ✅ Ensure cache doesn't exceed limits before adding
    this.makeRoom(serializedSize);
    
    this.cache.set(key, entry);
    this.updateMetrics();
    this.persistToStorage();
  }
  
  // ✅ Smart cache eviction
  private makeRoom(requiredSize: number): void {
    // Calculate current size
    let currentSize = 0;
    for (const entry of this.cache.values()) {
      currentSize += entry.size;
    }
    
    // Check if we need to make room
    const wouldExceedSize = (currentSize + requiredSize) > this.config.maxSizeBytes;
    const wouldExceedCount = this.cache.size >= this.config.maxEntries;
    
    if (!wouldExceedSize && !wouldExceedCount) {
      return;
    }
    
    // ✅ Determine how much space to free up (25% buffer)
    const targetReduction = wouldExceedSize 
      ? (currentSize + requiredSize - this.config.maxSizeBytes) * 1.25
      : this.config.maxEntries * 0.1; // Remove 10% of entries
      
    this.evictEntries(targetReduction, wouldExceedSize);
  }
  
  // ✅ Eviction strategies
  private evictEntries(targetReduction: number, bySizeNotCount: boolean): void {
    const entries = Array.from(this.cache.entries());
    let evicted = 0;
    let sizeFreed = 0;
    
    // ✅ Sort entries based on eviction strategy
    entries.sort(([, a], [, b]) => {
      switch (this.config.evictionStrategy) {
        case 'lru':
          return a.lastAccessed - b.lastAccessed; // Oldest first
        case 'lfu':
          return a.accessCount - b.accessCount;   // Least used first
        case 'fifo':
        default:
          return a.timestamp - b.timestamp;      // Oldest first
      }
    });
    
    // ✅ Evict entries until target reached
    for (const [key, entry] of entries) {
      if (bySizeNotCount && sizeFreed >= targetReduction) break;
      if (!bySizeNotCount && evicted >= targetReduction) break;
      
      this.cache.delete(key);
      sizeFreed += entry.size;
      evicted++;
      this.metrics.evictionCount++;
    }
    
    console.log(`SearchCache: Evicted ${evicted} entries, freed ${sizeFreed} bytes`);
  }
  
  // ✅ Periodic cleanup of expired entries
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      const isExpired = now - entry.timestamp > this.config.ttlMs;
      if (isExpired) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`SearchCache: Cleaned up ${cleanedCount} expired entries`);
      this.updateMetrics();
      this.persistToStorage();
    }
  }
  
  // ✅ Size estimation for cache entries
  private estimateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      // Fallback estimation
      const str = JSON.stringify(data);
      return str.length * 2; // Rough estimate for UTF-16
    }
  }
  
  // ✅ Metrics calculation
  private updateMetrics(): void {
    this.metrics.totalEntries = this.cache.size;
    
    let totalSize = 0;
    let oldest = Date.now();
    let newest = 0;
    
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
      oldest = Math.min(oldest, entry.timestamp);
      newest = Math.max(newest, entry.timestamp);
    }
    
    this.metrics.totalSize = totalSize;
    this.metrics.oldestEntry = oldest;
    this.metrics.newestEntry = newest;
  }
  
  // ✅ Cleanup timer management
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupIntervalMs);
  }
  
  // ✅ Enhanced storage persistence with size limits
  private persistToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const cacheData = {
        entries: Array.from(this.cache.entries()),
        metrics: this.metrics,
        timestamp: Date.now()
      };
      
      const serialized = JSON.stringify(cacheData);
      
      // ✅ Check localStorage quota before storing
      if (serialized.length > 1024 * 1024) { // 1MB limit for localStorage
        console.warn('SearchCache: Cache too large for localStorage, skipping persist');
        return;
      }
      
      localStorage.setItem(this.storageKey, serialized);
    } catch (error) {
      console.warn('SearchCache: Failed to persist to storage', error);
      // ✅ Clear cache if storage is full
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.clearOldEntries();
      }
    }
  }
  
  // ✅ Emergency cleanup when storage quota exceeded
  private clearOldEntries(): void {
    const entries = Array.from(this.cache.entries());
    const toRemove = Math.ceil(entries.length * 0.5); // Remove 50%
    
    entries
      .sort(([, a], [, b]) => a.timestamp - b.timestamp) // Oldest first
      .slice(0, toRemove)
      .forEach(([key]) => this.cache.delete(key));
      
    this.updateMetrics();
    console.log(`SearchCache: Emergency cleanup removed ${toRemove} entries`);
  }
  
  // ✅ Cache analytics and monitoring
  getMetrics(): CacheMetrics & { hitRate: number; averageEntrySize: number } {
    const total = this.metrics.hitCount + this.metrics.missCount;
    const hitRate = total > 0 ? this.metrics.hitCount / total : 0;
    const averageEntrySize = this.metrics.totalEntries > 0 
      ? this.metrics.totalSize / this.metrics.totalEntries 
      : 0;
      
    return {
      ...this.metrics,
      hitRate,
      averageEntrySize
    };
  }
  
  // ✅ Manual cache management
  clear(): void {
    this.cache.clear();
    this.metrics = {
      totalEntries: 0,
      totalSize: 0,
      hitCount: 0,
      missCount: 0,
      evictionCount: 0,
      oldestEntry: Date.now(),
      newestEntry: Date.now()
    };
    
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn('SearchCache: Failed to clear localStorage', error);
    }
  }
  
  // ✅ Cleanup on destroy
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cleanup();
    this.persistToStorage();
  }
}

// ✅ Export configured instance
export const searchCache = new SearchCache({
  maxEntries: 50,                    // Conservative for mobile
  maxSizeBytes: 1.5 * 1024 * 1024,  // 1.5MB
  ttlMs: 5 * 60 * 1000,             // 5 minutes
  cleanupIntervalMs: 2 * 60 * 1000,  // Cleanup every 2 minutes
  evictionStrategy: 'lru'
});
```

## Cache Monitoring Hook
```typescript
// src/hooks/useCacheMonitoring.ts
export const useCacheMonitoring = () => {
  const [metrics, setMetrics] = useState(searchCache.getMetrics());
  
  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(searchCache.getMetrics());
    };
    
    // Update metrics every 30 seconds
    const interval = setInterval(updateMetrics, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  const clearCache = useCallback(() => {
    searchCache.clear();
    setMetrics(searchCache.getMetrics());
  }, []);
  
  const isHealthy = useMemo(() => {
    return metrics.hitRate > 0.7 && // Good hit rate
           metrics.totalSize < 1024 * 1024 && // Under 1MB
           metrics.totalEntries < 75; // Not too many entries
  }, [metrics]);
  
  return {
    metrics,
    clearCache,
    isHealthy,
    // Formatted metrics for display
    formattedMetrics: {
      hitRate: `${(metrics.hitRate * 100).toFixed(1)}%`,
      totalSize: `${(metrics.totalSize / 1024).toFixed(1)} KB`,
      averageEntrySize: `${(metrics.averageEntrySize / 1024).toFixed(1)} KB`
    }
  };
};
```

## Debug Component for Development
```typescript
// src/components/debug/CacheDebugPanel.tsx (development only)
export const CacheDebugPanel: React.FC = () => {
  const { metrics, clearCache, isHealthy, formattedMetrics } = useCacheMonitoring();
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <Box sx={{ position: 'fixed', bottom: 10, right: 10, zIndex: 9999 }}>
      <Accordion>
        <AccordionSummary>
          <Typography variant="caption">
            Cache: {formattedMetrics.hitRate} hit rate
            {!isHealthy && <Chip label="⚠️" size="small" color="warning" />}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ minWidth: 200 }}>
            <Typography variant="body2">Entries: {metrics.totalEntries}</Typography>
            <Typography variant="body2">Size: {formattedMetrics.totalSize}</Typography>
            <Typography variant="body2">Hit Rate: {formattedMetrics.hitRate}</Typography>
            <Typography variant="body2">Evictions: {metrics.evictionCount}</Typography>
            <Button size="small" onClick={clearCache} sx={{ mt: 1 }}>
              Clear Cache
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};
```

## Benefits Analysis

### Performance & Reliability
- **Memory Usage**: Bounded growth prevents memory leaks
- **Storage Quota**: Intelligent localStorage management prevents quota errors
- **Cache Efficiency**: LRU eviction keeps most relevant data
- **Cleanup Automation**: Background cleanup prevents performance degradation

### Monitoring & Debugging
- **Hit Rate Tracking**: Measure cache effectiveness
- **Size Monitoring**: Track memory usage trends
- **Debug Tools**: Development panel for cache optimization
- **Performance Metrics**: Data to guide cache tuning

### User Experience  
- **Consistent Performance**: No slowdowns from cache bloat
- **Reliable Caching**: Cache works even when storage is limited
- **Background Cleanup**: No user-visible interruptions
- **Error Recovery**: Graceful handling of storage failures

## Implementation Plan

### Phase 1: Core Cleanup Logic (3 hours)
- Implement size tracking and estimation
- Add LRU eviction strategy  
- Create automatic cleanup timer
- Add comprehensive metrics

### Phase 2: Storage Management (2 hours)
- Implement localStorage quota handling
- Add emergency cleanup for quota errors
- Create robust persist/restore logic
- Add error recovery mechanisms

### Phase 3: Monitoring & Debug Tools (2 hours)
- Create cache monitoring hook
- Add debug panel for development
- Implement cache health checks
- Add performance logging

### Phase 4: Integration & Testing (2 hours)
- Update existing cache usage
- Add comprehensive unit tests
- Test edge cases (quota exceeded, large entries)
- Performance testing with large datasets

## Testing Strategy
```typescript
describe('Enhanced Search Cache', () => {
  beforeEach(() => {
    // Create cache with test config
    const testCache = new SearchCache({
      maxEntries: 5,
      maxSizeBytes: 1024,
      ttlMs: 100
    });
  });
  
  it('should evict oldest entries when max entries reached', () => {
    // Add 6 entries to cache with max 5
    // Verify oldest entry was evicted
  });
  
  it('should evict entries when size limit exceeded', () => {
    // Add entries totaling more than 1024 bytes
    // Verify entries were evicted to stay under limit
  });
  
  it('should clean up expired entries automatically', async () => {
    // Add entry, wait for TTL to expire
    // Verify entry is removed by cleanup
  });
  
  it('should handle localStorage quota exceeded gracefully', () => {
    // Mock DOMException for quota exceeded
    // Verify emergency cleanup is triggered
  });
  
  it('should track metrics accurately', () => {
    // Perform cache operations
    // Verify metrics are updated correctly
  });
});
```

## Files to Change
- `src/utils/searchCache.ts` (major enhancement)
- `src/hooks/useCacheMonitoring.ts` (new)
- `src/components/debug/CacheDebugPanel.tsx` (new, dev only)
- `src/__tests__/utils/searchCache.test.ts` (expanded tests)

## Performance Impact
- **Memory Usage**: Bounded to configured limits (default 1.5MB)
- **CPU Usage**: Minimal overhead from periodic cleanup
- **Storage I/O**: Reduced due to intelligent persistence
- **Bundle Size**: +2KB for enhanced cache logic

## Estimated Effort
**Time**: 9 hours  
**Complexity**: Medium-High  
**Risk**: Low (improves reliability, maintains existing API)