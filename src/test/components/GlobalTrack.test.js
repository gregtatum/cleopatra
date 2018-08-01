/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import * as React from 'react';
import { Provider } from 'react-redux';
import { mount } from 'enzyme';

import {
  changeSelectedThread,
  hideGlobalTrack,
} from '../../actions/profile-view';
import GlobalTrack from '../../components/timeline/GlobalTrack';
import {
  getGlobalTracks,
  getRightClickedTrack,
} from '../../reducers/profile-view';
import { getSelectedThreadIndex } from '../../reducers/url-state';
import { getProfileWithNiceTracks } from '../fixtures/profiles/tracks';
import { storeWithProfile } from '../fixtures/stores';
import { getMouseEvent } from '../fixtures/utils';

const LEFT_CLICK = 0;
const RIGHT_CLICK = 2;

describe('timeline/GlobalTrack', function() {
  /**
   *  getProfileWithNiceTracks() looks like: [
   *    'show [thread GeckoMain process]',
   *    'show [thread GeckoMain tab]',       <- use this global track.
   *    '  - show [thread DOM Worker]',
   *    '  - show [thread Style]',
   *  ]
   */
  function setup() {
    const trackIndex = 1;
    const profile = getProfileWithNiceTracks();
    const store = storeWithProfile(profile);
    const { getState, dispatch } = store;
    const trackReference = { type: 'global', trackIndex };
    const tracks = getGlobalTracks(getState());
    const track = tracks[trackIndex];
    if (track.type !== 'process') {
      throw new Error('Expected a process track.');
    }
    const threadIndex = track.mainThreadIndex;
    if (threadIndex === null) {
      throw new Error('Expected the track to have a thread index.');
    }

    // The assertions are simpler if this thread is not already selected.
    dispatch(changeSelectedThread(threadIndex + 1));

    const view = mount(
      <Provider store={store}>
        <GlobalTrack trackIndex={trackIndex} trackReference={trackReference} />
      </Provider>
    );

    const globalTrackLabel = view.find('.timelineTrackLabel').first();
    const globalTrackRow = view.find('.timelineTrackGlobalRow').first();

    return {
      dispatch,
      getState,
      profile,
      store,
      view,
      trackReference,
      trackIndex,
      threadIndex,
      globalTrackLabel,
      globalTrackRow,
    };
  }

  it('matches the snapshot of a global track', () => {
    const { view } = setup();
    expect(view).toMatchSnapshot();
  });

  it('has the correct selectors into useful parts of the component', function() {
    const { globalTrackLabel, globalTrackRow } = setup();
    expect(globalTrackLabel.text()).toBe('Content');
    expect(globalTrackRow.exists()).toBe(true);
  });

  it('starts out not being selected', function() {
    const { getState, threadIndex, trackReference } = setup();
    expect(getRightClickedTrack(getState())).not.toEqual(trackReference);
    expect(getSelectedThreadIndex(getState())).not.toBe(threadIndex);
  });

  it('can select a thread by clicking the label', () => {
    const { getState, globalTrackLabel, threadIndex } = setup();
    expect(getSelectedThreadIndex(getState())).not.toBe(threadIndex);
    globalTrackLabel.simulate(
      'mousedown',
      getMouseEvent({ button: LEFT_CLICK })
    );
    expect(getSelectedThreadIndex(getState())).toBe(threadIndex);
  });

  it('can right click a thread', () => {
    const { getState, globalTrackLabel, threadIndex, trackReference } = setup();

    globalTrackLabel.simulate(
      'mousedown',
      getMouseEvent({ button: RIGHT_CLICK })
    );
    expect(getRightClickedTrack(getState())).toEqual(trackReference);
    expect(getSelectedThreadIndex(getState())).not.toBe(threadIndex);
  });

  it('can select a thread by clicking the row', () => {
    const { getState, globalTrackRow, threadIndex } = setup();
    expect(getSelectedThreadIndex(getState())).not.toBe(threadIndex);
    globalTrackRow.simulate('click');
    expect(getSelectedThreadIndex(getState())).toBe(threadIndex);
  });

  it('will render a stub div if the track is hidden', () => {
    const { view, trackIndex, dispatch } = setup();
    dispatch(hideGlobalTrack(trackIndex));
    view.update();
    expect(view.find('.timelineTrackHidden').exists()).toBe(true);
    expect(view.find('.timelineTrack').exists()).toBe(false);
  });
});