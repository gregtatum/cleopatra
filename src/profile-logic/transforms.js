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
exports.applyTransform = exports.funcHasRecursiveCall = exports.filterCallNodePathByImplementation = exports.getStackType = exports.restoreAllFunctionsInCallNodePath = exports.focusFunction = exports.focusInvertedSubtree = exports.focusSubtree = exports.collapseFunctionSubtree = exports.collapseDirectRecursion = exports.collapseResource = exports.dropFunction = exports.mergeFunction = exports.mergeCallNode = exports.invertCallNodePath = exports.applyTransformToCallNodePath = exports.getTransformLabels = exports.stringifyTransforms = exports.parseTransforms = void 0;
var uintarray_encoding_1 = require("../utils/uintarray-encoding");
var profile_data_1 = require("./profile-data");
var time_code_1 = require("../utils/time-code");
var flow_1 = require("../utils/flow");
var data_structures_1 = require("./data-structures");
var function_info_1 = require("./function-info");
/**
 * This file contains the functions and logic for working with and applying transforms
 * to profile data.
 */
// Create mappings from a transform name, to a url-friendly short name.
var TRANSFORM_TO_SHORT_KEY = {};
var SHORT_KEY_TO_TRANSFORM = {};
[
    'focus-subtree',
    'focus-function',
    'merge-call-node',
    'merge-function',
    'drop-function',
    'collapse-resource',
    'collapse-direct-recursion',
    'collapse-function-subtree',
].forEach(function (transform) {
    // This is kind of an awkward switch, but it ensures we've exhaustively checked that
    // we have a mapping for every transform.
    var shortKey;
    switch (transform) {
        case 'focus-subtree':
            shortKey = 'f';
            break;
        case 'focus-function':
            shortKey = 'ff';
            break;
        case 'merge-call-node':
            shortKey = 'mcn';
            break;
        case 'merge-function':
            shortKey = 'mf';
            break;
        case 'drop-function':
            shortKey = 'df';
            break;
        case 'collapse-resource':
            shortKey = 'cr';
            break;
        case 'collapse-direct-recursion':
            shortKey = 'rec';
            break;
        case 'collapse-function-subtree':
            shortKey = 'cfs';
            break;
        default: {
            throw flow_1.assertExhaustiveCheck(transform);
        }
    }
    TRANSFORM_TO_SHORT_KEY[transform] = shortKey;
    SHORT_KEY_TO_TRANSFORM[shortKey] = transform;
});
/**
 * Map each transform key into a short representation.
 */
/**
 * Every transform stack is per thread, and separated by a ";".
 * This first list matches the order of selected threads.
 * Every transform is separated by the "~" character.
 * Each transform is made up of a tuple separated by "-"
 * The first value in the tuple is a short key of the transform type.
 *
 * e.g "f-js-xFFpUMl-i" or "f-cpp-0KV4KV5KV61KV7KV8K"
 */
function parseTransforms(threadList, stringValue) {
    if (!stringValue) {
        return {};
    }
    var transformStrings = stringValue.split(';');
    var transformStacksPerThread = {};
    var _loop_1 = function (i) {
        // Flow had some trouble with the `Transform | null` type, so use a forEach
        // rather than a map.
        var transforms = [];
        var transformString = transformStrings[i];
        var threadIndex = threadList[i];
        transformStacksPerThread[threadIndex] = transforms;
        transformString.split('~').forEach(function (s) {
            var tuple = s.split('-');
            var shortKey = tuple[0];
            var type = flow_1.convertToTransformType(SHORT_KEY_TO_TRANSFORM[shortKey]);
            if (type === null) {
                console.error('Unrecognized transform was passed to the URL.', shortKey);
                return;
            }
            // This switch breaks down each transform into the minimum amount of data needed
            // to represent it in the URL. Each transform has slightly different requirements
            // as defined in src/types/transforms.js.
            switch (type) {
                case 'collapse-resource': {
                    // e.g. "cr-js-325-8"
                    var implementation = tuple[1], resourceIndexRaw = tuple[2], collapsedFuncIndexRaw = tuple[3];
                    var resourceIndex = parseInt(resourceIndexRaw, 10);
                    var collapsedFuncIndex = parseInt(collapsedFuncIndexRaw, 10);
                    if (isNaN(resourceIndex) || isNaN(collapsedFuncIndex)) {
                        break;
                    }
                    if (resourceIndex >= 0) {
                        transforms.push({
                            type: type,
                            resourceIndex: resourceIndex,
                            collapsedFuncIndex: collapsedFuncIndex,
                            implementation: profile_data_1.toValidImplementationFilter(implementation)
                        });
                    }
                    break;
                }
                case 'collapse-direct-recursion': {
                    // e.g. "rec-js-325"
                    var implementation = tuple[1], funcIndexRaw = tuple[2];
                    var funcIndex = parseInt(funcIndexRaw, 10);
                    if (isNaN(funcIndex) || funcIndex < 0) {
                        break;
                    }
                    transforms.push({
                        type: type,
                        funcIndex: funcIndex,
                        implementation: profile_data_1.toValidImplementationFilter(implementation)
                    });
                    break;
                }
                case 'merge-function':
                case 'focus-function':
                case 'drop-function':
                case 'collapse-function-subtree': {
                    // e.g. "mf-325"
                    var funcIndexRaw = tuple[1];
                    var funcIndex = parseInt(funcIndexRaw, 10);
                    // Validate that the funcIndex makes sense.
                    if (!isNaN(funcIndex) && funcIndex >= 0) {
                        switch (type) {
                            case 'merge-function':
                                transforms.push({
                                    type: 'merge-function',
                                    funcIndex: funcIndex
                                });
                                break;
                            case 'focus-function':
                                transforms.push({
                                    type: 'focus-function',
                                    funcIndex: funcIndex
                                });
                                break;
                            case 'drop-function':
                                transforms.push({
                                    type: 'drop-function',
                                    funcIndex: funcIndex
                                });
                                break;
                            case 'collapse-function-subtree':
                                transforms.push({
                                    type: 'collapse-function-subtree',
                                    funcIndex: funcIndex
                                });
                                break;
                            default:
                                throw new Error('Unmatched transform.');
                        }
                    }
                    break;
                }
                case 'focus-subtree':
                case 'merge-call-node': {
                    // e.g. "f-js-xFFpUMl-i" or "f-cpp-0KV4KV5KV61KV7KV8K"
                    var implementationRaw = tuple[1], serializedCallNodePath = tuple[2], invertedRaw = tuple[3];
                    var implementation = profile_data_1.toValidImplementationFilter(implementationRaw);
                    var callNodePath = uintarray_encoding_1.stringToUintArray(serializedCallNodePath);
                    var inverted = Boolean(invertedRaw);
                    // Flow requires a switch because it can't deduce the type string correctly.
                    switch (type) {
                        case 'focus-subtree':
                            transforms.push({
                                type: 'focus-subtree',
                                implementation: implementation,
                                callNodePath: callNodePath,
                                inverted: inverted
                            });
                            break;
                        case 'merge-call-node':
                            transforms.push({
                                type: 'merge-call-node',
                                implementation: implementation,
                                callNodePath: callNodePath
                            });
                            break;
                        default:
                            throw new Error('Unmatched transform.');
                    }
                    break;
                }
                default:
                    throw flow_1.assertExhaustiveCheck(type);
            }
        });
    };
    for (var i = 0; i < transformStrings.length; i++) {
        _loop_1(i);
    }
    return transformStacksPerThread;
}
exports.parseTransforms = parseTransforms;
/**
 * Each transform in the stack is separated by a ",".
 * Each thread is separated by a ";".
 * The thread order matches the selected thread indexes order.
 */
function stringifyTransforms(selectedThreads, transformStacksPerThread) {
    // The iterator for the Set<ThreadIndex> will give the threads in the same order.
    // The order itself is arbitrary, but it should be consistent across the stringify
    // calls.
    return __spreadArrays(selectedThreads).map(function (threadIndex) {
        return (transformStacksPerThread[threadIndex] || [])
            .map(function (transform) {
            var shortKey = TRANSFORM_TO_SHORT_KEY[transform.type];
            if (!shortKey) {
                throw new Error('Expected to be able to convert a transform into its short key.');
            }
            // This switch breaks down each transform into shared groups of what data
            // they need, as defined in src/types/transforms.js. For instance some transforms
            // need only a funcIndex, while some care about the current implemention, or
            // other pieces of data.
            switch (transform.type) {
                case 'merge-function':
                case 'drop-function':
                case 'collapse-function-subtree':
                case 'focus-function':
                    return shortKey + "-" + transform.funcIndex;
                case 'collapse-resource':
                    return shortKey + "-" + transform.implementation + "-" + transform.resourceIndex + "-" + transform.collapsedFuncIndex;
                case 'collapse-direct-recursion':
                    return shortKey + "-" + transform.implementation + "-" + transform.funcIndex;
                case 'focus-subtree':
                case 'merge-call-node': {
                    var string = [
                        shortKey,
                        transform.implementation,
                        uintarray_encoding_1.uintArrayToString(transform.callNodePath),
                    ].join('-');
                    if (transform.inverted) {
                        string += '-i';
                    }
                    return string;
                }
                default:
                    throw flow_1.assertExhaustiveCheck(transform);
            }
        })
            .join('~');
    })
        .join(';');
}
exports.stringifyTransforms = stringifyTransforms;
function getTransformLabels(thread, threadName, transforms) {
    var funcTable = thread.funcTable, libs = thread.libs, stringTable = thread.stringTable, resourceTable = thread.resourceTable;
    var labels = transforms.map(function (transform) {
        // Lookup library information.
        if (transform.type === 'collapse-resource') {
            var libIndex = resourceTable.lib[transform.resourceIndex];
            var resourceName = void 0;
            if (libIndex === undefined || libIndex === null || libIndex === -1) {
                var nameIndex_1 = resourceTable.name[transform.resourceIndex];
                if (nameIndex_1 === -1) {
                    throw new Error('Attempting to collapse a resource without a name');
                }
                resourceName = stringTable.getString(nameIndex_1);
            }
            else {
                resourceName = libs[libIndex].name;
            }
            return "Collapse: " + resourceName;
        }
        // Lookup function name.
        var funcIndex;
        switch (transform.type) {
            case 'focus-subtree':
            case 'merge-call-node':
                funcIndex = transform.callNodePath[transform.callNodePath.length - 1];
                break;
            case 'focus-function':
            case 'merge-function':
            case 'drop-function':
            case 'collapse-direct-recursion':
            case 'collapse-function-subtree':
                funcIndex = transform.funcIndex;
                break;
            default:
                throw flow_1.assertExhaustiveCheck(transform);
        }
        var nameIndex = funcTable.name[funcIndex];
        var funcName = function_info_1.getFunctionName(stringTable.getString(nameIndex));
        switch (transform.type) {
            case 'focus-subtree':
                return "Focus Node: " + funcName;
            case 'focus-function':
                return "Focus: " + funcName;
            case 'merge-call-node':
                return "Merge Node: " + funcName;
            case 'merge-function':
                return "Merge: " + funcName;
            case 'drop-function':
                return "Drop: " + funcName;
            case 'collapse-direct-recursion':
                return "Collapse recursion: " + funcName;
            case 'collapse-function-subtree':
                return "Collapse subtree: " + funcName;
            default:
                throw flow_1.assertExhaustiveCheck(transform);
        }
    });
    labels.unshift("Complete \"" + threadName + "\"");
    return labels;
}
exports.getTransformLabels = getTransformLabels;
function applyTransformToCallNodePath(callNodePath, transform, transformedThread) {
    switch (transform.type) {
        case 'focus-subtree':
            return _removePrefixPathFromCallNodePath(transform.callNodePath, callNodePath);
        case 'focus-function':
            return _startCallNodePathWithFunction(transform.funcIndex, callNodePath);
        case 'merge-call-node':
            return _mergeNodeInCallNodePath(transform.callNodePath, callNodePath);
        case 'merge-function':
            return _mergeFunctionInCallNodePath(transform.funcIndex, callNodePath);
        case 'drop-function':
            return _dropFunctionInCallNodePath(transform.funcIndex, callNodePath);
        case 'collapse-resource':
            return _collapseResourceInCallNodePath(transform.resourceIndex, transform.collapsedFuncIndex, transformedThread.funcTable, callNodePath);
        case 'collapse-direct-recursion':
            return _collapseDirectRecursionInCallNodePath(transform.funcIndex, callNodePath);
        case 'collapse-function-subtree':
            return _collapseFunctionSubtreeInCallNodePath(transform.funcIndex, callNodePath);
        default:
            throw flow_1.assertExhaustiveCheck(transform);
    }
}
exports.applyTransformToCallNodePath = applyTransformToCallNodePath;
function _removePrefixPathFromCallNodePath(prefixPath, callNodePath) {
    return _callNodePathHasPrefixPath(prefixPath, callNodePath)
        ? callNodePath.slice(prefixPath.length - 1)
        : [];
}
function _startCallNodePathWithFunction(funcIndex, callNodePath) {
    var startIndex = callNodePath.indexOf(funcIndex);
    return startIndex === -1 ? [] : callNodePath.slice(startIndex);
}
function _mergeNodeInCallNodePath(prefixPath, callNodePath) {
    return _callNodePathHasPrefixPath(prefixPath, callNodePath)
        ? callNodePath.filter(function (_, i) { return i !== prefixPath.length - 1; })
        : callNodePath;
}
function _mergeFunctionInCallNodePath(funcIndex, callNodePath) {
    return callNodePath.filter(function (nodeFunc) { return nodeFunc !== funcIndex; });
}
function _dropFunctionInCallNodePath(funcIndex, callNodePath) {
    // If the CallNodePath contains the function, return an empty path.
    return callNodePath.includes(funcIndex) ? [] : callNodePath;
}
function _collapseResourceInCallNodePath(resourceIndex, collapsedFuncIndex, funcTable, callNodePath) {
    return (callNodePath
        // Map any collapsed functions into the collapsedFuncIndex
        .map(function (pathFuncIndex) {
        return funcTable.resource[pathFuncIndex] === resourceIndex
            ? collapsedFuncIndex
            : pathFuncIndex;
    })
        // De-duplicate contiguous collapsed funcs
        .filter(function (pathFuncIndex, pathIndex, path) {
        // This function doesn't match the previous one, so keep it.
        return pathFuncIndex !== path[pathIndex - 1] ||
            // This function matched the previous, only keep it if doesn't match the
            // collapsed func.
            pathFuncIndex !== collapsedFuncIndex;
    }));
}
function _collapseDirectRecursionInCallNodePath(funcIndex, callNodePath) {
    var newPath = [];
    var previousFunc;
    for (var i = 0; i < callNodePath.length; i++) {
        var pathFunc = callNodePath[i];
        if (pathFunc !== funcIndex || pathFunc !== previousFunc) {
            newPath.push(pathFunc);
        }
        previousFunc = pathFunc;
    }
    return newPath;
}
function _collapseFunctionSubtreeInCallNodePath(funcIndex, callNodePath) {
    var index = callNodePath.indexOf(funcIndex);
    return index === -1 ? callNodePath : callNodePath.slice(0, index + 1);
}
function _callNodePathHasPrefixPath(prefixPath, callNodePath) {
    return (prefixPath.length <= callNodePath.length &&
        prefixPath.every(function (prefixFunc, i) { return prefixFunc === callNodePath[i]; }));
}
/**
 * Take a CallNodePath, and invert it given a CallTree. Note that if the CallTree
 * is itself inverted, you will get back the uninverted CallNodePath to the regular
 * CallTree.
 *
 * e.g:
 *   (invertedPath, invertedCallTree) => path
 *   (path, callTree) => invertedPath
 *
 * Call trees are sorted with the CallNodes with the heaviest total time as the first
 * entry. This function walks to the tip of the heaviest branches to find the leaf node,
 * then construct an inverted CallNodePath with the result. This gives a pretty decent
 * result, but it doesn't guarantee that it will select the heaviest CallNodePath for the
 * INVERTED call tree. This would require doing a round trip through the reducers or
 * some other mechanism in order to first calculate the next inverted call tree. This is
 * probably not worth it, so go ahead and use the uninverted call tree, as it's probably
 * good enough.
 */
function invertCallNodePath(path, callTree, callNodeTable) {
    var callNodeIndex = profile_data_1.getCallNodeIndexFromPath(path, callNodeTable);
    if (callNodeIndex === null) {
        // No path was found, return an empty CallNodePath.
        return [];
    }
    var children = [callNodeIndex];
    var pathToLeaf = [];
    do {
        // Walk down the tree's depth to construct a path to the leaf node, this should
        // be the heaviest branch of the tree.
        callNodeIndex = children[0];
        pathToLeaf.push(callNodeIndex);
        children = callTree.getChildren(callNodeIndex);
    } while (children && children.length > 0);
    return (pathToLeaf
        // Map the CallNodeIndex to FuncIndex.
        .map(function (index) { return callNodeTable.func[index]; })
        // Reverse it so that it's in the proper inverted order.
        .reverse());
}
exports.invertCallNodePath = invertCallNodePath;
/**
 * Transform a thread's stacks to merge stacks that match the CallNodePath into
 * the calling stack. See `src/types/transforms.js` for more information about the
 * "merge-call-node" transform.
 */
function mergeCallNode(thread, callNodePath, implementation) {
    return time_code_1.timeCode('mergeCallNode', function () {
        var stackTable = thread.stackTable, frameTable = thread.frameTable;
        // Depth here is 0 indexed.
        var depthAtCallNodePathLeaf = callNodePath.length - 1;
        var oldStackToNewStack = new Map();
        // A root stack's prefix will be null. Maintain that relationship from old to new
        // stacks by mapping from null to null.
        oldStackToNewStack.set(null, null);
        var newStackTable = data_structures_1.getEmptyStackTable();
        // Provide two arrays to efficiently cache values for the algorithm. This probably
        // could be refactored to use only one array here.
        var stackDepths = [];
        var stackMatches = [];
        var funcMatchesImplementation = FUNC_MATCHES[implementation];
        for (var stackIndex = 0; stackIndex < stackTable.length; stackIndex++) {
            var prefix = stackTable.prefix[stackIndex];
            var frameIndex = stackTable.frame[stackIndex];
            var category = stackTable.category[stackIndex];
            var subcategory = stackTable.subcategory[stackIndex];
            var funcIndex = frameTable.func[frameIndex];
            var doesPrefixMatch = prefix === null ? true : stackMatches[prefix];
            var prefixDepth = prefix === null ? -1 : stackDepths[prefix];
            var currentFuncOnPath = callNodePath[prefixDepth + 1];
            var doMerge = false;
            var stackDepth = prefixDepth;
            var doesMatchCallNodePath = void 0;
            if (doesPrefixMatch && stackDepth < depthAtCallNodePathLeaf) {
                // This stack's prefixes were in our CallNodePath.
                if (currentFuncOnPath === funcIndex) {
                    // This stack's function matches too!
                    doesMatchCallNodePath = true;
                    if (stackDepth + 1 === depthAtCallNodePathLeaf) {
                        // Holy cow, we found a match for our merge operation and can merge this stack.
                        doMerge = true;
                    }
                    else {
                        // Since we found a match, increase the stack depth. This should match
                        // the depth of the implementation filtered stacks.
                        stackDepth++;
                    }
                }
                else if (!funcMatchesImplementation(thread, funcIndex)) {
                    // This stack's function does not match the CallNodePath, however it's not part
                    // of the CallNodePath's implementation filter. Go ahead and keep it.
                    doesMatchCallNodePath = true;
                }
                else {
                    // While all of the predecessors matched, this stack's function does not :(
                    doesMatchCallNodePath = false;
                }
            }
            else {
                // This stack is not part of a matching branch of the tree.
                doesMatchCallNodePath = false;
            }
            stackMatches[stackIndex] = doesMatchCallNodePath;
            stackDepths[stackIndex] = stackDepth;
            // Map the oldStackToNewStack, and only push on the stacks that aren't merged.
            if (doMerge) {
                var newStackPrefix = oldStackToNewStack.get(prefix);
                oldStackToNewStack.set(stackIndex, newStackPrefix === undefined ? null : newStackPrefix);
            }
            else {
                var newStackIndex = newStackTable.length++;
                var newStackPrefix = oldStackToNewStack.get(prefix);
                newStackTable.prefix[newStackIndex] =
                    newStackPrefix === undefined ? null : newStackPrefix;
                newStackTable.frame[newStackIndex] = frameIndex;
                newStackTable.category[newStackIndex] = category;
                newStackTable.subcategory[newStackIndex] = subcategory;
                oldStackToNewStack.set(stackIndex, newStackIndex);
            }
        }
        return profile_data_1.updateThreadStacks(thread, newStackTable, profile_data_1.getMapStackUpdater(oldStackToNewStack));
    });
}
exports.mergeCallNode = mergeCallNode;
/**
 * Go through the StackTable and remove any stacks that are part of the given function.
 * This operation effectively merges the timing of the stacks into their callers.
 */
function mergeFunction(thread, funcIndexToMerge) {
    var stackTable = thread.stackTable, frameTable = thread.frameTable;
    var oldStackToNewStack = new Map();
    // A root stack's prefix will be null. Maintain that relationship from old to new
    // stacks by mapping from null to null.
    oldStackToNewStack.set(null, null);
    var newStackTable = data_structures_1.getEmptyStackTable();
    for (var stackIndex = 0; stackIndex < stackTable.length; stackIndex++) {
        var prefix = stackTable.prefix[stackIndex];
        var frameIndex = stackTable.frame[stackIndex];
        var category = stackTable.category[stackIndex];
        var subcategory = stackTable.subcategory[stackIndex];
        var funcIndex = frameTable.func[frameIndex];
        if (funcIndex === funcIndexToMerge) {
            var newStackPrefix = oldStackToNewStack.get(prefix);
            oldStackToNewStack.set(stackIndex, newStackPrefix === undefined ? null : newStackPrefix);
        }
        else {
            var newStackIndex = newStackTable.length++;
            var newStackPrefix = oldStackToNewStack.get(prefix);
            newStackTable.prefix[newStackIndex] =
                newStackPrefix === undefined ? null : newStackPrefix;
            newStackTable.frame[newStackIndex] = frameIndex;
            newStackTable.category[newStackIndex] = category;
            newStackTable.subcategory[newStackIndex] = subcategory;
            oldStackToNewStack.set(stackIndex, newStackIndex);
        }
    }
    return profile_data_1.updateThreadStacks(thread, newStackTable, profile_data_1.getMapStackUpdater(oldStackToNewStack));
}
exports.mergeFunction = mergeFunction;
/**
 * Drop any samples that contain the given function.
 */
function dropFunction(thread, funcIndexToDrop) {
    var stackTable = thread.stackTable, frameTable = thread.frameTable;
    // Go through each stack, and label it as containing the function or not.
    var stackContainsFunc = [];
    for (var stackIndex = 0; stackIndex < stackTable.length; stackIndex++) {
        var prefix = stackTable.prefix[stackIndex];
        var frameIndex = stackTable.frame[stackIndex];
        var funcIndex = frameTable.func[frameIndex];
        if (
        // This is the function we want to remove.
        funcIndex === funcIndexToDrop ||
            // The parent of this stack contained the function.
            (prefix !== null && stackContainsFunc[prefix])) {
            stackContainsFunc[stackIndex] = true;
        }
    }
    return profile_data_1.updateThreadStacks(thread, stackTable, function (stack) {
        // Drop the stacks that contain that function.
        return stack !== null && stackContainsFunc[stack] ? null : stack;
    });
}
exports.dropFunction = dropFunction;
function collapseResource(thread, resourceIndexToCollapse, implementation, defaultCategory) {
    var stackTable = thread.stackTable, funcTable = thread.funcTable, frameTable = thread.frameTable, resourceTable = thread.resourceTable;
    var resourceNameIndex = resourceTable.name[resourceIndexToCollapse];
    var newFrameTable = data_structures_1.shallowCloneFrameTable(frameTable);
    var newFuncTable = data_structures_1.shallowCloneFuncTable(funcTable);
    var newStackTable = data_structures_1.getEmptyStackTable();
    var oldStackToNewStack = new Map();
    var prefixStackToCollapsedStack = new Map();
    var collapsedStacks = new Set();
    var funcMatchesImplementation = FUNC_MATCHES[implementation];
    // A root stack's prefix will be null. Maintain that relationship from old to new
    // stacks by mapping from null to null.
    oldStackToNewStack.set(null, null);
    // A new func and frame will be created on the first stack that is found that includes
    // the given resource.
    var collapsedFrameIndex;
    var collapsedFuncIndex;
    for (var stackIndex = 0; stackIndex < stackTable.length; stackIndex++) {
        var prefix = stackTable.prefix[stackIndex];
        var frameIndex = stackTable.frame[stackIndex];
        var category = stackTable.category[stackIndex];
        var subcategory = stackTable.subcategory[stackIndex];
        var funcIndex = frameTable.func[frameIndex];
        var resourceIndex = funcTable.resource[funcIndex];
        var newStackPrefix = oldStackToNewStack.get(prefix);
        if (newStackPrefix === undefined) {
            throw new Error('newStackPrefix must not be undefined');
        }
        if (resourceIndex === resourceIndexToCollapse) {
            // The stack matches this resource.
            if (!collapsedStacks.has(newStackPrefix)) {
                // The prefix is not a collapsed stack. So this stack will not collapse into its
                // prefix stack. But it might collapse into a sibling stack, if there exists a
                // sibling with the same resource. Check if a collapsed stack with the same
                // prefix (i.e. a collapsed sibling) exists.
                var existingCollapsedStack = prefixStackToCollapsedStack.get(prefix);
                if (existingCollapsedStack === undefined) {
                    // Create a new collapsed frame.
                    // Compute the next indexes
                    var newStackIndex = newStackTable.length++;
                    collapsedStacks.add(newStackIndex);
                    oldStackToNewStack.set(stackIndex, newStackIndex);
                    prefixStackToCollapsedStack.set(prefix, newStackIndex);
                    if (collapsedFrameIndex === undefined) {
                        collapsedFrameIndex = newFrameTable.length++;
                        collapsedFuncIndex = newFuncTable.length++;
                        // Add the collapsed frame
                        newFrameTable.address.push(frameTable.address[frameIndex]);
                        newFrameTable.category.push(frameTable.category[frameIndex]);
                        newFrameTable.subcategory.push(frameTable.subcategory[frameIndex]);
                        newFrameTable.func.push(collapsedFuncIndex);
                        newFrameTable.line.push(frameTable.line[frameIndex]);
                        newFrameTable.column.push(frameTable.column[frameIndex]);
                        newFrameTable.innerWindowID.push(frameTable.innerWindowID[frameIndex]);
                        newFrameTable.implementation.push(frameTable.implementation[frameIndex]);
                        newFrameTable.optimizations.push(frameTable.optimizations[frameIndex]);
                        // Add the psuedo-func
                        newFuncTable.address.push(funcTable.address[funcIndex]);
                        newFuncTable.isJS.push(funcTable.isJS[funcIndex]);
                        newFuncTable.name.push(resourceNameIndex);
                        newFuncTable.resource.push(funcTable.resource[funcIndex]);
                        newFuncTable.fileName.push(funcTable.fileName[funcIndex]);
                        newFuncTable.lineNumber.push(null);
                        newFuncTable.columnNumber.push(null);
                    }
                    // Add the new stack.
                    newStackTable.prefix.push(newStackPrefix);
                    newStackTable.frame.push(collapsedFrameIndex);
                    newStackTable.category.push(category);
                    newStackTable.subcategory.push(subcategory);
                }
                else {
                    // A collapsed stack at this level already exists, use that one.
                    if (existingCollapsedStack === null) {
                        throw new Error('existingCollapsedStack cannot be null');
                    }
                    oldStackToNewStack.set(stackIndex, existingCollapsedStack);
                    if (newStackTable.category[existingCollapsedStack] !== category) {
                        // Conflicting origin stack categories -> default category + subcategory.
                        newStackTable.category[existingCollapsedStack] = defaultCategory;
                        newStackTable.subcategory[existingCollapsedStack] = 0;
                    }
                    else if (newStackTable.subcategory[existingCollapsedStack] !== subcategory) {
                        // Conflicting origin stack subcategories -> "Other" subcategory.
                        newStackTable.subcategory[existingCollapsedStack] = 0;
                    }
                }
            }
            else {
                // The prefix was already collapsed, use that one.
                oldStackToNewStack.set(stackIndex, newStackPrefix);
            }
        }
        else {
            if (!funcMatchesImplementation(thread, funcIndex) &&
                newStackPrefix !== null) {
                // This function doesn't match the implementation filter.
                var prefixFrame = newStackTable.frame[newStackPrefix];
                var prefixFunc = newFrameTable.func[prefixFrame];
                var prefixResource = newFuncTable.resource[prefixFunc];
                if (prefixResource === resourceIndexToCollapse) {
                    // This stack's prefix did match the collapsed resource, map the stack
                    // to the already collapsed stack and move on.
                    oldStackToNewStack.set(stackIndex, newStackPrefix);
                    continue;
                }
            }
            // This stack isn't part of the collapsed resource. Copy over the previous stack.
            var newStackIndex = newStackTable.length++;
            newStackTable.prefix.push(newStackPrefix);
            newStackTable.frame.push(frameIndex);
            newStackTable.category.push(category);
            newStackTable.subcategory.push(subcategory);
            oldStackToNewStack.set(stackIndex, newStackIndex);
        }
    }
    var newThread = __assign(__assign({}, thread), { frameTable: newFrameTable, funcTable: newFuncTable });
    return profile_data_1.updateThreadStacks(newThread, newStackTable, profile_data_1.getMapStackUpdater(oldStackToNewStack));
}
exports.collapseResource = collapseResource;
function collapseDirectRecursion(thread, funcToCollapse, implementation) {
    var stackTable = thread.stackTable, frameTable = thread.frameTable;
    var oldStackToNewStack = new Map();
    // A root stack's prefix will be null. Maintain that relationship from old to new
    // stacks by mapping from null to null.
    oldStackToNewStack.set(null, null);
    var recursiveStacks = new Set();
    var newStackTable = data_structures_1.getEmptyStackTable();
    var funcMatchesImplementation = FUNC_MATCHES[implementation];
    for (var stackIndex = 0; stackIndex < stackTable.length; stackIndex++) {
        var prefix = stackTable.prefix[stackIndex];
        var frameIndex = stackTable.frame[stackIndex];
        var category = stackTable.category[stackIndex];
        var subcategory = stackTable.subcategory[stackIndex];
        var funcIndex = frameTable.func[frameIndex];
        if (
        // The previous stacks were collapsed or matched the funcToCollapse, check to see
        // if this is a candidate for collapsing as well.
        recursiveStacks.has(prefix) &&
            // Either the function must match, or the implementation must be different.
            (funcToCollapse === funcIndex ||
                !funcMatchesImplementation(thread, funcIndex))) {
            // Out of N consecutive stacks that match the function to collapse, only remove
            // stacks that are N > 1.
            var newPrefixStackIndex = oldStackToNewStack.get(prefix);
            if (newPrefixStackIndex === undefined) {
                throw new Error('newPrefixStackIndex cannot be undefined');
            }
            oldStackToNewStack.set(stackIndex, newPrefixStackIndex);
            recursiveStacks.add(stackIndex);
        }
        else {
            // Add a stack in two cases:
            //   1. It doesn't match the collapse requirements.
            //   2. It is the first instance of a stack to collapse, re-use the stack and frame
            //      information for the collapsed stack.
            var newStackIndex = newStackTable.length++;
            var newStackPrefix = oldStackToNewStack.get(prefix);
            if (newStackPrefix === undefined) {
                throw new Error('The newStackPrefix must exist because prefix < stackIndex as the StackTable is ordered.');
            }
            newStackTable.prefix[newStackIndex] = newStackPrefix;
            newStackTable.frame[newStackIndex] = frameIndex;
            newStackTable.category[newStackIndex] = category;
            newStackTable.subcategory[newStackIndex] = subcategory;
            oldStackToNewStack.set(stackIndex, newStackIndex);
            if (funcToCollapse === funcIndex) {
                recursiveStacks.add(stackIndex);
            }
        }
    }
    return profile_data_1.updateThreadStacks(thread, newStackTable, profile_data_1.getMapStackUpdater(oldStackToNewStack));
}
exports.collapseDirectRecursion = collapseDirectRecursion;
var FUNC_MATCHES = {
    combined: function (_thread, _funcIndex) { return true; },
    cpp: function (thread, funcIndex) {
        var funcTable = thread.funcTable, stringTable = thread.stringTable;
        // Return quickly if this is a JS frame.
        if (thread.funcTable.isJS[funcIndex]) {
            return false;
        }
        // Regular C++ functions are associated with a resource that describes the
        // shared library that these C++ functions were loaded from. Jitcode is not
        // loaded from shared libraries but instead generated at runtime, so Jitcode
        // frames are not associated with a shared library and thus have no resource
        var locationString = stringTable.getString(funcTable.name[funcIndex]);
        var isProbablyJitCode = funcTable.resource[funcIndex] === -1 && locationString.startsWith('0x');
        return !isProbablyJitCode;
    },
    js: function (thread, funcIndex) {
        return (thread.funcTable.isJS[funcIndex] ||
            thread.funcTable.relevantForJS[funcIndex]);
    }
};
function collapseFunctionSubtree(thread, funcToCollapse, defaultCategory) {
    var stackTable = thread.stackTable, frameTable = thread.frameTable;
    var oldStackToNewStack = new Map();
    // A root stack's prefix will be null. Maintain that relationship from old to new
    // stacks by mapping from null to null.
    oldStackToNewStack.set(null, null);
    var collapsedStacks = new Set();
    var newStackTable = data_structures_1.getEmptyStackTable();
    for (var stackIndex = 0; stackIndex < stackTable.length; stackIndex++) {
        var prefix = stackTable.prefix[stackIndex];
        if (
        // The previous stack was collapsed, this one is collapsed too.
        collapsedStacks.has(prefix)) {
            // Only remember that this stack is collapsed.
            var newPrefixStackIndex = oldStackToNewStack.get(prefix);
            if (newPrefixStackIndex === undefined) {
                throw new Error('newPrefixStackIndex cannot be undefined');
            }
            // Many collapsed stacks will potentially all point to the first stack that used the
            // funcToCollapse, so newPrefixStackIndex will potentially be assigned to many
            // stacks. This is what actually "collapses" a stack.
            oldStackToNewStack.set(stackIndex, newPrefixStackIndex);
            collapsedStacks.add(stackIndex);
            // Fall back to the default category when stack categories conflict.
            if (newPrefixStackIndex !== null) {
                if (newStackTable.category[newPrefixStackIndex] !==
                    stackTable.category[stackIndex]) {
                    newStackTable.category[newPrefixStackIndex] = defaultCategory;
                    newStackTable.subcategory[newPrefixStackIndex] = 0;
                }
                else if (newStackTable.subcategory[newPrefixStackIndex] !==
                    stackTable.subcategory[stackIndex]) {
                    newStackTable.subcategory[newPrefixStackIndex] = 0;
                }
            }
        }
        else {
            // Add this stack.
            var newStackIndex = newStackTable.length++;
            var newStackPrefix = oldStackToNewStack.get(prefix);
            if (newStackPrefix === undefined) {
                throw new Error('The newStackPrefix must exist because prefix < stackIndex as the StackTable is ordered.');
            }
            var frameIndex = stackTable.frame[stackIndex];
            var category = stackTable.category[stackIndex];
            var subcategory = stackTable.subcategory[stackIndex];
            newStackTable.prefix[newStackIndex] = newStackPrefix;
            newStackTable.frame[newStackIndex] = frameIndex;
            newStackTable.category[newStackIndex] = category;
            newStackTable.subcategory[newStackIndex] = subcategory;
            oldStackToNewStack.set(stackIndex, newStackIndex);
            // If this is the function to collapse, keep the stack, but note that its children
            // should be discarded.
            var funcIndex = frameTable.func[frameIndex];
            if (funcToCollapse === funcIndex) {
                collapsedStacks.add(stackIndex);
            }
        }
    }
    return profile_data_1.updateThreadStacks(thread, newStackTable, profile_data_1.getMapStackUpdater(oldStackToNewStack));
}
exports.collapseFunctionSubtree = collapseFunctionSubtree;
/**
 * Filter thread to only contain stacks which start with a CallNodePath, and
 * only samples with those stacks. The new stacks' roots will be frames whose
 * func is the last element of the prefix CallNodePath.
 */
function focusSubtree(thread, callNodePath, implementation) {
    return time_code_1.timeCode('focusSubtree', function () {
        var stackTable = thread.stackTable, frameTable = thread.frameTable;
        var prefixDepth = callNodePath.length;
        var stackMatches = new Int32Array(stackTable.length);
        var funcMatchesImplementation = FUNC_MATCHES[implementation];
        var oldStackToNewStack = new Map();
        // A root stack's prefix will be null. Maintain that relationship from old to new
        // stacks by mapping from null to null.
        oldStackToNewStack.set(null, null);
        var newStackTable = data_structures_1.getEmptyStackTable();
        for (var stackIndex = 0; stackIndex < stackTable.length; stackIndex++) {
            var prefix = stackTable.prefix[stackIndex];
            var prefixMatchesUpTo = prefix !== null ? stackMatches[prefix] : 0;
            var stackMatchesUpTo = -1;
            if (prefixMatchesUpTo !== -1) {
                var frame = stackTable.frame[stackIndex];
                var category = stackTable.category[stackIndex];
                var subcategory = stackTable.subcategory[stackIndex];
                if (prefixMatchesUpTo === prefixDepth) {
                    stackMatchesUpTo = prefixDepth;
                }
                else {
                    var funcIndex = frameTable.func[frame];
                    if (funcIndex === callNodePath[prefixMatchesUpTo]) {
                        stackMatchesUpTo = prefixMatchesUpTo + 1;
                    }
                    else if (!funcMatchesImplementation(thread, funcIndex)) {
                        stackMatchesUpTo = prefixMatchesUpTo;
                    }
                }
                if (stackMatchesUpTo === prefixDepth) {
                    var newStackIndex = newStackTable.length++;
                    var newStackPrefix = oldStackToNewStack.get(prefix);
                    newStackTable.prefix[newStackIndex] =
                        newStackPrefix !== undefined ? newStackPrefix : null;
                    newStackTable.frame[newStackIndex] = frame;
                    newStackTable.category[newStackIndex] = category;
                    newStackTable.subcategory[newStackIndex] = subcategory;
                    oldStackToNewStack.set(stackIndex, newStackIndex);
                }
            }
            stackMatches[stackIndex] = stackMatchesUpTo;
        }
        return profile_data_1.updateThreadStacks(thread, newStackTable, function (oldStack) {
            if (oldStack === null || stackMatches[oldStack] !== prefixDepth) {
                return null;
            }
            var newStack = oldStackToNewStack.get(oldStack);
            if (newStack === undefined) {
                throw new Error('Converting from the old stack to a new stack cannot be undefined');
            }
            return newStack;
        });
    });
}
exports.focusSubtree = focusSubtree;
/**
 * Filter thread to only contain stacks which end with a CallNodePath, and
 * only samples with those stacks. The new stacks' leaf frames will be
 * frames whose func is the last element of the postfix func array.
 */
function focusInvertedSubtree(thread, postfixCallNodePath, implementation) {
    return time_code_1.timeCode('focusInvertedSubtree', function () {
        var postfixDepth = postfixCallNodePath.length;
        var stackTable = thread.stackTable, frameTable = thread.frameTable;
        var funcMatchesImplementation = FUNC_MATCHES[implementation];
        function convertStack(leaf) {
            var matchesUpToDepth = 0; // counted from the leaf
            for (var stack = leaf; stack !== null; stack = stackTable.prefix[stack]) {
                var frame = stackTable.frame[stack];
                var funcIndex = frameTable.func[frame];
                if (funcIndex === postfixCallNodePath[matchesUpToDepth]) {
                    matchesUpToDepth++;
                    if (matchesUpToDepth === postfixDepth) {
                        return stack;
                    }
                }
                else if (funcMatchesImplementation(thread, funcIndex)) {
                    return null;
                }
            }
            return null;
        }
        var oldStackToNewStack = new Map();
        // A root stack's prefix will be null. Maintain that relationship from old to new
        // stacks by mapping from null to null.
        oldStackToNewStack.set(null, null);
        return profile_data_1.updateThreadStacks(thread, stackTable, function (stackIndex) {
            var newStackIndex = oldStackToNewStack.get(stackIndex);
            if (newStackIndex === undefined) {
                newStackIndex = convertStack(stackIndex);
                oldStackToNewStack.set(stackIndex, newStackIndex);
            }
            return newStackIndex;
        });
    });
}
exports.focusInvertedSubtree = focusInvertedSubtree;
function focusFunction(thread, funcIndexToFocus) {
    return time_code_1.timeCode('focusFunction', function () {
        var stackTable = thread.stackTable, frameTable = thread.frameTable;
        var oldStackToNewStack = new Map();
        // A root stack's prefix will be null. Maintain that relationship from old to new
        // stacks by mapping from null to null.
        oldStackToNewStack.set(null, null);
        var newStackTable = data_structures_1.getEmptyStackTable();
        for (var stackIndex = 0; stackIndex < stackTable.length; stackIndex++) {
            var prefix = stackTable.prefix[stackIndex];
            var frameIndex = stackTable.frame[stackIndex];
            var category = stackTable.category[stackIndex];
            var subcategory = stackTable.subcategory[stackIndex];
            var funcIndex = frameTable.func[frameIndex];
            var matchesFocusFunc = funcIndex === funcIndexToFocus;
            var newPrefix = oldStackToNewStack.get(prefix);
            if (newPrefix === undefined) {
                throw new Error('The prefix should not map to an undefined value');
            }
            if (newPrefix !== null || matchesFocusFunc) {
                var newStackIndex = newStackTable.length++;
                newStackTable.prefix[newStackIndex] = newPrefix;
                newStackTable.frame[newStackIndex] = frameIndex;
                newStackTable.category[newStackIndex] = category;
                newStackTable.subcategory[newStackIndex] = subcategory;
                oldStackToNewStack.set(stackIndex, newStackIndex);
            }
            else {
                oldStackToNewStack.set(stackIndex, null);
            }
        }
        return profile_data_1.updateThreadStacks(thread, newStackTable, profile_data_1.getMapStackUpdater(oldStackToNewStack));
    });
}
exports.focusFunction = focusFunction;
/**
 * When restoring function in a CallNodePath there can be multiple correct CallNodePaths
 * that could be restored. The best approach would probably be to restore to the
 * "heaviest" callstack in the call tree (i.e. the one that is displayed first in the
 * calltree because it has the most samples under it.) This function only finds the first
 * match and returns it.
 */
function restoreAllFunctionsInCallNodePath(thread, previousImplementationFilter, callNodePath) {
    var stackTable = thread.stackTable, frameTable = thread.frameTable;
    var funcMatchesImplementation = FUNC_MATCHES[previousImplementationFilter];
    // For every stackIndex, matchesUpToDepth[stackIndex] will be:
    //  - null if stackIndex does not match the callNodePath
    //  - <depth> if stackIndex matches callNodePath up to (and including) callNodePath[<depth>]
    var matchesUpToDepth = [];
    var tipStackIndex = null;
    // Try to find the tip most stackIndex in the CallNodePath, but skip anything
    // that doesn't match the previous implementation filter.
    for (var stackIndex = 0; stackIndex < stackTable.length; stackIndex++) {
        var prefix = stackTable.prefix[stackIndex];
        var frameIndex = stackTable.frame[stackIndex];
        var funcIndex = frameTable.func[frameIndex];
        var prefixPathDepth = prefix === null ? -1 : matchesUpToDepth[prefix];
        if (prefixPathDepth === null) {
            continue;
        }
        var pathDepth = prefixPathDepth + 1;
        var nextPathFuncIndex = callNodePath[pathDepth];
        if (nextPathFuncIndex === funcIndex) {
            // This function is a match.
            matchesUpToDepth[stackIndex] = pathDepth;
            if (pathDepth === callNodePath.length - 1) {
                // The tip of the CallNodePath has been found.
                tipStackIndex = stackIndex;
                break;
            }
        }
        else if (!funcMatchesImplementation(thread, funcIndex)) {
            // This function didn't match, but it also wasn't in the previous implementation.
            // Keep on searching for a match.
            matchesUpToDepth[stackIndex] = prefixPathDepth;
        }
        else {
            matchesUpToDepth[stackIndex] = null;
        }
    }
    // Turn the stack index into a CallNodePath
    if (tipStackIndex === null) {
        return [];
    }
    var newCallNodePath = [];
    for (var stackIndex = tipStackIndex; stackIndex !== null; stackIndex = stackTable.prefix[stackIndex]) {
        var frameIndex = stackTable.frame[stackIndex];
        var funcIndex = frameTable.func[frameIndex];
        newCallNodePath.push(funcIndex);
    }
    return newCallNodePath.reverse();
}
exports.restoreAllFunctionsInCallNodePath = restoreAllFunctionsInCallNodePath;
function getStackType(thread, funcIndex) {
    if (FUNC_MATCHES.cpp(thread, funcIndex)) {
        return 'native';
    }
    else if (FUNC_MATCHES.js(thread, funcIndex)) {
        return 'js';
    }
    return 'unsymbolicated';
}
exports.getStackType = getStackType;
function filterCallNodePathByImplementation(thread, implementationFilter, callNodePath) {
    var funcMatchesImplementation = FUNC_MATCHES[implementationFilter];
    return callNodePath.filter(function (funcIndex) {
        return funcMatchesImplementation(thread, funcIndex);
    });
}
exports.filterCallNodePathByImplementation = filterCallNodePathByImplementation;
/**
 * Search through the entire call stack and see if there are any examples of
 * recursion.
 */
function funcHasRecursiveCall(thread, implementation, funcToCheck) {
    var stackTable = thread.stackTable, frameTable = thread.frameTable;
    var recursiveStacks = new Set();
    var funcMatchesImplementation = FUNC_MATCHES[implementation];
    for (var stackIndex = 0; stackIndex < stackTable.length; stackIndex++) {
        var frameIndex = stackTable.frame[stackIndex];
        var prefix = stackTable.prefix[stackIndex];
        var funcIndex = frameTable.func[frameIndex];
        var recursivePrefix = recursiveStacks.has(prefix);
        if (funcToCheck === funcIndex) {
            if (recursivePrefix) {
                // This function matches and so did its prefix of the same implementation.
                return true;
            }
            recursiveStacks.add(stackIndex);
        }
        else {
            if (recursivePrefix && !funcMatchesImplementation(thread, funcIndex)) {
                recursiveStacks.add(stackIndex);
            }
        }
    }
    return false;
}
exports.funcHasRecursiveCall = funcHasRecursiveCall;
function applyTransform(thread, transform, defaultCategory) {
    switch (transform.type) {
        case 'focus-subtree':
            return transform.inverted
                ? focusInvertedSubtree(thread, transform.callNodePath, transform.implementation)
                : focusSubtree(thread, transform.callNodePath, transform.implementation);
        case 'merge-call-node':
            return mergeCallNode(thread, transform.callNodePath, transform.implementation);
        case 'merge-function':
            return mergeFunction(thread, transform.funcIndex);
        case 'drop-function':
            return dropFunction(thread, transform.funcIndex);
        case 'focus-function':
            return focusFunction(thread, transform.funcIndex);
        case 'collapse-resource':
            return collapseResource(thread, transform.resourceIndex, transform.implementation, defaultCategory);
        case 'collapse-direct-recursion':
            return collapseDirectRecursion(thread, transform.funcIndex, transform.implementation);
        case 'collapse-function-subtree':
            return collapseFunctionSubtree(thread, transform.funcIndex, defaultCategory);
        default:
            throw flow_1.assertExhaustiveCheck(transform);
    }
}
exports.applyTransform = applyTransform;
