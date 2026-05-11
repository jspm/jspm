import { createCore, type FetchOptions, type SourceData } from './core.js';
import { CachedResponseImpl, type CachedResponse } from './response.js';

export type { CachedResponse } from './response.js';
export { CachedResponseImpl } from './response.js';
export type { FetchOptions, SourceData };

export interface CreateFetchOptions {
  poolSize?: number;
  retryCount?: number;
}

const emptyHeaders = new Headers();
const textEncoder = new TextEncoder();

function resolveProtocol(urlStr: string): CachedResponse | null {
  if (urlStr.startsWith('data:')) {
    const body = decodeURIComponent(urlStr.slice(urlStr.indexOf(',') + 1));
    return new CachedResponseImpl(
      urlStr,
      200,
      'OK',
      emptyHeaders,
      textEncoder.encode(body)
    );
  }
  return null;
}

export function createFetch(opts?: CreateFetchOptions) {
  return createCore({
    resolveProtocol,
    poolSize: opts?.poolSize,
    retryCount: opts?.retryCount
  });
}

const _default = createFetch();
export const fetch = _default.fetch;
export const clearCache = _default.clearCache;
export const setVirtualSourceData = _default.setVirtualSourceData;
export const isVirtualUrl = _default.isVirtualUrl;
export const setRetryCount = _default.setRetryCount;
export const setPoolSize = _default.setPoolSize;
