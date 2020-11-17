"use strict";
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
exports.__esModule = true;
exports.formatValueTotal = exports.formatTimestamp = exports.formatSeconds = exports.formatMilliseconds = exports.formatMicroseconds = exports.formatNanoseconds = exports.formatSI = exports.formatBytes = exports.ratioToCssPercent = exports.formatPercent = exports.formatCallNodeNumberWithUnit = exports.formatCallNodeNumber = exports.formatNumber = void 0;
var memoize_immutable_1 = require("memoize-immutable");
var namedtuplemap_1 = require("namedtuplemap");
var flow_1 = require("./flow");
// Calling `toLocalestring` repeatedly in a tight loop can be a performance
// problem. It's much better to reuse an instance of `Intl.NumberFormat`.
// This function simply returns an instance of this class, and then we use a
// memoization tool to store an instance for each set of arguments.
// It's probably OK to keep all instances because their number is finite.
function _getNumberFormat(_a) {
    var places = _a.places, style = _a.style;
    return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: places,
        maximumFractionDigits: places,
        style: style
    });
}
var _memoizedGetNumberFormat = memoize_immutable_1["default"](_getNumberFormat, {
    cache: new namedtuplemap_1["default"]()
});
/**
 * Format a positive float into a string.
 *
 * Try to format the value to with `significantDigits` significant digits as
 * much as possible but without using scientific notation.  The number of
 * decimal places depends on the value: the closer to zero the value is, the
 * more decimal places are used in the resulting string.  No more than
 * `maxFractionalDigits` decimal places will be used.
 *
 * For example, using significantDigits = 2 (the default):
 *
 * formatNumber(123    ) = "123"
 * formatNumber(12.3   ) =  "12"
 * formatNumber(1.23   ) =   "1.2"
 * formatNumber(0.01234) =   "0.012"
 */
function formatNumber(value, significantDigits, maxFractionalDigits, style) {
    if (significantDigits === void 0) { significantDigits = 2; }
    if (maxFractionalDigits === void 0) { maxFractionalDigits = 3; }
    if (style === void 0) { style = 'decimal'; }
    /*
     * Note that numDigitsOnLeft can be negative when the first non-zero digit
     * is on the right of the decimal point.  0.01 = -1
     */
    var numDigitsOnLeft = Math.floor(Math.log10(Math.abs(value))) + 1;
    if (style === 'percent') {
        // We receive percent values as `0.4` but display them as `40`, so we
        // should add `2` here to account for this difference.
        numDigitsOnLeft += 2;
    }
    var places = significantDigits - numDigitsOnLeft;
    if (places < 0) {
        places = 0;
    }
    else if (places > maxFractionalDigits) {
        places = maxFractionalDigits;
    }
    var numberFormat = _memoizedGetNumberFormat({ places: places, style: style });
    return numberFormat.format(value);
}
exports.formatNumber = formatNumber;
/**
 * Format call node numbers consistently.
 */
function formatCallNodeNumber(weightType, isHighPrecision, number) {
    // If the interval is an integer, display the number as an integer.
    var precision;
    switch (weightType) {
        case 'tracing-ms':
            precision = 1;
            break;
        case 'samples':
        case 'bytes':
            precision = 0;
            break;
        default:
            throw flow_1.assertExhaustiveCheck(weightType, 'Unhandled WeightType.');
    }
    if (isHighPrecision) {
        // Sometimes the number should be high precision, such as on a JS tracer thread
        // which has timing to the microsecond.
        precision = 3;
    }
    return formatNumber(number, 3, precision);
}
exports.formatCallNodeNumber = formatCallNodeNumber;
/**
 * Format call node numbers consistently.
 */
function formatCallNodeNumberWithUnit(weightType, isHighPrecision, number) {
    switch (weightType) {
        case 'tracing-ms': {
            // Sometimes the number should be high precision, such as on a JS tracer thread
            // which has timing to the microsecond.
            var precision = isHighPrecision ? 3 : 1;
            return formatNumber(number, 3, precision) + 'ms';
        }
        case 'samples': {
            // TODO - L10n properly
            var unit = number === 1 ? ' sample' : ' samples';
            return formatNumber(number, 3, 0) + unit;
        }
        case 'bytes': {
            // TODO - L10n properly
            var unit = number === 1 ? ' byte' : ' bytes';
            return formatNumber(number, 3, 0) + unit;
        }
        default:
            throw flow_1.assertExhaustiveCheck(weightType, 'Unhandled WeightType.');
    }
}
exports.formatCallNodeNumberWithUnit = formatCallNodeNumberWithUnit;
/**
 * Format a localized percentage. This takes a number valued between 0-1.
 */
function formatPercent(ratio) {
    return formatNumber(ratio, 
    /* significantDigits */ 2, 
    /* maxFractionalDigits */ 1, 'percent');
}
exports.formatPercent = formatPercent;
/**
 * Turn a number ranged 0 to 1 into a valid CSS percentage string. Use this over
 * formatPercent, as the latter is localized and may not be a valid percentage
 * for CSS.
 *
 * e.g.
 * 0.1       => "10.0000%"
 * 0.5333333 => "53.3333%"
 * 1.0       => "100.0000%"
 */
function ratioToCssPercent(ratio) {
    return (ratio * 100).toFixed(4) + '%';
}
exports.ratioToCssPercent = ratioToCssPercent;
function formatBytes(bytes) {
    if (bytes < 10000) {
        // Use singles up to 10,000.  I think 9,360B looks nicer than 9.36KB.
        return formatNumber(bytes) + 'B';
    }
    else if (bytes < 1024 * 1024) {
        return formatNumber(bytes / 1024, 3, 2) + 'KB';
    }
    else if (bytes < 1024 * 1024 * 1024) {
        return formatNumber(bytes / (1024 * 1024), 3, 2) + 'MB';
    }
    return formatNumber(bytes / (1024 * 1024 * 1024), 3, 2) + 'GB';
}
exports.formatBytes = formatBytes;
function formatSI(num) {
    if (num < 10000) {
        // Use singles up to 10,000.  I think 9,360 looks nicer than 9.36K.
        return formatNumber(num);
    }
    else if (num < 1000 * 1000) {
        return formatNumber(num / 1000, 3, 2) + 'K';
    }
    else if (num < 1000 * 1000 * 1000) {
        return formatNumber(num / (1000 * 1000), 3, 2) + 'M';
    }
    return formatNumber(num / (1000 * 1000 * 1000), 3, 2) + 'G';
}
exports.formatSI = formatSI;
function formatNanoseconds(time, significantDigits, maxFractionalDigits) {
    if (significantDigits === void 0) { significantDigits = 3; }
    if (maxFractionalDigits === void 0) { maxFractionalDigits = 4; }
    return formatNumber(time, significantDigits, maxFractionalDigits) + 'ns';
}
exports.formatNanoseconds = formatNanoseconds;
function formatMicroseconds(time, significantDigits, maxFractionalDigits) {
    if (significantDigits === void 0) { significantDigits = 2; }
    if (maxFractionalDigits === void 0) { maxFractionalDigits = 3; }
    return formatNumber(time, significantDigits, maxFractionalDigits) + 'μs';
}
exports.formatMicroseconds = formatMicroseconds;
function formatMilliseconds(time, significantDigits, maxFractionalDigits) {
    if (significantDigits === void 0) { significantDigits = 2; }
    if (maxFractionalDigits === void 0) { maxFractionalDigits = 3; }
    return formatNumber(time, significantDigits, maxFractionalDigits) + 'ms';
}
exports.formatMilliseconds = formatMilliseconds;
function formatSeconds(time, significantDigits, maxFractionalDigits) {
    if (significantDigits === void 0) { significantDigits = 5; }
    if (maxFractionalDigits === void 0) { maxFractionalDigits = 3; }
    return (formatNumber(time / 1000, significantDigits, maxFractionalDigits) + 's');
}
exports.formatSeconds = formatSeconds;
function formatTimestamp(time, significantDigits, maxFractionalDigits) {
    if (significantDigits === void 0) { significantDigits = 5; }
    if (maxFractionalDigits === void 0) { maxFractionalDigits = 3; }
    // Format in the closest base (seconds, milliseconds, microseconds, or nanoseconds),
    // to avoid cases where times are displayed with too many leading zeroes to be useful.
    if (time >= 1000) {
        return formatSeconds(time, significantDigits, Number.isInteger(time / 1000) ? 0 : maxFractionalDigits);
    }
    if (time >= 1) {
        return formatMilliseconds(time, significantDigits, Number.isInteger(time) ? 0 : maxFractionalDigits);
    }
    if (time * 1000 >= 1) {
        return formatMicroseconds(time * 1000, significantDigits, Number.isInteger(time * 1000) ? 0 : maxFractionalDigits);
    }
    if (time === 0) {
        return '0s';
    }
    return formatNanoseconds(time * 1000 * 1000, significantDigits, Number.isInteger(time * 1000 * 1000) ? 0 : maxFractionalDigits);
}
exports.formatTimestamp = formatTimestamp;
/*
 * Format a value and a total to the form "v/t (p%)".  For example this can
 * be used to print "7MB/10MB (70%)"  fornatNum is a function to format the
 * individual numbers and includePercent may be set to false if you do not
 * wish to print the percentage.
 */
function formatValueTotal(a, b, formatNum, string, includePercent) {
    if (string === void 0) { string = String; }
    if (includePercent === void 0) { includePercent = true; }
    var value_total = formatNum(a) + ' / ' + formatNum(b);
    var percent = '';
    if (includePercent) {
        percent = ' (' + formatPercent(a / b) + ')';
    }
    return value_total + percent;
}
exports.formatValueTotal = formatValueTotal;
