import { Pool } from './pool.js';
import { CachedResponseImpl, type CachedResponse } from './response.js';

export interface FetchOptions {
  cache?: 'default' | 'no-store' | 'no-cache' | 'force-cache';
  headers?: Record<string, string>;
  /** Per-request timeout in ms. Translates to AbortSignal.timeout. */
  timeout?: number;
  /**
   * Mark the response as immutable on cache write. Skips revalidation
   * even when `Cache-Control` doesn't carry the `immutable` directive.
   * Useful for callers that know a URL is versioned (e.g. CDN paths).
   */
  immutable?: boolean;
}

interface CacheControl {
  immutable: boolean;
  maxAge: number | null;
  noStore: boolean;
}

/**
 * Default freshness floor (1 hour) for responses that arrive with neither
 * `max-age` nor `immutable`. Avoids "cache forever" for non-versioned URLs
 * (e.g. latest-tag package.json lookups). Versioned CDN responses
 * normally set their own much longer max-age and override this.
 */
const DEFAULT_MAX_AGE_SECONDS = 3600;

function parseCacheControl(headers: Headers): CacheControl {
  const cc = headers.get('cache-control') || '';
  let immutable = false;
  let maxAge: number | null = null;
  let noStore = false;
  for (const part of cc.split(',')) {
    const directive = part.trim().toLowerCase();
    if (directive === 'immutable') immutable = true;
    // `no-cache` requires revalidation; without ETag/If-Modified-Since
    // plumbing the safe mapping is "don't cache".
    else if (directive === 'no-store' || directive === 'no-cache') noStore = true;
    else if (directive.startsWith('max-age=')) {
      const n = parseInt(directive.slice(8), 10);
      if (Number.isFinite(n)) maxAge = n;
    }
  }
  return { immutable, maxAge, noStore };
}

function isStale(response: CachedResponseImpl): boolean {
  if (response.immutable) return false;
  const maxAge = response.maxAge ?? DEFAULT_MAX_AGE_SECONDS;
  const ageSeconds = (Date.now() - response.cachedAt) / 1000;
  return ageSeconds > maxAge;
}

export type NetworkFetch = (url: string, init: RequestInit) => Promise<Response>;

export type SourceData = Record<string, string | ArrayBuffer>;

export interface PersistentCache {
  get(url: string): CachedResponseImpl | undefined;
  set(url: string, response: CachedResponseImpl): void;
  clear(): void;
}

export interface CoreOptions {
  /** Persistent cache layer (FS-backed for Node, omit for memory-only / browser). */
  cache?: PersistentCache;
  /** Resolve non-HTTP protocols (file:/data:/node:); return null to fall through to HTTP fetch. */
  resolveProtocol?: (url: string) => CachedResponse | null;
  /** Custom network fetch (defaults to globalThis.fetch). */
  networkFetch?: NetworkFetch;
  poolSize?: number;
  retryCount?: number;
  /** Default per-request timeout in ms. Overridden by fetchOpts.timeout. */
  defaultTimeout?: number;
}

const emptyHeaders = new Headers();
const jsonHeaders = new Headers([['content-type', 'application/json']]);
const textEncoder = new TextEncoder();

export function createCore(opts: CoreOptions = {}) {
  const memory = new Map<string, CachedResponseImpl>();
  const persistent = opts.cache;
  const pool = new Pool(opts.poolSize ?? 100);
  let retryCount = opts.retryCount ?? 5;
  let networkFetch: NetworkFetch = opts.networkFetch ?? globalThis.fetch.bind(globalThis);
  // Every request gets a timeout — no hangs on stuck mirrors.
  const defaultTimeout = opts.defaultTimeout ?? 60_000;
  const inflight = new Map<string, Promise<CachedResponse>>();
  const virtualSources: Record<string, SourceData> = {};

  function setVirtualSourceData(urlBase: string, sourceData: SourceData) {
    virtualSources[urlBase.endsWith('/') ? urlBase : urlBase + '/'] = sourceData;
  }

  function isVirtualUrl(url: string): boolean {
    return Object.keys(virtualSources).some(base => url.startsWith(base));
  }

  function resolveVirtual(urlStr: string): CachedResponse | null {
    let matchedVirtual = false;
    for (const virtualBase of Object.keys(virtualSources)) {
      if (!urlStr.startsWith(virtualBase)) continue;

      const virtualFileData = virtualSources[virtualBase];
      let subdir = urlStr.slice(virtualBase.length);
      const source = virtualFileData[subdir];
      if (source) {
        const bytes =
          typeof source === 'string' ? textEncoder.encode(source) : new Uint8Array(source);
        return new CachedResponseImpl(
          urlStr,
          200,
          'OK',
          urlStr.endsWith('.json') ? jsonHeaders : emptyHeaders,
          bytes
        );
      }

      // Directory listing via 204 convention
      let dirFiles: string[] | null = null;
      if (!subdir.endsWith('/') && subdir.length) subdir += '/';
      for (const file of Object.keys(virtualFileData)) {
        if (file.startsWith(subdir)) {
          dirFiles = dirFiles || [];
          let filename = file.slice(subdir.length);
          if (filename.indexOf('/') !== -1) {
            filename = filename.slice(0, filename.indexOf('/'));
            if (dirFiles.includes(filename)) continue;
          }
          dirFiles.push(filename);
        }
      }
      if (dirFiles) {
        const listing = dirFiles;
        return {
          url: urlStr,
          ok: true,
          status: 204,
          statusText: '',
          headers: emptyHeaders,
          async text() { return ''; },
          async json() { return listing; },
          async arrayBuffer() { return new ArrayBuffer(0); }
        };
      }

      matchedVirtual = true;
    }

    if (matchedVirtual) {
      return new CachedResponseImpl(
        urlStr,
        404,
        'Virtual source not found',
        emptyHeaders,
        new Uint8Array(0)
      );
    }
    return null;
  }

  async function fetchUrl(
    url: string | URL,
    fetchOpts?: FetchOptions
  ): Promise<CachedResponse> {
    const urlStr = url.toString();

    // Virtual sources — highest priority
    const virtual = resolveVirtual(urlStr);
    if (virtual) return virtual;

    // Local protocols — no caching
    if (opts.resolveProtocol) {
      const localRes = opts.resolveProtocol(urlStr);
      if (localRes) return localRes;
    }

    const mode = fetchOpts?.cache ?? 'default';
    const noStore = mode === 'no-store';
    const forceCache = mode === 'force-cache';
    const skipCacheRead = noStore || mode === 'no-cache';

    if (!skipCacheRead) {
      const mem = memory.get(urlStr);
      if (mem && (forceCache || !isStale(mem))) return mem;
      if (persistent) {
        const cached = persistent.get(urlStr);
        if (cached && (forceCache || !isStale(cached))) {
          memory.set(urlStr, cached);
          return cached;
        }
      }
    }

    // Deduplicate in-flight requests
    const existing = inflight.get(urlStr);
    if (existing) return existing;

    const promise = (async () => {
      try {
        await pool.acquire();

        let lastError: Error | undefined;
        const timeout = fetchOpts?.timeout ?? defaultTimeout;
        for (let attempt = 0; attempt <= retryCount; attempt++) {
          try {
            const res = await networkFetch(urlStr, {
              headers: fetchOpts?.headers,
              redirect: 'follow',
              signal: AbortSignal.timeout(timeout)
            });

            const buf = new Uint8Array(await res.arrayBuffer());
            const response = new CachedResponseImpl(
              res.url || urlStr,
              res.status,
              res.statusText,
              res.headers as any as Headers,
              buf
            );

            const cc = parseCacheControl(response.headers);
            response.cachedAt = Date.now();
            response.immutable = fetchOpts?.immutable === true || cc.immutable;
            response.maxAge = cc.maxAge;

            // Server-side no-store overrides caching even if caller didn't ask.
            if (!noStore && !cc.noStore) {
              if (response.ok) {
                memory.set(urlStr, response);
                persistent?.set(urlStr, response);
              } else if (response.status === 404) {
                // 404s memory-only (not persisted)
                memory.set(urlStr, response);
              }
            }

            return response;
          } catch (e) {
            lastError = e as Error;
            if (attempt >= retryCount) break;
          }
        }
        throw lastError;
      } finally {
        inflight.delete(urlStr);
        pool.release();
      }
    })();

    inflight.set(urlStr, promise);
    return promise;
  }

  return {
    fetch: fetchUrl,
    clearCache() {
      memory.clear();
      // Drop in-flight too — otherwise a request mid-flight when the user
      // clears would land in the freshly-emptied caches.
      inflight.clear();
      persistent?.clear();
    },
    dispose() {
      memory.clear();
    },
    setVirtualSourceData,
    isVirtualUrl,
    setRetryCount(count: number) { retryCount = count; },
    setPoolSize(size: number) { pool.setSize(size); },
    /**
     * Replace the network fetch implementation. Virtual sources, protocol
     * handlers, cache, pool, retry, and in-flight dedup continue to wrap it.
     */
    setNetworkFetch(fn: NetworkFetch) { networkFetch = fn; }
  };
}
