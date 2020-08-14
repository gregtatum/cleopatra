/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import { combineReducers } from 'redux';
import * as Transforms from '../profile-logic/transforms';
import * as ProfileData from '../profile-logic/profile-data';
import { arePathsEqual, PathSet } from '../utils/path';

import type {
  Profile,
  Pid,
  LocalTrack,
  GlobalTrack,
  OriginsTimeline,
  StartEndRange,
  PreviewSelection,
  RequestedLib,
  TrackReference,
  Reducer,
  ProfileViewState,
  SymbolicationStatus,
  ThreadViewOptions,
  RightClickedCallNode,
  RightClickedMarker,
  ActiveTabTimeline,
  CallNodePath,
} from 'firefox-profiler/types';

const profile: Reducer<Profile | null> = (state = null, action) => {
  switch (action.type) {
    case 'PROFILE_LOADED':
      return action.profile;
    case 'BULK_SYMBOLICATION': {
      if (state === null) {
        throw new Error(
          'Assumed that a profile would be loaded in time for a coalesced functions update.'
        );
      }
      if (!state.threads.length) {
        return state;
      }
      const { symbolicatedThreads } = action;
      return { ...state, threads: symbolicatedThreads };
    }
    case 'DONE_SYMBOLICATING': {
      if (state === null) {
        throw new Error(
          `Strangely we're done symbolicating a non-existent profile.`
        );
      }

      return {
        ...state,
        meta: {
          ...state.meta,
          symbolicated: true,
        },
      };
    }
    default:
      return state;
  }
};

/**
 * This information is stored, rather than derived via selectors, since the coalesced
 * function update would force it to be recomputed on every symbolication update
 * pass. It is valid for the lifetime of the profile.
 */
const globalTracks: Reducer<GlobalTrack[]> = (state = [], action) => {
  switch (action.type) {
    case 'VIEW_FULL_PROFILE':
      return action.globalTracks;
    default:
      return state;
  }
};

/**
 * This can be derived like the globalTracks information, but is stored in the state
 * for the same reason.
 */
const localTracksByPid: Reducer<Map<Pid, LocalTrack[]>> = (
  state = new Map(),
  action
) => {
  switch (action.type) {
    case 'VIEW_FULL_PROFILE':
    case 'ENABLE_EVENT_DELAY_TRACKS':
      return action.localTracksByPid;
    default:
      return state;
  }
};

/**
 * This information is stored, rather than derived via selectors, since the coalesced
 * function update would force it to be recomputed on every symbolication update
 * pass. It is valid for the lifetime of the profile.
 */
const activeTabTimeline: Reducer<ActiveTabTimeline | null> = (
  state = null,
  action
) => {
  switch (action.type) {
    case 'VIEW_ACTIVE_TAB_PROFILE':
      return action.activeTabTimeline;
    default:
      return state;
  }
};

const symbolicationStatus: Reducer<SymbolicationStatus> = (
  state = 'DONE',
  action
) => {
  switch (action.type) {
    case 'START_SYMBOLICATING':
      return 'SYMBOLICATING';
    case 'DONE_SYMBOLICATING':
      return 'DONE';
    default:
      return state;
  }
};

const viewOptionsPerThread: Reducer<ThreadViewOptions[]> = (
  state = [],
  action
) => {
  switch (action.type) {
    case 'PROFILE_LOADED':
      return action.profile.threads.map(() => ({
        selectedCallNodePath: [],
        expandedCallNodePaths: new PathSet(),
        selectedMarker: null,
      }));
    case 'BULK_SYMBOLICATION': {
      const { oldFuncToNewFuncMaps } = action;
      // For each thread, apply oldFuncToNewFuncMap to that thread's
      // selectedCallNodePath and expandedCallNodePaths.
      return state.map((threadViewOptions, threadIndex) => {
        const oldFuncToNewFuncMap = oldFuncToNewFuncMaps.get(threadIndex);
        if (oldFuncToNewFuncMap === undefined) {
          return threadViewOptions;
        }
        const mapOldFuncToNewFunc = oldFunc => {
          const newFunc = oldFuncToNewFuncMap.get(oldFunc);
          return newFunc === undefined ? oldFunc : newFunc;
        };
        return {
          ...threadViewOptions,
          selectedCallNodePath: threadViewOptions.selectedCallNodePath.map(
            mapOldFuncToNewFunc
          ),
          expandedCallNodePaths: new PathSet(
            Array.from(threadViewOptions.expandedCallNodePaths).map(oldPath =>
              oldPath.map(mapOldFuncToNewFunc)
            )
          ),
        };
      });
    }
    case 'CHANGE_SELECTED_CALL_NODE': {
      const {
        selectedCallNodePath,
        threadIndex,
        optionalExpandedToCallNodePath,
      } = action;

      const threadState = state[threadIndex];
      const previousSelectedCallNodePath = threadState.selectedCallNodePath;

      // If the selected node doesn't actually change, let's return the previous
      // state to avoid rerenders.
      if (
        arePathsEqual(selectedCallNodePath, previousSelectedCallNodePath) &&
        !optionalExpandedToCallNodePath
      ) {
        return state;
      }

      let { expandedCallNodePaths } = threadState;
      const expandToNode = optionalExpandedToCallNodePath
        ? optionalExpandedToCallNodePath
        : selectedCallNodePath;

      /* Looking into the current state to know whether we want to generate a
       * new one. It can be expensive to clone when we have a lot of expanded
       * lines, but it's very infrequent that we actually want to expand new
       * lines as a result of a selection. */
      const expandToNodeParentPaths = [];
      for (let i = 1; i < expandToNode.length; i++) {
        expandToNodeParentPaths.push(expandToNode.slice(0, i));
      }
      const hasNewExpandedPaths = expandToNodeParentPaths.some(
        path => !expandedCallNodePaths.has(path)
      );

      if (hasNewExpandedPaths) {
        expandedCallNodePaths = new PathSet(expandedCallNodePaths);
        expandToNodeParentPaths.forEach(path =>
          expandedCallNodePaths.add(path)
        );
      }

      return [
        ...state.slice(0, threadIndex),
        {
          ...state[threadIndex],
          selectedCallNodePath,
          expandedCallNodePaths,
        },
        ...state.slice(threadIndex + 1),
      ];
    }
    case 'CHANGE_INVERT_CALLSTACK': {
      const { callTree, callNodeTable, selectedThreadIndexes } = action;
      return state.map((viewOptions, threadIndex) => {
        if (selectedThreadIndexes.has(threadIndex)) {
          // Only attempt this on the current thread, as we need the transformed thread
          // There is no guarantee that this has been calculated on all the other threads,
          // and we shouldn't attempt to expect it, as that could be quite a perf cost.
          const selectedCallNodePath = Transforms.invertCallNodePath(
            viewOptions.selectedCallNodePath,
            callTree,
            callNodeTable
          );

          const expandedCallNodePaths = new PathSet();
          for (let i = 1; i < selectedCallNodePath.length; i++) {
            expandedCallNodePaths.add(selectedCallNodePath.slice(0, i));
          }

          return {
            ...viewOptions,
            selectedCallNodePath,
            expandedCallNodePaths,
          };
        }
        return viewOptions;
      });
    }
    case 'CHANGE_EXPANDED_CALL_NODES': {
      const { threadIndex, expandedCallNodePaths } = action;
      return [
        ...state.slice(0, threadIndex),
        {
          ...state[threadIndex],
          expandedCallNodePaths: new PathSet(expandedCallNodePaths),
        },
        ...state.slice(threadIndex + 1),
      ];
    }
    case 'CHANGE_SELECTED_MARKER': {
      const { threadIndex, selectedMarker } = action;
      return [
        ...state.slice(0, threadIndex),
        { ...state[threadIndex], selectedMarker },
        ...state.slice(threadIndex + 1),
      ];
    }
    case 'ADD_TRANSFORM_TO_STACK': {
      const { threadIndex, transform, transformedThread } = action;
      const expandedCallNodePaths = new PathSet(
        Array.from(state[threadIndex].expandedCallNodePaths)
          .map(path =>
            Transforms.applyTransformToCallNodePath(
              path,
              transform,
              transformedThread
            )
          )
          .filter(path => path.length > 0)
      );

      const selectedCallNodePath = Transforms.applyTransformToCallNodePath(
        state[threadIndex].selectedCallNodePath,
        transform,
        transformedThread
      );

      return [
        ...state.slice(0, threadIndex),
        {
          ...state[threadIndex],
          selectedCallNodePath,
          expandedCallNodePaths,
        },
        ...state.slice(threadIndex + 1),
      ];
    }
    case 'POP_TRANSFORMS_FROM_STACK': {
      // Simply reset the stored paths until this bug is fixed:
      // https://github.com/firefox-devtools/profiler/issues/882
      const { threadIndex } = action;
      return [
        ...state.slice(0, threadIndex),
        {
          ...state[threadIndex],
          selectedCallNodePath: [],
          expandedCallNodePaths: new PathSet(),
        },
        ...state.slice(threadIndex + 1),
      ];
    }
    case 'CHANGE_IMPLEMENTATION_FILTER': {
      const {
        transformedThread,
        threadIndexes,
        previousImplementation,
        implementation,
      } = action;

      if (previousImplementation === implementation) {
        return state;
      }

      const newViewOptions = state.slice();
      for (const threadIndex of threadIndexes) {
        // This CallNodePath may need to be updated twice.
        let selectedCallNodePath: CallNodePath =
          state[threadIndex].selectedCallNodePath;
        if (implementation === 'combined') {
          // Restore the full CallNodePaths
          selectedCallNodePath = Transforms.restoreAllFunctionsInCallNodePath(
            transformedThread,
            previousImplementation,
            selectedCallNodePath
          );
        } else {
          if (previousImplementation !== 'combined') {
            // Restore the CallNodePath back to an unfiltered state before re-filtering
            // it on the next implementation.
            selectedCallNodePath = Transforms.restoreAllFunctionsInCallNodePath(
              transformedThread,
              previousImplementation,
              selectedCallNodePath
            );
          }
          // Take the full CallNodePath, and strip out anything not in this implementation.
          selectedCallNodePath = Transforms.filterCallNodePathByImplementation(
            transformedThread,
            implementation,
            selectedCallNodePath
          );
        }

        const expandedCallNodePaths = new PathSet();
        for (let i = 1; i < selectedCallNodePath.length; i++) {
          expandedCallNodePaths.add(selectedCallNodePath.slice(0, i));
        }

        newViewOptions[threadIndex] = {
          ...state[threadIndex],
          selectedCallNodePath,
          expandedCallNodePaths,
        };
      }

      return newViewOptions;
    }
    default:
      return state;
  }
};

const waitingForLibs: Reducer<Set<RequestedLib>> = (
  state = new Set(),
  action
) => {
  switch (action.type) {
    case 'REQUESTING_SYMBOL_TABLE': {
      const newState = new Set(state);
      newState.add(action.requestedLib);
      return newState;
    }
    case 'RECEIVED_SYMBOL_TABLE_REPLY': {
      const newState = new Set(state);
      newState.delete(action.requestedLib);
      return newState;
    }
    default:
      return state;
  }
};

const previewSelection: Reducer<PreviewSelection> = (
  state = { hasSelection: false, isModifying: false },
  action
) => {
  switch (action.type) {
    case 'UPDATE_PREVIEW_SELECTION':
      return action.previewSelection;
    case 'COMMIT_RANGE':
    case 'POP_COMMITTED_RANGES':
      return { hasSelection: false, isModifying: false };
    default:
      return state;
  }
};

/**
 * When changing state in the UI, it's hard to know when we need to re-scroll a
 * selection into view. This value is a generational value (it always increments by one).
 * Anytime it increments, it signals that the current view needs to scroll the selection
 * into view. This mechanism works will with memoization of props with React components.
 */
const scrollToSelectionGeneration: Reducer<number> = (state = 0, action) => {
  switch (action.type) {
    case 'CHANGE_INVERT_CALLSTACK':
    case 'CHANGE_SELECTED_CALL_NODE':
    case 'CHANGE_SELECTED_THREAD':
    case 'SELECT_TRACK':
    case 'HIDE_GLOBAL_TRACK':
    case 'HIDE_LOCAL_TRACK':
    case 'CHANGE_SELECTED_MARKER':
      return state + 1;
    default:
      return state;
  }
};

/**
 * When changing state in the UI, we need to know when the call tree needs to be focused.
 * This value is a generational value (it always increments by one). Anytime it
 * increments, it signals that the current view needs to focus the call tree
 * This mechanism works will with memoization of props with React components.
 */
const focusCallTreeGeneration: Reducer<number> = (state = 0, action) => {
  switch (action.type) {
    case 'FOCUS_CALL_TREE':
      return state + 1;
    default:
      return state;
  }
};

const rootRange: Reducer<StartEndRange> = (
  state = { start: 0, end: 1 },
  action
) => {
  switch (action.type) {
    case 'PROFILE_LOADED':
      return ProfileData.getTimeRangeIncludingAllThreads(action.profile);
    default:
      return state;
  }
};

const rightClickedTrack: Reducer<TrackReference | null> = (
  state = null,
  action
) => {
  switch (action.type) {
    case 'CHANGE_RIGHT_CLICKED_TRACK':
      return action.trackReference;
    default:
      return state;
  }
};

const rightClickedCallNode: Reducer<RightClickedCallNode | null> = (
  state = null,
  action
) => {
  switch (action.type) {
    case 'BULK_SYMBOLICATION': {
      if (state === null) {
        return null;
      }

      const { oldFuncToNewFuncMaps } = action;
      const oldFuncToNewFuncMap = oldFuncToNewFuncMaps.get(state.threadIndex);
      if (oldFuncToNewFuncMap === undefined) {
        return state;
      }

      const mapOldFuncToNewFunc = oldFunc => {
        const newFunc = oldFuncToNewFuncMap.get(oldFunc);
        return newFunc === undefined ? oldFunc : newFunc;
      };

      return {
        ...state,
        callNodePath: state.callNodePath.map(mapOldFuncToNewFunc),
      };
    }
    case 'CHANGE_RIGHT_CLICKED_CALL_NODE':
      if (action.callNodePath !== null) {
        return {
          threadIndex: action.threadIndex,
          callNodePath: action.callNodePath,
        };
      }

      return null;
    case 'SET_CONTEXT_MENU_VISIBILITY':
      // We want to change the state only when the menu is hidden.
      if (action.isVisible) {
        return state;
      }

      return null;
    case 'PROFILE_LOADED':
    case 'CHANGE_INVERT_CALLSTACK':
    case 'ADD_TRANSFORM_TO_STACK':
    case 'POP_TRANSFORMS_FROM_STACK':
    case 'CHANGE_IMPLEMENTATION_FILTER':
      return null;
    default:
      return state;
  }
};

const rightClickedMarker: Reducer<RightClickedMarker | null> = (
  state = null,
  action
) => {
  switch (action.type) {
    case 'CHANGE_RIGHT_CLICKED_MARKER':
      if (action.markerIndex !== null) {
        return {
          threadIndex: action.threadIndex,
          markerIndex: action.markerIndex,
        };
      }

      return null;
    case 'SET_CONTEXT_MENU_VISIBILITY':
      // We want to change the state only when the menu is hidden.
      if (action.isVisible) {
        return state;
      }

      return null;
    case 'PROFILE_LOADED':
      return null;
    default:
      return state;
  }
};

/**
 * The origins timeline is experimental. See the OriginsTimeline component
 * for more information.
 */
const originsTimeline: Reducer<OriginsTimeline> = (state = [], action) => {
  switch (action.type) {
    case 'VIEW_ORIGINS_PROFILE':
      return action.originsTimeline;
    default:
      return state;
  }
};

/**
 * Provide a mechanism to wrap the reducer in a special function that can reset
 * the state to the default values. This is useful when viewing multiple profiles
 * (e.g. in zip files).
 */
const wrapReducerInResetter = (
  regularReducer: Reducer<ProfileViewState>
): Reducer<ProfileViewState> => {
  return (state, action) => {
    switch (action.type) {
      case 'SANITIZED_PROFILE_PUBLISHED':
      case 'REVERT_TO_PRE_PUBLISHED_STATE':
      case 'RETURN_TO_ZIP_FILE_LIST':
        // Provide a mechanism to wipe the state clean when changing out profiles.
        // All of the profile view information is invalidated.
        return regularReducer(undefined, action);
      default:
        // Run the normal reducer.
        return regularReducer(state, action);
    }
  };
};

const profileViewReducer: Reducer<ProfileViewState> = wrapReducerInResetter(
  combineReducers({
    viewOptions: combineReducers({
      perThread: viewOptionsPerThread,
      symbolicationStatus,
      waitingForLibs,
      previewSelection,
      scrollToSelectionGeneration,
      focusCallTreeGeneration,
      rootRange,
      rightClickedTrack,
      rightClickedCallNode,
      rightClickedMarker,
    }),
    profile,
    full: combineReducers({
      globalTracks,
      localTracksByPid,
    }),
    activeTab: combineReducers({
      activeTabTimeline,
    }),
    origins: combineReducers({
      originsTimeline,
    }),
  })
);

export default profileViewReducer;
