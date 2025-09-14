// Advanced caching system with TTL, compression, and background refresh

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  compressed?: boolean;
  stale?: boolean;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  staleWhileRevalidate?: number; // Additional time to serve stale content
  compress?: boolean; // Compress large data
  backgroundRefresh?: boolean; // Refresh in background when stale
}

class AdvancedCache {
  private cache = new Map<string, CacheEntry<any>>();
  private refreshPromises = new Map<string, Promise<any>>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
    this.startCleanupInterval();
  }

  async set<T>(
    key: string,
    data: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const {
      ttl = 5 * 60 * 1000, // 5 minutes default
      compress = false
    } = options;

    let processedData = data;
    let compressed = false;

    // Compress large objects
    if (compress && typeof data === 'object' && data !== null) {
      try {
        const serialized = JSON.stringify(data);
        if (serialized.length > 10000) { // 10KB threshold
          processedData = await this.compress(serialized) as T;
          compressed = true;
        }
      } catch (error) {
        console.warn('Failed to compress cache data:', error);
      }
    }

    const entry: CacheEntry<T> = {
      data: processedData,
      timestamp: Date.now(),
      ttl,
      compressed
    };

    this.cache.set(key, entry);
    this.enforceMaxSize();
  }

  async get<T>(
    key: string,
    options: CacheOptions = {}
  ): Promise<T | null> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();
    const age = now - entry.timestamp;
    const isExpired = age > entry.ttl;
    const isStale = options.staleWhileRevalidate &&
      age > entry.ttl - options.staleWhileRevalidate;

    // Return null if hard expired and no stale policy
    if (isExpired && !options.staleWhileRevalidate) {
      this.cache.delete(key);
      return null;
    }

    // Mark as stale for potential background refresh
    if (isStale && !entry.stale) {
      entry.stale = true;
    }

    // Decompress if needed
    let data = entry.data;
    if (entry.compressed) {
      try {
        const decompressed = await this.decompress(data as string);
        data = JSON.parse(decompressed);
      } catch (error) {
        console.warn('Failed to decompress cache data:', error);
        this.cache.delete(key);
        return null;
      }
    }

    return data;
  }

  // Get with automatic refresh callback
  async getOrRefresh<T>(
    key: string,
    refreshFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key, options);

    if (cached && !this.isStale(key, options)) {
      return cached;
    }

    // If we have stale data and background refresh is enabled
    if (cached && options.backgroundRefresh && this.isStale(key, options)) {
      // Return stale data immediately, refresh in background
      this.refreshInBackground(key, refreshFn, options);
      return cached;
    }

    // Prevent multiple simultaneous refreshes
    const existingPromise = this.refreshPromises.get(key);
    if (existingPromise) {
      return existingPromise;
    }

    const refreshPromise = this.executeRefresh(key, refreshFn, options);
    this.refreshPromises.set(key, refreshPromise);

    try {
      const result = await refreshPromise;
      this.refreshPromises.delete(key);
      return result;
    } catch (error) {
      this.refreshPromises.delete(key);
      // If refresh fails and we have stale data, return it
      if (cached) return cached;
      throw error;
    }
  }

  private async executeRefresh<T>(
    key: string,
    refreshFn: () => Promise<T>,
    options: CacheOptions
  ): Promise<T> {
    const data = await refreshFn();
    await this.set(key, data, options);
    return data;
  }

  private async refreshInBackground<T>(
    key: string,
    refreshFn: () => Promise<T>,
    options: CacheOptions
  ): Promise<void> {
    try {
      const data = await refreshFn();
      await this.set(key, data, options);
    } catch (error) {
      console.warn('Background refresh failed:', error);
    }
  }

  private isStale(key: string, options: CacheOptions): boolean {
    const entry = this.cache.get(key);
    if (!entry || !options.staleWhileRevalidate) return false;

    const age = Date.now() - entry.timestamp;
    return age > (entry.ttl - options.staleWhileRevalidate);
  }

  private async compress(data: string): Promise<string> {
    // Simple compression using built-in compression
    if (typeof CompressionStream !== 'undefined') {
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();

      writer.write(new TextEncoder().encode(data));
      writer.close();

      const chunks: Uint8Array[] = [];
      let result = await reader.read();
      while (!result.done) {
        chunks.push(result.value);
        result = await reader.read();
      }

      const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        compressed.set(chunk, offset);
        offset += chunk.length;
      }

      return btoa(String.fromCharCode(...compressed));
    }

    return data; // Fallback: no compression
  }

  private async decompress(compressed: string): Promise<string> {
    if (typeof DecompressionStream !== 'undefined') {
      try {
        const binary = atob(compressed);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();

        writer.write(bytes);
        writer.close();

        const chunks: Uint8Array[] = [];
        let result = await reader.read();
        while (!result.done) {
          chunks.push(result.value);
          result = await reader.read();
        }

        const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          decompressed.set(chunk, offset);
          offset += chunk.length;
        }

        return new TextDecoder().decode(decompressed);
      } catch (error) {
        console.warn('Decompression failed:', error);
      }
    }

    return compressed; // Fallback: assume uncompressed
  }

  private enforceMaxSize(): void {
    if (this.cache.size <= this.maxSize) return;

    // Remove oldest entries (LRU)
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    const toRemove = entries.slice(0, entries.length - this.maxSize);
    toRemove.forEach(([key]) => this.cache.delete(key));
  }

  private startCleanupInterval(): void {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  clear(): void {
    this.cache.clear();
    this.refreshPromises.clear();
  }

  delete(key: string): boolean {
    this.refreshPromises.delete(key);
    return this.cache.delete(key);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
export const advancedCache = new AdvancedCache();

// Convenience functions
export const cache = {
  get: <T>(key: string, options?: CacheOptions) =>
    advancedCache.get<T>(key, options),

  set: <T>(key: string, data: T, options?: CacheOptions) =>
    advancedCache.set(key, data, options),

  getOrRefresh: <T>(key: string, refreshFn: () => Promise<T>, options?: CacheOptions) =>
    advancedCache.getOrRefresh(key, refreshFn, options),

  delete: (key: string) => advancedCache.delete(key),

  clear: () => advancedCache.clear()
};