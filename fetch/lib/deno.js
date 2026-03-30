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
import { fileURLToPath } from 'node:url';
export function clearCache() {}
let _readdir;
export const fetch = /*#__PURE__*/ function() {
    var _ref = _async_to_generator(function*(url, ...args) {
        const urlString = url.toString();
        if (urlString.startsWith('file:') || urlString.startsWith('data:') || urlString.startsWith('node:')) {
            try {
                let source;
                if (urlString.startsWith('file:')) {
                    // @ts-ignore - can only resolve Deno when running in Deno
                    source = yield Deno.readTextFile(fileURLToPath(urlString));
                } else if (urlString.startsWith('node:')) {
                    source = '';
                } else {
                    source = decodeURIComponent(urlString.slice(urlString.indexOf(',') + 1));
                }
                return {
                    status: 200,
                    text () {
                        return _async_to_generator(function*() {
                            return source.toString();
                        })();
                    },
                    json () {
                        return _async_to_generator(function*() {
                            return JSON.parse(source.toString());
                        })();
                    },
                    arrayBuffer () {
                        return new TextEncoder().encode(source.toString()).buffer;
                    }
                };
            } catch (e) {
                if (e.code === 'EISDIR') return {
                    status: 204,
                    text () {
                        return _async_to_generator(function*() {
                            return '';
                        })();
                    },
                    json () {
                        return _async_to_generator(function*() {
                            if (!_readdir) {
                                ({ readdir: _readdir } = yield import('node:fs/promises'));
                            }
                            return yield _readdir(fileURLToPath(urlString));
                        })();
                    },
                    arrayBuffer () {
                        return new ArrayBuffer(0);
                    }
                };
                if (e.name === 'NotFound') return {
                    status: 404,
                    statusText: e.toString()
                };
                return {
                    status: 500,
                    statusText: e.toString()
                };
            }
        } else {
            return globalThis.fetch(urlString, ...args);
        }
    });
    return function fetch(url) {
        return _ref.apply(this, arguments);
    };
}();


//# sourceMappingURL=deno.js.map