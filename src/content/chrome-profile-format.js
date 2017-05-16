import { UniqueStringArray } from '../content/unique-string-array';

export function attemptToUnserializeChromeProfileFormat(profile) {
  if (!Array.isArray(profile)) {
    return undefined;
  }

  const profileByName = {};
  for (const row of profile) {
    if (typeof row !== 'object') {
      return undefined;
    }
    profileByName[row.name] = null;
  }

  Object.keys(profileByName).forEach(n => {
    profileByName[n] = profile.filter(({name}) => n === name);
  });

  if (!profileByName.CpuProfile) {
    return undefined;
  }
  return {
    meta: {
      // TODO - Interval is not verified.
      interval: 1,
      startTime: getLowestProfileStartTime(profileByName),
      platform: 'unknown',
      oscpu: 'unknown',
      misc: 'unknown',
      abi: 'unknown',
      toolkit: 'unknown',
      product: 'unknown',
    },
    threads: profileByName.CpuProfile.map(row => processCpuProfile(row, profileByName)),
  };
}

function getLowestProfileStartTime(profileByName) {
  const startTime = cpuProfile => cpuProfile.args.data.cpuProfile.startTime;
  const firstProfile = profileByName.CpuProfile.reduce((a, b) => Math.min(startTime(a), startTime(b)));
  return startTime(firstProfile);
}

function processCpuProfile(row, profileByName) {
  const {cpuProfile} = row.args.data;
  const {endTime, startTime, timeDeltas, samples, nodes} = cpuProfile;
  const thread = getBlankThread();
  thread.name = 'cpuProfile';
  thread.tid = row.tid;
  thread.name = getThreadName(profileByName, row.tid);
  const nodeIdToFrameId = {};
  const nodesById = {};
  const nodeIdToStackId = {};
  const stringTableIndexToNewFuncIndex = new Map();

  let timeAccumulation = startTime;
  const accumulatedTimeDeltas = timeDeltas.map(delta => {
    timeAccumulation += delta;
    return timeAccumulation;
  });

  nodes.forEach((node, i) => {
    nodesById[node.id] = node;
    cpuProfile;

    const funcNameIndex = thread.stringTable.indexForString(node.callFrame.functionName);
    let funcIndex = stringTableIndexToNewFuncIndex.get(funcNameIndex);
    if (funcIndex === undefined) {
      funcIndex = thread.funcTable.length;
      thread.funcTable.name.push(funcNameIndex);
      thread.funcTable.length++;
      thread.funcTable.resource.push(undefined);
      thread.funcTable.address.push(undefined);
      thread.funcTable.isJS.push(true);
    }

    const frameIndex = thread.frameTable.length;
    nodeIdToFrameId[node.id] = frameIndex;
    thread.frameTable.length++;
    thread.frameTable.implementation.push(undefined);
    thread.frameTable.optimizations.push(undefined);
    thread.frameTable.line.push(node.callFrame.lineNumber);
    // thread.frameTable.column.push(node.callFrame.columnNumber)
    thread.frameTable.category.push(undefined);
    thread.frameTable.func.push(funcIndex);
    thread.frameTable.address.push(undefined);
  });

  nodes.forEach((node, i) => {
    let frameIndex = nodeIdToFrameId[node.id];
    nodeIdToStackId[node.id] = thread.stackTable.length;
    if (!node.children) {
      thread.stackTable.length++;
      thread.stackTable.prefix.push(undefined);
      thread.stackTable.frame.push(frameIndex);
      return;
    }
    for (let i = 0; i <= node.children.length; i++) {
      const nextNodeId = node.children[i];
      const prefix = nextNodeId === undefined
        ? undefined
        : nodeIdToFrameId[nextNodeId];

      thread.stackTable.length++;
      thread.stackTable.prefix.push(prefix);
      thread.stackTable.frame.push(frameIndex);
      frameIndex = prefix;
    }
  });

  samples.forEach((sampleIndex, i) => {
    const node = nodesById[sampleIndex];

    thread.samples.length++;
    thread.samples.time.push(accumulatedTimeDeltas[i]);
    thread.samples.stack.push(nodeIdToStackId[node.id]);
    thread.samples.responsiveness.push(timeDeltas[i]);
    thread.samples.rss.push(undefined);
    thread.samples.uss.push(undefined);
    thread.samples.frameNumber.push(nodeIdToFrameId[node.id]);
    thread.samples.power.push(undefined);
  });
  return thread;
}

function getThreadName(profileByName, tid) {
  const thread_name = profileByName.thread_name.find(row => row.tid === tid);
  return thread_name ? thread_name.args.name : 'Unknown';
}

function getProcessLabels(profileByName, pid) {
  const process_labels = profileByName.process_labels.find(row => row.pid === pid);
  return process_labels ? process_labels.args.labels : 'Unknown';
}

function getBlankThread(name) {
  return {
    name: null,
    tid: null,
    processType: null,
    samples: {
      length: 0,
      time: [],
      stack: [],
      responsiveness: [],
      rss: [],
      uss: [],
      frameNumber: [],
      power: [],
    },
    markers: {
      length: 0,
      time: [],
      name: [],
      data: [],
    },
    stackTable: {
      length: 0,
      prefix: [],
      frame: [],
    },
    frameTable: {
      length: 0,
      implementation: [],
      optimizations: [],
      line: [],
      category: [],
      func: [],
      address: [],
    },
    funcTable: {
      length: 0,
      name: [],
      resource: [],
      address: [],
      isJS: [],
    },
    resourceTable: {
      length: 0,
      type: [],
      name: [],
      lib: [],
      icon: [],
      addonId: [],
    },
    stringTable: new UniqueStringArray(),
  };
}
