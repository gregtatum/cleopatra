/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import * as React from 'react';

// This module is mocked.
import copy from 'copy-to-clipboard';

import {
  TimelineMarkersOverview,
  MIN_MARKER_WIDTH,
} from '../../components/timeline/Markers';
import MarkerContextMenu from '../../components/shared/MarkerContextMenu';
import { overlayFills } from '../../profile-logic/marker-styles';
import { render, fireEvent } from 'react-testing-library';
import { Provider } from 'react-redux';
import mockCanvasContext from '../fixtures/mocks/canvas-context';
import { storeWithProfile } from '../fixtures/stores';
import { getProfileWithMarkers } from '../fixtures/profiles/processed-profile';
import {
  getBoundingBox,
  getMouseEvent,
  addRootOverlayElement,
  removeRootOverlayElement,
} from '../fixtures/utils';
import mockRaf from '../fixtures/mocks/request-animation-frame';
import { ensureExists } from '../../utils/flow';

import type { CssPixels } from '../../types/units';

function setupWithMarkers({ rangeStart, rangeEnd }, ...markersPerThread) {
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

  function flushRafTwice() {
    // We need to flush twice since when the first flush is run, it
    // will request more code to be run in later animation frames.
    flushRafCalls();
    flushRafCalls();
  }

  function flushDrawLog() {
    return ctx.__flushDrawLog();
  }

  const profile = getProfileWithMarkers(...markersPerThread);

  const renderResult = render(
    <Provider store={storeWithProfile(profile)}>
      <>
        <TimelineMarkersOverview
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          threadIndex={0}
          onSelect={() => {}}
        />
        <MarkerContextMenu />
      </>
    </Provider>
  );

  flushRafTwice();

  function getContextMenu() {
    return ensureExists(
      renderResult.container.querySelector('.react-contextmenu'),
      `Couldn't find the context menu.`
    );
  }

  function clickOnMenuItem(stringOrRegexp) {
    fireEvent.click(renderResult.getByText(stringOrRegexp));
  }

  function fireMouseEvent(eventName, options) {
    fireEvent(
      ensureExists(
        renderResult.container.querySelector('canvas'),
        `Couldn't find the canvas element`
      ),
      getMouseEvent(eventName, options)
    );
  }

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

  // Note to a future developer: the x/y values can be derived from the
  // array returned by ctx.__flushDrawLog().
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

    flushRafTwice();
  }

  function mouseOver(where: { x: CssPixels, y: CssPixels }) {
    const positioningOptions = getPositioningOptions(where);
    fireMouseEvent('mousemove', positioningOptions);
    flushRafTwice();
  }

  return {
    flushDrawLog,
    flushRafTwice,
    rightClick,
    mouseOver,
    getContextMenu,
    clickOnMenuItem,
    ...renderResult,
  };
}

describe('TimelineMarkers', function() {
  it('renders correctly', () => {
    window.devicePixelRatio = 1;

    const { container, flushDrawLog } = setupWithMarkers(
      { rangeStart: 0, rangeEnd: 15 },
      [
        ['Marker A', 0, { startTime: 0, endTime: 10 }],
        ['Marker B', 0, { startTime: 0, endTime: 10 }],
        ['Marker C', 5, { startTime: 5, endTime: 15 }],
        [
          'BHR-detected hang',
          5,
          { type: 'BHR-detected hang', startTime: 2, endTime: 13 },
        ],
        [
          'LongTask',
          6,
          {
            type: 'MainThreadLongTask',
            category: 'LongTask',
            startTime: 2,
            endTime: 6,
          },
        ],
        [
          'LongIdleTask',
          8,
          {
            type: 'MainThreadLongTask',
            category: 'LongTask',
            startTime: 6,
            endTime: 8,
          },
        ],
      ]
    );

    const drawCalls = flushDrawLog();

    expect(container.firstChild).toMatchSnapshot();
    expect(drawCalls).toMatchSnapshot();

    delete window.devicePixelRatio;
  });

  it('does not render several dot markers in the same position', () => {
    window.devicePixelRatio = 2;

    const { flushDrawLog } = setupWithMarkers(
      { rangeStart: 0, rangeEnd: 15000 },
      [
        // 2 very close dot markers. They shouldn't be drawn both together.
        ['Marker A', 5000, null],
        ['Marker B', 5001, null],
        // This is a longer marker starting at the same place, it should always be drawn
        ['Marker C', 5001, { startTime: 5001, endTime: 7000 }],
      ]
    );

    const drawCalls = flushDrawLog();

    // We filter on height to get only 1 relevant fillRect operation for each marker.
    const fillRectOperations = drawCalls.filter(
      ([operation, , , , height]) => operation === 'fillRect' && height > 1
    );

    // Here 2 markers should be drawn: the first dot, and the long marker.
    expect(fillRectOperations).toHaveLength(2);
    expect(
      fillRectOperations.every(
        ([, , , width]) => width >= MIN_MARKER_WIDTH / window.devicePixelRatio
      )
    ).toBe(true);

    delete window.devicePixelRatio;
  });

  describe('displays context menus', () => {
    beforeEach(() => {
      // Always use fake timers when dealing with context menus.
      jest.useFakeTimers();
      // We will be hovering over element with a tooltip. It requires root overlay
      // element to be present in DOM
      addRootOverlayElement();
    });

    afterEach(removeRootOverlayElement);

    it('when right clicking on a marker', () => {
      const { rightClick, getContextMenu, clickOnMenuItem } = setupWithMarkers(
        { rangeStart: 0, rangeEnd: 10 },
        [['Marker A', 0, { startTime: 0, endTime: 10 }]]
      );

      // The "Marker A" marker is drawn from 0,0 to 5,200.
      rightClick({ x: 50, y: 2 });

      jest.runAllTimers();

      expect(getContextMenu()).toHaveClass('react-contextmenu--visible');

      clickOnMenuItem('Copy');

      expect(copy).toHaveBeenLastCalledWith('Marker A');
      expect(getContextMenu()).not.toHaveClass('react-contextmenu--visible');

      jest.runAllTimers();

      expect(document.querySelector('react-contextmenu')).toBeFalsy();
    });

    it('when right clicking on markers in a sequence', () => {
      const { rightClick, getContextMenu, clickOnMenuItem } = setupWithMarkers(
        { rangeStart: 0, rangeEnd: 10 },
        [
          ['Marker A', 0, { startTime: 0, endTime: 3 }],
          ['Marker B', 0, { startTime: 6, endTime: 10 }],
        ]
      );

      // The "Marker A" marker is drawn from 0,0 to 5,60.
      rightClick({ x: 30, y: 2 });
      jest.runAllTimers();

      // The "Marker B" marker is drawn from 0,120 to 5,200.
      rightClick({ x: 160, y: 2 });
      jest.runAllTimers();

      expect(getContextMenu()).toHaveClass('react-contextmenu--visible');

      clickOnMenuItem('Copy');
      expect(copy).toHaveBeenLastCalledWith('Marker B');

      expect(getContextMenu()).not.toHaveClass('react-contextmenu--visible');

      jest.runAllTimers();
      expect(document.querySelector('react-contextmenu')).toBeFalsy();
    });

    it('and still highlights other markers when hovering them', () => {
      const {
        rightClick,
        mouseOver,
        flushDrawLog,
        getContextMenu,
      } = setupWithMarkers({ rangeStart: 0, rangeEnd: 10 }, [
        ['Marker A', 0, { startTime: 0, endTime: 3 }],
        ['Marker B', 0, { startTime: 6, endTime: 10 }],
      ]);

      // The "Marker A" marker is drawn from 0,0 to 5,60.
      rightClick({ x: 30, y: 2 });
      expect(getContextMenu()).toHaveClass('react-contextmenu--visible');

      flushDrawLog();
      // The "Marker B" marker is drawn from 0,120 to 5,200.
      mouseOver({ x: 160, y: 1 });

      const drawCalls = flushDrawLog();

      // Expect that we have one marker with hovered color
      const callsWithHoveredColor = drawCalls.filter(
        ([, argument]) => argument === overlayFills.HOVERED
      );
      expect(callsWithHoveredColor).toHaveLength(1);
    });
  });
});
