"use strict";
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
exports.__esModule = true;
exports.fatalError = void 0;
function fatalError(error) {
    return {
        type: 'FATAL_ERROR',
        error: error
    };
}
exports.fatalError = fatalError;
