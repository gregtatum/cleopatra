/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import { getEmptyProfile, getEmptyThread } from './profile-data';

import type { Milliseconds } from '../common/types/units';
import type {
  Profile, Thread, IndexIntoFrameTable, IndexIntoStackTable, IndexIntoStringTable,
  IndexIntoFuncTable, StackTable, SamplesTable, FuncTable, FrameTable,
} from '../common/types/profile';
import type { UniqueStringArray } from './unique-string-array';

type NodeIndex = number;

type CpuProfileNode = {
  callFrame: {
    columnNumber: number,
    functionName: string,
    lineNumber: number,
    scriptId: string,
    url: string,
  },
  children: NodeIndex[],
  hitCount: number,
  id: NodeIndex,
};

type CpuProfile = {
  startTime: number,
  endTime: number,
  nodes: CpuProfileNode[],
  samples: NodeIndex[],
  timeDeltas: number[],
}

type CommonEntryProperties = {
  // Process ID
  pid: number,
  // Thread ID
  tid: number,
  // Timestamp
  ts: number,
  ph: string,
};

type CpuProfileEntry = CommonEntryProperties & {
  cat: "disabled-by-default-devtools.timeline",
  name: "CpuProfile",
  args: {
    data: {
      cpuProfile: CpuProfile,
    },
  },
};

type NameEntry = CommonEntryProperties & {
  cat: "__metadata",
  name: "thread_name" | "process_name",
  args: {
    name: string,
  },
};

// Add any interpreted entries here.
type Entry = CpuProfileEntry | NameEntry;

type ChromeProfile = Array<Entry>;

/**
 * Flow has issues pulling out the Entry type here, so do a more permissive
 * Object type. Anything pulled from here must be cast to the correct type.
 */
type EntriesByName = {[name: string]: Array<Object>};
//
// fetch('./profile.json')
//   .then(profile => profile.json())
//   .then(attemptToUnserializeChromeProfileFormat)
//   .then(undefined, () => console.error.bind(console));

export function isChromeProfile(profile: any): boolean {
  if (!Array.isArray(profile)) {
    return false;
  }
  const entry = profile[0];
  if (typeof entry !== 'object') {
    return false;
  }
  // Just do a sanity check on the first entry before proceeding.
  return (
    'pid' in entry &&
    'tid' in entry &&
    'ts' in entry &&
    'ph' in entry &&
    typeof entry.pid === 'number' &&
    typeof entry.tid === 'number' &&
    typeof entry.ts === 'number' &&
    typeof entry.ph === 'string'
  );
}

export function convertChromeProfile(chromeProfile: ChromeProfile): Profile | null {
  const entriesByName = _computeEntriesByName(chromeProfile);

  if (!entriesByName.CpuProfile) {
    throw new Error(
      'Attempting to convert a Chrome profile and could not find a "CpuProfile" entry.'
    );
  }
  const cpuProfileEntries: CpuProfileEntry[] = entriesByName.CpuProfile;

  const processedProfile = getEmptyProfile();

  // TODO - The current interval is just a wild guess.
  processedProfile.meta.interval = 1;
  processedProfile.meta.product = 'Chrome';
  processedProfile.meta.startTime = _getLowestProfileStartTime(entriesByName);
  processedProfile.threads = cpuProfileEntries.map(entry => _processCpuProfile(entry, entriesByName));

  return processedProfile;
}

function _computeEntriesByName(chromeProfile: ChromeProfile): EntriesByName {
  const entriesByName = {};
  const names = {};
  for (const entry of chromeProfile) {
    names[entry.name] = null;
  }

  Object.keys(names).forEach(n => {
    entriesByName[n] = chromeProfile.filter(
      ({name}) => n === name
    );
  });

  return entriesByName;
}

function _getLowestProfileStartTime(entriesByName: EntriesByName): number {
  const entries: CpuProfileEntry[] = entriesByName.CpuProfile;
  let lowest = Infinity;
  for (let i = 0; i < entries.length; i++) {
    const { startTime } = entries[0].args.data.cpuProfile;
    if (startTime < lowest) {
      lowest = startTime;
    }
  }
  return lowest;
}

type NodeIdToFrameId = Map<NodeIndex, IndexIntoFrameTable>;
type NodeIdToNode = Map<NodeIndex, CpuProfileNode>;
type NodeIdToStackId = Map<NodeIndex, IndexIntoStackTable>;
type NodeIdToFuncId = Map<NodeIndex, IndexIntoFuncTable>;

function _processCpuProfile(
  entry: CpuProfileEntry,
  entriesByName: EntriesByName
): Thread {
  const cpuProfile: CpuProfile = entry.args.data.cpuProfile;
  const {startTime, timeDeltas, samples, nodes} = cpuProfile;

  // Provide maps to look up values during the conversion process.
  const nodeIdToFrameId: NodeIdToFrameId = new Map();
  const nodeIdToNode: NodeIdToNode = new Map();
  const nodeIdToStackId: NodeIdToStackId = new Map();
  const nodeIdToFuncId: NodeIdToFuncId = new Map();

  // Create the thread.
  const thread = getEmptyThread();
  thread.tid = entry.tid;
  thread.pid = entry.pid;
  thread.name = _convertThreadName(entriesByName, entry.tid);

  thread.funcTable = _convertFuncs(
    nodes,
    nodeIdToNode,
    thread.stringTable,
    nodeIdToFuncId
  );

  thread.frameTable = _convertFrames(
    nodes,
    nodeIdToFrameId,
    nodeIdToFuncId
  );

  thread.stackTable = _convertStacks(
    nodes,
    nodeIdToFrameId,
    nodeIdToStackId
  );

  thread.samples = _convertSamples(
    samples,
    nodeIdToNode,
    nodeIdToStackId,
    startTime,
    timeDeltas
  );

  return thread;
}

function _convertThreadName(
  entriesByName: EntriesByName,
  tid: number
): string {
  const entries: NameEntry[] = entriesByName.thread_name;
  const entry = entries
    ? (entries: NameEntry[]).find(row => row.tid === tid)
    : null;

  return entry ? entry.args.name : 'Unknown';
}

function _convertStacks(
  nodes: CpuProfileNode[],
  nodeIdToFrameId: NodeIdToFrameId,
  nodeIdToStackId: NodeIdToStackId
): StackTable {
  // Look up the prefix for each node. Chrome profile stacks go from root to leaf, while
  // the processed format stacks go from leaf to root.
  const nodeIdToPrefix: Map<NodeIndex, NodeIndex> = new Map();
  for (let i = 0; i < nodes.length; i++) {
    const parent = nodes[i];
    if (parent.children) {
      parent.children.forEach(childId => {
        nodeIdToPrefix.set(childId, parent.id);
      });
    }
  }

  // Manually create the stackTable here, in case the definition changes, flow
  // will hopefully throw an error, and the for loop below can be updates.
  const stackTable: StackTable = {
    length: 0,
    frame: [],
    prefix: [],
  };

  // Set all of the stackTable values.
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const frameIndex = nodeIdToFrameId.get(node.id);
    const prefix = nodeIdToPrefix.get(node.id);
    nodeIdToStackId.set(node.id, stackTable.length);
    if (frameIndex === undefined) {
      throw new Error('The frame index must be defined');
    }
    stackTable.length++;
    stackTable.prefix.push(prefix === undefined ? null : prefix);
    stackTable.frame.push(frameIndex);
  }
  return stackTable;
}

function _convertSamples(
  nodeIndices: NodeIndex[],
  nodeIdToNode: NodeIdToNode,
  nodeIdToStackId: NodeIdToStackId,
  startTime: number,
  timeDeltas: Milliseconds[]
): SamplesTable {
  // Manually create the SamplesTable here, in case the definition changes, flow
  // will hopefully throw an error, and the for loop below can be updates.
  const samples = {
    length: 0,
    time: [],
    stack: [],
    responsiveness: [],
    // I don't know what these are, so they aren't added in the for loop.
    rss: [],
    uss: [],
  };

  // Compute the timing information, as the chrome profile only has time deltas.
  let timeAccumulation = startTime;
  const times = timeDeltas.map(delta => {
    timeAccumulation += delta;
    return timeAccumulation;
  });

  // Set the samples values.
  for (let i = 0; i < nodeIndices.length; i++) {
    const node = nodeIdToNode.get(nodeIndices[i]);
    if (node === undefined) {
      throw new Error('node must be defined');
    }
    const stackIndex = nodeIdToStackId.get(node.id);
    if (stackIndex === undefined) {
      throw new Error('stackIndex must be defined');
    }
    samples.length++;
    samples.time.push(times[i]);
    samples.stack.push(stackIndex);
    samples.responsiveness.push(timeDeltas[i]);
  }

  return samples;
}

function _convertFuncs(
  nodes: CpuProfileNode[],
  nodeIdToNode: NodeIdToNode,
  stringTable: UniqueStringArray,
  nodeIdToFuncId: NodeIdToFuncId
): FuncTable {
  // Manually create the FuncTable here, in case the definition changes, flow
  // will hopefully throw an error, and the for loop below needs to be updated.
  const funcTable = {
    address: [],
    isJS: [],
    name: [],
    resource: [],
    fileName: [],
    lineNumber: [],
    length: 0,
  };

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    nodeIdToNode.set(node.id, node);

    // TODO - Make sure we are doing the right thing here.
    const funcNameIndex = stringTable.indexForString(node.callFrame.functionName || '(anonymous)');
    const lineNumber = node.callFrame.lineNumber;
    const fileNameIndex = node.callFrame.url
      ? stringTable.indexForString(node.callFrame.url)
      : null;

    const funcIndex = funcTable.length;
    funcTable.length++;
    funcTable.name.push(funcNameIndex);
    funcTable.resource.push(-1);
    funcTable.address.push(-1);
    funcTable.isJS.push(true);
    funcTable.lineNumber.push(lineNumber > -1 ? lineNumber: null);
    funcTable.fileName.push(fileNameIndex);
    nodeIdToFuncId.set(node.id, funcIndex);
  }
  return funcTable;
}

function _convertFrames(
  nodes: CpuProfileNode[],
  nodeIdToFrameId: NodeIdToFrameId,
  nodeIdToFuncId: NodeIdToFuncId
): FrameTable {
  // Manually create the stackTable here, in case the definition changes, flow
  // will hopefully throw an error, and the for loop below can be updates.
  const frameTable = {
    implementation: [],
    optimizations: [],
    line: [],
    category: [],
    func: [],
    address: [],
    length: 0,
  };

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const frameIndex = frameTable.length;
    const funcIndex = nodeIdToFuncId.get(node.id);
    if (funcIndex === undefined) {
      throw new Error('funcIndex cannot be undefined.');
    }
    nodeIdToFrameId.set(node.id, frameIndex);
    frameTable.length++;
    frameTable.implementation.push(null);
    frameTable.optimizations.push(null);
    frameTable.line.push(node.callFrame.lineNumber);
    // frameTable.column.push(node.callFrame.columnNumber)
    frameTable.category.push(null);
    frameTable.func.push(funcIndex);
    frameTable.address.push(-1);
  }

  return frameTable;
}

/* eslint-disable no-unused-vars */
function getProcessLabels(
  entriesByName: EntriesByName,
  pid: number
): string {
  const entries: NameEntry[] = entriesByName.process_labels;
  const entry = entries
    ? (entries: NameEntry[]).find(row => row.pid === pid)
    : null;

  return entry ? entry.args.name : 'Unknown';
}
/* eslint-enable no-unused-vars */
