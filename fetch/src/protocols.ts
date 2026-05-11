import { readFileSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { CachedResponseImpl, type CachedResponse } from './response.js';

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

function dirResponse(url: string, path: string): CachedResponse {
  return {
    url,
    status: 204,
    statusText: '',
    ok: true,
    headers: emptyHeaders,
    async text() { return ''; },
    async json() { return readdir(path); },
    async arrayBuffer() { return new ArrayBuffer(0); }
  };
}

export function handleFileUrl(url: string): CachedResponse {
  const path = fileURLToPath(url);
  try {
    const stat = statSync(path);
    if (stat.isDirectory()) return dirResponse(url, path);
    return fileResponse(url, readFileSync(path) as Buffer);
  } catch (e: any) {
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
