/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import type { Milliseconds, MemoryOffset } from './units';
import type { UniqueStringArray } from '../utils/unique-string-array';
import type { MarkerPayload } from './markers';
export type IndexIntoStackTable = number;
export type IndexIntoSamplesTable = number;
export type IndexIntoMarkersTable = number;
export type IndexIntoFrameTable = number;
export type IndexIntoStringTable = number;
export type IndexIntoFuncTable = number;
export type IndexIntoResourceTable = number;
export type IndexIntoLibs = number;
export type IndexIntoCategoryList = number;
export type resourceTypeEnum = number;
export type ThreadIndex = number;

/**
 * If a pid is a number, then it is the int value that came from the profiler.
 * However, if it is a string, then it is an unique value generated during
 * the profile processing. This happens for older profiles before the pid was
 * collected.
 */
export type Pid = number | string;

/**
 * The stack table stores the tree of stack nodes of a thread.
 * The shape of the tree is encoded in the prefix column: Root stack nodes have
 * null as their prefix, and every non-root stack has the stack index of its
 * "caller" / "parent" as its prefix.
 * Every stack node also has a frame and a category.
 * A "call stack" is a list of frames. Every stack index in the stack table
 * represents such a call stack; the "list of frames" is obtained by walking
 * the path in the tree from the root to the given stack node.
 *
 * Stacks are used in the thread's samples; each sample refers to a stack index.
 * Stacks can be shared between samples.
 *
 * With this representation, every sample only needs to store a single integer
 * to identify the sample's stack.
 * We take advantage of the fact that many call stacks in the profile have a
 * shared prefix; storing these stacks as a tree saves a lot of space compared
 * to storing them as actual lists of frames.
 *
 * The category of a stack node is always non-null and is derived from a stack's
 * frame and its prefix. Frames can have null categories, stacks cannot. If a
 * stack's frame has a null category, the stack inherits the category of its
 * prefix stack. Root stacks whose frame has a null stack have their category
 * set to the "default category". (The default category is currently defined as
 * the category in the profile's category list whose color is "grey", and such
 * a category is required to be present.)
 *
 * You could argue that the stack table's category column is derived data and as
 * such doesn't need to be stored in the profile itself. This is true, but
 * storing this information in the stack table makes it a lot easier to carry
 * it through various transforms that we apply to threads.
 * For example, here's a case where a stack's category is not recoverable from
 * any other information in the transformed thread:
 * In the call path
 *   someJSFunction [JS] -> Node.insertBefore [DOM] -> nsAttrAndChildArray::InsertChildAt,
 * the stack node for nsAttrAndChildArray::InsertChildAt should inherit the
 * category DOM from its "Node.insertBefore" prefix stack. And it should keep
 * the DOM category even if you apply the "Merge node into calling function"
 * transform to Node.insertBefore. This transform removes the stack node
 * "Node.insertBefore" from the stackTable, so the information about the DOM
 * category would be lost if it wasn't inherited into the
 * nsAttrAndChildArray::InsertChildAt stack before transforms are applied.
 */
export type StackTable = {
  frame: IndexIntoFrameTable[],
  category: IndexIntoCategoryList[],
  prefix: Array<IndexIntoStackTable | null>,
  length: number,
};

/**
 * The Gecko Profiler records samples of what function was currently being executed, and
 * the callstack that is associated with it. This is done at a fixed but configurable
 * rate, e.g. every 1 millisecond. This table represents the minimal amount of
 * information that is needed to represent that sampled function. Most of the entries
 * are indices into other tables.
 */
export type SamplesTable = {
  responsiveness: number[],
  stack: Array<IndexIntoStackTable | null>,
  time: number[],
  rss: any[], // TODO
  uss: any[], // TODO
  length: number,
};

/**
 * This is the base abstract class that marker payloads inherit from. This probably isn't
 * used directly in perf.html, but is provided here for mainly documentation purposes.
 */
export type ProfilerMarkerPayload = {
  type: string,
  startTime?: Milliseconds,
  endTime?: Milliseconds,
  stack?: Thread,
};

/**
 * Markers represent arbitrary events that happen within the browser. They have a
 * name, timing information, and potentially a JSON data payload. These can come from all
 * over the system. For instance Paint markers instrument the rendering and layout
 * process. Engineers can easily add arbitrary markers to their code without coordinating
 * with perf.html to instrument their code.
 */
export type MarkersTableByType<Payload> = {|
  time: Milliseconds[],
  duration: Array<Milliseconds | null>,
  type: IndexIntoStringTable[],
  name: IndexIntoStringTable[],
  title: IndexIntoStringTable[],
  data: Payload[],
  length: number,
|};

export type MarkersTable = MarkersTableByType<MarkerPayload>;

/**
 * Frames contain the context information about the function execution at the moment in
 * time. The relationship between frames is defined by the StackTable.
 */
export type FrameTable = {
  address: IndexIntoStringTable[],
  category: (IndexIntoCategoryList | null)[],
  func: IndexIntoFuncTable[],
  implementation: (IndexIntoStringTable | null)[],
  line: (number | null)[],
  column: (number | null)[],
  optimizations: ({} | null)[],
  length: number,
};

/**
 * Multiple frames represent individual invocations of a function, while the FuncTable
 * holds the static information about that function. C++ samples are single memory
 * locations. However, functions span ranges of memory. During symbolication each of
 * these samples are collapsed to point to a single function rather than multiple memory
 * locations.
 */
export type FuncTable = {
  address: MemoryOffset[],
  isJS: boolean[],
  length: number,
  name: IndexIntoStringTable[],
  resource: Array<IndexIntoResourceTable | -1>,
  fileName: Array<IndexIntoStringTable | null>,
  lineNumber: Array<number | null>,
};

/**
 * The ResourceTable holds additional information about functions. It tends to contain
 * sparse arrays. Multiple functions can point to the same resource.
 */
export type ResourceTable = {
  length: number,
  // lib SHOULD be void in this case, but some profiles in the store have null or -1
  // here. We should investigate and provide an upgrader.
  // See https://github.com/devtools-html/perf.html/issues/652
  lib: Array<IndexIntoLibs | void | null | -1>,
  name: Array<IndexIntoStringTable | -1>,
  host: Array<IndexIntoStringTable | void>,
  type: resourceTypeEnum[],
};

/**
 * Information about libraries, for instance the Firefox executables, and its memory
 * offsets. This information is used for symbolicating C++ memory addresses into
 * actual function names. For instance turning 0x23459234 into "void myFuncName()".
 */
export type Lib = {
  start: MemoryOffset,
  end: MemoryOffset,
  offset: MemoryOffset,
  arch: string, // e.g. "x86_64"
  name: string, // e.g. "firefox"
  path: string, // e.g. "/Applications/FirefoxNightly.app/Contents/MacOS/firefox"
  debugName: string, // e.g. "firefox"
  debugPath: string, // e.g. "/Applications/FirefoxNightly.app/Contents/MacOS/firefox"
  breakpadId: string, // e.g. "E54D3AF274383256B9F6144F83F3F7510"
};

export type Category = {
  name: string,
  color: string,
};

export type CategoryList = Array<Category>;

/**
 * Information about a period of time during which no samples were collected.
 */
export type PausedRange = {
  // null if the profiler was already paused at the beginning of the period of
  // time that was present in the profile buffer
  startTime: Milliseconds | null,
  // null if the profiler was still paused when the profile was captured
  endTime: Milliseconds | null,
  reason: 'profiler-paused' | 'collecting',
};

/**
 * Gecko has one or more processes. There can be multiple threads per processes. Each
 * thread has a unique set of tables for its data.
 */
export type Thread = {
  processType: string,
  processStartupTime: Milliseconds,
  processShutdownTime: Milliseconds | null,
  registerTime: Milliseconds,
  unregisterTime: Milliseconds | null,
  pausedRanges: PausedRange[],
  name: string,
  // An undefined pid is a valid value. An undefined value will key
  // properly on Map<pid, T>.
  pid: Pid,
  tid: number | void,
  samples: SamplesTable,
  markers: MarkersTable,
  stackTable: StackTable,
  frameTable: FrameTable,
  // Strings for profiles are collected into a single table, and are referred to by
  // their index by other tables.
  stringTable: UniqueStringArray,
  libs: Lib[],
  funcTable: FuncTable,
  resourceTable: ResourceTable,
};

export type ExtensionTable = {|
  baseURL: string[],
  id: string[],
  name: string[],
  length: number,
|};

/**
 * Meta information associated for the entire profile.
 */
export type ProfileMeta = {|
  interval: number,
  startTime: Milliseconds,
  abi: string,
  misc: string,
  oscpu: string,
  platform: string,
  processType: number, // TODO find the possible values
  // The extensions property landed in Firefox 60, and is only optional because older
  // processed profile versions may not have it. No upgrader was written for this change.
  extensions?: ExtensionTable,
  categories: CategoryList,
  product: string,
  stackwalk: number,
  toolkit: string,
  version: number,
  preprocessedProfileVersion: number,
  // The appBuildID, sourceURL, physicalCPUs and logicalCPUs properties landed
  // in Firefox 62, and are only optional because older processed profile
  // versions may not have them. No upgrader was written for this change.
  appBuildID?: string,
  sourceURL?: string,
  physicalCPUs?: number,
  logicalCPUs?: number,
  networkURLsRemoved?: boolean,
|};

/**
 * All of the data for a processed profile.
 */
export type Profile = {
  meta: ProfileMeta,
  threads: Thread[],
};
