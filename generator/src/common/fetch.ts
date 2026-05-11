import {
  fetch,
  clearCache,
  setVirtualSourceData,
  isVirtualUrl,
  setRetryCount,
  setPoolSize as setFetchPoolSize,
  setNetworkFetch,
} from '@jspm/fetch';
export type { CachedResponse, FetchOptions, SourceData } from '@jspm/fetch';
export { fetch, clearCache, setVirtualSourceData, isVirtualUrl, setRetryCount, setFetchPoolSize };

export type WrappedResponse = {
  url: string;
  headers: Headers;
  ok: boolean;
  status: number;
  statusText?: string;
  text?(): Promise<string>;
  json?(): Promise<any>;
  arrayBuffer?(): Promise<ArrayBuffer>;
};

export type FetchFn = (
  url: URL | string,
  ...args: any[]
) => Promise<WrappedResponse | globalThis.Response>;

export type WrappedFetch = FetchFn;

/**
 * Replace the underlying network fetch. Virtual sources, protocol handlers,
 * pool, retry, in-flight dedup, and caching continue to wrap it.
 */
export function setFetch(fn: (url: string, init: RequestInit) => Promise<Response>) {
  setNetworkFetch(fn);
}
