import {
  fetch as _fetchImpl,
  clearCache,
  setVirtualSourceData,
  isVirtualUrl,
  setRetryCount,
  setPoolSize as setFetchPoolSize,
} from '@jspm/fetch';
export type { CachedResponse, FetchOptions, SourceData } from '@jspm/fetch';
export { clearCache, setVirtualSourceData, isVirtualUrl, setRetryCount, setFetchPoolSize };

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

let _fetch: FetchFn = _fetchImpl;

export function setFetch(fetch: FetchFn) {
  _fetch = fetch;
}

export { _fetch as fetch };
