import { brotliCompressSync, brotliDecompressSync, constants } from 'node:zlib';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { platform } from 'node:process';
import Database from 'better-sqlite3';
import type { Database as DatabaseType, Statement } from 'better-sqlite3';
import { CachedResponseImpl, type CachedResponse } from './response.js';

interface CacheRow {
  url: string;
  status: number;
  status_text: string;
  headers: string;
  body: Buffer;
  immutable: number;
  created_at: number;
}

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

function compress(data: Buffer): Buffer {
  return brotliCompressSync(data, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 1, // fast compression
    }
  });
}

function decompress(data: Buffer): Buffer {
  return brotliDecompressSync(data);
}

export class Cache {
  #memory = new Map<string, CachedResponse>();
  #db: DatabaseType | null = null;
  #getStmt: Statement | null = null;
  #setStmt: Statement | null = null;
  #deleteStmt: Statement | null = null;
  #cacheDir: string;
  #memoryOnly: boolean;

  constructor(opts?: { cacheDir?: string; memoryOnly?: boolean }) {
    this.#cacheDir = opts?.cacheDir ?? defaultCacheDir();
    this.#memoryOnly = opts?.memoryOnly ?? false;
  }

  #openDb() {
    if (this.#db || this.#memoryOnly) return;
    const dir = join(this.#cacheDir, 'fetch-cache');
    mkdirSync(dir, { recursive: true });
    const db = new Database(join(dir, 'cache.db'));
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.exec(`CREATE TABLE IF NOT EXISTS responses (
      url TEXT PRIMARY KEY,
      status INTEGER NOT NULL,
      status_text TEXT NOT NULL DEFAULT '',
      headers TEXT NOT NULL DEFAULT '{}',
      body BLOB NOT NULL,
      immutable INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    )`);
    this.#db = db;
    this.#getStmt = db.prepare('SELECT * FROM responses WHERE url = ?');
    this.#setStmt = db.prepare(
      `INSERT OR REPLACE INTO responses (url, status, status_text, headers, body, immutable, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    this.#deleteStmt = db.prepare('DELETE FROM responses WHERE url = ?');
  }

  get(url: string): CachedResponse | undefined {
    // Tier 1: memory
    const mem = this.#memory.get(url);
    if (mem) return mem;

    // Tier 2: SQLite
    if (!this.#memoryOnly) {
      this.#openDb();
      const row = this.#getStmt!.get(url) as CacheRow | undefined;
      if (row) {
        const headers = new Headers(JSON.parse(row.headers));
        const body = decompress(row.body);
        const response = new CachedResponseImpl(
          row.url,
          row.status,
          row.status_text,
          headers,
          body
        );
        // Promote to memory cache
        this.#memory.set(url, response);
        return response;
      }
    }

    return undefined;
  }

  set(url: string, response: CachedResponse, immutable = false): void {
    // Always store in memory
    this.#memory.set(url, response);

    // Persist to SQLite
    if (!this.#memoryOnly) {
      this.#openDb();
      const body = Buffer.from(response.arrayBuffer());
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      this.#setStmt!.run(
        url,
        response.status,
        response.statusText,
        JSON.stringify(headers),
        compress(body),
        immutable ? 1 : 0,
        Date.now()
      );
    }
  }

  delete(url: string): void {
    this.#memory.delete(url);
    if (!this.#memoryOnly && this.#db) {
      this.#deleteStmt!.run(url);
    }
  }

  clear(): void {
    this.#memory.clear();
    if (!this.#memoryOnly && this.#db) {
      this.#db.exec('DELETE FROM responses');
    }
  }

  dispose(): void {
    this.#memory.clear();
    if (this.#db) {
      this.#db.close();
      this.#db = null;
    }
  }
}
