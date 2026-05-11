import { fileURLToPath } from 'node:url';
import { createCore, type FetchOptions, type SourceData } from './core.js';
import { CachedResponseImpl, type CachedResponse } from './response.js';

export type { CachedResponse } from './response.js';
export { CachedResponseImpl } from './response.js';
export type { FetchOptions, SourceData };

const emptyHeaders = new Headers();
const jsonHeaders = new Headers([['content-type', 'application/json']]);
const textEncoder = new TextEncoder();

function dirResponse(url: string, path: string): CachedResponse {
  return {
    url,
    status: 204,
    statusText: '',
    ok: true,
    headers: emptyHeaders,
    async text() { return ''; },
    async json() {
      const entries: string[] = [];
      // @ts-ignore - Deno global is only present at runtime in Deno
      for await (const entry of Deno.readDir(path)) entries.push(entry.name);
      return entries;
    },
    async arrayBuffer() { return new ArrayBuffer(0); }
  };
}

function resolveProtocol(urlStr: string): CachedResponse | null {
  const protocol = urlStr.slice(0, urlStr.indexOf(':') + 1);
  if (protocol === 'data:') {
    const body = decodeURIComponent(urlStr.slice(urlStr.indexOf(',') + 1));
    return new CachedResponseImpl(urlStr, 200, 'OK', emptyHeaders, textEncoder.encode(body));
  }
  if (protocol === 'node:') {
    return new CachedResponseImpl(urlStr, 200, 'OK', emptyHeaders, new Uint8Array(0));
  }
  if (protocol === 'file:') {
    const path = fileURLToPath(urlStr);
    try {
      // @ts-ignore - Deno
      const data = Deno.readFileSync(path) as Uint8Array;
      return new CachedResponseImpl(
        urlStr,
        200,
        'OK',
        urlStr.endsWith('.json') ? jsonHeaders : emptyHeaders,
        data
      );
    } catch (e: any) {
      if (e.code === 'EISDIR' || e.name === 'IsADirectory')
        return dirResponse(urlStr, path);
      if (e.code === 'ENOENT' || e.name === 'NotFound')
        return new CachedResponseImpl(urlStr, 404, e.toString(), emptyHeaders, new Uint8Array(0));
      return new CachedResponseImpl(urlStr, 500, e.toString(), emptyHeaders, new Uint8Array(0));
    }
  }
  return null;
}

export interface CreateFetchOptions {
  poolSize?: number;
  retryCount?: number;
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
