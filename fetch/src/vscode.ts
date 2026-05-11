import { createCore, type FetchOptions, type SourceData } from './core.js';
import { CachedResponseImpl, type CachedResponse } from './response.js';

export type { CachedResponse } from './response.js';
export { CachedResponseImpl } from './response.js';
export type { FetchOptions, SourceData };

// @ts-ignore - vscode is provided by the extension host at runtime
const vscode = require('vscode');

const emptyHeaders = new Headers();
const jsonHeaders = new Headers([['content-type', 'application/json']]);
const textEncoder = new TextEncoder();

function dirResponse(url: string): CachedResponse {
  return {
    url,
    status: 204,
    statusText: '',
    ok: true,
    headers: emptyHeaders,
    async text() { return ''; },
    async json() {
      const entries = (await vscode.workspace.fs.readDirectory(
        vscode.Uri.parse(url)
      )) as Array<[string, number]>;
      return entries.map(([name]) => name);
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
    const uri = vscode.Uri.parse(urlStr);
    try {
      const data = vscode.workspace.fs.readFileSync
        ? (vscode.workspace.fs.readFileSync(uri) as Uint8Array)
        : null;
      if (data) {
        return new CachedResponseImpl(
          urlStr,
          200,
          'OK',
          urlStr.endsWith('.json') ? jsonHeaders : emptyHeaders,
          data
        );
      }
      // vscode.workspace.fs only exposes async readFile; fall through to async.
    } catch (e: any) {
      if (e.code === 'FileIsADirectory') return dirResponse(urlStr);
      if (e.code === 'EntryNotFound' || e.code === 'FileNotFound')
        return new CachedResponseImpl(urlStr, 404, e.toString(), emptyHeaders, new Uint8Array(0));
      return new CachedResponseImpl(urlStr, 500, e.toString(), emptyHeaders, new Uint8Array(0));
    }
    // Async path returns a stand-in 204 that lazily reads on body access.
    return {
      url: urlStr,
      status: 200,
      statusText: 'OK',
      ok: true,
      headers: urlStr.endsWith('.json') ? jsonHeaders : emptyHeaders,
      async text() {
        const buf = (await vscode.workspace.fs.readFile(uri)) as Uint8Array;
        return new TextDecoder().decode(buf);
      },
      async json() {
        const buf = (await vscode.workspace.fs.readFile(uri)) as Uint8Array;
        return JSON.parse(new TextDecoder().decode(buf));
      },
      async arrayBuffer() {
        const buf = (await vscode.workspace.fs.readFile(uri)) as Uint8Array;
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      }
    };
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
export const setNetworkFetch = _default.setNetworkFetch;
