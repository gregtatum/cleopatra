/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */



import { Milliseconds, MemoryOffset, Microseconds, Bytes, Nanoseconds } from "./units";
import { UniqueStringArray } from "../utils/unique-string-array";
import { MarkerPayload } from "./markers";
export type IndexIntoStackTable = number;
export type IndexIntoSamplesTable = number;
export type IndexIntoRawMarkerTable = number;
export type IndexIntoFrameTable = number;
export type IndexIntoStringTable = number;
export type IndexIntoFuncTable = number;
export type IndexIntoResourceTable = number;
export type IndexIntoLibs = number;
export type IndexIntoCategoryList = number;
export type IndexIntoSubcategoryListForCategory = number;
export type resourceTypeEnum = number;
export type ThreadIndex = number;
export type IndexIntoJsTracerEvents = number;
export type CounterIndex = number;
export type BrowsingContextID = number;
export type InnerWindowID = number;

/**
 * If a pid is a number, then it is the int value that came from the profiler.
 * However, if it is a string, then it is an unique value generated during
 * the profile processing. This happens for older profiles before the pid was
 * collected, or for merged profiles.
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
  frame: IndexIntoFrameTable[];
  category: IndexIntoCategoryList[];
  subcategory: IndexIntoSubcategoryListForCategory[];
  prefix: Array<IndexIntoStackTable | null>;
  length: number;
};

/**
 * The Gecko Profiler records samples of what function was currently being executed, and
 * the callstack that is associated with it. This is done at a fixed but configurable
 * rate, e.g. every 1 millisecond. This table represents the minimal amount of
 * information that is needed to represent that sampled function. Most of the entries
 * are indices into other tables.
 */
export type SamplesTable = {
  // Responsiveness is the older version of eventDelay. It injects events every 16ms.
  // This is optional because newer profiles don't have that field anymore.
  responsiveness?: Array<Milliseconds | null | undefined>;
  // Event delay is the newer version of responsiveness. It allow us to get a finer-grained
  // view of jank by inferring what would be the delay of a hypothetical input event at
  // any point in time. It requires a pre-processing to be able to visualize properly.
  // This is optional because older profiles didn't have that field.
  eventDelay?: Array<Milliseconds | null | undefined>;
  stack: Array<IndexIntoStackTable | null>;
  time: Milliseconds[];
  duration?: Milliseconds[];
  length: number;
};

/**
 * JS allocations are recorded as a marker payload, but in profile processing they
 * are moved to the Thread. This allows them to be part of the stack processing pipeline.
 */
export type JsAllocationsTable = {
  time: Milliseconds[];
  className: string[];
  typeName: string[]; // Currently only 'JSObject'
  coarseType: string[]; // Currently only 'Object',
  // "duration" is a bit odd of a name for this field, but it's "duck typing" the byte
  // size so that we can use a SamplesTable and JsAllocationsTable in the same call tree
  // computation functions.
  duration: Bytes[];
  inNursery: boolean[];
  stack: Array<IndexIntoStackTable | null>;
  length: number;
};

/**
 * This variant is the original version of the table, before the memory address
 * and threadId were added.
 */
export type UnbalancedNativeAllocationsTable = {
  time: Milliseconds[];
  // "duration" is a bit odd of a name for this field, but it's "duck typing" the byte
  // size so that we can use a SamplesTable and NativeAllocationsTable in the same call
  // tree computation functions.
  duration: Bytes[];
  stack: Array<IndexIntoStackTable | null>;
  length: number;
};

/**
 * The memory address and thread ID were added later.
 */
export type BalancedNativeAllocationsTable = UnbalancedNativeAllocationsTable & {
  memoryAddress: number[];
  threadId: number[];
};

/**
 * Native allocations are recorded as a marker payload, but in profile processing they
 * are moved to the Thread. This allows them to be part of the stack processing pipeline.
 * Currently they include native allocations and deallocations. However, both
 * of them are sampled independently, so they will be unbalanced if summed togther.
 */
export type NativeAllocationsTable = UnbalancedNativeAllocationsTable | BalancedNativeAllocationsTable;

/**
 * This is the base abstract class that marker payloads inherit from. This probably isn't
 * used directly in profiler.firefox.com, but is provided here for mainly documentation
 * purposes.
 */
export type ProfilerMarkerPayload = {
  type: string;
  startTime?: Milliseconds;
  endTime?: Milliseconds;
  stack?: Thread;
};

/**
 * Markers represent arbitrary events that happen within the browser. They have a
 * name, time, and potentially a JSON data payload. These can come from all over the
 * system. For instance Paint markers instrument the rendering and layout process.
 * Engineers can easily add arbitrary markers to their code without coordinating with
 * profiler.firefox.com to instrument their code.
 *
 * In the profile, these markers are raw and unprocessed. In the marker selectors, we
 * can run them through a processing pipeline to match up start and end markers to
 * create markers with durations, or even take a string-only marker and parse
 * it into a structured marker.
 */
export type RawMarkerTable = {
  data: MarkerPayload[];
  name: IndexIntoStringTable[];
  time: number[];
  category: IndexIntoCategoryList[];
  length: number;
};

/**
 * Frames contain the context information about the function execution at the moment in
 * time. The relationship between frames is defined by the StackTable.
 */
export type FrameTable = {
  // The address is a copy from the FuncTable entry.
  address: Array<MemoryOffset | -1>;
  category: (IndexIntoCategoryList | null)[];
  subcategory: (IndexIntoSubcategoryListForCategory | null)[];
  func: IndexIntoFuncTable[];
  // Inner window ID of JS frames. JS frames can be correlated to a Page through this value.
  // It's used to determine which JS frame belongs to which web page so we can display
  // that information and filter for single tab profiling.
  // `0` for non-JS frames and the JS frames that failed to get the ID. `0` means "null value"
  // because that's what Firefox platform DOM side assigns when it fails to get the ID or
  // something bad happens during that process. It's not `null` or `-1` because that information
  // is being stored as `uint64_t` there.
  innerWindowID: (InnerWindowID | null)[];
  implementation: (IndexIntoStringTable | null)[];
  line: (number | null)[];
  column: (number | null)[];
  optimizations: ({} | null)[];
  length: number;
};

/**
 * Multiple frames represent individual invocations of a function, while the FuncTable
 * holds the static information about that function. C++ samples are single memory
 * locations. However, functions span ranges of memory. During symbolication each of
 * these samples are collapsed to point to a single function rather than multiple memory
 * locations.
 */
export type FuncTable = {
  // This is relevant for native entries only.
  address: Array<MemoryOffset | -1>;
  isJS: boolean[];
  length: number;
  name: IndexIntoStringTable[];
  // The resource is -1 if we couldn't extract a function name as a native or JS
  // function. This is most often the case for frame labels.
  resource: Array<IndexIntoResourceTable | -1>;
  relevantForJS: Array<boolean>;
  fileName: Array<IndexIntoStringTable | null>;
  lineNumber: Array<number | null>;
  columnNumber: Array<number | null>;
};

/**
 * The ResourceTable holds additional information about functions. It tends to contain
 * sparse arrays. Multiple functions can point to the same resource.
 */
export type ResourceTable = {
  length: number;
  // lib SHOULD be void in this case, but some profiles in the store have null or -1
  // here. We should investigate and provide an upgrader.
  // See https://github.com/firefox-devtools/profiler/issues/652
  lib: Array<IndexIntoLibs | void | null | -1>;
  name: Array<IndexIntoStringTable | -1>;
  host: Array<IndexIntoStringTable | void | null>;
  type: resourceTypeEnum[];
};

/**
 * Information about libraries, for instance the Firefox executables, and its memory
 * offsets. This information is used for symbolicating C++ memory addresses into
 * actual function names. For instance turning 0x23459234 into "void myFuncName()".
 */
export type Lib = {
  start: MemoryOffset;
  end: MemoryOffset;
  offset: MemoryOffset;
  arch: string; // e.g. "x86_64"
  name: string; // e.g. "firefox"
  path: string; // e.g. "/Applications/FirefoxNightly.app/Contents/MacOS/firefox"
  debugName: string; // e.g. "firefox"
  debugPath: string; // e.g. "/Applications/FirefoxNightly.app/Contents/MacOS/firefox"
  breakpadId: string; // e.g. "E54D3AF274383256B9F6144F83F3F7510"
};

export type Category = {
  name: string;
  color: string;
  subcategories: string[];
};

export type CategoryList = Array<Category>;

/**
 * A Page describes the page the browser profiled. In Firefox, there exists
 * the idea of a Browsing Context, which a large collection of useful things
 * associated with a particular tab. However, the same Browsing Context can be
 * used to navigate over many pages and they are not unique for frames. The
 * Inner Window IDs represent JS `window` objects in each Document. And they are
 * unique for each frame. That's why it's enough to keep only inner Window IDs
 * inside marker payloads. 0 means null(no embedder) for Embedder Window ID.
 *
 * The unique value for a page is innerWindowID.
 */
export type Page = {
  browsingContextID: BrowsingContextID;
  innerWindowID: InnerWindowID;
  url: string;
  // 0 means no embedder
  embedderInnerWindowID: number;
};

export type PageList = Array<Page>;

/**
 * Information about a period of time during which no samples were collected.
 */
export type PausedRange = {
  // null if the profiler was already paused at the beginning of the period of
  // time that was present in the profile buffer
  startTime: Milliseconds | null;
  // null if the profiler was still paused when the profile was captured
  endTime: Milliseconds | null;
  reason: "profiler-paused" | "collecting";
};

export type JsTracerTable = {
  events: Array<IndexIntoStringTable>;
  timestamps: Array<Microseconds>;
  durations: Array<Microseconds | null>;
  line: Array<number | null>; // Line number.
  column: Array<number | null>; // Column number.
  length: number;
};

export type CounterSamplesTable = {
  time: Milliseconds[];
  // The number of times the Counter's "number" was changed since the previous sample.
  number: number[];
  // The count of the data, for instance for memory this would be bytes.
  count: number[];
  length: number;
};

export type Counter = {
  name: string;
  category: string;
  description: string;
  pid: Pid;
  mainThreadIndex: ThreadIndex;
  sampleGroups: ReadonlyArray<{
    id: number;
    samples: CounterSamplesTable;
  }>;
};

/**
 * The statistics about profiler overhead. It includes max/min/mean values of
 * individual and overall overhead timings.
 */
export type ProfilerOverheadStats = {
  maxCleaning: Nanoseconds;
  maxCounter: Nanoseconds;
  maxInterval: Nanoseconds;
  maxLockings: Nanoseconds;
  maxOverhead: Nanoseconds;
  maxThread: Nanoseconds;
  meanCleaning: Nanoseconds;
  meanCounter: Nanoseconds;
  meanInterval: Nanoseconds;
  meanLockings: Nanoseconds;
  meanOverhead: Nanoseconds;
  meanThread: Nanoseconds;
  minCleaning: Nanoseconds;
  minCounter: Nanoseconds;
  minInterval: Nanoseconds;
  minLockings: Nanoseconds;
  minOverhead: Nanoseconds;
  minThread: Nanoseconds;
  overheadDurations: Nanoseconds;
  overheadPercentage: Nanoseconds;
  profiledDuration: Nanoseconds;
  samplingCount: Nanoseconds;
};

/**
 * This object represents the configuration of the profiler when the profile was recorded.
 */
export type ProfilerConfiguration = {
  threads: string[];
  features: string[];
  capacity: Bytes;
  duration?: number;
  // Optional because that field is introduced in Firefox 72.
  // Active BrowsingContext ID indicates a Firefox tab. That field allows us to
  // create an "active tab view".
  activeBrowsingContextID?: BrowsingContextID;
};

/**
 * Gecko Profiler records profiler overhead samples of specific tasks that take time.
 * counters: Time spent during collecting counter samples.
 * expiredMarkerCleaning: Time spent during expired marker cleanup
 * lockings: Time spent during acquiring locks.
 * threads: Time spent during threads sampling and marker collection.
 */
export type ProfilerOverheadSamplesTable = {
  counters: Array<Nanoseconds>;
  expiredMarkerCleaning: Array<Nanoseconds>;
  locking: Array<Nanoseconds>;
  threads: Array<Nanoseconds>;
  time: Array<Milliseconds>;
  length: number;
};

/**
 * Information about profiler overhead. It includes overhead timings for
 * counters, expired marker cleanings, mutex locking and threads. Also it
 * includes statistics about those individual and overall overhead.
 */
export type ProfilerOverhead = {
  samples: ProfilerOverheadSamplesTable;
  // There is no statistics object if there is no sample.
  statistics?: ProfilerOverheadStats;
  pid: Pid;
  mainThreadIndex: ThreadIndex;
};

/**
 * Gecko has one or more processes. There can be multiple threads per processes. Each
 * thread has a unique set of tables for its data.
 */
export type Thread = {
  // This list of process types is defined here:
  // https://searchfox.org/mozilla-central/rev/819cd31a93fd50b7167979607371878c4d6f18e8/xpcom/build/nsXULAppAPI.h#383
  processType: "default" | "plugin" | "tab" | "ipdlunittest" | "geckomediaplugin" | "gpu" | "pdfium" | "vr" // Unknown process type:
  // https://searchfox.org/mozilla-central/rev/819cd31a93fd50b7167979607371878c4d6f18e8/toolkit/xre/nsEmbedFunctions.cpp#232
  | "invalid" | string;
  processStartupTime: Milliseconds;
  processShutdownTime: Milliseconds | null;
  registerTime: Milliseconds;
  unregisterTime: Milliseconds | null;
  pausedRanges: PausedRange[];
  name: string;
  processName?: string;
  isJsTracer?: boolean;
  pid: Pid;
  tid: number | void;
  samples: SamplesTable;
  jsAllocations?: JsAllocationsTable;
  nativeAllocations?: NativeAllocationsTable;
  markers: RawMarkerTable;
  stackTable: StackTable;
  frameTable: FrameTable;
  // Strings for profiles are collected into a single table, and are referred to by
  // their index by other tables.
  stringTable: UniqueStringArray;
  libs: Lib[];
  funcTable: FuncTable;
  resourceTable: ResourceTable;
  jsTracer?: JsTracerTable;
};

export type ExtensionTable = {
  baseURL: string[];
  id: string[];
  name: string[];
  length: number;
};

/**
 * Visual progress describes the visual progression during page load. A sample is generated
 * everytime the visual completeness of the webpage changes.
 */
export type ProgressGraphData = {
  // A percentage that describes the visual completeness of the webpage, ranging from 0% - 100%
  percent: number;
  // The time in milliseconds which the sample was taken.
  timestamp: Milliseconds;
};

/**
 * Visual metrics are performance metrics that measure above-the-fold webpage visual performance,
 * and more accurately describe how human end-users perceive the speed of webpage loading. These
 * metrics serves as additional metrics to the typical page-level metrics such as onLoad. Visual
 * metrics contains key metrics such as Speed Index, Perceptual Speed Index, and ContentfulSpeedIndex,
 * along with their visual progression. These properties find their way into the gecko profile through running
 * browsertime, which is a tool that lets you collect performance metrics of your website.
 * Browsertime provides the option of generating a gecko profile, which then embeds these visual metrics
 * into the geckoprofile. More information about browsertime can be found through https://github.com/mozilla/browsertime.
 */
export type VisualMetrics = {
  // ContentfulSpeedIndex and ContentfulSpeedIndexProgress generated here
  // https://github.com/mozilla/browsertime/blob/f453e93152003c7befb9a062feab86e25a4e9550/vendor/visualmetrics.py#L1330
  ContentfulSpeedIndex: number;
  ContentfulSpeedIndexProgress: ProgressGraphData[];
  // PerceptualSpeedIndex and PerceptualSpeedIndexProgress generated here
  // https://github.com/mozilla/browsertime/blob/f453e93152003c7befb9a062feab86e25a4e9550/vendor/visualmetrics.py#L1319
  PerceptualSpeedIndex: number;
  PerceptualSpeedIndexProgress: ProgressGraphData[];
  // FirstVisualChange, LastVisualChange, SpeedIndex generated here
  // https://github.com/mozilla/browsertime/blob/f453e93152003c7befb9a062feab86e25a4e9550/vendor/visualmetrics.py#L1310
  FirstVisualChange: number;
  LastVisualChange: number;
  SpeedIndex: number;
  // VisualProgress generated here
  // https://github.com/mozilla/browsertime/blob/master/vendor/visualmetrics.py#L1390
  VisualProgress: ProgressGraphData[];
  // VisualReadiness generated here
  // https://github.com/mozilla/browsertime/blob/master/lib/video/postprocessing/visualmetrics/extraMetrics.js#L5
  VisualReadiness: number;
  // VisualComplete85, VisualComplete95, VisualComplete99 generated here
  // https://github.com/mozilla/browsertime/blob/master/lib/video/postprocessing/visualmetrics/extraMetrics.js#L10
  VisualComplete85: number;
  VisualComplete95: number;
  VisualComplete99: number;
};

/**
 * Meta information associated for the entire profile.
 */
export type ProfileMeta = {
  // The interval at which the threads are sampled.
  interval: Milliseconds;
  // The number of milliseconds since midnight January 1, 1970 GMT.
  startTime: Milliseconds;
  // The process type where the Gecko profiler was started. This is the raw enum
  // numeric value as defined here:
  // https://searchfox.org/mozilla-central/rev/819cd31a93fd50b7167979607371878c4d6f18e8/xpcom/build/nsXULAppAPI.h#365
  processType: number;
  // The extensions property landed in Firefox 60, and is only optional because older
  // processed profile versions may not have it. No upgrader was written for this change.
  extensions?: ExtensionTable;
  // The list of categories as provided by the platform.
  categories: CategoryList;
  // The name of the product, most likely "Firefox".
  product: "Firefox" | string;
  // This value represents a boolean, but for some reason is written out as an int value.
  // It's 0 for the stack walking feature being turned off, and 1 for stackwalking being
  // turned on.
  stackwalk: 0 | 1;
  // A boolean flag indicating whether the profiled application is using a debug build.
  // It's false for opt builds, and true for debug builds.
  // This property is optional because older processed profiles don't have this but
  // this property was added to Firefox a long time ago. It should work on older Firefox
  // versions without any problem.
  debug?: boolean;
  // This is the Gecko profile format version (the unprocessed version received directly
  // from the browser.)
  version: number;
  // This is the processed profile format version.
  preprocessedProfileVersion: number;

  // The following fields are most likely included in Gecko profiles, but are marked
  // optional for imported or converted profiles.

  // The XPCOM ABI (Application Binary Interface) name, taking the form:
  // {CPU_ARCH}-{TARGET_COMPILER_ABI} e.g. "x86_64-gcc3"
  // See https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/XPCOM_ABI
  abi?: string;
  // The "misc" value of the browser's user agent, typically the revision of the browser.
  // e.g. "rv:63.0", which would be Firefox 63.0
  // See https://searchfox.org/mozilla-central/rev/819cd31a93fd50b7167979607371878c4d6f18e8/netwerk/protocol/http/nsHttpHandler.h#543
  misc?: string;
  // The OS and CPU. e.g. "Intel Mac OS X"
  oscpu?: string;
  // The current platform, as taken from the user agent string.
  // See https://searchfox.org/mozilla-central/rev/819cd31a93fd50b7167979607371878c4d6f18e8/netwerk/protocol/http/nsHttpHandler.cpp#992
  platform?: "Android" | "Windows" | "Macintosh" // X11 is used for historic reasons, but this value means that it is a Unix platform.
  | "X11" | string;
  // The widget toolkit used for GUI rendering.
  toolkit?: "gtk" | "windows" | "cocoa" | "android" | string;

  // The appBuildID, sourceURL, physicalCPUs and logicalCPUs properties landed
  // in Firefox 62, and are optional because older processed profile
  // versions may not have them. No upgrader was written for this change.

  // The build ID/date of the application.
  appBuildID?: string;
  // The URL to the source revision for this build of the application.
  sourceURL?: string;
  // The physical number of CPU cores for the machine.
  physicalCPUs?: number;
  // The amount of logically available CPU cores for the program.
  logicalCPUs?: number;
  // A boolean flag indicating whether we symbolicated this profile. If this is
  // false we'll start a symbolication process when the profile is loaded.
  // A missing property means that it's an older profile, it stands for an
  // "unknown" state.  For now we don't do much with it but we may want to
  // propose a manual symbolication in the future.
  symbolicated?: boolean;
  // The Update channel for this build of the application.
  // This property is landed in Firefox 67, and is optional because older
  // processed profile versions may not have them. No upgrader was necessary.
  updateChannel?: "default" // Local builds
  | "nightly" | "nightly-try" // Nightly try builds for QA
  | "aurora" // Developer Edition channel
  | "beta" | "release" | "esr" // Extended Support Release channel
  | string;
  // Visual metrics contains additional performance metrics such as Speed Index,
  // Perceptual Speed Index, and ContentfulSpeedIndex. This is optional because only
  // profiles generated by browsertime will have this property. Source code for
  // browsertime can be found at https://github.com/mozilla/browsertime.
  visualMetrics?: VisualMetrics;
  // The configuration of the profiler at the time of recording. Optional since older
  // versions of Firefox did not include it.
  configuration?: ProfilerConfiguration;
};

/**
 * All of the data for a processed profile.
 */
export type Profile = {
  meta: ProfileMeta;
  pages?: PageList;
  // The counters list is optional only because old profilers may not have them.
  // An upgrader could be written to make this non-optional.
  counters?: Counter[];
  // The profilerOverhead list is optional only because old profilers may not
  // have them. An upgrader could be written to make this non-optional.
  // This is list because there is a profiler overhead per process.
  profilerOverhead?: ProfilerOverhead[];
  threads: Thread[];
};