"use strict";
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
exports.__esModule = true;
exports.UniqueStringArray = void 0;
var UniqueStringArray = /** @class */ (function () {
    function UniqueStringArray(originalArray) {
        if (originalArray === void 0) { originalArray = []; }
        this._array = originalArray.slice(0);
        this._stringToIndex = new Map();
        for (var i = 0; i < originalArray.length; i++) {
            this._stringToIndex.set(originalArray[i], i);
        }
    }
    UniqueStringArray.prototype.getString = function (index) {
        if (!(index in this._array)) {
            throw new Error("index " + index + " not in UniqueStringArray");
        }
        return this._array[index];
    };
    UniqueStringArray.prototype.hasString = function (s) {
        return this._stringToIndex.has(s);
    };
    UniqueStringArray.prototype.indexForString = function (s) {
        var index = this._stringToIndex.get(s);
        if (index === undefined) {
            index = this._array.length;
            this._stringToIndex.set(s, index);
            this._array.push(s);
        }
        return index;
    };
    UniqueStringArray.prototype.serializeToArray = function () {
        return this._array.slice(0);
    };
    return UniqueStringArray;
}());
exports.UniqueStringArray = UniqueStringArray;
