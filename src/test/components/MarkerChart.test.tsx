/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import * as React from 'react';
import { render, fireEvent } from 'react-testing-library';
import { Provider } from 'react-redux';

// This module is mocked.
import copy from 'copy-to-clipboard';

import { changeMarkersSearchString } from '../../actions/profile-view';
import {
  TIMELINE_MARGIN_LEFT,
  TIMELINE_MARGIN_RIGHT,
} from '../../app-logic/constants';
import MarkerChart from '../../components/marker-chart';
import MarkerContextMenu from '../../components/shared/MarkerContextMenu';
import { changeSelectedTab } from '../../actions/app';
import { ensureExists } from '../../utils/flow';

import mockCanvasContext from '../fixtures/mocks/canvas-context';
import { storeWithProfile } from '../fixtures/stores';
import { getProfileWithMarkers } from '../fixtures/profiles/processed-profile';
import {
  getBoundingBox,
  getMouseEvent,
  addRootOverlayElement,
  removeRootOverlayElement,
  findFillTextPositionFromDrawLog,
} from '../fixtures/utils';
import mockRaf from '../fixtures/mocks/request-animation-frame';

import type { UserTimingMarkerPayload } from '../../types/markers';
import type { CssPixels } from '../../types/units';

const MARKERS = [
  ['Marker A', 0, { startTime: 0, endTime: 10 }],
  ['Marker A', 0, { startTime: 0, endTime: 10 }],
  ['Marker A', 11, { startTime: 11, endTime: 15 }],
  [
    'Very very very very very very Very very very very very very Very very very very very very Very very very very very very Very very very very very very long Marker D',
    6,
    { startTime: 5, endTime: 15 },
  ],
  ['Dot marker E', 4, { startTime: 4, endTime: 4 }],
  ['Non-interval marker F without data', 7, null],
  [
    'Marker G type DOMEvent',
    5,
    {
      type: 'tracing',
      category: 'DOMEvent',
      eventType: 'click',
      interval: 'start',
      phase: 2,
    },
  ],
  [
    'Marker G type DOMEvent',
    10,
    {
      type: 'tracing',
      category: 'DOMEvent',
      eventType: 'click',
      interval: 'end',
      phase: 2,
    },
  ],
  [
    'Marker H with no start',
    3,
    {
      type: 'tracing',
      category: 'Paint',
      interval: 'end',
    },
  ],
  [
    'Marker H with no end',
    9,
    {
      type: 'tracing',
      category: 'Paint',
      interval: 'start',
    },
  ],
  getUserTiming('Marker B', 2, 8),
];

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
    .mockImplementation(() =>
      getBoundingBox(200 + TIMELINE_MARGIN_LEFT + TIMELINE_MARGIN_RIGHT, 300)
    );

  const store = storeWithProfile(profile);
  store.dispatch(changeSelectedTab('marker-chart'));

  const renderResult = render(
    <Provider store={store}>
      <>
        <MarkerContextMenu />
        <MarkerChart />
      </>
    </Provider>
  );

  const { container } = renderResult;

  function fireMouseEvent(eventName, options) {
    fireEvent(
      ensureExists(
        container.querySelector('canvas'),
        `Couldn't find the canvas element`
      ),
      getMouseEvent(eventName, options)
    );
  }

  return {
    ...renderResult,
    ...store,
    flushRafCalls,
    flushDrawLog: () => ctx.__flushDrawLog(),
    fireMouseEvent,
  };
}

describe('MarkerChart', function() {
  beforeEach(addRootOverlayElement);
  afterEach(removeRootOverlayElement);

  it('renders the normal marker chart and matches the snapshot', () => {
    window.devicePixelRatio = 2;

    const profile = getProfileWithMarkers([...MARKERS]);
    const {
      container,
      flushRafCalls,
      dispatch,
      flushDrawLog,
    } = setupWithProfile(profile);

    dispatch(changeSelectedTab('marker-chart'));
    flushRafCalls();

    const drawCalls = flushDrawLog();
    expect(container.firstChild).toMatchSnapshot();
    expect(drawCalls).toMatchSnapshot();

    delete window.devicePixelRatio;
  });

  it('does not render several dot markers on the same pixel', () => {
    window.devicePixelRatio = 1;
    const rowName = 'TestMarker';

    const markers = [
      // RENDERED: This marker defines the start of our range.
      [rowName, 0, null],
      // RENDERED: Now create three "dot" markers that should only be rendered once.
      [rowName, 5000, null],
      // NOT-RENDERED: This marker has a duration, but it's very small, and would get
      // rendered as a dot.
      [rowName, 5001, { startTime: 5001, endTime: 5001.1 }],
      // NOT-RENDERED: The final dot marker
      [rowName, 5002, null],
      // RENDERED: This is a longer marker, it should always be drawn even if it starts
      // at the same location as a dot marker
      [rowName, 5002, { startTime: 5002, endTime: 7000 }],
      // RENDERED: Add a final marker that's quite far away to have a big time range.
      [rowName, 15000, null],
    ];

    const profile = getProfileWithMarkers(markers);
    const { flushRafCalls, flushDrawLog } = setupWithProfile(profile);
    flushRafCalls();

    const drawCalls = flushDrawLog();

    // Check that we have 3 arc operations (first marker, one of the 2 dot
    // markers in the middle, and last marker)
    const arcOperations = drawCalls.filter(
      ([operation]) => operation === 'arc'
    );
    expect(arcOperations).toHaveLength(3);

    // Check that all X values are different
    const arcOperationsX = new Set(arcOperations.map(([, x]) => Math.round(x)));
    expect(arcOperationsX.size).toBe(3);

    // Check that we have a fillRect operation for the longer marker.
    // We filter on the height to get only 1 relevant fillRect operation per marker
    const fillRectOperations = drawCalls.filter(
      ([operation, , , , height]) =>
        operation === 'fillRect' && height > 1 && height < 16
    );
    expect(fillRectOperations).toHaveLength(1);

    delete window.devicePixelRatio;
  });

  it('renders the hoveredItem markers properly', () => {
    window.devicePixelRatio = 1;

    const profile = getProfileWithMarkers(MARKERS);
    const {
      flushRafCalls,
      dispatch,
      flushDrawLog,
      fireMouseEvent,
    } = setupWithProfile(profile);

    dispatch(changeSelectedTab('marker-chart'));
    flushRafCalls();
    // No tooltip displayed yet
    expect(document.querySelector('.tooltip')).toBeFalsy();

    {
      const drawLog = flushDrawLog();

      const { x, y } = findFillTextPositionFromDrawLog(drawLog, 'Marker B');

      // Move the mouse on top of an item.
      fireMouseEvent('mousemove', {
        offsetX: x,
        offsetY: y,
        pageX: x,
        pageY: y,
      });
    }

    flushRafCalls();

    const drawLog = flushDrawLog();
    if (drawLog.length === 0) {
      throw new Error('The mouse move produced no draw commands.');
    }
    expect(drawLog).toMatchSnapshot();

    // The tooltip should be displayed
    expect(
      ensureExists(
        document.querySelector('.tooltip'),
        'A tooltip component must exist for this test.'
      )
    ).toMatchSnapshot();
  });

  it('only renders a single row when hovering', () => {
    window.devicePixelRatio = 1;

    const profile = getProfileWithMarkers(MARKERS);
    const {
      flushRafCalls,
      dispatch,
      flushDrawLog,
      fireMouseEvent,
    } = setupWithProfile(profile);

    dispatch(changeSelectedTab('marker-chart'));
    flushRafCalls();

    const drawLogBefore = flushDrawLog();

    const { x, y } = findFillTextPositionFromDrawLog(drawLogBefore, 'Marker B');

    // Move the mouse on top of an item.
    fireMouseEvent('mousemove', {
      offsetX: x,
      offsetY: y,
      pageX: x,
      pageY: y,
    });

    flushRafCalls();

    const drawLogAfter = flushDrawLog();

    // As a rough test of better performance, assert that at least half as many draw
    // calls were issued for a hovered event.
    expect(drawLogBefore.length > drawLogAfter.length * 2).toBe(true);
  });

  describe('context menus', () => {
    beforeEach(() => {
      // Always use fake timers when dealing with context menus.
      jest.useFakeTimers();
    });

    function setupForContextMenus() {
      const profile = getProfileWithMarkers([
        getUserTiming('UserTiming A', 0, 10),
        getUserTiming('UserTiming B', 2, 8),
      ]);
      const setupResult = setupWithProfile(profile);
      const {
        flushRafCalls,
        dispatch,
        flushDrawLog,
        fireMouseEvent,
        container,
        getByText,
      } = setupResult;

      dispatch(changeSelectedTab('marker-chart'));
      flushRafCalls();
      const drawLog = flushDrawLog();

      function getPositioningOptions({ x, y }) {
        // These positioning options will be sent to all our mouse events. Note
        // that the values aren't really consistent, especially offsetY and
        // pageY shouldn't be the same, but in the context of our test this will
        // be good enough.
        // pageX/Y values control the position of the tooltip so it's not super
        // important.
        // offsetX/Y are more important as they're used to find which node is
        // actually clicked.
        const positioningOptions = {
          offsetX: x,
          offsetY: y,
          clientX: x,
          clientY: y,
          pageX: x,
          pageY: y,
        };

        return positioningOptions;
      }

      function rightClick(where: { x: CssPixels, y: CssPixels }) {
        const positioningOptions = getPositioningOptions(where);
        const clickOptions = {
          ...positioningOptions,
          button: 2,
          buttons: 2,
        };

        // Because different components listen to different events, we trigger
        // all the right events, to be as close as possible to the real stuff.
        fireMouseEvent('mousemove', positioningOptions);
        fireMouseEvent('mousedown', clickOptions);
        fireMouseEvent('mouseup', clickOptions);
        fireMouseEvent('contextmenu', clickOptions);
        flushRafCalls();
      }

      function mouseOver(where: { x: CssPixels, y: CssPixels }) {
        const positioningOptions = getPositioningOptions(where);
        fireMouseEvent('mousemove', positioningOptions);
        flushRafCalls();
      }

      function clickOnMenuItem(stringOrRegexp) {
        fireEvent.click(getByText(stringOrRegexp));
      }

      function findFillTextPosition(
        fillText: string
      ): {| x: number, y: number |} {
        return findFillTextPositionFromDrawLog(drawLog, fillText);
      }

      const getContextMenu = () =>
        ensureExists(
          container.querySelector('.react-contextmenu'),
          `Couldn't find the context menu.`
        );

      return {
        ...setupResult,
        rightClick,
        mouseOver,
        getContextMenu,
        findFillTextPosition,
        clickOnMenuItem,
      };
    }

    it('displays when right clicking on a marker', () => {
      const {
        rightClick,
        clickOnMenuItem,
        getContextMenu,
        findFillTextPosition,
      } = setupForContextMenus();

      rightClick(findFillTextPosition('UserTiming A'));

      expect(getContextMenu()).toHaveClass('react-contextmenu--visible');

      clickOnMenuItem('Copy');
      expect(copy).toHaveBeenLastCalledWith('UserTiming A');
      expect(getContextMenu()).not.toHaveClass('react-contextmenu--visible');

      jest.runAllTimers();
      expect(document.querySelector('react-contextmenu')).toBeFalsy();
    });

    it('displays when right clicking on markers in a sequence', () => {
      const {
        rightClick,
        clickOnMenuItem,
        getContextMenu,
        findFillTextPosition,
      } = setupForContextMenus();

      rightClick(findFillTextPosition('UserTiming A'));
      expect(getContextMenu()).toHaveClass('react-contextmenu--visible');

      rightClick(findFillTextPosition('UserTiming B'));
      jest.runAllTimers();

      expect(getContextMenu()).toHaveClass('react-contextmenu--visible');
      clickOnMenuItem('Copy');
      expect(copy).toHaveBeenLastCalledWith('UserTiming B');
    });

    it('displays and still highlights other markers when hovering them', () => {
      const {
        rightClick,
        mouseOver,
        flushDrawLog,
        getContextMenu,
        findFillTextPosition,
      } = setupForContextMenus();

      rightClick(findFillTextPosition('UserTiming A'));
      expect(getContextMenu()).toHaveClass('react-contextmenu--visible');

      flushDrawLog();
      // The "click" DOMEvent marker is drawn from 213,129 to 275.5,109.
      mouseOver(findFillTextPosition('UserTiming B'));

      // Expect that we have 2 markers drawn with this color.
      const drawCalls = flushDrawLog();
      const callsWithHighlightColor = drawCalls.filter(
        ([, argument]) => argument === 'Highlight'
      );
      expect(callsWithHighlightColor).toHaveLength(2);
    });
  });

  describe('with search strings', function() {
    function getFillTextCalls(drawCalls) {
      return drawCalls
        .filter(([methodName]) => methodName === 'fillText')
        .map(([_, text]) => text);
    }

    const searchString = 'Dot marker E';

    it('renders lots of markers initially', function() {
      const profile = getProfileWithMarkers(MARKERS);
      const { flushRafCalls, flushDrawLog } = setupWithProfile(profile);

      flushRafCalls();
      const text = getFillTextCalls(flushDrawLog());
      expect(text.length).toBeGreaterThan(1);
      // Check that our test search string is in here:
      expect(text.filter(t => t === searchString).length).toBe(1);
    });

    it('renders only the marker that was searched for', function() {
      const profile = getProfileWithMarkers(MARKERS);
      const { flushRafCalls, dispatch, flushDrawLog } = setupWithProfile(
        profile
      );

      // Flush out any existing draw calls.
      flushRafCalls();
      flushDrawLog();

      // Update the chart with a search string.
      dispatch(changeMarkersSearchString(searchString));
      flushRafCalls();

      const text = getFillTextCalls(flushDrawLog());
      expect(text).toEqual(['Dot marker E', 'Idle']);
    });
  });

  describe('EmptyReasons', () => {
    it('shows a reason when a profile has no markers', () => {
      const profile = getProfileWithMarkers([]);
      const { dispatch, container } = setupWithProfile(profile);

      dispatch(changeSelectedTab('marker-chart'));
      expect(container.querySelector('.EmptyReasons')).toMatchSnapshot();
    });

    it("shows a reason when a profile's markers have been filtered out", () => {
      const profile = getProfileWithMarkers(MARKERS);
      const { dispatch, container } = setupWithProfile(profile);

      dispatch(changeSelectedTab('marker-chart'));
      dispatch(changeMarkersSearchString('MATCH_NOTHING'));
      expect(container.querySelector('.EmptyReasons')).toMatchSnapshot();
    });
  });
});

/**
 * This is a quick helper to create UserTiming markers.
 */
function getUserTiming(name: string, startTime: number, endTime: number): * {
  return [
    'UserTiming',
    startTime,
    ({
      type: 'UserTiming',
      startTime,
      endTime,
      name,
      entryType: 'measure',
    }: UserTimingMarkerPayload),
  ];
}
