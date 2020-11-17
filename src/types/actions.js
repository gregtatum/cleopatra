"use strict";
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
exports.__esModule = true;
var call_tree_1 = require("../profile-logic/call-tree");
+hasSelection;
false, +isModifying;
false;
    | {} |
    +hasSelection;
true,
    +isModifying;
boolean,
    +selectionStart;
number,
    +selectionEnd;
number,
;
;
+hidden;
number,
    +total;
number,
;
;
+type;
'global',
    +trackIndex;
TrackIndex,
;
;
+type;
'local',
    +trackIndex;
TrackIndex,
    +pid;
Pid,
;
;
+type;
'global',
    +trackIndex;
TrackIndex,
;
;
+type;
'resource',
    +trackIndex;
TrackIndex,
;
;
+debugName;
string,
    +breakpadId;
string,
;
;
boolean,
    includeFullTimeRange;
boolean,
    includeScreenshots;
boolean,
    includeUrls;
boolean,
    includeExtension;
boolean,
    includePreferenceValues;
boolean,
;
;
+threadsKey;
ThreadsKey,
    +markerIndex;
MarkerIndex,
;
;
+type;
'ROUTE_NOT_FOUND',
    +url;
string,
;
    | {} |
    +type;
'ASSIGN_TASK_TRACER_NAMES',
    +addressIndices;
number[],
    +symbolNames;
string[],
;
    | {} |
    +type;
'CHANGE_SELECTED_CALL_NODE',
    +threadsKey;
ThreadsKey,
    +selectedCallNodePath;
CallNodePath,
    +optionalExpandedToCallNodePath;
CallNodePath,
;
    | {} |
    +type;
'UPDATE_TRACK_THREAD_HEIGHT',
    +height;
CssPixels,
    +threadsKey;
ThreadsKey,
;
    | {} |
    +type;
'CHANGE_RIGHT_CLICKED_CALL_NODE',
    +threadsKey;
ThreadsKey,
    +callNodePath;
CallNodePath | null,
;
    | {} |
    +type;
'FOCUS_CALL_TREE',
;
    | {} |
    +type;
'CHANGE_EXPANDED_CALL_NODES',
    +threadsKey;
ThreadsKey,
    +expandedCallNodePaths;
Array < CallNodePath > ,
;
    | {} |
    +type;
'CHANGE_SELECTED_MARKER',
    +threadsKey;
ThreadsKey,
    +selectedMarker;
MarkerIndex | null,
;
    | {} |
    +type;
'CHANGE_SELECTED_NETWORK_MARKER',
    +threadsKey;
ThreadsKey,
    +selectedNetworkMarker;
MarkerIndex | null,
;
    | {} |
    +type;
'CHANGE_RIGHT_CLICKED_MARKER',
    +threadsKey;
ThreadsKey,
    +markerIndex;
MarkerIndex | null,
;
    | {} |
    +type;
'UPDATE_PREVIEW_SELECTION',
    +previewSelection;
PreviewSelection,
;
    | {} |
    +type;
'CHANGE_SELECTED_ZIP_FILE',
    +selectedZipFileIndex;
IndexIntoZipFileTable | null,
;
    | {} |
    +type;
'CHANGE_EXPANDED_ZIP_FILES',
    +expandedZipFileIndexes;
Array < IndexIntoZipFileTable | null > ,
;
    | {} |
    +type;
'CHANGE_GLOBAL_TRACK_ORDER',
    +globalTrackOrder;
TrackIndex[],
;
    | {} |
    +type;
'HIDE_GLOBAL_TRACK',
    +trackIndex;
TrackIndex,
    +selectedThreadIndexes;
Set < ThreadIndex > ,
;
    | {} |
    +type;
'SHOW_GLOBAL_TRACK',
    +trackIndex;
TrackIndex,
;
    | {} |
    // Isolate only the process track, and not the local tracks.
    +type;
'ISOLATE_PROCESS',
    +hiddenGlobalTracks;
Set < TrackIndex > ,
    +isolatedTrackIndex;
TrackIndex,
    +selectedThreadIndexes;
Set < ThreadIndex > ,
;
    | {} |
    // Isolate the process track, and hide the local tracks.
    type;
'ISOLATE_PROCESS_MAIN_THREAD',
    pid;
Pid,
    hiddenGlobalTracks;
Set < TrackIndex > ,
    isolatedTrackIndex;
TrackIndex,
    selectedThreadIndexes;
Set < ThreadIndex > ,
    hiddenLocalTracks;
Set < TrackIndex > ,
;
    | {} |
    // Isolate only the screenshot track
    +type;
'ISOLATE_SCREENSHOT_TRACK',
    +hiddenGlobalTracks;
Set < TrackIndex > ,
;
    | {} |
    +type;
'CHANGE_LOCAL_TRACK_ORDER',
    +localTrackOrder;
TrackIndex[],
    +pid;
Pid,
;
    | {} |
    +type;
'HIDE_LOCAL_TRACK',
    +pid;
Pid,
    +trackIndex;
TrackIndex,
    +selectedThreadIndexes;
Set < ThreadIndex > ,
;
    | {} |
    +type;
'SHOW_LOCAL_TRACK',
    +pid;
Pid,
    +trackIndex;
TrackIndex,
;
    | {} |
    +type;
'ISOLATE_LOCAL_TRACK',
    +pid;
Pid,
    +hiddenGlobalTracks;
Set < TrackIndex > ,
    +hiddenLocalTracks;
Set < TrackIndex > ,
    +selectedThreadIndexes;
Set < ThreadIndex > ,
;
    | {} |
    +type;
'SET_CONTEXT_MENU_VISIBILITY',
    +isVisible;
boolean,
;
    | {} |
    +type;
'INCREMENT_PANEL_LAYOUT_GENERATION',
;
    | {} | +type;
'HAS_ZOOMED_VIA_MOUSEWHEEL';
    | {} | +type;
'DISMISS_NEWLY_PUBLISHED';
    | {} |
    +type;
'ENABLE_EVENT_DELAY_TRACKS',
    +localTracksByPid;
Map < Pid, LocalTrack[] > ,
    +localTrackOrderByPid;
Map < Pid, TrackIndex[] > ,
;
;
+type;
'BULK_SYMBOLICATION',
    +symbolicatedThreads;
Thread[],
    +oldFuncToNewFuncMaps;
Map < ThreadIndex, FuncToFuncMap > ,
;
    | {} |
    +type;
'DONE_SYMBOLICATING',
;
    | {} |
    +type;
'TEMPORARY_ERROR',
    +error;
TemporaryError,
;
    | {} |
    +type;
'FATAL_ERROR',
    +error;
Error,
;
    | {} |
    +type;
'PROFILE_LOADED',
    +profile;
Profile,
    +pathInZipFile;
string,
    +implementationFilter;
ImplementationFilter,
    +transformStacks;
TransformStacksPerThread,
;
    | {} |
    +type;
'VIEW_FULL_PROFILE',
    +selectedThreadIndexes;
Set < ThreadIndex > ,
    +globalTracks;
GlobalTrack[],
    +globalTrackOrder;
TrackIndex[],
    +hiddenGlobalTracks;
Set < TrackIndex > ,
    +localTracksByPid;
Map < Pid, LocalTrack[] > ,
    +hiddenLocalTracksByPid;
Map < Pid, Set < TrackIndex >> ,
    +localTrackOrderByPid;
Map < Pid, TrackIndex[] > ,
;
    | {} |
    +type;
'VIEW_ORIGINS_PROFILE',
    +selectedThreadIndexes;
Set < ThreadIndex > ,
    +originsTimeline;
OriginsTimeline,
;
    | {} |
    +type;
'VIEW_ACTIVE_TAB_PROFILE',
    +selectedThreadIndexes;
Set < ThreadIndex > ,
    +activeTabTimeline;
ActiveTabTimeline,
    +browsingContextID;
BrowsingContextID | null,
;
    | {} |
    +type;
'DATA_RELOAD',
;
    | {} | +type;
'RECEIVE_ZIP_FILE', +zip;
JSZip;
    | {} | +type;
'PROCESS_PROFILE_FROM_ZIP_FILE', +pathInZipFile;
string;
    | {} | +type;
'FAILED_TO_PROCESS_PROFILE_FROM_ZIP_FILE', +error;
any;
    | {} | +type;
'DISMISS_PROCESS_PROFILE_FROM_ZIP_ERROR';
    | {} | +type;
'RETURN_TO_ZIP_FILE_LIST';
    | {} | +type;
'FILE_NOT_FOUND_IN_ZIP_FILE', +pathInZipFile;
string;
    | {} | +type;
'REQUESTING_SYMBOL_TABLE', +requestedLib;
RequestedLib;
    | {} | +type;
'RECEIVED_SYMBOL_TABLE_REPLY', +requestedLib;
RequestedLib;
    | {} | +type;
'START_SYMBOLICATING';
    | {} | +type;
'WAITING_FOR_PROFILE_FROM_ADDON';
    | {} | +type;
'WAITING_FOR_PROFILE_FROM_STORE';
    | {} | +type;
'WAITING_FOR_PROFILE_FROM_URL', +profileUrl;
string;
    | {} | +type;
'TRIGGER_LOADING_FROM_URL', +profileUrl;
string;
;
+type;
'START_FETCHING_PROFILES';
    | {} | +type;
'URL_SETUP_DONE';
    | {} | +type;
'UPDATE_URL_STATE', +newUrlState;
UrlState | null;
;
+type;
'WAITING_FOR_PROFILE_FROM_FILE';
    | {} |
    +type;
'PROFILE_PUBLISHED',
    +hash;
string,
    +prePublishedState;
State | null,
;
    | {} | +type;
'CHANGE_SELECTED_TAB', +selectedTab;
TabSlug;
    | {} | +type;
'COMMIT_RANGE', +start;
number, +end;
number;
    | {} | +type;
'POP_COMMITTED_RANGES', +firstPoppedFilterIndex;
number;
    | {} |
    +type;
'CHANGE_SELECTED_THREAD',
    +selectedThreadIndexes;
Set < ThreadIndex > ,
;
    | {} |
    +type;
'SELECT_TRACK',
    +selectedThreadIndexes;
Set < ThreadIndex > ,
    +selectedTab;
TabSlug,
;
    | {} |
    +type;
'CHANGE_RIGHT_CLICKED_TRACK',
    +trackReference;
TrackReference | null,
;
    | {} | +type;
'CHANGE_CALL_TREE_SEARCH_STRING', +searchString;
string;
    | {} |
    +type;
'ADD_TRANSFORM_TO_STACK',
    +threadsKey;
ThreadsKey,
    +transform;
Transform,
    +transformedThread;
Thread,
;
    | {} |
    +type;
'POP_TRANSFORMS_FROM_STACK',
    +threadsKey;
ThreadsKey,
    +firstPoppedFilterIndex;
number,
;
    | {} |
    +type;
'CHANGE_TIMELINE_TYPE',
    +timelineType;
TimelineType,
;
    | {} |
    +type;
'CHANGE_IMPLEMENTATION_FILTER',
    +implementation;
ImplementationFilter,
    +threadsKey;
ThreadsKey,
    +transformedThread;
Thread,
    +previousImplementation;
ImplementationFilter,
    +implementation;
ImplementationFilter,
;
    | {} |
    type;
'CHANGE_CALL_TREE_SUMMARY_STRATEGY',
    callTreeSummaryStrategy;
CallTreeSummaryStrategy,
;
    | {} |
    +type;
'CHANGE_INVERT_CALLSTACK',
    +invertCallstack;
boolean,
    +callTree;
call_tree_1.CallTree,
    +callNodeTable;
CallNodeTable,
    +selectedThreadIndexes;
Set < ThreadIndex > ,
;
    | {} |
    +type;
'CHANGE_SHOW_USER_TIMINGS',
    +showUserTimings;
boolean,
;
    | {} |
    +type;
'CHANGE_SHOW_JS_TRACER_SUMMARY',
    +showSummary;
boolean,
;
    | {} | +type;
'CHANGE_MARKER_SEARCH_STRING', +searchString;
string;
    | {} | +type;
'CHANGE_NETWORK_SEARCH_STRING', +searchString;
string;
    | {} | +type;
'CHANGE_PROFILES_TO_COMPARE', +profiles;
string[];
    | {} | +type;
'CHANGE_PROFILE_NAME', +profileName;
string | null;
    | {} |
    +type;
'SANITIZED_PROFILE_PUBLISHED',
    +hash;
string,
    +committedRanges;
StartEndRange[] | null,
    +oldThreadIndexToNew;
Map( | null, +prePublishedState, State | null, 
    | {} |
    +type, 'SET_DATA_SOURCE', +dataSource, DataSource, 
    | {} |
    +type, 'CHANGE_MOUSE_TIME_POSITION', +mouseTimePosition, Milliseconds | null, 
    | {} |
    +type, 'TOGGLE_RESOURCES_PANEL', +selectedThreadIndexes, Set < ThreadIndex > );
+type;
'ICON_HAS_LOADED', +icon;
string;
    | {} | +type;
'ICON_IN_ERROR', +icon;
string;
;
+type;
'CHANGE_SIDEBAR_OPEN_STATE',
    +tab;
TabSlug,
    +isOpen;
boolean,
;
;
+type;
'TOGGLE_CHECKED_SHARING_OPTION',
    +slug;
$Keys < CheckedSharingOptions > ,
;
    | {} |
    +type;
'UPLOAD_STARTED',
;
    | {} |
    +type;
'UPDATE_UPLOAD_PROGRESS',
    +uploadProgress;
number,
;
    | {} |
    +type;
'UPLOAD_FAILED',
    +error;
mixed,
;
    | {} |
    +type;
'UPLOAD_ABORTED',
;
    | {} |
    +type;
'UPLOAD_RESET',
;
    | {} |
    +type;
'UPLOAD_COMPRESSION_STARTED',
    +abortFunction;
(function () { return void ; },
);
    | {} |
    +type;
'CHANGE_UPLOAD_STATE',
    +changes;
Partial < UploadState > ,
;
    | {} |
    +type;
'REVERT_TO_PRE_PUBLISHED_STATE',
    +prePublishedState;
State,
;
    | {} | +type;
'HIDE_STALE_PROFILE';
;
+type;
'START_DRAGGING',
;
    | {} |
    +type;
'STOP_DRAGGING',
;
    | {} |
    +type;
'REGISTER_DRAG_AND_DROP_OVERLAY',
;
    | {} |
    +type;
'UNREGISTER_DRAG_AND_DROP_OVERLAY',
;
;
