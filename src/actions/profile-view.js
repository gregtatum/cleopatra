"use strict";
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.handleCallNodeTransformShortcut = exports.changeMouseTimePosition = exports.setDataSource = exports.changeProfileName = exports.changeTimelineType = exports.popTransformsFromStack = exports.addTransformToStack = exports.popCommittedRanges = exports.commitRange = exports.updatePreviewSelection = exports.changeShowJsTracerSummary = exports.changeShowUserTimings = exports.changeInvertCallstack = exports.changeCallTreeSummaryStrategy = exports.changeImplementationFilter = exports.changeNetworkSearchString = exports.changeMarkersSearchString = exports.changeRightClickedMarker = exports.changeSelectedNetworkMarker = exports.changeSelectedMarker = exports.changeExpandedCallNodes = exports.expandAllCallNodeDescendants = exports.changeCallTreeSearchString = exports.isolateLocalTrack = exports.showLocalTrack = exports.hideLocalTrack = exports.changeLocalTrackOrder = exports.isolateProcessMainThread = exports.isolateScreenshot = exports.isolateProcess = exports.showGlobalTrack = exports.hideGlobalTrack = exports.changeGlobalTrackOrder = exports.setContextMenuVisibility = exports.changeRightClickedTrack = exports.focusCallTree = exports.selectActiveTabTrack = exports.selectTrack = exports.changeSelectedThreads = exports.selectBestAncestorCallNodeAndExpandCallTree = exports.selectRootCallNode = exports.selectLeafCallNode = exports.changeRightClickedCallNode = exports.changeSelectedCallNode = void 0;
var common_tags_1 = require("common-tags");
var app_1 = require("firefox-profiler/selectors/app");
var profile_1 = require("firefox-profiler/selectors/profile");
var per_thread_1 = require("firefox-profiler/selectors/per-thread");
var url_state_1 = require("firefox-profiler/selectors/url-state");
var profile_data_1 = require("firefox-profiler/profile-logic/profile-data");
var flow_1 = require("firefox-profiler/utils/flow");
var analytics_1 = require("firefox-profiler/utils/analytics");
var index_1 = require("firefox-profiler/utils/index");
var transforms_1 = require("../profile-logic/transforms");
/**
 * This file contains actions that pertain to changing the view on the profile, including
 * searching and filtering. Currently the call tree's actions are in this file, but
 * should be split apart. These actions should most likely affect every panel.
 */
/**
 * Select a call node for a given thread. An optional call node path can be provided
 * to expand child nodes beyond the selected call node path.
 *
 * Note that optionalExpandedToCallNodePath, if specified, must be a descendant call node
 * of selectedCallNodePath.
 */
function changeSelectedCallNode(threadsKey, selectedCallNodePath, optionalExpandedToCallNodePath) {
    if (optionalExpandedToCallNodePath) {
        for (var i = 0; i < selectedCallNodePath.length; i++) {
            if (selectedCallNodePath[i] !== optionalExpandedToCallNodePath[i]) {
                // This assertion ensures that the selectedCallNode will be correctly expanded.
                throw new Error(common_tags_1.oneLine(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n            The optional expanded call node path provided to the changeSelectedCallNode\n            must contain the selected call node path.\n          "], ["\n            The optional expanded call node path provided to the changeSelectedCallNode\n            must contain the selected call node path.\n          "]))));
            }
        }
    }
    return {
        type: 'CHANGE_SELECTED_CALL_NODE',
        selectedCallNodePath: selectedCallNodePath,
        optionalExpandedToCallNodePath: optionalExpandedToCallNodePath,
        threadsKey: threadsKey
    };
}
exports.changeSelectedCallNode = changeSelectedCallNode;
/**
 * This action is used when the user right clicks on a call node (in panels such
 * as the call tree, the flame chart, or the stack chart). It's especially used
 * to display the context menu.
 */
function changeRightClickedCallNode(threadsKey, callNodePath) {
    return {
        type: 'CHANGE_RIGHT_CLICKED_CALL_NODE',
        threadsKey: threadsKey,
        callNodePath: callNodePath
    };
}
exports.changeRightClickedCallNode = changeRightClickedCallNode;
/**
 * Given a threadIndex and a sampleIndex, select the call node at the top ("leaf")
 * of that sample's stack.
 */
function selectLeafCallNode(threadsKey, sampleIndex) {
    return function (dispatch, getState) {
        var threadSelectors = per_thread_1.getThreadSelectorsFromThreadsKey(threadsKey);
        var filteredThread = threadSelectors.getFilteredThread(getState());
        var callNodeInfo = threadSelectors.getCallNodeInfo(getState());
        var newSelectedStack = filteredThread.samples.stack[sampleIndex];
        var newSelectedCallNode = newSelectedStack === null
            ? -1
            : callNodeInfo.stackIndexToCallNodeIndex[newSelectedStack];
        dispatch(changeSelectedCallNode(threadsKey, profile_data_1.getCallNodePathFromIndex(newSelectedCallNode, callNodeInfo.callNodeTable)));
    };
}
exports.selectLeafCallNode = selectLeafCallNode;
/**
 * Given a threadIndex and a sampleIndex, select the call node at the bottom ("root")
 * of that sample's stack.
 */
function selectRootCallNode(threadsKey, sampleIndex) {
    return function (dispatch, getState) {
        var threadSelectors = per_thread_1.getThreadSelectorsFromThreadsKey(threadsKey);
        var filteredThread = threadSelectors.getFilteredThread(getState());
        var callNodeInfo = threadSelectors.getCallNodeInfo(getState());
        var newSelectedStack = filteredThread.samples.stack[sampleIndex];
        if (newSelectedStack === null || newSelectedStack === undefined) {
            return;
        }
        var newSelectedCallNode = callNodeInfo.stackIndexToCallNodeIndex[newSelectedStack];
        var selectedCallNodePath = profile_data_1.getCallNodePathFromIndex(newSelectedCallNode, callNodeInfo.callNodeTable);
        var rootCallNodePath = [selectedCallNodePath[0]];
        dispatch(changeSelectedCallNode(threadsKey, rootCallNodePath, selectedCallNodePath));
    };
}
exports.selectRootCallNode = selectRootCallNode;
/**
 * This function provides a different strategy for selecting call nodes. It selects
 * a "best" ancestor call node, but also expands out its children nodes to the
 * actual call node that was clicked. See findBestAncestorCallNode for more
 * on the "best" call node.
 */
function selectBestAncestorCallNodeAndExpandCallTree(threadsKey, sampleIndex) {
    return function (dispatch, getState) {
        var threadSelectors = per_thread_1.getThreadSelectorsFromThreadsKey(threadsKey);
        var fullThread = threadSelectors.getRangeFilteredThread(getState());
        var filteredThread = threadSelectors.getFilteredThread(getState());
        var unfilteredStack = fullThread.samples.stack[sampleIndex];
        var callNodeInfo = threadSelectors.getCallNodeInfo(getState());
        if (unfilteredStack === null) {
            return false;
        }
        var callNodeTable = callNodeInfo.callNodeTable, stackIndexToCallNodeIndex = callNodeInfo.stackIndexToCallNodeIndex;
        var sampleIndexToCallNodeIndex = profile_data_1.getSampleIndexToCallNodeIndex(filteredThread.samples.stack, stackIndexToCallNodeIndex);
        var clickedCallNode = sampleIndexToCallNodeIndex[sampleIndex];
        var clickedCategory = fullThread.stackTable.category[unfilteredStack];
        if (clickedCallNode === null) {
            return false;
        }
        var sampleCategories = profile_data_1.getSampleCategories(fullThread.samples, fullThread.stackTable);
        var bestAncestorCallNode = profile_data_1.findBestAncestorCallNode(callNodeInfo, sampleIndexToCallNodeIndex, sampleCategories, clickedCallNode, clickedCategory);
        // In one dispatch, change the selected call node to the best ancestor call node, but
        // also expand out to the clicked call node.
        dispatch(changeSelectedCallNode(threadsKey, 
        // Select the best ancestor call node.
        profile_data_1.getCallNodePathFromIndex(bestAncestorCallNode, callNodeTable), 
        // Also expand the children nodes out further below it to what was actually
        // clicked.
        profile_data_1.getCallNodePathFromIndex(clickedCallNode, callNodeTable)));
        return true;
    };
}
exports.selectBestAncestorCallNodeAndExpandCallTree = selectBestAncestorCallNodeAndExpandCallTree;
/**
 * This selects a set of thread from thread indexes.
 * Please use it in tests only.
 */
function changeSelectedThreads(selectedThreadIndexes) {
    return {
        type: 'CHANGE_SELECTED_THREAD',
        selectedThreadIndexes: selectedThreadIndexes
    };
}
exports.changeSelectedThreads = changeSelectedThreads;
/**
 * This selects a track from its reference.
 * This will ultimately select the thread that this track belongs to, using its
 * thread index, and may also change the selected tab if it makes sense for this
 * track.
 */
function selectTrack(trackReference, modifier) {
    return function (dispatch, getState) {
        var currentlySelectedTab = url_state_1.getSelectedTab(getState());
        // These get assigned based on the track type.
        var selectedThreadIndex = null;
        var selectedTab = currentlySelectedTab;
        switch (trackReference.type) {
            case 'global': {
                // Handle the case of global tracks.
                var globalTrack = profile_1.getGlobalTrackFromReference(getState(), trackReference);
                // Go through each type, and determine the selected slug and thread index.
                switch (globalTrack.type) {
                    case 'process': {
                        if (globalTrack.mainThreadIndex === null) {
                            // Do not allow selecting process tracks without a thread index.
                            return;
                        }
                        selectedThreadIndex = globalTrack.mainThreadIndex;
                        // Ensure a relevant thread-based tab is used.
                        if (selectedTab === 'network-chart') {
                            selectedTab = app_1.getLastVisibleThreadTabSlug(getState());
                        }
                        break;
                    }
                    case 'screenshots':
                    case 'visual-progress':
                    case 'perceptual-visual-progress':
                    case 'contentful-visual-progress':
                        // Do not allow selecting these tracks.
                        return;
                    default:
                        throw flow_1.assertExhaustiveCheck(globalTrack, "Unhandled GlobalTrack type.");
                }
                break;
            }
            case 'local': {
                // Handle the case of local tracks.
                var localTrack = profile_1.getLocalTrackFromReference(getState(), trackReference);
                // Go through each type, and determine the tab slug and thread index.
                switch (localTrack.type) {
                    case 'thread': {
                        // Ensure a relevant thread-based tab is used.
                        selectedThreadIndex = localTrack.threadIndex;
                        if (selectedTab === 'network-chart') {
                            selectedTab = app_1.getLastVisibleThreadTabSlug(getState());
                        }
                        break;
                    }
                    case 'network':
                        selectedThreadIndex = localTrack.threadIndex;
                        selectedTab = 'network-chart';
                        break;
                    case 'ipc':
                        selectedThreadIndex = localTrack.threadIndex;
                        selectedTab = 'marker-chart';
                        break;
                    case 'memory': {
                        var counterIndex = localTrack.counterIndex;
                        var counterSelectors = profile_1.getCounterSelectors(counterIndex);
                        var counter = counterSelectors.getCommittedRangeFilteredCounter(getState());
                        selectedThreadIndex = counter.mainThreadIndex;
                        break;
                    }
                    case 'event-delay': {
                        selectedThreadIndex = localTrack.threadIndex;
                        break;
                    }
                    default:
                        throw flow_1.assertExhaustiveCheck(localTrack, "Unhandled LocalTrack type.");
                }
                break;
            }
            default:
                throw flow_1.assertExhaustiveCheck(trackReference, 'Unhandled TrackReference type');
        }
        var doesNextTrackHaveSelectedTab = per_thread_1.getThreadSelectors(selectedThreadIndex)
            .getUsefulTabs(getState())
            .includes(selectedTab);
        if (!doesNextTrackHaveSelectedTab) {
            // If the user switches to another track that doesn't have the current
            // selectedTab then switch to the calltree.
            selectedTab = 'calltree';
        }
        var selectedThreadIndexes = new Set(url_state_1.getSelectedThreadIndexes(getState()));
        switch (modifier) {
            case 'none':
                // Only select the single thread.
                selectedThreadIndexes = new Set([selectedThreadIndex]);
                break;
            case 'ctrl':
                // Toggle the selection.
                if (selectedThreadIndexes.has(selectedThreadIndex)) {
                    selectedThreadIndexes["delete"](selectedThreadIndex);
                    if (selectedThreadIndexes.size === 0) {
                        // Always keep at least one thread selected.
                        return;
                    }
                }
                else {
                    selectedThreadIndexes.add(selectedThreadIndex);
                }
                break;
            default:
                flow_1.assertExhaustiveCheck(modifier, 'Unhandled modifier case.');
                break;
        }
        dispatch({
            type: 'SELECT_TRACK',
            selectedThreadIndexes: selectedThreadIndexes,
            selectedTab: selectedTab
        });
    };
}
exports.selectTrack = selectTrack;
/**
 * This selects an active tab track from its reference.
 * This will ultimately select the thread that this track belongs to, using its
 * thread index, and may also change the selected tab if it makes sense for this
 * track.
 */
function selectActiveTabTrack(trackReference) {
    return function (dispatch, getState) {
        var currentlySelectedTab = url_state_1.getSelectedTab(getState());
        var currentlySelectedThreadIndex = url_state_1.getSelectedThreadIndexes(getState());
        // These get assigned based on the track type.
        var selectedThreadIndex = null;
        var selectedTab = currentlySelectedTab;
        switch (trackReference.type) {
            case 'global': {
                // Handle the case of global tracks.
                var globalTrack = profile_1.getActiveTabGlobalTrackFromReference(getState(), trackReference);
                // Go through each type, and determine the selected slug and thread index.
                switch (globalTrack.type) {
                    case 'tab': {
                        selectedThreadIndex = globalTrack.mainThreadIndex;
                        // Ensure a relevant thread-based tab is used.
                        if (selectedTab === 'network-chart') {
                            selectedTab = app_1.getLastVisibleThreadTabSlug(getState());
                        }
                        break;
                    }
                    case 'screenshots':
                        // Do not allow selecting this track.
                        return;
                    default:
                        throw flow_1.assertExhaustiveCheck(globalTrack, "Unhandled ActiveTabGlobalTrack type.");
                }
                break;
            }
            case 'resource': {
                // Handle the case of resource tracks.
                var resourceTrack = profile_1.getActiveTabResourceTrackFromReference(getState(), trackReference);
                // Go through each type, and determine the selected slug and thread index.
                switch (resourceTrack.type) {
                    case 'sub-frame':
                    case 'thread': {
                        selectedThreadIndex = resourceTrack.threadIndex;
                        // Ensure a relevant thread-based tab is used.
                        if (selectedTab === 'network-chart') {
                            selectedTab = app_1.getLastVisibleThreadTabSlug(getState());
                        }
                        break;
                    }
                    default:
                        throw flow_1.assertExhaustiveCheck(resourceTrack, "Unhandled ActiveTabResourceTrack type.");
                }
                break;
            }
            default:
                throw flow_1.assertExhaustiveCheck(trackReference, 'Unhandled TrackReference type');
        }
        var doesNextTrackHaveSelectedTab = per_thread_1.getThreadSelectors(selectedThreadIndex)
            .getUsefulTabs(getState())
            .includes(selectedTab);
        if (!doesNextTrackHaveSelectedTab) {
            // If the user switches to another track that doesn't have the current
            // selectedTab then switch to the calltree.
            selectedTab = 'calltree';
        }
        if (currentlySelectedTab === selectedTab &&
            currentlySelectedThreadIndex === selectedThreadIndex) {
            return;
        }
        dispatch({
            type: 'SELECT_TRACK',
            selectedThreadIndexes: new Set([selectedThreadIndex]),
            selectedTab: selectedTab
        });
    };
}
exports.selectActiveTabTrack = selectActiveTabTrack;
function focusCallTree() {
    return {
        type: 'FOCUS_CALL_TREE'
    };
}
exports.focusCallTree = focusCallTree;
/**
 * This action is used when the user right clicks a track, and is especially
 * used to display its context menu.
 */
function changeRightClickedTrack(trackReference) {
    return {
        type: 'CHANGE_RIGHT_CLICKED_TRACK',
        trackReference: trackReference
    };
}
exports.changeRightClickedTrack = changeRightClickedTrack;
function setContextMenuVisibility(isVisible) {
    return {
        type: 'SET_CONTEXT_MENU_VISIBILITY',
        isVisible: isVisible
    };
}
exports.setContextMenuVisibility = setContextMenuVisibility;
/**
 * This action is used to change the displayed order of the global tracks.
 */
function changeGlobalTrackOrder(globalTrackOrder) {
    analytics_1.sendAnalytics({
        hitType: 'event',
        eventCategory: 'timeline',
        eventAction: 'change global track order'
    });
    return {
        type: 'CHANGE_GLOBAL_TRACK_ORDER',
        globalTrackOrder: globalTrackOrder
    };
}
exports.changeGlobalTrackOrder = changeGlobalTrackOrder;
/**
 * This action is used to hide a global track.
 * During this process we select a different thread if the hidden track is the
 * currently selected thread. We also prevent from hiding the last displayed
 * thread.
 */
function hideGlobalTrack(trackIndex) {
    return function (dispatch, getState) {
        var hiddenGlobalTracks = url_state_1.getHiddenGlobalTracks(getState());
        if (hiddenGlobalTracks.has(trackIndex)) {
            // This track is already hidden, don't do anything.
            return;
        }
        var globalTracks = profile_1.getGlobalTracks(getState());
        if (globalTracks.length === hiddenGlobalTracks.size + 1) {
            // Bail out if attempting to hide the last global track.
            return;
        }
        var globalTrackToHide = globalTracks[trackIndex];
        var newSelectedThreadIndexes = new Set(url_state_1.getSelectedThreadIndexes(getState()));
        // Find another selectedThreadIndex if the current selected thread is hidden
        // with this operation.
        if (globalTrackToHide.type === 'process') {
            // This is a process global track, this operation could potentially hide
            // the selectedThreadIndex.
            if (globalTrackToHide.mainThreadIndex !== null) {
                newSelectedThreadIndexes["delete"](globalTrackToHide.mainThreadIndex);
            }
            // Check in the local tracks for the selectedThreadIndex
            if (newSelectedThreadIndexes.size !== 0) {
                for (var _i = 0, _a = profile_1.getLocalTracks(getState(), globalTrackToHide.pid); _i < _a.length; _i++) {
                    var localTrack = _a[_i];
                    if (localTrack.type === 'thread') {
                        newSelectedThreadIndexes["delete"](localTrack.threadIndex);
                        break;
                    }
                }
            }
            if (newSelectedThreadIndexes.size === 0) {
                var threadIndex = _findOtherVisibleThread(getState, trackIndex);
                if (threadIndex === null) {
                    // Could not find another thread index, bail out.
                    return;
                }
                newSelectedThreadIndexes.add(threadIndex);
            }
        }
        if (newSelectedThreadIndexes.size === 0) {
            // Hiding this process would make it so that there is no selected thread.
            // Bail out.
            return;
        }
        analytics_1.sendAnalytics({
            hitType: 'event',
            eventCategory: 'timeline',
            eventAction: 'hide global track'
        });
        dispatch({
            type: 'HIDE_GLOBAL_TRACK',
            trackIndex: trackIndex,
            selectedThreadIndexes: newSelectedThreadIndexes
        });
    };
}
exports.hideGlobalTrack = hideGlobalTrack;
/**
 * This action shows a specific global track.
 */
function showGlobalTrack(trackIndex) {
    return function (dispatch) {
        analytics_1.sendAnalytics({
            hitType: 'event',
            eventCategory: 'timeline',
            eventAction: 'show global track'
        });
        dispatch({
            type: 'SHOW_GLOBAL_TRACK',
            trackIndex: trackIndex
        });
    };
}
exports.showGlobalTrack = showGlobalTrack;
/**
 * This function isolates a process global track, and leaves its local tracks visible.
 */
function isolateProcess(isolatedTrackIndex) {
    return function (dispatch, getState) {
        var globalTrack = profile_1.getGlobalTracks(getState())[isolatedTrackIndex];
        var trackIndexes = url_state_1.getGlobalTrackOrder(getState());
        if (globalTrack.type !== 'process') {
            // Do not isolate a track unless it is a process, that way a thread
            // will always be visible.
            return;
        }
        var oldSelectedThreadIndexes = url_state_1.getSelectedThreadIndexes(getState());
        var localTracks = profile_1.getLocalTracks(getState(), globalTrack.pid);
        // Carry over the old selected thread indexes to the new ones.
        var newSelectedThreadIndexes = new Set();
        {
            // Consider the global track
            if (globalTrack.mainThreadIndex !== null &&
                oldSelectedThreadIndexes.has(globalTrack.mainThreadIndex)) {
                newSelectedThreadIndexes.add(globalTrack.mainThreadIndex);
            }
            // Now look at all of the local tracks
            for (var _i = 0, localTracks_1 = localTracks; _i < localTracks_1.length; _i++) {
                var localTrack = localTracks_1[_i];
                if (localTrack.threadIndex !== undefined &&
                    oldSelectedThreadIndexes.has(localTrack.threadIndex)) {
                    newSelectedThreadIndexes.add(localTrack.threadIndex);
                }
            }
        }
        // Check to see if this selectedThreadIndex will be hidden.
        if (newSelectedThreadIndexes.size === 0) {
            // The selectedThreadIndex will be hidden, reselect another one.
            if (globalTrack.mainThreadIndex === null) {
                // Try and select a thread in the local tracks.
                for (var _a = 0, localTracks_2 = localTracks; _a < localTracks_2.length; _a++) {
                    var track = localTracks_2[_a];
                    if (track.type === 'thread') {
                        newSelectedThreadIndexes.add(track.threadIndex);
                        break;
                    }
                }
            }
            else {
                // Select the main thread.
                newSelectedThreadIndexes.add(globalTrack.mainThreadIndex);
            }
            if (newSelectedThreadIndexes.size === 0) {
                // No thread could be found, so do not isolate this process.
                return;
            }
        }
        analytics_1.sendAnalytics({
            hitType: 'event',
            eventCategory: 'timeline',
            eventAction: 'isolate process'
        });
        dispatch({
            type: 'ISOLATE_PROCESS',
            hiddenGlobalTracks: new Set(trackIndexes.filter(function (i) { return i !== isolatedTrackIndex; })),
            isolatedTrackIndex: isolatedTrackIndex,
            selectedThreadIndexes: newSelectedThreadIndexes
        });
    };
}
exports.isolateProcess = isolateProcess;
/**
 * This function helps to show only the current screenshot and hide all other screenshots.
 */
function isolateScreenshot(isolatedTrackIndex) {
    return function (dispatch, getState) {
        var globalTracks = profile_1.getGlobalTracks(getState());
        var track = globalTracks[isolatedTrackIndex];
        if (track.type !== 'screenshots') {
            // Do not isolate the track unless it is a screenshot track.
            return;
        }
        var selectedThreadIndex = track.threadIndex;
        if (selectedThreadIndex === null) {
            // Make sure that a thread really exists.
            return;
        }
        var hiddenGlobalTracks = new Set(url_state_1.getHiddenGlobalTracks(getState()));
        for (var i = 0; i < globalTracks.length; i++) {
            var track_1 = globalTracks[i];
            if (track_1.type === 'screenshots' && i !== isolatedTrackIndex) {
                hiddenGlobalTracks.add(i);
            }
        }
        analytics_1.sendAnalytics({
            hitType: 'event',
            eventCategory: 'timeline',
            eventAction: 'isolate screenshot track'
        });
        dispatch({
            type: 'ISOLATE_SCREENSHOT_TRACK',
            hiddenGlobalTracks: hiddenGlobalTracks
        });
    };
}
exports.isolateScreenshot = isolateScreenshot;
/**
 * This function isolates a global track, and hides all of its local tracks.
 */
function isolateProcessMainThread(isolatedTrackIndex) {
    return function (dispatch, getState) {
        var track = profile_1.getGlobalTracks(getState())[isolatedTrackIndex];
        var trackIndexes = url_state_1.getGlobalTrackOrder(getState());
        if (track.type !== 'process') {
            // Do not isolate a track unless it is a process track.
            return;
        }
        var selectedThreadIndex = track.mainThreadIndex;
        if (selectedThreadIndex === null) {
            // Make sure that a thread really exists.
            return;
        }
        analytics_1.sendAnalytics({
            hitType: 'event',
            eventCategory: 'timeline',
            eventAction: 'isolate process main thread'
        });
        dispatch({
            type: 'ISOLATE_PROCESS_MAIN_THREAD',
            pid: track.pid,
            hiddenGlobalTracks: new Set(trackIndexes.filter(function (i) { return i !== isolatedTrackIndex; })),
            isolatedTrackIndex: isolatedTrackIndex,
            selectedThreadIndexes: new Set([selectedThreadIndex]),
            // The local track order contains all of the indexes, and all should be hidden
            // when isolating the main thread.
            hiddenLocalTracks: new Set(url_state_1.getLocalTrackOrder(getState(), track.pid))
        });
    };
}
exports.isolateProcessMainThread = isolateProcessMainThread;
/**
 * This action changes the track order among local tracks only.
 */
function changeLocalTrackOrder(pid, localTrackOrder) {
    analytics_1.sendAnalytics({
        hitType: 'event',
        eventCategory: 'timeline',
        eventAction: 'change local track order'
    });
    return {
        type: 'CHANGE_LOCAL_TRACK_ORDER',
        pid: pid,
        localTrackOrder: localTrackOrder
    };
}
exports.changeLocalTrackOrder = changeLocalTrackOrder;
/**
 * This function walks the current global and local tracks and attempts to find another
 * visible thread to show. If it can't then it returns null. There is a bit of
 * complexity to this function because it's shared between the action creators
 * that both hide that global tracks, and local tracks. When hiding a global track,
 * then it will not have a local track to ignore. When hiding local track, it will
 * need to ignore the local track index that's being hidden, AND the global track
 * that it's attached to, as it's already been checked.
 */
function _findOtherVisibleThread(getState, 
// Either this global track is already hidden, or it has been taken into account.
globalTrackIndexToIgnore, 
// This is helpful when hiding a new local track index, it won't be selected.
localTrackIndexToIgnore) {
    var globalTracks = profile_1.getGlobalTracks(getState());
    var globalTrackOrder = url_state_1.getGlobalTrackOrder(getState());
    var globalHiddenTracks = url_state_1.getHiddenGlobalTracks(getState());
    for (var _i = 0, globalTrackOrder_1 = globalTrackOrder; _i < globalTrackOrder_1.length; _i++) {
        var globalTrackIndex = globalTrackOrder_1[_i];
        var globalTrack = globalTracks[globalTrackIndex];
        if (
        // This track has already been accounted for.
        (globalTrackIndexToIgnore !== undefined &&
            globalTrackIndex === globalTrackIndexToIgnore) ||
            // This global track is hidden.
            globalHiddenTracks.has(globalTrackIndex) ||
            globalTrack.type !== 'process') {
            continue;
        }
        if (globalTrack.mainThreadIndex !== null) {
            // Found a thread index from a global track.
            return globalTrack.mainThreadIndex;
        }
        var localTracks = profile_1.getLocalTracks(getState(), globalTrack.pid);
        var localTrackOrder = url_state_1.getLocalTrackOrder(getState(), globalTrack.pid);
        var hiddenLocalTracks = url_state_1.getHiddenLocalTracks(getState(), globalTrack.pid);
        for (var _a = 0, localTrackOrder_1 = localTrackOrder; _a < localTrackOrder_1.length; _a++) {
            var trackIndex = localTrackOrder_1[_a];
            var track = localTracks[trackIndex];
            if (!hiddenLocalTracks.has(trackIndex)) {
                // This track is visible.
                if (track.type === 'thread' && trackIndex !== localTrackIndexToIgnore) {
                    return track.threadIndex;
                }
            }
        }
    }
    // None was found.
    return null;
}
/**
 * This action hides a local track.
 * This handles the case where the user hides the last local track in a thread:
 * in that case we hide the global track for this thread. In the case where this
 * is the selected thread we also take care to select another thread.  We also
 * prevent from hiding the last thread.
 */
function hideLocalTrack(pid, trackIndexToHide) {
    return function (dispatch, getState) {
        var localTracks = profile_1.getLocalTracks(getState(), pid);
        var hiddenLocalTracks = url_state_1.getHiddenLocalTracks(getState(), pid);
        var localTrackToHide = localTracks[trackIndexToHide];
        var oldSelectedThreadIndexes = url_state_1.getSelectedThreadIndexes(getState());
        var newSelectedThreadIndexes = new Set(oldSelectedThreadIndexes);
        if (localTrackToHide.type === 'thread') {
            newSelectedThreadIndexes["delete"](localTrackToHide.threadIndex);
        }
        if (hiddenLocalTracks.has(trackIndexToHide)) {
            // This is attempting to hide an already hidden track, don't do anything.
            return;
        }
        var _a = profile_1.getGlobalTrackAndIndexByPid(getState(), pid), globalTrack = _a.globalTrack, globalTrackIndex = _a.globalTrackIndex;
        if (hiddenLocalTracks.size + 1 === localTracks.length) {
            // Hiding one more local track will hide all of the tracks for this process.
            // At this point two different cases need to be handled:
            //   1.) There is a main thread for the process, go ahead and hide all the
            //       local tracks.
            //   2.) There is no main thread for the process, attempt to hide the
            //       processes' global track.
            if (globalTrack.mainThreadIndex === null) {
                // Since the process has no main thread, the entire process should be hidden.
                dispatch(hideGlobalTrack(globalTrackIndex));
                return;
            }
            // Continue hiding the last local track.
        }
        if (newSelectedThreadIndexes.size === 0) {
            // The current selectedThreadIndex is being hidden. There can be a few cases
            // that need to be handled:
            //
            // 1. A sibling thread exists, and is not hidden. Use that.
            // 2. No visible sibling thread exists
            //   2a. Use the main thread of the process if it has one.
            //   2b. Find the first available process or track that is not hidden.
            //   2c. No more visible thread indexes exist, do not hide this thread.
            // Case 1:
            for (var trackIndex = 0; trackIndex < localTracks.length; trackIndex++) {
                var track = localTracks[trackIndex];
                if (!hiddenLocalTracks.has(trackIndex)) {
                    // This track is visible.
                    if (track.type === 'thread' && trackIndex !== trackIndexToHide) {
                        newSelectedThreadIndexes.add(track.threadIndex);
                        break;
                    }
                }
            }
            if (newSelectedThreadIndexes.size === 0 &&
                globalTrack.mainThreadIndex !== null &&
                globalTrack.mainThreadIndex !== undefined) {
                // Case 2a: Use the current process's main thread.
                newSelectedThreadIndexes.add(globalTrack.mainThreadIndex);
            }
            if (newSelectedThreadIndexes.size === 0) {
                // Case 2b: Try and find another threadIndex.
                var otherThreadIndex = _findOtherVisibleThread(getState, globalTrackIndex, trackIndexToHide);
                if (otherThreadIndex !== null) {
                    newSelectedThreadIndexes.add(otherThreadIndex);
                }
            }
            if (newSelectedThreadIndexes.size === 0) {
                // Case 2c: No more visible threads exist, bail out.
                return;
            }
        }
        analytics_1.sendAnalytics({
            hitType: 'event',
            eventCategory: 'timeline',
            eventAction: 'hide local track'
        });
        dispatch({
            type: 'HIDE_LOCAL_TRACK',
            pid: pid,
            trackIndex: trackIndexToHide,
            selectedThreadIndexes: newSelectedThreadIndexes
        });
    };
}
exports.hideLocalTrack = hideLocalTrack;
/**
 * This action simply displays a local track from its track index and its Pid.
 */
function showLocalTrack(pid, trackIndex) {
    return function (dispatch) {
        analytics_1.sendAnalytics({
            hitType: 'event',
            eventCategory: 'timeline',
            eventAction: 'show local track'
        });
        dispatch({
            type: 'SHOW_LOCAL_TRACK',
            trackIndex: trackIndex,
            pid: pid
        });
    };
}
exports.showLocalTrack = showLocalTrack;
/**
 * This action isolates a local track. This means we will hide all other tracks.
 */
function isolateLocalTrack(pid, isolatedTrackIndex) {
    return function (dispatch, getState) {
        var localTrackToIsolate = profile_1.getLocalTracks(getState(), pid)[isolatedTrackIndex];
        var _a = profile_1.getGlobalTrackAndIndexByPid(getState(), pid), globalTrack = _a.globalTrack, globalTrackIndex = _a.globalTrackIndex;
        // The track order is merely a convenient way to get a list of track indexes.
        var globalTrackIndexes = url_state_1.getGlobalTrackOrder(getState());
        var localTrackIndexes = url_state_1.getLocalTrackOrder(getState(), pid);
        // Try to find a selected thread index.
        var selectedThreadIndexes = new Set();
        if (localTrackToIsolate.type === 'thread') {
            selectedThreadIndexes.add(localTrackToIsolate.threadIndex);
        }
        else if (globalTrack.type === 'process' &&
            globalTrack.mainThreadIndex !== null) {
            selectedThreadIndexes.add(globalTrack.mainThreadIndex);
        }
        if (selectedThreadIndexes.size === 0) {
            // Isolating this track would mean that there is no selected thread index.
            // bail out of this operation.
            return;
        }
        analytics_1.sendAnalytics({
            hitType: 'event',
            eventCategory: 'timeline',
            eventAction: 'isolate local track'
        });
        dispatch({
            type: 'ISOLATE_LOCAL_TRACK',
            pid: pid,
            hiddenGlobalTracks: new Set(globalTrackIndexes.filter(function (i) { return i !== globalTrackIndex; })),
            hiddenLocalTracks: new Set(localTrackIndexes.filter(function (i) { return i !== isolatedTrackIndex; })),
            selectedThreadIndexes: selectedThreadIndexes
        });
    };
}
exports.isolateLocalTrack = isolateLocalTrack;
var _callTreeSearchAnalyticsSent = false;
function changeCallTreeSearchString(searchString) {
    if (!_callTreeSearchAnalyticsSent) {
        // Only send this event once, since it could be fired frequently with typing.
        _callTreeSearchAnalyticsSent = true;
        analytics_1.sendAnalytics({
            hitType: 'event',
            eventCategory: 'profile',
            eventAction: 'call tree search string'
        });
    }
    return {
        type: 'CHANGE_CALL_TREE_SEARCH_STRING',
        searchString: searchString
    };
}
exports.changeCallTreeSearchString = changeCallTreeSearchString;
function expandAllCallNodeDescendants(threadsKey, callNodeIndex, callNodeInfo) {
    return function (dispatch, getState) {
        var expandedCallNodeIndexes = per_thread_1.selectedThreadSelectors.getExpandedCallNodeIndexes(getState());
        var tree = per_thread_1.selectedThreadSelectors.getCallTree(getState());
        // Create a set with the selected call node and its descendants
        var descendants = tree.getAllDescendants(callNodeIndex);
        descendants.add(callNodeIndex);
        // And also add all the call nodes that already were expanded
        expandedCallNodeIndexes.forEach(function (callNodeIndex) {
            if (callNodeIndex !== null) {
                descendants.add(callNodeIndex);
            }
        });
        var expandedCallNodePaths = __spreadArrays(descendants).map(function (callNodeIndex) {
            return profile_data_1.getCallNodePathFromIndex(callNodeIndex, callNodeInfo.callNodeTable);
        });
        dispatch(changeExpandedCallNodes(threadsKey, expandedCallNodePaths));
    };
}
exports.expandAllCallNodeDescendants = expandAllCallNodeDescendants;
function changeExpandedCallNodes(threadsKey, expandedCallNodePaths) {
    return {
        type: 'CHANGE_EXPANDED_CALL_NODES',
        threadsKey: threadsKey,
        expandedCallNodePaths: expandedCallNodePaths
    };
}
exports.changeExpandedCallNodes = changeExpandedCallNodes;
function changeSelectedMarker(threadsKey, selectedMarker) {
    return {
        type: 'CHANGE_SELECTED_MARKER',
        selectedMarker: selectedMarker,
        threadsKey: threadsKey
    };
}
exports.changeSelectedMarker = changeSelectedMarker;
function changeSelectedNetworkMarker(threadsKey, selectedNetworkMarker) {
    return {
        type: 'CHANGE_SELECTED_NETWORK_MARKER',
        selectedNetworkMarker: selectedNetworkMarker,
        threadsKey: threadsKey
    };
}
exports.changeSelectedNetworkMarker = changeSelectedNetworkMarker;
/**
 * This action is used when the user right clicks a marker, and is especially
 * used to display its context menu.
 */
function changeRightClickedMarker(threadsKey, markerIndex) {
    return {
        type: 'CHANGE_RIGHT_CLICKED_MARKER',
        threadsKey: threadsKey,
        markerIndex: markerIndex
    };
}
exports.changeRightClickedMarker = changeRightClickedMarker;
function changeMarkersSearchString(searchString) {
    return {
        type: 'CHANGE_MARKER_SEARCH_STRING',
        searchString: searchString
    };
}
exports.changeMarkersSearchString = changeMarkersSearchString;
function changeNetworkSearchString(searchString) {
    return {
        type: 'CHANGE_NETWORK_SEARCH_STRING',
        searchString: searchString
    };
}
exports.changeNetworkSearchString = changeNetworkSearchString;
function changeImplementationFilter(implementation) {
    return function (dispatch, getState) {
        var previousImplementation = url_state_1.getImplementationFilter(getState());
        var threadsKey = url_state_1.getSelectedThreadsKey(getState());
        var transformedThread = per_thread_1.selectedThreadSelectors.getRangeAndTransformFilteredThread(getState());
        analytics_1.sendAnalytics({
            hitType: 'event',
            eventCategory: 'profile',
            eventAction: 'change implementation filter',
            eventLabel: implementation
        });
        dispatch({
            type: 'CHANGE_IMPLEMENTATION_FILTER',
            implementation: implementation,
            threadsKey: threadsKey,
            transformedThread: transformedThread,
            previousImplementation: previousImplementation
        });
    };
}
exports.changeImplementationFilter = changeImplementationFilter;
/**
 * This action changes the strategy used to build and display the call tree. This could
 * use sample data, or build a new call tree based off of allocation information stored
 * in markers.
 */
function changeCallTreeSummaryStrategy(callTreeSummaryStrategy) {
    analytics_1.sendAnalytics({
        hitType: 'event',
        eventCategory: 'profile',
        eventAction: 'change call tree summary strategy',
        eventLabel: callTreeSummaryStrategy
    });
    return {
        type: 'CHANGE_CALL_TREE_SUMMARY_STRATEGY',
        callTreeSummaryStrategy: callTreeSummaryStrategy
    };
}
exports.changeCallTreeSummaryStrategy = changeCallTreeSummaryStrategy;
function changeInvertCallstack(invertCallstack) {
    return function (dispatch, getState) {
        analytics_1.sendAnalytics({
            hitType: 'event',
            eventCategory: 'profile',
            eventAction: 'change invert callstack'
        });
        dispatch({
            type: 'CHANGE_INVERT_CALLSTACK',
            invertCallstack: invertCallstack,
            selectedThreadIndexes: url_state_1.getSelectedThreadIndexes(getState()),
            callTree: per_thread_1.selectedThreadSelectors.getCallTree(getState()),
            callNodeTable: per_thread_1.selectedThreadSelectors.getCallNodeInfo(getState())
                .callNodeTable
        });
    };
}
exports.changeInvertCallstack = changeInvertCallstack;
function changeShowUserTimings(showUserTimings) {
    return function (dispatch) {
        analytics_1.sendAnalytics({
            hitType: 'event',
            eventCategory: 'profile',
            eventAction: 'toggle user timings'
        });
        dispatch({
            type: 'CHANGE_SHOW_USER_TIMINGS',
            showUserTimings: showUserTimings
        });
    };
}
exports.changeShowUserTimings = changeShowUserTimings;
/**
 * This action toggles changes between using a summary view that shows only self time
 * for the JS tracer data, and a stack-based view (similar to the stack chart) for the
 * JS Tracer panel.
 */
function changeShowJsTracerSummary(showSummary) {
    return function (dispatch) {
        analytics_1.sendAnalytics({
            hitType: 'event',
            eventCategory: 'profile',
            eventAction: showSummary
                ? 'show JS tracer summary'
                : 'show JS tracer stacks'
        });
        dispatch({
            type: 'CHANGE_SHOW_JS_TRACER_SUMMARY',
            showSummary: showSummary
        });
    };
}
exports.changeShowJsTracerSummary = changeShowJsTracerSummary;
function updatePreviewSelection(previewSelection) {
    return function (dispatch, getState) {
        var currentPreviewSelection = profile_1.getPreviewSelection(getState());
        if (!index_1.objectShallowEquals(currentPreviewSelection, previewSelection)) {
            // Only dispatch if the selection changes. This function can fire in a tight loop,
            // and this check saves a dispatch.
            dispatch({
                type: 'UPDATE_PREVIEW_SELECTION',
                previewSelection: previewSelection
            });
        }
    };
}
exports.updatePreviewSelection = updatePreviewSelection;
function commitRange(start, end) {
    if (end === start) {
        // Ensure that the duration of the range is non-zero.
        end = end + 0.000001; // Adds 1ns
    }
    return {
        type: 'COMMIT_RANGE',
        start: start,
        end: end
    };
}
exports.commitRange = commitRange;
function popCommittedRanges(firstPoppedFilterIndex) {
    return {
        type: 'POP_COMMITTED_RANGES',
        firstPoppedFilterIndex: firstPoppedFilterIndex
    };
}
exports.popCommittedRanges = popCommittedRanges;
function addTransformToStack(threadsKey, transform) {
    return function (dispatch, getState) {
        var transformedThread = per_thread_1.getThreadSelectorsFromThreadsKey(threadsKey).getRangeAndTransformFilteredThread(getState());
        dispatch({
            type: 'ADD_TRANSFORM_TO_STACK',
            threadsKey: threadsKey,
            transform: transform,
            transformedThread: transformedThread
        });
        analytics_1.sendAnalytics({
            hitType: 'event',
            eventCategory: 'profile',
            eventAction: 'add transform',
            eventLabel: transform.type
        });
    };
}
exports.addTransformToStack = addTransformToStack;
function popTransformsFromStack(firstPoppedFilterIndex) {
    return function (dispatch, getState) {
        var threadsKey = url_state_1.getSelectedThreadsKey(getState());
        dispatch({
            type: 'POP_TRANSFORMS_FROM_STACK',
            threadsKey: threadsKey,
            firstPoppedFilterIndex: firstPoppedFilterIndex
        });
    };
}
exports.popTransformsFromStack = popTransformsFromStack;
function changeTimelineType(timelineType) {
    return {
        type: 'CHANGE_TIMELINE_TYPE',
        timelineType: timelineType
    };
}
exports.changeTimelineType = changeTimelineType;
function changeProfileName(profileName) {
    return {
        type: 'CHANGE_PROFILE_NAME',
        profileName: profileName
    };
}
exports.changeProfileName = changeProfileName;
function setDataSource(dataSource) {
    return {
        type: 'SET_DATA_SOURCE',
        dataSource: dataSource
    };
}
exports.setDataSource = setDataSource;
function changeMouseTimePosition(mouseTimePosition) {
    return {
        type: 'CHANGE_MOUSE_TIME_POSITION',
        mouseTimePosition: mouseTimePosition
    };
}
exports.changeMouseTimePosition = changeMouseTimePosition;
function handleCallNodeTransformShortcut(event, threadsKey, callNodeIndex) {
    return function (dispatch, getState) {
        if (event.metaKey || event.ctrlKey || event.altKey) {
            return;
        }
        var threadSelectors = per_thread_1.getThreadSelectorsFromThreadsKey(threadsKey);
        var unfilteredThread = threadSelectors.getThread(getState());
        var callNodeTable = threadSelectors.getCallNodeInfo(getState()).callNodeTable;
        var implementation = url_state_1.getImplementationFilter(getState());
        var inverted = url_state_1.getInvertCallstack(getState());
        var callNodePath = profile_data_1.getCallNodePathFromIndex(callNodeIndex, callNodeTable);
        var funcIndex = callNodeTable.func[callNodeIndex];
        switch (event.key) {
            case 'F':
                dispatch(addTransformToStack(threadsKey, {
                    type: 'focus-subtree',
                    callNodePath: callNodePath,
                    implementation: implementation,
                    inverted: inverted
                }));
                break;
            case 'f':
                dispatch(addTransformToStack(threadsKey, {
                    type: 'focus-function',
                    funcIndex: funcIndex
                }));
                break;
            case 'M':
                dispatch(addTransformToStack(threadsKey, {
                    type: 'merge-call-node',
                    callNodePath: callNodePath,
                    implementation: implementation
                }));
                break;
            case 'm':
                dispatch(addTransformToStack(threadsKey, {
                    type: 'merge-function',
                    funcIndex: funcIndex
                }));
                break;
            case 'd':
                dispatch(addTransformToStack(threadsKey, {
                    type: 'drop-function',
                    funcIndex: funcIndex
                }));
                break;
            case 'C': {
                var funcTable = unfilteredThread.funcTable;
                var resourceIndex = funcTable.resource[funcIndex];
                // A new collapsed func will be inserted into the table at the end. Deduce
                // the index here.
                var collapsedFuncIndex = funcTable.length;
                dispatch(addTransformToStack(threadsKey, {
                    type: 'collapse-resource',
                    resourceIndex: resourceIndex,
                    collapsedFuncIndex: collapsedFuncIndex,
                    implementation: implementation
                }));
                break;
            }
            case 'r': {
                if (transforms_1.funcHasRecursiveCall(unfilteredThread, implementation, funcIndex)) {
                    dispatch(addTransformToStack(threadsKey, {
                        type: 'collapse-direct-recursion',
                        funcIndex: funcIndex,
                        implementation: implementation
                    }));
                }
                break;
            }
            case 'c': {
                dispatch(addTransformToStack(threadsKey, {
                    type: 'collapse-function-subtree',
                    funcIndex: funcIndex
                }));
                break;
            }
            default:
            // This did not match a call tree transform.
        }
    };
}
exports.handleCallNodeTransformShortcut = handleCallNodeTransformShortcut;
var templateObject_1;
