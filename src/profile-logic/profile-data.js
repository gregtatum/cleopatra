"use strict";
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.hasThreadKeys = exports.getThreadsKey = exports.getOrCreateURIResource = exports.extractProfileFilterPageData = exports.filterToRetainedAllocations = exports.filterToDeallocationsMemory = exports.filterToDeallocationsSites = exports.filterToAllocations = exports.getCategoryPairLabel = exports.shouldDisplaySubcategoryInfoForCategory = exports.getFriendlyStackTypeName = exports.getSampleCategories = exports.findBestAncestorCallNode = exports.getTreeOrderComparator = exports.getFuncNamesAndOriginsForPath = exports.getOriginAnnotationForFunc = exports.getThreadProcessDetails = exports.getFriendlyThreadName = exports.getSampleIndexClosestToTime = exports.updateThreadStacks = exports.invertCallstack = exports.computeCallNodeMaxDepth = exports.convertStackToCallNodePath = exports.getCallNodePathFromIndex = exports.getCallNodeIndexFromPath = exports.getCallNodeIndicesFromPaths = exports.processEventDelays = exports.accumulateCounterSamples = exports.filterCounterToRange = exports.filterThreadSamplesToRange = exports.getSampleIndexRangeForSelection = exports.filterThreadByTab = exports.filterThreadToSearchString = exports.filterThreadToSearchStrings = exports.filterThreadByImplementation = exports.toValidCallTreeSummaryStrategy = exports.toValidImplementationFilter = exports.defaultThreadOrder = exports.getTimeRangeIncludingAllThreads = exports.getTimeRangeForThread = exports.getTimingsForCallNodeIndex = exports.getTimingsForPath = exports.getLeafFuncIndex = exports.getSamplesSelectedStates = exports.getSampleIndexToCallNodeIndex = exports.getCallNodeInfo = void 0;
var memoize_immutable_1 = require("memoize-immutable");
var mixedtuplemap_1 = require("mixedtuplemap");
var data_structures_1 = require("./data-structures");
var bisect_1 = require("firefox-profiler/utils/bisect");
var flow_1 = require("../utils/flow");
var time_code_1 = require("../utils/time-code");
var path_1 = require("../utils/path");
/**
 * Various helpers for dealing with the profile as a data structure.
 * @module profile-data
 */
/**
 * Generate the CallNodeInfo which contains the CallNodeTable, and a map to convert
 * an IndexIntoStackTable to a IndexIntoCallNodeTable. This function runs through
 * a stackTable, and de-duplicates stacks that have frames that point to the same
 * function.
 *
 * See `src/types/profile-derived.js` for the type definitions.
 * See `docs-developer/call-trees.md` for a detailed explanation of CallNodes.
 */
function getCallNodeInfo(stackTable, frameTable, funcTable, defaultCategory) {
    return time_code_1.timeCode('getCallNodeInfo', function () {
        var stackIndexToCallNodeIndex = new Uint32Array(stackTable.length);
        var funcCount = funcTable.length;
        // Maps can't key off of two items, so combine the prefixCallNode and the funcIndex
        // using the following formula: prefixCallNode * funcCount + funcIndex => callNode
        var prefixCallNodeAndFuncToCallNodeMap = new Map();
        // The callNodeTable components.
        var prefix = [];
        var func = [];
        var category = [];
        var subcategory = [];
        var innerWindowID = [];
        var depth = [];
        var length = 0;
        function addCallNode(prefixIndex, funcIndex, categoryIndex, subcategoryIndex, windowID) {
            var index = length++;
            prefix[index] = prefixIndex;
            func[index] = funcIndex;
            category[index] = categoryIndex;
            subcategory[index] = subcategoryIndex;
            innerWindowID[index] = windowID;
            if (prefixIndex === -1) {
                depth[index] = 0;
            }
            else {
                depth[index] = depth[prefixIndex] + 1;
            }
        }
        // Go through each stack, and create a new callNode table, which is based off of
        // functions rather than frames.
        for (var stackIndex = 0; stackIndex < stackTable.length; stackIndex++) {
            var prefixStack = stackTable.prefix[stackIndex];
            // We know that at this point the following condition holds:
            // assert(prefixStack === null || prefixStack < stackIndex);
            var prefixCallNode = prefixStack === null ? -1 : stackIndexToCallNodeIndex[prefixStack];
            var frameIndex = stackTable.frame[stackIndex];
            var categoryIndex = stackTable.category[stackIndex];
            var subcategoryIndex = stackTable.subcategory[stackIndex];
            var windowID = frameTable.innerWindowID[frameIndex] || 0;
            var funcIndex = frameTable.func[frameIndex];
            var prefixCallNodeAndFuncIndex = prefixCallNode * funcCount + funcIndex;
            var callNodeIndex = prefixCallNodeAndFuncToCallNodeMap.get(prefixCallNodeAndFuncIndex);
            if (callNodeIndex === undefined) {
                callNodeIndex = length;
                addCallNode(prefixCallNode, funcIndex, categoryIndex, subcategoryIndex, windowID);
                prefixCallNodeAndFuncToCallNodeMap.set(prefixCallNodeAndFuncIndex, callNodeIndex);
            }
            else if (category[callNodeIndex] !== categoryIndex) {
                // Conflicting origin stack categories -> default category + subcategory.
                category[callNodeIndex] = defaultCategory;
                subcategory[callNodeIndex] = 0;
            }
            else if (subcategory[callNodeIndex] !== subcategoryIndex) {
                // Conflicting origin stack subcategories -> "Other" subcategory.
                subcategory[callNodeIndex] = 0;
            }
            stackIndexToCallNodeIndex[stackIndex] = callNodeIndex;
        }
        var callNodeTable = {
            prefix: new Int32Array(prefix),
            func: new Int32Array(func),
            category: new Int32Array(category),
            subcategory: new Int32Array(subcategory),
            innerWindowID: new Float64Array(innerWindowID),
            depth: depth,
            length: length
        };
        return { callNodeTable: callNodeTable, stackIndexToCallNodeIndex: stackIndexToCallNodeIndex };
    });
}
exports.getCallNodeInfo = getCallNodeInfo;
/**
 * Take a samples table, and return an array that contain indexes that point to the
 * leaf most call node, or null.
 */
function getSampleIndexToCallNodeIndex(stacks, stackIndexToCallNodeIndex) {
    return stacks.map(function (stack) {
        return stack === null ? null : stackIndexToCallNodeIndex[stack];
    });
}
exports.getSampleIndexToCallNodeIndex = getSampleIndexToCallNodeIndex;
/**
 * Go through the samples, and determine their current state.
 *
 * For samples that are neither 'FILTERED_OUT_*' nor 'SELECTED', this function compares
 * the sample's call node to the selected call node, in tree order. It uses the same
 * ordering as the function compareCallNodes in getTreeOrderComparator. But it does not
 * call compareCallNodes with the selected node for each sample's call node, because doing
 * so would recompute information about the selected call node on every call. Instead, it
 * has an equivalent implementation that is faster because it only computes information
 * about the selected call node's ancestors once.
 */
function getSamplesSelectedStates(callNodeTable, sampleCallNodes, activeTabFilteredCallNodes, selectedCallNodeIndex) {
    var result = new Array(sampleCallNodes.length);
    // Precompute an array containing the call node indexes for the selected call
    // node and its parents up to the root.
    // The case of when we have no selected call node is a special case: we won't
    // use these values but we still compute them to make the code simpler later.
    var selectedCallNodeDepth = selectedCallNodeIndex === -1 || selectedCallNodeIndex === null
        ? 0
        : callNodeTable.depth[selectedCallNodeIndex];
    var selectedCallNodeAtDepth = new Array(selectedCallNodeDepth);
    for (var callNodeIndex = selectedCallNodeIndex, depth = selectedCallNodeDepth; depth >= 0 && callNodeIndex !== null; depth--, callNodeIndex = callNodeTable.prefix[callNodeIndex]) {
        selectedCallNodeAtDepth[depth] = callNodeIndex;
    }
    /**
     * Take a call node, and compute its selected state.
     */
    function getSelectedStateFromCallNode(callNode, activeTabFilteredCallNode) {
        var callNodeIndex = callNode;
        if (callNodeIndex === null) {
            return activeTabFilteredCallNode === null
                ? // This sample was not part of the active tab.
                    'FILTERED_OUT_BY_ACTIVE_TAB'
                : // This sample was filtered out in the transform pipeline.
                    'FILTERED_OUT_BY_TRANSFORM';
        }
        // When there's no selected call node, we don't want to shadow everything
        // because everything is unselected. So let's decide this is as if
        // everything is selected so that anything not filtered out will be nicely
        // visible.
        if (selectedCallNodeIndex === null) {
            return 'SELECTED';
        }
        // Walk the call nodes toward the root, and get the call node at the depth
        // of the selected call node.
        var depth = callNodeTable.depth[callNodeIndex];
        while (depth > selectedCallNodeDepth) {
            callNodeIndex = callNodeTable.prefix[callNodeIndex];
            depth--;
        }
        if (callNodeIndex === selectedCallNodeIndex) {
            // This sample's call node at the depth matches the selected call node.
            return 'SELECTED';
        }
        // If we're here, it means that callNode is not selected, because it's not
        // an ancestor of selectedCallNodeIndex.
        // Determine if it's ordered "before" or "after" the selected call node,
        // in order to provide a stable ordering when rendering visualizations.
        // Walk the call nodes towards the root, until we find the common ancestor.
        // Once we've found the common ancestor, compare the order of the two
        // child nodes that we passed through, which are siblings.
        while (true) {
            var prevCallNodeIndex = callNodeIndex;
            callNodeIndex = callNodeTable.prefix[callNodeIndex];
            depth--;
            if (callNodeIndex === -1 ||
                callNodeIndex === selectedCallNodeAtDepth[depth]) {
                // callNodeIndex is the lowest common ancestor of selectedCallNodeIndex
                // and callNode. Compare the order of the two children that we passed
                // through on the way up to the ancestor. These nodes are siblings, so
                // their order is defined by the numerical order of call node indexes.
                return prevCallNodeIndex <= selectedCallNodeAtDepth[depth + 1]
                    ? 'UNSELECTED_ORDERED_BEFORE_SELECTED'
                    : 'UNSELECTED_ORDERED_AFTER_SELECTED';
            }
        }
        // This code is unreachable, but Flow doesn't know that and thinks this
        // function could return undefined. So throw an error.
        /* eslint-disable no-unreachable */
        throw new Error('unreachable');
        /* eslint-enable no-unreachable */
    }
    // Go through each sample, and label its state.
    for (var sampleIndex = 0; sampleIndex < sampleCallNodes.length; sampleIndex++) {
        result[sampleIndex] = getSelectedStateFromCallNode(sampleCallNodes[sampleIndex], activeTabFilteredCallNodes[sampleIndex]);
    }
    return result;
}
exports.getSamplesSelectedStates = getSamplesSelectedStates;
/**
 * This function returns the function index for a specific call node path. This
 * is the last element of this path, or the leaf element of the path.
 */
function getLeafFuncIndex(path) {
    if (path.length === 0) {
        throw new Error("getLeafFuncIndex assumes that the path isn't empty.");
    }
    return path[path.length - 1];
}
exports.getLeafFuncIndex = getLeafFuncIndex;
Milliseconds,
    subcategoryBreakdown;
Milliseconds[],
; // { [IndexIntoSubcategoryList]: Milliseconds }
;
{
     |
        // time spent excluding children
        value;
    Milliseconds,
        breakdownByImplementation;
    BreakdownByImplementation | null,
        breakdownByCategory;
    BreakdownByCategory | null,
    ;
}
totalTime: {
     |
        // time spent including children
        value;
    Milliseconds,
        breakdownByImplementation;
    BreakdownByImplementation | null,
        breakdownByCategory;
    BreakdownByCategory | null,
    ;
}
;
ItemTimings,
    // timings for this func across the tree
    forFunc;
ItemTimings,
    rootTime;
Milliseconds,
; // time for all the samples in the current tree
;
/**
 * This function is the same as getTimingsForPath, but accepts an IndexIntoCallNodeTable
 * instead of a CallNodePath.
 */
function getTimingsForPath(needlePath, callNodeInfo, interval, isInvertedTree, thread, unfilteredThread, sampleIndexOffset, categories, samples, unfilteredSamples) {
    return getTimingsForCallNodeIndex(getCallNodeIndexFromPath(needlePath, callNodeInfo.callNodeTable), callNodeInfo, interval, isInvertedTree, thread, unfilteredThread, sampleIndexOffset, categories, samples, unfilteredSamples);
}
exports.getTimingsForPath = getTimingsForPath;
/**
 * This function returns the timings for a specific path. The algorithm is
 * adjusted when the call tree is inverted.
 * Note that the unfilteredThread should be the original thread before any filtering
 * (by range or other) happens. Also sampleIndexOffset needs to be properly
 * specified and is the offset to be applied on thread's indexes to access
 * the same samples in unfilteredThread.
 */
function getTimingsForCallNodeIndex(needleNodeIndex, _a, interval, isInvertedTree, thread, unfilteredThread, sampleIndexOffset, categories, samples, unfilteredSamples) {
    /* ------------ Variables definitions ------------*/
    var callNodeTable = _a.callNodeTable, stackIndexToCallNodeIndex = _a.stackIndexToCallNodeIndex;
    // This is the data from the filtered thread that we'll loop over.
    var stackTable = thread.stackTable, stringTable = thread.stringTable;
    // This is the data from the unfiltered thread that we'll use to gather
    // category and JS implementation information. Note that samples are offset by
    // `sampleIndexOffset` because of range filtering.
    var unfilteredStackTable = unfilteredThread.stackTable, unfilteredFuncTable = unfilteredThread.funcTable, unfilteredFrameTable = unfilteredThread.frameTable;
    // This holds the category index for the JavaScript category, so that we can
    // use it to quickly check the category later on.
    var javascriptCategoryIndex = categories.findIndex(function (_a) {
        var name = _a.name;
        return name === 'JavaScript';
    });
    // This object holds the timings for the current call node path, specified by
    // needleNodeIndex.
    var pathTimings = {
        selfTime: {
            value: 0,
            breakdownByImplementation: null,
            breakdownByCategory: null
        },
        totalTime: {
            value: 0,
            breakdownByImplementation: null,
            breakdownByCategory: null
        }
    };
    // This object holds the timings for the function (all occurrences) pointed by
    // the specified call node.
    var funcTimings = {
        selfTime: {
            value: 0,
            breakdownByImplementation: null,
            breakdownByCategory: null
        },
        totalTime: {
            value: 0,
            breakdownByImplementation: null,
            breakdownByCategory: null
        }
    };
    // This holds the root time, it's incremented for all samples and is useful to
    // have an absolute value to compare the other values with.
    var rootTime = 0;
    /* -------- End of variable definitions ------- */
    /* ------------ Functions definitions --------- *
     * We define functions here so that they have easy access to the variables and
     * the algorithm's parameters. */
    /**
     * This function is called for native stacks. If the native stack has the
     * 'JavaScript' category, then we move up the call tree to find the nearest
     * ancestor that's JS and returns its JS implementation.
     */
    function getImplementationForNativeStack(unfilteredStackIndex) {
        var category = unfilteredStackTable.category[unfilteredStackIndex];
        if (category !== javascriptCategoryIndex) {
            return 'native';
        }
        for (var currentStackIndex = unfilteredStackIndex; currentStackIndex !== null; currentStackIndex = unfilteredStackTable.prefix[currentStackIndex]) {
            var frameIndex = unfilteredStackTable.frame[currentStackIndex];
            var funcIndex = unfilteredFrameTable.func[frameIndex];
            var isJS = unfilteredFuncTable.isJS[funcIndex];
            if (isJS) {
                return getImplementationForJsStack(frameIndex);
            }
        }
        // No JS frame was found in the ancestors, this is weird but why not?
        return 'native';
    }
    /**
     * This function Returns the JS implementation information for a specific JS stack.
     */
    function getImplementationForJsStack(unfilteredFrameIndex) {
        var jsImplementationStrIndex = unfilteredFrameTable.implementation[unfilteredFrameIndex];
        if (jsImplementationStrIndex === null) {
            return 'interpreter';
        }
        var jsImplementation = stringTable.getString(jsImplementationStrIndex);
        switch (jsImplementation) {
            case 'baseline':
            case 'blinterp':
            case 'ion':
                return jsImplementation;
            default:
                return 'unknown';
        }
    }
    function getImplementationForStack(thisSampleIndex) {
        var stackIndex = unfilteredSamples.stack[thisSampleIndex + sampleIndexOffset];
        if (stackIndex === null) {
            // This should not happen in the unfiltered thread.
            console.error('We got a null stack, this should not happen.');
            return 'native';
        }
        var frameIndex = unfilteredStackTable.frame[stackIndex];
        var funcIndex = unfilteredFrameTable.func[frameIndex];
        var implementation = unfilteredFuncTable.isJS[funcIndex]
            ? getImplementationForJsStack(frameIndex)
            : getImplementationForNativeStack(stackIndex);
        return implementation;
    }
    /**
     * This is a small utility function to more easily add data to breakdowns.
     * The funcIndex could be computed from the stackIndex but is provided as an
     * argument because it's been already computed when this function is called.
     */
    function accumulateDataToTimings(timings, sampleIndex, stackIndex, duration) {
        // Step 1: increment the total value
        timings.value += duration;
        // Step 2: find the implementation value for this sample
        var implementation = getImplementationForStack(sampleIndex);
        // Step 3: increment the right value in the implementation breakdown
        if (timings.breakdownByImplementation === null) {
            timings.breakdownByImplementation = {};
        }
        if (timings.breakdownByImplementation[implementation] === undefined) {
            timings.breakdownByImplementation[implementation] = 0;
        }
        timings.breakdownByImplementation[implementation] += duration;
        // step 4: find the category value for this stack. We want to use the
        // category of the unfilteredThread.
        var unfilteredStackIndex = unfilteredSamples.stack[sampleIndex + sampleIndexOffset];
        if (unfilteredStackIndex !== null) {
            var categoryIndex = unfilteredStackTable.category[unfilteredStackIndex];
            var subcategoryIndex = unfilteredStackTable.subcategory[unfilteredStackIndex];
            // step 5: increment the right value in the category breakdown
            if (timings.breakdownByCategory === null) {
                timings.breakdownByCategory = categories.map(function (category) { return ({
                    entireCategoryValue: 0,
                    subcategoryBreakdown: Array(category.subcategories.length).fill(0)
                }); });
            }
            timings.breakdownByCategory[categoryIndex].entireCategoryValue += duration;
            timings.breakdownByCategory[categoryIndex].subcategoryBreakdown[subcategoryIndex] += duration;
        }
    }
    /* ------------- End of function definitions ------------- */
    /* ------------ Start of the algorithm itself ------------ */
    if (needleNodeIndex === null) {
        // No index was provided, return empty timing information.
        return { forPath: pathTimings, forFunc: funcTimings, rootTime: rootTime };
    }
    // This is the function index for this call node.
    var needleFuncIndex = callNodeTable.func[needleNodeIndex];
    // Loop over each sample and accumulate the self time, running time, and
    // the implementation breakdown.
    for (var sampleIndex = 0; sampleIndex < samples.length; sampleIndex++) {
        var thisStackIndex = samples.stack[sampleIndex];
        if (thisStackIndex === null) {
            continue;
        }
        var weight = samples.weight ? samples.weight[sampleIndex] : 1;
        rootTime += Math.abs(weight);
        var thisNodeIndex = stackIndexToCallNodeIndex[thisStackIndex];
        var thisFunc = callNodeTable.func[thisNodeIndex];
        if (!isInvertedTree) {
            // For non-inverted trees, we compute the self time from the stacks' leaf nodes.
            if (thisNodeIndex === needleNodeIndex) {
                accumulateDataToTimings(pathTimings.selfTime, sampleIndex, thisStackIndex, weight);
            }
            if (thisFunc === needleFuncIndex) {
                accumulateDataToTimings(funcTimings.selfTime, sampleIndex, thisStackIndex, weight);
            }
        }
        // Use the stackTable to traverse the call node path and get various
        // measurements.
        // We don't use getCallNodePathFromIndex because we don't need the result
        // itself, and it's costly to get. Moreover we can break out of the loop
        // early if necessary.
        var funcFound = false;
        var pathFound = false;
        var nextStackIndex = void 0;
        for (var currentStackIndex = thisStackIndex; currentStackIndex !== null; currentStackIndex = nextStackIndex) {
            var currentNodeIndex = stackIndexToCallNodeIndex[currentStackIndex];
            var currentFuncIndex = callNodeTable.func[currentNodeIndex];
            nextStackIndex = stackTable.prefix[currentStackIndex];
            if (currentNodeIndex === needleNodeIndex) {
                // One of the parents is the exact passed path.
                // For non-inverted trees, we can contribute the data to the
                // implementation breakdown now.
                // Note that for inverted trees, we need to traverse up to the root node
                // first, see below for this.
                if (!isInvertedTree) {
                    accumulateDataToTimings(pathTimings.totalTime, sampleIndex, thisStackIndex, weight);
                }
                pathFound = true;
            }
            if (!funcFound && currentFuncIndex === needleFuncIndex) {
                // One of the parents' func is the same function as the passed path.
                // Note we could have the same function several times in the stack, so
                // we need a boolean variable to prevent adding it more than once.
                // The boolean variable will also be used to accumulate timings for
                // inverted trees below.
                if (!isInvertedTree) {
                    accumulateDataToTimings(funcTimings.totalTime, sampleIndex, thisStackIndex, weight);
                }
                funcFound = true;
            }
            // When the tree isn't inverted, we don't need to move further up the call
            // node if we already found all the data.
            // But for inverted trees, the selfTime is counted on the root node so we
            // need to go on looping the stack until we find it.
            if (!isInvertedTree && funcFound && pathFound) {
                // As explained above, for non-inverted trees, we can break here if we
                // found everything already.
                break;
            }
            if (isInvertedTree && nextStackIndex === null) {
                // This is an inverted tree, and we're at the root node because its
                // prefix is `null`.
                if (currentNodeIndex === needleNodeIndex) {
                    // This root node matches the passed call node path.
                    // This is the only place where we don't accumulate timings, mainly
                    // because this would be the same as for the total time.
                    pathTimings.selfTime.value += weight;
                }
                if (currentFuncIndex === needleFuncIndex) {
                    // This root node is the same function as the passed call node path.
                    accumulateDataToTimings(funcTimings.selfTime, sampleIndex, currentStackIndex, weight);
                }
                if (pathFound) {
                    // We contribute the implementation information if the passed path was
                    // found in this stack earlier.
                    accumulateDataToTimings(pathTimings.totalTime, sampleIndex, currentStackIndex, weight);
                }
                if (funcFound) {
                    // We contribute the implementation information if the leaf function
                    // of the passed path was found in this stack earlier.
                    accumulateDataToTimings(funcTimings.totalTime, sampleIndex, currentStackIndex, weight);
                }
            }
        }
    }
    return { forPath: pathTimings, forFunc: funcTimings, rootTime: rootTime };
}
exports.getTimingsForCallNodeIndex = getTimingsForCallNodeIndex;
// This function computes the time range for a thread, using both its samples
// and markers data. It's memoized and exported below, because it's called both
// here in getTimeRangeIncludingAllThreads, and in selectors when dealing with
// markers.
// Because `getTimeRangeIncludingAllThreads` is called in a reducer and it's
// quite complex to change this, the memoization happens here.
// When changing the signature, please accordingly check that the map class used
// for memoization is still the right one.
function _getTimeRangeForThread(_a, interval) {
    var samples = _a.samples, markers = _a.markers, jsAllocations = _a.jsAllocations, nativeAllocations = _a.nativeAllocations;
    var result = { start: Infinity, end: -Infinity };
    if (samples.length) {
        var lastSampleIndex = samples.length - 1;
        result.start = samples.time[0];
        result.end = samples.time[lastSampleIndex] + interval;
    }
    else if (markers.length) {
        // Looking at the markers only if there are no samples in the profile.
        // We need to look at those because it can be a marker only profile(no-sampling mode).
        // Finding start and end times sadly requires looping through all markers :(
        for (var i = 0; i < markers.length; i++) {
            var startTime = markers.startTime[i];
            var endTime = markers.endTime[i];
            // The resulting range needs to adjust BOTH the start and end of the range, as
            // each marker type could adjust the total range beyond the current bounds.
            // Note the use of Math.min and Math.max are different for the start and end
            // of the markers.
            if (startTime !== null) {
                // This is either an Instant, IntervalStart, or Interval marker.
                result.start = Math.min(result.start, startTime);
                result.end = Math.max(result.end, startTime + interval);
            }
            if (endTime !== null) {
                // This is either an Interval or IntervalEnd marker.
                result.start = Math.min(result.start, endTime);
                result.end = Math.max(result.end, endTime + interval);
            }
        }
    }
    if (jsAllocations) {
        // For good measure, also check the allocations. This is mainly so that tests
        // will behave nicely.
        var lastIndex = jsAllocations.length - 1;
        result.start = Math.min(result.start, jsAllocations.time[0]);
        result.end = Math.max(result.end, jsAllocations.time[lastIndex] + interval);
    }
    if (nativeAllocations) {
        // For good measure, also check the allocations. This is mainly so that tests
        // will behave nicely.
        var lastIndex = nativeAllocations.length - 1;
        result.start = Math.min(result.start, nativeAllocations.time[0]);
        result.end = Math.max(result.end, nativeAllocations.time[lastIndex] + interval);
    }
    return result;
}
// We do a full memoization because it's called for several different threads.
// But it won't be called more than once per thread.
// Note that because MixedTupleMap internally uses a WeakMap, it should properly
// free the memory when we load another profile (for example when dealing with
// zip files).
var memoizedGetTimeRangeForThread = memoize_immutable_1["default"](_getTimeRangeForThread, {
    // We use a MixedTupleMap because the function takes both primitive and
    // complex types.
    cache: new mixedtuplemap_1["default"]()
});
exports.getTimeRangeForThread = memoizedGetTimeRangeForThread;
function getTimeRangeIncludingAllThreads(profile) {
    var completeRange = { start: Infinity, end: -Infinity };
    profile.threads.forEach(function (thread) {
        var threadRange = memoizedGetTimeRangeForThread(thread, profile.meta.interval);
        completeRange.start = Math.min(completeRange.start, threadRange.start);
        completeRange.end = Math.max(completeRange.end, threadRange.end);
    });
    return completeRange;
}
exports.getTimeRangeIncludingAllThreads = getTimeRangeIncludingAllThreads;
function defaultThreadOrder(threads) {
    var threadOrder = threads.map(function (thread, i) { return i; });
    // Note: to have a consistent behavior independant of the sorting algorithm,
    // we need to be careful that the comparator function is consistent:
    // comparator(a, b) === - comparator(b, a)
    // and
    // comparator(a, b) === 0   if and only if   a === b
    threadOrder.sort(function (a, b) {
        var nameA = threads[a].name;
        var nameB = threads[b].name;
        if (nameA === nameB) {
            return a - b;
        }
        // Put the compositor/renderer thread last.
        // Compositor will always be before Renderer, if both are present.
        if (nameA === 'Compositor') {
            return 1;
        }
        if (nameB === 'Compositor') {
            return -1;
        }
        if (nameA === 'Renderer') {
            return 1;
        }
        if (nameB === 'Renderer') {
            return -1;
        }
        // Otherwise keep the existing order. We don't return 0 to guarantee that
        // the sort is stable even if the sort algorithm isn't.
        return a - b;
    });
    return threadOrder;
}
exports.defaultThreadOrder = defaultThreadOrder;
function toValidImplementationFilter(implementation) {
    switch (implementation) {
        case 'cpp':
        case 'js':
            return implementation;
        default:
            return 'combined';
    }
}
exports.toValidImplementationFilter = toValidImplementationFilter;
function toValidCallTreeSummaryStrategy(strategy) {
    switch (strategy) {
        case 'timing':
        case 'js-allocations':
        case 'native-retained-allocations':
        case 'native-allocations':
        case 'native-deallocations-sites':
        case 'native-deallocations-memory':
            return strategy;
        default:
            // Default to "timing" if the strategy is not recognized. This value can come
            // from a user-generated URL.
            // e.g. `profiler.firefox.com/public/hash/ctSummary=tiiming` (note the typo.)
            // This default branch will ensure we don't send values we don't understand to
            // the store.
            return 'timing';
    }
}
exports.toValidCallTreeSummaryStrategy = toValidCallTreeSummaryStrategy;
function filterThreadByImplementation(thread, implementation, defaultCategory) {
    var funcTable = thread.funcTable, stringTable = thread.stringTable;
    switch (implementation) {
        case 'cpp':
            return _filterThreadByFunc(thread, function (funcIndex) {
                // Return quickly if this is a JS frame.
                if (funcTable.isJS[funcIndex]) {
                    return false;
                }
                // Regular C++ functions are associated with a resource that describes the
                // shared library that these C++ functions were loaded from. Jitcode is not
                // loaded from shared libraries but instead generated at runtime, so Jitcode
                // frames are not associated with a shared library and thus have no resource
                var locationString = stringTable.getString(funcTable.name[funcIndex]);
                var isProbablyJitCode = funcTable.resource[funcIndex] === -1 &&
                    locationString.startsWith('0x');
                return !isProbablyJitCode;
            }, defaultCategory);
        case 'js':
            return _filterThreadByFunc(thread, function (funcIndex) {
                return (funcTable.isJS[funcIndex] || funcTable.relevantForJS[funcIndex]);
            }, defaultCategory);
        default:
            return thread;
    }
}
exports.filterThreadByImplementation = filterThreadByImplementation;
function _filterThreadByFunc(thread, filter, boolean, defaultCategory) {
    return time_code_1.timeCode('filterThread', function () {
        var stackTable = thread.stackTable, frameTable = thread.frameTable;
        var newStackTable = {
            length: 0,
            frame: [],
            prefix: [],
            category: [],
            subcategory: []
        };
        var oldStackToNewStack = new Map();
        var frameCount = frameTable.length;
        var prefixStackAndFrameToStack = new Map(); // prefixNewStack * frameCount + frame => newStackIndex
        function convertStack(stackIndex) {
            if (stackIndex === null) {
                return null;
            }
            var newStack = oldStackToNewStack.get(stackIndex);
            if (newStack === undefined) {
                var prefixNewStack = convertStack(stackTable.prefix[stackIndex]);
                var frameIndex = stackTable.frame[stackIndex];
                var funcIndex = frameTable.func[frameIndex];
                if (filter(funcIndex)) {
                    var prefixStackAndFrameIndex = (prefixNewStack === null ? -1 : prefixNewStack) * frameCount +
                        frameIndex;
                    newStack = prefixStackAndFrameToStack.get(prefixStackAndFrameIndex);
                    if (newStack === undefined) {
                        newStack = newStackTable.length++;
                        newStackTable.prefix[newStack] = prefixNewStack;
                        newStackTable.frame[newStack] = frameIndex;
                        newStackTable.category[newStack] = stackTable.category[stackIndex];
                        newStackTable.subcategory[newStack] =
                            stackTable.subcategory[stackIndex];
                    }
                    else if (newStackTable.category[newStack] !== stackTable.category[stackIndex]) {
                        // Conflicting origin stack categories -> default category + subcategory.
                        newStackTable.category[newStack] = defaultCategory;
                        newStackTable.subcategory[newStack] = 0;
                    }
                    else if (newStackTable.subcategory[stackIndex] !==
                        stackTable.subcategory[stackIndex]) {
                        // Conflicting origin stack subcategories -> "Other" subcategory.
                        newStackTable.subcategory[stackIndex] = 0;
                    }
                    oldStackToNewStack.set(stackIndex, newStack);
                    prefixStackAndFrameToStack.set(prefixStackAndFrameIndex, newStack);
                }
                else {
                    newStack = prefixNewStack;
                }
            }
            return newStack;
        }
        return updateThreadStacks(thread, newStackTable, convertStack);
    });
}
function filterThreadToSearchStrings(thread, searchStrings) {
    return time_code_1.timeCode('filterThreadToSearchStrings', function () {
        if (!searchStrings || !searchStrings.length) {
            return thread;
        }
        return searchStrings.reduce(filterThreadToSearchString, thread);
    });
}
exports.filterThreadToSearchStrings = filterThreadToSearchStrings;
function filterThreadToSearchString(thread, searchString) {
    if (!searchString) {
        return thread;
    }
    var lowercaseSearchString = searchString.toLowerCase();
    var funcTable = thread.funcTable, frameTable = thread.frameTable, stackTable = thread.stackTable, stringTable = thread.stringTable, resourceTable = thread.resourceTable;
    function computeFuncMatchesFilter(func) {
        var nameIndex = funcTable.name[func];
        var nameString = stringTable.getString(nameIndex);
        if (nameString.toLowerCase().includes(lowercaseSearchString)) {
            return true;
        }
        var fileNameIndex = funcTable.fileName[func];
        if (fileNameIndex !== null) {
            var fileNameString = stringTable.getString(fileNameIndex);
            if (fileNameString.toLowerCase().includes(lowercaseSearchString)) {
                return true;
            }
        }
        var resourceIndex = funcTable.resource[func];
        var resourceNameIndex = resourceTable.name[resourceIndex];
        if (resourceNameIndex !== undefined) {
            var resourceNameString = stringTable.getString(resourceNameIndex);
            if (resourceNameString.toLowerCase().includes(lowercaseSearchString)) {
                return true;
            }
        }
        return false;
    }
    var funcMatchesFilterCache = new Map();
    function funcMatchesFilter(func) {
        var result = funcMatchesFilterCache.get(func);
        if (result === undefined) {
            result = computeFuncMatchesFilter(func);
            funcMatchesFilterCache.set(func, result);
        }
        return result;
    }
    var stackMatchesFilterCache = new Map();
    function stackMatchesFilter(stackIndex) {
        if (stackIndex === null) {
            return false;
        }
        var result = stackMatchesFilterCache.get(stackIndex);
        if (result === undefined) {
            var prefix = stackTable.prefix[stackIndex];
            if (stackMatchesFilter(prefix)) {
                result = true;
            }
            else {
                var frame = stackTable.frame[stackIndex];
                var func = frameTable.func[frame];
                result = funcMatchesFilter(func);
            }
            stackMatchesFilterCache.set(stackIndex, result);
        }
        return result;
    }
    return updateThreadStacks(thread, stackTable, function (stackIndex) {
        return stackMatchesFilter(stackIndex) ? stackIndex : null;
    });
}
exports.filterThreadToSearchString = filterThreadToSearchString;
/**
 * We have page data(innerWindowID) inside the JS frames. Go through each sample
 * and filter out the ones that don't include any JS frame with the relevant innerWindowID.
 * Please note that it also keeps native frames if that sample has a relevant JS
 * frame in any part of the stack. Also it doesn't mutate the stack itself, only
 * nulls the stack array elements of samples object. Therefore, it doesn't
 * invalidate transforms.
 * If we don't have any item in relevantPages, returns all the samples.
 */
function filterThreadByTab(thread, relevantPages) {
    return time_code_1.timeCode('filterThreadByTab', function () {
        if (relevantPages.size === 0) {
            // Either there is no relevant page or "active tab only" view is not active.
            return thread;
        }
        var frameTable = thread.frameTable, stackTable = thread.stackTable;
        // innerWindowID array lives inside the frameTable. Check that and decide
        // if we should keep that sample or not.
        var frameMatchesFilterCache = new Map();
        function frameMatchesFilter(frame) {
            var cache = frameMatchesFilterCache.get(frame);
            if (cache !== undefined) {
                return cache;
            }
            var innerWindowID = frameTable.innerWindowID[frame];
            var matches = innerWindowID && innerWindowID > 0
                ? relevantPages.has(innerWindowID)
                : false;
            frameMatchesFilterCache.set(frame, matches);
            return matches;
        }
        // Use the stackTable to navigate to frameTable and cache the result of it.
        var stackMatchesFilterCache = new Map();
        function stackMatchesFilter(stackIndex) {
            if (stackIndex === null) {
                return false;
            }
            var cache = stackMatchesFilterCache.get(stackIndex);
            if (cache !== undefined) {
                return cache;
            }
            var prefix = stackTable.prefix[stackIndex];
            if (stackMatchesFilter(prefix)) {
                stackMatchesFilterCache.set(stackIndex, true);
                return true;
            }
            var frame = stackTable.frame[stackIndex];
            var matches = frameMatchesFilter(frame);
            stackMatchesFilterCache.set(stackIndex, matches);
            return matches;
        }
        // Update the stack array elements of samples object and make them null if
        // they don't include any relevant JS frame.
        // It doesn't mutate the stack itself.
        return updateThreadStacks(thread, stackTable, function (stackIndex) {
            return stackMatchesFilter(stackIndex) ? stackIndex : null;
        });
    });
}
exports.filterThreadByTab = filterThreadByTab;
/**
 * This function takes both a SamplesTable and can be used on CounterSamplesTable.
 */
function getSampleIndexRangeForSelection(table, rangeStart, rangeEnd) {
    var sampleStart = bisect_1.bisectionLeft(table.time, rangeStart);
    var sampleEnd = bisect_1.bisectionLeft(table.time, rangeEnd, sampleStart);
    return [sampleStart, sampleEnd];
}
exports.getSampleIndexRangeForSelection = getSampleIndexRangeForSelection;
function filterThreadSamplesToRange(thread, rangeStart, rangeEnd) {
    var samples = thread.samples, jsAllocations = thread.jsAllocations, nativeAllocations = thread.nativeAllocations;
    var _a = getSampleIndexRangeForSelection(samples, rangeStart, rangeEnd), beginSampleIndex = _a[0], endSampleIndex = _a[1];
    var newSamples = {
        length: endSampleIndex - beginSampleIndex,
        time: samples.time.slice(beginSampleIndex, endSampleIndex),
        weight: samples.weight
            ? samples.weight.slice(beginSampleIndex, endSampleIndex)
            : null,
        weightType: samples.weightType,
        stack: samples.stack.slice(beginSampleIndex, endSampleIndex)
    };
    if (samples.eventDelay) {
        newSamples.eventDelay = samples.eventDelay.slice(beginSampleIndex, endSampleIndex);
    }
    else if (samples.responsiveness) {
        newSamples.responsiveness = samples.responsiveness.slice(beginSampleIndex, endSampleIndex);
    }
    var newThread = __assign(__assign({}, thread), { samples: newSamples });
    if (jsAllocations) {
        var _b = getSampleIndexRangeForSelection(jsAllocations, rangeStart, rangeEnd), startAllocIndex = _b[0], endAllocIndex = _b[1];
        newThread.jsAllocations = {
            time: jsAllocations.time.slice(startAllocIndex, endAllocIndex),
            className: jsAllocations.className.slice(startAllocIndex, endAllocIndex),
            typeName: jsAllocations.typeName.slice(startAllocIndex, endAllocIndex),
            coarseType: jsAllocations.coarseType.slice(startAllocIndex, endAllocIndex),
            weight: jsAllocations.weight.slice(startAllocIndex, endAllocIndex),
            weightType: jsAllocations.weightType,
            inNursery: jsAllocations.inNursery.slice(startAllocIndex, endAllocIndex),
            stack: jsAllocations.stack.slice(startAllocIndex, endAllocIndex),
            length: endAllocIndex - startAllocIndex
        };
    }
    if (nativeAllocations) {
        var _c = getSampleIndexRangeForSelection(nativeAllocations, rangeStart, rangeEnd), startAllocIndex = _c[0], endAllocIndex = _c[1];
        var time = nativeAllocations.time.slice(startAllocIndex, endAllocIndex);
        var weight = nativeAllocations.weight.slice(startAllocIndex, endAllocIndex);
        var stack = nativeAllocations.stack.slice(startAllocIndex, endAllocIndex);
        var length_1 = endAllocIndex - startAllocIndex;
        if (nativeAllocations.memoryAddress) {
            newThread.nativeAllocations = {
                time: time,
                weight: weight,
                weightType: nativeAllocations.weightType,
                stack: stack,
                memoryAddress: nativeAllocations.memoryAddress.slice(startAllocIndex, endAllocIndex),
                threadId: nativeAllocations.threadId.slice(startAllocIndex, endAllocIndex),
                length: length_1
            };
        }
        else {
            newThread.nativeAllocations = {
                time: time,
                weight: weight,
                weightType: nativeAllocations.weightType,
                stack: stack,
                length: length_1
            };
        }
    }
    return newThread;
}
exports.filterThreadSamplesToRange = filterThreadSamplesToRange;
function filterCounterToRange(counter, rangeStart, rangeEnd) {
    var filteredGroups = counter.sampleGroups.map(function (sampleGroup) {
        var samples = sampleGroup.samples;
        var _a = getSampleIndexRangeForSelection(samples, rangeStart, rangeEnd), sBegin = _a[0], sEnd = _a[1];
        // Include the samples just before and after the selection range, so that charts will
        // not be cut off at the edges.
        if (sBegin > 0) {
            sBegin--;
        }
        if (sEnd < samples.length) {
            sEnd++;
        }
        var count = samples.count.slice(sBegin, sEnd);
        var number = samples.number.slice(sBegin, sEnd);
        if (sBegin === 0) {
            // These lines zero out the first values of the counters, as they are unreliable. In
            // addition, there are probably some missed counts in the memory counters, so the
            // first memory number slowly creeps up over time, and becomes very unrealistic.
            // In order to not be affected by these platform limitations, zero out the first
            // counter values.
            //
            // "Memory counter in Gecko Profiler isn't cleared when starting a new capture"
            // https://bugzilla.mozilla.org/show_bug.cgi?id=1520587
            count[0] = 0;
            number[0] = 0;
        }
        return __assign(__assign({}, sampleGroup), { samples: {
                time: samples.time.slice(sBegin, sEnd),
                number: number,
                count: count,
                length: sEnd - sBegin
            } });
    });
    return __assign(__assign({}, counter), { sampleGroups: filteredGroups });
}
exports.filterCounterToRange = filterCounterToRange;
/**
 * The memory counter contains relative offsets of memory. In order to draw an interesting
 * graph, take the memory counts, and find the minimum and maximum values, by
 * accumulating them over the entire profile range. Then, map those values to the
 * accumulatedCounts array.
 */
function accumulateCounterSamples(samplesArray) {
    var accumulatedSamples = samplesArray.map(function (samples) {
        var minCount = 0;
        var maxCount = 0;
        var accumulated = 0;
        var accumulatedCounts = [];
        for (var i = 0; i < samples.length; i++) {
            accumulated += samples.count[i];
            minCount = Math.min(accumulated, minCount);
            maxCount = Math.max(accumulated, maxCount);
            accumulatedCounts[i] = accumulated;
        }
        var countRange = maxCount - minCount;
        return {
            minCount: minCount,
            maxCount: maxCount,
            countRange: countRange,
            accumulatedCounts: accumulatedCounts
        };
    });
    return accumulatedSamples;
}
exports.accumulateCounterSamples = accumulateCounterSamples;
/**
 * Pre-processing of raw eventDelay values.
 *
 * We don't do 16ms event injection for responsiveness values anymore. Instead,
 * profiler records the time since running event blocked the input events. But
 * this value is not enough to calculate event delays by itself. We need to process
 * these values and turn them into event delays, which we can use for determining
 * responsiveness later.
 *
 * For every event that gets enqueued, the delay time will go up by the event's
 * running time at the time at which the event is enqueued. The delay function
 * will be a sawtooth of the following shape:
 *
 *              |\           |...
 *              | \          |
 *         |\   |  \         |
 *         | \  |   \        |
 *      |\ |  \ |    \       |
 *   |\ | \|   \|     \      |
 *   | \|              \     |
 *  _|                  \____|
 *
 * Calculate the delay of a new event added at time t: (run every sample)
 *
 *  TimeSinceRunningEventBlockedInputEvents = RunningEventDelay + (now - RunningEventStart);
 *  effective_submission = now - TimeSinceRunningEventBlockedInputEvents;
 *  delta = (now - last_sample_time);
 *  last_sample_time = now;
 *  for (t=effective_submission to now) {
 *     delay[t] += delta;
 *  }
 *
 * Note that TimeSinceRunningEventBlockedInputEvents is our eventDelay values in
 * the profile. So we don't have to calculate this. It's calculated in the gecko side already.
 *
 * This first algorithm is not efficient because we are running this loop for each sample.
 * Instead it can be reduced in overhead by:
 *
 *  TimeSinceRunningEventBlockedInputEvents = RunningEventDelay + (now - RunningEventStart);
 *  effective_submission = now - TimeSinceRunningEventBlockedInputEvents;
 *  if (effective_submission != last_submission) {
 *    delta = (now - last_submission);
 *    // this loop should be made to match each sample point in the range
 *    // intead of assuming 1ms sampling as this pseudocode does
 *    for (t=last_submission to effective_submission-1) {
 *       delay[t] += delta;
 *       delta -= 1; // assumes 1ms; adjust as needed to match for()
 *    }
 *    last_submission = effective_submission;
 *  }
 *
 * In this algorithm, we are running this only if effective submission is changed.
 * This reduces the calculation overhead a lot.
 * So we used the second algorithm in this function to make it faster.
 *
 * For instance the processed eventDelay values will be something like this:
 *
 *   [12 , 3, 42, 31, 22, 10, 3, 71, 65, 42, 23, 3, 33, 25, 5, 3]
 *         |___|              |___|              |___|
 *     A new event is    New event is enqueued   New event is enqueued
 *     enqueued
 *
 * A more realistic and minimal example:
 *  Unprocessed values
 *
 *   [0, 0, 1, 0, 0, 0, 0, 1, 2, 3, 4, 5, 0, 0, 0, 0]
 *          ^last submission           ^ effective submission
 *
 *  Will be converted to:
 *
 *   [0, 0, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]
 *
 * If you want to learn more about this eventDelay value on gecko side, see:
 * https://searchfox.org/mozilla-central/rev/3811b11b5773c1dccfe8228bfc7143b10a9a2a99/tools/profiler/core/platform.cpp#3000-3186
 */
function processEventDelays(samples, interval) {
    if (!samples.eventDelay) {
        throw new Error('processEventDelays step should not be called for older profiles');
    }
    var eventDelays = new Float32Array(samples.length);
    var rawEventDelays = flow_1.ensureExists(samples.eventDelay, 'eventDelays field is not present in this profile');
    var lastSubmission = samples.time[0];
    var lastSubmissionIdx = 0;
    // Skipping the first element because we don't have any sample of its past.
    for (var i = 1; i < samples.length; i++) {
        var currentEventDelay = rawEventDelays[i];
        var nextEventDelay = rawEventDelays[i + 1] || 0; // it can be null or undefined (for the last element)
        var now = samples.time[i];
        if (currentEventDelay === null || currentEventDelay === undefined) {
            // Ignore anything that's not numeric. This can happen if there is no responsiveness
            // information, or if the sampler failed to collect a responsiveness value. This
            // can happen intermittently.
            //
            // See Bug 1506226.
            continue;
        }
        if (currentEventDelay < nextEventDelay) {
            // The submission is still ongoing, we should get the next event delay
            // value until the submission ends.
            continue;
        }
        // This is a new submission
        var sampleSinceBlockedEvents = Math.trunc(currentEventDelay / interval);
        var effectiveSubmission = now - currentEventDelay;
        var effectiveSubmissionIdx = i - sampleSinceBlockedEvents;
        if (effectiveSubmissionIdx < 0) {
            // Unfortunately submissions that were started before the profiler start
            // time are not reliable because we don't have any sample data for earlier.
            // Skipping it.
            lastSubmission = now;
            lastSubmissionIdx = i;
            continue;
        }
        if (lastSubmissionIdx === effectiveSubmissionIdx) {
            // Bail out early since there is nothing to do.
            lastSubmission = effectiveSubmission;
            lastSubmissionIdx = effectiveSubmissionIdx;
            continue;
        }
        var delta = now - lastSubmission;
        for (var j = lastSubmissionIdx + 1; j <= effectiveSubmissionIdx; j++) {
            eventDelays[j] += delta;
            delta -= samples.time[j + 1] - samples.time[j];
        }
        lastSubmission = effectiveSubmission;
        lastSubmissionIdx = effectiveSubmissionIdx;
    }
    // We are done with processing the delays.
    // Calculate min/max delay and delay range
    var minDelay = Number.MAX_SAFE_INTEGER;
    var maxDelay = 0;
    for (var _i = 0, eventDelays_1 = eventDelays; _i < eventDelays_1.length; _i++) {
        var delay = eventDelays_1[_i];
        if (delay) {
            minDelay = Math.min(delay, minDelay);
            maxDelay = Math.max(delay, maxDelay);
        }
    }
    var delayRange = maxDelay - minDelay;
    return {
        eventDelays: eventDelays,
        minDelay: minDelay,
        maxDelay: maxDelay,
        delayRange: delayRange
    };
}
exports.processEventDelays = processEventDelays;
// --------------- CallNodePath and CallNodeIndex manipulations ---------------
// Returns a list of CallNodeIndex from CallNodePaths. This function uses a map
// to speed up the look-up process.
function getCallNodeIndicesFromPaths(callNodePaths, callNodeTable) {
    // This is a Map<CallNodePathHash, IndexIntoCallNodeTable>. This map speeds up
    // the look-up process by caching every CallNodePath we handle which avoids
    // looking up parents again and again.
    var cache = new Map();
    return callNodePaths.map(function (path) {
        return _getCallNodeIndexFromPathWithCache(path, callNodeTable, cache);
    });
}
exports.getCallNodeIndicesFromPaths = getCallNodeIndicesFromPaths;
// Returns a CallNodeIndex from a CallNodePath, using and contributing to the
// cache parameter.
function _getCallNodeIndexFromPathWithCache(callNodePath, callNodeTable, cache) {
    var hashFullPath = path_1.hashPath(callNodePath);
    var result = cache.get(hashFullPath);
    if (result !== undefined) {
        // The cache already has the result for the full path.
        return result;
    }
    // This array serves as a map and stores the hashes of callNodePath's
    // parents to speed up the algorithm. First we'll follow the tree from the
    // bottom towards the top, pushing hashes as we compute them, and then we'll
    // move back towards the bottom popping hashes from this array.
    var sliceHashes = [hashFullPath];
    // Step 1: find whether we already computed the index for one of the path's
    // parents, starting from the closest parent and looping towards the "top" of
    // the tree.
    // If we find it for one of the parents, we'll be able to start at this point
    // in the following look up.
    var i = callNodePath.length;
    var index;
    while (--i > 0) {
        // Looking up each parent for this call node, starting from the deepest node.
        // If we find a parent this makes it possible to start the look up from this location.
        var subPath = callNodePath.slice(0, i);
        var hash = path_1.hashPath(subPath);
        index = cache.get(hash);
        if (index !== undefined) {
            // Yay, we already have the result for a parent!
            break;
        }
        // Cache the hashed value because we'll need it later, after resolving this path.
        // Note we don't add the hash if we found the parent in the cache, so the
        // last added element here will accordingly be the first popped in the next
        // algorithm.
        sliceHashes.push(hash);
    }
    // Step 2: look for the requested path using the call node table, starting at
    // the parent we already know if we found one, and looping down the tree.
    // We're contributing to the cache at the same time.
    // `index` is undefined if no parent was found in the cache. In that case we
    // start from the start, and use `-1` which is the prefix we use to indicate
    // the root node.
    if (index === undefined) {
        index = -1;
    }
    while (i < callNodePath.length) {
        // Resolving the index for subpath `callNodePath.slice(0, i+1)` given we
        // know the index for the subpath `callNodePath.slice(0, i)` (its parent).
        var func = callNodePath[i];
        var nextNodeIndex = _getCallNodeIndexFromParentAndFunc(index, func, callNodeTable);
        // We couldn't find this path into the call node table. This shouldn't
        // normally happen.
        if (nextNodeIndex === null) {
            return null;
        }
        // Contributing to the shared cache
        var hash = sliceHashes.pop();
        cache.set(hash, nextNodeIndex);
        index = nextNodeIndex;
        i++;
    }
    return index < 0 ? null : index;
}
// Returns the CallNodeIndex that matches the function `func` and whose parent's
// CallNodeIndex is `parent`.
function _getCallNodeIndexFromParentAndFunc(parent, func, callNodeTable) {
    // Node children always come after their parents in the call node table,
    // that's why we start looping at `parent + 1`.
    // Note that because the root parent is `-1`, we correctly start at `0` when
    // we look for a top-level item.
    for (var callNodeIndex = parent + 1; // the root parent is -1
     callNodeIndex < callNodeTable.length; callNodeIndex++) {
        if (callNodeTable.prefix[callNodeIndex] === parent &&
            callNodeTable.func[callNodeIndex] === func) {
            return callNodeIndex;
        }
    }
    return null;
}
// This function returns a CallNodeIndex from a CallNodePath, using the
// specified `callNodeTable`.
function getCallNodeIndexFromPath(callNodePath, callNodeTable) {
    var result = getCallNodeIndicesFromPaths([callNodePath], callNodeTable)[0];
    return result;
}
exports.getCallNodeIndexFromPath = getCallNodeIndexFromPath;
// This function returns a CallNodePath from a CallNodeIndex.
function getCallNodePathFromIndex(callNodeIndex, callNodeTable) {
    if (callNodeIndex === null || callNodeIndex === -1) {
        return [];
    }
    var callNodePath = [];
    var fs = callNodeIndex;
    while (fs !== -1) {
        callNodePath.push(callNodeTable.func[fs]);
        fs = callNodeTable.prefix[fs];
    }
    callNodePath.reverse();
    return callNodePath;
}
exports.getCallNodePathFromIndex = getCallNodePathFromIndex;
/**
 * This function converts a stack information into a call node path structure.
 */
function convertStackToCallNodePath(thread, stack) {
    var stackTable = thread.stackTable, frameTable = thread.frameTable;
    var path = [];
    for (var stackIndex = stack; stackIndex !== null; stackIndex = stackTable.prefix[stackIndex]) {
        path.push(frameTable.func[stackTable.frame[stackIndex]]);
    }
    return path.reverse();
}
exports.convertStackToCallNodePath = convertStackToCallNodePath;
/**
 * Compute maximum depth of call stack for a given thread.
 *
 * Returns the depth of the deepest call node, but with a one-based
 * depth instead of a zero-based.
 *
 * If no samples are found, 0 is returned.
 */
function computeCallNodeMaxDepth(thread, callNodeInfo) {
    if (thread.samples.length === 0 ||
        callNodeInfo.callNodeTable.depth.length === 0) {
        return 0;
    }
    var max = 0;
    for (var _i = 0, _a = callNodeInfo.callNodeTable.depth; _i < _a.length; _i++) {
        var depth = _a[_i];
        max = Math.max(max, depth);
    }
    return max + 1;
}
exports.computeCallNodeMaxDepth = computeCallNodeMaxDepth;
function invertCallstack(thread, defaultCategory) {
    return time_code_1.timeCode('invertCallstack', function () {
        var stackTable = thread.stackTable, frameTable = thread.frameTable;
        var newStackTable = {
            length: 0,
            frame: [],
            category: [],
            subcategory: [],
            prefix: []
        };
        // Create a Map that keys off of two values, both the prefix and frame combination
        // by using a bit of math: prefix * frameCount + frame => stackIndex
        var prefixAndFrameToStack = new Map();
        var frameCount = frameTable.length;
        // Returns the stackIndex for a specific frame (that is, a function and its
        // context), and a specific prefix. If it doesn't exist yet it will create
        // a new stack entry and return its index.
        function stackFor(prefix, frame, category, subcategory) {
            var prefixAndFrameIndex = (prefix === null ? -1 : prefix) * frameCount + frame;
            var stackIndex = prefixAndFrameToStack.get(prefixAndFrameIndex);
            if (stackIndex === undefined) {
                stackIndex = newStackTable.length++;
                newStackTable.prefix[stackIndex] = prefix;
                newStackTable.frame[stackIndex] = frame;
                newStackTable.category[stackIndex] = category;
                newStackTable.subcategory[stackIndex] = subcategory;
                prefixAndFrameToStack.set(prefixAndFrameIndex, stackIndex);
            }
            else if (newStackTable.category[stackIndex] !== category) {
                // If two stack nodes from the non-inverted stack tree with different
                // categories happen to collapse into the same stack node in the
                // inverted tree, discard their category and set the category to the
                // default category.
                newStackTable.category[stackIndex] = defaultCategory;
                newStackTable.subcategory[stackIndex] = 0;
            }
            else if (newStackTable.subcategory[stackIndex] !== subcategory) {
                // If two stack nodes from the non-inverted stack tree with the same
                // category but different subcategories happen to collapse into the same
                // stack node in the inverted tree, discard their subcategory and set it
                // to the "Other" subcategory.
                newStackTable.subcategory[stackIndex] = 0;
            }
            return stackIndex;
        }
        var oldStackToNewStack = new Map();
        // For one specific stack, this will ensure that stacks are created for all
        // of its ancestors, by walking its prefix chain up to the root.
        function convertStack(stackIndex) {
            if (stackIndex === null) {
                return null;
            }
            var newStack = oldStackToNewStack.get(stackIndex);
            if (newStack === undefined) {
                newStack = null;
                for (var currentStack = stackIndex; currentStack !== null; currentStack = stackTable.prefix[currentStack]) {
                    // Notice how we reuse the previous stack as the prefix. This is what
                    // effectively inverts the call tree.
                    newStack = stackFor(newStack, stackTable.frame[currentStack], stackTable.category[currentStack], stackTable.subcategory[currentStack]);
                }
                oldStackToNewStack.set(stackIndex, newStack);
            }
            return newStack;
        }
        return updateThreadStacks(thread, newStackTable, convertStack);
    });
}
exports.invertCallstack = invertCallstack;
/**
 * Sometimes we want to update the stacks for a thread, for instance while searching
 * for a text string, or doing a call tree transformation. This function abstracts
 * out the manipulation of the data structures so that we can properly update
 * the stack table and any possible allocation information.
 */
function updateThreadStacks(thread, newStackTable, convertStack, IndexIntoStackTable, , ) {
    var jsAllocations = thread.jsAllocations, nativeAllocations = thread.nativeAllocations, samples = thread.samples;
    var newSamples = __assign(__assign({}, samples), { stack: samples.stack.map(function (oldStack) { return convertStack(oldStack); }) });
    var newThread = __assign(__assign({}, thread), { samples: newSamples, stackTable: newStackTable });
    if (jsAllocations) {
        newThread.jsAllocations = __assign(__assign({}, jsAllocations), { stack: jsAllocations.stack.map(function (oldStack) { return convertStack(oldStack); }) });
    }
    if (nativeAllocations) {
        newThread.nativeAllocations = __assign(__assign({}, nativeAllocations), { stack: nativeAllocations.stack.map(function (oldStack) { return convertStack(oldStack); }) });
    }
    return newThread;
}
exports.updateThreadStacks = updateThreadStacks;
IndexIntoStackTable | null;
{
    return function (oldStack) {
        if (oldStack === null) {
            return null;
        }
        var newStack = oldStackToNewStack.get(oldStack);
        if (newStack === undefined) {
            throw new Error('Could not find a stack when converting from an old stack to new stack.');
        }
        return newStack;
    };
}
function getSampleIndexClosestToTime(samples, time, interval) {
    // Bisect to find the index of the first sample after the provided time.
    var index = bisect_1.bisectionRight(samples.time, time);
    if (index === 0) {
        return 0;
    }
    if (index === samples.length) {
        return samples.length - 1;
    }
    // Check the distance between the provided time and the center of the bisected sample
    // and its predecessor.
    var previousIndex = index - 1;
    var weight = interval;
    var previousWeight = interval;
    if (samples.weight) {
        var samplesWeight = samples.weight;
        weight = Math.abs(samplesWeight[index]);
        previousWeight = Math.abs(samplesWeight[previousIndex]);
    }
    var distanceToThis = samples.time[index] + weight / 2 - time;
    var distanceToLast = time - (samples.time[previousIndex] + previousWeight / 2);
    return distanceToThis < distanceToLast ? index : index - 1;
}
exports.getSampleIndexClosestToTime = getSampleIndexClosestToTime;
function getFriendlyThreadName(threads, thread) {
    var label;
    switch (thread.name) {
        case 'GeckoMain': {
            if (thread.processName) {
                // If processName is present, use that as it should contain a friendly name.
                // We want to use that for the GeckoMain thread because it is shown as the
                // root of other threads in each process group.
                label = thread.processName;
                var homonymThreads = threads.filter(function (thread) {
                    return thread.name === 'GeckoMain' && thread.processName === label;
                });
                if (homonymThreads.length > 1) {
                    var index = 1 + homonymThreads.indexOf(thread);
                    label += " (" + index + "/" + homonymThreads.length + ")";
                }
            }
            else {
                switch (thread.processType) {
                    case 'default':
                        label = 'Parent Process';
                        break;
                    case 'gpu':
                        label = 'GPU Process';
                        break;
                    case 'rdd':
                        label = 'Remote Data Decoder';
                        break;
                    case 'tab': {
                        var contentThreads = threads.filter(function (thread) {
                            return (thread.name === 'GeckoMain' && thread.processType === 'tab');
                        });
                        if (contentThreads.length > 1) {
                            var index = 1 + contentThreads.indexOf(thread);
                            label = "Content Process (" + index + "/" + contentThreads.length + ")";
                        }
                        else {
                            label = 'Content Process';
                        }
                        break;
                    }
                    case 'plugin':
                        label = 'Plugin Process';
                        break;
                    case 'socket':
                        label = 'Socket Process';
                        break;
                    default:
                    // should we throw here ?
                }
            }
            break;
        }
        default:
    }
    if (!label) {
        label = thread.name;
    }
    return label;
}
exports.getFriendlyThreadName = getFriendlyThreadName;
function getThreadProcessDetails(thread) {
    var label = "thread: \"" + thread.name + "\"";
    if (thread.tid !== undefined) {
        label += " (" + thread.tid + ")";
    }
    if (thread.processType) {
        label += "\nprocess: \"" + thread.processType + "\"";
        if (thread.pid !== undefined) {
            label += " (" + thread.pid + ")";
        }
    }
    return label;
}
exports.getThreadProcessDetails = getThreadProcessDetails;
/**
 * This function returns the source origin for a function. This can be:
 * - a filename (javascript or object file)
 * - a URL (if the source is a website)
 */
function getOriginAnnotationForFunc(funcIndex, funcTable, resourceTable, stringTable) {
    var resourceIndex = funcTable.resource[funcIndex];
    var resourceNameIndex = resourceTable.name[resourceIndex];
    var origin;
    if (resourceNameIndex !== undefined) {
        origin = stringTable.getString(resourceNameIndex);
    }
    var fileNameIndex = funcTable.fileName[funcIndex];
    var fileName;
    if (fileNameIndex !== null) {
        fileName = stringTable.getString(fileNameIndex);
        var lineNumber = funcTable.lineNumber[funcIndex];
        if (lineNumber !== null) {
            fileName += ':' + lineNumber;
            var columnNumber = funcTable.columnNumber[funcIndex];
            if (columnNumber !== null) {
                fileName += ':' + columnNumber;
            }
        }
    }
    if (fileName) {
        // If the origin string is just a URL prefix that's part of the
        // filename, it doesn't add any useful information, so just return
        // the filename. If it's something else (e.g., an extension or
        // library name), prepend it to the filename.
        if (origin && !fileName.startsWith(origin)) {
            return origin + ": " + fileName;
        }
        return fileName;
    }
    if (origin) {
        return origin;
    }
    return '';
}
exports.getOriginAnnotationForFunc = getOriginAnnotationForFunc;
/**
 * From a valid call node path, this function returns a list of information
 * about each function in this path: their names and their origins.
 */
function getFuncNamesAndOriginsForPath(path, thread) {
    var funcTable = thread.funcTable, stringTable = thread.stringTable, resourceTable = thread.resourceTable;
    return path.map(function (func) { return ({
        funcName: stringTable.getString(funcTable.name[func]),
        isFrameLabel: funcTable.resource[func] === -1,
        origin: getOriginAnnotationForFunc(func, funcTable, resourceTable, stringTable)
    }); });
}
exports.getFuncNamesAndOriginsForPath = getFuncNamesAndOriginsForPath;
/**
 * Return a function that can compare two samples' call nodes, and determine a sort order.
 *
 * The order is determined as follows:
 *  - Ancestor call nodes are ordered before their descendants.
 *  - Sibling call nodes are ordered by their call node index.
 * This order can be different than the order of the rows that are displayed in the
 * call tree, because it does not take any sample information into account. This
 * makes it independent of any range selection and cheaper to compute.
 */
function getTreeOrderComparator(callNodeTable, sampleCallNodes) {
    /**
     * Determine the ordering of two non-null call nodes.
     */
    function compareCallNodes(callNodeA, callNodeB) {
        var initialDepthA = callNodeTable.depth[callNodeA];
        var initialDepthB = callNodeTable.depth[callNodeB];
        var depthA = initialDepthA;
        var depthB = initialDepthB;
        // Walk call tree towards the roots until the call nodes are at the same depth.
        while (depthA > depthB) {
            callNodeA = callNodeTable.prefix[callNodeA];
            depthA--;
        }
        while (depthB > depthA) {
            callNodeB = callNodeTable.prefix[callNodeB];
            depthB--;
        }
        // Sort the call nodes by the initial depth.
        if (callNodeA === callNodeB) {
            return initialDepthA - initialDepthB;
        }
        // The call nodes are at the same depth, walk towards the roots until a match is
        // is found, then sort them based on stack order.
        while (true) {
            var parentNodeA = callNodeTable.prefix[callNodeA];
            var parentNodeB = callNodeTable.prefix[callNodeB];
            if (parentNodeA === parentNodeB) {
                break;
            }
            callNodeA = parentNodeA;
            callNodeB = parentNodeB;
        }
        return callNodeA - callNodeB;
    }
    /**
     * Determine the ordering of (possibly null) call nodes for two given samples.
     * Returns a value < 0 if sampleA is ordered before sampleB,
     *                 > 0 if sampleA is ordered after sampleB,
     *                == 0 if there is no ordering between sampleA and sampleB.
     * Samples which are filtered out, i.e. for which sampleCallNodes[sample] is
     * null, are ordered *after* samples which are not filtered out.
     */
    return function treeOrderComparator(sampleA, sampleB) {
        var callNodeA = sampleCallNodes[sampleA];
        var callNodeB = sampleCallNodes[sampleB];
        if (callNodeA === null) {
            if (callNodeB === null) {
                // Both samples are filtered out
                return 0;
            }
            // A filtered out, B not filtered out. A goes after B.
            return 1;
        }
        if (callNodeB === null) {
            // B filtered out, A not filtered out. B goes after A.
            return -1;
        }
        return compareCallNodes(callNodeA, callNodeB);
    };
}
exports.getTreeOrderComparator = getTreeOrderComparator;
/**
 * This is the root-most call node for which, if selected, only the clicked category
 * is highlighted in the thread activity graph. In other words, it's the root-most call
 * node which only 'contains' samples whose sample category is the clicked category.
 */
function findBestAncestorCallNode(callNodeInfo, sampleCallNodes, sampleCategories, clickedCallNode, clickedCategory) {
    var callNodeTable = callNodeInfo.callNodeTable;
    if (callNodeTable.category[clickedCallNode] !== clickedCategory) {
        return clickedCallNode;
    }
    // Compute the callNodesOnSameCategoryPath.
    // Given a call node path with some arbitrary categories, e.g. A, B, C
    //
    //     Categories: A -> A -> B -> B -> C -> C -> C
    //   Node Indexes: 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6
    // This loop will select the leaf-most call nodes that match the leaf call-node's
    // category. Running the above path through this loop would produce the list:
    //
    //     Categories: [C, C, C]
    //   Node Indexes: [6, 5, 4]  (note the reverse order)
    var callNodesOnSameCategoryPath = [clickedCallNode];
    var callNode = clickedCallNode;
    while (true) {
        var parentCallNode = callNodeTable.prefix[callNode];
        if (parentCallNode === -1) {
            // The entire call path is just clickedCategory.
            return clickedCallNode; // TODO: is this a useful behavior?
        }
        if (callNodeTable.category[parentCallNode] !== clickedCategory) {
            break;
        }
        callNodesOnSameCategoryPath.push(parentCallNode);
        callNode = parentCallNode;
    }
    // Now find the callNode in callNodesOnSameCategoryPath with the lowest depth
    // such that selecting it will not highlight any samples whose unfiltered
    // category is different from clickedCategory. If no such callNode exists,
    // return clickedCallNode.
    var clickedDepth = callNodeTable.depth[clickedCallNode];
    // The handledCallNodes is used as a Map<CallNodeIndex, bool>.
    var handledCallNodes = new Uint8Array(callNodeTable.length);
    function limitSameCategoryPathToCommonAncestor(callNode) {
        // The callNode argument is the leaf call node of a sample whose sample category is a
        // different category than clickedCategory. If callNode's ancestor path crosses
        // callNodesOnSameCategoryPath, that implies that callNode would be highlighted
        // if we were to select the root-most node in callNodesOnSameCategoryPath.
        // If that is the case, we need to truncate callNodesOnSameCategoryPath in such
        // a way that the root-most node in that list is no longer an ancestor of callNode.
        var walkUpToDepth = clickedDepth - (callNodesOnSameCategoryPath.length - 1);
        var depth = callNodeTable.depth[callNode];
        // Go from leaf to root in the call nodes.
        while (depth >= walkUpToDepth) {
            if (handledCallNodes[callNode]) {
                // This call node was already handled. Stop checking.
                return;
            }
            handledCallNodes[callNode] = 1;
            if (depth <= clickedDepth) {
                // This call node's depth is less than the clicked depth, it needs to be
                // checked to see if the call node is in the callNodesOnSameCategoryPath.
                if (callNode === callNodesOnSameCategoryPath[clickedDepth - depth]) {
                    // Remove some of the call nodes, as they are not on the same path.
                    // This is done by shortening the array length. Keep in mind that this
                    // array is in the opposite order of a CallNodePath, with the leaf-most
                    // nodes first, and the root-most last.
                    callNodesOnSameCategoryPath.length = clickedDepth - depth;
                    return;
                }
            }
            callNode = callNodeTable.prefix[callNode];
            depth--;
        }
    }
    // Go through every sample and look at each sample's call node.
    for (var sample = 0; sample < sampleCallNodes.length; sample++) {
        if (sampleCategories[sample] !== clickedCategory &&
            sampleCallNodes[sample] !== null) {
            // This sample's category is a different one than the one clicked. Make
            // sure to limit the callNodesOnSameCategoryPath to just the call nodes
            // that share the same common ancestor.
            limitSameCategoryPathToCommonAncestor(sampleCallNodes[sample]);
        }
    }
    if (callNodesOnSameCategoryPath.length > 0) {
        // The last call node in this list will be the root-most call node that has
        // the same category on the path as the clicked call node.
        return callNodesOnSameCategoryPath[callNodesOnSameCategoryPath.length - 1];
    }
    return clickedCallNode;
}
exports.findBestAncestorCallNode = findBestAncestorCallNode;
/**
 * Look at the leaf-most stack for every sample, and take its category.
 */
function getSampleCategories(samples, stackTable) {
    return samples.stack.map(function (s) { return (s !== null ? stackTable.category[s] : null); });
}
exports.getSampleCategories = getSampleCategories;
function getFriendlyStackTypeName(implementation) {
    switch (implementation) {
        case 'interpreter':
            return 'JS interpreter';
        case 'blinterp':
        case 'baseline':
        case 'ion':
            return "JS JIT (" + implementation + ")";
        case 'native':
            return 'Native code';
        case 'unknown':
            return implementation;
        default:
            throw flow_1.assertExhaustiveCheck(implementation);
    }
}
exports.getFriendlyStackTypeName = getFriendlyStackTypeName;
function shouldDisplaySubcategoryInfoForCategory(category) {
    // The first subcategory of every category is the "Other" subcategory.
    // For categories which only have the "Other" subcategory and no other
    // subcategories, don't display any subcategory information.
    return category.subcategories.length > 1;
}
exports.shouldDisplaySubcategoryInfoForCategory = shouldDisplaySubcategoryInfoForCategory;
function getCategoryPairLabel(categories, categoryIndex, subcategoryIndex) {
    var category = categories[categoryIndex];
    return subcategoryIndex !== 0
        ? category.name + ": " + category.subcategories[subcategoryIndex]
        : "" + category.name;
}
exports.getCategoryPairLabel = getCategoryPairLabel;
/**
 * This function filters to only positive memory size values in the native allocations.
 * It removes all of the deallocation information.
 */
function filterToAllocations(nativeAllocations) {
    var newNativeAllocations;
    if (nativeAllocations.memoryAddress) {
        newNativeAllocations = data_structures_1.getEmptyBalancedNativeAllocationsTable();
        for (var i = 0; i < nativeAllocations.length; i++) {
            var weight = nativeAllocations.weight[i];
            if (weight > 0) {
                newNativeAllocations.time.push(nativeAllocations.time[i]);
                newNativeAllocations.stack.push(nativeAllocations.stack[i]);
                newNativeAllocations.weight.push(weight);
                newNativeAllocations.memoryAddress.push(nativeAllocations.memoryAddress[i]);
                newNativeAllocations.threadId.push(nativeAllocations.threadId[i]);
                newNativeAllocations.length++;
            }
        }
    }
    else {
        newNativeAllocations = data_structures_1.getEmptyUnbalancedNativeAllocationsTable();
        for (var i = 0; i < nativeAllocations.length; i++) {
            var weight = nativeAllocations.weight[i];
            if (weight > 0) {
                newNativeAllocations.time.push(nativeAllocations.time[i]);
                newNativeAllocations.stack.push(nativeAllocations.stack[i]);
                newNativeAllocations.weight.push(weight);
                newNativeAllocations.length++;
            }
        }
    }
    return newNativeAllocations;
}
exports.filterToAllocations = filterToAllocations;
/**
 * This function filters to only negative memory size values in the native allocations.
 * It shows all of the memory frees.
 */
function filterToDeallocationsSites(nativeAllocations) {
    var newNativeAllocations;
    if (nativeAllocations.memoryAddress) {
        newNativeAllocations = data_structures_1.getEmptyBalancedNativeAllocationsTable();
        for (var i = 0; i < nativeAllocations.length; i++) {
            var weight = nativeAllocations.weight[i];
            if (weight < 0) {
                newNativeAllocations.time.push(nativeAllocations.time[i]);
                newNativeAllocations.stack.push(nativeAllocations.stack[i]);
                newNativeAllocations.weight.push(weight);
                newNativeAllocations.memoryAddress.push(nativeAllocations.memoryAddress[i]);
                newNativeAllocations.threadId.push(nativeAllocations.threadId[i]);
                newNativeAllocations.length++;
            }
        }
    }
    else {
        newNativeAllocations = data_structures_1.getEmptyUnbalancedNativeAllocationsTable();
        for (var i = 0; i < nativeAllocations.length; i++) {
            var weight = nativeAllocations.weight[i];
            if (weight < 0) {
                newNativeAllocations.time.push(nativeAllocations.time[i]);
                newNativeAllocations.stack.push(nativeAllocations.stack[i]);
                newNativeAllocations.weight.push(weight);
                newNativeAllocations.length++;
            }
        }
    }
    return newNativeAllocations;
}
exports.filterToDeallocationsSites = filterToDeallocationsSites;
/**
 * This function filters to only negative memory size values in the native allocations.
 * It rewrites the stacks to point back to the stack of the allocation.
 */
function filterToDeallocationsMemory(nativeAllocations) {
    var memoryAddressToAllocation = new Map();
    var stackOfOriginalAllocation = [];
    for (var allocationIndex = 0; allocationIndex < nativeAllocations.length; allocationIndex++) {
        var bytes = nativeAllocations.weight[allocationIndex];
        var memoryAddress = nativeAllocations.memoryAddress[allocationIndex];
        if (bytes >= 0) {
            // Handle the allocation.
            // Provide a map back to this index.
            memoryAddressToAllocation.set(memoryAddress, allocationIndex);
            stackOfOriginalAllocation[allocationIndex] = null;
        }
        else {
            // Lookup the previous allocation.
            var previousAllocationIndex = memoryAddressToAllocation.get(memoryAddress);
            if (previousAllocationIndex === undefined) {
                stackOfOriginalAllocation[allocationIndex] = null;
            }
            else {
                // This deallocation matches a previous allocation. Remove the allocation.
                stackOfOriginalAllocation[allocationIndex] = previousAllocationIndex;
                // There is a match, so delete this old association.
                memoryAddressToAllocation["delete"](memoryAddress);
            }
        }
    }
    var newDeallocations = data_structures_1.getEmptyBalancedNativeAllocationsTable();
    for (var i = 0; i < nativeAllocations.length; i++) {
        var duration = nativeAllocations.weight[i];
        var stackIndex = stackOfOriginalAllocation[i];
        if (stackIndex !== null) {
            newDeallocations.time.push(nativeAllocations.time[i]);
            newDeallocations.stack.push(stackIndex);
            newDeallocations.weight.push(duration);
            newDeallocations.memoryAddress.push(nativeAllocations.memoryAddress[i]);
            newDeallocations.threadId.push(nativeAllocations.threadId[i]);
            newDeallocations.length++;
        }
    }
    return newDeallocations;
}
exports.filterToDeallocationsMemory = filterToDeallocationsMemory;
/**
 * Currently the native allocations naively collect allocations and deallocations.
 * There is no attempt to match up the sampled allocations with the deallocations.
 * Because of this, if a calltree were to combine both allocations and deallocations,
 * then the summary would most likely lie and not misreport leaked or retained memory.
 * For now, filter to only showing allocations or deallocations.
 *
 * This function filters to only positive values.
 */
function filterToRetainedAllocations(nativeAllocations) {
    var memoryAddressToAllocation = new Map();
    var retainedAllocation = [];
    for (var allocationIndex = 0; allocationIndex < nativeAllocations.length; allocationIndex++) {
        var bytes = nativeAllocations.weight[allocationIndex];
        var memoryAddress = nativeAllocations.memoryAddress[allocationIndex];
        if (bytes >= 0) {
            // Handle the allocation.
            // Provide a map back to this index.
            memoryAddressToAllocation.set(memoryAddress, allocationIndex);
            retainedAllocation[allocationIndex] = true;
        }
        else {
            // Do not retain deallocations.
            retainedAllocation[allocationIndex] = false;
            // Lookup the previous allocation.
            var previousAllocationIndex = memoryAddressToAllocation.get(memoryAddress);
            if (previousAllocationIndex !== undefined) {
                // This deallocation matches a previous allocation. Remove the allocation.
                retainedAllocation[previousAllocationIndex] = false;
                // There is a match, so delete this old association.
                memoryAddressToAllocation["delete"](memoryAddress);
            }
        }
    }
    var newNativeAllocations = data_structures_1.getEmptyBalancedNativeAllocationsTable();
    for (var i = 0; i < nativeAllocations.length; i++) {
        var weight = nativeAllocations.weight[i];
        if (retainedAllocation[i]) {
            newNativeAllocations.time.push(nativeAllocations.time[i]);
            newNativeAllocations.stack.push(nativeAllocations.stack[i]);
            newNativeAllocations.weight.push(weight);
            newNativeAllocations.memoryAddress.push(nativeAllocations.memoryAddress[i]);
            newNativeAllocations.threadId.push(nativeAllocations.threadId[i]);
            newNativeAllocations.length++;
        }
    }
    return newNativeAllocations;
}
exports.filterToRetainedAllocations = filterToRetainedAllocations;
/**
 * Extract the hostname and favicon from the first page if we are in single tab
 * view. Currently we assume that we don't change the origin of webpages while
 * profiling in web developer preset. That's why we are simply getting the first
 * page we find that belongs to the active tab. Returns null if profiler is not
 * in the single tab view at the moment.
 */
function extractProfileFilterPageData(pages, relevantPages) {
    if (relevantPages.size === 0 || pages === null) {
        // Either we are not in single tab view, or we don't have pages array(which
        // is the case for older profiles). Return early.
        return null;
    }
    // Getting the first page's innerWindowID and then getting its url.
    var innerWindowID = __spreadArrays(relevantPages)[0];
    var filteredPages = pages.filter(function (page) { return page.innerWindowID === innerWindowID; });
    if (filteredPages.length !== 1) {
        // There should be only one page with the given innerWindowID, they are unique.
        console.error("Expected one page but " + filteredPages.length + " found.");
        return null;
    }
    var pageUrl = filteredPages[0].url;
    try {
        var page = new URL(pageUrl);
        // FIXME(Bug 1620546): This is not ideal and we should get the favicon
        // either during profile capture or profile pre-process.
        var favicon = new URL('/favicon.ico', page.origin);
        if (favicon.protocol === 'http:') {
            // Upgrade http requests.
            favicon.protocol = 'https:';
        }
        return {
            origin: page.origin,
            hostname: page.hostname,
            favicon: favicon.href
        };
    }
    catch (e) {
        console.error('Error while extracing the hostname and favicon from the page url', pageUrl);
        return null;
    }
}
exports.extractProfileFilterPageData = extractProfileFilterPageData;
// Returns the resource index for a "url" or "webhost" resource which is created
// on demand based on the script URI.
function getOrCreateURIResource(scriptURI, resourceTable, stringTable, originToResourceIndex) {
    // Figure out the origin and host.
    var origin;
    var host;
    try {
        var url = new URL(scriptURI);
        if (!(url.protocol === 'http:' ||
            url.protocol === 'https:' ||
            url.protocol === 'moz-extension:')) {
            throw new Error('not a webhost or extension protocol');
        }
        origin = url.origin;
        host = url.host;
    }
    catch (e) {
        origin = scriptURI;
        host = null;
    }
    var resourceIndex = originToResourceIndex.get(origin);
    if (resourceIndex !== undefined) {
        return resourceIndex;
    }
    resourceIndex = resourceTable.length++;
    var originStringIndex = stringTable.indexForString(origin);
    originToResourceIndex.set(origin, resourceIndex);
    if (host) {
        // This is a webhost URL.
        resourceTable.lib[resourceIndex] = undefined;
        resourceTable.name[resourceIndex] = originStringIndex;
        resourceTable.host[resourceIndex] = stringTable.indexForString(host);
        resourceTable.type[resourceIndex] = data_structures_1.resourceTypes.webhost;
    }
    else {
        // This is a URL, but it doesn't point to something on the web, e.g. a
        // chrome url.
        resourceTable.lib[resourceIndex] = undefined;
        resourceTable.name[resourceIndex] = stringTable.indexForString(scriptURI);
        resourceTable.host[resourceIndex] = undefined;
        resourceTable.type[resourceIndex] = data_structures_1.resourceTypes.url;
    }
    return resourceIndex;
}
exports.getOrCreateURIResource = getOrCreateURIResource;
/**
 * See the ThreadsKey type for an explanation.
 */
function getThreadsKey(threadIndexes) {
    if (threadIndexes.size === 1) {
        // Return the ThreadIndex directly if there is only one thread.
        // We know this value exists because of the size check, even if Flow doesn't.
        return threadIndexes.values().next().value;
    }
    return __spreadArrays(threadIndexes).sort(function (a, b) { return b - a; }).join(',');
}
exports.getThreadsKey = getThreadsKey;
/**
 * Checks if threadIndexesSet contains all the threads in the threadsKey.
 */
function hasThreadKeys(threadIndexesSet, threadsKey) {
    var threadIndexes = ('' + threadsKey).split(',').map(function (n) { return +n; });
    for (var _i = 0, threadIndexes_1 = threadIndexes; _i < threadIndexes_1.length; _i++) {
        var threadIndex = threadIndexes_1[_i];
        if (!threadIndexesSet.has(threadIndex)) {
            return false;
        }
    }
    return true;
}
exports.hasThreadKeys = hasThreadKeys;
