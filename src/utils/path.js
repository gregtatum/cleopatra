"use strict";
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
exports.__esModule = true;
exports.PathSet = exports.hashPath = exports.arePathsEqual = void 0;
function arePathsEqual(a, b) {
    if (a === b) {
        return true;
    }
    if (a.length !== b.length) {
        return false;
    }
    // Iterating from the end because this will likely fail faster
    for (var i = a.length - 1; i >= 0; i--) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}
exports.arePathsEqual = arePathsEqual;
// We take the easy path by converting the path to a string that will be unique.
// This is _quite_ costly because converting numbers to strings is costly.
// But this is counter-balanced by the fact that this hash function is perfect:
// it's a bijection. This avoids the need of buckets in the Set and Map
// implementations which is a lot faster.
function hashPath(a) {
    return a.join('-');
}
exports.hashPath = hashPath;
// This class implements all of the methods of the native Set, but provides a
// unique list of CallNodePaths. These paths can be different objects, but as
// long as they contain the same data, they are considered to be the same.
// These CallNodePaths are keyed off of the string value returned by the
// `hashPath` function above.
var PathSet = /** @class */ (function () {
    function PathSet(iterable) {
        if (iterable instanceof PathSet) {
            // This shortcut avoids the call to `hashPath` by taking advantage of
            // knowing some inner workings.
            this._table = new Map(iterable._table);
            return;
        }
        this._table = new Map();
        if (!iterable) {
            return;
        }
        for (var _i = 0, iterable_1 = iterable; _i < iterable_1.length; _i++) {
            var path = iterable_1[_i];
            this._table.set(hashPath(path), path);
        }
    }
    PathSet.prototype.add = function (path) {
        this._table.set(hashPath(path), path);
        return this;
    };
    PathSet.prototype.clear = function () {
        this._table.clear();
    };
    PathSet.prototype["delete"] = function (path) {
        return this._table["delete"](hashPath(path));
    };
    PathSet.prototype.values = function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [5 /*yield**/, __values(this._table.values())];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    };
    PathSet.prototype.entries = function () {
        var _i, _a, entry;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _i = 0, _a = this;
                    _b.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 4];
                    entry = _a[_i];
                    return [4 /*yield*/, [entry, entry]];
                case 2:
                    _b.sent();
                    _b.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    };
    PathSet.prototype.forEach = function (func, thisArg) {
        for (var _i = 0, _a = this; _i < _a.length; _i++) {
            var entry = _a[_i];
            func.call(thisArg, entry, entry, this);
        }
    };
    PathSet.prototype.has = function (path) {
        return this._table.has(hashPath(path));
    };
    Object.defineProperty(PathSet.prototype, "size", {
        get: function () {
            return this._table.size;
        },
        enumerable: false,
        configurable: true
    });
    // Because Flow doesn't understand Symbols and well-known symbols yet, we need
    // to resort to this hack to make it possible to implement the iterator.
    // See https://github.com/facebook/flow/issues/3258 for more information
    // and https://stackoverflow.com/questions/48491307/iterable-class-in-flow for
    // the solution used here.
    // $FlowFixMe ignore Flow error about computed properties in a class
    PathSet.prototype[Symbol.iterator] = function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [5 /*yield**/, __values(this._table.values())];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    };
    return PathSet;
}());
exports.PathSet = PathSet;
