import _assert2 from 'assert';

var exports$28 = {},
  _dewExec$27 = false;
function dew$27() {
  if (_dewExec$27) return exports$28;
  _dewExec$27 = true;
  /**
   * Appends the elements of `values` to `array`.
   *
   * @private
   * @param {Array} array The array to modify.
   * @param {Array} values The values to append.
   * @returns {Array} Returns `array`.
   */
  function arrayPush(array, values) {
    var index = -1,
      length = values.length,
      offset = array.length;
    while (++index < length) {
      array[offset + index] = values[index];
    }
    return array;
  }
  exports$28 = arrayPush;
  return exports$28;
}

var exports$27 = {},
  _dewExec$26 = false;
var _global$q = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
function dew$26() {
  if (_dewExec$26) return exports$27;
  _dewExec$26 = true;
  /** Detect free variable `global` from Node.js. */
  var freeGlobal = typeof _global$q == "object" && _global$q && _global$q.Object === Object && _global$q;
  exports$27 = freeGlobal;
  return exports$27;
}

var exports$26 = {},
  _dewExec$25 = false;
function dew$25() {
  if (_dewExec$25) return exports$26;
  _dewExec$25 = true;
  var freeGlobal = dew$26();

  /** Detect free variable `self`. */
  var freeSelf = typeof self == "object" && self && self.Object === Object && self;

  /** Used as a reference to the global object. */
  var root = freeGlobal || freeSelf || Function("return this")();
  exports$26 = root;
  return exports$26;
}

var exports$25 = {},
  _dewExec$24 = false;
function dew$24() {
  if (_dewExec$24) return exports$25;
  _dewExec$24 = true;
  var root = dew$25();

  /** Built-in value references. */
  var Symbol = root.Symbol;
  exports$25 = Symbol;
  return exports$25;
}

var exports$24 = {},
  _dewExec$23 = false;
function dew$23() {
  if (_dewExec$23) return exports$24;
  _dewExec$23 = true;
  var Symbol = dew$24();

  /** Used for built-in method references. */
  var objectProto = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty = objectProto.hasOwnProperty;

  /**
   * Used to resolve the
   * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
   * of values.
   */
  var nativeObjectToString = objectProto.toString;

  /** Built-in value references. */
  var symToStringTag = Symbol ? Symbol.toStringTag : undefined;

  /**
   * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
   *
   * @private
   * @param {*} value The value to query.
   * @returns {string} Returns the raw `toStringTag`.
   */
  function getRawTag(value) {
    var isOwn = hasOwnProperty.call(value, symToStringTag),
      tag = value[symToStringTag];
    try {
      value[symToStringTag] = undefined;
      var unmasked = true;
    } catch (e) {}
    var result = nativeObjectToString.call(value);
    if (unmasked) {
      if (isOwn) {
        value[symToStringTag] = tag;
      } else {
        delete value[symToStringTag];
      }
    }
    return result;
  }
  exports$24 = getRawTag;
  return exports$24;
}

var exports$23 = {},
  _dewExec$22 = false;
function dew$22() {
  if (_dewExec$22) return exports$23;
  _dewExec$22 = true;
  /** Used for built-in method references. */
  var objectProto = Object.prototype;

  /**
   * Used to resolve the
   * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
   * of values.
   */
  var nativeObjectToString = objectProto.toString;

  /**
   * Converts `value` to a string using `Object.prototype.toString`.
   *
   * @private
   * @param {*} value The value to convert.
   * @returns {string} Returns the converted string.
   */
  function objectToString(value) {
    return nativeObjectToString.call(value);
  }
  exports$23 = objectToString;
  return exports$23;
}

var exports$22 = {},
  _dewExec$21 = false;
function dew$21() {
  if (_dewExec$21) return exports$22;
  _dewExec$21 = true;
  var Symbol = dew$24(),
    getRawTag = dew$23(),
    objectToString = dew$22();

  /** `Object#toString` result references. */
  var nullTag = "[object Null]",
    undefinedTag = "[object Undefined]";

  /** Built-in value references. */
  var symToStringTag = Symbol ? Symbol.toStringTag : undefined;

  /**
   * The base implementation of `getTag` without fallbacks for buggy environments.
   *
   * @private
   * @param {*} value The value to query.
   * @returns {string} Returns the `toStringTag`.
   */
  function baseGetTag(value) {
    if (value == null) {
      return value === undefined ? undefinedTag : nullTag;
    }
    return symToStringTag && symToStringTag in Object(value) ? getRawTag(value) : objectToString(value);
  }
  exports$22 = baseGetTag;
  return exports$22;
}

var exports$21 = {},
  _dewExec$20 = false;
function dew$20() {
  if (_dewExec$20) return exports$21;
  _dewExec$20 = true;
  /**
   * Checks if `value` is object-like. A value is object-like if it's not `null`
   * and has a `typeof` result of "object".
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
   * @example
   *
   * _.isObjectLike({});
   * // => true
   *
   * _.isObjectLike([1, 2, 3]);
   * // => true
   *
   * _.isObjectLike(_.noop);
   * // => false
   *
   * _.isObjectLike(null);
   * // => false
   */
  function isObjectLike(value) {
    return value != null && typeof value == "object";
  }
  exports$21 = isObjectLike;
  return exports$21;
}

var exports$20 = {},
  _dewExec$1$ = false;
function dew$1$() {
  if (_dewExec$1$) return exports$20;
  _dewExec$1$ = true;
  var baseGetTag = dew$21(),
    isObjectLike = dew$20();

  /** `Object#toString` result references. */
  var argsTag = "[object Arguments]";

  /**
   * The base implementation of `_.isArguments`.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an `arguments` object,
   */
  function baseIsArguments(value) {
    return isObjectLike(value) && baseGetTag(value) == argsTag;
  }
  exports$20 = baseIsArguments;
  return exports$20;
}

var exports$1$ = {},
  _dewExec$1_ = false;
function dew$1_() {
  if (_dewExec$1_) return exports$1$;
  _dewExec$1_ = true;
  var baseIsArguments = dew$1$(),
    isObjectLike = dew$20();

  /** Used for built-in method references. */
  var objectProto = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty = objectProto.hasOwnProperty;

  /** Built-in value references. */
  var propertyIsEnumerable = objectProto.propertyIsEnumerable;

  /**
   * Checks if `value` is likely an `arguments` object.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an `arguments` object,
   *  else `false`.
   * @example
   *
   * _.isArguments(function() { return arguments; }());
   * // => true
   *
   * _.isArguments([1, 2, 3]);
   * // => false
   */
  var isArguments = baseIsArguments(function () {
    return arguments;
  }()) ? baseIsArguments : function (value) {
    return isObjectLike(value) && hasOwnProperty.call(value, "callee") && !propertyIsEnumerable.call(value, "callee");
  };
  exports$1$ = isArguments;
  return exports$1$;
}

var exports$1_ = {},
  _dewExec$1Z = false;
function dew$1Z() {
  if (_dewExec$1Z) return exports$1_;
  _dewExec$1Z = true;
  /**
   * Checks if `value` is classified as an `Array` object.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an array, else `false`.
   * @example
   *
   * _.isArray([1, 2, 3]);
   * // => true
   *
   * _.isArray(document.body.children);
   * // => false
   *
   * _.isArray('abc');
   * // => false
   *
   * _.isArray(_.noop);
   * // => false
   */
  var isArray = Array.isArray;
  exports$1_ = isArray;
  return exports$1_;
}

var exports$1Z = {},
  _dewExec$1Y = false;
function dew$1Y() {
  if (_dewExec$1Y) return exports$1Z;
  _dewExec$1Y = true;
  var Symbol = dew$24(),
    isArguments = dew$1_(),
    isArray = dew$1Z();

  /** Built-in value references. */
  var spreadableSymbol = Symbol ? Symbol.isConcatSpreadable : undefined;

  /**
   * Checks if `value` is a flattenable `arguments` object or array.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is flattenable, else `false`.
   */
  function isFlattenable(value) {
    return isArray(value) || isArguments(value) || !!(spreadableSymbol && value && value[spreadableSymbol]);
  }
  exports$1Z = isFlattenable;
  return exports$1Z;
}

var exports$1Y = {},
  _dewExec$1X = false;
function dew$1X() {
  if (_dewExec$1X) return exports$1Y;
  _dewExec$1X = true;
  var arrayPush = dew$27(),
    isFlattenable = dew$1Y();

  /**
   * The base implementation of `_.flatten` with support for restricting flattening.
   *
   * @private
   * @param {Array} array The array to flatten.
   * @param {number} depth The maximum recursion depth.
   * @param {boolean} [predicate=isFlattenable] The function invoked per iteration.
   * @param {boolean} [isStrict] Restrict to values that pass `predicate` checks.
   * @param {Array} [result=[]] The initial result value.
   * @returns {Array} Returns the new flattened array.
   */
  function baseFlatten(array, depth, predicate, isStrict, result) {
    var index = -1,
      length = array.length;
    predicate || (predicate = isFlattenable);
    result || (result = []);
    while (++index < length) {
      var value = array[index];
      if (depth > 0 && predicate(value)) {
        if (depth > 1) {
          // Recursively flatten arrays (susceptible to call stack limits).
          baseFlatten(value, depth - 1, predicate, isStrict, result);
        } else {
          arrayPush(result, value);
        }
      } else if (!isStrict) {
        result[result.length] = value;
      }
    }
    return result;
  }
  exports$1Y = baseFlatten;
  return exports$1Y;
}

var exports$1X = {},
  _dewExec$1W = false;
function dew$1W() {
  if (_dewExec$1W) return exports$1X;
  _dewExec$1W = true;
  /**
   * A specialized version of `_.map` for arrays without support for iteratee
   * shorthands.
   *
   * @private
   * @param {Array} [array] The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns the new mapped array.
   */
  function arrayMap(array, iteratee) {
    var index = -1,
      length = array == null ? 0 : array.length,
      result = Array(length);
    while (++index < length) {
      result[index] = iteratee(array[index], index, array);
    }
    return result;
  }
  exports$1X = arrayMap;
  return exports$1X;
}

var exports$1W = {},
  _dewExec$1V = false;
function dew$1V() {
  if (_dewExec$1V) return exports$1W;
  _dewExec$1V = true;
  var baseGetTag = dew$21(),
    isObjectLike = dew$20();

  /** `Object#toString` result references. */
  var symbolTag = "[object Symbol]";

  /**
   * Checks if `value` is classified as a `Symbol` primitive or object.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
   * @example
   *
   * _.isSymbol(Symbol.iterator);
   * // => true
   *
   * _.isSymbol('abc');
   * // => false
   */
  function isSymbol(value) {
    return typeof value == "symbol" || isObjectLike(value) && baseGetTag(value) == symbolTag;
  }
  exports$1W = isSymbol;
  return exports$1W;
}

var exports$1V = {},
  _dewExec$1U = false;
function dew$1U() {
  if (_dewExec$1U) return exports$1V;
  _dewExec$1U = true;
  var isArray = dew$1Z(),
    isSymbol = dew$1V();

  /** Used to match property names within property paths. */
  var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
    reIsPlainProp = /^\w*$/;

  /**
   * Checks if `value` is a property name and not a property path.
   *
   * @private
   * @param {*} value The value to check.
   * @param {Object} [object] The object to query keys on.
   * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
   */
  function isKey(value, object) {
    if (isArray(value)) {
      return false;
    }
    var type = typeof value;
    if (type == "number" || type == "symbol" || type == "boolean" || value == null || isSymbol(value)) {
      return true;
    }
    return reIsPlainProp.test(value) || !reIsDeepProp.test(value) || object != null && value in Object(object);
  }
  exports$1V = isKey;
  return exports$1V;
}

var exports$1U = {},
  _dewExec$1T = false;
function dew$1T() {
  if (_dewExec$1T) return exports$1U;
  _dewExec$1T = true;
  /**
   * Checks if `value` is the
   * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
   * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an object, else `false`.
   * @example
   *
   * _.isObject({});
   * // => true
   *
   * _.isObject([1, 2, 3]);
   * // => true
   *
   * _.isObject(_.noop);
   * // => true
   *
   * _.isObject(null);
   * // => false
   */
  function isObject(value) {
    var type = typeof value;
    return value != null && (type == "object" || type == "function");
  }
  exports$1U = isObject;
  return exports$1U;
}

var exports$1T = {},
  _dewExec$1S = false;
function dew$1S() {
  if (_dewExec$1S) return exports$1T;
  _dewExec$1S = true;
  var baseGetTag = dew$21(),
    isObject = dew$1T();

  /** `Object#toString` result references. */
  var asyncTag = "[object AsyncFunction]",
    funcTag = "[object Function]",
    genTag = "[object GeneratorFunction]",
    proxyTag = "[object Proxy]";

  /**
   * Checks if `value` is classified as a `Function` object.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a function, else `false`.
   * @example
   *
   * _.isFunction(_);
   * // => true
   *
   * _.isFunction(/abc/);
   * // => false
   */
  function isFunction(value) {
    if (!isObject(value)) {
      return false;
    }
    // The use of `Object#toString` avoids issues with the `typeof` operator
    // in Safari 9 which returns 'object' for typed arrays and other constructors.
    var tag = baseGetTag(value);
    return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
  }
  exports$1T = isFunction;
  return exports$1T;
}

var exports$1S = {},
  _dewExec$1R = false;
function dew$1R() {
  if (_dewExec$1R) return exports$1S;
  _dewExec$1R = true;
  var root = dew$25();

  /** Used to detect overreaching core-js shims. */
  var coreJsData = root["__core-js_shared__"];
  exports$1S = coreJsData;
  return exports$1S;
}

var exports$1R = {},
  _dewExec$1Q = false;
function dew$1Q() {
  if (_dewExec$1Q) return exports$1R;
  _dewExec$1Q = true;
  var coreJsData = dew$1R();

  /** Used to detect methods masquerading as native. */
  var maskSrcKey = function () {
    var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || "");
    return uid ? "Symbol(src)_1." + uid : "";
  }();

  /**
   * Checks if `func` has its source masked.
   *
   * @private
   * @param {Function} func The function to check.
   * @returns {boolean} Returns `true` if `func` is masked, else `false`.
   */
  function isMasked(func) {
    return !!maskSrcKey && maskSrcKey in func;
  }
  exports$1R = isMasked;
  return exports$1R;
}

var exports$1Q = {},
  _dewExec$1P = false;
function dew$1P() {
  if (_dewExec$1P) return exports$1Q;
  _dewExec$1P = true;
  /** Used for built-in method references. */
  var funcProto = Function.prototype;

  /** Used to resolve the decompiled source of functions. */
  var funcToString = funcProto.toString;

  /**
   * Converts `func` to its source code.
   *
   * @private
   * @param {Function} func The function to convert.
   * @returns {string} Returns the source code.
   */
  function toSource(func) {
    if (func != null) {
      try {
        return funcToString.call(func);
      } catch (e) {}
      try {
        return func + "";
      } catch (e) {}
    }
    return "";
  }
  exports$1Q = toSource;
  return exports$1Q;
}

var exports$1P = {},
  _dewExec$1O = false;
function dew$1O() {
  if (_dewExec$1O) return exports$1P;
  _dewExec$1O = true;
  var isFunction = dew$1S(),
    isMasked = dew$1Q(),
    isObject = dew$1T(),
    toSource = dew$1P();

  /**
   * Used to match `RegExp`
   * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
   */
  var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

  /** Used to detect host constructors (Safari). */
  var reIsHostCtor = /^\[object .+?Constructor\]$/;

  /** Used for built-in method references. */
  var funcProto = Function.prototype,
    objectProto = Object.prototype;

  /** Used to resolve the decompiled source of functions. */
  var funcToString = funcProto.toString;

  /** Used to check objects for own properties. */
  var hasOwnProperty = objectProto.hasOwnProperty;

  /** Used to detect if a method is native. */
  var reIsNative = RegExp("^" + funcToString.call(hasOwnProperty).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$");

  /**
   * The base implementation of `_.isNative` without bad shim checks.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a native function,
   *  else `false`.
   */
  function baseIsNative(value) {
    if (!isObject(value) || isMasked(value)) {
      return false;
    }
    var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
    return pattern.test(toSource(value));
  }
  exports$1P = baseIsNative;
  return exports$1P;
}

var exports$1O = {},
  _dewExec$1N = false;
function dew$1N() {
  if (_dewExec$1N) return exports$1O;
  _dewExec$1N = true;
  /**
   * Gets the value at `key` of `object`.
   *
   * @private
   * @param {Object} [object] The object to query.
   * @param {string} key The key of the property to get.
   * @returns {*} Returns the property value.
   */
  function getValue(object, key) {
    return object == null ? undefined : object[key];
  }
  exports$1O = getValue;
  return exports$1O;
}

var exports$1N = {},
  _dewExec$1M = false;
function dew$1M() {
  if (_dewExec$1M) return exports$1N;
  _dewExec$1M = true;
  var baseIsNative = dew$1O(),
    getValue = dew$1N();

  /**
   * Gets the native function at `key` of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {string} key The key of the method to get.
   * @returns {*} Returns the function if it's native, else `undefined`.
   */
  function getNative(object, key) {
    var value = getValue(object, key);
    return baseIsNative(value) ? value : undefined;
  }
  exports$1N = getNative;
  return exports$1N;
}

var exports$1M = {},
  _dewExec$1L = false;
function dew$1L() {
  if (_dewExec$1L) return exports$1M;
  _dewExec$1L = true;
  var getNative = dew$1M();

  /* Built-in method references that are verified to be native. */
  var nativeCreate = getNative(Object, "create");
  exports$1M = nativeCreate;
  return exports$1M;
}

var exports$1L = {},
  _dewExec$1K = false;
var _global$p = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
function dew$1K() {
  if (_dewExec$1K) return exports$1L;
  _dewExec$1K = true;
  var nativeCreate = dew$1L();

  /**
   * Removes all key-value entries from the hash.
   *
   * @private
   * @name clear
   * @memberOf Hash
   */
  function hashClear() {
    (this || _global$p).__data__ = nativeCreate ? nativeCreate(null) : {};
    (this || _global$p).size = 0;
  }
  exports$1L = hashClear;
  return exports$1L;
}

var exports$1K = {},
  _dewExec$1J = false;
var _global$o = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
function dew$1J() {
  if (_dewExec$1J) return exports$1K;
  _dewExec$1J = true;
  /**
   * Removes `key` and its value from the hash.
   *
   * @private
   * @name delete
   * @memberOf Hash
   * @param {Object} hash The hash to modify.
   * @param {string} key The key of the value to remove.
   * @returns {boolean} Returns `true` if the entry was removed, else `false`.
   */
  function hashDelete(key) {
    var result = this.has(key) && delete (this || _global$o).__data__[key];
    (this || _global$o).size -= result ? 1 : 0;
    return result;
  }
  exports$1K = hashDelete;
  return exports$1K;
}

var exports$1J = {},
  _dewExec$1I = false;
var _global$n = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
function dew$1I() {
  if (_dewExec$1I) return exports$1J;
  _dewExec$1I = true;
  var nativeCreate = dew$1L();

  /** Used to stand-in for `undefined` hash values. */
  var HASH_UNDEFINED = "__lodash_hash_undefined__";

  /** Used for built-in method references. */
  var objectProto = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty = objectProto.hasOwnProperty;

  /**
   * Gets the hash value for `key`.
   *
   * @private
   * @name get
   * @memberOf Hash
   * @param {string} key The key of the value to get.
   * @returns {*} Returns the entry value.
   */
  function hashGet(key) {
    var data = (this || _global$n).__data__;
    if (nativeCreate) {
      var result = data[key];
      return result === HASH_UNDEFINED ? undefined : result;
    }
    return hasOwnProperty.call(data, key) ? data[key] : undefined;
  }
  exports$1J = hashGet;
  return exports$1J;
}

var exports$1I = {},
  _dewExec$1H = false;
var _global$m = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
function dew$1H() {
  if (_dewExec$1H) return exports$1I;
  _dewExec$1H = true;
  var nativeCreate = dew$1L();

  /** Used for built-in method references. */
  var objectProto = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty = objectProto.hasOwnProperty;

  /**
   * Checks if a hash value for `key` exists.
   *
   * @private
   * @name has
   * @memberOf Hash
   * @param {string} key The key of the entry to check.
   * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
   */
  function hashHas(key) {
    var data = (this || _global$m).__data__;
    return nativeCreate ? data[key] !== undefined : hasOwnProperty.call(data, key);
  }
  exports$1I = hashHas;
  return exports$1I;
}

var exports$1H = {},
  _dewExec$1G = false;
var _global$l = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
function dew$1G() {
  if (_dewExec$1G) return exports$1H;
  _dewExec$1G = true;
  var nativeCreate = dew$1L();

  /** Used to stand-in for `undefined` hash values. */
  var HASH_UNDEFINED = "__lodash_hash_undefined__";

  /**
   * Sets the hash `key` to `value`.
   *
   * @private
   * @name set
   * @memberOf Hash
   * @param {string} key The key of the value to set.
   * @param {*} value The value to set.
   * @returns {Object} Returns the hash instance.
   */
  function hashSet(key, value) {
    var data = (this || _global$l).__data__;
    (this || _global$l).size += this.has(key) ? 0 : 1;
    data[key] = nativeCreate && value === undefined ? HASH_UNDEFINED : value;
    return this || _global$l;
  }
  exports$1H = hashSet;
  return exports$1H;
}

var exports$1G = {},
  _dewExec$1F = false;
function dew$1F() {
  if (_dewExec$1F) return exports$1G;
  _dewExec$1F = true;
  var hashClear = dew$1K(),
    hashDelete = dew$1J(),
    hashGet = dew$1I(),
    hashHas = dew$1H(),
    hashSet = dew$1G();

  /**
   * Creates a hash object.
   *
   * @private
   * @constructor
   * @param {Array} [entries] The key-value pairs to cache.
   */
  function Hash(entries) {
    var index = -1,
      length = entries == null ? 0 : entries.length;
    this.clear();
    while (++index < length) {
      var entry = entries[index];
      this.set(entry[0], entry[1]);
    }
  }

  // Add methods to `Hash`.
  Hash.prototype.clear = hashClear;
  Hash.prototype["delete"] = hashDelete;
  Hash.prototype.get = hashGet;
  Hash.prototype.has = hashHas;
  Hash.prototype.set = hashSet;
  exports$1G = Hash;
  return exports$1G;
}

var exports$1F = {},
  _dewExec$1E = false;
var _global$k = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
function dew$1E() {
  if (_dewExec$1E) return exports$1F;
  _dewExec$1E = true;
  /**
   * Removes all key-value entries from the list cache.
   *
   * @private
   * @name clear
   * @memberOf ListCache
   */
  function listCacheClear() {
    (this || _global$k).__data__ = [];
    (this || _global$k).size = 0;
  }
  exports$1F = listCacheClear;
  return exports$1F;
}

var exports$1E = {},
  _dewExec$1D = false;
function dew$1D() {
  if (_dewExec$1D) return exports$1E;
  _dewExec$1D = true;
  /**
   * Performs a
   * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
   * comparison between two values to determine if they are equivalent.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to compare.
   * @param {*} other The other value to compare.
   * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
   * @example
   *
   * var object = { 'a': 1 };
   * var other = { 'a': 1 };
   *
   * _.eq(object, object);
   * // => true
   *
   * _.eq(object, other);
   * // => false
   *
   * _.eq('a', 'a');
   * // => true
   *
   * _.eq('a', Object('a'));
   * // => false
   *
   * _.eq(NaN, NaN);
   * // => true
   */
  function eq(value, other) {
    return value === other || value !== value && other !== other;
  }
  exports$1E = eq;
  return exports$1E;
}

var exports$1D = {},
  _dewExec$1C = false;
function dew$1C() {
  if (_dewExec$1C) return exports$1D;
  _dewExec$1C = true;
  var eq = dew$1D();

  /**
   * Gets the index at which the `key` is found in `array` of key-value pairs.
   *
   * @private
   * @param {Array} array The array to inspect.
   * @param {*} key The key to search for.
   * @returns {number} Returns the index of the matched value, else `-1`.
   */
  function assocIndexOf(array, key) {
    var length = array.length;
    while (length--) {
      if (eq(array[length][0], key)) {
        return length;
      }
    }
    return -1;
  }
  exports$1D = assocIndexOf;
  return exports$1D;
}

var exports$1C = {},
  _dewExec$1B = false;
var _global$j = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
function dew$1B() {
  if (_dewExec$1B) return exports$1C;
  _dewExec$1B = true;
  var assocIndexOf = dew$1C();

  /** Used for built-in method references. */
  var arrayProto = Array.prototype;

  /** Built-in value references. */
  var splice = arrayProto.splice;

  /**
   * Removes `key` and its value from the list cache.
   *
   * @private
   * @name delete
   * @memberOf ListCache
   * @param {string} key The key of the value to remove.
   * @returns {boolean} Returns `true` if the entry was removed, else `false`.
   */
  function listCacheDelete(key) {
    var data = (this || _global$j).__data__,
      index = assocIndexOf(data, key);
    if (index < 0) {
      return false;
    }
    var lastIndex = data.length - 1;
    if (index == lastIndex) {
      data.pop();
    } else {
      splice.call(data, index, 1);
    }
    --(this || _global$j).size;
    return true;
  }
  exports$1C = listCacheDelete;
  return exports$1C;
}

var exports$1B = {},
  _dewExec$1A = false;
var _global$i = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
function dew$1A() {
  if (_dewExec$1A) return exports$1B;
  _dewExec$1A = true;
  var assocIndexOf = dew$1C();

  /**
   * Gets the list cache value for `key`.
   *
   * @private
   * @name get
   * @memberOf ListCache
   * @param {string} key The key of the value to get.
   * @returns {*} Returns the entry value.
   */
  function listCacheGet(key) {
    var data = (this || _global$i).__data__,
      index = assocIndexOf(data, key);
    return index < 0 ? undefined : data[index][1];
  }
  exports$1B = listCacheGet;
  return exports$1B;
}

var exports$1A = {},
  _dewExec$1z = false;
var _global$h = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
function dew$1z() {
  if (_dewExec$1z) return exports$1A;
  _dewExec$1z = true;
  var assocIndexOf = dew$1C();

  /**
   * Checks if a list cache value for `key` exists.
   *
   * @private
   * @name has
   * @memberOf ListCache
   * @param {string} key The key of the entry to check.
   * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
   */
  function listCacheHas(key) {
    return assocIndexOf((this || _global$h).__data__, key) > -1;
  }
  exports$1A = listCacheHas;
  return exports$1A;
}

var exports$1z = {},
  _dewExec$1y = false;
var _global$g = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
function dew$1y() {
  if (_dewExec$1y) return exports$1z;
  _dewExec$1y = true;
  var assocIndexOf = dew$1C();

  /**
   * Sets the list cache `key` to `value`.
   *
   * @private
   * @name set
   * @memberOf ListCache
   * @param {string} key The key of the value to set.
   * @param {*} value The value to set.
   * @returns {Object} Returns the list cache instance.
   */
  function listCacheSet(key, value) {
    var data = (this || _global$g).__data__,
      index = assocIndexOf(data, key);
    if (index < 0) {
      ++(this || _global$g).size;
      data.push([key, value]);
    } else {
      data[index][1] = value;
    }
    return this || _global$g;
  }
  exports$1z = listCacheSet;
  return exports$1z;
}

var exports$1y = {},
  _dewExec$1x = false;
function dew$1x() {
  if (_dewExec$1x) return exports$1y;
  _dewExec$1x = true;
  var listCacheClear = dew$1E(),
    listCacheDelete = dew$1B(),
    listCacheGet = dew$1A(),
    listCacheHas = dew$1z(),
    listCacheSet = dew$1y();

  /**
   * Creates an list cache object.
   *
   * @private
   * @constructor
   * @param {Array} [entries] The key-value pairs to cache.
   */
  function ListCache(entries) {
    var index = -1,
      length = entries == null ? 0 : entries.length;
    this.clear();
    while (++index < length) {
      var entry = entries[index];
      this.set(entry[0], entry[1]);
    }
  }

  // Add methods to `ListCache`.
  ListCache.prototype.clear = listCacheClear;
  ListCache.prototype["delete"] = listCacheDelete;
  ListCache.prototype.get = listCacheGet;
  ListCache.prototype.has = listCacheHas;
  ListCache.prototype.set = listCacheSet;
  exports$1y = ListCache;
  return exports$1y;
}

var exports$1x = {},
  _dewExec$1w = false;
function dew$1w() {
  if (_dewExec$1w) return exports$1x;
  _dewExec$1w = true;
  var getNative = dew$1M(),
    root = dew$25();

  /* Built-in method references that are verified to be native. */
  var Map = getNative(root, "Map");
  exports$1x = Map;
  return exports$1x;
}

var exports$1w = {},
  _dewExec$1v = false;
var _global$f = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
function dew$1v() {
  if (_dewExec$1v) return exports$1w;
  _dewExec$1v = true;
  var Hash = dew$1F(),
    ListCache = dew$1x(),
    Map = dew$1w();

  /**
   * Removes all key-value entries from the map.
   *
   * @private
   * @name clear
   * @memberOf MapCache
   */
  function mapCacheClear() {
    (this || _global$f).size = 0;
    (this || _global$f).__data__ = {
      "hash": new Hash(),
      "map": new (Map || ListCache)(),
      "string": new Hash()
    };
  }
  exports$1w = mapCacheClear;
  return exports$1w;
}

var exports$1v = {},
  _dewExec$1u = false;
function dew$1u() {
  if (_dewExec$1u) return exports$1v;
  _dewExec$1u = true;
  /**
   * Checks if `value` is suitable for use as unique object key.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
   */
  function isKeyable(value) {
    var type = typeof value;
    return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value !== "__proto__" : value === null;
  }
  exports$1v = isKeyable;
  return exports$1v;
}

var exports$1u = {},
  _dewExec$1t = false;
function dew$1t() {
  if (_dewExec$1t) return exports$1u;
  _dewExec$1t = true;
  var isKeyable = dew$1u();

  /**
   * Gets the data for `map`.
   *
   * @private
   * @param {Object} map The map to query.
   * @param {string} key The reference key.
   * @returns {*} Returns the map data.
   */
  function getMapData(map, key) {
    var data = map.__data__;
    return isKeyable(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
  }
  exports$1u = getMapData;
  return exports$1u;
}

var exports$1t = {},
  _dewExec$1s = false;
var _global$e = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
function dew$1s() {
  if (_dewExec$1s) return exports$1t;
  _dewExec$1s = true;
  var getMapData = dew$1t();

  /**
   * Removes `key` and its value from the map.
   *
   * @private
   * @name delete
   * @memberOf MapCache
   * @param {string} key The key of the value to remove.
   * @returns {boolean} Returns `true` if the entry was removed, else `false`.
   */
  function mapCacheDelete(key) {
    var result = getMapData(this || _global$e, key)["delete"](key);
    (this || _global$e).size -= result ? 1 : 0;
    return result;
  }
  exports$1t = mapCacheDelete;
  return exports$1t;
}

var exports$1s = {},
  _dewExec$1r = false;
var _global$d = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
function dew$1r() {
  if (_dewExec$1r) return exports$1s;
  _dewExec$1r = true;
  var getMapData = dew$1t();

  /**
   * Gets the map value for `key`.
   *
   * @private
   * @name get
   * @memberOf MapCache
   * @param {string} key The key of the value to get.
   * @returns {*} Returns the entry value.
   */
  function mapCacheGet(key) {
    return getMapData(this || _global$d, key).get(key);
  }
  exports$1s = mapCacheGet;
  return exports$1s;
}

var exports$1r = {},
  _dewExec$1q = false;
var _global$c = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
function dew$1q() {
  if (_dewExec$1q) return exports$1r;
  _dewExec$1q = true;
  var getMapData = dew$1t();

  /**
   * Checks if a map value for `key` exists.
   *
   * @private
   * @name has
   * @memberOf MapCache
   * @param {string} key The key of the entry to check.
   * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
   */
  function mapCacheHas(key) {
    return getMapData(this || _global$c, key).has(key);
  }
  exports$1r = mapCacheHas;
  return exports$1r;
}

var exports$1q = {},
  _dewExec$1p = false;
var _global$b = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
function dew$1p() {
  if (_dewExec$1p) return exports$1q;
  _dewExec$1p = true;
  var getMapData = dew$1t();

  /**
   * Sets the map `key` to `value`.
   *
   * @private
   * @name set
   * @memberOf MapCache
   * @param {string} key The key of the value to set.
   * @param {*} value The value to set.
   * @returns {Object} Returns the map cache instance.
   */
  function mapCacheSet(key, value) {
    var data = getMapData(this || _global$b, key),
      size = data.size;
    data.set(key, value);
    (this || _global$b).size += data.size == size ? 0 : 1;
    return this || _global$b;
  }
  exports$1q = mapCacheSet;
  return exports$1q;
}

var exports$1p = {},
  _dewExec$1o = false;
function dew$1o() {
  if (_dewExec$1o) return exports$1p;
  _dewExec$1o = true;
  var mapCacheClear = dew$1v(),
    mapCacheDelete = dew$1s(),
    mapCacheGet = dew$1r(),
    mapCacheHas = dew$1q(),
    mapCacheSet = dew$1p();

  /**
   * Creates a map cache object to store key-value pairs.
   *
   * @private
   * @constructor
   * @param {Array} [entries] The key-value pairs to cache.
   */
  function MapCache(entries) {
    var index = -1,
      length = entries == null ? 0 : entries.length;
    this.clear();
    while (++index < length) {
      var entry = entries[index];
      this.set(entry[0], entry[1]);
    }
  }

  // Add methods to `MapCache`.
  MapCache.prototype.clear = mapCacheClear;
  MapCache.prototype["delete"] = mapCacheDelete;
  MapCache.prototype.get = mapCacheGet;
  MapCache.prototype.has = mapCacheHas;
  MapCache.prototype.set = mapCacheSet;
  exports$1p = MapCache;
  return exports$1p;
}

var exports$1o = {},
  _dewExec$1n = false;
var _global$a = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
function dew$1n() {
  if (_dewExec$1n) return exports$1o;
  _dewExec$1n = true;
  var MapCache = dew$1o();

  /** Error message constants. */
  var FUNC_ERROR_TEXT = "Expected a function";

  /**
   * Creates a function that memoizes the result of `func`. If `resolver` is
   * provided, it determines the cache key for storing the result based on the
   * arguments provided to the memoized function. By default, the first argument
   * provided to the memoized function is used as the map cache key. The `func`
   * is invoked with the `this` binding of the memoized function.
   *
   * **Note:** The cache is exposed as the `cache` property on the memoized
   * function. Its creation may be customized by replacing the `_.memoize.Cache`
   * constructor with one whose instances implement the
   * [`Map`](http://ecma-international.org/ecma-262/7.0/#sec-properties-of-the-map-prototype-object)
   * method interface of `clear`, `delete`, `get`, `has`, and `set`.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Function
   * @param {Function} func The function to have its output memoized.
   * @param {Function} [resolver] The function to resolve the cache key.
   * @returns {Function} Returns the new memoized function.
   * @example
   *
   * var object = { 'a': 1, 'b': 2 };
   * var other = { 'c': 3, 'd': 4 };
   *
   * var values = _.memoize(_.values);
   * values(object);
   * // => [1, 2]
   *
   * values(other);
   * // => [3, 4]
   *
   * object.a = 2;
   * values(object);
   * // => [1, 2]
   *
   * // Modify the result cache.
   * values.cache.set(object, ['a', 'b']);
   * values(object);
   * // => ['a', 'b']
   *
   * // Replace `_.memoize.Cache`.
   * _.memoize.Cache = WeakMap;
   */
  function memoize(func, resolver) {
    if (typeof func != "function" || resolver != null && typeof resolver != "function") {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    var memoized = function () {
      var args = arguments,
        key = resolver ? resolver.apply(this || _global$a, args) : args[0],
        cache = memoized.cache;
      if (cache.has(key)) {
        return cache.get(key);
      }
      var result = func.apply(this || _global$a, args);
      memoized.cache = cache.set(key, result) || cache;
      return result;
    };
    memoized.cache = new (memoize.Cache || MapCache)();
    return memoized;
  }

  // Expose `MapCache`.
  memoize.Cache = MapCache;
  exports$1o = memoize;
  return exports$1o;
}

var exports$1n = {},
  _dewExec$1m = false;
function dew$1m() {
  if (_dewExec$1m) return exports$1n;
  _dewExec$1m = true;
  var memoize = dew$1n();

  /** Used as the maximum memoize cache size. */
  var MAX_MEMOIZE_SIZE = 500;

  /**
   * A specialized version of `_.memoize` which clears the memoized function's
   * cache when it exceeds `MAX_MEMOIZE_SIZE`.
   *
   * @private
   * @param {Function} func The function to have its output memoized.
   * @returns {Function} Returns the new memoized function.
   */
  function memoizeCapped(func) {
    var result = memoize(func, function (key) {
      if (cache.size === MAX_MEMOIZE_SIZE) {
        cache.clear();
      }
      return key;
    });
    var cache = result.cache;
    return result;
  }
  exports$1n = memoizeCapped;
  return exports$1n;
}

var exports$1m = {},
  _dewExec$1l = false;
function dew$1l() {
  if (_dewExec$1l) return exports$1m;
  _dewExec$1l = true;
  var memoizeCapped = dew$1m();

  /** Used to match property names within property paths. */
  var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;

  /** Used to match backslashes in property paths. */
  var reEscapeChar = /\\(\\)?/g;

  /**
   * Converts `string` to a property path array.
   *
   * @private
   * @param {string} string The string to convert.
   * @returns {Array} Returns the property path array.
   */
  var stringToPath = memoizeCapped(function (string) {
    var result = [];
    if (string.charCodeAt(0) === 46 /* . */) {
      result.push("");
    }
    string.replace(rePropName, function (match, number, quote, subString) {
      result.push(quote ? subString.replace(reEscapeChar, "$1") : number || match);
    });
    return result;
  });
  exports$1m = stringToPath;
  return exports$1m;
}

var exports$1l = {},
  _dewExec$1k = false;
function dew$1k() {
  if (_dewExec$1k) return exports$1l;
  _dewExec$1k = true;
  var Symbol = dew$24(),
    arrayMap = dew$1W(),
    isArray = dew$1Z(),
    isSymbol = dew$1V();

  /** Used as references for various `Number` constants. */
  var INFINITY = 1 / 0;

  /** Used to convert symbols to primitives and strings. */
  var symbolProto = Symbol ? Symbol.prototype : undefined,
    symbolToString = symbolProto ? symbolProto.toString : undefined;

  /**
   * The base implementation of `_.toString` which doesn't convert nullish
   * values to empty strings.
   *
   * @private
   * @param {*} value The value to process.
   * @returns {string} Returns the string.
   */
  function baseToString(value) {
    // Exit early for strings to avoid a performance hit in some environments.
    if (typeof value == "string") {
      return value;
    }
    if (isArray(value)) {
      // Recursively convert values (susceptible to call stack limits).
      return arrayMap(value, baseToString) + "";
    }
    if (isSymbol(value)) {
      return symbolToString ? symbolToString.call(value) : "";
    }
    var result = value + "";
    return result == "0" && 1 / value == -INFINITY ? "-0" : result;
  }
  exports$1l = baseToString;
  return exports$1l;
}

var exports$1k = {},
  _dewExec$1j = false;
function dew$1j() {
  if (_dewExec$1j) return exports$1k;
  _dewExec$1j = true;
  var baseToString = dew$1k();

  /**
   * Converts `value` to a string. An empty string is returned for `null`
   * and `undefined` values. The sign of `-0` is preserved.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to convert.
   * @returns {string} Returns the converted string.
   * @example
   *
   * _.toString(null);
   * // => ''
   *
   * _.toString(-0);
   * // => '-0'
   *
   * _.toString([1, 2, 3]);
   * // => '1,2,3'
   */
  function toString(value) {
    return value == null ? "" : baseToString(value);
  }
  exports$1k = toString;
  return exports$1k;
}

var exports$1j = {},
  _dewExec$1i = false;
function dew$1i() {
  if (_dewExec$1i) return exports$1j;
  _dewExec$1i = true;
  var isArray = dew$1Z(),
    isKey = dew$1U(),
    stringToPath = dew$1l(),
    toString = dew$1j();

  /**
   * Casts `value` to a path array if it's not one.
   *
   * @private
   * @param {*} value The value to inspect.
   * @param {Object} [object] The object to query keys on.
   * @returns {Array} Returns the cast property path array.
   */
  function castPath(value, object) {
    if (isArray(value)) {
      return value;
    }
    return isKey(value, object) ? [value] : stringToPath(toString(value));
  }
  exports$1j = castPath;
  return exports$1j;
}

var exports$1i = {},
  _dewExec$1h = false;
function dew$1h() {
  if (_dewExec$1h) return exports$1i;
  _dewExec$1h = true;
  var isSymbol = dew$1V();

  /** Used as references for various `Number` constants. */
  var INFINITY = 1 / 0;

  /**
   * Converts `value` to a string key if it's not a string or symbol.
   *
   * @private
   * @param {*} value The value to inspect.
   * @returns {string|symbol} Returns the key.
   */
  function toKey(value) {
    if (typeof value == "string" || isSymbol(value)) {
      return value;
    }
    var result = value + "";
    return result == "0" && 1 / value == -INFINITY ? "-0" : result;
  }
  exports$1i = toKey;
  return exports$1i;
}

var exports$1h = {},
  _dewExec$1g = false;
function dew$1g() {
  if (_dewExec$1g) return exports$1h;
  _dewExec$1g = true;
  var castPath = dew$1i(),
    toKey = dew$1h();

  /**
   * The base implementation of `_.get` without support for default values.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {Array|string} path The path of the property to get.
   * @returns {*} Returns the resolved value.
   */
  function baseGet(object, path) {
    path = castPath(path, object);
    var index = 0,
      length = path.length;
    while (object != null && index < length) {
      object = object[toKey(path[index++])];
    }
    return index && index == length ? object : undefined;
  }
  exports$1h = baseGet;
  return exports$1h;
}

var exports$1g = {},
  _dewExec$1f = false;
var _global$9 = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
function dew$1f() {
  if (_dewExec$1f) return exports$1g;
  _dewExec$1f = true;
  var ListCache = dew$1x();

  /**
   * Removes all key-value entries from the stack.
   *
   * @private
   * @name clear
   * @memberOf Stack
   */
  function stackClear() {
    (this || _global$9).__data__ = new ListCache();
    (this || _global$9).size = 0;
  }
  exports$1g = stackClear;
  return exports$1g;
}

var exports$1f = {},
  _dewExec$1e = false;
var _global$8 = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
function dew$1e() {
  if (_dewExec$1e) return exports$1f;
  _dewExec$1e = true;
  /**
   * Removes `key` and its value from the stack.
   *
   * @private
   * @name delete
   * @memberOf Stack
   * @param {string} key The key of the value to remove.
   * @returns {boolean} Returns `true` if the entry was removed, else `false`.
   */
  function stackDelete(key) {
    var data = (this || _global$8).__data__,
      result = data["delete"](key);
    (this || _global$8).size = data.size;
    return result;
  }
  exports$1f = stackDelete;
  return exports$1f;
}

var exports$1e = {},
  _dewExec$1d = false;
var _global$7 = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
function dew$1d() {
  if (_dewExec$1d) return exports$1e;
  _dewExec$1d = true;
  /**
   * Gets the stack value for `key`.
   *
   * @private
   * @name get
   * @memberOf Stack
   * @param {string} key The key of the value to get.
   * @returns {*} Returns the entry value.
   */
  function stackGet(key) {
    return (this || _global$7).__data__.get(key);
  }
  exports$1e = stackGet;
  return exports$1e;
}

var exports$1d = {},
  _dewExec$1c = false;
var _global$6 = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
function dew$1c() {
  if (_dewExec$1c) return exports$1d;
  _dewExec$1c = true;
  /**
   * Checks if a stack value for `key` exists.
   *
   * @private
   * @name has
   * @memberOf Stack
   * @param {string} key The key of the entry to check.
   * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
   */
  function stackHas(key) {
    return (this || _global$6).__data__.has(key);
  }
  exports$1d = stackHas;
  return exports$1d;
}

var exports$1c = {},
  _dewExec$1b = false;
var _global$5 = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
function dew$1b() {
  if (_dewExec$1b) return exports$1c;
  _dewExec$1b = true;
  var ListCache = dew$1x(),
    Map = dew$1w(),
    MapCache = dew$1o();

  /** Used as the size to enable large array optimizations. */
  var LARGE_ARRAY_SIZE = 200;

  /**
   * Sets the stack `key` to `value`.
   *
   * @private
   * @name set
   * @memberOf Stack
   * @param {string} key The key of the value to set.
   * @param {*} value The value to set.
   * @returns {Object} Returns the stack cache instance.
   */
  function stackSet(key, value) {
    var data = (this || _global$5).__data__;
    if (data instanceof ListCache) {
      var pairs = data.__data__;
      if (!Map || pairs.length < LARGE_ARRAY_SIZE - 1) {
        pairs.push([key, value]);
        (this || _global$5).size = ++data.size;
        return this || _global$5;
      }
      data = (this || _global$5).__data__ = new MapCache(pairs);
    }
    data.set(key, value);
    (this || _global$5).size = data.size;
    return this || _global$5;
  }
  exports$1c = stackSet;
  return exports$1c;
}

var exports$1b = {},
  _dewExec$1a = false;
var _global$4 = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
function dew$1a() {
  if (_dewExec$1a) return exports$1b;
  _dewExec$1a = true;
  var ListCache = dew$1x(),
    stackClear = dew$1f(),
    stackDelete = dew$1e(),
    stackGet = dew$1d(),
    stackHas = dew$1c(),
    stackSet = dew$1b();

  /**
   * Creates a stack cache object to store key-value pairs.
   *
   * @private
   * @constructor
   * @param {Array} [entries] The key-value pairs to cache.
   */
  function Stack(entries) {
    var data = (this || _global$4).__data__ = new ListCache(entries);
    (this || _global$4).size = data.size;
  }

  // Add methods to `Stack`.
  Stack.prototype.clear = stackClear;
  Stack.prototype["delete"] = stackDelete;
  Stack.prototype.get = stackGet;
  Stack.prototype.has = stackHas;
  Stack.prototype.set = stackSet;
  exports$1b = Stack;
  return exports$1b;
}

var exports$1a = {},
  _dewExec$19 = false;
var _global$3 = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
function dew$19() {
  if (_dewExec$19) return exports$1a;
  _dewExec$19 = true;
  /** Used to stand-in for `undefined` hash values. */
  var HASH_UNDEFINED = "__lodash_hash_undefined__";

  /**
   * Adds `value` to the array cache.
   *
   * @private
   * @name add
   * @memberOf SetCache
   * @alias push
   * @param {*} value The value to cache.
   * @returns {Object} Returns the cache instance.
   */
  function setCacheAdd(value) {
    (this || _global$3).__data__.set(value, HASH_UNDEFINED);
    return this || _global$3;
  }
  exports$1a = setCacheAdd;
  return exports$1a;
}

var exports$19 = {},
  _dewExec$18 = false;
var _global$2 = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
function dew$18() {
  if (_dewExec$18) return exports$19;
  _dewExec$18 = true;
  /**
   * Checks if `value` is in the array cache.
   *
   * @private
   * @name has
   * @memberOf SetCache
   * @param {*} value The value to search for.
   * @returns {number} Returns `true` if `value` is found, else `false`.
   */
  function setCacheHas(value) {
    return (this || _global$2).__data__.has(value);
  }
  exports$19 = setCacheHas;
  return exports$19;
}

var exports$18 = {},
  _dewExec$17 = false;
var _global$1 = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
function dew$17() {
  if (_dewExec$17) return exports$18;
  _dewExec$17 = true;
  var MapCache = dew$1o(),
    setCacheAdd = dew$19(),
    setCacheHas = dew$18();

  /**
   *
   * Creates an array cache object to store unique values.
   *
   * @private
   * @constructor
   * @param {Array} [values] The values to cache.
   */
  function SetCache(values) {
    var index = -1,
      length = values == null ? 0 : values.length;
    (this || _global$1).__data__ = new MapCache();
    while (++index < length) {
      this.add(values[index]);
    }
  }

  // Add methods to `SetCache`.
  SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
  SetCache.prototype.has = setCacheHas;
  exports$18 = SetCache;
  return exports$18;
}

var exports$17 = {},
  _dewExec$16 = false;
function dew$16() {
  if (_dewExec$16) return exports$17;
  _dewExec$16 = true;
  /**
   * A specialized version of `_.some` for arrays without support for iteratee
   * shorthands.
   *
   * @private
   * @param {Array} [array] The array to iterate over.
   * @param {Function} predicate The function invoked per iteration.
   * @returns {boolean} Returns `true` if any element passes the predicate check,
   *  else `false`.
   */
  function arraySome(array, predicate) {
    var index = -1,
      length = array == null ? 0 : array.length;
    while (++index < length) {
      if (predicate(array[index], index, array)) {
        return true;
      }
    }
    return false;
  }
  exports$17 = arraySome;
  return exports$17;
}

var exports$16 = {},
  _dewExec$15 = false;
function dew$15() {
  if (_dewExec$15) return exports$16;
  _dewExec$15 = true;
  /**
   * Checks if a `cache` value for `key` exists.
   *
   * @private
   * @param {Object} cache The cache to query.
   * @param {string} key The key of the entry to check.
   * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
   */
  function cacheHas(cache, key) {
    return cache.has(key);
  }
  exports$16 = cacheHas;
  return exports$16;
}

var exports$15 = {},
  _dewExec$14 = false;
function dew$14() {
  if (_dewExec$14) return exports$15;
  _dewExec$14 = true;
  var SetCache = dew$17(),
    arraySome = dew$16(),
    cacheHas = dew$15();

  /** Used to compose bitmasks for value comparisons. */
  var COMPARE_PARTIAL_FLAG = 1,
    COMPARE_UNORDERED_FLAG = 2;

  /**
   * A specialized version of `baseIsEqualDeep` for arrays with support for
   * partial deep comparisons.
   *
   * @private
   * @param {Array} array The array to compare.
   * @param {Array} other The other array to compare.
   * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
   * @param {Function} customizer The function to customize comparisons.
   * @param {Function} equalFunc The function to determine equivalents of values.
   * @param {Object} stack Tracks traversed `array` and `other` objects.
   * @returns {boolean} Returns `true` if the arrays are equivalent, else `false`.
   */
  function equalArrays(array, other, bitmask, customizer, equalFunc, stack) {
    var isPartial = bitmask & COMPARE_PARTIAL_FLAG,
      arrLength = array.length,
      othLength = other.length;
    if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
      return false;
    }
    // Check that cyclic values are equal.
    var arrStacked = stack.get(array);
    var othStacked = stack.get(other);
    if (arrStacked && othStacked) {
      return arrStacked == other && othStacked == array;
    }
    var index = -1,
      result = true,
      seen = bitmask & COMPARE_UNORDERED_FLAG ? new SetCache() : undefined;
    stack.set(array, other);
    stack.set(other, array);

    // Ignore non-index properties.
    while (++index < arrLength) {
      var arrValue = array[index],
        othValue = other[index];
      if (customizer) {
        var compared = isPartial ? customizer(othValue, arrValue, index, other, array, stack) : customizer(arrValue, othValue, index, array, other, stack);
      }
      if (compared !== undefined) {
        if (compared) {
          continue;
        }
        result = false;
        break;
      }
      // Recursively compare arrays (susceptible to call stack limits).
      if (seen) {
        if (!arraySome(other, function (othValue, othIndex) {
          if (!cacheHas(seen, othIndex) && (arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
            return seen.push(othIndex);
          }
        })) {
          result = false;
          break;
        }
      } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
        result = false;
        break;
      }
    }
    stack["delete"](array);
    stack["delete"](other);
    return result;
  }
  exports$15 = equalArrays;
  return exports$15;
}

var exports$14 = {},
  _dewExec$13 = false;
function dew$13() {
  if (_dewExec$13) return exports$14;
  _dewExec$13 = true;
  var root = dew$25();

  /** Built-in value references. */
  var Uint8Array = root.Uint8Array;
  exports$14 = Uint8Array;
  return exports$14;
}

var exports$13 = {},
  _dewExec$12 = false;
function dew$12() {
  if (_dewExec$12) return exports$13;
  _dewExec$12 = true;
  /**
   * Converts `map` to its key-value pairs.
   *
   * @private
   * @param {Object} map The map to convert.
   * @returns {Array} Returns the key-value pairs.
   */
  function mapToArray(map) {
    var index = -1,
      result = Array(map.size);
    map.forEach(function (value, key) {
      result[++index] = [key, value];
    });
    return result;
  }
  exports$13 = mapToArray;
  return exports$13;
}

var exports$12 = {},
  _dewExec$11 = false;
function dew$11() {
  if (_dewExec$11) return exports$12;
  _dewExec$11 = true;
  /**
   * Converts `set` to an array of its values.
   *
   * @private
   * @param {Object} set The set to convert.
   * @returns {Array} Returns the values.
   */
  function setToArray(set) {
    var index = -1,
      result = Array(set.size);
    set.forEach(function (value) {
      result[++index] = value;
    });
    return result;
  }
  exports$12 = setToArray;
  return exports$12;
}

var exports$11 = {},
  _dewExec$10 = false;
function dew$10() {
  if (_dewExec$10) return exports$11;
  _dewExec$10 = true;
  var Symbol = dew$24(),
    Uint8Array = dew$13(),
    eq = dew$1D(),
    equalArrays = dew$14(),
    mapToArray = dew$12(),
    setToArray = dew$11();

  /** Used to compose bitmasks for value comparisons. */
  var COMPARE_PARTIAL_FLAG = 1,
    COMPARE_UNORDERED_FLAG = 2;

  /** `Object#toString` result references. */
  var boolTag = "[object Boolean]",
    dateTag = "[object Date]",
    errorTag = "[object Error]",
    mapTag = "[object Map]",
    numberTag = "[object Number]",
    regexpTag = "[object RegExp]",
    setTag = "[object Set]",
    stringTag = "[object String]",
    symbolTag = "[object Symbol]";
  var arrayBufferTag = "[object ArrayBuffer]",
    dataViewTag = "[object DataView]";

  /** Used to convert symbols to primitives and strings. */
  var symbolProto = Symbol ? Symbol.prototype : undefined,
    symbolValueOf = symbolProto ? symbolProto.valueOf : undefined;

  /**
   * A specialized version of `baseIsEqualDeep` for comparing objects of
   * the same `toStringTag`.
   *
   * **Note:** This function only supports comparing values with tags of
   * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
   *
   * @private
   * @param {Object} object The object to compare.
   * @param {Object} other The other object to compare.
   * @param {string} tag The `toStringTag` of the objects to compare.
   * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
   * @param {Function} customizer The function to customize comparisons.
   * @param {Function} equalFunc The function to determine equivalents of values.
   * @param {Object} stack Tracks traversed `object` and `other` objects.
   * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
   */
  function equalByTag(object, other, tag, bitmask, customizer, equalFunc, stack) {
    switch (tag) {
      case dataViewTag:
        if (object.byteLength != other.byteLength || object.byteOffset != other.byteOffset) {
          return false;
        }
        object = object.buffer;
        other = other.buffer;
      case arrayBufferTag:
        if (object.byteLength != other.byteLength || !equalFunc(new Uint8Array(object), new Uint8Array(other))) {
          return false;
        }
        return true;
      case boolTag:
      case dateTag:
      case numberTag:
        // Coerce booleans to `1` or `0` and dates to milliseconds.
        // Invalid dates are coerced to `NaN`.
        return eq(+object, +other);
      case errorTag:
        return object.name == other.name && object.message == other.message;
      case regexpTag:
      case stringTag:
        // Coerce regexes to strings and treat strings, primitives and objects,
        // as equal. See http://www.ecma-international.org/ecma-262/7.0/#sec-regexp.prototype.tostring
        // for more details.
        return object == other + "";
      case mapTag:
        var convert = mapToArray;
      case setTag:
        var isPartial = bitmask & COMPARE_PARTIAL_FLAG;
        convert || (convert = setToArray);
        if (object.size != other.size && !isPartial) {
          return false;
        }
        // Assume cyclic values are equal.
        var stacked = stack.get(object);
        if (stacked) {
          return stacked == other;
        }
        bitmask |= COMPARE_UNORDERED_FLAG;

        // Recursively compare objects (susceptible to call stack limits).
        stack.set(object, other);
        var result = equalArrays(convert(object), convert(other), bitmask, customizer, equalFunc, stack);
        stack["delete"](object);
        return result;
      case symbolTag:
        if (symbolValueOf) {
          return symbolValueOf.call(object) == symbolValueOf.call(other);
        }
    }
    return false;
  }
  exports$11 = equalByTag;
  return exports$11;
}

var exports$10 = {},
  _dewExec$$ = false;
function dew$$() {
  if (_dewExec$$) return exports$10;
  _dewExec$$ = true;
  var arrayPush = dew$27(),
    isArray = dew$1Z();

  /**
   * The base implementation of `getAllKeys` and `getAllKeysIn` which uses
   * `keysFunc` and `symbolsFunc` to get the enumerable property names and
   * symbols of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {Function} keysFunc The function to get the keys of `object`.
   * @param {Function} symbolsFunc The function to get the symbols of `object`.
   * @returns {Array} Returns the array of property names and symbols.
   */
  function baseGetAllKeys(object, keysFunc, symbolsFunc) {
    var result = keysFunc(object);
    return isArray(object) ? result : arrayPush(result, symbolsFunc(object));
  }
  exports$10 = baseGetAllKeys;
  return exports$10;
}

var exports$$ = {},
  _dewExec$_ = false;
function dew$_() {
  if (_dewExec$_) return exports$$;
  _dewExec$_ = true;
  /**
   * A specialized version of `_.filter` for arrays without support for
   * iteratee shorthands.
   *
   * @private
   * @param {Array} [array] The array to iterate over.
   * @param {Function} predicate The function invoked per iteration.
   * @returns {Array} Returns the new filtered array.
   */
  function arrayFilter(array, predicate) {
    var index = -1,
      length = array == null ? 0 : array.length,
      resIndex = 0,
      result = [];
    while (++index < length) {
      var value = array[index];
      if (predicate(value, index, array)) {
        result[resIndex++] = value;
      }
    }
    return result;
  }
  exports$$ = arrayFilter;
  return exports$$;
}

var exports$_ = {},
  _dewExec$Z = false;
function dew$Z() {
  if (_dewExec$Z) return exports$_;
  _dewExec$Z = true;
  /**
   * This method returns a new empty array.
   *
   * @static
   * @memberOf _
   * @since 4.13.0
   * @category Util
   * @returns {Array} Returns the new empty array.
   * @example
   *
   * var arrays = _.times(2, _.stubArray);
   *
   * console.log(arrays);
   * // => [[], []]
   *
   * console.log(arrays[0] === arrays[1]);
   * // => false
   */
  function stubArray() {
    return [];
  }
  exports$_ = stubArray;
  return exports$_;
}

var exports$Z = {},
  _dewExec$Y = false;
function dew$Y() {
  if (_dewExec$Y) return exports$Z;
  _dewExec$Y = true;
  var arrayFilter = dew$_(),
    stubArray = dew$Z();

  /** Used for built-in method references. */
  var objectProto = Object.prototype;

  /** Built-in value references. */
  var propertyIsEnumerable = objectProto.propertyIsEnumerable;

  /* Built-in method references for those with the same name as other `lodash` methods. */
  var nativeGetSymbols = Object.getOwnPropertySymbols;

  /**
   * Creates an array of the own enumerable symbols of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of symbols.
   */
  var getSymbols = !nativeGetSymbols ? stubArray : function (object) {
    if (object == null) {
      return [];
    }
    object = Object(object);
    return arrayFilter(nativeGetSymbols(object), function (symbol) {
      return propertyIsEnumerable.call(object, symbol);
    });
  };
  exports$Z = getSymbols;
  return exports$Z;
}

var exports$Y = {},
  _dewExec$X = false;
function dew$X() {
  if (_dewExec$X) return exports$Y;
  _dewExec$X = true;
  /**
   * The base implementation of `_.times` without support for iteratee shorthands
   * or max array length checks.
   *
   * @private
   * @param {number} n The number of times to invoke `iteratee`.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns the array of results.
   */
  function baseTimes(n, iteratee) {
    var index = -1,
      result = Array(n);
    while (++index < n) {
      result[index] = iteratee(index);
    }
    return result;
  }
  exports$Y = baseTimes;
  return exports$Y;
}

var exports$X = {},
  _dewExec$W = false;
function dew$W() {
  if (_dewExec$W) return exports$X;
  _dewExec$W = true;
  /**
   * This method returns `false`.
   *
   * @static
   * @memberOf _
   * @since 4.13.0
   * @category Util
   * @returns {boolean} Returns `false`.
   * @example
   *
   * _.times(2, _.stubFalse);
   * // => [false, false]
   */
  function stubFalse() {
    return false;
  }
  exports$X = stubFalse;
  return exports$X;
}

var exports$W = {},
  _dewExec$V = false;
var module$1 = {
  exports: exports$W
};
function dew$V() {
  if (_dewExec$V) return module$1.exports;
  _dewExec$V = true;
  var root = dew$25(),
    stubFalse = dew$W();

  /** Detect free variable `exports`. */
  var freeExports = exports$W && !exports$W.nodeType && exports$W;

  /** Detect free variable `module`. */
  var freeModule = freeExports && true && module$1 && !module$1.nodeType && module$1;

  /** Detect the popular CommonJS extension `module.exports`. */
  var moduleExports = freeModule && freeModule.exports === freeExports;

  /** Built-in value references. */
  var Buffer = moduleExports ? root.Buffer : undefined;

  /* Built-in method references for those with the same name as other `lodash` methods. */
  var nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined;

  /**
   * Checks if `value` is a buffer.
   *
   * @static
   * @memberOf _
   * @since 4.3.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
   * @example
   *
   * _.isBuffer(new Buffer(2));
   * // => true
   *
   * _.isBuffer(new Uint8Array(2));
   * // => false
   */
  var isBuffer = nativeIsBuffer || stubFalse;
  module$1.exports = isBuffer;
  return module$1.exports;
}

var exports$V = {},
  _dewExec$U = false;
function dew$U() {
  if (_dewExec$U) return exports$V;
  _dewExec$U = true;
  /** Used as references for various `Number` constants. */
  var MAX_SAFE_INTEGER = 9007199254740991;

  /** Used to detect unsigned integer values. */
  var reIsUint = /^(?:0|[1-9]\d*)$/;

  /**
   * Checks if `value` is a valid array-like index.
   *
   * @private
   * @param {*} value The value to check.
   * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
   * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
   */
  function isIndex(value, length) {
    var type = typeof value;
    length = length == null ? MAX_SAFE_INTEGER : length;
    return !!length && (type == "number" || type != "symbol" && reIsUint.test(value)) && value > -1 && value % 1 == 0 && value < length;
  }
  exports$V = isIndex;
  return exports$V;
}

var exports$U = {},
  _dewExec$T = false;
function dew$T() {
  if (_dewExec$T) return exports$U;
  _dewExec$T = true;
  /** Used as references for various `Number` constants. */
  var MAX_SAFE_INTEGER = 9007199254740991;

  /**
   * Checks if `value` is a valid array-like length.
   *
   * **Note:** This method is loosely based on
   * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
   * @example
   *
   * _.isLength(3);
   * // => true
   *
   * _.isLength(Number.MIN_VALUE);
   * // => false
   *
   * _.isLength(Infinity);
   * // => false
   *
   * _.isLength('3');
   * // => false
   */
  function isLength(value) {
    return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
  }
  exports$U = isLength;
  return exports$U;
}

var exports$T = {},
  _dewExec$S = false;
function dew$S() {
  if (_dewExec$S) return exports$T;
  _dewExec$S = true;
  var baseGetTag = dew$21(),
    isLength = dew$T(),
    isObjectLike = dew$20();

  /** `Object#toString` result references. */
  var argsTag = "[object Arguments]",
    arrayTag = "[object Array]",
    boolTag = "[object Boolean]",
    dateTag = "[object Date]",
    errorTag = "[object Error]",
    funcTag = "[object Function]",
    mapTag = "[object Map]",
    numberTag = "[object Number]",
    objectTag = "[object Object]",
    regexpTag = "[object RegExp]",
    setTag = "[object Set]",
    stringTag = "[object String]",
    weakMapTag = "[object WeakMap]";
  var arrayBufferTag = "[object ArrayBuffer]",
    dataViewTag = "[object DataView]",
    float32Tag = "[object Float32Array]",
    float64Tag = "[object Float64Array]",
    int8Tag = "[object Int8Array]",
    int16Tag = "[object Int16Array]",
    int32Tag = "[object Int32Array]",
    uint8Tag = "[object Uint8Array]",
    uint8ClampedTag = "[object Uint8ClampedArray]",
    uint16Tag = "[object Uint16Array]",
    uint32Tag = "[object Uint32Array]";

  /** Used to identify `toStringTag` values of typed arrays. */
  var typedArrayTags = {};
  typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = true;
  typedArrayTags[argsTag] = typedArrayTags[arrayTag] = typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] = typedArrayTags[dataViewTag] = typedArrayTags[dateTag] = typedArrayTags[errorTag] = typedArrayTags[funcTag] = typedArrayTags[mapTag] = typedArrayTags[numberTag] = typedArrayTags[objectTag] = typedArrayTags[regexpTag] = typedArrayTags[setTag] = typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;

  /**
   * The base implementation of `_.isTypedArray` without Node.js optimizations.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
   */
  function baseIsTypedArray(value) {
    return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
  }
  exports$T = baseIsTypedArray;
  return exports$T;
}

var exports$S = {},
  _dewExec$R = false;
function dew$R() {
  if (_dewExec$R) return exports$S;
  _dewExec$R = true;
  /**
   * The base implementation of `_.unary` without support for storing metadata.
   *
   * @private
   * @param {Function} func The function to cap arguments for.
   * @returns {Function} Returns the new capped function.
   */
  function baseUnary(func) {
    return function (value) {
      return func(value);
    };
  }
  exports$S = baseUnary;
  return exports$S;
}

var exports$R = {},
  _dewExec$Q = false;
var module = {
  exports: exports$R
};
function dew$Q() {
  if (_dewExec$Q) return module.exports;
  _dewExec$Q = true;
  var freeGlobal = dew$26();

  /** Detect free variable `exports`. */
  var freeExports = exports$R && !exports$R.nodeType && exports$R;

  /** Detect free variable `module`. */
  var freeModule = freeExports && true && module && !module.nodeType && module;

  /** Detect the popular CommonJS extension `module.exports`. */
  var moduleExports = freeModule && freeModule.exports === freeExports;

  /** Detect free variable `process` from Node.js. */
  var freeProcess = moduleExports && freeGlobal.process;

  /** Used to access faster Node.js helpers. */
  var nodeUtil = function () {
    try {
      // Use `util.types` for Node.js 10+.
      var types = freeModule && freeModule.require && freeModule.require("util").types;
      if (types) {
        return types;
      }

      // Legacy `process.binding('util')` for Node.js < 10.
      return freeProcess && freeProcess.binding && freeProcess.binding("util");
    } catch (e) {}
  }();
  module.exports = nodeUtil;
  return module.exports;
}

var exports$Q = {},
  _dewExec$P = false;
function dew$P() {
  if (_dewExec$P) return exports$Q;
  _dewExec$P = true;
  var baseIsTypedArray = dew$S(),
    baseUnary = dew$R(),
    nodeUtil = dew$Q();

  /* Node.js helper references. */
  var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;

  /**
   * Checks if `value` is classified as a typed array.
   *
   * @static
   * @memberOf _
   * @since 3.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
   * @example
   *
   * _.isTypedArray(new Uint8Array);
   * // => true
   *
   * _.isTypedArray([]);
   * // => false
   */
  var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;
  exports$Q = isTypedArray;
  return exports$Q;
}

var exports$P = {},
  _dewExec$O = false;
function dew$O() {
  if (_dewExec$O) return exports$P;
  _dewExec$O = true;
  var baseTimes = dew$X(),
    isArguments = dew$1_(),
    isArray = dew$1Z(),
    isBuffer = dew$V(),
    isIndex = dew$U(),
    isTypedArray = dew$P();

  /** Used for built-in method references. */
  var objectProto = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty = objectProto.hasOwnProperty;

  /**
   * Creates an array of the enumerable property names of the array-like `value`.
   *
   * @private
   * @param {*} value The value to query.
   * @param {boolean} inherited Specify returning inherited property names.
   * @returns {Array} Returns the array of property names.
   */
  function arrayLikeKeys(value, inherited) {
    var isArr = isArray(value),
      isArg = !isArr && isArguments(value),
      isBuff = !isArr && !isArg && isBuffer(value),
      isType = !isArr && !isArg && !isBuff && isTypedArray(value),
      skipIndexes = isArr || isArg || isBuff || isType,
      result = skipIndexes ? baseTimes(value.length, String) : [],
      length = result.length;
    for (var key in value) {
      if ((inherited || hasOwnProperty.call(value, key)) && !(skipIndexes && (
      // Safari 9 has enumerable `arguments.length` in strict mode.
      key == "length" ||
      // Node.js 0.10 has enumerable non-index properties on buffers.
      isBuff && (key == "offset" || key == "parent") ||
      // PhantomJS 2 has enumerable non-index properties on typed arrays.
      isType && (key == "buffer" || key == "byteLength" || key == "byteOffset") ||
      // Skip index properties.
      isIndex(key, length)))) {
        result.push(key);
      }
    }
    return result;
  }
  exports$P = arrayLikeKeys;
  return exports$P;
}

var exports$O = {},
  _dewExec$N = false;
function dew$N() {
  if (_dewExec$N) return exports$O;
  _dewExec$N = true;
  /** Used for built-in method references. */
  var objectProto = Object.prototype;

  /**
   * Checks if `value` is likely a prototype object.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
   */
  function isPrototype(value) {
    var Ctor = value && value.constructor,
      proto = typeof Ctor == "function" && Ctor.prototype || objectProto;
    return value === proto;
  }
  exports$O = isPrototype;
  return exports$O;
}

var exports$N = {},
  _dewExec$M = false;
function dew$M() {
  if (_dewExec$M) return exports$N;
  _dewExec$M = true;
  /**
   * Creates a unary function that invokes `func` with its argument transformed.
   *
   * @private
   * @param {Function} func The function to wrap.
   * @param {Function} transform The argument transform.
   * @returns {Function} Returns the new function.
   */
  function overArg(func, transform) {
    return function (arg) {
      return func(transform(arg));
    };
  }
  exports$N = overArg;
  return exports$N;
}

var exports$M = {},
  _dewExec$L = false;
function dew$L() {
  if (_dewExec$L) return exports$M;
  _dewExec$L = true;
  var overArg = dew$M();

  /* Built-in method references for those with the same name as other `lodash` methods. */
  var nativeKeys = overArg(Object.keys, Object);
  exports$M = nativeKeys;
  return exports$M;
}

var exports$L = {},
  _dewExec$K = false;
function dew$K() {
  if (_dewExec$K) return exports$L;
  _dewExec$K = true;
  var isPrototype = dew$N(),
    nativeKeys = dew$L();

  /** Used for built-in method references. */
  var objectProto = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty = objectProto.hasOwnProperty;

  /**
   * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names.
   */
  function baseKeys(object) {
    if (!isPrototype(object)) {
      return nativeKeys(object);
    }
    var result = [];
    for (var key in Object(object)) {
      if (hasOwnProperty.call(object, key) && key != "constructor") {
        result.push(key);
      }
    }
    return result;
  }
  exports$L = baseKeys;
  return exports$L;
}

var exports$K = {},
  _dewExec$J = false;
function dew$J() {
  if (_dewExec$J) return exports$K;
  _dewExec$J = true;
  var isFunction = dew$1S(),
    isLength = dew$T();

  /**
   * Checks if `value` is array-like. A value is considered array-like if it's
   * not a function and has a `value.length` that's an integer greater than or
   * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
   * @example
   *
   * _.isArrayLike([1, 2, 3]);
   * // => true
   *
   * _.isArrayLike(document.body.children);
   * // => true
   *
   * _.isArrayLike('abc');
   * // => true
   *
   * _.isArrayLike(_.noop);
   * // => false
   */
  function isArrayLike(value) {
    return value != null && isLength(value.length) && !isFunction(value);
  }
  exports$K = isArrayLike;
  return exports$K;
}

var exports$J = {},
  _dewExec$I = false;
function dew$I() {
  if (_dewExec$I) return exports$J;
  _dewExec$I = true;
  var arrayLikeKeys = dew$O(),
    baseKeys = dew$K(),
    isArrayLike = dew$J();

  /**
   * Creates an array of the own enumerable property names of `object`.
   *
   * **Note:** Non-object values are coerced to objects. See the
   * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
   * for more details.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Object
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names.
   * @example
   *
   * function Foo() {
   *   this.a = 1;
   *   this.b = 2;
   * }
   *
   * Foo.prototype.c = 3;
   *
   * _.keys(new Foo);
   * // => ['a', 'b'] (iteration order is not guaranteed)
   *
   * _.keys('hi');
   * // => ['0', '1']
   */
  function keys(object) {
    return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
  }
  exports$J = keys;
  return exports$J;
}

var exports$I = {},
  _dewExec$H = false;
function dew$H() {
  if (_dewExec$H) return exports$I;
  _dewExec$H = true;
  var baseGetAllKeys = dew$$(),
    getSymbols = dew$Y(),
    keys = dew$I();

  /**
   * Creates an array of own enumerable property names and symbols of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names and symbols.
   */
  function getAllKeys(object) {
    return baseGetAllKeys(object, keys, getSymbols);
  }
  exports$I = getAllKeys;
  return exports$I;
}

var exports$H = {},
  _dewExec$G = false;
function dew$G() {
  if (_dewExec$G) return exports$H;
  _dewExec$G = true;
  var getAllKeys = dew$H();

  /** Used to compose bitmasks for value comparisons. */
  var COMPARE_PARTIAL_FLAG = 1;

  /** Used for built-in method references. */
  var objectProto = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty = objectProto.hasOwnProperty;

  /**
   * A specialized version of `baseIsEqualDeep` for objects with support for
   * partial deep comparisons.
   *
   * @private
   * @param {Object} object The object to compare.
   * @param {Object} other The other object to compare.
   * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
   * @param {Function} customizer The function to customize comparisons.
   * @param {Function} equalFunc The function to determine equivalents of values.
   * @param {Object} stack Tracks traversed `object` and `other` objects.
   * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
   */
  function equalObjects(object, other, bitmask, customizer, equalFunc, stack) {
    var isPartial = bitmask & COMPARE_PARTIAL_FLAG,
      objProps = getAllKeys(object),
      objLength = objProps.length,
      othProps = getAllKeys(other),
      othLength = othProps.length;
    if (objLength != othLength && !isPartial) {
      return false;
    }
    var index = objLength;
    while (index--) {
      var key = objProps[index];
      if (!(isPartial ? key in other : hasOwnProperty.call(other, key))) {
        return false;
      }
    }
    // Check that cyclic values are equal.
    var objStacked = stack.get(object);
    var othStacked = stack.get(other);
    if (objStacked && othStacked) {
      return objStacked == other && othStacked == object;
    }
    var result = true;
    stack.set(object, other);
    stack.set(other, object);
    var skipCtor = isPartial;
    while (++index < objLength) {
      key = objProps[index];
      var objValue = object[key],
        othValue = other[key];
      if (customizer) {
        var compared = isPartial ? customizer(othValue, objValue, key, other, object, stack) : customizer(objValue, othValue, key, object, other, stack);
      }
      // Recursively compare objects (susceptible to call stack limits).
      if (!(compared === undefined ? objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack) : compared)) {
        result = false;
        break;
      }
      skipCtor || (skipCtor = key == "constructor");
    }
    if (result && !skipCtor) {
      var objCtor = object.constructor,
        othCtor = other.constructor;

      // Non `Object` object instances with different constructors are not equal.
      if (objCtor != othCtor && "constructor" in object && "constructor" in other && !(typeof objCtor == "function" && objCtor instanceof objCtor && typeof othCtor == "function" && othCtor instanceof othCtor)) {
        result = false;
      }
    }
    stack["delete"](object);
    stack["delete"](other);
    return result;
  }
  exports$H = equalObjects;
  return exports$H;
}

var exports$G = {},
  _dewExec$F = false;
function dew$F() {
  if (_dewExec$F) return exports$G;
  _dewExec$F = true;
  var getNative = dew$1M(),
    root = dew$25();

  /* Built-in method references that are verified to be native. */
  var DataView = getNative(root, "DataView");
  exports$G = DataView;
  return exports$G;
}

var exports$F = {},
  _dewExec$E = false;
function dew$E() {
  if (_dewExec$E) return exports$F;
  _dewExec$E = true;
  var getNative = dew$1M(),
    root = dew$25();

  /* Built-in method references that are verified to be native. */
  var Promise = getNative(root, "Promise");
  exports$F = Promise;
  return exports$F;
}

var exports$E = {},
  _dewExec$D = false;
function dew$D() {
  if (_dewExec$D) return exports$E;
  _dewExec$D = true;
  var getNative = dew$1M(),
    root = dew$25();

  /* Built-in method references that are verified to be native. */
  var Set = getNative(root, "Set");
  exports$E = Set;
  return exports$E;
}

var exports$D = {},
  _dewExec$C = false;
function dew$C() {
  if (_dewExec$C) return exports$D;
  _dewExec$C = true;
  var getNative = dew$1M(),
    root = dew$25();

  /* Built-in method references that are verified to be native. */
  var WeakMap = getNative(root, "WeakMap");
  exports$D = WeakMap;
  return exports$D;
}

var exports$C = {},
  _dewExec$B = false;
function dew$B() {
  if (_dewExec$B) return exports$C;
  _dewExec$B = true;
  var DataView = dew$F(),
    Map = dew$1w(),
    Promise = dew$E(),
    Set = dew$D(),
    WeakMap = dew$C(),
    baseGetTag = dew$21(),
    toSource = dew$1P();

  /** `Object#toString` result references. */
  var mapTag = "[object Map]",
    objectTag = "[object Object]",
    promiseTag = "[object Promise]",
    setTag = "[object Set]",
    weakMapTag = "[object WeakMap]";
  var dataViewTag = "[object DataView]";

  /** Used to detect maps, sets, and weakmaps. */
  var dataViewCtorString = toSource(DataView),
    mapCtorString = toSource(Map),
    promiseCtorString = toSource(Promise),
    setCtorString = toSource(Set),
    weakMapCtorString = toSource(WeakMap);

  /**
   * Gets the `toStringTag` of `value`.
   *
   * @private
   * @param {*} value The value to query.
   * @returns {string} Returns the `toStringTag`.
   */
  var getTag = baseGetTag;

  // Fallback for data views, maps, sets, and weak maps in IE 11 and promises in Node.js < 6.
  if (DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag || Map && getTag(new Map()) != mapTag || Promise && getTag(Promise.resolve()) != promiseTag || Set && getTag(new Set()) != setTag || WeakMap && getTag(new WeakMap()) != weakMapTag) {
    getTag = function (value) {
      var result = baseGetTag(value),
        Ctor = result == objectTag ? value.constructor : undefined,
        ctorString = Ctor ? toSource(Ctor) : "";
      if (ctorString) {
        switch (ctorString) {
          case dataViewCtorString:
            return dataViewTag;
          case mapCtorString:
            return mapTag;
          case promiseCtorString:
            return promiseTag;
          case setCtorString:
            return setTag;
          case weakMapCtorString:
            return weakMapTag;
        }
      }
      return result;
    };
  }
  exports$C = getTag;
  return exports$C;
}

var exports$B = {},
  _dewExec$A = false;
function dew$A() {
  if (_dewExec$A) return exports$B;
  _dewExec$A = true;
  var Stack = dew$1a(),
    equalArrays = dew$14(),
    equalByTag = dew$10(),
    equalObjects = dew$G(),
    getTag = dew$B(),
    isArray = dew$1Z(),
    isBuffer = dew$V(),
    isTypedArray = dew$P();

  /** Used to compose bitmasks for value comparisons. */
  var COMPARE_PARTIAL_FLAG = 1;

  /** `Object#toString` result references. */
  var argsTag = "[object Arguments]",
    arrayTag = "[object Array]",
    objectTag = "[object Object]";

  /** Used for built-in method references. */
  var objectProto = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty = objectProto.hasOwnProperty;

  /**
   * A specialized version of `baseIsEqual` for arrays and objects which performs
   * deep comparisons and tracks traversed objects enabling objects with circular
   * references to be compared.
   *
   * @private
   * @param {Object} object The object to compare.
   * @param {Object} other The other object to compare.
   * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
   * @param {Function} customizer The function to customize comparisons.
   * @param {Function} equalFunc The function to determine equivalents of values.
   * @param {Object} [stack] Tracks traversed `object` and `other` objects.
   * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
   */
  function baseIsEqualDeep(object, other, bitmask, customizer, equalFunc, stack) {
    var objIsArr = isArray(object),
      othIsArr = isArray(other),
      objTag = objIsArr ? arrayTag : getTag(object),
      othTag = othIsArr ? arrayTag : getTag(other);
    objTag = objTag == argsTag ? objectTag : objTag;
    othTag = othTag == argsTag ? objectTag : othTag;
    var objIsObj = objTag == objectTag,
      othIsObj = othTag == objectTag,
      isSameTag = objTag == othTag;
    if (isSameTag && isBuffer(object)) {
      if (!isBuffer(other)) {
        return false;
      }
      objIsArr = true;
      objIsObj = false;
    }
    if (isSameTag && !objIsObj) {
      stack || (stack = new Stack());
      return objIsArr || isTypedArray(object) ? equalArrays(object, other, bitmask, customizer, equalFunc, stack) : equalByTag(object, other, objTag, bitmask, customizer, equalFunc, stack);
    }
    if (!(bitmask & COMPARE_PARTIAL_FLAG)) {
      var objIsWrapped = objIsObj && hasOwnProperty.call(object, "__wrapped__"),
        othIsWrapped = othIsObj && hasOwnProperty.call(other, "__wrapped__");
      if (objIsWrapped || othIsWrapped) {
        var objUnwrapped = objIsWrapped ? object.value() : object,
          othUnwrapped = othIsWrapped ? other.value() : other;
        stack || (stack = new Stack());
        return equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack);
      }
    }
    if (!isSameTag) {
      return false;
    }
    stack || (stack = new Stack());
    return equalObjects(object, other, bitmask, customizer, equalFunc, stack);
  }
  exports$B = baseIsEqualDeep;
  return exports$B;
}

var exports$A = {},
  _dewExec$z = false;
function dew$z() {
  if (_dewExec$z) return exports$A;
  _dewExec$z = true;
  var baseIsEqualDeep = dew$A(),
    isObjectLike = dew$20();

  /**
   * The base implementation of `_.isEqual` which supports partial comparisons
   * and tracks traversed objects.
   *
   * @private
   * @param {*} value The value to compare.
   * @param {*} other The other value to compare.
   * @param {boolean} bitmask The bitmask flags.
   *  1 - Unordered comparison
   *  2 - Partial comparison
   * @param {Function} [customizer] The function to customize comparisons.
   * @param {Object} [stack] Tracks traversed `value` and `other` objects.
   * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
   */
  function baseIsEqual(value, other, bitmask, customizer, stack) {
    if (value === other) {
      return true;
    }
    if (value == null || other == null || !isObjectLike(value) && !isObjectLike(other)) {
      return value !== value && other !== other;
    }
    return baseIsEqualDeep(value, other, bitmask, customizer, baseIsEqual, stack);
  }
  exports$A = baseIsEqual;
  return exports$A;
}

var exports$z = {},
  _dewExec$y = false;
function dew$y() {
  if (_dewExec$y) return exports$z;
  _dewExec$y = true;
  var Stack = dew$1a(),
    baseIsEqual = dew$z();

  /** Used to compose bitmasks for value comparisons. */
  var COMPARE_PARTIAL_FLAG = 1,
    COMPARE_UNORDERED_FLAG = 2;

  /**
   * The base implementation of `_.isMatch` without support for iteratee shorthands.
   *
   * @private
   * @param {Object} object The object to inspect.
   * @param {Object} source The object of property values to match.
   * @param {Array} matchData The property names, values, and compare flags to match.
   * @param {Function} [customizer] The function to customize comparisons.
   * @returns {boolean} Returns `true` if `object` is a match, else `false`.
   */
  function baseIsMatch(object, source, matchData, customizer) {
    var index = matchData.length,
      length = index,
      noCustomizer = !customizer;
    if (object == null) {
      return !length;
    }
    object = Object(object);
    while (index--) {
      var data = matchData[index];
      if (noCustomizer && data[2] ? data[1] !== object[data[0]] : !(data[0] in object)) {
        return false;
      }
    }
    while (++index < length) {
      data = matchData[index];
      var key = data[0],
        objValue = object[key],
        srcValue = data[1];
      if (noCustomizer && data[2]) {
        if (objValue === undefined && !(key in object)) {
          return false;
        }
      } else {
        var stack = new Stack();
        if (customizer) {
          var result = customizer(objValue, srcValue, key, object, source, stack);
        }
        if (!(result === undefined ? baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG, customizer, stack) : result)) {
          return false;
        }
      }
    }
    return true;
  }
  exports$z = baseIsMatch;
  return exports$z;
}

var exports$y = {},
  _dewExec$x = false;
function dew$x() {
  if (_dewExec$x) return exports$y;
  _dewExec$x = true;
  var isObject = dew$1T();

  /**
   * Checks if `value` is suitable for strict equality comparisons, i.e. `===`.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` if suitable for strict
   *  equality comparisons, else `false`.
   */
  function isStrictComparable(value) {
    return value === value && !isObject(value);
  }
  exports$y = isStrictComparable;
  return exports$y;
}

var exports$x = {},
  _dewExec$w = false;
function dew$w() {
  if (_dewExec$w) return exports$x;
  _dewExec$w = true;
  var isStrictComparable = dew$x(),
    keys = dew$I();

  /**
   * Gets the property names, values, and compare flags of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the match data of `object`.
   */
  function getMatchData(object) {
    var result = keys(object),
      length = result.length;
    while (length--) {
      var key = result[length],
        value = object[key];
      result[length] = [key, value, isStrictComparable(value)];
    }
    return result;
  }
  exports$x = getMatchData;
  return exports$x;
}

var exports$w = {},
  _dewExec$v = false;
function dew$v() {
  if (_dewExec$v) return exports$w;
  _dewExec$v = true;
  /**
   * A specialized version of `matchesProperty` for source values suitable
   * for strict equality comparisons, i.e. `===`.
   *
   * @private
   * @param {string} key The key of the property to get.
   * @param {*} srcValue The value to match.
   * @returns {Function} Returns the new spec function.
   */
  function matchesStrictComparable(key, srcValue) {
    return function (object) {
      if (object == null) {
        return false;
      }
      return object[key] === srcValue && (srcValue !== undefined || key in Object(object));
    };
  }
  exports$w = matchesStrictComparable;
  return exports$w;
}

var exports$v = {},
  _dewExec$u = false;
function dew$u() {
  if (_dewExec$u) return exports$v;
  _dewExec$u = true;
  var baseIsMatch = dew$y(),
    getMatchData = dew$w(),
    matchesStrictComparable = dew$v();

  /**
   * The base implementation of `_.matches` which doesn't clone `source`.
   *
   * @private
   * @param {Object} source The object of property values to match.
   * @returns {Function} Returns the new spec function.
   */
  function baseMatches(source) {
    var matchData = getMatchData(source);
    if (matchData.length == 1 && matchData[0][2]) {
      return matchesStrictComparable(matchData[0][0], matchData[0][1]);
    }
    return function (object) {
      return object === source || baseIsMatch(object, source, matchData);
    };
  }
  exports$v = baseMatches;
  return exports$v;
}

var exports$u = {},
  _dewExec$t = false;
function dew$t() {
  if (_dewExec$t) return exports$u;
  _dewExec$t = true;
  var baseGet = dew$1g();

  /**
   * Gets the value at `path` of `object`. If the resolved value is
   * `undefined`, the `defaultValue` is returned in its place.
   *
   * @static
   * @memberOf _
   * @since 3.7.0
   * @category Object
   * @param {Object} object The object to query.
   * @param {Array|string} path The path of the property to get.
   * @param {*} [defaultValue] The value returned for `undefined` resolved values.
   * @returns {*} Returns the resolved value.
   * @example
   *
   * var object = { 'a': [{ 'b': { 'c': 3 } }] };
   *
   * _.get(object, 'a[0].b.c');
   * // => 3
   *
   * _.get(object, ['a', '0', 'b', 'c']);
   * // => 3
   *
   * _.get(object, 'a.b.c', 'default');
   * // => 'default'
   */
  function get(object, path, defaultValue) {
    var result = object == null ? undefined : baseGet(object, path);
    return result === undefined ? defaultValue : result;
  }
  exports$u = get;
  return exports$u;
}

var exports$t = {},
  _dewExec$s = false;
function dew$s() {
  if (_dewExec$s) return exports$t;
  _dewExec$s = true;
  /**
   * The base implementation of `_.hasIn` without support for deep paths.
   *
   * @private
   * @param {Object} [object] The object to query.
   * @param {Array|string} key The key to check.
   * @returns {boolean} Returns `true` if `key` exists, else `false`.
   */
  function baseHasIn(object, key) {
    return object != null && key in Object(object);
  }
  exports$t = baseHasIn;
  return exports$t;
}

var exports$s = {},
  _dewExec$r = false;
function dew$r() {
  if (_dewExec$r) return exports$s;
  _dewExec$r = true;
  var castPath = dew$1i(),
    isArguments = dew$1_(),
    isArray = dew$1Z(),
    isIndex = dew$U(),
    isLength = dew$T(),
    toKey = dew$1h();

  /**
   * Checks if `path` exists on `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {Array|string} path The path to check.
   * @param {Function} hasFunc The function to check properties.
   * @returns {boolean} Returns `true` if `path` exists, else `false`.
   */
  function hasPath(object, path, hasFunc) {
    path = castPath(path, object);
    var index = -1,
      length = path.length,
      result = false;
    while (++index < length) {
      var key = toKey(path[index]);
      if (!(result = object != null && hasFunc(object, key))) {
        break;
      }
      object = object[key];
    }
    if (result || ++index != length) {
      return result;
    }
    length = object == null ? 0 : object.length;
    return !!length && isLength(length) && isIndex(key, length) && (isArray(object) || isArguments(object));
  }
  exports$s = hasPath;
  return exports$s;
}

var exports$r = {},
  _dewExec$q = false;
function dew$q() {
  if (_dewExec$q) return exports$r;
  _dewExec$q = true;
  var baseHasIn = dew$s(),
    hasPath = dew$r();

  /**
   * Checks if `path` is a direct or inherited property of `object`.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Object
   * @param {Object} object The object to query.
   * @param {Array|string} path The path to check.
   * @returns {boolean} Returns `true` if `path` exists, else `false`.
   * @example
   *
   * var object = _.create({ 'a': _.create({ 'b': 2 }) });
   *
   * _.hasIn(object, 'a');
   * // => true
   *
   * _.hasIn(object, 'a.b');
   * // => true
   *
   * _.hasIn(object, ['a', 'b']);
   * // => true
   *
   * _.hasIn(object, 'b');
   * // => false
   */
  function hasIn(object, path) {
    return object != null && hasPath(object, path, baseHasIn);
  }
  exports$r = hasIn;
  return exports$r;
}

var exports$q = {},
  _dewExec$p = false;
function dew$p() {
  if (_dewExec$p) return exports$q;
  _dewExec$p = true;
  var baseIsEqual = dew$z(),
    get = dew$t(),
    hasIn = dew$q(),
    isKey = dew$1U(),
    isStrictComparable = dew$x(),
    matchesStrictComparable = dew$v(),
    toKey = dew$1h();

  /** Used to compose bitmasks for value comparisons. */
  var COMPARE_PARTIAL_FLAG = 1,
    COMPARE_UNORDERED_FLAG = 2;

  /**
   * The base implementation of `_.matchesProperty` which doesn't clone `srcValue`.
   *
   * @private
   * @param {string} path The path of the property to get.
   * @param {*} srcValue The value to match.
   * @returns {Function} Returns the new spec function.
   */
  function baseMatchesProperty(path, srcValue) {
    if (isKey(path) && isStrictComparable(srcValue)) {
      return matchesStrictComparable(toKey(path), srcValue);
    }
    return function (object) {
      var objValue = get(object, path);
      return objValue === undefined && objValue === srcValue ? hasIn(object, path) : baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG);
    };
  }
  exports$q = baseMatchesProperty;
  return exports$q;
}

var exports$p = {},
  _dewExec$o = false;
function dew$o() {
  if (_dewExec$o) return exports$p;
  _dewExec$o = true;
  /**
   * This method returns the first argument it receives.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Util
   * @param {*} value Any value.
   * @returns {*} Returns `value`.
   * @example
   *
   * var object = { 'a': 1 };
   *
   * console.log(_.identity(object) === object);
   * // => true
   */
  function identity(value) {
    return value;
  }
  exports$p = identity;
  return exports$p;
}

var exports$o = {},
  _dewExec$n = false;
function dew$n() {
  if (_dewExec$n) return exports$o;
  _dewExec$n = true;
  /**
   * The base implementation of `_.property` without support for deep paths.
   *
   * @private
   * @param {string} key The key of the property to get.
   * @returns {Function} Returns the new accessor function.
   */
  function baseProperty(key) {
    return function (object) {
      return object == null ? undefined : object[key];
    };
  }
  exports$o = baseProperty;
  return exports$o;
}

var exports$n = {},
  _dewExec$m = false;
function dew$m() {
  if (_dewExec$m) return exports$n;
  _dewExec$m = true;
  var baseGet = dew$1g();

  /**
   * A specialized version of `baseProperty` which supports deep paths.
   *
   * @private
   * @param {Array|string} path The path of the property to get.
   * @returns {Function} Returns the new accessor function.
   */
  function basePropertyDeep(path) {
    return function (object) {
      return baseGet(object, path);
    };
  }
  exports$n = basePropertyDeep;
  return exports$n;
}

var exports$m = {},
  _dewExec$l = false;
function dew$l() {
  if (_dewExec$l) return exports$m;
  _dewExec$l = true;
  var baseProperty = dew$n(),
    basePropertyDeep = dew$m(),
    isKey = dew$1U(),
    toKey = dew$1h();

  /**
   * Creates a function that returns the value at `path` of a given object.
   *
   * @static
   * @memberOf _
   * @since 2.4.0
   * @category Util
   * @param {Array|string} path The path of the property to get.
   * @returns {Function} Returns the new accessor function.
   * @example
   *
   * var objects = [
   *   { 'a': { 'b': 2 } },
   *   { 'a': { 'b': 1 } }
   * ];
   *
   * _.map(objects, _.property('a.b'));
   * // => [2, 1]
   *
   * _.map(_.sortBy(objects, _.property(['a', 'b'])), 'a.b');
   * // => [1, 2]
   */
  function property(path) {
    return isKey(path) ? baseProperty(toKey(path)) : basePropertyDeep(path);
  }
  exports$m = property;
  return exports$m;
}

var exports$l = {},
  _dewExec$k = false;
function dew$k() {
  if (_dewExec$k) return exports$l;
  _dewExec$k = true;
  var baseMatches = dew$u(),
    baseMatchesProperty = dew$p(),
    identity = dew$o(),
    isArray = dew$1Z(),
    property = dew$l();

  /**
   * The base implementation of `_.iteratee`.
   *
   * @private
   * @param {*} [value=_.identity] The value to convert to an iteratee.
   * @returns {Function} Returns the iteratee.
   */
  function baseIteratee(value) {
    // Don't store the `typeof` result in a variable to avoid a JIT bug in Safari 9.
    // See https://bugs.webkit.org/show_bug.cgi?id=156034 for more details.
    if (typeof value == "function") {
      return value;
    }
    if (value == null) {
      return identity;
    }
    if (typeof value == "object") {
      return isArray(value) ? baseMatchesProperty(value[0], value[1]) : baseMatches(value);
    }
    return property(value);
  }
  exports$l = baseIteratee;
  return exports$l;
}

var exports$k = {},
  _dewExec$j = false;
function dew$j() {
  if (_dewExec$j) return exports$k;
  _dewExec$j = true;
  /**
   * Creates a base function for methods like `_.forIn` and `_.forOwn`.
   *
   * @private
   * @param {boolean} [fromRight] Specify iterating from right to left.
   * @returns {Function} Returns the new base function.
   */
  function createBaseFor(fromRight) {
    return function (object, iteratee, keysFunc) {
      var index = -1,
        iterable = Object(object),
        props = keysFunc(object),
        length = props.length;
      while (length--) {
        var key = props[fromRight ? length : ++index];
        if (iteratee(iterable[key], key, iterable) === false) {
          break;
        }
      }
      return object;
    };
  }
  exports$k = createBaseFor;
  return exports$k;
}

var exports$j = {},
  _dewExec$i = false;
function dew$i() {
  if (_dewExec$i) return exports$j;
  _dewExec$i = true;
  var createBaseFor = dew$j();

  /**
   * The base implementation of `baseForOwn` which iterates over `object`
   * properties returned by `keysFunc` and invokes `iteratee` for each property.
   * Iteratee functions may exit iteration early by explicitly returning `false`.
   *
   * @private
   * @param {Object} object The object to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @param {Function} keysFunc The function to get the keys of `object`.
   * @returns {Object} Returns `object`.
   */
  var baseFor = createBaseFor();
  exports$j = baseFor;
  return exports$j;
}

var exports$i = {},
  _dewExec$h = false;
function dew$h() {
  if (_dewExec$h) return exports$i;
  _dewExec$h = true;
  var baseFor = dew$i(),
    keys = dew$I();

  /**
   * The base implementation of `_.forOwn` without support for iteratee shorthands.
   *
   * @private
   * @param {Object} object The object to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Object} Returns `object`.
   */
  function baseForOwn(object, iteratee) {
    return object && baseFor(object, iteratee, keys);
  }
  exports$i = baseForOwn;
  return exports$i;
}

var exports$h = {},
  _dewExec$g = false;
function dew$g() {
  if (_dewExec$g) return exports$h;
  _dewExec$g = true;
  var isArrayLike = dew$J();

  /**
   * Creates a `baseEach` or `baseEachRight` function.
   *
   * @private
   * @param {Function} eachFunc The function to iterate over a collection.
   * @param {boolean} [fromRight] Specify iterating from right to left.
   * @returns {Function} Returns the new base function.
   */
  function createBaseEach(eachFunc, fromRight) {
    return function (collection, iteratee) {
      if (collection == null) {
        return collection;
      }
      if (!isArrayLike(collection)) {
        return eachFunc(collection, iteratee);
      }
      var length = collection.length,
        index = fromRight ? length : -1,
        iterable = Object(collection);
      while (fromRight ? index-- : ++index < length) {
        if (iteratee(iterable[index], index, iterable) === false) {
          break;
        }
      }
      return collection;
    };
  }
  exports$h = createBaseEach;
  return exports$h;
}

var exports$g = {},
  _dewExec$f = false;
function dew$f() {
  if (_dewExec$f) return exports$g;
  _dewExec$f = true;
  var baseForOwn = dew$h(),
    createBaseEach = dew$g();

  /**
   * The base implementation of `_.forEach` without support for iteratee shorthands.
   *
   * @private
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array|Object} Returns `collection`.
   */
  var baseEach = createBaseEach(baseForOwn);
  exports$g = baseEach;
  return exports$g;
}

var exports$f = {},
  _dewExec$e = false;
function dew$e() {
  if (_dewExec$e) return exports$f;
  _dewExec$e = true;
  var baseEach = dew$f(),
    isArrayLike = dew$J();

  /**
   * The base implementation of `_.map` without support for iteratee shorthands.
   *
   * @private
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns the new mapped array.
   */
  function baseMap(collection, iteratee) {
    var index = -1,
      result = isArrayLike(collection) ? Array(collection.length) : [];
    baseEach(collection, function (value, key, collection) {
      result[++index] = iteratee(value, key, collection);
    });
    return result;
  }
  exports$f = baseMap;
  return exports$f;
}

var exports$e = {},
  _dewExec$d = false;
function dew$d() {
  if (_dewExec$d) return exports$e;
  _dewExec$d = true;
  /**
   * The base implementation of `_.sortBy` which uses `comparer` to define the
   * sort order of `array` and replaces criteria objects with their corresponding
   * values.
   *
   * @private
   * @param {Array} array The array to sort.
   * @param {Function} comparer The function to define sort order.
   * @returns {Array} Returns `array`.
   */
  function baseSortBy(array, comparer) {
    var length = array.length;
    array.sort(comparer);
    while (length--) {
      array[length] = array[length].value;
    }
    return array;
  }
  exports$e = baseSortBy;
  return exports$e;
}

var exports$d = {},
  _dewExec$c = false;
function dew$c() {
  if (_dewExec$c) return exports$d;
  _dewExec$c = true;
  var isSymbol = dew$1V();

  /**
   * Compares values to sort them in ascending order.
   *
   * @private
   * @param {*} value The value to compare.
   * @param {*} other The other value to compare.
   * @returns {number} Returns the sort order indicator for `value`.
   */
  function compareAscending(value, other) {
    if (value !== other) {
      var valIsDefined = value !== undefined,
        valIsNull = value === null,
        valIsReflexive = value === value,
        valIsSymbol = isSymbol(value);
      var othIsDefined = other !== undefined,
        othIsNull = other === null,
        othIsReflexive = other === other,
        othIsSymbol = isSymbol(other);
      if (!othIsNull && !othIsSymbol && !valIsSymbol && value > other || valIsSymbol && othIsDefined && othIsReflexive && !othIsNull && !othIsSymbol || valIsNull && othIsDefined && othIsReflexive || !valIsDefined && othIsReflexive || !valIsReflexive) {
        return 1;
      }
      if (!valIsNull && !valIsSymbol && !othIsSymbol && value < other || othIsSymbol && valIsDefined && valIsReflexive && !valIsNull && !valIsSymbol || othIsNull && valIsDefined && valIsReflexive || !othIsDefined && valIsReflexive || !othIsReflexive) {
        return -1;
      }
    }
    return 0;
  }
  exports$d = compareAscending;
  return exports$d;
}

var exports$c = {},
  _dewExec$b = false;
function dew$b() {
  if (_dewExec$b) return exports$c;
  _dewExec$b = true;
  var compareAscending = dew$c();

  /**
   * Used by `_.orderBy` to compare multiple properties of a value to another
   * and stable sort them.
   *
   * If `orders` is unspecified, all values are sorted in ascending order. Otherwise,
   * specify an order of "desc" for descending or "asc" for ascending sort order
   * of corresponding values.
   *
   * @private
   * @param {Object} object The object to compare.
   * @param {Object} other The other object to compare.
   * @param {boolean[]|string[]} orders The order to sort by for each property.
   * @returns {number} Returns the sort order indicator for `object`.
   */
  function compareMultiple(object, other, orders) {
    var index = -1,
      objCriteria = object.criteria,
      othCriteria = other.criteria,
      length = objCriteria.length,
      ordersLength = orders.length;
    while (++index < length) {
      var result = compareAscending(objCriteria[index], othCriteria[index]);
      if (result) {
        if (index >= ordersLength) {
          return result;
        }
        var order = orders[index];
        return result * (order == "desc" ? -1 : 1);
      }
    }
    // Fixes an `Array#sort` bug in the JS engine embedded in Adobe applications
    // that causes it, under certain circumstances, to provide the same value for
    // `object` and `other`. See https://github.com/jashkenas/underscore/pull/1247
    // for more details.
    //
    // This also ensures a stable sort in V8 and other engines.
    // See https://bugs.chromium.org/p/v8/issues/detail?id=90 for more details.
    return object.index - other.index;
  }
  exports$c = compareMultiple;
  return exports$c;
}

var exports$b = {},
  _dewExec$a = false;
function dew$a() {
  if (_dewExec$a) return exports$b;
  _dewExec$a = true;
  var arrayMap = dew$1W(),
    baseGet = dew$1g(),
    baseIteratee = dew$k(),
    baseMap = dew$e(),
    baseSortBy = dew$d(),
    baseUnary = dew$R(),
    compareMultiple = dew$b(),
    identity = dew$o(),
    isArray = dew$1Z();

  /**
   * The base implementation of `_.orderBy` without param guards.
   *
   * @private
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function[]|Object[]|string[]} iteratees The iteratees to sort by.
   * @param {string[]} orders The sort orders of `iteratees`.
   * @returns {Array} Returns the new sorted array.
   */
  function baseOrderBy(collection, iteratees, orders) {
    if (iteratees.length) {
      iteratees = arrayMap(iteratees, function (iteratee) {
        if (isArray(iteratee)) {
          return function (value) {
            return baseGet(value, iteratee.length === 1 ? iteratee[0] : iteratee);
          };
        }
        return iteratee;
      });
    } else {
      iteratees = [identity];
    }
    var index = -1;
    iteratees = arrayMap(iteratees, baseUnary(baseIteratee));
    var result = baseMap(collection, function (value, key, collection) {
      var criteria = arrayMap(iteratees, function (iteratee) {
        return iteratee(value);
      });
      return {
        "criteria": criteria,
        "index": ++index,
        "value": value
      };
    });
    return baseSortBy(result, function (object, other) {
      return compareMultiple(object, other, orders);
    });
  }
  exports$b = baseOrderBy;
  return exports$b;
}

var exports$a = {},
  _dewExec$9 = false;
function dew$9() {
  if (_dewExec$9) return exports$a;
  _dewExec$9 = true;
  /**
   * A faster alternative to `Function#apply`, this function invokes `func`
   * with the `this` binding of `thisArg` and the arguments of `args`.
   *
   * @private
   * @param {Function} func The function to invoke.
   * @param {*} thisArg The `this` binding of `func`.
   * @param {Array} args The arguments to invoke `func` with.
   * @returns {*} Returns the result of `func`.
   */
  function apply(func, thisArg, args) {
    switch (args.length) {
      case 0:
        return func.call(thisArg);
      case 1:
        return func.call(thisArg, args[0]);
      case 2:
        return func.call(thisArg, args[0], args[1]);
      case 3:
        return func.call(thisArg, args[0], args[1], args[2]);
    }
    return func.apply(thisArg, args);
  }
  exports$a = apply;
  return exports$a;
}

var exports$9 = {},
  _dewExec$8 = false;
var _global = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : global;
function dew$8() {
  if (_dewExec$8) return exports$9;
  _dewExec$8 = true;
  var apply = dew$9();

  /* Built-in method references for those with the same name as other `lodash` methods. */
  var nativeMax = Math.max;

  /**
   * A specialized version of `baseRest` which transforms the rest array.
   *
   * @private
   * @param {Function} func The function to apply a rest parameter to.
   * @param {number} [start=func.length-1] The start position of the rest parameter.
   * @param {Function} transform The rest array transform.
   * @returns {Function} Returns the new function.
   */
  function overRest(func, start, transform) {
    start = nativeMax(start === undefined ? func.length - 1 : start, 0);
    return function () {
      var args = arguments,
        index = -1,
        length = nativeMax(args.length - start, 0),
        array = Array(length);
      while (++index < length) {
        array[index] = args[start + index];
      }
      index = -1;
      var otherArgs = Array(start + 1);
      while (++index < start) {
        otherArgs[index] = args[index];
      }
      otherArgs[start] = transform(array);
      return apply(func, this || _global, otherArgs);
    };
  }
  exports$9 = overRest;
  return exports$9;
}

var exports$8 = {},
  _dewExec$7 = false;
function dew$7() {
  if (_dewExec$7) return exports$8;
  _dewExec$7 = true;
  /**
   * Creates a function that returns `value`.
   *
   * @static
   * @memberOf _
   * @since 2.4.0
   * @category Util
   * @param {*} value The value to return from the new function.
   * @returns {Function} Returns the new constant function.
   * @example
   *
   * var objects = _.times(2, _.constant({ 'a': 1 }));
   *
   * console.log(objects);
   * // => [{ 'a': 1 }, { 'a': 1 }]
   *
   * console.log(objects[0] === objects[1]);
   * // => true
   */
  function constant(value) {
    return function () {
      return value;
    };
  }
  exports$8 = constant;
  return exports$8;
}

var exports$7 = {},
  _dewExec$6 = false;
function dew$6() {
  if (_dewExec$6) return exports$7;
  _dewExec$6 = true;
  var getNative = dew$1M();
  var defineProperty = function () {
    try {
      var func = getNative(Object, "defineProperty");
      func({}, "", {});
      return func;
    } catch (e) {}
  }();
  exports$7 = defineProperty;
  return exports$7;
}

var exports$6 = {},
  _dewExec$5 = false;
function dew$5() {
  if (_dewExec$5) return exports$6;
  _dewExec$5 = true;
  var constant = dew$7(),
    defineProperty = dew$6(),
    identity = dew$o();

  /**
   * The base implementation of `setToString` without support for hot loop shorting.
   *
   * @private
   * @param {Function} func The function to modify.
   * @param {Function} string The `toString` result.
   * @returns {Function} Returns `func`.
   */
  var baseSetToString = !defineProperty ? identity : function (func, string) {
    return defineProperty(func, "toString", {
      "configurable": true,
      "enumerable": false,
      "value": constant(string),
      "writable": true
    });
  };
  exports$6 = baseSetToString;
  return exports$6;
}

var exports$5 = {},
  _dewExec$4 = false;
function dew$4() {
  if (_dewExec$4) return exports$5;
  _dewExec$4 = true;
  /** Used to detect hot functions by number of calls within a span of milliseconds. */
  var HOT_COUNT = 800,
    HOT_SPAN = 16;

  /* Built-in method references for those with the same name as other `lodash` methods. */
  var nativeNow = Date.now;

  /**
   * Creates a function that'll short out and invoke `identity` instead
   * of `func` when it's called `HOT_COUNT` or more times in `HOT_SPAN`
   * milliseconds.
   *
   * @private
   * @param {Function} func The function to restrict.
   * @returns {Function} Returns the new shortable function.
   */
  function shortOut(func) {
    var count = 0,
      lastCalled = 0;
    return function () {
      var stamp = nativeNow(),
        remaining = HOT_SPAN - (stamp - lastCalled);
      lastCalled = stamp;
      if (remaining > 0) {
        if (++count >= HOT_COUNT) {
          return arguments[0];
        }
      } else {
        count = 0;
      }
      return func.apply(undefined, arguments);
    };
  }
  exports$5 = shortOut;
  return exports$5;
}

var exports$4 = {},
  _dewExec$3 = false;
function dew$3() {
  if (_dewExec$3) return exports$4;
  _dewExec$3 = true;
  var baseSetToString = dew$5(),
    shortOut = dew$4();

  /**
   * Sets the `toString` method of `func` to return `string`.
   *
   * @private
   * @param {Function} func The function to modify.
   * @param {Function} string The `toString` result.
   * @returns {Function} Returns `func`.
   */
  var setToString = shortOut(baseSetToString);
  exports$4 = setToString;
  return exports$4;
}

var exports$3 = {},
  _dewExec$2 = false;
function dew$2() {
  if (_dewExec$2) return exports$3;
  _dewExec$2 = true;
  var identity = dew$o(),
    overRest = dew$8(),
    setToString = dew$3();

  /**
   * The base implementation of `_.rest` which doesn't validate or coerce arguments.
   *
   * @private
   * @param {Function} func The function to apply a rest parameter to.
   * @param {number} [start=func.length-1] The start position of the rest parameter.
   * @returns {Function} Returns the new function.
   */
  function baseRest(func, start) {
    return setToString(overRest(func, start, identity), func + "");
  }
  exports$3 = baseRest;
  return exports$3;
}

var exports$2 = {},
  _dewExec$1 = false;
function dew$1() {
  if (_dewExec$1) return exports$2;
  _dewExec$1 = true;
  var eq = dew$1D(),
    isArrayLike = dew$J(),
    isIndex = dew$U(),
    isObject = dew$1T();

  /**
   * Checks if the given arguments are from an iteratee call.
   *
   * @private
   * @param {*} value The potential iteratee value argument.
   * @param {*} index The potential iteratee index or key argument.
   * @param {*} object The potential iteratee object argument.
   * @returns {boolean} Returns `true` if the arguments are from an iteratee call,
   *  else `false`.
   */
  function isIterateeCall(value, index, object) {
    if (!isObject(object)) {
      return false;
    }
    var type = typeof index;
    if (type == "number" ? isArrayLike(object) && isIndex(index, object.length) : type == "string" && index in object) {
      return eq(object[index], value);
    }
    return false;
  }
  exports$2 = isIterateeCall;
  return exports$2;
}

var exports$1 = {},
  _dewExec = false;
function dew() {
  if (_dewExec) return exports$1;
  _dewExec = true;
  var baseFlatten = dew$1X(),
    baseOrderBy = dew$a(),
    baseRest = dew$2(),
    isIterateeCall = dew$1();

  /**
   * Creates an array of elements, sorted in ascending order by the results of
   * running each element in a collection thru each iteratee. This method
   * performs a stable sort, that is, it preserves the original sort order of
   * equal elements. The iteratees are invoked with one argument: (value).
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Collection
   * @param {Array|Object} collection The collection to iterate over.
   * @param {...(Function|Function[])} [iteratees=[_.identity]]
   *  The iteratees to sort by.
   * @returns {Array} Returns the new sorted array.
   * @example
   *
   * var users = [
   *   { 'user': 'fred',   'age': 48 },
   *   { 'user': 'barney', 'age': 36 },
   *   { 'user': 'fred',   'age': 30 },
   *   { 'user': 'barney', 'age': 34 }
   * ];
   *
   * _.sortBy(users, [function(o) { return o.user; }]);
   * // => objects for [['barney', 36], ['barney', 34], ['fred', 48], ['fred', 30]]
   *
   * _.sortBy(users, ['user', 'age']);
   * // => objects for [['barney', 34], ['barney', 36], ['fred', 30], ['fred', 48]]
   */
  var sortBy = baseRest(function (collection, iteratees) {
    if (collection == null) {
      return [];
    }
    var length = iteratees.length;
    if (length > 1 && isIterateeCall(collection, iteratees[0], iteratees[1])) {
      iteratees = [];
    } else if (length > 2 && isIterateeCall(iteratees[0], iteratees[1], iteratees[2])) {
      iteratees = [iteratees[0]];
    }
    return baseOrderBy(collection, baseFlatten(iteratees, 1), []);
  });
  exports$1 = sortBy;
  return exports$1;
}

const exports = dew();

var users = [
  { 'user': 'fred',   'age': 48 },
  { 'user': 'barney', 'age': 36 },
  { 'user': 'fred',   'age': 40 },
  { 'user': 'barney', 'age': 34 }
];
 
_assert2(exports(users, [o => o.user])[0].user === 'barney');
