import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CachedResponseImpl, type CachedResponse } from './response.js';

let _readdir: typeof import('node:fs/promises').readdir | null = null;

const emptyHeaders = new Headers();
const jsonHeaders = new Headers([['content-type', 'application/json']]);

function fileResponse(url: string, body: Buffer): CachedResponse {
  return new CachedResponseImpl(
    url,
    200,
    'OK',
    url.endsWith('.json') ? jsonHeaders : emptyHeaders,
    body
  );
}

function dirResponse(path: string): CachedResponse {
  return {
    url: `file://${path}`,
    status: 204,
    statusText: '',
    ok: true,
    headers: emptyHeaders,
    text() { return ''; },
    json() {
      // Lazy-load readdir to avoid top-level await
      if (!_readdir) {
        // Dynamic import handled synchronously via cache after first call
        throw new Error('Call ensureReaddir() before using directory responses');
      }
      // This is used synchronously in the generator's convention
      // but the actual listing needs to be async — return a promise
      // that the caller awaits (generator already does `await res.json()`)
      return _readdir(path) as any;
    },
    arrayBuffer() { return new ArrayBuffer(0); }
  };
}

export async function ensureReaddir() {
  if (!_readdir) {
    const fs = await import('node:fs/promises');
    _readdir = fs.readdir;
  }
}

export function handleFileUrl(url: string): CachedResponse {
  const path = fileURLToPath(url);
  if (url.endsWith('/')) {
    try {
      readFileSync(path);
      return new CachedResponseImpl(url, 404, 'Directory does not exist', emptyHeaders, Buffer.alloc(0));
    } catch (e: any) {
      if (e.code === 'EISDIR') return dirResponse(path);
      throw e;
    }
  }
  try {
    return fileResponse(url, readFileSync(path) as Buffer);
  } catch (e: any) {
    if (e.code === 'EISDIR') return dirResponse(path);
    if (e.code === 'ENOENT' || e.code === 'ENOTDIR')
      return new CachedResponseImpl(url, 404, e.toString(), emptyHeaders, Buffer.alloc(0));
    return new CachedResponseImpl(url, 500, e.toString(), emptyHeaders, Buffer.alloc(0));
  }
}

export function handleDataUrl(url: string): CachedResponse {
  const body = decodeURIComponent(url.slice(url.indexOf(',') + 1));
  return new CachedResponseImpl(url, 200, 'OK', emptyHeaders, Buffer.from(body));
}

export function handleNodeUrl(url: string): CachedResponse {
  return new CachedResponseImpl(url, 200, 'OK', emptyHeaders, Buffer.alloc(0));
}
