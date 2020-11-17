"use strict";
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.SymbolsNotFoundError = void 0;
// Used during the symbolication process to express that we couldn't find
// symbols for a specific library
var SymbolsNotFoundError = /** @class */ (function (_super) {
    __extends(SymbolsNotFoundError, _super);
    function SymbolsNotFoundError(message, library) {
        var errors = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            errors[_i - 2] = arguments[_i];
        }
        var _this = _super.call(this, __spreadArrays([message], errors.map(function (e) { return " - " + e.name + ": " + e.message; })).join('\n')) || this;
        // Workaround for a babel issue when extending Errors
        _this.__proto__ = SymbolsNotFoundError.prototype;
        _this.name = 'SymbolsNotFoundError';
        _this.library = library;
        _this.errors = errors;
        return _this;
    }
    return SymbolsNotFoundError;
}(Error));
exports.SymbolsNotFoundError = SymbolsNotFoundError;
