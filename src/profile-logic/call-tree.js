"use strict";
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
exports.computeTracedTiming = exports.extractSamplesLikeTable = exports.getCallTree = exports.computeCallTreeCountsAndSummary = exports.CallTree = void 0;
var common_tags_1 = require("common-tags");
var time_code_1 = require("../utils/time-code");
var profile_data_1 = require("./profile-data");
var data_structures_1 = require("./data-structures");
var extension_svg_1 = require("../../res/img/svg/extension.svg");
var format_numbers_1 = require("../utils/format-numbers");
var flow_1 = require("../utils/flow");
var ProfileData = require("./profile-data");
function extractFaviconFromLibname(libname) {
    try {
        var url = new URL('/favicon.ico', libname);
        if (url.protocol === 'http:') {
            // Upgrade http requests.
            url.protocol = 'https:';
        }
        return url.href;
    }
    catch (e) {
        console.error('Error while extracing the favicon from the libname', libname);
        return null;
    }
}
var CallTree = /** @class */ (function () {
    function CallTree(_a, categories, callNodeTable, callNodeSummary, callNodeChildCount, rootTotalSummary, rootCount, jsOnly, interval, isHighPrecision, weightType) {
        var funcTable = _a.funcTable, resourceTable = _a.resourceTable, stringTable = _a.stringTable;
        this._categories = categories;
        this._callNodeTable = callNodeTable;
        this._callNodeSummary = callNodeSummary;
        this._callNodeChildCount = callNodeChildCount;
        this._funcTable = funcTable;
        this._resourceTable = resourceTable;
        this._stringTable = stringTable;
        this._rootTotalSummary = rootTotalSummary;
        this._rootCount = rootCount;
        this._displayDataByIndex = new Map();
        this._children = [];
        this._jsOnly = jsOnly;
        this._interval = interval;
        this._isHighPrecision = isHighPrecision;
        this._weightType = weightType;
    }
    CallTree.prototype.getRoots = function () {
        return this.getChildren(-1);
    };
    CallTree.prototype.getChildren = function (callNodeIndex) {
        var _this = this;
        var children = this._children[callNodeIndex];
        if (children === undefined) {
            var childCount = callNodeIndex === -1
                ? this._rootCount
                : this._callNodeChildCount[callNodeIndex];
            children = [];
            for (var childCallNodeIndex = callNodeIndex + 1; childCallNodeIndex < this._callNodeTable.length &&
                children.length < childCount; childCallNodeIndex++) {
                var childPrefixIndex = this._callNodeTable.prefix[childCallNodeIndex];
                var childTotalSummary = this._callNodeSummary.total[childCallNodeIndex];
                var childChildCount = this._callNodeChildCount[childCallNodeIndex];
                if (childPrefixIndex === callNodeIndex &&
                    (childTotalSummary !== 0 || childChildCount !== 0)) {
                    children.push(childCallNodeIndex);
                }
            }
            children.sort(function (a, b) {
                return Math.abs(_this._callNodeSummary.total[b]) -
                    Math.abs(_this._callNodeSummary.total[a]);
            });
            this._children[callNodeIndex] = children;
        }
        return children;
    };
    CallTree.prototype.hasChildren = function (callNodeIndex) {
        return this.getChildren(callNodeIndex).length !== 0;
    };
    CallTree.prototype._addDescendantsToSet = function (callNodeIndex, set) {
        for (var _i = 0, _a = this.getChildren(callNodeIndex); _i < _a.length; _i++) {
            var child = _a[_i];
            set.add(child);
            this._addDescendantsToSet(child, set);
        }
    };
    CallTree.prototype.getAllDescendants = function (callNodeIndex) {
        var result = new Set();
        this._addDescendantsToSet(callNodeIndex, result);
        return result;
    };
    CallTree.prototype.getParent = function (callNodeIndex) {
        return this._callNodeTable.prefix[callNodeIndex];
    };
    CallTree.prototype.getDepth = function (callNodeIndex) {
        return this._callNodeTable.depth[callNodeIndex];
    };
    CallTree.prototype.hasSameNodeIds = function (tree) {
        return this._callNodeTable === tree._callNodeTable;
    };
    CallTree.prototype.getNodeData = function (callNodeIndex) {
        var funcIndex = this._callNodeTable.func[callNodeIndex];
        var funcName = this._stringTable.getString(this._funcTable.name[funcIndex]);
        var total = this._callNodeSummary.total[callNodeIndex];
        var totalRelative = total / this._rootTotalSummary;
        var self = this._callNodeSummary.self[callNodeIndex];
        var selfRelative = self / this._rootTotalSummary;
        return {
            funcName: funcName,
            total: total,
            totalRelative: totalRelative,
            self: self,
            selfRelative: selfRelative
        };
    };
    CallTree.prototype.getDisplayData = function (callNodeIndex) {
        var displayData = this._displayDataByIndex.get(callNodeIndex);
        if (displayData === undefined) {
            var _a = this.getNodeData(callNodeIndex), funcName = _a.funcName, total = _a.total, totalRelative = _a.totalRelative, self_1 = _a.self;
            var funcIndex = this._callNodeTable.func[callNodeIndex];
            var categoryIndex = this._callNodeTable.category[callNodeIndex];
            var subcategoryIndex = this._callNodeTable.subcategory[callNodeIndex];
            var resourceIndex = this._funcTable.resource[funcIndex];
            var resourceType = this._resourceTable.type[resourceIndex];
            var isFrameLabel = resourceIndex === -1;
            var libName = this._getOriginAnnotation(funcIndex);
            var weightType = this._weightType;
            var iconSrc = null;
            var icon = null;
            if (resourceType === data_structures_1.resourceTypes.webhost) {
                icon = iconSrc = extractFaviconFromLibname(libName);
            }
            else if (resourceType === data_structures_1.resourceTypes.addon) {
                iconSrc = extension_svg_1["default"];
                var resourceNameIndex = this._resourceTable.name[resourceIndex];
                if (resourceNameIndex !== undefined) {
                    var iconText = this._stringTable.getString(resourceNameIndex);
                    icon = iconText;
                }
            }
            var formattedTotal = format_numbers_1.formatCallNodeNumber(weightType, this._isHighPrecision, total);
            var formattedSelf = format_numbers_1.formatCallNodeNumber(weightType, this._isHighPrecision, self_1);
            var totalPercent = "" + format_numbers_1.formatPercent(totalRelative);
            var ariaLabel = void 0;
            var totalWithUnit = void 0;
            var selfWithUnit = void 0;
            switch (weightType) {
                case 'tracing-ms': {
                    totalWithUnit = formattedTotal + "ms";
                    selfWithUnit = formattedSelf + "ms";
                    ariaLabel = common_tags_1.oneLine(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n              ", ",\n              running time is ", " (", "),\n              self time is ", "\n            "], ["\n              ", ",\n              running time is ", " (", "),\n              self time is ", "\n            "])), funcName, totalWithUnit, totalPercent, selfWithUnit);
                    break;
                }
                case 'samples': {
                    // TODO - L10N pluralization
                    totalWithUnit =
                        total === 1
                            ? formattedTotal + " sample"
                            : formattedTotal + " samples";
                    selfWithUnit =
                        self_1 === 1 ? formattedSelf + " sample" : formattedSelf + " samples";
                    ariaLabel = common_tags_1.oneLine(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n            ", ",\n            running count is ", " (", "),\n            self count is ", "\n          "], ["\n            ", ",\n            running count is ", " (", "),\n            self count is ", "\n          "])), funcName, totalWithUnit, totalPercent, selfWithUnit);
                    break;
                }
                case 'bytes': {
                    totalWithUnit = formattedTotal + " bytes";
                    selfWithUnit = formattedSelf + " bytes";
                    ariaLabel = common_tags_1.oneLine(templateObject_3 || (templateObject_3 = __makeTemplateObject(["\n            ", ",\n            total size is ", " (", "),\n            self size is ", "\n          "], ["\n            ", ",\n            total size is ", " (", "),\n            self size is ", "\n          "])), funcName, totalWithUnit, totalPercent, selfWithUnit);
                    break;
                }
                default:
                    throw flow_1.assertExhaustiveCheck(weightType, 'Unhandled WeightType.');
            }
            displayData = {
                total: total === 0 ? '—' : formattedTotal,
                totalWithUnit: total === 0 ? '—' : totalWithUnit,
                self: self_1 === 0 ? '—' : formattedSelf,
                selfWithUnit: self_1 === 0 ? '—' : selfWithUnit,
                totalPercent: totalPercent,
                name: funcName,
                lib: libName.slice(0, 1000),
                // Dim platform pseudo-stacks.
                isFrameLabel: isFrameLabel,
                categoryName: profile_data_1.getCategoryPairLabel(this._categories, categoryIndex, subcategoryIndex),
                categoryColor: this._categories[categoryIndex].color,
                iconSrc: iconSrc,
                icon: icon,
                ariaLabel: ariaLabel
            };
            this._displayDataByIndex.set(callNodeIndex, displayData);
        }
        return displayData;
    };
    CallTree.prototype._getOriginAnnotation = function (funcIndex) {
        return profile_data_1.getOriginAnnotationForFunc(funcIndex, this._funcTable, this._resourceTable, this._stringTable);
    };
    return CallTree;
}());
exports.CallTree = CallTree;
function _getInvertedStackSelf(
// The samples could either be a SamplesTable, or a JsAllocationsTable.
samples, callNodeTable, sampleIndexToCallNodeIndex) {
    // Compute an array that maps the callNodeIndex to its root.
    var callNodeToRoot = new Int32Array(callNodeTable.length);
    for (var callNodeIndex = 0; callNodeIndex < callNodeTable.length; callNodeIndex++) {
        var prefixCallNode = callNodeTable.prefix[callNodeIndex];
        if (prefixCallNode === -1) {
            // callNodeIndex is a root node
            callNodeToRoot[callNodeIndex] = callNodeIndex;
        }
        else {
            // The callNodeTable guarantees that a callNode's prefix always comes
            // before the callNode; prefix references are always to lower callNode
            // indexes and never to higher indexes.
            // We are iterating the callNodeTable in forwards direction (starting at
            // index 0) so we know that we have already visited the current call
            // node's prefix call node and can reuse its stored root node, which
            // recursively is the value we're looking for.
            callNodeToRoot[callNodeIndex] = callNodeToRoot[prefixCallNode];
        }
    }
    // Calculate the timing information by going through each sample.
    var callNodeSelf = new Float32Array(callNodeTable.length);
    var callNodeLeaf = new Float32Array(callNodeTable.length);
    for (var sampleIndex = 0; sampleIndex < sampleIndexToCallNodeIndex.length; sampleIndex++) {
        var callNodeIndex = sampleIndexToCallNodeIndex[sampleIndex];
        if (callNodeIndex !== null) {
            var rootIndex = callNodeToRoot[callNodeIndex];
            var weight = samples.weight ? samples.weight[sampleIndex] : 1;
            callNodeSelf[rootIndex] += weight;
            callNodeLeaf[callNodeIndex] += weight;
        }
    }
    return { callNodeSelf: callNodeSelf, callNodeLeaf: callNodeLeaf };
}
/**
 * This is a helper function to get the stack timings for un-inverted call trees.
 */
function _getStackSelf(samples, callNodeTable, sampleIndexToCallNodeIndex) {
    var callNodeSelf = new Float32Array(callNodeTable.length);
    for (var sampleIndex = 0; sampleIndex < sampleIndexToCallNodeIndex.length; sampleIndex++) {
        var callNodeIndex = sampleIndexToCallNodeIndex[sampleIndex];
        if (callNodeIndex !== null) {
            var weight = samples.weight ? samples.weight[sampleIndex] : 1;
            callNodeSelf[callNodeIndex] += weight;
        }
    }
    return { callNodeSelf: callNodeSelf, callNodeLeaf: callNodeSelf };
}
/**
 * This computes all of the count and timing information displayed in the calltree.
 * It takes into account both the normal tree, and the inverted tree.
 *
 * Note: The "timionmgs" could have a number of different meanings based on the
 * what type of weight is in the SamplesLikeTable. For instance, it could be
 * milliseconds, sample counts, or bytes.
 */
function computeCallTreeCountsAndSummary(samples, _a, interval, invertCallstack) {
    var callNodeTable = _a.callNodeTable, stackIndexToCallNodeIndex = _a.stackIndexToCallNodeIndex;
    var sampleIndexToCallNodeIndex = profile_data_1.getSampleIndexToCallNodeIndex(samples.stack, stackIndexToCallNodeIndex);
    // Inverted trees need a different method for computing the timing.
    var _b = invertCallstack
        ? _getInvertedStackSelf(samples, callNodeTable, sampleIndexToCallNodeIndex)
        : _getStackSelf(samples, callNodeTable, sampleIndexToCallNodeIndex), callNodeSelf = _b.callNodeSelf, callNodeLeaf = _b.callNodeLeaf;
    // Compute the following variables:
    var callNodeTotalSummary = new Float32Array(callNodeTable.length);
    var callNodeChildCount = new Uint32Array(callNodeTable.length);
    var rootTotalSummary = 0;
    var rootCount = 0;
    // We loop the call node table in reverse, so that we find the children
    // before their parents, and the total is known at the time we reach a
    // node.
    for (var callNodeIndex = callNodeTable.length - 1; callNodeIndex >= 0; callNodeIndex--) {
        callNodeTotalSummary[callNodeIndex] += callNodeLeaf[callNodeIndex];
        rootTotalSummary += Math.abs(callNodeLeaf[callNodeIndex]);
        var hasChildren = callNodeChildCount[callNodeIndex] !== 0;
        var hasTotalValue = callNodeTotalSummary[callNodeIndex] !== 0;
        if (!hasChildren && !hasTotalValue) {
            continue;
        }
        var prefixCallNode = callNodeTable.prefix[callNodeIndex];
        if (prefixCallNode === -1) {
            rootCount++;
        }
        else {
            callNodeTotalSummary[prefixCallNode] +=
                callNodeTotalSummary[callNodeIndex];
            callNodeChildCount[prefixCallNode]++;
        }
    }
    return {
        callNodeSummary: {
            self: callNodeSelf,
            total: callNodeTotalSummary
        },
        callNodeChildCount: callNodeChildCount,
        rootTotalSummary: rootTotalSummary,
        rootCount: rootCount
    };
}
exports.computeCallTreeCountsAndSummary = computeCallTreeCountsAndSummary;
/**
 * An exported interface to get an instance of the CallTree class.
 * This handles computing timing information, and passing it all into
 * the CallTree constructor.
 */
function getCallTree(thread, interval, callNodeInfo, categories, implementationFilter, callTreeCountsAndSummary, weightType) {
    return time_code_1.timeCode('getCallTree', function () {
        var callNodeSummary = callTreeCountsAndSummary.callNodeSummary, callNodeChildCount = callTreeCountsAndSummary.callNodeChildCount, rootTotalSummary = callTreeCountsAndSummary.rootTotalSummary, rootCount = callTreeCountsAndSummary.rootCount;
        var jsOnly = implementationFilter === 'js';
        // By default add a single decimal value, e.g 13.1, 0.3, 5234.4
        return new CallTree(thread, categories, callNodeInfo.callNodeTable, callNodeSummary, callNodeChildCount, rootTotalSummary, rootCount, jsOnly, interval, Boolean(thread.isJsTracer), weightType);
    });
}
exports.getCallTree = getCallTree;
/**
 * This function takes the call tree summary strategy, and finds the appropriate data
 * structure. This can then be used by the call tree and other UI to report on the data.
 */
function extractSamplesLikeTable(thread, strategy) {
    switch (strategy) {
        case 'timing':
            return thread.samples;
        case 'js-allocations':
            return flow_1.ensureExists(thread.jsAllocations, 'Expected the NativeAllocationTable to exist when using a "js-allocation" strategy');
        case 'native-retained-allocations': {
            var nativeAllocations = flow_1.ensureExists(thread.nativeAllocations, 'Expected the NativeAllocationTable to exist when using a "native-allocation" strategy');
            /* istanbul ignore if */
            if (!nativeAllocations.memoryAddress) {
                throw new Error('Attempting to filter by retained allocations data that is missing the memory addresses.');
            }
            return ProfileData.filterToRetainedAllocations(nativeAllocations);
        }
        case 'native-allocations':
            return ProfileData.filterToAllocations(flow_1.ensureExists(thread.nativeAllocations, 'Expected the NativeAllocationTable to exist when using a "native-allocations" strategy'));
        case 'native-deallocations-sites':
            return ProfileData.filterToDeallocationsSites(flow_1.ensureExists(thread.nativeAllocations, 'Expected the NativeAllocationTable to exist when using a "native-deallocations-sites" strategy'));
        case 'native-deallocations-memory': {
            var nativeAllocations = flow_1.ensureExists(thread.nativeAllocations, 'Expected the NativeAllocationTable to exist when using a "native-deallocations-memory" strategy');
            /* istanbul ignore if */
            if (!nativeAllocations.memoryAddress) {
                throw new Error('Attempting to filter by retained allocations data that is missing the memory addresses.');
            }
            return ProfileData.filterToDeallocationsMemory(flow_1.ensureExists(nativeAllocations, 'Expected the NativeAllocationTable to exist when using a "js-allocation" strategy'));
        }
        /* istanbul ignore next */
        default:
            throw flow_1.assertExhaustiveCheck(strategy);
    }
}
exports.extractSamplesLikeTable = extractSamplesLikeTable;
/**
 * This function is extremely similar to computeCallTreeCountsAndSummary,
 * but is specialized for converting sample counts into traced timing. Samples
 * don't have duration information associated with them, it's mostly how long they
 * were observed to be running. This function computes the timing the exact same
 * way that the stack chart will display the information, so that timing information
 * will agree. In the past, timing was computed by samplingInterval * sampleCount.
 * This caused confusion when switching to the trace-based views when the numbers
 * did not agree. In order to remove confusion, we can show the sample counts,
 * plus the traced timing, which is a compromise between correctness, and consistency.
 */
function computeTracedTiming(samples, _a, interval, invertCallstack) {
    var callNodeTable = _a.callNodeTable, stackIndexToCallNodeIndex = _a.stackIndexToCallNodeIndex;
    if (samples.weightType !== 'samples' || samples.weight) {
        // Only compute for the samples weight types that have no weights. If a samples
        // table has weights then it's a diff profile. Currently, we aren't calculating
        // diff profiles, but it could be possible to compute this information twice,
        // once for positive weights, and once for negative weights, then sum them
        // together. At this time it's not really worth it.
        //
        // See https://github.com/firefox-devtools/profiler/issues/2615
        return null;
    }
    // Compute the timing duration, which is the time between this sample and the next.
    var weight = [];
    for (var sampleIndex = 0; sampleIndex < samples.length - 1; sampleIndex++) {
        weight.push(samples.time[sampleIndex + 1] - samples.time[sampleIndex]);
    }
    if (samples.length > 0) {
        // Use the sampling interval for the last sample.
        weight.push(interval);
    }
    var samplesWithWeight = __assign(__assign({}, samples), { weight: weight });
    var sampleIndexToCallNodeIndex = profile_data_1.getSampleIndexToCallNodeIndex(samples.stack, stackIndexToCallNodeIndex);
    // Inverted trees need a different method for computing the timing.
    var _b = invertCallstack
        ? _getInvertedStackSelf(samplesWithWeight, callNodeTable, sampleIndexToCallNodeIndex)
        : _getStackSelf(samplesWithWeight, callNodeTable, sampleIndexToCallNodeIndex), callNodeSelf = _b.callNodeSelf, callNodeLeaf = _b.callNodeLeaf;
    // Compute the following variables:
    var callNodeTotalSummary = new Float32Array(callNodeTable.length);
    var callNodeChildCount = new Uint32Array(callNodeTable.length);
    // We loop the call node table in reverse, so that we find the children
    // before their parents, and the total time is known at the time we reach a
    // node.
    for (var callNodeIndex = callNodeTable.length - 1; callNodeIndex >= 0; callNodeIndex--) {
        callNodeTotalSummary[callNodeIndex] += callNodeLeaf[callNodeIndex];
        var hasChildren = callNodeChildCount[callNodeIndex] !== 0;
        var hasTotalValue = callNodeTotalSummary[callNodeIndex] !== 0;
        if (!hasChildren && !hasTotalValue) {
            continue;
        }
        var prefixCallNode = callNodeTable.prefix[callNodeIndex];
        if (prefixCallNode !== -1) {
            callNodeTotalSummary[prefixCallNode] +=
                callNodeTotalSummary[callNodeIndex];
            callNodeChildCount[prefixCallNode]++;
        }
    }
    return {
        self: callNodeSelf,
        running: callNodeTotalSummary
    };
}
exports.computeTracedTiming = computeTracedTiming;
var templateObject_1, templateObject_2, templateObject_3;
