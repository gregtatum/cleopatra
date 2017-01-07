import { createSelector } from 'reselect';
import * as ProfileData from '../profile-data';
import * as ProfileTree from '../profile-tree';
import * as TaskTracer from '../task-tracer';
import * as reducers from '../reducers';
import { urlFromState } from '../url-handling';

export const getView = state => state.view;
export const getProfileView = state => state.profileView;
export const getProfile = state => getProfileView(state).profile;
export const getProfileInterval = state => getProfile(state).meta.interval;
export const getProfileViewOptions = state => getProfileView(state).viewOptions;
export const getThreadNames = state => getProfile(state).threads.map(t => t.name);
export const getProfileTaskTracerData = state => getProfile(state).tasktracer;

const getURLState = state => state.urlState;

export const getDataSource = state => getURLState(state).dataSource;
export const getHash = state => getURLState(state).hash;
export const getRangeFilters = state => getURLState(state).rangeFilters;
export const getJSOnly = state => getURLState(state).jsOnly;
export const getInvertCallstack = state => getURLState(state).invertCallstack;
export const getSearchString = state => getURLState(state).callTreeSearchString;
export const getSelectedTab = state => getURLState(state).selectedTab;
export const getSelectedThreadIndex = state => getURLState(state).selectedThread;

export const getURLPredictor = createSelector(
  getURLState,
  urlState => actionOrActionList => {
    const actionList = ('type' in actionOrActionList) ? [actionOrActionList] : actionOrActionList;
    const newURLState = actionList.reduce(reducers.urlState, urlState);
    return urlFromState(newURLState);
  }
);

export const getScrollToSelectionGeneration = createSelector(
  getProfileViewOptions,
  viewOptions => viewOptions.scrollToSelectionGeneration
);

export const getDisplayRange = createSelector(
  state => getProfileViewOptions(state).rootRange,
  state => getProfileViewOptions(state).zeroAt,
  getRangeFilters,
  (rootRange, zeroAt, rangeFilters) => {
    if (rangeFilters.length > 0) {
      let { start, end } = rangeFilters[rangeFilters.length - 1];
      start += zeroAt;
      end += zeroAt;
      return { start, end };
    }
    return rootRange;
  }
);

export const getZeroAt = createSelector(
  getProfileViewOptions,
  viewOptions => viewOptions.zeroAt
);

export const getThreadOrder = createSelector(
  getProfileViewOptions,
  viewOptions => viewOptions.threadOrder
);

export const getTasksByThread = createSelector(
  state => getProfileTaskTracerData(state).taskTable,
  state => getProfileTaskTracerData(state).threadTable,
  TaskTracer.getTasksByThread
);

export const getProfileSummaries = state => {
  return state.summaryView.summary;
};

export const getProfileExpandedSummaries = state => {
  return state.summaryView.expanded;
};

const selectorsForThreads = {};

export const selectorsForThread = threadIndex => {
  if (!(threadIndex in selectorsForThreads)) {
    const getThread = state => getProfile(state).threads[threadIndex];
    const getViewOptions = state => getProfileViewOptions(state).threads[threadIndex];
    const getCallTreeFilters = state => getURLState(state).callTreeFilters[threadIndex] || [];
    const getRangeFilteredThread = createSelector(
      getThread,
      getDisplayRange,
      (thread, range) => {
        const { start, end } = range;
        return ProfileData.filterThreadToRange(thread, start, end);
      }
    );
    const getRangeFilteredThreadSamples = createSelector(
      getRangeFilteredThread,
      thread => thread.samples
    );
    const getRangeFilteredThreadMarkers = createSelector(
      getRangeFilteredThread,
      thread => thread.markers
    );
    const getJankInstances = createSelector(
      getRangeFilteredThreadSamples,
      state => getThread(state).processType,
      (samples, processType) => ProfileData.getJankInstances(samples, processType, 50)
    );
    const getTracingMarkers = createSelector(
      getThread,
      getRangeFilteredThreadMarkers,
      (thread, markers) => ProfileData.getTracingMarkers(thread, markers)
    );
    const getRangeAndCallTreeFilteredThread = createSelector(
      getRangeFilteredThread,
      getCallTreeFilters,
      (thread, callTreeFilters) => {
        const result = callTreeFilters.reduce((t, filter) => {
          switch (filter.type) {
            case 'prefix':
              return ProfileData.filterThreadToPrefixStack(t, filter.prefixFuncs, filter.matchJSOnly);
            case 'postfix':
              return ProfileData.filterThreadToPostfixStack(t, filter.postfixFuncs, filter.matchJSOnly);
            default:
              throw new Error('unhandled call tree filter');
          }
        }, thread);
        return result;
      }
    );
    const getJSOnlyFilteredThread = createSelector(
      getRangeAndCallTreeFilteredThread,
      getJSOnly,
      (thread, jsOnly) => {
        return jsOnly ? ProfileData.filterThreadToJSOnly(thread) : thread;
      }
    );
    const getJSOnlyAndSearchFilteredThread = createSelector(
      getJSOnlyFilteredThread,
      getSearchString,
      (thread, searchString) => {
        return ProfileData.filterThreadToSearchString(thread, searchString);
      }
    );
    const getFilteredThread = createSelector(
      getJSOnlyAndSearchFilteredThread,
      getInvertCallstack,
      (thread, shouldInvertCallstack) => {
        return shouldInvertCallstack ? ProfileData.invertCallstack(thread) : thread;
      }
    );
    const getRangeSelectionFilteredThread = createSelector(
      getFilteredThread,
      getProfileViewOptions,
      (thread, viewOptions) => {
        if (!viewOptions.selection.hasSelection) {
          return thread;
        }
        const { selectionStart, selectionEnd } = viewOptions.selection;
        return ProfileData.filterThreadToRange(thread, selectionStart, selectionEnd);
      }
    );
    const getFuncStackInfo = createSelector(
      getFilteredThread,
      ({stackTable, frameTable, funcTable}) => {
        return ProfileData.getFuncStackInfo(stackTable, frameTable, funcTable);
      }
    );
    const getSelectedFuncStackAsFuncArray = createSelector(
      getViewOptions,
      threadViewOptions => threadViewOptions.selectedFuncStack
    );
    const getSelectedFuncStack = createSelector(
      getFuncStackInfo,
      getSelectedFuncStackAsFuncArray,
      (funcStackInfo, funcArray) => {
        return ProfileData.getFuncStackFromFuncArray(funcArray, funcStackInfo.funcStackTable);
      }
    );
    const getExpandedFuncStacksAsFuncArrays = createSelector(
      getViewOptions,
      threadViewOptions => threadViewOptions.expandedFuncStacks
    );
    const getExpandedFuncStacks = createSelector(
      getFuncStackInfo,
      getExpandedFuncStacksAsFuncArrays,
      (funcStackInfo, funcArrays) => {
        return funcArrays.map(funcArray => ProfileData.getFuncStackFromFuncArray(funcArray, funcStackInfo.funcStackTable));
      }
    );
    const getFuncStackMaxDepth = createSelector(
      getFuncStackInfo,
      ({funcStackTable}) => {
        let maxDepth = 0;
        for (let i = 0; i < funcStackTable.depth.length; i++) {
          if (funcStackTable.depth[i] > maxDepth) {
            maxDepth = funcStackTable.depth[i];
          }
        }
        return maxDepth;
      }
    );
    /**
     * Build a sample timing table that lists all of the sample's timing information
     * by call stack depth. This optimizes sample data for Flame Chart timeline views. It
     * makes it really easy to draw a large amount of boxes at once based on where the
     * viewport is in the stack frame data. Plus the end timings for frames need to be
     * reconstructed from the smaple data, as the samples only contain start timings.
     *
     * This format allows for specifically selecting certain rows of stack frames by using
     * the stack depth information. In addition, the start and end times of samples can be
     * found through binary searches, allowing for selecting the proper subsets of frames
     * to be drawn. Each row's sample length is different, but it can still be efficient
     * to find subsets of the data.
     *
     * [
     *   [ {start, end, stack} ]
     *   [ {start, end, stack}, {start, end, stack} ]
     *   [ {start, end, stack}, {start, end, stack}, {start, end, stack} ]
     *   [ {start, end, stack}, {start, end, stack}, {start, end, stack} ]
     *   [ {start, end, stack}, {start, end, stack}, ..., {start, end, stack} ]
     *   ...
     *   [ {start, end, stack}, {start, end, stack} ]
     * ]
     */
    const getStackTimingByDepth = createSelector(
      getThread,
      getFuncStackInfo,
      getFuncStackMaxDepth,
      getProfileInterval,
      (thread, {funcStackTable, stackIndexToFuncStackIndex}, maxDepth, interval) => {
        const stackTimingByDepth = Array.from({length: maxDepth + 1}, () => ({
          start: [],
          end: [],
          stack: [],
          length: 0,
        }));
        const lastSeenStartTimeByDepth = [];
        const lastSeenStackIndexByDepth = [];

        function popStacks(depth, previousDepth, sampleTime) {
          // "Pop" off the stack, and commit the timing of the frames
          for (let stackDepth = depth + 1; stackDepth <= previousDepth; stackDepth++) {
            // Push on the new information.
            stackTimingByDepth[stackDepth].start.push(lastSeenStartTimeByDepth[stackDepth]);
            stackTimingByDepth[stackDepth].end.push(sampleTime);
            stackTimingByDepth[stackDepth].stack.push(lastSeenStackIndexByDepth[stackDepth]);
            stackTimingByDepth[stackDepth].length++;

            // Delete that this stack frame has been seen.
            lastSeenStackIndexByDepth[stackDepth] = undefined;
            lastSeenStartTimeByDepth[stackDepth] = undefined;
          }
        }

        function pushStacks(depth, stackIndex, sampleTime) {
          // "Push" onto the stack with new frames
          for (let parentDepth = depth; parentDepth >= 0; parentDepth--) {
            if (lastSeenStackIndexByDepth[parentDepth] !== undefined) {
              break;
            }
            lastSeenStackIndexByDepth[parentDepth] = stackIndex;
            lastSeenStartTimeByDepth[parentDepth] = sampleTime;
            stackIndex = thread.stackTable.prefix[stackIndex];
          }
        }

        let previousDepth = 0;

        for (let i = 0; i < thread.samples.length; i++) {
          const stackIndex = thread.samples.stack[i];
          const sampleTime = thread.samples.time[i];
          const funcStackIndex = stackIndexToFuncStackIndex[stackIndex];
          const depth = funcStackTable.depth[funcStackIndex];

          // If the two samples at the top of the stack are different, pop the last stack frame.
          const depthToPop = lastSeenStackIndexByDepth[depth] === stackIndex ? depth : depth - 1;
          popStacks(depthToPop, previousDepth, sampleTime);
          pushStacks(depth, stackIndex, sampleTime);
          previousDepth = depth;
        }
        // Pop the remaining stacks
        const endingTime = thread.samples.time[thread.samples.time.length - 1] + interval;
        popStacks(-1, previousDepth, endingTime);

        return stackTimingByDepth;
      }
    );
    const getCallTree = createSelector(
      getRangeSelectionFilteredThread,
      getProfileInterval,
      getFuncStackInfo,
      ProfileTree.getCallTree
    );
    selectorsForThreads[threadIndex] = {
      getThread,
      getViewOptions,
      getCallTreeFilters,
      getFilteredThread,
      getJankInstances,
      getTracingMarkers,
      getRangeSelectionFilteredThread,
      getFuncStackInfo,
      getSelectedFuncStack,
      getExpandedFuncStacks,
      getFuncStackMaxDepth,
      getStackTimingByDepth,
      getCallTree,
    };
  }
  return selectorsForThreads[threadIndex];
};

export const selectedThreadSelectors = (() => {
  const anyThreadSelectors = selectorsForThread(0);
  const result = {};
  for (const key in anyThreadSelectors) {
    result[key] = state => selectorsForThread(getSelectedThreadIndex(state))[key](state);
  }
  return result;
})();
