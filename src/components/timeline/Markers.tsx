/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import * as React from 'react';
import classNames from 'classnames';

import { markerStyles, overlayFills } from '../../profile-logic/marker-styles';
import { withSize } from '../shared/WithSize';
import Tooltip from '../tooltip/Tooltip';
import { TooltipMarker } from '../tooltip/Marker';
import { timeCode } from '../../utils/time-code';
import explicitConnect from '../../utils/connect';
import { getPreviewSelection } from '../../selectors/profile';
import { getThreadSelectors } from '../../selectors/per-thread';
import { getSelectedThreadIndex } from '../../selectors/url-state';
import { changeRightClickedMarker } from '../../actions/profile-view';
import ContextMenuTrigger from '../shared/ContextMenuTrigger';
import './Markers.css';

import type { Milliseconds, CssPixels } from '../../types/units';
import type { Marker, MarkerIndex } from '../../types/profile-derived';
import type { SizeProps } from '../shared/WithSize';
import type { ConnectedProps } from '../../utils/connect';
import type { ThreadIndex } from '../../types/profile';

// Exported for tests.
export const MIN_MARKER_WIDTH = 0.3;

type MarkerState = 'PRESSED' | 'HOVERED' | 'NONE';

type MouseEventHandler = (SyntheticMouseEvent<HTMLCanvasElement>) => any;

/**
 * When adding properties to these props, please consider the comment above the component.
 */
type CanvasProps = {|
  +rangeStart: Milliseconds,
  +rangeEnd: Milliseconds,
  +width: CssPixels,
  +height: CssPixels,
  +getMarker: MarkerIndex => Marker,
  +markerIndexes: MarkerIndex[],
  +hoveredItem: Marker | null,
  +mouseDownItem: Marker | null,
  +rightClickedMarker: Marker | null,
  +onMouseDown: MouseEventHandler,
  +onMouseUp: MouseEventHandler,
  +onMouseMove: MouseEventHandler,
  +onMouseOut: MouseEventHandler,
|};

function _drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: CssPixels,
  y: CssPixels,
  width: CssPixels,
  height: CssPixels,
  cornerSize: CssPixels
) {
  // Cut out c x c -sized squares in the corners.
  const c = Math.min(width / 2, Math.min(height / 2, cornerSize));
  const bottom = y + height;
  ctx.fillRect(x + c, y, width - 2 * c, c);
  ctx.fillRect(x, y + c, width, height - 2 * c);
  ctx.fillRect(x + c, bottom - c, width - 2 * c, c);
}

/**
 * This component controls the rendering of the canvas. Every render call through
 * React triggers a new canvas render. Because of this, it's important to only pass
 * in the props that are needed for the canvas draw call.
 */
class TimelineMarkersCanvas extends React.PureComponent<CanvasProps> {
  _canvas: {| current: HTMLCanvasElement | null |} = React.createRef();
  _requestedAnimationFrame: boolean = false;

  _getMarkerState(marker: Marker): MarkerState {
    const { hoveredItem, mouseDownItem, rightClickedMarker } = this.props;

    if (rightClickedMarker === marker) {
      return 'PRESSED';
    }
    if (mouseDownItem !== null) {
      if (marker === mouseDownItem && marker === hoveredItem) {
        return 'PRESSED';
      }
      return 'NONE';
    }
    if (marker === hoveredItem) {
      return 'HOVERED';
    }
    return 'NONE';
  }

  drawCanvas(c: HTMLCanvasElement) {
    const {
      rangeStart,
      rangeEnd,
      width,
      height,
      getMarker,
      markerIndexes,
    } = this.props;

    if (height === 0 || width === 0) {
      // bail out early if the size isn't known yet.
      return;
    }

    const devicePixelRatio = c.ownerDocument
      ? c.ownerDocument.defaultView.devicePixelRatio
      : 1;
    const pixelWidth = Math.round(width * devicePixelRatio);
    const pixelHeight = Math.round(height * devicePixelRatio);

    if (c.width !== pixelWidth || c.height !== pixelHeight) {
      c.width = pixelWidth;
      c.height = pixelHeight;
    }
    const ctx = c.getContext('2d');
    if (ctx === null || ctx === undefined) {
      return;
    }

    ctx.clearRect(0, 0, pixelWidth, pixelHeight);
    ctx.scale(devicePixelRatio, devicePixelRatio);

    let previousPos = null;
    for (const markerIndex of markerIndexes) {
      const marker = getMarker(markerIndex);
      const { start, dur, name } = marker;
      let pos = ((start - rangeStart) / (rangeEnd - rangeStart)) * width;
      pos = Math.round(pos * devicePixelRatio) / devicePixelRatio;

      if (previousPos === pos && dur === 0) {
        // This position has already been drawn, let's move to the next marker!
        continue;
      }
      previousPos = pos;
      const itemWidth = Number.isFinite(dur)
        ? Math.max(
            (dur / (rangeEnd - rangeStart)) * width,
            MIN_MARKER_WIDTH / devicePixelRatio
          )
        : Number.MAX_SAFE_INTEGER;
      const markerStyle =
        name in markerStyles ? markerStyles[name] : markerStyles.default;
      ctx.fillStyle = markerStyle.background;
      if (markerStyle.squareCorners) {
        ctx.fillRect(pos, markerStyle.top, itemWidth, markerStyle.height);
      } else {
        _drawRoundedRect(
          ctx,
          pos,
          markerStyle.top,
          itemWidth,
          markerStyle.height,
          1 / devicePixelRatio
        );
      }
      if (markerStyle.borderLeft !== null) {
        ctx.fillStyle = markerStyle.borderLeft;
        ctx.fillRect(pos, markerStyle.top, 1, markerStyle.height);
      }
      if (markerStyle.borderRight !== null) {
        ctx.fillStyle = markerStyle.borderRight;
        ctx.fillRect(
          pos + itemWidth - 1,
          markerStyle.top,
          1,
          markerStyle.height
        );
      }
      const markerState = this._getMarkerState(marker);
      if (markerState === 'HOVERED' || markerState === 'PRESSED') {
        ctx.fillStyle = overlayFills[markerState];
        if (markerStyle.squareCorners) {
          ctx.fillRect(pos, markerStyle.top, itemWidth, markerStyle.height);
        } else {
          _drawRoundedRect(
            ctx,
            pos,
            markerStyle.top,
            itemWidth,
            markerStyle.height,
            1 / devicePixelRatio
          );
        }
      }
    }
    ctx.scale(1 / devicePixelRatio, 1 / devicePixelRatio);
  }

  _scheduleDraw() {
    if (!this._requestedAnimationFrame) {
      this._requestedAnimationFrame = true;
      window.requestAnimationFrame(() => {
        this._requestedAnimationFrame = false;
        const c = this._canvas.current;
        if (c) {
          timeCode('TimelineMarkersImplementation render', () => {
            this.drawCanvas(c);
          });
        }
      });
    }
  }

  render() {
    this._scheduleDraw();

    return (
      <canvas
        className="timelineMarkersCanvas"
        ref={this._canvas}
        onMouseDown={this.props.onMouseDown}
        onMouseMove={this.props.onMouseMove}
        onMouseUp={this.props.onMouseUp}
        onMouseOut={this.props.onMouseOut}
      />
    );
  }
}

/**
 * The TimelineMarkers component is built up of several nested components,
 * and they are all collected in this file. In pseudo-code, they take
 * the following forms:
 *
 * export const TimelineMarkersJank = (
 *  <Connect markers={JankMarkers}>
 *    <WithSize>
 *      <TimelineMarkers />
 *    </WithSize>
 *  </Connect>
 * );
 *
 * export const TimelineMarkersOverview = (
 *   <Connect markers={AllMarkers}>
 *     <WithSize>
 *       <TimelineMarkers />
 *     </WithSize>
 *   </Connect>
 * );
 */

export type OwnProps = {|
  +rangeStart: Milliseconds,
  +rangeEnd: Milliseconds,
  +threadIndex: ThreadIndex,
  +onSelect: (ThreadIndex, Milliseconds, Milliseconds) => mixed,
|};

export type StateProps = {|
  +additionalClassName?: ?string,
  +getMarker: MarkerIndex => Marker,
  +markerIndexes: MarkerIndex[],
  +isSelected: boolean,
  +isModifyingSelection: boolean,
  +testId: string,
  +rightClickedMarker: Marker | null,
|};

export type DispatchProps = {|
  +changeRightClickedMarker: typeof changeRightClickedMarker,
|};

type Props = {|
  ...ConnectedProps<OwnProps, StateProps, DispatchProps>,
  ...SizeProps,
|};

type State = {
  hoveredItem: Marker | null,
  mouseDownItem: Marker | null,
  mouseX: CssPixels,
  mouseY: CssPixels,
};

class TimelineMarkersImplementation extends React.PureComponent<Props, State> {
  state = {
    hoveredItem: null,
    mouseDownItem: null,
    mouseX: 0,
    mouseY: 0,
  };

  _hitTest(e: SyntheticMouseEvent<HTMLCanvasElement>): MarkerIndex | null {
    const c = e.currentTarget;
    const r = c.getBoundingClientRect();
    const {
      width,
      rangeStart,
      rangeEnd,
      getMarker,
      markerIndexes,
    } = this.props;
    const x = e.pageX - r.left;
    const y = e.pageY - r.top;
    const rangeLength = rangeEnd - rangeStart;
    const time = rangeStart + (x / width) * rangeLength;
    const onePixelTime = (rangeLength / width) * window.devicePixelRatio;

    // Markers are drawn in array order; the one drawn last is on top. So if
    // there are multiple markers under the mouse, we want to find the one
    // with the highest array index. So we walk the list of markers
    // from high index to low index, which is front to back in z-order.
    for (let i = markerIndexes.length - 1; i >= 0; i--) {
      const markerIndex = markerIndexes[i];
      const marker = getMarker(markerIndex);
      const { start, dur, name } = marker;
      const duration = Math.max(dur, onePixelTime);
      if (time < start || time >= start + duration) {
        continue;
      }
      const markerStyle =
        name in markerStyles ? markerStyles[name] : markerStyles.default;
      if (y >= markerStyle.top && y < markerStyle.top + markerStyle.height) {
        return markerIndex;
      }
    }
    return null;
  }

  _getHitMarker = (
    e: SyntheticMouseEvent<HTMLCanvasElement>
  ): Marker | null => {
    const markerIndex = this._hitTest(e);

    if (markerIndex !== null) {
      return this.props.getMarker(markerIndex);
    }

    return null;
  };

  _onMouseMove = (event: SyntheticMouseEvent<HTMLCanvasElement>) => {
    const hoveredItem = this._getHitMarker(event);
    if (hoveredItem !== null) {
      this.setState({
        hoveredItem,
        mouseX: event.pageX,
        mouseY: event.pageY,
      });
    } else if (this.state.hoveredItem !== null) {
      this.setState({
        hoveredItem: null,
      });
    }
  };

  _onMouseDown = e => {
    const markerIndex = this._hitTest(e);
    const { changeRightClickedMarker, threadIndex, getMarker } = this.props;

    if (e.button === 2) {
      // The right button is a contextual action. It is important that we call
      // the right click callback at mousedown so that the state is updated and
      // the context menus are rendered before the mouseup/contextmenu events.
      changeRightClickedMarker(threadIndex, markerIndex);
    } else {
      const mouseDownItem =
        markerIndex !== null ? getMarker(markerIndex) : null;

      this.setState({ mouseDownItem });

      if (mouseDownItem !== null) {
        // Disabling Flow type checking because Flow doesn't know about setCapture.
        const canvas = (e.currentTarget: any);
        if (canvas.setCapture) {
          // This retargets all mouse events to this element. This is useful
          // when for example the user releases the mouse button outside of the
          // browser window.
          canvas.setCapture();
        }
        e.stopPropagation();
      }
    }
  };

  _onMouseUp = (e: SyntheticMouseEvent<HTMLCanvasElement>) => {
    const { mouseDownItem } = this.state;
    if (mouseDownItem !== null) {
      const mouseUpItem = this._getHitMarker(e);
      if (
        mouseDownItem === mouseUpItem &&
        mouseUpItem !==
          null /* extra null check because flow doesn't realize it's unnecessary */
      ) {
        const { onSelect, threadIndex } = this.props;
        onSelect(
          threadIndex,
          mouseUpItem.start,
          mouseUpItem.start + mouseUpItem.dur
        );
      }
      this.setState({
        hoveredItem: mouseUpItem,
        mouseDownItem: null,
      });
    }
  };

  _onMouseOut = () => {
    this.setState({
      hoveredItem: null,
    });
  };

  render() {
    const {
      additionalClassName,
      isSelected,
      isModifyingSelection,
      threadIndex,
      testId,
      rightClickedMarker,
    } = this.props;

    const { mouseDownItem, hoveredItem, mouseX, mouseY } = this.state;
    const shouldShowTooltip =
      !isModifyingSelection && !mouseDownItem && !rightClickedMarker;

    return (
      <div
        data-testid={testId}
        className={classNames(
          'timelineMarkers',
          additionalClassName,
          isSelected ? 'selected' : null
        )}
      >
        <ContextMenuTrigger id="MarkerContextMenu">
          <TimelineMarkersCanvas
            width={this.props.width}
            height={this.props.height}
            rangeStart={this.props.rangeStart}
            rangeEnd={this.props.rangeEnd}
            getMarker={this.props.getMarker}
            markerIndexes={this.props.markerIndexes}
            hoveredItem={hoveredItem}
            mouseDownItem={mouseDownItem}
            rightClickedMarker={rightClickedMarker}
            onMouseDown={this._onMouseDown}
            onMouseMove={this._onMouseMove}
            onMouseUp={this._onMouseUp}
            onMouseOut={this._onMouseOut}
          />
        </ContextMenuTrigger>
        {shouldShowTooltip && hoveredItem ? (
          <Tooltip mouseX={mouseX} mouseY={mouseY}>
            <TooltipMarker marker={hoveredItem} threadIndex={threadIndex} />
          </Tooltip>
        ) : null}
      </div>
    );
  }
}

/**
 * Combine the base implementation of the TimelineMarkers with the
 * WithSize component.
 */
export const TimelineMarkers = withSize<Props>(TimelineMarkersImplementation);

/**
 * Create a special connected component for Jank instances.
 */
export const TimelineMarkersJank = explicitConnect<
  OwnProps,
  StateProps,
  DispatchProps
>({
  mapStateToProps: (state, props) => {
    const { threadIndex } = props;
    const selectors = getThreadSelectors(threadIndex);
    const selectedThread = getSelectedThreadIndex(state);

    return {
      getMarker: selectors.getMarkerGetter(state),
      markerIndexes: selectors.getJankMarkerIndexesForHeader(state),
      isSelected: threadIndex === selectedThread,
      isModifyingSelection: getPreviewSelection(state).isModifying,
      testId: 'TimelineMarkersJank',
      rightClickedMarker: selectors.getRightClickedMarker(state),
    };
  },
  mapDispatchToProps: { changeRightClickedMarker },
  component: TimelineMarkers,
});

/**
 * Create a connected component for all markers.
 */
export const TimelineMarkersOverview = explicitConnect<
  OwnProps,
  StateProps,
  DispatchProps
>({
  mapStateToProps: (state, props) => {
    const { threadIndex } = props;
    const selectors = getThreadSelectors(threadIndex);
    const selectedThread = getSelectedThreadIndex(state);
    const markerIndexes = selectors.getCommittedRangeAndTabFilteredMarkerIndexesForHeader(
      state
    );

    return {
      additionalClassName:
        selectors.getThread(state).name === 'GeckoMain'
          ? 'timelineMarkersGeckoMain'
          : null,
      getMarker: selectors.getMarkerGetter(state),
      markerIndexes,
      isSelected: threadIndex === selectedThread,
      isModifyingSelection: getPreviewSelection(state).isModifying,
      testId: 'TimelineMarkersOverview',
      rightClickedMarker: selectors.getRightClickedMarker(state),
    };
  },
  mapDispatchToProps: { changeRightClickedMarker },
  component: TimelineMarkers,
});

/**
 * FileIO is an optional marker type. Only add these markers if they exist.
 */
export const TimelineMarkersFileIo = explicitConnect<
  OwnProps,
  StateProps,
  DispatchProps
>({
  mapStateToProps: (state, props) => {
    const { threadIndex } = props;
    const selectors = getThreadSelectors(threadIndex);
    const selectedThread = getSelectedThreadIndex(state);

    return {
      getMarker: selectors.getMarkerGetter(state),
      markerIndexes: selectors.getFileIoMarkerIndexes(state),
      isSelected: threadIndex === selectedThread,
      isModifyingSelection: getPreviewSelection(state).isModifying,
      testId: 'TimelineMarkersFileIo',
      rightClickedMarker: selectors.getRightClickedMarker(state),
    };
  },
  mapDispatchToProps: { changeRightClickedMarker },
  component: TimelineMarkers,
});

/**
 * Create a component for memory-related markers.
 */
export const TimelineMarkersMemory = explicitConnect<
  OwnProps,
  StateProps,
  DispatchProps
>({
  mapStateToProps: (state, props) => {
    const { threadIndex } = props;
    const selectors = getThreadSelectors(threadIndex);
    const selectedThread = getSelectedThreadIndex(state);

    return {
      getMarker: selectors.getMarkerGetter(state),
      markerIndexes: selectors.getMemoryMarkerIndexes(state),
      isSelected: threadIndex === selectedThread,
      isModifyingSelection: getPreviewSelection(state).isModifying,
      additionalClassName: 'timelineMarkersMemory',
      testId: 'TimelineMarkersMemory',
      rightClickedMarker: selectors.getRightClickedMarker(state),
    };
  },
  mapDispatchToProps: { changeRightClickedMarker },
  component: TimelineMarkers,
});

/**
 * Create a component for IPC-related markers.
 */
export const TimelineMarkersIPC = explicitConnect<
  OwnProps,
  StateProps,
  DispatchProps
>({
  mapStateToProps: (state, props) => {
    const { threadIndex } = props;
    const selectors = getThreadSelectors(threadIndex);
    const selectedThread = getSelectedThreadIndex(state);

    return {
      getMarker: selectors.getMarkerGetter(state),
      markerIndexes: selectors.getIPCMarkerIndexes(state),
      isSelected: threadIndex === selectedThread,
      isModifyingSelection: getPreviewSelection(state).isModifying,
      additionalClassName: 'timelineMarkersIPC',
      testId: 'TimelineMarkersIPC',
      rightClickedMarker: selectors.getRightClickedMarker(state),
    };
  },
  mapDispatchToProps: { changeRightClickedMarker },
  component: TimelineMarkers,
});
