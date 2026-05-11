import { Pool } from './pool.js';
import { CachedResponseImpl, type CachedResponse } from './response.js';

export interface FetchOptions {
  immutable?: boolean;
  cache?: 'default' | 'no-store' | 'no-cache' | 'force-cache';
  headers?: Record<string, string>;
}

export type SourceData = Record<string, string | ArrayBuffer>;

export interface PersistentCache {
  get(url: string): CachedResponseImpl | undefined;
  set(url: string, response: CachedResponseImpl, immutable?: boolean): void;
  setMemoryOnly?(url: string, response: CachedResponseImpl): void;
  clear(): void;
  dispose?(): void;
}

export interface CoreOptions {
  /** Persistent cache layer (FS-backed for Node, omit for memory-only / browser). */
  cache?: PersistentCache;
  /** Resolve non-HTTP protocols (file:/data:/node:); return null to fall through to HTTP fetch. */
  resolveProtocol?: (url: string) => CachedResponse | null;
  poolSize?: number;
  retryCount?: number;
}

const emptyHeaders = new Headers();
const jsonHeaders = new Headers([['content-type', 'application/json']]);
const textEncoder = new TextEncoder();

export function createCore(opts: CoreOptions = {}) {
  const memory = new Map<string, CachedResponseImpl>();
  const persistent = opts.cache;
  const pool = new Pool(opts.poolSize ?? 100);
  let retryCount = opts.retryCount ?? 5;
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

    const noStore = fetchOpts?.cache === 'no-store';

    // Check cache (unless no-store)
    if (!noStore) {
      const mem = memory.get(urlStr);
      if (mem) return mem;
      if (persistent) {
        const cached = persistent.get(urlStr);
        if (cached) {
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
        for (let attempt = 0; attempt <= retryCount; attempt++) {
          try {
            const res = await globalThis.fetch(urlStr, {
              headers: fetchOpts?.headers,
              redirect: 'follow'
            });

            const buf = new Uint8Array(await res.arrayBuffer());
            const response = new CachedResponseImpl(
              res.url || urlStr,
              res.status,
              res.statusText,
              res.headers as any as Headers,
              buf
            );

            if (!noStore) {
              if (response.ok) {
                memory.set(urlStr, response);
                persistent?.set(urlStr, response, fetchOpts?.immutable);
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
      persistent?.clear();
    },
    dispose() {
      memory.clear();
      persistent?.dispose?.();
    },
    setVirtualSourceData,
    isVirtualUrl,
    setRetryCount(count: number) { retryCount = count; },
    setPoolSize(size: number) { pool.setSize(size); }
  };
}
