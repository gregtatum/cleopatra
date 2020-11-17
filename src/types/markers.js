"use strict";
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
exports.__esModule = true;
string, // e.g. "CC"
    // The label of how this marker should be displayed in the UI.
    // If none is provided, then the name is used.
    tooltipLabel ?  : string, // e.g. "Cycle Collect"
    // This is how the marker shows up in the Marker Table description.
    // If none is provided, then the name is used.
    tableLabel ?  : string, // e.g. "{marker.data.eventType} – DOMEvent"
    // This is how the marker shows up in the Marker Chart, where it is drawn
    // on the screen as a bar.
    // If none is provided, then the name is used.
    chartLabel ?  : string,
    // The locations to display
    display;
MarkerDisplayLocation[],
    data;
Array <
    | {} |
    key;
string,
    // If no label is provided, the key is displayed.
    label ?  : string,
    format;
MarkerFormatType,
    searchable ?  : boolean,
;
    | {} |
    // This type is a static bit of text that will be displayed
    label;
string,
    value;
string,
;
    > ,
;
;
Tid,
    time;
Milliseconds,
    stack;
IndexIntoStackTable,
;
;
Milliseconds,
    sendStartTime ?  : Milliseconds,
    sendEndTime ?  : Milliseconds,
    recvEndTime ?  : Milliseconds,
    endTime ?  : Milliseconds,
    sendTid ?  : number,
    recvTid ?  : number,
    sendThreadName ?  : string,
    recvThreadName ?  : string,
;
;
$Diff <
    T,
    // Remove the cause property.
    {} | cause;
any;
    > ,
    // Add on the stack property:
    stack ?  : GeckoMarkerStack,
;
;
'gpu_timer_query',
    cpustart;
Milliseconds,
    cpuend;
Milliseconds,
    gpustart;
Milliseconds, // Always 0.
    gpuend;
Milliseconds,
; // The time the GPU took to execute the command.
;
'tracing',
    category;
'Paint',
    cause ?  : CauseBacktrace,
    interval;
'start' | 'end',
;
;
+type;
'tracing',
    +category;
string,
;
;
'tracing',
    category;
'CC',
    interval;
'start' | 'end',
;
;
number,
    pause;
Milliseconds,
    // The reason for this slice.
    reason;
string,
    // The GC state at the start and end of this slice.
    initial_state;
string,
    final_state;
string,
    // The incremental GC budget for this slice (see pause above).
    budget;
string,
    // The number of the GCMajor that this slice belongs to.
    major_gc_number;
number,
    // These are present if the collection was triggered by exceeding some
    // threshold.  The reason field says how they should be interpreted.
    trigger_amount ?  : number,
    trigger_threshold ?  : number,
    // The number of page faults that occured during the slice.  If missing
    // there were 0 page faults.
    page_faults ?  : number,
    start_timestamp;
Seconds,
;
;
GCSliceData_Shared,
    times;
PhaseTimes < Milliseconds > ,
;
;
GCSliceData_Shared,
    phase_times;
PhaseTimes < Microseconds > ,
;
;
'aborted',
;
;
'completed',
    max_pause;
Milliseconds,
    // The sum of all the slice durations
    total_time;
Milliseconds,
    // The reason from the first slice. see JS::gcreason::Reason
    reason;
string,
    // Counts.
    zones_collected;
number,
    total_zones;
number,
    total_compartments;
number,
    minor_gcs;
number,
    // Present when non-zero.
    store_buffer_overflows ?  : number,
    slices;
number,
    // Timing for the SCC sweep phase.
    scc_sweep_total;
Milliseconds,
    scc_sweep_max_pause;
Milliseconds,
    // The reason why this GC ran non-incrementally. Older profiles could have the string
    // 'None' as a reason.
    nonincremental_reason ?  : 'None' | string,
    // The allocated space for the whole heap before the GC started.
    allocated_bytes;
number,
    post_heap_size ?  : number,
    // Only present if non-zero.
    added_chunks ?  : number,
    removed_chunks ?  : number,
    // The number for the start of this GC event.
    major_gc_number;
number,
    minor_gc_number;
number,
    // Slice number isn't in older profiles.
    slice_number ?  : number,
    // This usually isn't present with the gecko profiler, but it's the same
    // as all of the slice markers themselves.
    slices_list ?  : GCSliceData[],
;
;
GCMajorCompleted_Shared,
    // MMU (Minimum mutator utilisation) A measure of GC's affect on
    // responsiveness  See Statistics::computeMMU(), these percentages in the
    // rage of 0-100.
    // Percentage of time the mutator ran in a 20ms window.
    mmu_20ms;
number,
    // Percentage of time the mutator ran in a 50ms window.
    mmu_50ms;
number,
    // The duration of each phase.
    phase_times;
PhaseTimes < Microseconds > ,
;
;
GCMajorCompleted_Shared,
    // As above except in parts of 100.
    mmu_20ms;
number,
    mmu_50ms;
number,
    totals;
PhaseTimes < Milliseconds > ,
;
;
'GCMajor',
    timings;
GCMajorAborted | GCMajorCompleted,
;
;
'GCMajor',
    timings;
GCMajorAborted | GCMajorCompleted_Gecko,
;
;
'complete',
    // The reason for initiating the GC.
    reason;
string,
    // The size of the data moved into the tenured heap.
    bytes_tenured;
number,
    // The number of cells tenured (since
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1473213)
    cells_tenured ?  : number,
    // The numbers of cells allocated since the previous minor GC.
    // These were added in
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1473213 and are only
    // present in Nightly builds.
    cells_allocated_nursery ?  : number,
    cells_allocated_tenured ?  : number,
    // The total amount of data that was allocated in the nursery.
    bytes_used;
number,
    // The total capacity of the nursery before and after this GC.
    // Capacity may change as the nursery size is tuned after each collection.
    // cur_capacity isn't in older profiles.
    cur_capacity ?  : number,
    // If the nursery is resized after this collection then this field is
    // present giving the new size.
    new_capacity ?  : number,
    // The nursery may be dynamically resized (since version 58)
    // this field is the lazy-allocated size.  It is not present in older
    // versions.
    // If the currently allocated size is different from the size
    // (cur_capacity) then this field is present and shows how much memory is
    // actually allocated.
    lazy_capacity ?  : number,
    chunk_alloc_us ?  : Microseconds,
    // Added in https://bugzilla.mozilla.org/show_bug.cgi?id=1507379
    groups_pretenured ?  : number,
    phase_times;
PhaseTimes < Microseconds > ,
;
;
'nursery disabled',
;
;
'nursery empty',
;
;
'GCMinor',
    // nursery is only present in newer profile format.
    nursery ?  : GCMinorCompletedData | GCMinorDisabledData | GCMinorEmptyData,
;
;
'GCSlice',
    timings;
GCSliceData,
;
;
'GCSlice',
    timings;
GCSliceData_Gecko,
;
;
'Network',
    URI;
string,
    RedirectURI ?  : string,
    id;
number,
    pri;
number, // priority of the load; always included as it can change
    count ?  : number, // Total size of transfer, if any
    status;
string,
    cache ?  : string,
    cause ?  : CauseBacktrace,
    // contentType is the value of the Content-Type header from the HTTP
    // response. An empty string means the response had no content type,
    // while a value of null means no HTTP response was received. If
    // this property is absent then it means this profiler came from an
    // older version of the Gecko profiler without content type support.
    contentType ?  : string | null,
    // NOTE: the following comments are valid for the merged markers. For the raw
    // markers, startTime and endTime have different meanings. Please look
    // `src/profile-logic/marker-data.js` for more information.
    // startTime is when the channel opens. This happens on the process' main
    // thread.
    startTime;
Milliseconds,
    // endTime is the time when the response is sent back to the caller, this
    // happens on the process' main thread.
    endTime;
Milliseconds,
    // fetchStart doesn't exist directly in raw markers. This is added in the
    // deriving process and represents the junction between START and END markers.
    // This is the same value as the start marker's endTime and the end marker's
    // startTime (which are the same values).
    // We don't expose it directly but this is useful for debugging.
    fetchStart ?  : Milliseconds,
    // The following properties are present only in non-START markers.
    // domainLookupStart, if present, should be the first timestamp for an event
    // happening on the socket thread. However it's not present for persisted
    // connections. This is also the case for `domainLookupEnd`, `connectStart`,
    // `tcpConnectEnd`, `secureConnectionStart`, and `connectEnd`.
    // NOTE: If you add a new property, don't forget to adjust its timestamp in
    // `adjustMarkerTimestamps` in `process-profile.js`.
    domainLookupStart ?  : Milliseconds,
    domainLookupEnd ?  : Milliseconds,
    connectStart ?  : Milliseconds,
    tcpConnectEnd ?  : Milliseconds,
    secureConnectionStart ?  : Milliseconds,
    connectEnd ?  : Milliseconds,
    // `requestStart`, `responseStart` and `responseEnd` should always be present
    // for STOP markers.
    requestStart ?  : Milliseconds,
    responseStart ?  : Milliseconds,
    // responseEnd is when we received the response from the server, this happens
    // on the socket thread.
    responseEnd ?  : Milliseconds,
;
;
'FileIO',
    cause ?  : CauseBacktrace,
    source;
string,
    operation;
string,
    filename;
string,
    // FileIO markers that are happening on the current thread don't have a threadId,
    // but they have threadId field if the markers belong to a different (potentially
    // non-profiled) thread.
    // This field is added on Firefox 78, but this is backwards compatible because
    // previous FileIO markers were also belonging to the threads they are in only.
    // We still don't serialize this field if the marker belongs to the thread they
    // are being captured.
    threadId ?  : number,
;
;
'UserTiming',
    name;
string,
    entryType;
'measure' | 'mark',
;
;
'Text',
    name;
string,
;
;
'CompleteTraceEvent',
    category;
string,
    data;
MixedObject | null,
;
;
'InstantTraceEvent',
    category;
string,
    data;
MixedObject | null,
;
;
'tracing',
    category;
'FromChrome',
    interval;
'start' | 'end',
    data;
MixedObject | null,
    cause ?  : CauseBacktrace,
;
;
'Log',
    name;
string,
    module;
string,
;
;
'DOMEvent',
    latency ?  : Milliseconds,
    eventType;
string,
    innerWindowID ?  : number,
;
;
'PreferenceRead',
    prefAccessTime;
Milliseconds,
    prefName;
string,
    prefKind;
string,
    prefType;
string,
    prefValue;
string,
;
;
'tracing',
    category;
'Navigation',
    interval;
'start' | 'end',
    eventType ?  : string,
    innerWindowID ?  : number,
;
;
'VsyncTimestamp',
;
;
'CompositorScreenshot',
    // This field represents the data url of the image. It is saved in the string table.
    url;
IndexIntoStringTable,
    // A memory address that can uniquely identify a window. It has no meaning other than
    // a way to identify a window.
    windowID;
string,
    // The original dimensions of the window that was captured. The actual image that is
    // stored in the string table will be scaled down from the original size.
    windowWidth;
number,
    windowHeight;
number,
;
;
'Styles',
    category;
'Paint',
    cause ?  : CauseBacktrace,
    // Counts
    elementsTraversed;
number,
    elementsStyled;
number,
    elementsMatched;
number,
    stylesShared;
number,
    stylesReused;
number,
;
;
'BHR-detected hang',
;
;
'MainThreadLongTask',
    category;
'LongTask',
;
;
'DummyForTests',
;
;
'JS allocation',
    className;
string,
    typeName;
string, // Currently only 'JSObject'
    coarseType;
string, // Currently only 'Object',
    size;
Bytes,
    inNursery;
boolean,
    stack;
GeckoMarkerStack,
;
;
'Native allocation',
    size;
Bytes,
    stack;
GeckoMarkerStack,
    // Older versions of the Gecko format did not have these values.
    memoryAddress ?  : number,
    threadId ?  : number,
;
;
'IPC',
    startTime;
Milliseconds,
    endTime;
Milliseconds,
    otherPid;
number,
    messageType;
string,
    messageSeqno;
number,
    side;
'parent' | 'child',
    direction;
'sending' | 'receiving',
    // Phase is not present in older profiles (in this case the phase is "endpoint").
    phase ?  : 'endpoint' | 'transferStart' | 'transferEnd',
    sync;
boolean,
;
;
IPCMarkerPayload_Gecko,
    // These fields are added in the deriving process from `IPCSharedData`, and
    // correspond to data from all the markers associated with a particular IPC
    // message.
    startTime ?  : Milliseconds,
    sendStartTime ?  : Milliseconds,
    sendEndTime ?  : Milliseconds,
    recvEndTime ?  : Milliseconds,
    endTime ?  : Milliseconds,
    sendTid ?  : number,
    recvTid ?  : number,
    sendThreadName ?  : string,
    recvThreadName ?  : string,
    // This field is a nicely formatted field for the direction.
    niceDirection;
string,
;
;
'MediaSample',
    sampleStartTimeUs;
Microseconds,
    sampleEndTimeUs;
Microseconds,
;
;
'Jank';
;
