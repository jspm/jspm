import { Cache } from './cache.js';
import { Pool } from './pool.js';
import { CachedResponseImpl, type CachedResponse } from './response.js';
import { handleFileUrl, handleDataUrl, handleNodeUrl, ensureReaddir } from './protocols.js';
export type { CachedResponse } from './response.js';
export { CachedResponseImpl } from './response.js';

export interface FetchOptions {
  immutable?: boolean;
  cache?: 'default' | 'no-store' | 'no-cache' | 'force-cache';
  headers?: Record<string, string>;
}

export interface CreateFetchOptions {
  cacheDir?: string;
  poolSize?: number;
  retryCount?: number;
  memoryOnly?: boolean;
}

export type SourceData = Record<string, string | ArrayBuffer>;

const emptyHeaders = new Headers();
const jsonHeaders = new Headers([['content-type', 'application/json']]);

export function createFetch(opts?: CreateFetchOptions) {
  const cache = new Cache({
    cacheDir: opts?.cacheDir,
    memoryOnly: opts?.memoryOnly
  });
  const pool = new Pool(opts?.poolSize ?? 100);
  const retryCount = opts?.retryCount ?? 5;
  const inflight = new Map<string, Promise<CachedResponse>>();
  const virtualSources: Record<string, SourceData> = {};

  ensureReaddir();

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
        const buf = typeof source === 'string' ? Buffer.from(source) : Buffer.from(source);
        return new CachedResponseImpl(
          urlStr,
          200,
          'OK',
          urlStr.endsWith('.json') ? jsonHeaders : emptyHeaders,
          buf
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
          text() { return ''; },
          json() { return listing; },
          arrayBuffer() { return new ArrayBuffer(0); }
        };
      }

      matchedVirtual = true;
    }

    if (matchedVirtual) {
      return new CachedResponseImpl(urlStr, 404, 'Virtual source not found', emptyHeaders, Buffer.alloc(0));
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

    const protocol = urlStr.slice(0, urlStr.indexOf(':') + 1);

    // Local protocols — no caching
    switch (protocol) {
      case 'file:':
        return handleFileUrl(urlStr);
      case 'data:':
        return handleDataUrl(urlStr);
      case 'node:':
        return handleNodeUrl(urlStr);
    }

    const noStore = fetchOpts?.cache === 'no-store';

    // Check cache (unless no-store)
    if (!noStore) {
      const cached = cache.get(urlStr);
      if (cached) return cached;
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

            const buffer = Buffer.from(await res.arrayBuffer());
            const response = new CachedResponseImpl(
              res.url || urlStr,
              res.status,
              res.statusText,
              res.headers as any as Headers,
              buffer
            );

            // Only cache successful responses
            if (response.ok && !noStore) {
              cache.set(urlStr, response, fetchOpts?.immutable);
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
    clearCache() { cache.clear(); },
    dispose() { cache.dispose(); },
    setVirtualSourceData,
    isVirtualUrl
  };
}

// Default instance for direct import
const _default = createFetch();
export const fetch = _default.fetch;
export const clearCache = _default.clearCache;
export const setVirtualSourceData = _default.setVirtualSourceData;
export const isVirtualUrl = _default.isVirtualUrl;
