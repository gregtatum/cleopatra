"use strict";
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
exports.__esModule = true;
IndexIntoStringTable[],
    startTime;
Milliseconds[],
    endTime;
Milliseconds[],
    phase;
MarkerPhase[],
    data;
MarkerPayload_Gecko[],
    category;
IndexIntoCategoryList[],
    length;
number,
;
;
'SyncProfile',
    registerTime;
null,
    unregisterTime;
null,
    processType;
string,
    tid;
number,
    pid;
number,
    markers;
GeckoMarkers,
    samples;
GeckoSamples,
;
;
    | {} |
    stack;
0,
    time;
1,
    responsiveness;
2,
;
    | {} |
    stack;
0,
    time;
1,
    eventDelay;
2,
;
data: Array <
    [
        null | IndexIntoGeckoStackTable,
        Milliseconds,
        // milliseconds since the last event was processed in this
        // thread's event loop at the time that the sample was taken
        Milliseconds
    ]
    > ,
;
;
Array < null | IndexIntoGeckoStackTable > ,
    time;
Milliseconds[],
    responsiveness;
Array <  ? Milliseconds >  : ,
    length;
number,
;
;
Array < null | IndexIntoGeckoStackTable > ,
    time;
Milliseconds[],
    eventDelay;
Array <  ? Milliseconds >  : ,
    length;
number,
;
;
{
     |
        location;
    0,
        relevantForJS;
    1,
        innerWindowID;
    2,
        implementation;
    3,
        optimizations;
    4,
        line;
    5,
        column;
    6,
        category;
    7,
        subcategory;
    8,
    ;
}
data: Array <
    [
        // index into stringTable, points to strings like:
        // JS: "Startup::XRE_Main"
        // C++: "0x7fff7d962da1"
        IndexIntoStringTable,
        // for label frames, whether this frame should be shown in "JS only" stacks
        boolean,
        // innerWindowID of JS frames. See the comment inside FrameTable in src/types/profile.js
        // for more information.
        null | number,
        // for JS frames, an index into the string table, usually "Baseline" or "Ion"
        null | IndexIntoStringTable,
        // JSON info about JIT optimizations.
        null | MixedObject,
        // The line of code
        null | number,
        // The column of code
        null | number,
        // index into profile.meta.categories
        null | number,
        // index into profile.meta.categories[category].subcategories. Always non-null if category is non-null.
        null | number
    ]
    > ,
;
;
IndexIntoStringTable[],
    relevantForJS;
Array < boolean > ,
    implementation;
Array < null | IndexIntoStringTable > ,
    optimizations;
Array < null | MixedObject > ,
    line;
Array < null | number > ,
    column;
Array < null | number > ,
    category;
Array < null | number > ,
    subcategory;
Array < null | number > ,
    innerWindowID;
Array < null | number > ,
    length;
number,
;
;
{
     |
        prefix;
    0,
        frame;
    1,
    ;
}
data: Array < [IndexIntoGeckoStackTable | null, IndexIntoGeckoFrameTable] > ,
;
;
IndexIntoGeckoFrameTable[],
    prefix;
Array < IndexIntoGeckoStackTable | null > ,
    length;
number,
;
;
string,
    registerTime;
number,
    processType;
string,
    processName ?  : string,
    unregisterTime;
number | null,
    tid;
number,
    pid;
number,
    markers;
GeckoMarkers,
    samples;
GeckoSamples,
    frameTable;
GeckoFrameTable,
    stackTable;
GeckoStackTable,
    stringTable;
string[],
    jsTracerEvents ?  : JsTracerTable,
;
;
{
     |
        id;
    0,
        name;
    1,
        baseURL;
    2,
    ;
}
data: Array < [string, string, string] > ,
;
;
string,
    category;
string,
    description;
string,
    sample_groups;
$ReadOnlyArray < {} |
    id;
number,
    samples;
{
     |
        schema;
    {
         |
            time;
        0,
            number;
        1,
            count;
        2,
        ;
    }
    data: $ReadOnlyArray < [number, number, number] > ,
    ;
}
 > ,
;
;
{
     |
        schema;
    {
         |
            time;
        0,
            locking;
        1,
            expiredMarkerCleaning;
        2,
            counters;
        3,
            threads;
        4,
        ;
    }
    data: Array <
        [Nanoseconds, Nanoseconds, Nanoseconds, Nanoseconds, Nanoseconds]
        > ,
    ;
}
// There is no statistics object if there is no sample.
statistics ?  : ProfilerOverheadStats,
;
;
number,
    startTime;
Milliseconds,
    shutdownTime;
Milliseconds | null,
    categories;
CategoryList,
    markerSchema;
MarkerSchema[],
;
;
GeckoProfileShortMeta,
    interval;
Milliseconds,
    stackwalk;
0 | 1,
    // This value represents a boolean, but for some reason is written out as an int
    // value as the previous field.
    // It's 0 for opt builds, and 1 for debug builds.
    // This property was added to Firefox Profiler a long time after it was added to
    // Firefox, that's why we don't need to make it optional for gecko profiles.
    debug;
0 | 1,
    gcpoison;
0 | 1,
    asyncstack;
0 | 1,
    processType;
number,
    // The Update channel for this build of the application.
    // This property is landed in Firefox 67, and is optional because older
    // Firefox versions may not have them. No upgrader was necessary.
    updateChannel ?  :
            | 'default' // Local builds
            | 'nightly'
            | 'nightly-try' // Nightly try builds for QA
            | 'aurora' // Developer Edition channel
            | 'beta'
            | 'release'
            | 'esr' // Extended Support Release channel
            | string,
    // -- platform information -- This can be absent in some very rare situations.
    platform ?  : string,
    oscpu ?  : string,
    misc ?  : string,
    // -- Runtime -- This can be absent in some very rare situations.
    abi ?  : string,
    toolkit ?  : string,
    product ?  : string,
    // -- appInfo -- This can be absent in some very rare situations.
    // The appBuildID, sourceURL, physicalCPUs and logicalCPUs properties landed
    // in Firefox 62, and are only optional because older processed profile
    // versions may not have them. No upgrader was written for this change.
    appBuildID ?  : string,
    sourceURL ?  : string,
    // -- system info -- This can be absent in some very rare situations.
    physicalCPUs ?  : number,
    logicalCPUs ?  : number,
    // -- extensions --
    // The extensions property landed in Firefox 60, and is only optional because
    // older profile versions may not have it. No upgrader was written for this change.
    extensions ?  : GeckoExtensionMeta,
    // -- extra properties added by the frontend --
    // This boolean indicates whether this gecko profile includes already
    // symbolicated frames. This will be missing for profiles coming from Gecko
    // (which indicates that they'll need to be symbolicated) but may be specified
    // for profiles imported from other formats (eg: linux perf).
    presymbolicated ?  : boolean,
    // Visual metrics contains additional performance metrics such as Speed Index,
    // Perceptual Speed Index, and ContentfulSpeedIndex. This is optional because only
    // profiles generated by browsertime will have this property. Source code for
    // browsertime can be found at https://github.com/mozilla/browsertime.
    visualMetrics ?  : VisualMetrics,
    // Optional because older Firefox versions may not have the data.
    configuration ?  : ProfilerConfiguration,
;
;
GeckoCounter[],
    // Optional because older Firefox versions may not have that data and
    // no upgrader was necessary.
    profilerOverhead ?  : GeckoProfilerOverhead,
    meta;
Meta,
    libs;
Lib[],
    pages ?  : PageList,
    threads;
GeckoThread[],
    pausedRanges;
PausedRange[],
    tasktracer ?  : MixedObject,
    processes;
GeckoSubprocessProfile[],
    jsTracerDictionary ?  : string[],
;
;
