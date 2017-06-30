/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import type { TransformPipeline, RangeFilterTransform } from '../types/reducers';
import type { Action } from '../types/actions';

export default function transformPipeline(state: TransformPipeline = [], action: Action) {
  switch (action.type) {
    /**
     * Range filters are the first filter to be applied in the transform pipeline. They
     * form a stack, so when adding one, add it to the end of the existing range filters.
     */
    case 'ADD_RANGE_FILTER': {
      const i = _findLastRangeFilterIndex(state);
      const { start, end } = action;
      const transform: RangeFilterTransform = { start, end, type: 'RANGE_FILTER' };
      return [
        ...state.slice(0, i),
        transform,
        ...state.slice(i),
      ];
    }
    /**
     * Find the last range filter in the transform pipeline and remove it.
     */
    case 'POP_RANGE_FILTERS': {
      const i = _findLastRangeFilterIndex(state);
      return [
        ...state.slice(0, i - 1),
        ...state.slice(i),
      ];
    }
    default:
      return state;
  }
}

function _findLastRangeFilterIndex(transforms: TransformPipeline) {
  let i;
  for (i = 0; i < transforms.length; i++) {
    if (transforms[i].type === 'RANGE_FILTER') {
      continue;
    }
    break;
  }
  return i;
}
