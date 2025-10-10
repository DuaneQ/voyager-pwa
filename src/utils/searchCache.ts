interface CacheEntry {
  data: any[];
  timestamp: number;
  expiresAt: number;
  metadata?: CacheMetadata;
}

interface CacheMetadata {
  hasMore: boolean;
  lastDocId?: string;
  pageSize?: number;
  totalResults?: number;
  timestamp: number;
}

class SearchCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 50; // Store max 50 search results
  private hits: number = 0;
  private misses: number = 0;

  generateCacheKey(searchParams: any): string {
    if (!searchParams) {
      return 'null';
    }
    
    if (typeof searchParams === 'string') {
      return searchParams;
    }
    
    const { destination, userProfile } = searchParams;
    if (destination && userProfile) {
      // Remove commas and spaces to avoid parsing issues
      const cleanDestination = destination.replace(/[,\s]/g, '_');
      return `search_${cleanDestination}_${userProfile.gender}_${userProfile.status}_${userProfile.sexualOrientation}`;
    }
    
    return JSON.stringify(searchParams);
  }

  set(key: string, data: any[]): void {
    this.setWithMetadata(key, data, null);
  }

  setWithMetadata(key: string, data: any[], metadata: Partial<CacheMetadata> | null): void {

    // If we're adding a new key and cache is full, remove oldest entry
    if (!this.cache.has(key) && this.cache.size >= this.MAX_CACHE_SIZE) {
      // Get the first (oldest) key and remove it
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        // Also remove from localStorage
        try {
          const persistentCache = JSON.parse(localStorage.getItem('searchCache') || '{}');
          delete persistentCache[firstKey];
          localStorage.setItem('searchCache', JSON.stringify(persistentCache));
        } catch (error) {
          console.warn('Failed to remove from localStorage:', error);
        }
      }
    }

    const now = Date.now();
    const entry: CacheEntry = {
      data,
      timestamp: now,
      expiresAt: now + this.CACHE_DURATION
    };

    // Add metadata if provided
    if (metadata) {
      entry.metadata = {
        hasMore: metadata.hasMore ?? false,
        lastDocId: metadata.lastDocId,
        pageSize: metadata.pageSize,
        totalResults: metadata.totalResults,
        timestamp: now
      };
    }

    this.cache.set(key, entry);

    // Also store in localStorage for persistence across sessions
    try {
      const persistentCache = JSON.parse(localStorage.getItem('searchCache') || '{}');
      persistentCache[key] = entry;

      const serialized = JSON.stringify(persistentCache);
      localStorage.setItem('searchCache', serialized);

    } catch (error) {
      console.error('🔧 localStorage error:', error);
    }
  }

  get(key: string): any[] | null {

    // Check memory cache first
    const memoryEntry = this.cache.get(key);

    if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
      this.hits++;
      return memoryEntry.data;
    }

    // If expired in memory cache, remove it
    if (memoryEntry && memoryEntry.expiresAt <= Date.now()) {
      this.cache.delete(key);
    }

    // Check localStorage cache
    try {
      const persistentCache = JSON.parse(localStorage.getItem('searchCache') || '{}');

      const persistentEntry = persistentCache[key];

      if (persistentEntry && persistentEntry.expiresAt > Date.now()) {
        // Restore to memory cache if there's room
        if (this.cache.size < this.MAX_CACHE_SIZE) {
          this.cache.set(key, persistentEntry);
        }
        this.hits++;
        return persistentEntry.data;
      }
    } catch (error) {
      console.error('🔧 localStorage read error:', error);
    }

    this.misses++;
    return null;
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    try {
      localStorage.removeItem('searchCache');
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }

  // Delete a specific cache entry
  delete(key: string): void {
    // Remove from memory cache
    this.cache.delete(key);

    // Remove from localStorage cache
    try {
      const persistentCache = JSON.parse(localStorage.getItem('searchCache') || '{}');
      delete persistentCache[key];
      localStorage.setItem('searchCache', JSON.stringify(persistentCache));
    } catch (error) {
      console.warn('Failed to delete from localStorage cache:', error);
    }
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();

    // Clean memory cache - using Array.from to avoid iterator issues
    const cacheEntries = Array.from(this.cache.entries());
    cacheEntries.forEach(([key, entry]) => {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    });

    // Clean localStorage cache
    try {
      const persistentCache = JSON.parse(localStorage.getItem('searchCache') || '{}');
      let hasChanges = false;

      const cacheKeys = Object.keys(persistentCache);
      cacheKeys.forEach(key => {
        const entry = persistentCache[key] as CacheEntry;
        if (entry && entry.expiresAt <= now) {
          delete persistentCache[key];
          hasChanges = true;
        }
      });

      if (hasChanges) {
        localStorage.setItem('searchCache', JSON.stringify(persistentCache));
      }
    } catch (error) {
      console.warn('Failed to cleanup localStorage cache:', error);
    }
  }

  // Get cache statistics for debugging
  getStats(): {
    memorySize: number;
    localStorageSize: number;
    totalKeys: number;
    hits: number;
    misses: number;
  } {
    let localStorageSize = 0;
    let totalKeys = 0;

    try {
      const persistentCache = JSON.parse(localStorage.getItem('searchCache') || '{}');
      // Count non-expired entries in localStorage
      const now = Date.now();
      localStorageSize = Object.keys(persistentCache).filter(key => {
        const entry = persistentCache[key] as CacheEntry;
        return entry && entry.expiresAt > now;
      }).length;
      totalKeys = Math.max(this.cache.size, localStorageSize);
    } catch (error) {
      console.warn('Failed to get localStorage stats:', error);
    }

    return {
      memorySize: this.cache.size,
      localStorageSize,
      totalKeys,
      hits: this.hits,
      misses: this.misses
    };
  }

  // Get metadata for a cache entry
  getMetadata(key: string): CacheMetadata | null {
    // Check memory cache first
    const memoryEntry = this.cache.get(key);
    if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
      return memoryEntry.metadata || null;
    }

    // Check localStorage cache
    try {
      const persistentCache = JSON.parse(localStorage.getItem('searchCache') || '{}');
      const persistentEntry = persistentCache[key];

      if (persistentEntry && persistentEntry.expiresAt > Date.now()) {
        return persistentEntry.metadata || null;
      }
    } catch (error) {
      console.error('🔧 localStorage read error for metadata:', error);
    }

    return null;
  }

  // Method to preload cache with fresh data
  preloadCache(key: string, data: any[]): void {
    this.set(key, data);
  }

  // Check if a key exists in cache (for testing)
  has(key: string): boolean {
    return this.cache.has(key) || this.hasInLocalStorage(key);
  }

  private hasInLocalStorage(key: string): boolean {
    try {
      const persistentCache = JSON.parse(localStorage.getItem('searchCache') || '{}');
      const entry = persistentCache[key];
      return entry && entry.expiresAt > Date.now();
    } catch {
      return false;
    }
  }
}

export { SearchCache, type CacheMetadata };
export const searchCache = new SearchCache();

// Auto-cleanup every 10 minutes
let cleanupInterval: NodeJS.Timeout;

// Initialize cleanup interval
const initializeCleanup = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }

  cleanupInterval = setInterval(() => {
    searchCache.cleanup();
  }, 10 * 60 * 1000);
};

// Start cleanup when module loads
initializeCleanup();

// Export cleanup function for manual control
export const stopCacheCleanup = () => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }
};

export const startCacheCleanup = () => {
  initializeCleanup();
};