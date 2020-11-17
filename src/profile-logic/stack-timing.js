"use strict";
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
exports.__esModule = true;
exports.getStackTimingByDepth = void 0;
Milliseconds[],
    end;
Milliseconds[],
    callNode;
IndexIntoCallNodeTable[],
    length;
number,
;
;
/**
 * Build a StackTimingByDepth table from a given thread.
 */
function getStackTimingByDepth(thread, callNodeInfo, maxDepth, interval) {
    var callNodeTable = callNodeInfo.callNodeTable, stackIndexToCallNodeIndex = callNodeInfo.stackIndexToCallNodeIndex;
    var stackTimingByDepth = Array.from({ length: maxDepth }, function () { return ({
        start: [],
        end: [],
        callNode: [],
        length: 0
    }); });
    var lastSeen = {
        startTimeByDepth: [],
        callNodeIndexByDepth: []
    };
    // Go through each sample, and push/pop it on the stack to build up
    // the stackTimingByDepth.
    var previousDepth = -1;
    for (var i = 0; i < thread.samples.length; i++) {
        var stackIndex = thread.samples.stack[i];
        var sampleTime = thread.samples.time[i];
        // If this stack index is null (for instance if it was filtered out) then pop back
        // down to the base stack.
        if (stackIndex === null) {
            _popStacks(stackTimingByDepth, lastSeen, -1, previousDepth, sampleTime);
            previousDepth = -1;
        }
        else {
            var callNodeIndex = stackIndexToCallNodeIndex[stackIndex];
            var depth = callNodeTable.depth[callNodeIndex];
            // Find the depth of the nearest shared stack.
            var depthToPop = _findNearestSharedCallNodeDepth(callNodeTable, callNodeIndex, lastSeen, depth);
            _popStacks(stackTimingByDepth, lastSeen, depthToPop, previousDepth, sampleTime);
            _pushStacks(thread, callNodeTable, lastSeen, depth, callNodeIndex, sampleTime);
            previousDepth = depth;
        }
    }
    // Pop the remaining stacks
    var lastIndex = thread.samples.length - 1;
    var endingTime = thread.samples.time[lastIndex] + interval;
    _popStacks(stackTimingByDepth, lastSeen, -1, previousDepth, endingTime);
    return stackTimingByDepth;
}
exports.getStackTimingByDepth = getStackTimingByDepth;
function _findNearestSharedCallNodeDepth(callNodeTable, callNodeIndex, lastSeen, depthStart) {
    var nextCallNodeIndex = callNodeIndex;
    for (var depth = depthStart; depth >= 0; depth--) {
        if (lastSeen.callNodeIndexByDepth[depth] === nextCallNodeIndex) {
            return depth;
        }
        nextCallNodeIndex = callNodeTable.prefix[nextCallNodeIndex];
    }
    return -1;
}
function _popStacks(stackTimingByDepth, lastSeen, depth, previousDepth, sampleTime) {
    // "Pop" off the stack, and commit the timing of the frames
    for (var stackDepth = depth + 1; stackDepth <= previousDepth; stackDepth++) {
        // Push on the new information.
        stackTimingByDepth[stackDepth].start.push(lastSeen.startTimeByDepth[stackDepth]);
        stackTimingByDepth[stackDepth].end.push(sampleTime);
        stackTimingByDepth[stackDepth].callNode.push(lastSeen.callNodeIndexByDepth[stackDepth]);
        stackTimingByDepth[stackDepth].length++;
        // Delete that this stack frame has been seen.
        delete lastSeen.callNodeIndexByDepth[stackDepth];
        delete lastSeen.startTimeByDepth[stackDepth];
    }
}
function _pushStacks(thread, callNodeTable, lastSeen, depth, startingCallNodeIndex, sampleTime) {
    var callNodeIndex = startingCallNodeIndex;
    // "Push" onto the stack with new frames
    for (var parentDepth = depth; parentDepth >= 0; parentDepth--) {
        if (callNodeIndex === -1 ||
            lastSeen.callNodeIndexByDepth[parentDepth] !== undefined) {
            break;
        }
        lastSeen.callNodeIndexByDepth[parentDepth] = callNodeIndex;
        lastSeen.startTimeByDepth[parentDepth] = sampleTime;
        callNodeIndex = callNodeTable.prefix[callNodeIndex];
    }
}
