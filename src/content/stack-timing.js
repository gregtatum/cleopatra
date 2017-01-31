/**
 * Build a sample timing table that lists all of the sample's timing information
 * by call stack depth. This optimizes sample data for Flame Chart timeline views. It
 * makes it really easy to draw a large amount of boxes at once based on where the
 * viewport is in the stack frame data. Plus the end timings for frames need to be
 * reconstructed from the sample data, as the samples only contain start timings.
 *
 * This format allows for specifically selecting certain rows of stack frames by using
 * the stack depth information. In addition, the start and end times of samples can be
 * found through binary searches, allowing for selecting the proper subsets of frames
 * to be drawn. Each row's sample length is different, but it can still be efficient
 * to find subsets of the data.
 *
 * @param {object} thread - The profile thread.
 * @param {object} funcStackInfo - from the funcStackInfo selector.
 * @param {integer} maxDepth - The max depth of the all the stacks.
 * @param {number} interval - The interval of how long the profile was recorded.
 * @param {boolean} jsOnly - Whether or not to collapse platform stacks.
 * @return {array} stackTimingByDepth - for example:
 *
 * [
 *   {start: [10], end: [100], stack: [0]}
 *   {start: [20, 40, 60], end: [40, 60, 80], stack: [1, 2, 3]}
 *   {start: [20, 40, 60], end: [40, 60, 80], stack: [34, 59, 72]}
 *   ...
 *   {start: [25, 45], end: [35, 55], stack: [123, 159, 160]}
 * ]
 */
export function getStackTimingByDepth(thread, funcStackInfo, maxDepth, interval, jsOnly) {
  const {funcStackTable, stackIndexToFuncStackIndex} = funcStackInfo;
  const stackTimingByDepth = Array.from({length: maxDepth + 1}, () => ({
    start: [],
    end: [],
    stack: [],
    length: 0,
  }));

  const lastSeen = {
    startTimeByDepth: [],
    stackIndexByDepth: [],
  };

  // Go through each sample, and push/pop it on the stack to build up
  // the stackTimingByDepth.
  let previousDepth = 0;
  for (let i = 0; i < thread.samples.length; i++) {
    const stackIndex = thread.samples.stack[i];
    const sampleTime = thread.samples.time[i];
    const funcStackIndex = stackIndexToFuncStackIndex[stackIndex];
    const depth = funcStackTable.depth[funcStackIndex];

    // If the two samples at the top of the stack are different, pop the last stack frame.
    const depthToPop = lastSeen.stackIndexByDepth[depth] === stackIndex ? depth : depth - 1;
    _popStacks(stackTimingByDepth, lastSeen, depthToPop, previousDepth, sampleTime);
    _pushStacks(thread, lastSeen, depth, stackIndex, sampleTime);
    previousDepth = depth;
  }

  // Pop the remaining stacks
  const endingTime = thread.samples.time[thread.samples.time.length - 1] + interval;
  _popStacks(stackTimingByDepth, lastSeen, -1, previousDepth, endingTime);

  // Collapse platform code into single rows if JS only.
  if (jsOnly) {
    _collapsePlatformStacks(stackTimingByDepth, thread, funcStackInfo);
  }

  return stackTimingByDepth;
}

function _popStacks(stackTimingByDepth, lastSeen, depth, previousDepth, sampleTime) {
  // "Pop" off the stack, and commit the timing of the frames
  for (let stackDepth = depth + 1; stackDepth <= previousDepth; stackDepth++) {
    // Push on the new information.
    stackTimingByDepth[stackDepth].start.push(lastSeen.startTimeByDepth[stackDepth]);
    stackTimingByDepth[stackDepth].end.push(sampleTime);
    stackTimingByDepth[stackDepth].stack.push(lastSeen.stackIndexByDepth[stackDepth]);
    stackTimingByDepth[stackDepth].length++;

    // Delete that this stack frame has been seen.
    lastSeen.stackIndexByDepth[stackDepth] = undefined;
    lastSeen.startTimeByDepth[stackDepth] = undefined;
  }
}

function _pushStacks(thread, lastSeen, depth, startingIndex, sampleTime) {
  let stackIndex = startingIndex;
  // "Push" onto the stack with new frames
  for (let parentDepth = depth; parentDepth >= 0; parentDepth--) {
    if (lastSeen.stackIndexByDepth[parentDepth] !== undefined) {
      break;
    }
    lastSeen.stackIndexByDepth[parentDepth] = stackIndex;
    lastSeen.startTimeByDepth[parentDepth] = sampleTime;
    stackIndex = thread.stackTable.prefix[stackIndex];
  }
}


/**
 * Given timing information like below, collapse out the platform stacks. In the diagram
 * "J" represents JavaScript stack frame timing, and "P" Platform stack frame timing.
 * The timing stack index gets changed to -1 for collapsed platform code.
 *
 * JJJJJJJJJJJJJJJJ  --->  JJJJJJJJJJJJJJJJ
 * PPPPPPPPPPPPPPPP        PPPPPPPPPPPPPPPP
 *     PPPPPPPPPPPP            JJJJJJJJ
 *     PPPPPPPP                JJJ  JJJ
 *     JJJJJJJJ
 *     JJJ  JJJ
 *
 * @param {Object} stackTimingByDepth - Table of stack timings.
 * @param {Object} thread - The current thread.
 * @param {Object} funcStackInfo - Info about funcStacks.
 * @returns {Object} The mutated and collapsed timing information.
 */
function _collapsePlatformStacks(stackTimingByDepth, thread, funcStackInfo) {
  const {funcStackTable, stackIndexToFuncStackIndex} = funcStackInfo;

  // Set any platform stacks to -1
  for (let depth = 0; depth < stackTimingByDepth.length; depth++) {
    const timingRow = stackTimingByDepth[depth];
    for (let i = 0; i < timingRow.stack.length; i++) {
      const stackIndex = timingRow.stack[i];
      const funcStackIndex = stackIndexToFuncStackIndex[stackIndex];
      const funcIndex = funcStackTable.func[funcStackIndex];
      if (!thread.funcTable.isJS[funcIndex]) {
        timingRow.stack[i] = -1;
      }
    }
  }

  // Pre-emptively merge together consecutive platform stacks in the same row to minimize
  // operations in the collapsing function.
  for (let depth = 0; depth < stackTimingByDepth.length; depth++) {
    const timingRow = stackTimingByDepth[depth];
    for (let bIndex = 1; bIndex < timingRow.length; bIndex++) {
      const aIndex = bIndex - 1;
      const stackA = timingRow[aIndex];
      const stackB = timingRow[bIndex];
      if (stackA === -1 && stackB === -1) {
        timingRow.start.splice(bIndex, 1);
        timingRow.stack.splice(bIndex, 1);
        timingRow.end.splice(aIndex, 1);
        timingRow.oDepth.splice(bIndex, 1);
        timingRow.oStack.splice(bIndex, 1);
      }
    }
  }

  // Compare neighboring stacks (a child, and parent). If both child and parent are
  // platform code, then pop off the child, and shift the rest of the children stacks
  // up.
  for (let childDepth = stackTimingByDepth.length - 1; childDepth > 0; childDepth--) {
    const parentDepth = childDepth - 1;
    const parentTimingRow = stackTimingByDepth[parentDepth];
    const childTimingRow = stackTimingByDepth[childDepth];

    // Go through each stack frame at this depth.
    for (let childTimingIndex = 0; childTimingIndex < childTimingRow.start.length; childTimingIndex++) {
      // Find the parent frame.
      const childStart = childTimingRow.start[childTimingIndex];
      const childEnd = childTimingRow.end[childTimingIndex];
      const parentTimingIndex = findParentTimingIndex(parentTimingRow, childStart, childEnd);
      const childTimingRowLengthBefore = childTimingRow.start.length;

      // Are both stacks from the platform?
      if (childTimingRow.stack[childTimingIndex] === -1 &&
          parentTimingRow.stack[parentTimingIndex] === -1) {

        childTimingRow.start.splice(childTimingIndex, 1);
        childTimingRow.end.splice(childTimingIndex, 1);
        childTimingRow.stack.splice(childTimingIndex, 1);

        collapseStackDownOneLevel(stackTimingByDepth, childDepth, childTimingIndex, childStart, childEnd);

        // If a sample was deleted, make sure and adjust the index to go back a sample.
        if (childTimingRowLengthBefore - childTimingRow.start.length === 1) {
          childTimingIndex--;
        }
      }
    }
  }

  // Perform some final updates based on the final computed timing.
  for (let depth = 0; depth < stackTimingByDepth.length; depth++) {
    // Update row lengths.
    const timingRow = stackTimingByDepth[depth];
    timingRow.length = timingRow.stack.length;

    // If a row is empty from shifting samples, then drop the rest of the rows.
    if (timingRow.length === 0) {
      stackTimingByDepth.length = depth;
    }
  }

  return stackTimingByDepth;
}

function findParentTimingIndex(timingRow, start, end) {
  for (let i = 0; i < timingRow.stack.length; i++) {
    if (timingRow.start[i] <= start && timingRow.end[i] >= end) {
      return i;
    }
  }
  return -1;
}

function findChildTimingIndicesInRange(timingRow, start, end) {
  const inRange = {
    index: [],
    stack: [],
    start: [],
    end: [],
  };

  for (let i = 0; i < timingRow.stack.length; i++) {
    if (timingRow.start[i] >= start) {
      if (timingRow.end[i] <= end) {
        inRange.index.push(i);
        inRange.stack.push(timingRow.stack[i]);
        inRange.start.push(timingRow.start[i]);
        inRange.end.push(timingRow.end[i]);
      } else {
        break;
      }
    }
  }
  return inRange;
}

/**
 * Walk from the parent to the leaf of the stack, collapsing the stack down one level.
 *
 * JJJJJJJJJJJJJJJJ
 * PPPPPPPPPPPPPPPP
 *     PPPPPPPPPPPP   <- parent
 *     [ collapse ]   <- empty (the platform timing that was removed)
 *     JJJJJJJJ       <- child
 *  ^  JJJ  JJJ
 *  |
 *  collapse down
 *
 * @param {Object} stackTimingByDepth - Table of stack timings.
 * @param {Integer} depth - The depth of the empty row.
 * @param {Integer} timingIndex - The timingIndex of the removed timing.
 * @param {Number} start - The starting time of the removed timing.
 * @param {Number} end - The ending time of the removed timing.
 * @return {undefined}
 */
function collapseStackDownOneLevel(stackTimingByDepth, depth, timingIndex, start, end) {
  let emptyTimingIndex = timingIndex;
  for (let emptyDepth = depth; emptyDepth < stackTimingByDepth.length - 1; emptyDepth++) {
    const childDepth = emptyDepth + 1;
    const emptyTimingRow = stackTimingByDepth[emptyDepth];
    const childTimingRow = stackTimingByDepth[childDepth];
    const inRangeTimings = findChildTimingIndicesInRange(childTimingRow, start, end);
    const childTimingIndex = inRangeTimings.index[0];

    // If all of the samples were found, then bail out.
    if (inRangeTimings.index.length === 0) {
      break;
    }

    // Splice out all of the children timings.
    childTimingRow.stack.splice(childTimingIndex, inRangeTimings.index.length);
    childTimingRow.start.splice(childTimingIndex, inRangeTimings.index.length);
    childTimingRow.end.splice(childTimingIndex, inRangeTimings.index.length);

    // Insert them all into the empty row.
    emptyTimingRow.stack.splice(emptyTimingIndex, 0, ...inRangeTimings.stack);
    emptyTimingRow.start.splice(emptyTimingIndex, 0, ...inRangeTimings.start);
    emptyTimingRow.end.splice(emptyTimingIndex, 0, ...inRangeTimings.end);

    emptyTimingIndex = childTimingIndex;
  }
}

export function computeFuncStackMaxDepth({funcStackTable}) {
  let maxDepth = 0;
  for (let i = 0; i < funcStackTable.depth.length; i++) {
    if (funcStackTable.depth[i] > maxDepth) {
      maxDepth = funcStackTable.depth[i];
    }
  }
  return maxDepth;
}
