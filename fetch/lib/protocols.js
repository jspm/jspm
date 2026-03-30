function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
    try {
        var info = gen[key](arg);
        var value = info.value;
    } catch (error) {
        reject(error);
        return;
    }
    if (info.done) {
        resolve(value);
    } else {
        Promise.resolve(value).then(_next, _throw);
    }
}
function _async_to_generator(fn) {
    return function() {
        var self = this, args = arguments;
        return new Promise(function(resolve, reject) {
            var gen = fn.apply(self, args);
            function _next(value) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
            }
            function _throw(err) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
            }
            _next(undefined);
        });
    };
}
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CachedResponseImpl } from './response.js';
let _readdir = null;
const emptyHeaders = new Headers();
const jsonHeaders = new Headers([
    [
        'content-type',
        'application/json'
    ]
]);
function fileResponse(url, body) {
    return new CachedResponseImpl(url, 200, 'OK', url.endsWith('.json') ? jsonHeaders : emptyHeaders, body);
}
function dirResponse(path) {
    return {
        url: `file://${path}`,
        status: 204,
        statusText: '',
        ok: true,
        headers: emptyHeaders,
        text () {
            return '';
        },
        json () {
            // Lazy-load readdir to avoid top-level await
            if (!_readdir) {
                // Dynamic import handled synchronously via cache after first call
                throw new Error('Call ensureReaddir() before using directory responses');
            }
            // This is used synchronously in the generator's convention
            // but the actual listing needs to be async — return a promise
            // that the caller awaits (generator already does `await res.json()`)
            return _readdir(path);
        },
        arrayBuffer () {
            return new ArrayBuffer(0);
        }
    };
}
export function ensureReaddir() {
    return _ensureReaddir.apply(this, arguments);
}
function _ensureReaddir() {
    _ensureReaddir = _async_to_generator(function*() {
        if (!_readdir) {
            const fs = yield import('node:fs/promises');
            _readdir = fs.readdir;
        }
    });
    return _ensureReaddir.apply(this, arguments);
}
export function handleFileUrl(url) {
    const path = fileURLToPath(url);
    if (url.endsWith('/')) {
        try {
            readFileSync(path);
            return new CachedResponseImpl(url, 404, 'Directory does not exist', emptyHeaders, Buffer.alloc(0));
        } catch (e) {
            if (e.code === 'EISDIR') return dirResponse(path);
            throw e;
        }
    }
    try {
        return fileResponse(url, readFileSync(path));
    } catch (e) {
        if (e.code === 'EISDIR') return dirResponse(path);
        if (e.code === 'ENOENT' || e.code === 'ENOTDIR') return new CachedResponseImpl(url, 404, e.toString(), emptyHeaders, Buffer.alloc(0));
        return new CachedResponseImpl(url, 500, e.toString(), emptyHeaders, Buffer.alloc(0));
    }
}
export function handleDataUrl(url) {
    const body = decodeURIComponent(url.slice(url.indexOf(',') + 1));
    return new CachedResponseImpl(url, 200, 'OK', emptyHeaders, Buffer.from(body));
}
export function handleNodeUrl(url) {
    return new CachedResponseImpl(url, 200, 'OK', emptyHeaders, Buffer.alloc(0));
}


//# sourceMappingURL=protocols.js.map