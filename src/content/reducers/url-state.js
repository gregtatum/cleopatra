/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import { combineReducers } from 'redux';
import { defaultThreadOrder } from '../profile-data';
import { createSelector } from 'reselect';
import { urlFromState } from '../url-handling';
import * as RangeFilters from '../range-filters';

import type { ThreadIndex } from '../../common/types/profile';
import type { StartEndRange } from '../../common/types/units';
import type {
  Action, CallTreeFiltersPerThread, CallTreeFilter, FuncsPerThread, DataSource,
  ImplementationFilter,
} from '../actions/types';
import type { State, URLState, Reducer } from './types';

// Allow proper memoization and component update checks by passing in the same empty array.
const EMPTY_ARRAY = Object.freeze([]);

function dataSource(state: DataSource = 'none', action: Action) {
  switch (action.type) {
    case 'WAITING_FOR_PROFILE_FROM_FILE':
      return 'from-file';
    case 'PROFILE_PUBLISHED':
      return 'public';
    default:
      return state;
  }
}

function hash(state: string = '', action: Action) {
  switch (action.type) {
    case 'PROFILE_PUBLISHED':
      return action.hash;
    default:
      return state;
  }
}

function profileURL(state: string = '', action: Action) {
  switch (action.type) {
    default:
      return state;
  }
}

function selectedTab(state: string = 'calltree', action: Action) {
  switch (action.type) {
    case 'CHANGE_SELECTED_TAB':
      return action.selectedTab;
    default:
      return state;
  }
}

function rangeFilters(state: StartEndRange[] = [], action: Action) {
  switch (action.type) {
    case 'ADD_RANGE_FILTER': {
      const { start, end } = action;
      return [...state, { start, end }];
    }
    case 'POP_RANGE_FILTERS':
      return state.slice(0, action.firstRemovedFilterIndex);
    default:
      return state;
  }
}

function selectedThread(state: ThreadIndex = 0, action: Action) {
  function findDefaultThreadIndex(threads) {
    const contentThreadId = threads.findIndex(
      thread => thread.name === 'GeckoMain' && thread.processType === 'tab'
    );
    return contentThreadId !== -1 ? contentThreadId : defaultThreadOrder(threads)[0];
  }

  switch (action.type) {
    case 'CHANGE_SELECTED_THREAD':
      return action.selectedThread;
    case 'RECEIVE_PROFILE_FROM_ADDON':
    case 'RECEIVE_PROFILE_FROM_FILE': {
      // When loading in a brand new profile, select either the GeckoMain [tab] thread,
      // or the first thread in the thread order. For profiles from the Web, the
      // selectedThread has already been initialized from the URL and does not require
      // looking at the profile.
      return findDefaultThreadIndex(action.profile.threads);
    }
    case 'RECEIVE_PROFILE_FROM_STORE':
    case 'RECEIVE_PROFILE_FROM_URL': {
      // For profiles from the web, we only need to ensure the selected thread
      // is actually valid.
      if (state < action.profile.threads.length) {
        return state;
      }
      return findDefaultThreadIndex(action.profile.threads);
    }
    default:
      return state;
  }
}

function callTreeSearchString(state: string = '', action: Action) {
  switch (action.type) {
    case 'CHANGE_CALL_TREE_SEARCH_STRING':
      return action.searchString;
    default:
      return state;
  }
}

function callTreeFilters(state: CallTreeFiltersPerThread = {}, action: Action) {
  switch (action.type) {
    case 'ADD_CALL_TREE_FILTER': {
      const { threadIndex, filter } = action;
      const oldFilters = state[threadIndex] || [];
      return Object.assign({}, state, {
        [threadIndex]: [...oldFilters, filter],
      });
    }
    case 'POP_CALL_TREE_FILTERS': {
      const { threadIndex, firstRemovedFilterIndex } = action;
      const oldFilters = state[threadIndex] || [];
      return Object.assign({}, state, {
        [threadIndex]: oldFilters.slice(0, firstRemovedFilterIndex),
      });
    }
    default:
      return state;
  }
}

/**
 * Represents the current filter applied to the stack frames, where it will show
 * frames only by implementation.
 */
function implementation(state: ImplementationFilter = 'combined', action: Action) {
  switch (action.type) {
    case 'CHANGE_IMPLEMENTATION_FILTER':
      return action.implementation;
    default:
      return state;
  }
}

function invertCallstack(state: boolean = false, action: Action) {
  switch (action.type) {
    case 'CHANGE_INVERT_CALLSTACK':
      return action.invertCallstack;
    default:
      return state;
  }
}

function hidePlatformDetails(state: boolean = false, action: Action) {
  switch (action.type) {
    case 'CHANGE_HIDE_PLATFORM_DETAILS':
      return action.hidePlatformDetails;
    default:
      return state;
  }
}

function pruneFunctions(state: FuncsPerThread = {}, action: Action) {
  switch (action.type) {
    case 'PRUNE_FUNCTION': {
      const { threadIndex, funcIndex } = action;
      const funcs = state[threadIndex] || [];
      if (!funcs.includes(funcIndex)) {
        return Object.assign({}, state, {
          [threadIndex]: funcs.concat(funcIndex),
        });
      }
      break;
    }
    case 'UNPRUNE_FUNCTION': {
      const { threadIndex, funcIndex } = action;
      const funcs = state[threadIndex];
      if (funcs !== undefined) {
        return Object.assign({}, state, {
          [threadIndex]: funcs.filter(index => index !== funcIndex),
        });
      }
    }
  }
  return state;
}

function pruneSubtree(state: FuncsPerThread = {}, action: Action) {
  switch (action.type) {
    case 'PRUNE_SUBTREE': {
      const { threadIndex, funcIndex } = action;
      const funcs = state[threadIndex] || [];
      if (!funcs.includes(funcIndex)) {
        return Object.assign({}, state, {
          [threadIndex]: funcs.concat(funcIndex),
        });
      }
      break;
    }
    case 'UNPRUNE_SUBTREE': {
      const { threadIndex, funcIndex } = action;
      const funcs = state[threadIndex];
      if (funcs !== undefined) {
        return Object.assign({}, state, {
          [threadIndex]: funcs.filter(index => index !== funcIndex),
        });
      }
    }
  }
  return state;
}
const urlStateReducer: Reducer<URLState> = (regularUrlStateReducer => (state: URLState, action: Action): URLState => {
  switch (action.type) {
    case '@@urlenhancer/updateURLState':
      return action.urlState;
    default:
      return regularUrlStateReducer(state, action);
  }
})(combineReducers({
  dataSource, hash, profileURL, selectedTab, rangeFilters, selectedThread,
  callTreeSearchString, callTreeFilters, implementation, invertCallstack,
  hidePlatformDetails, pruneFunctions, pruneSubtree,
}));
export default urlStateReducer;

const getURLState = (state: State): URLState => state.urlState;

export const getDataSource = (state: State) => getURLState(state).dataSource;
export const getHash = (state: State) => getURLState(state).hash;
export const getProfileURL = (state: State) => getURLState(state).profileURL;
export const getRangeFilters = (state: State) => getURLState(state).rangeFilters;
export const getImplementationFilter = (state: State) => getURLState(state).implementation;
export const getHidePlatformDetails = (state: State) => getURLState(state).hidePlatformDetails;
export const getInvertCallstack = (state: State) => getURLState(state).invertCallstack;
export const getSearchString = (state: State) => getURLState(state).callTreeSearchString;
export const getSelectedTab = (state: State) => getURLState(state).selectedTab;
export const getSelectedThreadIndex = (state: State) => getURLState(state).selectedThread;
export const getCallTreeFilters = (state: State, threadIndex: ThreadIndex): CallTreeFilter[] => {
  return getURLState(state).callTreeFilters[threadIndex] || EMPTY_ARRAY;
};
export const getPruneFunctionsList = (state: State, threadIndex: ThreadIndex) => {
  return getURLState(state).pruneFunctions[threadIndex] || EMPTY_ARRAY;
};
export const getPruneSubtreeList = (state: State, threadIndex: ThreadIndex) => {
  return getURLState(state).pruneSubtree[threadIndex] || EMPTY_ARRAY;
};

export const getURLPredictor = createSelector(
  getURLState,
  (oldURLState: URLState) => actionOrActionList => {
    const actionList = ('type' in actionOrActionList) ? [actionOrActionList] : actionOrActionList;
    const newURLState = actionList.reduce(urlStateReducer, oldURLState);
    return urlFromState(newURLState);
  }
);

export const getRangeFilterLabels = createSelector(
  getRangeFilters,
  RangeFilters.getRangeFilterLabels
);
