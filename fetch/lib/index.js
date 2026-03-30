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
import { Cache } from './cache.js';
import { Pool } from './pool.js';
import { CachedResponseImpl } from './response.js';
import { handleFileUrl, handleDataUrl, handleNodeUrl, ensureReaddir } from './protocols.js';
export { CachedResponseImpl } from './response.js';
const emptyHeaders = new Headers();
const jsonHeaders = new Headers([
    [
        'content-type',
        'application/json'
    ]
]);
export function createFetch(opts) {
    const cache = new Cache({
        cacheDir: opts === null || opts === void 0 ? void 0 : opts.cacheDir,
        memoryOnly: opts === null || opts === void 0 ? void 0 : opts.memoryOnly
    });
    var _opts_poolSize;
    const pool = new Pool((_opts_poolSize = opts === null || opts === void 0 ? void 0 : opts.poolSize) !== null && _opts_poolSize !== void 0 ? _opts_poolSize : 100);
    var _opts_retryCount;
    const retryCount = (_opts_retryCount = opts === null || opts === void 0 ? void 0 : opts.retryCount) !== null && _opts_retryCount !== void 0 ? _opts_retryCount : 5;
    const inflight = new Map();
    const virtualSources = {};
    ensureReaddir();
    function setVirtualSourceData(urlBase, sourceData) {
        virtualSources[urlBase.endsWith('/') ? urlBase : urlBase + '/'] = sourceData;
    }
    function isVirtualUrl(url) {
        return Object.keys(virtualSources).some((base)=>url.startsWith(base));
    }
    function resolveVirtual(urlStr) {
        let matchedVirtual = false;
        for (const virtualBase of Object.keys(virtualSources)){
            if (!urlStr.startsWith(virtualBase)) continue;
            const virtualFileData = virtualSources[virtualBase];
            let subdir = urlStr.slice(virtualBase.length);
            const source = virtualFileData[subdir];
            if (source) {
                const buf = typeof source === 'string' ? Buffer.from(source) : Buffer.from(source);
                return new CachedResponseImpl(urlStr, 200, 'OK', urlStr.endsWith('.json') ? jsonHeaders : emptyHeaders, buf);
            }
            // Directory listing via 204 convention
            let dirFiles = null;
            if (!subdir.endsWith('/') && subdir.length) subdir += '/';
            for (const file of Object.keys(virtualFileData)){
                if (file.startsWith(subdir)) {
                    dirFiles = dirFiles || [];
                    let filename = file.slice(subdir.length);
                    if (filename.indexOf('/') !== -1) {
                        filename = filename.slice(0, filename.indexOf('/'));
                        if (dirFiles.includes(filename)) continue;
                    }
                    dirFiles.push(filename);
                }
            }
            if (dirFiles) {
                const listing = dirFiles;
                return {
                    url: urlStr,
                    ok: true,
                    status: 204,
                    statusText: '',
                    headers: emptyHeaders,
                    text () {
                        return '';
                    },
                    json () {
                        return listing;
                    },
                    arrayBuffer () {
                        return new ArrayBuffer(0);
                    }
                };
            }
            matchedVirtual = true;
        }
        if (matchedVirtual) {
            return new CachedResponseImpl(urlStr, 404, 'Virtual source not found', emptyHeaders, Buffer.alloc(0));
        }
        return null;
    }
    function fetchUrl(url, fetchOpts) {
        return _fetchUrl.apply(this, arguments);
    }
    function _fetchUrl() {
        _fetchUrl = _async_to_generator(function*(url, fetchOpts) {
            const urlStr = url.toString();
            // Virtual sources — highest priority
            const virtual = resolveVirtual(urlStr);
            if (virtual) return virtual;
            const protocol = urlStr.slice(0, urlStr.indexOf(':') + 1);
            // Local protocols — no caching
            switch(protocol){
                case 'file:':
                    return handleFileUrl(urlStr);
                case 'data:':
                    return handleDataUrl(urlStr);
                case 'node:':
                    return handleNodeUrl(urlStr);
            }
            const noStore = (fetchOpts === null || fetchOpts === void 0 ? void 0 : fetchOpts.cache) === 'no-store';
            // Check cache (unless no-store)
            if (!noStore) {
                const cached = cache.get(urlStr);
                if (cached) return cached;
            }
            // Deduplicate in-flight requests
            const existing = inflight.get(urlStr);
            if (existing) return existing;
            const promise = _async_to_generator(function*() {
                try {
                    yield pool.acquire();
                    let lastError;
                    for(let attempt = 0; attempt <= retryCount; attempt++){
                        try {
                            const res = yield globalThis.fetch(urlStr, {
                                headers: fetchOpts === null || fetchOpts === void 0 ? void 0 : fetchOpts.headers,
                                redirect: 'follow'
                            });
                            const buffer = Buffer.from((yield res.arrayBuffer()));
                            const response = new CachedResponseImpl(res.url || urlStr, res.status, res.statusText, res.headers, buffer);
                            // Only cache successful responses
                            if (response.ok && !noStore) {
                                cache.set(urlStr, response, fetchOpts === null || fetchOpts === void 0 ? void 0 : fetchOpts.immutable);
                            }
                            return response;
                        } catch (e) {
                            lastError = e;
                            if (attempt >= retryCount) break;
                        }
                    }
                    throw lastError;
                } finally{
                    inflight.delete(urlStr);
                    pool.release();
                }
            })();
            inflight.set(urlStr, promise);
            return promise;
        });
        return _fetchUrl.apply(this, arguments);
    }
    return {
        fetch: fetchUrl,
        clearCache () {
            cache.clear();
        },
        dispose () {
            cache.dispose();
        },
        setVirtualSourceData,
        isVirtualUrl
    };
}
// Default instance for direct import
const _default = createFetch();
export const fetch = _default.fetch;
export const clearCache = _default.clearCache;
export const setVirtualSourceData = _default.setVirtualSourceData;
export const isVirtualUrl = _default.isVirtualUrl;


//# sourceMappingURL=index.js.map