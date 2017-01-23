import 'babel-polyfill';
import { describe, it } from 'mocha';
import { assert } from 'chai';
import { blankStore, storeWithProfile } from './fixtures/stores';
import { getProfile, selectedThreadSelectors } from '../../selectors';
import { receiveProfileFromAddon } from '../';

const profile = require('../../../common/test/fixtures/profile-2d-canvas.json');

describe('actions', function () {
  it('can take a profile from an addon and save it to state', function () {
    const store = blankStore();

    assert.deepEqual(getProfile(store.getState()), {}, 'No profile initially exists');
    store.dispatch(receiveProfileFromAddon(profile));
    assert.strictEqual(getProfile(store.getState()), profile, 'The passed in profile is saved in state.');
  });

  describe('getStackTimingByDepth', function () {
    it('computes unfiltered stack timing by depth', function () {
      const store = storeWithProfile();
      const stackTimingByDepth = selectedThreadSelectors.getStackTimingByDepth(store.getState());
      assert.deepEqual(stackTimingByDepth, [
        {
          'start': [0],
          'end': [10],
          'stack': [0],
          'length': 1,
        },
        {
          'start': [0, 5],
          'end': [4, 10],
          'stack': [1, 1],
          'length': 2,
        },
        {
          'start': [1, 3, 6],
          'end': [3, 4, 10],
          'stack': [2, 3, 4],
          'length': 3,
        },
        {
          'start': [7],
          'end': [9],
          'stack': [5],
          'length': 1,
        },
        {
          'start': [8],
          'end': [9],
          'stack': [8],
          'length': 1,
        },
      ]);
    });
  });
});
