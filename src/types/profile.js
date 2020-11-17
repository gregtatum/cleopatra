"use strict";
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
exports.__esModule = true;
IndexIntoFrameTable[],
    category;
IndexIntoCategoryList[],
    subcategory;
IndexIntoSubcategoryListForCategory[],
    prefix;
Array < IndexIntoStackTable | null > ,
    length;
number,
;
;
Array <  ? Milliseconds >  : ,
    // Event delay is the newer version of responsiveness. It allow us to get a finer-grained
    // view of jank by inferring what would be the delay of a hypothetical input event at
    // any point in time. It requires a pre-processing to be able to visualize properly.
    // This is optional because older profiles didn't have that field.
    eventDelay ?  : Array <  ? Milliseconds >  : ,
    stack;
Array < IndexIntoStackTable | null > ,
    time;
Milliseconds[],
    // An optional weight array. If not present, then the weight is assumed to be 1.
    // See the WeightType type for more information.
    weight;
null | number[],
    weightType;
WeightType,
    length;
number,
;
;
Milliseconds[],
    className;
string[],
    typeName;
string[], // Currently only 'JSObject'
    coarseType;
string[], // Currently only 'Object',
    // "weight" is used here rather than "bytes", so that this type will match the
    // SamplesLikeTableShape.
    weight;
Bytes[],
    weightType;
'bytes',
    inNursery;
boolean[],
    stack;
Array < IndexIntoStackTable | null > ,
    length;
number,
;
;
Milliseconds[],
    // "weight" is used here rather than "bytes", so that this type will match the
    // SamplesLikeTableShape.
    weight;
Bytes[],
    weightType;
'bytes',
    stack;
Array < IndexIntoStackTable | null > ,
    length;
number,
;
;
UnbalancedNativeAllocationsTable,
    memoryAddress;
number[],
    threadId;
number[],
;
;
MarkerPayload[],
    name;
IndexIntoStringTable[],
    startTime;
Array < number | null > ,
    endTime;
Array < number | null > ,
    phase;
number[],
    category;
IndexIntoCategoryList[],
    length;
number,
;
;
Array < Address | -1 > ,
    category;
(IndexIntoCategoryList | null)[],
    subcategory;
(IndexIntoSubcategoryListForCategory | null)[],
    func;
IndexIntoFuncTable[],
    // Inner window ID of JS frames. JS frames can be correlated to a Page through this value.
    // It's used to determine which JS frame belongs to which web page so we can display
    // that information and filter for single tab profiling.
    // `0` for non-JS frames and the JS frames that failed to get the ID. `0` means "null value"
    // because that's what Firefox platform DOM side assigns when it fails to get the ID or
    // something bad happens during that process. It's not `null` or `-1` because that information
    // is being stored as `uint64_t` there.
    innerWindowID;
(InnerWindowID | null)[],
    implementation;
(IndexIntoStringTable | null)[],
    line;
(number | null)[],
    column;
(number | null)[],
    optimizations;
({} | null)[],
    length;
number,
;
;
Array < IndexIntoStringTable > ,
    // isJS and relevantForJS describe the function type. Non-JavaScript functions
    // can be marked as "relevant for JS" so that for example DOM API label functions
    // will show up in any JavaScript stack views.
    // It may be worth combining these two fields into one:
    // https://github.com/firefox-devtools/profiler/issues/2543
    isJS;
Array < boolean > ,
    relevantForJS;
Array < boolean > ,
    // The resource describes "Which bag of code did this function come from?".
    // For JS functions, the resource is of type addon, webhost, otherhost, or url.
    // For native functions, the resource is of type library.
    // For labels and for other unidentified functions, we set the resource to -1.
    resource;
Array < IndexIntoResourceTable | -1 > ,
    // These are non-null for JS functions only. The line and column describe the
    // location of the *start* of the JS function. As for the information about which
    // which lines / columns inside the function were actually hit during execution,
    // that information is stored in the frameTable, not in the funcTable.
    fileName;
Array < IndexIntoStringTable | null > ,
    lineNumber;
Array < number | null > ,
    columnNumber;
Array < number | null > ,
    // This is relevant for functions of the 'native' stackType only (functions
    // whose resource is a library).
    // Stores the library-relative offset of the start of the function, i.e. the
    // address of the symbol that gave this function its name.
    // Prior to initial symbolication, it stores the same address as the single
    // frame that refers to this func, because at that point the actual boundaries
    // of the true functions are not known.
    address;
Array < Address | -1 > ,
    length;
number,
;
;
number,
    // lib SHOULD be void in this case, but some profiles in the store have null or -1
    // here. We should investigate and provide an upgrader.
    // See https://github.com/firefox-devtools/profiler/issues/652
    lib;
Array < IndexIntoLibs | void  | null | -1 > ,
    name;
Array < IndexIntoStringTable | -1 > ,
    host;
Array < IndexIntoStringTable | void  | null > ,
    type;
resourceTypeEnum[],
;
;
MemoryOffset,
    end;
MemoryOffset,
    // The offset relative to the library's base address where the first mapping starts.
    // libBaseAddress + lib.offset = lib.start
    // When instruction addresses are given as library-relative offsets, they are
    // relative to the library's baseAddress.
    offset;
Bytes,
    arch;
string, // e.g. "x86_64"
    name;
string, // e.g. "firefox"
    path;
string, // e.g. "/Applications/FirefoxNightly.app/Contents/MacOS/firefox"
    debugName;
string, // e.g. "firefox", or "firefox.pdb" on Windows
    debugPath;
string, // e.g. "/Applications/FirefoxNightly.app/Contents/MacOS/firefox"
    breakpadId;
string,
; // e.g. "E54D3AF274383256B9F6144F83F3F7510"
;
string,
    color;
string,
    subcategories;
string[],
;
;
BrowsingContextID,
    innerWindowID;
InnerWindowID,
    url;
string,
    // 0 means no embedder
    embedderInnerWindowID;
number,
;
;
Milliseconds | null,
    // null if the profiler was still paused when the profile was captured
    endTime;
Milliseconds | null,
    reason;
'profiler-paused' | 'collecting',
;
;
Array < IndexIntoStringTable > ,
    timestamps;
Array < Microseconds > ,
    durations;
Array < Microseconds | null > ,
    line;
Array < number | null > , // Line number.
    column;
Array < number | null > , // Column number.
    length;
number,
;
;
Milliseconds[],
    // The number of times the Counter's "number" was changed since the previous sample.
    number;
number[],
    // The count of the data, for instance for memory this would be bytes.
    count;
number[],
    length;
number,
;
;
string,
    category;
string,
    description;
string,
    pid;
Pid,
    mainThreadIndex;
ThreadIndex,
    sampleGroups;
$ReadOnlyArray < {} |
    id;
number,
    samples;
CounterSamplesTable,
;
 > ,
;
;
Microseconds,
    maxCounter;
Microseconds,
    maxInterval;
Microseconds,
    maxLockings;
Microseconds,
    maxOverhead;
Microseconds,
    maxThread;
Microseconds,
    meanCleaning;
Microseconds,
    meanCounter;
Microseconds,
    meanInterval;
Microseconds,
    meanLockings;
Microseconds,
    meanOverhead;
Microseconds,
    meanThread;
Microseconds,
    minCleaning;
Microseconds,
    minCounter;
Microseconds,
    minInterval;
Microseconds,
    minLockings;
Microseconds,
    minOverhead;
Microseconds,
    minThread;
Microseconds,
    overheadDurations;
Microseconds,
    overheadPercentage;
Microseconds,
    profiledDuration;
Microseconds,
    samplingCount;
Microseconds,
;
;
string[],
    features;
string[],
    capacity;
Bytes,
    duration ?  : number,
    // Optional because that field is introduced in Firefox 72.
    // Active BrowsingContext ID indicates a Firefox tab. That field allows us to
    // create an "active tab view".
    activeBrowsingContextID ?  : BrowsingContextID,
;
;
Array < Microseconds > ,
    expiredMarkerCleaning;
Array < Microseconds > ,
    locking;
Array < Microseconds > ,
    threads;
Array < Microseconds > ,
    time;
Array < Milliseconds > ,
    length;
number,
;
;
ProfilerOverheadSamplesTable,
    // There is no statistics object if there is no sample.
    statistics ?  : ProfilerOverheadStats,
    pid;
Pid,
    mainThreadIndex;
ThreadIndex,
;
;
    | 'default'
    | 'plugin'
    | 'tab'
    | 'ipdlunittest'
    | 'geckomediaplugin'
    | 'gpu'
    | 'pdfium'
    | 'vr'
    // Unknown process type:
    // https://searchfox.org/mozilla-central/rev/819cd31a93fd50b7167979607371878c4d6f18e8/toolkit/xre/nsEmbedFunctions.cpp#232
    | 'invalid'
    | string,
    processStartupTime;
Milliseconds,
    processShutdownTime;
Milliseconds | null,
    registerTime;
Milliseconds,
    unregisterTime;
Milliseconds | null,
    pausedRanges;
PausedRange[],
    name;
string,
    processName ?  : string,
    isJsTracer ?  : boolean,
    pid;
Pid,
    tid;
Tid | void ,
    samples;
SamplesTable,
    jsAllocations ?  : JsAllocationsTable,
    nativeAllocations ?  : NativeAllocationsTable,
    markers;
RawMarkerTable,
    stackTable;
StackTable,
    frameTable;
FrameTable,
    // Strings for profiles are collected into a single table, and are referred to by
    // their index by other tables.
    stringTable;
UniqueStringArray,
    libs;
Lib[],
    funcTable;
FuncTable,
    resourceTable;
ResourceTable,
    jsTracer ?  : JsTracerTable,
;
;
string[],
    id;
string[],
    name;
string[],
    length;
number,
;
;
number,
    // The time in milliseconds which the sample was taken.
    timestamp;
Milliseconds,
;
;
number,
    ContentfulSpeedIndexProgress;
ProgressGraphData[],
    // PerceptualSpeedIndex and PerceptualSpeedIndexProgress generated here
    // https://github.com/mozilla/browsertime/blob/f453e93152003c7befb9a062feab86e25a4e9550/vendor/visualmetrics.py#L1319
    PerceptualSpeedIndex;
number,
    PerceptualSpeedIndexProgress;
ProgressGraphData[],
    // FirstVisualChange, LastVisualChange, SpeedIndex generated here
    // https://github.com/mozilla/browsertime/blob/f453e93152003c7befb9a062feab86e25a4e9550/vendor/visualmetrics.py#L1310
    FirstVisualChange;
number,
    LastVisualChange;
number,
    SpeedIndex;
number,
    // VisualProgress generated here
    // https://github.com/mozilla/browsertime/blob/master/vendor/visualmetrics.py#L1390
    VisualProgress;
ProgressGraphData[],
    // VisualReadiness generated here
    // https://github.com/mozilla/browsertime/blob/master/lib/video/postprocessing/visualmetrics/extraMetrics.js#L5
    VisualReadiness;
number,
    // VisualComplete85, VisualComplete95, VisualComplete99 generated here
    // https://github.com/mozilla/browsertime/blob/master/lib/video/postprocessing/visualmetrics/extraMetrics.js#L10
    VisualComplete85;
number,
    VisualComplete95;
number,
    VisualComplete99;
number,
;
;
Milliseconds,
    // The number of milliseconds since midnight January 1, 1970 GMT.
    startTime;
Milliseconds,
    // The process type where the Gecko profiler was started. This is the raw enum
    // numeric value as defined here:
    // https://searchfox.org/mozilla-central/rev/819cd31a93fd50b7167979607371878c4d6f18e8/xpcom/build/nsXULAppAPI.h#365
    processType;
number,
    // The extensions property landed in Firefox 60, and is only optional because older
    // processed profile versions may not have it. No upgrader was written for this change.
    extensions ?  : ExtensionTable,
    // The list of categories as provided by the platform.
    categories;
CategoryList,
    // The name of the product, most likely "Firefox".
    product;
'Firefox' | string,
    // This value represents a boolean, but for some reason is written out as an int value.
    // It's 0 for the stack walking feature being turned off, and 1 for stackwalking being
    // turned on.
    stackwalk;
0 | 1,
    // A boolean flag indicating whether the profiled application is using a debug build.
    // It's false for opt builds, and true for debug builds.
    // This property is optional because older processed profiles don't have this but
    // this property was added to Firefox a long time ago. It should work on older Firefox
    // versions without any problem.
    debug ?  : boolean,
    // This is the Gecko profile format version (the unprocessed version received directly
    // from the browser.)
    version;
number,
    // This is the processed profile format version.
    preprocessedProfileVersion;
number,
    // The following fields are most likely included in Gecko profiles, but are marked
    // optional for imported or converted profiles.
    // The XPCOM ABI (Application Binary Interface) name, taking the form:
    // {CPU_ARCH}-{TARGET_COMPILER_ABI} e.g. "x86_64-gcc3"
    // See https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/XPCOM_ABI
    abi ?  : string,
    // The "misc" value of the browser's user agent, typically the revision of the browser.
    // e.g. "rv:63.0", which would be Firefox 63.0
    // See https://searchfox.org/mozilla-central/rev/819cd31a93fd50b7167979607371878c4d6f18e8/netwerk/protocol/http/nsHttpHandler.h#543
    misc ?  : string,
    // The OS and CPU. e.g. "Intel Mac OS X"
    oscpu ?  : string,
    // The current platform, as taken from the user agent string.
    // See https://searchfox.org/mozilla-central/rev/819cd31a93fd50b7167979607371878c4d6f18e8/netwerk/protocol/http/nsHttpHandler.cpp#992
    platform ?  :
            | 'Android' // It usually has the version embedded in the string
            | 'Windows'
            | 'Macintosh'
            // X11 is used for historic reasons, but this value means that it is a Unix platform.
            | 'X11'
            | string,
    // The widget toolkit used for GUI rendering.
    // Older versions of Firefox for Linux had the 2 flavors gtk2/gtk3, and so
    // we could find the value "gtk3".
    toolkit ?  : 'gtk' | 'gtk3' | 'windows' | 'cocoa' | 'android' | string,
    // The appBuildID, sourceURL, physicalCPUs and logicalCPUs properties landed
    // in Firefox 62, and are optional because older processed profile
    // versions may not have them. No upgrader was written for this change.
    // The build ID/date of the application.
    appBuildID ?  : string,
    // The URL to the source revision for this build of the application.
    sourceURL ?  : string,
    // The physical number of CPU cores for the machine.
    physicalCPUs ?  : number,
    // The amount of logically available CPU cores for the program.
    logicalCPUs ?  : number,
    // A boolean flag indicating whether we symbolicated this profile. If this is
    // false we'll start a symbolication process when the profile is loaded.
    // A missing property means that it's an older profile, it stands for an
    // "unknown" state.  For now we don't do much with it but we may want to
    // propose a manual symbolication in the future.
    symbolicated ?  : boolean,
    // The Update channel for this build of the application.
    // This property is landed in Firefox 67, and is optional because older
    // processed profile versions may not have them. No upgrader was necessary.
    updateChannel ?  :
            | 'default' // Local builds
            | 'nightly'
            | 'nightly-try' // Nightly try builds for QA
            | 'aurora' // Developer Edition channel
            | 'beta'
            | 'release'
            | 'esr' // Extended Support Release channel
            | string,
    // Visual metrics contains additional performance metrics such as Speed Index,
    // Perceptual Speed Index, and ContentfulSpeedIndex. This is optional because only
    // profiles generated by browsertime will have this property. Source code for
    // browsertime can be found at https://github.com/mozilla/browsertime.
    visualMetrics ?  : VisualMetrics,
    // The configuration of the profiler at the time of recording. Optional since older
    // versions of Firefox did not include it.
    configuration ?  : ProfilerConfiguration,
    // Markers are displayed in the UI according to a schema definition. See the
    // MarkerSchema type for more information.
    markerSchema;
MarkerSchema[],
;
;
ProfileMeta,
    pages ?  : PageList,
    // The counters list is optional only because old profilers may not have them.
    // An upgrader could be written to make this non-optional.
    counters ?  : Counter[],
    // The profilerOverhead list is optional only because old profilers may not
    // have them. An upgrader could be written to make this non-optional.
    // This is list because there is a profiler overhead per process.
    profilerOverhead ?  : ProfilerOverhead[],
    threads;
Thread[],
;
;
$Diff < Thread, { stringTable: UniqueStringArray } > ,
    stringArray;
string[],
;
;
Profile,
    threads;
SerializableThread[],
;
;
