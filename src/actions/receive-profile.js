"use strict";
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.retrieveProfilesToCompare = exports.retrieveProfileFromFile = exports.waitingForProfileFromFile = exports.retrieveProfileOrZipFromUrl = exports.retrieveProfileFromStore = exports.getProfileUrlForHash = exports._fetchProfile = exports.temporaryError = exports.receiveZipFile = exports.waitingForProfileFromUrl = exports.waitingForProfileFromStore = exports.retrieveProfileFromAddon = exports.doSymbolicateProfile = exports.bulkProcessSymbolicationSteps = exports.doneSymbolicating = exports.startSymbolicating = exports.receivedSymbolTableReply = exports.requestingSymbolTable = exports.resymbolicateProfile = exports.changeTimelineTrackOrganization = exports.finalizeActiveTabProfileView = exports.finalizeOriginProfileView = exports.finalizeFullProfileView = exports.finalizeProfileView = exports.loadProfile = exports.waitingForProfileFromAddon = exports.triggerLoadingFromUrl = void 0;
var common_tags_1 = require("common-tags");
var query_string_1 = require("query-string");
var process_profile_1 = require("firefox-profiler/profile-logic/process-profile");
var symbol_store_1 = require("firefox-profiler/profile-logic/symbol-store");
var symbolication_1 = require("firefox-profiler/profile-logic/symbolication");
var MozillaSymbolicationAPI = require("firefox-profiler/profile-logic/mozilla-symbolication-api");
var merge_compare_1 = require("firefox-profiler/profile-logic/merge-compare");
var gz_1 = require("firefox-profiler/utils/gz");
var shorten_url_1 = require("firefox-profiler/utils/shorten-url");
var errors_1 = require("firefox-profiler/utils/errors");
var jszip_1 = require("jszip");
var selectors_1 = require("firefox-profiler/selectors");
var url_handling_1 = require("firefox-profiler/app-logic/url-handling");
var tracks_1 = require("firefox-profiler/profile-logic/tracks");
var active_tab_1 = require("firefox-profiler/profile-logic/active-tab");
var profile_view_1 = require("./profile-view");
var errors_2 = require("./errors");
var constants_1 = require("firefox-profiler/app-logic/constants");
var flow_1 = require("firefox-profiler/utils/flow");
/**
 * This file collects all the actions that are used for receiving the profile in the
 * client and getting it into the processed format.
 */
function triggerLoadingFromUrl(profileUrl) {
    return {
        type: 'TRIGGER_LOADING_FROM_URL',
        profileUrl: profileUrl
    };
}
exports.triggerLoadingFromUrl = triggerLoadingFromUrl;
function waitingForProfileFromAddon() {
    return {
        type: 'WAITING_FOR_PROFILE_FROM_ADDON'
    };
}
exports.waitingForProfileFromAddon = waitingForProfileFromAddon;
/**
 * Call this function once the profile has been fetched and pre-processed from whatever
 * source (url, addon, file, etc).
 */
function loadProfile(profile, config, initialLoad) {
    var _this = this;
    if (config === void 0) { config = {}; }
    if (initialLoad === void 0) { initialLoad = false; }
    return function (dispatch) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (profile.threads.length === 0) {
                        console.error('This profile has no threads.', profile);
                        dispatch(errors_2.fatalError(new Error('No threads were captured in this profile, there is nothing to display.')));
                        return [2 /*return*/];
                    }
                    // We have a 'PROFILE_LOADED' dispatch here and a second dispatch for
                    // `finalizeProfileView`. Normally this is an anti-pattern but that was
                    // necessary for initial load url handling. We are not dispatching
                    // `finalizeProfileView` here if it's initial load, instead are getting the
                    // url, upgrading the url and then creating a UrlState that we can use
                    // first. That is necessary because we need a UrlState inside `finalizeProfileView`.
                    // If this is not the initial load, we are dispatching both of them.
                    dispatch({
                        type: 'PROFILE_LOADED',
                        profile: profile,
                        pathInZipFile: config.pathInZipFile,
                        implementationFilter: config.implementationFilter,
                        transformStacks: config.transformStacks
                    });
                    if (!(initialLoad === false)) return [3 /*break*/, 2];
                    return [4 /*yield*/, dispatch(finalizeProfileView(config.geckoProfiler, config.timelineTrackOrganization))];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    }); };
}
exports.loadProfile = loadProfile;
/**
 * This function will take the view information from the URL, such as hiding and sorting
 * information, and it will validate it against the profile. If there is no pre-existing
 * view information, this function will compute the defaults. There is a decent amount of
 * complexity to making all of these decisions, which has been collected in a bunch of
 * functions in the src/profile-logic/tracks.js file.
 */
function finalizeProfileView(geckoProfiler, timelineTrackOrganization) {
    var _this = this;
    return function (dispatch, getState) { return __awaiter(_this, void 0, void 0, function () {
        var profile, selectedThreadIndexes, pages, symbolStore;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    profile = selectors_1.getProfileOrNull(getState());
                    if (profile === null || selectors_1.getView(getState()).phase !== 'PROFILE_LOADED') {
                        // Profile load was not successful. Do not continue.
                        return [2 /*return*/];
                    }
                    selectedThreadIndexes = selectors_1.getSelectedThreadIndexesOrNull(getState());
                    pages = profile.pages;
                    if (!timelineTrackOrganization) {
                        // Most likely we'll need to load the timeline track organization, as requested
                        // by the URL, but tests can pass in a value.
                        timelineTrackOrganization = selectors_1.getTimelineTrackOrganization(getState());
                    }
                    switch (timelineTrackOrganization.type) {
                        case 'full':
                            // The url state says this is a full view. We should compute and initialize
                            // the state relevant to that state.
                            dispatch(finalizeFullProfileView(profile, selectedThreadIndexes));
                            break;
                        case 'active-tab':
                            if (pages) {
                                dispatch(finalizeActiveTabProfileView(profile, selectedThreadIndexes, timelineTrackOrganization.browsingContextID));
                            }
                            else {
                                // Don't fully trust the URL, this view doesn't support the active tab based
                                // view. Switch to fulll view.
                                dispatch(finalizeFullProfileView(profile, selectedThreadIndexes));
                            }
                            break;
                        case 'origins': {
                            if (pages) {
                                dispatch(finalizeOriginProfileView(profile, pages, selectedThreadIndexes));
                            }
                            else {
                                // Don't fully trust the URL, this view doesn't support the origins based
                                // view. Switch to fulll view.
                                dispatch(finalizeFullProfileView(profile, selectedThreadIndexes));
                            }
                            break;
                        }
                        default:
                            throw flow_1.assertExhaustiveCheck(timelineTrackOrganization, "Unhandled TimelineTrackOrganization type.");
                    }
                    if (!(profile.meta.symbolicated === false)) return [3 /*break*/, 2];
                    symbolStore = getSymbolStore(dispatch, geckoProfiler);
                    if (!symbolStore) return [3 /*break*/, 2];
                    // Only symbolicate if a symbol store is available. In tests we may not
                    // have access to IndexedDB.
                    return [4 /*yield*/, doSymbolicateProfile(dispatch, profile, symbolStore)];
                case 1:
                    // Only symbolicate if a symbol store is available. In tests we may not
                    // have access to IndexedDB.
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    }); };
}
exports.finalizeProfileView = finalizeProfileView;
/**
 * Finalize the profile state for full view.
 * This function will take the view information from the URL, such as hiding and sorting
 * information, and it will validate it against the profile. If there is no pre-existing
 * view information, this function will compute the defaults.
 */
function finalizeFullProfileView(profile, selectedThreadIndexes) {
    return function (dispatch, getState) {
        var hasUrlInfo = selectedThreadIndexes !== null;
        var globalTracks = tracks_1.computeGlobalTracks(profile);
        var globalTrackOrder = tracks_1.initializeGlobalTrackOrder(globalTracks, hasUrlInfo ? selectors_1.getGlobalTrackOrder(getState()) : null, selectors_1.getLegacyThreadOrder(getState()));
        var hiddenGlobalTracks = tracks_1.initializeHiddenGlobalTracks(globalTracks, profile, globalTrackOrder, hasUrlInfo ? selectors_1.getHiddenGlobalTracks(getState()) : null, selectors_1.getLegacyHiddenThreads(getState()));
        var localTracksByPid = tracks_1.computeLocalTracksByPid(profile);
        var localTrackOrderByPid = tracks_1.initializeLocalTrackOrderByPid(hasUrlInfo ? selectors_1.getLocalTrackOrderByPid(getState()) : null, localTracksByPid, selectors_1.getLegacyThreadOrder(getState()));
        var hiddenLocalTracksByPid = tracks_1.initializeHiddenLocalTracksByPid(hasUrlInfo ? selectors_1.getHiddenLocalTracksByPid(getState()) : null, localTracksByPid, profile, selectors_1.getLegacyHiddenThreads(getState()));
        var visibleThreadIndexes = tracks_1.getVisibleThreads(globalTracks, hiddenGlobalTracks, localTracksByPid, hiddenLocalTracksByPid);
        // This validity check can't be extracted into a separate function, as it needs
        // to update a lot of the local variables in this function.
        if (visibleThreadIndexes.length === 0) {
            // All threads are hidden, since this can't happen normally, revert them all.
            visibleThreadIndexes = profile.threads.map(function (_, threadIndex) { return threadIndex; });
            hiddenGlobalTracks = new Set();
            var newHiddenTracksByPid = new Map();
            for (var _i = 0, hiddenLocalTracksByPid_1 = hiddenLocalTracksByPid; _i < hiddenLocalTracksByPid_1.length; _i++) {
                var pid = hiddenLocalTracksByPid_1[_i][0];
                newHiddenTracksByPid.set(pid, new Set());
            }
            hiddenLocalTracksByPid = newHiddenTracksByPid;
        }
        selectedThreadIndexes = tracks_1.initializeSelectedThreadIndex(selectedThreadIndexes, visibleThreadIndexes, profile);
        var _loop_1 = function (pid, localTracks) {
            var hiddenLocalTracks = hiddenLocalTracksByPid.get(pid);
            if (!hiddenLocalTracks) {
                return "continue";
            }
            if (hiddenLocalTracks.size === localTracks.length) {
                // All of the local tracks were hidden.
                var globalTrackIndex = globalTracks.findIndex(function (globalTrack) {
                    return globalTrack.type === 'process' &&
                        globalTrack.pid === pid &&
                        globalTrack.mainThreadIndex === null;
                });
                if (globalTrackIndex !== -1) {
                    // An empty global track was found, hide it.
                    hiddenGlobalTracks.add(globalTrackIndex);
                }
            }
        };
        // If all of the local tracks were hidden for a process, and the main thread was
        // not recorded for that process, hide the (empty) process track as well.
        for (var _a = 0, localTracksByPid_1 = localTracksByPid; _a < localTracksByPid_1.length; _a++) {
            var _b = localTracksByPid_1[_a], pid = _b[0], localTracks = _b[1];
            _loop_1(pid, localTracks);
        }
        dispatch({
            type: 'VIEW_FULL_PROFILE',
            selectedThreadIndexes: selectedThreadIndexes,
            globalTracks: globalTracks,
            globalTrackOrder: globalTrackOrder,
            hiddenGlobalTracks: hiddenGlobalTracks,
            localTracksByPid: localTracksByPid,
            hiddenLocalTracksByPid: hiddenLocalTracksByPid,
            localTrackOrderByPid: localTrackOrderByPid
        });
    };
}
exports.finalizeFullProfileView = finalizeFullProfileView;
/**
 * This is a small utility to extract the origin from a URL, to build the origins-based
 * profile view.
 */
function getOrigin(urlString) {
    if (urlString.startsWith('chrome://')) {
        return urlString;
    }
    try {
        var url = new URL(urlString);
        if (url.origin === 'null') {
            // This can happen for "about:newtab"
            return urlString;
        }
        return url.origin;
    }
    catch (_a) {
        // This failed, maybe it's an internal URL.
        return urlString;
    }
}
/**
 * Finalize the profile state for the origin-based view. This is an experimental
 * view for fission. It's not turned on by default. Note, that this function
 * probably needs a lot of work to become more correct to handle everything,
 * so it shouldn't be trusted too much at this time.
 */
function finalizeOriginProfileView(profile, pages, selectedThreadIndexes) {
    return function (dispatch) {
        var idToPage = new Map();
        for (var _i = 0, pages_1 = pages; _i < pages_1.length; _i++) {
            var page = pages_1[_i];
            idToPage.set(page.innerWindowID, page);
        }
        // TODO - A thread can have multiple pages. Ignore this for now.
        var pageOfThread = [];
        // These maps essentially serve as a tuple of the InnerWindowID and ThreadIndex
        // that can be iterated through on a "for of" loop.
        var rootOrigins = new Map();
        var subOrigins = new Map();
        // The set of all thread indexes that do not have an origin associated with them.
        var noOrigins = new Set();
        // Populate the collections above by iterating through all of the threads.
        for (var threadIndex = 0; threadIndex < profile.threads.length; threadIndex++) {
            var frameTable = profile.threads[threadIndex].frameTable;
            var originFound = false;
            for (var frameIndex = 0; frameIndex < frameTable.length; frameIndex++) {
                var innerWindowID = frameTable.innerWindowID[frameIndex];
                if (innerWindowID === null || innerWindowID === 0) {
                    continue;
                }
                var page = idToPage.get(innerWindowID);
                if (!page) {
                    // This should only happen if there is an error in the Gecko implementation.
                    console.error('Could not find the page for an innerWindowID', {
                        innerWindowID: innerWindowID,
                        pages: pages
                    });
                    break;
                }
                if (page.embedderInnerWindowID === 0) {
                    rootOrigins.set(innerWindowID, threadIndex);
                }
                else {
                    subOrigins.set(innerWindowID, threadIndex);
                }
                originFound = true;
                pageOfThread[threadIndex] = page;
                break;
            }
            if (!originFound) {
                pageOfThread[threadIndex] = null;
                noOrigins.add(threadIndex);
            }
        }
        // Build up the `originsTimelineRoots` variable and any relationships needed
        // for determining the structure of the threads in terms of their origins.
        var originsTimelineRoots = [];
        // This map can be used to take a thread with no origin information, and assign
        // it to some origin based on a shared PID.
        var pidToRootInnerWindowID = new Map();
        // The root is a root domain only.
        var innerWindowIDToRoot = new Map();
        for (var _a = 0, rootOrigins_1 = rootOrigins; _a < rootOrigins_1.length; _a++) {
            var _b = rootOrigins_1[_a], innerWindowID = _b[0], threadIndex = _b[1];
            var thread = profile.threads[threadIndex];
            var page = flow_1.ensureExists(pageOfThread[threadIndex]);
            pidToRootInnerWindowID.set(thread.pid, innerWindowID);
            // These are all roots.
            innerWindowIDToRoot.set(innerWindowID, innerWindowID);
            originsTimelineRoots.push({
                type: 'origin',
                innerWindowID: innerWindowID,
                threadIndex: threadIndex,
                page: page,
                origin: getOrigin(page.url),
                children: []
            });
        }
        // Iterate and drain the sub origins from this set, and attempt to assign them
        // to a root origin. This needs to loop to handle arbitrary sub-iframe depths.
        var remainingSubOrigins = new Set(__spreadArrays(subOrigins));
        var lastRemaining = Infinity;
        while (lastRemaining !== remainingSubOrigins.size) {
            lastRemaining = remainingSubOrigins.size;
            var _loop_2 = function (suborigin) {
                var innerWindowID = suborigin[0], threadIndex = suborigin[1];
                var page = flow_1.ensureExists(pageOfThread[threadIndex]);
                var rootInnerWindowID = innerWindowIDToRoot.get(page.embedderInnerWindowID);
                if (rootInnerWindowID === undefined) {
                    return "continue";
                }
                var thread = profile.threads[threadIndex];
                pidToRootInnerWindowID.set(thread.pid, rootInnerWindowID);
                remainingSubOrigins["delete"](suborigin);
                innerWindowIDToRoot.set(innerWindowID, rootInnerWindowID);
                var root = flow_1.ensureExists(originsTimelineRoots.find(function (root) { return root.innerWindowID === rootInnerWindowID; }));
                root.children.push({
                    type: 'sub-origin',
                    innerWindowID: innerWindowID,
                    threadIndex: threadIndex,
                    origin: getOrigin(page.url),
                    page: page
                });
            };
            for (var _c = 0, remainingSubOrigins_1 = remainingSubOrigins; _c < remainingSubOrigins_1.length; _c++) {
                var suborigin = remainingSubOrigins_1[_c];
                _loop_2(suborigin);
            }
        }
        // Try to blame a thread on another thread with an origin. If this doesn't work,
        // then add it to this originsTimelineNoOrigin array.
        var originsTimelineNoOrigin = [];
        var _loop_3 = function (threadIndex) {
            var thread = profile.threads[threadIndex];
            var rootInnerWindowID = pidToRootInnerWindowID.get(thread.pid);
            var noOriginEntry = {
                type: 'no-origin',
                threadIndex: threadIndex
            };
            if (rootInnerWindowID) {
                var root = flow_1.ensureExists(originsTimelineRoots.find(function (root) { return root.innerWindowID === rootInnerWindowID; }));
                root.children.push(noOriginEntry);
            }
            else {
                originsTimelineNoOrigin.push(noOriginEntry);
            }
        };
        for (var _d = 0, noOrigins_1 = noOrigins; _d < noOrigins_1.length; _d++) {
            var threadIndex = noOrigins_1[_d];
            _loop_3(threadIndex);
        }
        dispatch({
            type: 'VIEW_ORIGINS_PROFILE',
            // TODO - We should pick the best selected thread.
            selectedThreadIndexes: selectedThreadIndexes === null ? new Set([0]) : selectedThreadIndexes,
            originsTimeline: __spreadArrays(originsTimelineNoOrigin, originsTimelineRoots)
        });
    };
}
exports.finalizeOriginProfileView = finalizeOriginProfileView;
/**
 * Finalize the profile state for active tab view.
 * This function will take the view information from the URL, such as hiding and sorting
 * information, and it will validate it against the profile. If there is no pre-existing
 * view information, this function will compute the defaults.
 */
function finalizeActiveTabProfileView(profile, selectedThreadIndexes, browsingContextID) {
    return function (dispatch, getState) {
        var relevantPages = selectors_1.getRelevantPagesForActiveTab(getState());
        var activeTabTimeline = active_tab_1.computeActiveTabTracks(profile, relevantPages, getState());
        if (selectedThreadIndexes === null) {
            // Select the main track if there is no selected thread.
            selectedThreadIndexes = new Set([
                activeTabTimeline.mainTrack.mainThreadIndex,
            ]);
        }
        dispatch({
            type: 'VIEW_ACTIVE_TAB_PROFILE',
            activeTabTimeline: activeTabTimeline,
            selectedThreadIndexes: selectedThreadIndexes,
            browsingContextID: browsingContextID
        });
    };
}
exports.finalizeActiveTabProfileView = finalizeActiveTabProfileView;
/**
 * Re-compute the profile view data. That's used to be able to switch between
 * full and active tab view.
 */
function changeTimelineTrackOrganization(timelineTrackOrganization) {
    return function (dispatch, getState) {
        var profile = selectors_1.getProfile(getState());
        // We are resetting the selected thread index, because we are not sure if
        // the selected thread will be availabe in the next view.
        var selectedThreadIndexes = new Set([0]);
        dispatch({
            type: 'DATA_RELOAD'
        });
        switch (timelineTrackOrganization.type) {
            case 'full':
                // The url state says this is a full view. We should compute and initialize
                // the state relevant to that state.
                dispatch(finalizeFullProfileView(profile, selectedThreadIndexes));
                break;
            case 'active-tab':
                // The url state says this is an active tab view. We should compute and
                // initialize the state relevant to that state.
                dispatch(finalizeActiveTabProfileView(profile, selectedThreadIndexes, timelineTrackOrganization.browsingContextID));
                break;
            case 'origins': {
                var pages = flow_1.ensureExists(profile.pages, 'There was no page information in the profile.');
                dispatch(finalizeOriginProfileView(profile, pages, selectedThreadIndexes));
                break;
            }
            default:
                throw flow_1.assertExhaustiveCheck(timelineTrackOrganization, "Unhandled TimelineTrackOrganization type.");
        }
    };
}
exports.changeTimelineTrackOrganization = changeTimelineTrackOrganization;
/**
 * Symbolication normally happens when a profile is first loaded. This function
 * provides the ability to kick off symbolication again after it has already been
 * attempted once.
 */
function resymbolicateProfile() {
    var _this = this;
    return function (dispatch, getState) { return __awaiter(_this, void 0, void 0, function () {
        var symbolStore, profile;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    symbolStore = getSymbolStore(dispatch);
                    profile = selectors_1.getProfile(getState());
                    if (!symbolStore) {
                        throw new Error('There was no symbol store when attempting to re-symbolicate.');
                    }
                    return [4 /*yield*/, doSymbolicateProfile(dispatch, profile, symbolStore)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); };
}
exports.resymbolicateProfile = resymbolicateProfile;
 > ;
{ }
ThunkAction < Promise < void  >> {
    "return": function (dispatch) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, dispatch(loadProfile(profile, config, false))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }
};
function requestingSymbolTable(requestedLib) {
    return {
        type: 'REQUESTING_SYMBOL_TABLE',
        requestedLib: requestedLib
    };
}
exports.requestingSymbolTable = requestingSymbolTable;
function receivedSymbolTableReply(requestedLib) {
    return {
        type: 'RECEIVED_SYMBOL_TABLE_REPLY',
        requestedLib: requestedLib
    };
}
exports.receivedSymbolTableReply = receivedSymbolTableReply;
function startSymbolicating() {
    return {
        type: 'START_SYMBOLICATING'
    };
}
exports.startSymbolicating = startSymbolicating;
function doneSymbolicating() {
    return { type: 'DONE_SYMBOLICATING' };
}
exports.doneSymbolicating = doneSymbolicating;
// Apply all the individual "symbolication steps" from symbolicationStepsPerThread
// to the current profile, as one redux action.
// We combine steps into one redux action in order to avoid unnecessary renders.
// When symbolication results arrive, we often get a very high number of individual
// symbolication updates. If we dispatched all of them as individual redux actions,
// we would cause React to re-render synchronously for each action, and the profile
// selectors called from rendering would do expensive work, most of which would never
// reach the screen because it would be invalidated by the next symbolication update.
// So we queue up symbolication steps and run the update from requestIdleCallback.
function bulkProcessSymbolicationSteps(symbolicationStepsPerThread) {
    return function (dispatch, getState) {
        var threads = selectors_1.getProfile(getState()).threads;
        var oldFuncToNewFuncMaps = new Map();
        var symbolicatedThreads = threads.map(function (oldThread, threadIndex) {
            var symbolicationSteps = symbolicationStepsPerThread.get(threadIndex);
            if (symbolicationSteps === undefined) {
                return oldThread;
            }
            var oldFuncToNewFuncMap = new Map();
            var thread = oldThread;
            for (var _i = 0, symbolicationSteps_1 = symbolicationSteps; _i < symbolicationSteps_1.length; _i++) {
                var symbolicationStep = symbolicationSteps_1[_i];
                thread = symbolication_1.applySymbolicationStep(thread, symbolicationStep, oldFuncToNewFuncMap);
            }
            oldFuncToNewFuncMaps.set(threadIndex, oldFuncToNewFuncMap);
            return thread;
        });
        dispatch({
            type: 'BULK_SYMBOLICATION',
            oldFuncToNewFuncMaps: oldFuncToNewFuncMaps,
            symbolicatedThreads: symbolicatedThreads
        });
    };
}
exports.bulkProcessSymbolicationSteps = bulkProcessSymbolicationSteps;
var requestIdleCallbackPolyfill;
if (typeof window === 'object' && window.requestIdleCallback) {
    requestIdleCallbackPolyfill = window.requestIdleCallback;
}
else if (typeof process === 'object' && process.nextTick) {
    // Node environment
    requestIdleCallbackPolyfill = process.nextTick;
}
else {
    requestIdleCallbackPolyfill = function (callback) { return setTimeout(callback, 0); };
}
// Queues up symbolication steps and bulk-processes them from requestIdleCallback,
// in order to improve UI responsiveness during symbolication.
var SymbolicationStepQueue = /** @class */ (function () {
    function SymbolicationStepQueue() {
        this._updates = new Map();
        this._updateObservers = [];
        this._requestedUpdate = false;
    }
    SymbolicationStepQueue.prototype._scheduleUpdate = function (dispatch) {
        var _this = this;
        // Only request an update if one hasn't already been scheduled.
        if (!this._requestedUpdate) {
            requestIdleCallbackPolyfill(function () { return _this._dispatchUpdate(dispatch); }, {
                timeout: 2000
            });
            this._requestedUpdate = true;
        }
    };
    SymbolicationStepQueue.prototype._dispatchUpdate = function (dispatch) {
        var updates = this._updates;
        var observers = this._updateObservers;
        this._updates = new Map();
        this._updateObservers = [];
        this._requestedUpdate = false;
        dispatch(bulkProcessSymbolicationSteps(updates));
        for (var _i = 0, observers_1 = observers; _i < observers_1.length; _i++) {
            var observer = observers_1[_i];
            observer();
        }
    };
    SymbolicationStepQueue.prototype.enqueueSingleSymbolicationStep = function (dispatch, threadIndex, symbolicationStepInfo, completionHandler) {
        this._scheduleUpdate(dispatch);
        var threadSteps = this._updates.get(threadIndex);
        if (threadSteps === undefined) {
            threadSteps = [];
            this._updates.set(threadIndex, threadSteps);
        }
        threadSteps.push(symbolicationStepInfo);
        this._updateObservers.push(completionHandler);
    };
    return SymbolicationStepQueue;
}());
var _symbolicationStepQueueSingleton = new SymbolicationStepQueue();
/**
 * If the profile object we got from the add-on is an ArrayBuffer, convert it
 * to a gecko profile object by parsing the JSON.
 */
function _unpackGeckoProfileFromAddon(profile) {
    return __awaiter(this, void 0, void 0, function () {
        var profileBytes, decompressedProfile, textDecoder;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(Object.prototype.toString.call(profile) === '[object ArrayBuffer]')) return [3 /*break*/, 4];
                    profileBytes = new Uint8Array(profile);
                    decompressedProfile = void 0;
                    if (!(profileBytes[0] === 0x1f && profileBytes[1] === 0x8b)) return [3 /*break*/, 2];
                    return [4 /*yield*/, gz_1.decompress(profileBytes)];
                case 1:
                    decompressedProfile = _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    decompressedProfile = profile;
                    _a.label = 3;
                case 3:
                    textDecoder = new TextDecoder();
                    return [2 /*return*/, JSON.parse(textDecoder.decode(decompressedProfile))];
                case 4: return [2 /*return*/, profile];
            }
        });
    });
}
function getProfileFromAddon(dispatch, geckoProfiler) {
    return __awaiter(this, void 0, void 0, function () {
        var rawGeckoProfile, unpackedProfile, profile;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    dispatch(waitingForProfileFromAddon());
                    return [4 /*yield*/, geckoProfiler.getProfile()];
                case 1:
                    rawGeckoProfile = _a.sent();
                    return [4 /*yield*/, _unpackGeckoProfileFromAddon(rawGeckoProfile)];
                case 2:
                    unpackedProfile = _a.sent();
                    profile = process_profile_1.processGeckoProfile(unpackedProfile);
                    return [4 /*yield*/, dispatch(loadProfile(profile, { geckoProfiler: geckoProfiler }))];
                case 3:
                    _a.sent();
                    return [2 /*return*/, profile];
            }
        });
    });
}
function getSymbolStore(dispatch, geckoProfiler) {
    var _this = this;
    if (!window.indexedDB) {
        // We could be running in a test environment with no indexedDB support. Do not
        // return a symbol store in this case.
        return null;
    }
    // Note, the database name still references the old project name, "perf.html". It was
    // left the same as to not invalidate user's information.
    var symbolStore = new symbol_store_1.SymbolStore('perf-html-async-storage', {
        requestSymbolsFromServer: function (requests) {
            for (var _i = 0, requests_1 = requests; _i < requests_1.length; _i++) {
                var lib = requests_1[_i].lib;
                dispatch(requestingSymbolTable(lib));
            }
            return MozillaSymbolicationAPI.requestSymbols(requests).map(function (libPromise, i) { return __awaiter(_this, void 0, void 0, function () {
                var result;
                return __generator(this, function (_a) {
                    try {
                        result = libPromise;
                        dispatch(receivedSymbolTableReply(requests[i].lib));
                        return [2 /*return*/, result];
                    }
                    catch (error) {
                        dispatch(receivedSymbolTableReply(requests[i].lib));
                        throw error;
                    }
                    return [2 /*return*/];
                });
            }); });
        },
        requestSymbolTableFromAddon: function (lib) { return __awaiter(_this, void 0, void 0, function () {
            var debugName, breakpadId, symbolTable, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!geckoProfiler) {
                            throw new Error("There's no connection to the gecko profiler add-on.");
                        }
                        debugName = lib.debugName, breakpadId = lib.breakpadId;
                        dispatch(requestingSymbolTable(lib));
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, geckoProfiler.getSymbolTable(debugName, breakpadId)];
                    case 2:
                        symbolTable = _a.sent();
                        dispatch(receivedSymbolTableReply(lib));
                        return [2 /*return*/, symbolTable];
                    case 3:
                        error_1 = _a.sent();
                        dispatch(receivedSymbolTableReply(lib));
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        }); }
    });
    return symbolStore;
}
function doSymbolicateProfile(dispatch, profile, symbolStore) {
    return __awaiter(this, void 0, void 0, function () {
        var completionPromises;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    dispatch(startSymbolicating());
                    completionPromises = [];
                    return [4 /*yield*/, symbolication_1.symbolicateProfile(profile, symbolStore, function (threadIndex, symbolicationStepInfo) {
                            completionPromises.push(new Promise(function (resolve) {
                                _symbolicationStepQueueSingleton.enqueueSingleSymbolicationStep(dispatch, threadIndex, symbolicationStepInfo, resolve);
                            }));
                        })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, Promise.all(completionPromises)];
                case 2:
                    _a.sent();
                    dispatch(doneSymbolicating());
                    return [2 /*return*/];
            }
        });
    });
}
exports.doSymbolicateProfile = doSymbolicateProfile;
function retrieveProfileFromAddon() {
    var _this = this;
    return function (dispatch) { return __awaiter(_this, void 0, void 0, function () {
        var timeoutId, geckoProfiler, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    timeoutId = setTimeout(function () {
                        dispatch(temporaryError(new errors_1.TemporaryError(common_tags_1.oneLine(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n            We were unable to connect to the Gecko profiler add-on within thirty seconds.\n            This might be because the profile is big or your machine is slower than usual.\n            Still waiting...\n          "], ["\n            We were unable to connect to the Gecko profiler add-on within thirty seconds.\n            This might be because the profile is big or your machine is slower than usual.\n            Still waiting...\n          "]))))));
                    }, 30000);
                    return [4 /*yield*/, window.geckoProfilerPromise];
                case 1:
                    geckoProfiler = _a.sent();
                    clearTimeout(timeoutId);
                    return [4 /*yield*/, getProfileFromAddon(dispatch, geckoProfiler)];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _a.sent();
                    dispatch(errors_2.fatalError(error_2));
                    throw error_2;
                case 4: return [2 /*return*/];
            }
        });
    }); };
}
exports.retrieveProfileFromAddon = retrieveProfileFromAddon;
function waitingForProfileFromStore() {
    return {
        type: 'WAITING_FOR_PROFILE_FROM_STORE'
    };
}
exports.waitingForProfileFromStore = waitingForProfileFromStore;
function waitingForProfileFromUrl(profileUrl) {
    return {
        type: 'WAITING_FOR_PROFILE_FROM_URL',
        profileUrl: profileUrl
    };
}
exports.waitingForProfileFromUrl = waitingForProfileFromUrl;
function receiveZipFile(zip) {
    return {
        type: 'RECEIVE_ZIP_FILE',
        zip: zip
    };
}
exports.receiveZipFile = receiveZipFile;
function temporaryError(error) {
    return {
        type: 'TEMPORARY_ERROR',
        error: error
    };
}
exports.temporaryError = temporaryError;
function _wait(delayMs) {
    return new Promise(function (resolve) { return setTimeout(resolve, delayMs); });
}
/**
 * Tries to fetch a profile on `url`. If the profile is not found,
 * `onTemporaryError` is called with an appropriate error, we wait 1 second, and
 * then tries again. If we still can't find the profile after 11 tries, the
 * returned promise is rejected with a fatal error.
 * If we can retrieve the profile properly, the returned promise is resolved
 * with the JSON.parsed profile.
 */
function _fetchProfile(args) {
    return __awaiter(this, void 0, void 0, function () {
        var MAX_WAIT_SECONDS, i, url, onTemporaryError, reportError, response;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    MAX_WAIT_SECONDS = 10;
                    i = 0;
                    url = args.url, onTemporaryError = args.onTemporaryError;
                    reportError = args.reportError || console.error;
                    _a.label = 1;
                case 1:
                    if (!true) return [3 /*break*/, 4];
                    return [4 /*yield*/, fetch(url)];
                case 2:
                    response = _a.sent();
                    // Case 1: successful answer.
                    if (response.ok) {
                        return [2 /*return*/, _extractProfileOrZipFromResponse(url, response, reportError)];
                    }
                    // case 2: unrecoverable error.
                    if (response.status !== 403) {
                        throw new Error(common_tags_1.oneLine(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n        Could not fetch the profile on remote server.\n        Response was: ", " ", ".\n      "], ["\n        Could not fetch the profile on remote server.\n        Response was: ", " ", ".\n      "])), response.status, response.statusText));
                    }
                    // case 3: 403 errors can be transient while a profile is uploaded.
                    if (i++ === MAX_WAIT_SECONDS) {
                        // In the last iteration we don't send a temporary error because we'll
                        // throw an error right after the while loop.
                        return [3 /*break*/, 4];
                    }
                    onTemporaryError(new errors_1.TemporaryError('Profile not found on remote server.', { count: i, total: MAX_WAIT_SECONDS + 1 } // 11 tries during 10 seconds
                    ));
                    return [4 /*yield*/, _wait(1000)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 1];
                case 4: throw new Error(common_tags_1.oneLine(templateObject_3 || (templateObject_3 = __makeTemplateObject(["\n    Could not fetch the profile on remote server:\n    still not found after ", " seconds.\n  "], ["\n    Could not fetch the profile on remote server:\n    still not found after ", " seconds.\n  "])), MAX_WAIT_SECONDS));
            }
        });
    });
}
exports._fetchProfile = _fetchProfile;
/**
 * Deduce the file type from a url and content type. Third parties can give us
 * arbitrary information, so make sure that we try out best to extract the proper
 * information about it.
 */
function _deduceContentType(url, contentType) {
    if (contentType === 'application/zip' || contentType === 'application/json') {
        return contentType;
    }
    if (url.match(/\.zip$/)) {
        return 'application/zip';
    }
    if (url.match(/\.json/)) {
        return 'application/json';
    }
    return null;
}
/**
 * This function guesses the correct content-type (even if one isn't sent) and then
 * attempts to use the proper method to extract the response.
 */
function _extractProfileOrZipFromResponse(url, response, reportError) {
    return __awaiter(this, void 0, void 0, function () {
        var contentType, _a;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    contentType = _deduceContentType(url, response.headers.get('content-type'));
                    _a = contentType;
                    switch (_a) {
                        case 'application/zip': return [3 /*break*/, 1];
                        case 'application/json': return [3 /*break*/, 3];
                        case null: return [3 /*break*/, 3];
                    }
                    return [3 /*break*/, 5];
                case 1:
                    _b = {};
                    return [4 /*yield*/, _extractZipFromResponse(response, reportError)];
                case 2: return [2 /*return*/, (_b.zip = _d.sent(),
                        _b)];
                case 3:
                    _c = {};
                    return [4 /*yield*/, _extractJsonFromResponse(response, reportError, contentType)];
                case 4: 
                // The content type is null if it is unknown, or an unsupported type. Go ahead
                // and try to process it as a profile.
                return [2 /*return*/, (_c.profile = _d.sent(),
                        _c)];
                case 5: throw new Error("Unhandled file type: " + function (contentType) { return ; });
            }
        });
    });
}
/**
 * Attempt to load a zip file from a third party. This process can fail, so make sure
 * to handle and report the error if it does.
 */
function _extractZipFromResponse(response, reportError) {
    return __awaiter(this, void 0, void 0, function () {
        var buffer, zip, error_3, message;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, response.arrayBuffer()];
                case 1:
                    buffer = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, jszip_1["default"].loadAsync(buffer)];
                case 3:
                    zip = _a.sent();
                    // Catch the error if unable to load the zip.
                    return [2 /*return*/, zip];
                case 4:
                    error_3 = _a.sent();
                    message = 'Unable to unzip the zip file.';
                    reportError(message);
                    reportError('Error:', error_3);
                    reportError('Fetch response:', response);
                    throw new Error(message + " The full error information has been printed out to the DevTool\u2019s console.");
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Don't trust third party responses, try and handle a variety of responses gracefully.
 */
function _extractJsonFromResponse(response, reportError, fileType) {
    return __awaiter(this, void 0, void 0, function () {
        var json, error_4, message;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, response.json()];
                case 1:
                    json = _a.sent();
                    // Catch the error if unable to parse the JSON.
                    return [2 /*return*/, json];
                case 2:
                    error_4 = _a.sent();
                    message = void 0;
                    if (error_4 && typeof error_4 === 'object' && error_4.name === 'AbortError') {
                        message = 'The network request to load the profile was aborted.';
                    }
                    else if (fileType === 'application/json') {
                        message = 'The profile’s JSON could not be decoded.';
                    }
                    else {
                        message = common_tags_1.oneLine(templateObject_4 || (templateObject_4 = __makeTemplateObject(["\n        The profile could not be downloaded and decoded. This does not look like a supported file\n        type.\n      "], ["\n        The profile could not be downloaded and decoded. This does not look like a supported file\n        type.\n      "])));
                    }
                    // Provide helpful debugging information to the console.
                    reportError(message);
                    reportError('JSON parsing error:', error_4);
                    reportError('Fetch response:', response);
                    throw new Error(message + " The full error information has been printed out to the DevTool\u2019s console.");
                case 3: return [2 /*return*/];
            }
        });
    });
}
function getProfileUrlForHash(hash) {
    // See https://cloud.google.com/storage/docs/access-public-data
    // The URL is https://storage.googleapis.com/<BUCKET>/<FILEPATH>.
    // https://<BUCKET>.storage.googleapis.com/<FILEPATH> seems to also work but
    // is not documented nowadays.
    // By convention, "profile-store" is the name of our bucket, and the file path
    // is the hash we receive in the URL.
    return "https://storage.googleapis.com/" + constants_1.GOOGLE_STORAGE_BUCKET + "/" + hash;
}
exports.getProfileUrlForHash = getProfileUrlForHash;
function retrieveProfileFromStore(hash, initialLoad) {
    if (initialLoad === void 0) { initialLoad = false; }
    return retrieveProfileOrZipFromUrl(getProfileUrlForHash(hash), initialLoad);
}
exports.retrieveProfileFromStore = retrieveProfileFromStore;
/**
 * Runs a fetch on a URL, and downloads the file. If it's JSON, then it attempts
 * to process the profile. If it's a zip file, it tries to unzip it, and save it
 * into the store so that the user can then choose which file to load.
 */
function retrieveProfileOrZipFromUrl(profileUrl, initialLoad) {
    if (initialLoad === void 0) { initialLoad = false; }
    return function (dispatch) {
        return __awaiter(this, void 0, void 0, function () {
            var response, serializedProfile, zip, profile, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        dispatch(waitingForProfileFromUrl(profileUrl));
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 9, , 10]);
                        return [4 /*yield*/, _fetchProfile({
                                url: profileUrl,
                                onTemporaryError: function (e) {
                                    dispatch(temporaryError(e));
                                }
                            })];
                    case 2:
                        response = _a.sent();
                        serializedProfile = response.profile;
                        zip = response.zip;
                        if (!serializedProfile) return [3 /*break*/, 5];
                        return [4 /*yield*/, process_profile_1.unserializeProfileOfArbitraryFormat(serializedProfile)];
                    case 3:
                        profile = _a.sent();
                        if (profile === undefined) {
                            throw new Error('Unable to parse the profile.');
                        }
                        return [4 /*yield*/, dispatch(loadProfile(profile, {}, initialLoad))];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 5:
                        if (!zip) return [3 /*break*/, 7];
                        return [4 /*yield*/, dispatch(receiveZipFile(zip))];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 7: throw new Error('Expected to receive a zip file or profile from _fetchProfile.');
                    case 8: return [3 /*break*/, 10];
                    case 9:
                        error_5 = _a.sent();
                        dispatch(errors_2.fatalError(error_5));
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
}
exports.retrieveProfileOrZipFromUrl = retrieveProfileOrZipFromUrl;
function waitingForProfileFromFile() {
    return {
        type: 'WAITING_FOR_PROFILE_FROM_FILE'
    };
}
exports.waitingForProfileFromFile = waitingForProfileFromFile;
function _fileReader(input) {
    var reader = new FileReader();
    var promise = new Promise(function (resolve, reject) {
        // Flow's definition for FileReader doesn't handle the polymorphic nature of
        // reader.result very well, as its definition is <string | ArrayBuffer>.
        // Here we ensure type safety by returning the proper Promise type from the
        // methods below.
        reader.onload = function () { return resolve(reader.result); };
        reader.onerror = function () { return reject(reader.error); };
    });
    return {
        asText: function () {
            reader.readAsText(input);
            return promise;
        },
        asArrayBuffer: function () {
            reader.readAsArrayBuffer(input);
            return promise;
        }
    };
}
/**
 * Multiple file formats are supported. Look at the file type and try and
 * parse the contents according to its type.
 */
function retrieveProfileFromFile(file, 
// Allow tests to inject a custom file reader to bypass the DOM APIs.
fileReader) {
    var _this = this;
    if (fileReader === void 0) { fileReader = _fileReader; }
    return function (dispatch) { return __awaiter(_this, void 0, void 0, function () {
        var _a, buffer, arrayBuffer, decompressedArrayBuffer, textDecoder, text, profile_1, buffer, zip, text, profile_2, error_6;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    // Notify the UI that we are loading and parsing a profile. This can take
                    // a little bit of time.
                    dispatch(waitingForProfileFromFile());
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 17, , 18]);
                    _a = file.type;
                    switch (_a) {
                        case 'application/gzip': return [3 /*break*/, 2];
                        case 'application/x-gzip': return [3 /*break*/, 2];
                        case 'application/zip': return [3 /*break*/, 8];
                    }
                    return [3 /*break*/, 12];
                case 2: return [4 /*yield*/, fileReader(file).asArrayBuffer()];
                case 3:
                    buffer = _b.sent();
                    arrayBuffer = new Uint8Array(buffer);
                    return [4 /*yield*/, gz_1.decompress(arrayBuffer)];
                case 4:
                    decompressedArrayBuffer = _b.sent();
                    textDecoder = new TextDecoder();
                    return [4 /*yield*/, textDecoder.decode(decompressedArrayBuffer)];
                case 5:
                    text = _b.sent();
                    return [4 /*yield*/, process_profile_1.unserializeProfileOfArbitraryFormat(text)];
                case 6:
                    profile_1 = _b.sent();
                    if (profile_1 === undefined) {
                        throw new Error('Unable to parse the profile.');
                    }
                    return [4 /*yield*/, url_handling_1.withHistoryReplaceStateAsync(function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, dispatch(viewProfile(profile_1))];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 7:
                    _b.sent();
                    return [3 /*break*/, 16];
                case 8: return [4 /*yield*/, fileReader(file).asArrayBuffer()];
                case 9:
                    buffer = _b.sent();
                    return [4 /*yield*/, jszip_1["default"].loadAsync(buffer)];
                case 10:
                    zip = _b.sent();
                    return [4 /*yield*/, dispatch(receiveZipFile(zip))];
                case 11:
                    _b.sent();
                    return [3 /*break*/, 16];
                case 12: return [4 /*yield*/, fileReader(file).asText()];
                case 13:
                    text = _b.sent();
                    return [4 /*yield*/, process_profile_1.unserializeProfileOfArbitraryFormat(text)];
                case 14:
                    profile_2 = _b.sent();
                    if (profile_2 === undefined) {
                        throw new Error('Unable to parse the profile.');
                    }
                    return [4 /*yield*/, url_handling_1.withHistoryReplaceStateAsync(function () { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, dispatch(viewProfile(profile_2))];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 15:
                    _b.sent();
                    _b.label = 16;
                case 16: return [3 /*break*/, 18];
                case 17:
                    error_6 = _b.sent();
                    dispatch(errors_2.fatalError(error_6));
                    return [3 /*break*/, 18];
                case 18: return [2 /*return*/];
            }
        });
    }); };
}
exports.retrieveProfileFromFile = retrieveProfileFromFile;
/**
 * This action retrieves several profiles and push them into 1 profile using the
 * information contained in the query.
 */
function retrieveProfilesToCompare(profileViewUrls, initialLoad) {
    var _this = this;
    if (initialLoad === void 0) { initialLoad = false; }
    return function (dispatch) { return __awaiter(_this, void 0, void 0, function () {
        var profileStates, hasSupportedDatasources, promises, profiles, _a, resultProfile, implementationFilters, transformStacks, implementationFilter, error_7;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    dispatch(waitingForProfileFromUrl());
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 5, , 6]);
                    return [4 /*yield*/, Promise.all(profileViewUrls.map(function (url) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        if (!(url.startsWith('https://perfht.ml/') ||
                                            url.startsWith('https://share.firefox.dev/') ||
                                            url.startsWith('https://bit.ly/'))) return [3 /*break*/, 2];
                                        return [4 /*yield*/, shorten_url_1.expandUrl(url)];
                                    case 1:
                                        url = _a.sent();
                                        _a.label = 2;
                                    case 2: return [2 /*return*/, url_handling_1.stateFromLocation(new URL(url))];
                                }
                            });
                        }); }))];
                case 2:
                    profileStates = _b.sent();
                    hasSupportedDatasources = profileStates.every(function (state) { return state.dataSource === 'public'; });
                    if (!hasSupportedDatasources) {
                        throw new Error('Only public uploaded profiles are supported by the comparison function.');
                    }
                    promises = profileStates.map(function (_a) {
                        var hash = _a.hash;
                        return __awaiter(_this, void 0, void 0, function () {
                            var profileUrl, response, serializedProfile, profile;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        profileUrl = getProfileUrlForHash(hash);
                                        return [4 /*yield*/, _fetchProfile({
                                                url: profileUrl,
                                                onTemporaryError: function (e) {
                                                    dispatch(temporaryError(e));
                                                }
                                            })];
                                    case 1:
                                        response = _b.sent();
                                        serializedProfile = response.profile;
                                        if (!serializedProfile) {
                                            throw new Error('Expected to receive a profile from _fetchProfile');
                                        }
                                        profile = process_profile_1.unserializeProfileOfArbitraryFormat(serializedProfile);
                                        return [2 /*return*/, profile];
                                }
                            });
                        });
                    });
                    return [4 /*yield*/, Promise.all(promises)];
                case 3:
                    profiles = _b.sent();
                    _a = merge_compare_1.mergeProfilesForDiffing(profiles, profileStates), resultProfile = _a.profile, implementationFilters = _a.implementationFilters, transformStacks = _a.transformStacks;
                    implementationFilter = void 0;
                    if (implementationFilters[0] === implementationFilters[1]) {
                        implementationFilter = implementationFilters[0];
                    }
                    return [4 /*yield*/, dispatch(loadProfile(resultProfile, {
                            transformStacks: transformStacks,
                            implementationFilter: implementationFilter
                        }, initialLoad))];
                case 4:
                    _b.sent();
                    return [3 /*break*/, 6];
                case 5:
                    error_7 = _b.sent();
                    dispatch(errors_2.fatalError(error_7));
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    }); };
}
exports.retrieveProfilesToCompare = retrieveProfilesToCompare;
Profile | null, shouldSetupInitialUrlState;
boolean;
 >
    > {
        "return": function (dispatch, getState) { return __awaiter(void 0, void 0, void 0, function () {
            var pathParts, dataSource, shouldSetupInitialUrlState, _a, query;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        pathParts = location.pathname.split('/').filter(function (d) { return d; });
                        dataSource = url_handling_1.getDataSourceFromPathParts(pathParts);
                        if (dataSource === 'from-file') {
                            // Redirect to 'none' if `dataSource` is 'from-file' since initial urls can't
                            // be 'from-file' and needs to be redirected to home page.
                            dataSource = 'none';
                        }
                        dispatch(profile_view_1.setDataSource(dataSource));
                        shouldSetupInitialUrlState = true;
                        _a = dataSource;
                        switch (_a) {
                            case 'from-addon': return [3 /*break*/, 1];
                            case 'public': return [3 /*break*/, 2];
                            case 'from-url': return [3 /*break*/, 4];
                            case 'compare': return [3 /*break*/, 6];
                            case 'uploaded-recordings': return [3 /*break*/, 9];
                            case 'none': return [3 /*break*/, 9];
                            case 'from-file': return [3 /*break*/, 9];
                            case 'local': return [3 /*break*/, 9];
                        }
                        return [3 /*break*/, 10];
                    case 1:
                        shouldSetupInitialUrlState = false;
                        // We don't need to `await` the result because there's no url upgrading
                        // when retrieving the profile from the addon and we don't need to wait
                        // for the process. Moreover we don't want to wait for the end of
                        // symbolication and rather want to show the UI as soon as we get
                        // the profile data.
                        dispatch(retrieveProfileFromAddon());
                        return [3 /*break*/, 11];
                    case 2: return [4 /*yield*/, dispatch(retrieveProfileFromStore(pathParts[1], true))];
                    case 3:
                        _b.sent();
                        return [3 /*break*/, 11];
                    case 4: return [4 /*yield*/, dispatch(retrieveProfileOrZipFromUrl(decodeURIComponent(pathParts[1]), true))];
                    case 5:
                        _b.sent();
                        return [3 /*break*/, 11];
                    case 6:
                        query = query_string_1["default"].parse(location.search.substr(1), {
                            arrayFormat: 'bracket'
                        });
                        if (!Array.isArray(query.profiles)) return [3 /*break*/, 8];
                        return [4 /*yield*/, dispatch(retrieveProfilesToCompare(query.profiles, true))];
                    case 7:
                        _b.sent();
                        _b.label = 8;
                    case 8: return [3 /*break*/, 11];
                    case 9: 
                    // There is no profile to download for these datasources.
                    return [3 /*break*/, 11];
                    case 10: throw flow_1.assertExhaustiveCheck(dataSource, "Unknown dataSource " + dataSource + ".");
                    case 11: 
                    // Profile may be null only for the `from-addon` dataSource since we do
                    // not `await` for retrieveProfileFromAddon function.
                    return [2 /*return*/, {
                            profile: selectors_1.getProfileOrNull(getState()),
                            shouldSetupInitialUrlState: shouldSetupInitialUrlState
                        }];
                }
            });
        }); }
    };
var templateObject_1, templateObject_2, templateObject_3, templateObject_4;
