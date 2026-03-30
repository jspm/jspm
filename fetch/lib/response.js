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
function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
var _body = /*#__PURE__*/ new WeakMap(), _text = /*#__PURE__*/ new WeakMap();
export class CachedResponseImpl {
    text() {
        var _class_private_field_get1;
        return _class_private_field_set(this, _text, (_class_private_field_get1 = _class_private_field_get(this, _text)) !== null && _class_private_field_get1 !== void 0 ? _class_private_field_get1 : _class_private_field_get(this, _body).toString());
    }
    json() {
        return JSON.parse(this.text());
    }
    arrayBuffer() {
        return _class_private_field_get(this, _body).buffer.slice(_class_private_field_get(this, _body).byteOffset, _class_private_field_get(this, _body).byteOffset + _class_private_field_get(this, _body).byteLength);
    }
    constructor(url, status, statusText, headers, body){
        _define_property(this, "url", void 0);
        _define_property(this, "status", void 0);
        _define_property(this, "statusText", void 0);
        _define_property(this, "ok", void 0);
        _define_property(this, "headers", void 0);
        _class_private_field_init(this, _body, {
            writable: true,
            value: void 0
        });
        _class_private_field_init(this, _text, {
            writable: true,
            value: null
        });
        this.url = url;
        this.status = status;
        this.statusText = statusText;
        this.ok = status >= 200 && status < 300;
        this.headers = headers;
        _class_private_field_set(this, _body, body);
    }
}


//# sourceMappingURL=response.js.map