function _check_private_redeclaration(obj, privateCollection) {
    if (privateCollection.has(obj)) {
        throw new TypeError("Cannot initialize the same private elements twice on an object");
    }
}
function _class_apply_descriptor_get(receiver, descriptor) {
    if (descriptor.get) {
        return descriptor.get.call(receiver);
    }
    return descriptor.value;
}
function _class_apply_descriptor_set(receiver, descriptor, value) {
    if (descriptor.set) {
        descriptor.set.call(receiver, value);
    } else {
        if (!descriptor.writable) {
            throw new TypeError("attempted to set read only private field");
        }
        descriptor.value = value;
    }
}
function _class_extract_field_descriptor(receiver, privateMap, action) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to " + action + " private field on non-instance");
    }
    return privateMap.get(receiver);
}
function _class_private_field_get(receiver, privateMap) {
    var descriptor = _class_extract_field_descriptor(receiver, privateMap, "get");
    return _class_apply_descriptor_get(receiver, descriptor);
}
function _class_private_field_init(obj, privateMap, value) {
    _check_private_redeclaration(obj, privateMap);
    privateMap.set(obj, value);
}
function _class_private_field_set(receiver, privateMap, value) {
    var descriptor = _class_extract_field_descriptor(receiver, privateMap, "set");
    _class_apply_descriptor_set(receiver, descriptor, value);
    return value;
}
function _class_private_method_get(receiver, privateSet, fn) {
    if (!privateSet.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return fn;
}
function _class_private_method_init(obj, privateSet) {
    _check_private_redeclaration(obj, privateSet);
    privateSet.add(obj);
}
import { brotliCompressSync, brotliDecompressSync, constants } from 'node:zlib';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { platform } from 'node:process';
import Database from 'better-sqlite3';
import { CachedResponseImpl } from './response.js';
function defaultCacheDir() {
    if (platform === 'darwin') return join(homedir(), 'Library', 'Caches', 'jspm');
    if (platform === 'win32') return join(process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local'), 'jspm-cache');
    return join(process.env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'jspm');
}
function compress(data) {
    return brotliCompressSync(data, {
        params: {
            [constants.BROTLI_PARAM_QUALITY]: 1
        }
    });
}
function decompress(data) {
    return brotliDecompressSync(data);
}
var _memory = /*#__PURE__*/ new WeakMap(), _db = /*#__PURE__*/ new WeakMap(), _getStmt = /*#__PURE__*/ new WeakMap(), _setStmt = /*#__PURE__*/ new WeakMap(), _deleteStmt = /*#__PURE__*/ new WeakMap(), _cacheDir = /*#__PURE__*/ new WeakMap(), _memoryOnly = /*#__PURE__*/ new WeakMap(), _openDb = /*#__PURE__*/ new WeakSet();
export class Cache {
    get(url) {
        // Tier 1: memory
        const mem = _class_private_field_get(this, _memory).get(url);
        if (mem) return mem;
        // Tier 2: SQLite
        if (!_class_private_field_get(this, _memoryOnly)) {
            _class_private_method_get(this, _openDb, openDb).call(this);
            const row = _class_private_field_get(this, _getStmt).get(url);
            if (row) {
                const headers = new Headers(JSON.parse(row.headers));
                const body = decompress(row.body);
                const response = new CachedResponseImpl(row.url, row.status, row.status_text, headers, body);
                // Promote to memory cache
                _class_private_field_get(this, _memory).set(url, response);
                return response;
            }
        }
        return undefined;
    }
    set(url, response, immutable = false) {
        // Always store in memory
        _class_private_field_get(this, _memory).set(url, response);
        // Persist to SQLite
        if (!_class_private_field_get(this, _memoryOnly)) {
            _class_private_method_get(this, _openDb, openDb).call(this);
            const body = Buffer.from(response.arrayBuffer());
            const headers = {};
            response.headers.forEach((value, key)=>{
                headers[key] = value;
            });
            _class_private_field_get(this, _setStmt).run(url, response.status, response.statusText, JSON.stringify(headers), compress(body), immutable ? 1 : 0, Date.now());
        }
    }
    delete(url) {
        _class_private_field_get(this, _memory).delete(url);
        if (!_class_private_field_get(this, _memoryOnly) && _class_private_field_get(this, _db)) {
            _class_private_field_get(this, _deleteStmt).run(url);
        }
    }
    clear() {
        _class_private_field_get(this, _memory).clear();
        if (!_class_private_field_get(this, _memoryOnly) && _class_private_field_get(this, _db)) {
            _class_private_field_get(this, _db).exec('DELETE FROM responses');
        }
    }
    dispose() {
        _class_private_field_get(this, _memory).clear();
        if (_class_private_field_get(this, _db)) {
            _class_private_field_get(this, _db).close();
            _class_private_field_set(this, _db, null);
        }
    }
    constructor(opts){
        _class_private_method_init(this, _openDb);
        _class_private_field_init(this, _memory, {
            writable: true,
            value: new Map()
        });
        _class_private_field_init(this, _db, {
            writable: true,
            value: null
        });
        _class_private_field_init(this, _getStmt, {
            writable: true,
            value: null
        });
        _class_private_field_init(this, _setStmt, {
            writable: true,
            value: null
        });
        _class_private_field_init(this, _deleteStmt, {
            writable: true,
            value: null
        });
        _class_private_field_init(this, _cacheDir, {
            writable: true,
            value: void 0
        });
        _class_private_field_init(this, _memoryOnly, {
            writable: true,
            value: void 0
        });
        var _opts_cacheDir;
        _class_private_field_set(this, _cacheDir, (_opts_cacheDir = opts === null || opts === void 0 ? void 0 : opts.cacheDir) !== null && _opts_cacheDir !== void 0 ? _opts_cacheDir : defaultCacheDir());
        var _opts_memoryOnly;
        _class_private_field_set(this, _memoryOnly, (_opts_memoryOnly = opts === null || opts === void 0 ? void 0 : opts.memoryOnly) !== null && _opts_memoryOnly !== void 0 ? _opts_memoryOnly : false);
    }
}
function openDb() {
    if (_class_private_field_get(this, _db) || _class_private_field_get(this, _memoryOnly)) return;
    const dir = join(_class_private_field_get(this, _cacheDir), 'fetch-cache');
    mkdirSync(dir, {
        recursive: true
    });
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
    _class_private_field_set(this, _db, db);
    _class_private_field_set(this, _getStmt, db.prepare('SELECT * FROM responses WHERE url = ?'));
    _class_private_field_set(this, _setStmt, db.prepare(`INSERT OR REPLACE INTO responses (url, status, status_text, headers, body, immutable, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`));
    _class_private_field_set(this, _deleteStmt, db.prepare('DELETE FROM responses WHERE url = ?'));
}


//# sourceMappingURL=cache.js.map