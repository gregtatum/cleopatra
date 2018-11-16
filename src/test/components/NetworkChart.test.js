/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import * as React from 'react';
import { mount } from 'enzyme';
import { Provider } from 'react-redux';

import { changeMarkersSearchString } from '../../actions/profile-view';
import NetworkChart from '../../components/network-chart';
import { changeSelectedTab } from '../../actions/app';

import EmptyReasons from '../../components/shared/EmptyReasons';
import mockCanvasContext from '../fixtures/mocks/canvas-context';
import { storeWithProfile } from '../fixtures/stores';
import {
  getProfileWithMarkers,
  getNetworkMarker,
} from '../fixtures/profiles/make-profile';
import { getBoundingBox } from '../fixtures/utils';
import mockRaf from '../fixtures/mocks/request-animation-frame';
import { type NetworkPayload } from '../../types/markers';

const NETWORK_MARKERS = Array(10)
  .fill()
  .map((_, i) => getNetworkMarker(3 + 0.1 * i, i));

function setupWithProfile(profile) {
  const flushRafCalls = mockRaf();
  const ctx = mockCanvasContext();
  jest
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation(() => ctx);

  // Ideally we'd want this only on the Canvas and on ChartViewport, but this is
  // a lot easier to mock this everywhere.
  jest
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(() => getBoundingBox(200, 300));

  const store = storeWithProfile(profile);
  store.dispatch(changeSelectedTab('network-chart'));

  const networkChart = mount(
    <Provider store={store}>
      <NetworkChart />
    </Provider>
  );

  return {
    networkChart,
    flushRafCalls,
    dispatch: store.dispatch,
    flushDrawLog: () => ctx.__flushDrawLog(),
  };
}

function setupWithPayload(payload: NetworkPayload) {
  const profile = getProfileWithMarkers([['Network', 0, payload]]);

  const { flushRafCalls, dispatch, networkChart } = setupWithProfile(profile);

  dispatch(changeSelectedTab('network-chart'));
  networkChart.update();
  flushRafCalls();
  return { networkChart };
}

describe('NetworkChart', function() {
  it('matches the snapshot', () => {
    const profile = getProfileWithMarkers([...NETWORK_MARKERS]);
    const {
      flushRafCalls,
      dispatch,
      networkChart,
      flushDrawLog,
    } = setupWithProfile(profile);

    dispatch(changeSelectedTab('network-chart'));
    networkChart.update();
    flushRafCalls();

    const drawCalls = flushDrawLog();
    expect(networkChart).toMatchSnapshot();
    expect(drawCalls).toMatchSnapshot();
  });

  describe('NetworkChartRowBar', function() {
    it('has some description of the width', () => {
      const { networkChart } = setupWithPayload({
        // Fill this in with real payload information, possibly with some additional
        // logic to provide defaults in the helper function.
        type: 'Network',
        URI: '',
        RedirectURI: '',
        id: 10,
        pri: 10,
        count: 10,
        dur: 20,
        status: 'SOME_STATUS',
        startTime: 10,
        endTime: 20,
        requestStart: 10,
        responseStart: 15,
        responseEnd: 20,
        title: 'Load',
        name: 'Name',
      });

      expect(
        // I think this is how you get at the style, I didn't actually run this:
        networkChart.find('.networkChartRowItemBarRequestQueue').prop('style')
      ).toHaveProperty('width', '30%');
      // Then repeat here for the other pbars.
    });

    it('has some description of the width', () => {
      // ...
      // Repeat until all the `if` branches are covered through `npm test-coverage`
    });
  });

  describe('url shortening', function() {
    function setupWithUrl(url: string) {
      return setupWithPayload({
        // Fill this in with real payload information, possibly with some additional
        // logic to provide defaults in the helper function.
        type: 'Network',
        URI: url,
        RedirectURI: '',
        id: 10,
        pri: 10,
        count: 10,
        dur: 20,
        status: 'SOME_STATUS',
        startTime: 10,
        endTime: 20,
        requestStart: 10,
        responseStart: 15,
        responseEnd: 20,
        title: 'Load',
        name: 'Name',
      });
    }

    it('splits up a url by some strategy', function() {
      const { networkChart } = setupWithUrl('http://mozilla.org/script.js');
      expect(
        // Find the URL shortening parts
        networkChart
          .find('.networkChartRowItemLabel span span')
          .map(node => [node.prop('className'), node.text()])
      ).toEqual([
        // Then assert that it's broken up as expected
        ['networkChartRowItemUriOptional', 'http://'],
        ['networkChartRowItemUriRequired', 'mozilla.org'],
        ['networkChartRowItemUriOptional', '/script.js'],
      ]);
    });

    it('splits up a url by some strategy', function() {
      // Repeat for all the different cases.
    });
  });
});

describe('EmptyReasons', () => {
  it("shows a reason when a profile's network markers have been filtered out", () => {
    const profile = getProfileWithMarkers(NETWORK_MARKERS);
    const { dispatch, networkChart } = setupWithProfile(profile);

    dispatch(changeSelectedTab('network-chart'));
    dispatch(changeMarkersSearchString('MATCH_NOTHING'));
    networkChart.update();
    expect(networkChart.find(EmptyReasons)).toMatchSnapshot();
  });
});
