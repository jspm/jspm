import { brotliCompressSync, brotliDecompressSync, constants } from 'node:zlib';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  rmSync,
  renameSync
} from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { platform } from 'node:process';
import { CachedResponseImpl } from './response.js';

function defaultCacheDir(): string {
  if (platform === 'darwin')
    return join(homedir(), 'Library', 'Caches', 'jspm');
  if (platform === 'win32')
    return join(
      process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'),
      'jspm-cache'
    );
  return join(process.env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'jspm');
}

function urlPath(cacheDir: string, url: string): string {
  const hash = createHash('sha256').update(url).digest('hex');
  return join(cacheDir, hash.slice(0, 2), hash);
}

function compress(data: Uint8Array): Buffer {
  return brotliCompressSync(data, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 1 }
  });
}

function decompress(data: Buffer): Buffer {
  return brotliDecompressSync(data);
}

interface CacheMeta {
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  immutable: boolean;
}

/** Persistent FS-backed cache. Memory tier is handled in core.ts. */
export class Cache {
  #cacheDir: string;

  constructor(opts?: { cacheDir?: string }) {
    this.#cacheDir = join(opts?.cacheDir ?? defaultCacheDir(), 'fetch-cache');
  }

  get(url: string): CachedResponseImpl | undefined {
    let raw: Buffer;
    try {
      raw = readFileSync(urlPath(this.#cacheDir, url));
    } catch {
      return undefined;
    }

    const headerLen = raw.readUInt32LE(0);
    const meta = JSON.parse(raw.subarray(4, 4 + headerLen).toString()) as CacheMeta;
    const body = decompress(raw.subarray(4 + headerLen));
    return new CachedResponseImpl(
      meta.url,
      meta.status,
      meta.statusText,
      new Headers(meta.headers),
      body
    );
  }

  set(url: string, response: CachedResponseImpl, immutable = false): void {
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const meta: CacheMeta = {
      url: response.url,
      status: response.status,
      statusText: response.statusText,
      headers,
      immutable
    };
    const metaBuf = Buffer.from(JSON.stringify(meta));
    const headerLen = Buffer.alloc(4);
    headerLen.writeUInt32LE(metaBuf.length, 0);
    const out = Buffer.concat([headerLen, metaBuf, compress(response.bodyBuffer)]);

    const path = urlPath(this.#cacheDir, url);
    mkdirSync(dirname(path), { recursive: true });
    // Atomic write: temp file then rename
    const tmpPath = `${path}.${process.pid}.${Math.random().toString(36).slice(2, 8)}.tmp`;
    try {
      writeFileSync(tmpPath, out);
      renameSync(tmpPath, path);
    } catch {
      try { unlinkSync(tmpPath); } catch {}
    }
  }

  delete(url: string): void {
    try {
      unlinkSync(urlPath(this.#cacheDir, url));
    } catch {}
  }

  clear(): void {
    try {
      rmSync(this.#cacheDir, { recursive: true, force: true });
    } catch {}
  }

  dispose(): void {}
}
