/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import { GREY_30 } from 'photon-colors';
import * as React from 'react';
import {
  TIMELINE_MARGIN_LEFT,
  TIMELINE_MARGIN_RIGHT,
} from '../../app-logic/constants';
import {
  withChartViewport,
  type WithChartViewport,
} from '../shared/chart/Viewport';
import ChartCanvas from '../shared/chart/Canvas';
import TextMeasurement from '../../utils/text-measurement';
import { updatePreviewSelection } from '../../actions/profile-view';

import type { Thread, ThreadIndex } from '../../types/profile';
import type {
  CallNodeInfo,
  IndexIntoCallNodeTable,
} from '../../types/profile-derived';
import type {
  Milliseconds,
  CssPixels,
  UnitIntervalOfProfileRange,
} from '../../types/units';
import type {
  StackTimingByDepth,
  StackTimingDepth,
  IndexIntoStackTiming,
} from '../../profile-logic/stack-timing';
import type { GetCategory } from '../../profile-logic/color-categories';
import type { GetLabel } from '../../profile-logic/labeling-strategies';
import type { Viewport } from '../shared/chart/Viewport';
import {
  typeof requestToDismissTooltip,
  typeof viewTooltip,
} from '../../actions/app';

type OwnProps = {|
  +thread: Thread,
  +threadIndex: ThreadIndex,
  +interval: Milliseconds,
  +rangeStart: Milliseconds,
  +rangeEnd: Milliseconds,
  +stackTimingByDepth: StackTimingByDepth,
  +stackFrameHeight: CssPixels,
  +getCategory: GetCategory,
  +getLabel: GetLabel,
  +updatePreviewSelection: typeof updatePreviewSelection,
  +callNodeInfo: CallNodeInfo,
  +selectedCallNodeIndex: IndexIntoCallNodeTable | null,
  +onSelectionChange: (IndexIntoCallNodeTable | null) => void,
  +scrollToSelectionGeneration: number,
  requestToDismissTooltip: requestToDismissTooltip,
  viewTooltip: viewTooltip,
|};

type Props = $ReadOnly<{|
  ...OwnProps,
  +viewport: Viewport,
|}>;

type HoveredStackTiming = {|
  +depth: StackTimingDepth,
  +stackTimingIndex: IndexIntoStackTiming,
|};

require('./Canvas.css');

const ROW_HEIGHT = 16;
const TEXT_OFFSET_START = 3;
const TEXT_OFFSET_TOP = 11;

class StackChartCanvas extends React.PureComponent<Props> {
  _textMeasurement: null | TextMeasurement = null;
  _leftMarginGradient: null | CanvasGradient = null;
  _rightMarginGradient: null | CanvasGradient = null;

  componentDidUpdate(prevProps) {
    // We want to scroll the selection into view when this component
    // is mounted, but using componentDidMount won't work here as the
    // viewport will not have completed setting its size by
    // then. Instead, look for when the viewport's isSizeSet prop
    // changes to true.
    if (!this.props.viewport.isSizeSet) {
      return;
    }
    const viewportDidMount = !prevProps.viewport.isSizeSet;

    if (
      viewportDidMount ||
      this.props.scrollToSelectionGeneration >
        prevProps.scrollToSelectionGeneration
    ) {
      this._scrollSelectionIntoView();
    }
  }

  _scrollSelectionIntoView = () => {
    const {
      selectedCallNodeIndex,
      callNodeInfo: { callNodeTable },
    } = this.props;

    if (selectedCallNodeIndex === null) {
      return;
    }

    const depth = callNodeTable.depth[selectedCallNodeIndex];
    const y = depth * ROW_HEIGHT;

    if (y < this.props.viewport.viewportTop) {
      this.props.viewport.moveViewport(0, this.props.viewport.viewportTop - y);
    } else if (y + ROW_HEIGHT > this.props.viewport.viewportBottom) {
      this.props.viewport.moveViewport(
        0,
        this.props.viewport.viewportBottom - (y + ROW_HEIGHT)
      );
    }
  };

  /**
   * Draw the canvas.
   *
   * Note that most of the units are not absolute values, but unit intervals ranged from
   * 0 - 1. This was done to make the calculations easier for computing various zoomed
   * and translated views independent of any particular scale. See
   * src/components/shared/chart/Viewport.js for a diagram detailing the various
   * components of this set-up.
   */
  _drawCanvas = (
    ctx: CanvasRenderingContext2D,
    hoveredItem: HoveredStackTiming | null
  ) => {
    const {
      thread,
      rangeStart,
      rangeEnd,
      getLabel,
      stackTimingByDepth,
      stackFrameHeight,
      getCategory,
      selectedCallNodeIndex,
      callNodeInfo: { stackIndexToCallNodeIndex },
      viewport: {
        containerWidth,
        containerHeight,
        viewportLeft,
        viewportRight,
        viewportTop,
        viewportBottom,
      },
    } = this.props;

    // Ensure the text measurement tool is created, since this is the first time
    // this class has access to a ctx.
    if (!this._textMeasurement) {
      this._textMeasurement = new TextMeasurement(ctx);
    }
    const textMeasurement = this._textMeasurement;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, containerWidth, containerHeight);

    const rangeLength: Milliseconds = rangeEnd - rangeStart;
    const viewportLength: UnitIntervalOfProfileRange =
      viewportRight - viewportLeft;

    // Convert CssPixels to Stack Depth
    const startDepth = Math.floor(viewportTop / stackFrameHeight);
    const endDepth = Math.ceil(viewportBottom / stackFrameHeight);

    const innerContainerWidth =
      containerWidth - TIMELINE_MARGIN_LEFT - TIMELINE_MARGIN_RIGHT;

    const pixelAtViewportPosition = (
      viewportPosition: UnitIntervalOfProfileRange
    ): CssPixels =>
      TIMELINE_MARGIN_LEFT +
      (viewportPosition - viewportLeft) * innerContainerWidth / viewportLength;

    // Only draw the stack frames that are vertically within view.
    for (let depth = startDepth; depth < endDepth; depth++) {
      // Get the timing information for a row of stack frames.
      const stackTiming = stackTimingByDepth[depth];

      if (!stackTiming) {
        continue;
      }
      /*
       * TODO - Do an O(log n) binary search to find the only samples in range rather than
       * linear O(n) search for loops. Profile the results to see if this helps at all.
       *
       * const startSampleIndex = binarySearch(stackTiming.start, rangeStart + rangeLength * viewportLeft);
       * const endSampleIndex = binarySearch(stackTiming.end, rangeStart + rangeLength * viewportRight);
       */

      const pixelsInViewport = viewportLength * innerContainerWidth;
      const timePerPixel = rangeLength / pixelsInViewport;

      // Decide which samples to actually draw
      const timeAtStart: Milliseconds =
        rangeStart +
        rangeLength * viewportLeft -
        timePerPixel * TIMELINE_MARGIN_LEFT;
      const timeAtEnd: Milliseconds = rangeStart + rangeLength * viewportRight;

      for (let i = 0; i < stackTiming.length; i++) {
        // Only draw samples that are in bounds.
        if (
          stackTiming.end[i] > timeAtStart &&
          stackTiming.start[i] < timeAtEnd
        ) {
          const viewportAtStartTime: UnitIntervalOfProfileRange =
            (stackTiming.start[i] - rangeStart) / rangeLength;
          const viewportAtEndTime: UnitIntervalOfProfileRange =
            (stackTiming.end[i] - rangeStart) / rangeLength;

          const x: CssPixels = pixelAtViewportPosition(viewportAtStartTime);
          const y: CssPixels = depth * ROW_HEIGHT - viewportTop;
          const w: CssPixels =
            (viewportAtEndTime - viewportAtStartTime) *
            innerContainerWidth /
            viewportLength;
          const h: CssPixels = ROW_HEIGHT - 1;

          if (w < 2) {
            // Skip sending draw calls for sufficiently small boxes.
            continue;
          }

          const stackIndex = stackTiming.stack[i];
          const callNodeIndex = stackIndexToCallNodeIndex[stackIndex];
          const frameIndex = thread.stackTable.frame[stackIndex];
          const text = getLabel(thread, stackIndex);
          const category = getCategory(thread, frameIndex);
          const isHovered =
            hoveredItem &&
            depth === hoveredItem.depth &&
            i === hoveredItem.stackTimingIndex;
          const isSelected = selectedCallNodeIndex === callNodeIndex;

          ctx.fillStyle =
            isHovered || isSelected ? 'Highlight' : category.color;
          ctx.fillRect(x, y, w, h);

          // Ensure spacing between blocks.
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y, 1, h);

          // TODO - L10N RTL.
          // Constrain the x coordinate to the leftmost area.
          const x2: CssPixels = Math.max(x, 0) + TEXT_OFFSET_START;
          const w2: CssPixels = Math.max(0, w - (x2 - x));

          if (w2 > textMeasurement.minWidth) {
            const fittedText = textMeasurement.getFittedText(text, w2);
            if (fittedText) {
              ctx.fillStyle =
                isHovered || isSelected ? 'HighlightText' : '#000000';
              ctx.fillText(fittedText, x2, y + TEXT_OFFSET_TOP);
            }
          }
        }
      }
    }

    // Draw the borders on the left and right.
    ctx.fillStyle = GREY_30;
    ctx.fillRect(pixelAtViewportPosition(0), 0, 1, containerHeight);
    ctx.fillRect(pixelAtViewportPosition(1), 0, 1, containerHeight);
  };

  _onDoubleClickStack = (hoveredItem: HoveredStackTiming | null) => {
    if (hoveredItem === null) {
      return;
    }
    const { depth, stackTimingIndex } = hoveredItem;
    const { stackTimingByDepth, updatePreviewSelection } = this.props;
    updatePreviewSelection({
      hasSelection: true,
      isModifying: false,
      selectionStart: stackTimingByDepth[depth].start[stackTimingIndex],
      selectionEnd: stackTimingByDepth[depth].end[stackTimingIndex],
    });
  };

  _onSelectItem = (hoveredItem: HoveredStackTiming | null) => {
    // Change our selection to the hovered item, or deselect (with
    // null) if there's nothing hovered.
    let callNodeIndex = null;
    if (hoveredItem !== null) {
      const { depth, stackTimingIndex } = hoveredItem;
      const { stackTimingByDepth } = this.props;
      const stackIndex = stackTimingByDepth[depth].stack[stackTimingIndex];
      const { stackIndexToCallNodeIndex } = this.props.callNodeInfo;
      callNodeIndex = stackIndexToCallNodeIndex[stackIndex];
    }
    this.props.onSelectionChange(callNodeIndex);
  };

  _hitTest = (x: CssPixels, y: CssPixels): HoveredStackTiming | null => {
    const {
      rangeStart,
      rangeEnd,
      stackTimingByDepth,
      viewport: { viewportLeft, viewportRight, viewportTop, containerWidth },
    } = this.props;

    const innerContainerWidth =
      containerWidth - TIMELINE_MARGIN_LEFT - TIMELINE_MARGIN_RIGHT;
    const rangeLength: Milliseconds = rangeEnd - rangeStart;
    const viewportLength: UnitIntervalOfProfileRange =
      viewportRight - viewportLeft;
    const unitIntervalTime: UnitIntervalOfProfileRange =
      viewportLeft +
      viewportLength * ((x - TIMELINE_MARGIN_LEFT) / innerContainerWidth);
    const time: Milliseconds = rangeStart + unitIntervalTime * rangeLength;
    const depth = Math.floor((y + viewportTop) / ROW_HEIGHT);
    const stackTiming = stackTimingByDepth[depth];

    if (!stackTiming) {
      return null;
    }

    for (let i = 0; i < stackTiming.length; i++) {
      const start = stackTiming.start[i];
      const end = stackTiming.end[i];
      if (start < time && end > time) {
        return { depth, stackTimingIndex: i };
      }
    }

    return null;
  };

  _onHoverChange = (
    x: CssPixels,
    y: CssPixels,
    hoveredItem: HoveredStackTiming | null
  ): void => {
    const { requestToDismissTooltip, viewTooltip, threadIndex } = this.props;
    if (hoveredItem === null) {
      requestToDismissTooltip();
    } else {
      const { depth, stackTimingIndex } = hoveredItem;
      const { stackTimingByDepth } = this.props;
      const stackTiming = stackTimingByDepth[depth];
      viewTooltip(x, y, {
        type: 'stack',
        threadIndex,
        stackIndex: stackTiming.stack[stackTimingIndex],
      });
    }
  };

  render() {
    const { containerWidth, containerHeight, isDragging } = this.props.viewport;

    return (
      <ChartCanvas
        className="stackChartCanvas"
        containerWidth={containerWidth}
        containerHeight={containerHeight}
        isDragging={isDragging}
        onDoubleClickItem={this._onDoubleClickStack}
        onHoverChange={this._onHoverChange}
        drawCanvas={this._drawCanvas}
        hitTest={this._hitTest}
        onSelectItem={this._onSelectItem}
      />
    );
  }
}

//
export default (withChartViewport: WithChartViewport<OwnProps, Props>)(
  StackChartCanvas
);
