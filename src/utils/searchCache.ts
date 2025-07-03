interface CacheEntry {
  data: any[];
  timestamp: number;
  expiresAt: number;
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
    console.log('🔧 Setting cache for key:', key, 'with', data.length, 'items');

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
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + this.CACHE_DURATION
    });

    // Also store in localStorage for persistence across sessions
    try {
      const persistentCache = JSON.parse(localStorage.getItem('searchCache') || '{}');
      persistentCache[key] = {
        data,
        timestamp: now,
        expiresAt: now + this.CACHE_DURATION
      };

      const serialized = JSON.stringify(persistentCache);
      localStorage.setItem('searchCache', serialized);

      // Verify it was actually stored
      const verification = localStorage.getItem('searchCache');
      console.log('🔧 localStorage verification:', verification ? 'Success' : 'Failed');

    } catch (error) {
      console.error('🔧 localStorage error:', error);
    }
  }

  get(key: string): any[] | null {
    console.log('🔧 Getting cache for key:', key);

    // Check memory cache first
    const memoryEntry = this.cache.get(key);
    console.log('🔧 Memory cache result:', memoryEntry ? 'Hit' : 'Miss');

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
      console.log('🔧 localStorage keys:', Object.keys(persistentCache));
      console.log('🔧 Looking for key:', key);

      const persistentEntry = persistentCache[key];
      console.log('🔧 localStorage entry:', persistentEntry ? 'Found' : 'Not found');

      if (persistentEntry && persistentEntry.expiresAt > Date.now()) {
        console.log('🔧 localStorage hit! Restoring to memory');
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

  // Method to preload cache with fresh data
  preloadCache(key: string, data: any[]): void {
    this.set(key, data);
    console.log(`Cache preloaded for key: ${key}, ${data.length} items`);
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

export { SearchCache };
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
    console.log('Cache cleanup completed:', searchCache.getStats());
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