import { Cache } from './cache.js';
import { createCore, type FetchOptions, type SourceData } from './core.js';
import { handleFileUrl, handleDataUrl, handleNodeUrl } from './protocols.js';
import type { CachedResponse } from './response.js';

export type { CachedResponse } from './response.js';
export { CachedResponseImpl } from './response.js';
export type { FetchOptions, SourceData };

export interface CreateFetchOptions {
  cacheDir?: string;
  poolSize?: number;
  retryCount?: number;
  memoryOnly?: boolean;
}

function resolveProtocol(urlStr: string): CachedResponse | null {
  const protocol = urlStr.slice(0, urlStr.indexOf(':') + 1);
  switch (protocol) {
    case 'file:':
      return handleFileUrl(urlStr);
    case 'data:':
      return handleDataUrl(urlStr);
    case 'node:':
      return handleNodeUrl(urlStr);
  }
  return null;
}

export function createFetch(opts?: CreateFetchOptions) {
  const cache = opts?.memoryOnly
    ? undefined
    : new Cache({ cacheDir: opts?.cacheDir });
  return createCore({
    cache,
    resolveProtocol,
    poolSize: opts?.poolSize,
    retryCount: opts?.retryCount
  });
}

// Default instance for direct import
const _default = createFetch();
export const fetch = _default.fetch;
export const clearCache = _default.clearCache;
export const setVirtualSourceData = _default.setVirtualSourceData;
export const isVirtualUrl = _default.isVirtualUrl;
export const setRetryCount = _default.setRetryCount;
export const setPoolSize = _default.setPoolSize;
export const setNetworkFetch = _default.setNetworkFetch;
