import { searchCache } from "../../utils/searchCache";

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
    removeItem: (key: string) => { delete store[key]; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe("SearchCache", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    searchCache.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Basic Cache Operations", () => {
    test("should store and retrieve data", () => {
      const testData = [{ id: "1", name: "test" }];
      const key = "test-key";

      searchCache.set(key, testData);
      const retrieved = searchCache.get(key);

      expect(retrieved).toEqual(testData);
    });

    test("should return null for non-existent keys", () => {
      const result = searchCache.get("non-existent-key");
      expect(result).toBeNull();
    });

    test("should generate consistent cache keys", () => {
      const params = {
        destination: "Paris",
        userProfile: {
          gender: "Female",
          status: "single",
          sexualOrientation: "heterosexual"
        }
      };

      const key1 = searchCache.generateCacheKey(params);
      const key2 = searchCache.generateCacheKey(params);

      expect(key1).toBe(key2);
      expect(key1).toBe("search_Paris_Female_single_heterosexual");
    });

    test("should clear all cache data", () => {
      searchCache.set("key-1", [{ id: "1" }]);
      searchCache.set("key-2", [{ id: "2" }]);
      
      searchCache.clear();
      
      expect(searchCache.get("key-1")).toBeNull();
      expect(searchCache.get("key-2")).toBeNull();
      
      const stats = searchCache.getStats();
      expect(stats.memorySize).toBe(0);
    });

    test("should overwrite existing cache entries", () => {
      const key = "test-key";
      const firstData = [{ id: "1", name: "first" }];
      const secondData = [{ id: "2", name: "second" }];

      searchCache.set(key, firstData);
      searchCache.set(key, secondData);

      const retrieved = searchCache.get(key);
      expect(retrieved).toEqual(secondData);
    });
  });

  describe("Cache Expiration", () => {
    test("should return null for expired entries", () => {
      const originalNow = Date.now;
      let mockTime = 1000000;
      Date.now = jest.fn(() => mockTime);

      const testData = [{ id: "1", name: "test" }];
      const key = "test-key";

      searchCache.set(key, testData);
      
      // Fast forward time by 6 minutes (cache expires after 5 minutes)
      mockTime += 6 * 60 * 1000;

      const retrieved = searchCache.get(key);
      expect(retrieved).toBeNull();

      Date.now = originalNow;
    });

    test("should return data for non-expired entries", () => {
      const originalNow = Date.now;
      let mockTime = 1000000;
      Date.now = jest.fn(() => mockTime);

      const testData = [{ id: "1", name: "test" }];
      const key = "test-key";

      searchCache.set(key, testData);
      
      // Fast forward time by 2 minutes (within 5 minute expiry)
      mockTime += 2 * 60 * 1000;

      const retrieved = searchCache.get(key);
      expect(retrieved).toEqual(testData);

      Date.now = originalNow;
    });

    test("should handle entries with different expiration times", () => {
      const originalNow = Date.now;
      let mockTime = 1000000;
      Date.now = jest.fn(() => mockTime);

      searchCache.set("key-1", [{ id: "1" }]);
      
      mockTime += 2 * 60 * 1000; // 2 minutes later
      searchCache.set("key-2", [{ id: "2" }]);
      
      mockTime += 4 * 60 * 1000; // 6 minutes total (key-1 expired, key-2 still valid)

      expect(searchCache.get("key-1")).toBeNull();
      expect(searchCache.get("key-2")).toEqual([{ id: "2" }]);

      Date.now = originalNow;
    });
  });

  describe("LocalStorage Persistence", () => {
    test("should persist data to localStorage", () => {
      const testData = [{ id: "1", name: "test" }];
      const key = "test-key";

      searchCache.set(key, testData);

      const stored = JSON.parse(mockLocalStorage.getItem('searchCache') || '{}');
      expect(stored[key]).toBeDefined();
      expect(stored[key].data).toEqual(testData);
    });

    test("should retrieve data from localStorage when memory cache is empty", () => {
      const testData = [{ id: "1", name: "test" }];
      const key = "test-key";

      // Manually set data in localStorage
      const cacheData = {
        [key]: {
          data: testData,
          timestamp: Date.now(),
          expiresAt: Date.now() + 5 * 60 * 1000
        }
      };
      mockLocalStorage.setItem('searchCache', JSON.stringify(cacheData));

      const retrieved = searchCache.get(key);
      expect(retrieved).toEqual(testData);
    });

    test("should handle localStorage errors gracefully", () => {
      const originalSetItem = mockLocalStorage.setItem;
      mockLocalStorage.setItem = jest.fn().mockImplementation(() => {
        throw new Error("localStorage error");
      });

      const testData = [{ id: "1", name: "test" }];
      const key = "test-key";

      // Should not throw error
      expect(() => searchCache.set(key, testData)).not.toThrow();

      // Memory cache should still work
      const retrieved = searchCache.get(key);
      expect(retrieved).toEqual(testData);

      mockLocalStorage.setItem = originalSetItem;
    });

    test("should handle corrupted localStorage data", () => {
      mockLocalStorage.setItem('searchCache', 'invalid-json');

      const testData = [{ id: "1", name: "test" }];
      const key = "test-key";

      // Should not throw error and should work normally
      expect(() => searchCache.set(key, testData)).not.toThrow();
      expect(searchCache.get(key)).toEqual(testData);
    });

    test("should sync localStorage when memory cache is updated", () => {
      const testData = [{ id: "1", name: "test" }];
      const key = "test-key";

      searchCache.set(key, testData);

      // Check that localStorage was updated
      const stored = JSON.parse(mockLocalStorage.getItem('searchCache') || '{}');
      expect(stored[key]).toBeDefined();
      expect(stored[key].data).toEqual(testData);
    });
  });

  describe("Cache Size Management", () => {
    test("should track cache size correctly", () => {
      const initialStats = searchCache.getStats();
      expect(initialStats.memorySize).toBe(0);

      searchCache.set("key-1", [{ id: "1" }]);
      searchCache.set("key-2", [{ id: "2" }]);

      const stats = searchCache.getStats();
      expect(stats.memorySize).toBe(2);
    });

    test("should not exceed maximum cache size", () => {
      const maxSize = 50;

      // Fill cache to maximum
      for (let i = 0; i < maxSize; i++) {
        searchCache.set(`key-${i}`, [{ id: i.toString() }]);
      }

      const statsAtMax = searchCache.getStats();
      expect(statsAtMax.memorySize).toBeLessThanOrEqual(maxSize);

      // Add one more entry
      searchCache.set("key-overflow", [{ id: "overflow" }]);

      const statsAfterOverflow = searchCache.getStats();
      expect(statsAfterOverflow.memorySize).toBeLessThanOrEqual(maxSize);
    });

    test("should remove oldest entries when cache is full", () => {
      // Fill cache to maximum size
      for (let i = 0; i < 50; i++) {
        searchCache.set(`key-${i}`, [{ id: i.toString() }]);
      }

      // Add one more entry
      searchCache.set("key-50", [{ id: "50" }]);

      // First entry should be evicted
      expect(searchCache.get("key-0")).toBeNull();
      expect(searchCache.get("key-50")).toEqual([{ id: "50" }]);
    });
  });

  describe("Cache Cleanup", () => {
    test("should clean up expired entries", () => {
      const originalNow = Date.now;
      let mockTime = 1000000;
      Date.now = jest.fn(() => mockTime);

      // Add some entries
      searchCache.set("key-1", [{ id: "1" }]);
      searchCache.set("key-2", [{ id: "2" }]);

      // Fast forward time to expire first entry
      mockTime += 3 * 60 * 1000; // 3 minutes
      searchCache.set("key-3", [{ id: "3" }]);

      // Fast forward time to expire first two entries
      mockTime += 3 * 60 * 1000; // Total 6 minutes

      searchCache.cleanup();

      expect(searchCache.get("key-1")).toBeNull();
      expect(searchCache.get("key-2")).toBeNull();
      expect(searchCache.get("key-3")).toEqual([{ id: "3" }]);

      Date.now = originalNow;
    });

    test("should clean up localStorage expired entries", () => {
      const originalNow = Date.now;
      let mockTime = 1000000;
      Date.now = jest.fn(() => mockTime);

      searchCache.set("key-1", [{ id: "1" }]);
      
      // Expire the entry
      mockTime += 6 * 60 * 1000;
      
      searchCache.cleanup();

      // Check localStorage was also cleaned
      const stored = JSON.parse(mockLocalStorage.getItem('searchCache') || '{}');
      expect(stored["key-1"]).toBeUndefined();

      Date.now = originalNow;
    });

    test("should automatically cleanup on get operations", () => {
      const originalNow = Date.now;
      let mockTime = 1000000;
      Date.now = jest.fn(() => mockTime);

      searchCache.set("key-1", [{ id: "1" }]);
      
      // Expire the entry
      mockTime += 6 * 60 * 1000;
      
      // Getting expired entry should trigger cleanup
      const result = searchCache.get("key-1");
      expect(result).toBeNull();

      Date.now = originalNow;
    });
  });

  describe("Cache Statistics", () => {
    test("should return correct cache statistics", () => {
      searchCache.set("key-1", [{ id: "1" }]);
      searchCache.set("key-2", [{ id: "2" }]);

      const stats = searchCache.getStats();
      expect(stats.memorySize).toBe(2);
      expect(stats.localStorageSize).toBe(2);
      expect(stats.totalKeys).toBe(2);
    });

    test("should track hit and miss rates", () => {
      const initialStats = searchCache.getStats();
      
      searchCache.set("key-1", [{ id: "1" }]);
      
      // Hit
      searchCache.get("key-1");
      
      // Miss
      searchCache.get("non-existent");
      
      const stats = searchCache.getStats();
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
    });

    test("should calculate cache efficiency", () => {
      searchCache.set("key-1", [{ id: "1" }]);
      
      // Multiple hits
      searchCache.get("key-1");
      searchCache.get("key-1");
      
      // One miss
      searchCache.get("non-existent");
      
      const stats = searchCache.getStats();
      if (stats.hits !== undefined && stats.misses !== undefined) {
        const efficiency = stats.hits / (stats.hits + stats.misses);
        expect(efficiency).toBeGreaterThan(0);
        expect(efficiency).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("Cache Key Generation Edge Cases", () => {
    test("should handle string cache keys", () => {
      const key = searchCache.generateCacheKey("direct-string-key");
      expect(key).toBe("direct-string-key");
    });

    test("should handle missing userProfile gracefully", () => {
      const params = { destination: "Paris" };
      
      const key = searchCache.generateCacheKey(params);
      expect(key).toBe('{"destination":"Paris"}');
    });

    test("should handle null and undefined parameters", () => {
      expect(() => searchCache.generateCacheKey(null)).not.toThrow();
      expect(() => searchCache.generateCacheKey(undefined)).not.toThrow();
    });

    test("should generate different keys for different parameters", () => {
      const params1 = {
        destination: "Paris",
        userProfile: { gender: "Female", status: "single", sexualOrientation: "heterosexual" }
      };
      const params2 = {
        destination: "London",
        userProfile: { gender: "Female", status: "single", sexualOrientation: "heterosexual" }
      };

      const key1 = searchCache.generateCacheKey(params1);
      const key2 = searchCache.generateCacheKey(params2);

      expect(key1).not.toBe(key2);
    });
  });

  describe("Concurrent Operations", () => {
    test("should handle multiple rapid set operations", () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(Promise.resolve(searchCache.set(`key-${i}`, [{ id: i.toString() }])));
      }

      return Promise.all(promises).then(() => {
        for (let i = 0; i < 10; i++) {
          expect(searchCache.get(`key-${i}`)).toEqual([{ id: i.toString() }]);
        }
      });
    });

    test("should handle mixed get and set operations", () => {
      searchCache.set("key-1", [{ id: "1" }]);

      const operations = [
        () => searchCache.get("key-1"),
        () => searchCache.set("key-2", [{ id: "2" }]),
        () => searchCache.get("key-2"),
        () => searchCache.set("key-1", [{ id: "1-updated" }])
      ];

      operations.forEach(op => expect(op).not.toThrow());
      expect(searchCache.get("key-1")).toEqual([{ id: "1-updated" }]);
      expect(searchCache.get("key-2")).toEqual([{ id: "2" }]);
    });
  });

  describe("Memory Management", () => {
    test("should not cause memory leaks with large datasets", () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({ id: i.toString(), data: `data-${i}` }));
      
      for (let i = 0; i < 100; i++) {
        searchCache.set(`large-key-${i}`, largeData);
      }

      const stats = searchCache.getStats();
      expect(stats.memorySize).toBeLessThanOrEqual(50); // Assuming max cache size
    });

    test("should handle empty arrays and objects", () => {
      searchCache.set("empty-array", []);
      searchCache.set("empty-object", [{}]);

      expect(searchCache.get("empty-array")).toEqual([]);
      expect(searchCache.get("empty-object")).toEqual([{}]);
    });
  });
});