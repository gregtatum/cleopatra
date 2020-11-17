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
exports.__esModule = true;
exports.TemporaryError = void 0;
var TemporaryError = /** @class */ (function (_super) {
    __extends(TemporaryError, _super);
    function TemporaryError(message, attempt) {
        if (attempt === void 0) { attempt = null; }
        var _this = _super.call(this, message) || this;
        // Workaround for a babel issue when extending Errors
        _this.__proto__ = TemporaryError.prototype;
        _this.name = 'TemporaryError';
        _this.attempt = attempt;
        return _this;
    }
    return TemporaryError;
}(Error));
exports.TemporaryError = TemporaryError;
