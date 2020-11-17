"use strict";
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.ensureExists = exports.ensureIsTransformType = exports.getObjectValuesAsUnion = exports.objectMap = exports.objectEntries = exports.objectValues = exports.coerceMatchingShape = exports.coerce = exports.convertToTransformType = exports.ensureIsValidTabSlug = exports.toValidTabSlug = exports.immutableUpdate = exports.assertExhaustiveCheck = void 0;
/**
 * This file contains utils that help Flow understand things better. Occasionally
 * statements can be logically equivalent, but Flow infers them in a specific way. Most
 * of the time tweaks can be done by editing the type system, but occasionally functions
 * are needed to get the desired result.
 */
/**
 * This function can be run as the default arm of a switch statement to ensure exhaustive
 * checking of a given type. It relies on an assumption that all cases will be handled
 * and the input to the function will be empty. This function hopefully makes that check
 * more readable.
 */
function assertExhaustiveCheck(notValid, errorMessage) {
    if (errorMessage === void 0) { errorMessage = "There was an unhandled case for the value: \"" + notValid + "\""; }
    throw new Error(errorMessage);
}
exports.assertExhaustiveCheck = assertExhaustiveCheck;
/**
 * Immutably update an object through Object.assign, but retain the original
 * type information of the object. Flow will occasionally throw errors when
 * inferring what is going on with Object.assign.
 */
function immutableUpdate(object) {
    var rest = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        rest[_i - 1] = arguments[_i];
    }
    return Object.assign.apply(Object, __spreadArrays([{}, object], rest));
}
exports.immutableUpdate = immutableUpdate;
/**
 * This function takes a string and returns either a valid TabSlug or null, this doesn't
 * throw an error so that any arbitrary string can be converted, e.g. from a URL.
 */
function toValidTabSlug(tabSlug, as, any) {
    var coercedTabSlug = function (tabSlug) { return ; };
    switch (coercedTabSlug) {
        case 'calltree':
        case 'stack-chart':
        case 'marker-chart':
        case 'network-chart':
        case 'marker-table':
        case 'flame-graph':
        case 'js-tracer':
            return coercedTabSlug;
        default: {
            // The coerced type SHOULD be empty here. If in reality we get
            // here, then it's not a valid transform type, so return null.
            (function (coercedTabSlug) { return ; });
            return null;
        }
    }
}
exports.toValidTabSlug = toValidTabSlug;
/**
 * This function will take an arbitrary string, and will turn it into a TabSlug
 * it will throw an error if an invalid type was passed to it.
 */
function ensureIsValidTabSlug(type) {
    var assertedType = toValidTabSlug(type);
    if (!assertedType) {
        throw new Error("Attempted to assert that \"" + type + "\" is a valid TransformType, and it was not.");
    }
    return assertedType;
}
exports.ensureIsValidTabSlug = ensureIsValidTabSlug;
/**
 * This function will take an arbitrary string, and try to convert it to a valid
 * TransformType.
 */
function convertToTransformType(type) {
    // Coerce this into a TransformType even if it's not one.
    var coercedType = type, TransformType;
    switch (coercedType) {
        // Exhaustively check each TransformType. The default arm will assert that
        // we have been exhaustive.
        case 'merge-call-node':
        case 'merge-function':
        case 'focus-subtree':
        case 'focus-function':
        case 'collapse-resource':
        case 'collapse-direct-recursion':
        case 'collapse-function-subtree':
        case 'drop-function':
            return coercedType;
        default: {
            // The coerced type SHOULD be empty here. If in reality we get
            // here, then it's not a valid transform type, so return null.
            (function (coercedType) { return ; });
            return null;
        }
    }
}
exports.convertToTransformType = convertToTransformType;
/**
 * This function coerces one type into another type.
 * This is equivalent to: (((value: A) as any) as B)
 */
function coerce(item) {
    return item;
}
exports.coerce = coerce;
/**
 * It can be helpful to coerce one type that matches the shape of another.
 */
function coerceMatchingShape(item) {
    return item;
}
exports.coerceMatchingShape = coerceMatchingShape;
/**
 * This is a type-friendly version of Object.values that assumes the object has
 * a Map-like structure.
 */
function objectValues() {  | [string]; Value; }
exports.objectValues = objectValues;
 > (object);
Obj;
Value[];
{
    return Object.values(object);
}
/**
 * This is a type-friendly version of Object.entries that assumes the object has
 * a Map-like structure.
 */
function objectEntries(object) {
    return Object.entries(object);
}
exports.objectEntries = objectEntries;
/**
 * This is a type-friendly version of Object.entries that assumes the object has
 * a Map-like structure.
 */
function objectMap(object, fn) {
    var result = {};
    for (var _i = 0, _a = objectEntries(object); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        result[key] = fn(value, key);
    }
    return result;
}
exports.objectMap = objectMap;
// Generic bounds with an Object is a false positive.
// eslint-disable-next-line flowtype/no-weak-types
function getObjectValuesAsUnion(obj) {
    return Object.values(obj);
}
exports.getObjectValuesAsUnion = getObjectValuesAsUnion;
/**
 * This function will take an arbitrary string, and will turn it into a TransformType
 * it will throw an error if an invalid type was passed to it.
 */
function ensureIsTransformType(type) {
    var assertedType = convertToTransformType(type);
    if (!assertedType) {
        throw new Error("Attempted to assert that \"" + type + "\" is a valid TransformType, and it was not.");
    }
    return assertedType;
}
exports.ensureIsTransformType = ensureIsTransformType;
function ensureExists(item, message) {
    if (item === null) {
        throw new Error(message || 'Expected an item to exist, and it was null.');
    }
    if (item === undefined) {
        throw new Error(message || 'Expected an item to exist, and it was undefined.');
    }
    return item;
}
exports.ensureExists = ensureExists;
