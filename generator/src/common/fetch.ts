import {
  fetch as _fetchImpl,
  clearCache,
  setVirtualSourceData,
  isVirtualUrl,
} from '@jspm/fetch';
export type { CachedResponse, FetchOptions, SourceData } from '@jspm/fetch';
export { clearCache, setVirtualSourceData, isVirtualUrl };

export type WrappedResponse = {
  url: string;
  headers: Headers;
  ok: boolean;
  status: number;
  statusText?: string;
  text?(): Promise<string> | string;
  json?(): Promise<any> | any;
  arrayBuffer?(): ArrayBuffer;
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

export function setRetryCount(_count: number) {
  // Retry count is configured at @jspm/fetch creation; this is a no-op for compat
}

export function setFetchPoolSize(_size: number) {
  // Pool size is configured at @jspm/fetch creation; this is a no-op for compat
}

export { _fetch as fetch };
