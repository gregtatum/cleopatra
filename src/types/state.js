"use strict";
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
exports.__esModule = true;
Action;
T;
+selectedCallNodePath;
CallNodePath,
    +expandedCallNodePaths;
PathSet,
    +selectedMarker;
MarkerIndex | null,
    +selectedNetworkMarker;
MarkerIndex | null,
;
;
+threadsKey;
ThreadsKey,
    +callNodePath;
CallNodePath,
;
;
+threadsKey;
ThreadsKey,
    +markerIndex;
MarkerIndex,
;
;
GlobalTrack[],
    localTracksByPid;
Map < Pid, LocalTrack[] > ,
;
;
OriginsTimeline,
;
;
ActiveTabTimeline,
;
;
+viewOptions;
{
     |
        perThread;
    ThreadViewOptionsPerThreads,
        symbolicationStatus;
    SymbolicationStatus,
        waitingForLibs;
    Set < RequestedLib > ,
        previewSelection;
    PreviewSelection,
        scrollToSelectionGeneration;
    number,
        focusCallTreeGeneration;
    number,
        rootRange;
    StartEndRange,
        rightClickedTrack;
    TrackReference | null,
        rightClickedCallNode;
    RightClickedCallNode | null,
        rightClickedMarker;
    RightClickedMarker | null,
        mouseTimePosition;
    Milliseconds | null,
    ;
}
+profile;
Profile | null,
    +full;
FullProfileViewState,
    +activeTab;
ActiveTabProfileViewState,
    +origins;
OriginsViewState,
;
;
+phase;
'ROUTE_NOT_FOUND';
    | {} | +phase;
'TRANSITIONING_FROM_STALE_PROFILE';
    | {} | +phase;
'PROFILE_LOADED';
    | {} | +phase;
'DATA_LOADED';
    | {} | +phase;
'DATA_RELOAD';
    | {} | +phase;
'FATAL_ERROR', +error;
Error;
    | {} |
    +phase;
'INITIALIZING',
    +additionalData ?  : {} | +attempt;
Attempt | null, +message;
string;
;
+phase;
'NO_ZIP_FILE',
    +zip;
null,
    +pathInZipFile;
null,
;
    | {} |
    +phase;
'LIST_FILES_IN_ZIP_FILE',
    +zip;
JSZip,
    +pathInZipFile;
null,
;
    | {} |
    +phase;
'PROCESS_PROFILE_FROM_ZIP_FILE',
    +zip;
JSZip,
    +pathInZipFile;
string,
;
    | {} |
    +phase;
'FAILED_TO_PROCESS_PROFILE_FROM_ZIP_FILE',
    +zip;
JSZip,
    +pathInZipFile;
string,
;
    | {} |
    +phase;
'FILE_NOT_FOUND_IN_ZIP_FILE',
    +zip;
JSZip,
    +pathInZipFile;
string,
;
    | {} |
    +phase;
'VIEW_PROFILE_IN_ZIP_FILE',
    +zip;
JSZip,
    +pathInZipFile;
string,
;
;
+eventDelayTracks;
boolean,
;
;
+view;
AppViewState,
    +urlSetupPhase;
UrlSetupPhase,
    +hasZoomedViaMousewheel;
boolean,
    +isSidebarOpenPerPanel;
IsSidebarOpenPerPanelState,
    +panelLayoutGeneration;
number,
    +lastVisibleThreadTabSlug;
TabSlug,
    +trackThreadHeights;
{
    [key, ThreadsKey];
    CssPixels,
    ;
}
+isNewlyPublished;
boolean,
    +isDragAndDropDragging;
boolean,
    +isDragAndDropOverlayRegistered;
boolean,
    +experimental;
ExperimentalFlags,
;
;
UploadPhase,
    uploadProgress;
number,
    error;
Error | mixed,
    abortFunction;
(function () { return void ; },
    generation);
number,
;
;
+checkedSharingOptions;
CheckedSharingOptions,
    +upload;
UploadState,
    +isHidingStaleProfile;
boolean,
    +hasSanitizedProfile;
boolean,
    +prePublishedState;
State | null,
;
;
TrackIndex[],
    hiddenGlobalTracks;
Set < TrackIndex > ,
    hiddenLocalTracksByPid;
Map < Pid, Set < TrackIndex >> ,
    localTrackOrderByPid;
Map < Pid, TrackIndex[] > ,
    showJsTracerSummary;
boolean,
    timelineType;
TimelineType,
    legacyThreadOrder;
ThreadIndex[] | null,
    legacyHiddenThreads;
ThreadIndex[] | null,
;
;
boolean,
;
;
Set( | null, implementation, ImplementationFilter, lastSelectedCallTreeSummaryStrategy, CallTreeSummaryStrategy, invertCallstack, boolean, showUserTimings, boolean, committedRanges, StartEndRange[], callTreeSearchString, string, markersSearchString, string, networkSearchString, string, transforms, TransformStacksPerThread, full, FullProfileSpecificUrlState, activeTab, ActiveTabSpecificProfileUrlState);
+type;
'full';
    | {} | +type;
'active-tab', +browsingContextID;
BrowsingContextID | null;
    | {} | +type;
'origins';
;
+dataSource;
DataSource,
    // This is used for the "public" dataSource".
    +hash;
string,
    // This is used for the "from-url" dataSource.
    +profileUrl;
string,
    // This is used for the "compare" dataSource, to compare 2 profiles.
    +profilesToCompare;
string[] | null,
    +selectedTab;
TabSlug,
    +pathInZipFile;
string | null,
    +profileName;
string | null,
    +timelineTrackOrganization;
TimelineTrackOrganization,
    +profileSpecific;
ProfileSpecificUrlState,
;
;
+app;
AppState,
    +profileView;
ProfileViewState,
    +urlState;
UrlState,
    +icons;
IconState,
    +zippedProfiles;
ZippedProfilesState,
    +publish;
PublishState,
;
;
+icon;
string,
    +className;
string,
;
;
