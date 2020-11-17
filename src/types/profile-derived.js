"use strict";
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
exports.__esModule = true;
Marker[],
    markerIndexToRawMarkerIndexes;
IndexedArray <
    MarkerIndex,
    IndexIntoRawMarkerTable[]
        > ,
;
;
Milliseconds,
    end;
Milliseconds | null,
    name;
string,
    category;
IndexIntoCategoryList,
    data;
MarkerPayload,
    incomplete ?  : boolean,
;
;
number[],
    // End time in milliseconds.
    end;
number[],
    index;
MarkerIndex[],
    label;
string[],
    name;
string,
    bucket;
string,
    length;
number,
;
;
+minCount;
number,
    +maxCount;
number,
    +countRange;
number,
    // This value holds the accumulation of all the previous counts in the Counter samples.
    // For a memory counter, this gives the relative offset of bytes in that range
    // selection. The array will share the indexes of the range filtered counter samples.
    +accumulatedCounts;
number[],
;
;
+type;
'process', +pid;
Pid, +mainThreadIndex;
ThreadIndex | null;
    | {} | +type;
'screenshots', +id;
string, +threadIndex;
ThreadIndex;
    | {} | +type;
'visual-progress';
    | {} | +type;
'perceptual-visual-progress';
    | {} | +type;
'contentful-visual-progress';
;
+type;
'thread', +threadIndex;
ThreadIndex;
    | {} | +type;
'network', +threadIndex;
ThreadIndex;
    | {} | +type;
'memory', +counterIndex;
CounterIndex;
    | {} | +type;
'ipc', +threadIndex;
ThreadIndex;
    | {} | +type;
'event-delay', +threadIndex;
ThreadIndex;
;
'sub-origin',
    innerWindowID;
InnerWindowID,
    threadIndex;
ThreadIndex,
    page;
Page,
    origin;
string,
;
;
'origin',
    innerWindowID;
InnerWindowID,
    threadIndex;
ThreadIndex,
    page;
Page,
    origin;
string,
    children;
Array < OriginsTimelineEntry | OriginsTimelineNoOrigin > ,
;
;
'no-origin',
    threadIndex;
ThreadIndex,
;
;
'tab',
    mainThreadIndex;
ThreadIndex,
    threadIndexes;
Set < ThreadIndex > ,
    threadsKey;
ThreadsKey,
;
;
+type;
'screenshots',
    +id;
string,
    +threadIndex;
ThreadIndex,
;
;
+type;
'sub-frame',
    +threadIndex;
ThreadIndex,
    +name;
string,
;
    | {} |
    +type;
'thread',
    +threadIndex;
ThreadIndex,
    +name;
string,
;
;
string,
    hostname;
string,
    favicon;
string,
;
;
+self;
Float32Array,
    +running;
Float32Array,
;
;
+eventDelays;
Float32Array,
    +minDelay;
Milliseconds,
    +maxDelay;
Milliseconds,
    +delayRange;
Milliseconds,
;
;
