// Request deduplication utility to prevent duplicate API calls
class RequestCache {
  private cache = new Map<string, Promise<any>>();
  private timeouts = new Map<string, NodeJS.Timeout>();

  // Default cache duration: 5 seconds
  private defaultTtl = 5000;

  async dedupe<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl: number = this.defaultTtl
  ): Promise<T> {
    // If there's already a pending request for this key, return it
    if (this.cache.has(key)) {
      return this.cache.get(key) as Promise<T>;
    }

    // Create new request
    const request = requestFn().finally(() => {
      // Clean up after request completes
      this.cache.delete(key);
      const timeout = this.timeouts.get(key);
      if (timeout) {
        clearTimeout(timeout);
        this.timeouts.delete(key);
      }
    });

    // Cache the request
    this.cache.set(key, request);

    // Set up cleanup timeout as fallback
    const timeout = setTimeout(() => {
      this.cache.delete(key);
      this.timeouts.delete(key);
    }, ttl);
    
    this.timeouts.set(key, timeout);

    return request;
  }

  // Clear all cached requests
  clear(): void {
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.cache.clear();
    this.timeouts.clear();
  }

  // Clear specific cached request
  clearKey(key: string): void {
    this.cache.delete(key);
    const timeout = this.timeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(key);
    }
  }
}

// Global instance
const globalRequestCache = new RequestCache();

// Helper function to create cache keys
export function createCacheKey(prefix: string, ...params: (string | number | boolean | null | undefined)[]): string {
  return `${prefix}:${params.filter(p => p !== null && p !== undefined).join(':')}`;
}

// Main deduplication function
export function dedupeRequest<T>(
  key: string,
  requestFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  return globalRequestCache.dedupe(key, requestFn, ttl);
}

// Clear functions
export function clearRequestCache(): void {
  globalRequestCache.clear();
}

export function clearCacheKey(key: string): void {
  globalRequestCache.clearKey(key);
}

// Hook for React components
export function useRequestDeduplication() {
  return {
    dedupe: dedupeRequest,
    createKey: createCacheKey,
    clearCache: clearRequestCache,
    clearKey: clearCacheKey,
  };
}