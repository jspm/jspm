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
import { fetch as _fetch } from './native.js';
export { clearCache } from './native.js';
function sourceResponse(buffer) {
    return {
        status: 200,
        statusText: 'dir',
        text () {
            return _async_to_generator(function*() {
                return buffer.toString();
            })();
        },
        json () {
            return _async_to_generator(function*() {
                return JSON.parse(buffer.toString());
            })();
        },
        arrayBuffer () {
            return new TextEncoder().encode(buffer).buffer;
        }
    };
}
let _readdir;
const dirResponse = (path)=>({
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
                return yield _readdir(path);
            })();
        },
        arrayBuffer () {
            return new ArrayBuffer(0);
        }
    });
// @ts-ignore
const vscode = require('vscode');
export const fetch = /*#__PURE__*/ function() {
    var _ref = _async_to_generator(function*(url, opts) {
        const urlString = url.toString();
        const protocol = urlString.slice(0, urlString.indexOf(':') + 1);
        switch(protocol){
            case 'file:':
                if (urlString.endsWith('/')) {
                    try {
                        yield vscode.workspace.fs.readFile(vscode.Uri.parse(urlString));
                        return {
                            status: 404,
                            statusText: 'Directory does not exist'
                        };
                    } catch (e) {
                        if (e.code === 'FileIsADirectory') return dirResponse(urlString);
                        throw e;
                    }
                }
                try {
                    return sourceResponse(new TextDecoder().decode((yield vscode.workspace.fs.readFile(vscode.Uri.parse(urlString)))));
                } catch (e) {
                    if (e.code === 'FileIsADirectory') return dirResponse(urlString);
                    if (e.code === 'Unavailable' || e.code === 'EntryNotFound' || e.code === 'FileNotFound') return {
                        status: 404,
                        statusText: e.toString()
                    };
                    return {
                        status: 500,
                        statusText: e.toString()
                    };
                }
            case 'data:':
            case 'http:':
            case 'https:':
                // @ts-ignore
                return _fetch(url, opts);
        }
    });
    return function fetch(url, opts) {
        return _ref.apply(this, arguments);
    };
}();


//# sourceMappingURL=vscode.js.map