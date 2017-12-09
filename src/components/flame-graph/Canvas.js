/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import * as React from 'react';
import seedrandom from 'seedrandom';
import withChartViewport from '../shared/chart/Viewport';
import ChartCanvas from '../shared/chart/Canvas';
import TextMeasurement from '../../utils/text-measurement';

import type { Thread } from '../../types/profile';
import type { CssPixels, UnitIntervalOfProfileRange } from '../../types/units';
import type {
  FlameGraphTiming,
  FlameGraphDepth,
  IndexIntoFlameGraphTiming,
} from '../../profile-logic/flame-graph';
import type { Action, ProfileSelection } from '../../types/actions';
import type { CallNodeInfo } from '../../types/profile-derived';

type Props = {
  thread: Thread,
  maxStackDepth: number,
  containerWidth: CssPixels,
  containerHeight: CssPixels,
  viewportLeft: UnitIntervalOfProfileRange,
  viewportRight: UnitIntervalOfProfileRange,
  viewportTop: CssPixels,
  viewportBottom: CssPixels,
  flameGraphTiming: FlameGraphTiming,
  callNodeInfo: CallNodeInfo,
  stackFrameHeight: CssPixels,
  updateProfileSelection: ProfileSelection => Action,
  isDragging: boolean,
};

type HoveredStackTiming = {
  depth: FlameGraphDepth,
  flameGraphTimingIndex: IndexIntoFlameGraphTiming,
};

require('./Canvas.css');

const ROW_HEIGHT = 16;
const TEXT_OFFSET_START = 3;
const TEXT_OFFSET_TOP = 11;

function assignColor(depth, funcName) {
  function hexStr(n) {
    return ('0' + n.toString(16)).slice(-2);
  }
  // alea seems to be the fastest PRNG according to seedrandom README
  const rng = seedrandom.alea(funcName + depth);
  const red = hexStr(205 + parseInt(50 * rng()));
  const green = hexStr(0 + parseInt(230 * rng()));
  const blue = hexStr(0 + parseInt(55 * rng()));
  return `#${red}${green}${blue}`;
}

class FlameGraphCanvas extends React.PureComponent<Props> {
  _textMeasurement: null | TextMeasurement;

  constructor(props: Props) {
    super(props);
    (this: any)._getHoveredStackInfo = this._getHoveredStackInfo.bind(this);
    (this: any)._drawCanvas = this._drawCanvas.bind(this);
    (this: any)._hitTest = this._hitTest.bind(this);
  }

  _drawCanvas(
    ctx: CanvasRenderingContext2D,
    hoveredItem: HoveredStackTiming | null
  ) {
    const {
      thread,
      containerWidth,
      containerHeight,
      flameGraphTiming,
      callNodeInfo: { callNodeTable },
      stackFrameHeight,
      viewportTop,
      viewportBottom,
      maxStackDepth,
    } = this.props;

    // Ensure the text measurement tool is created, since this is the first time
    // this class has access to a ctx.
    if (!this._textMeasurement) {
      this._textMeasurement = new TextMeasurement(ctx);
    }
    const textMeasurement = this._textMeasurement;

    ctx.clearRect(0, 0, containerWidth, containerHeight);

    const startDepth = Math.floor(
      maxStackDepth - viewportBottom / stackFrameHeight
    );
    const endDepth = Math.ceil(maxStackDepth - viewportTop / stackFrameHeight);

    // Only draw the stack frames that are vertically within view.
    for (let depth = startDepth; depth < endDepth; depth++) {
      // Get the timing information for a row of stack frames.
      const stackTiming = flameGraphTiming[depth];

      if (!stackTiming) {
        continue;
      }

      for (let i = 0; i < stackTiming.length; i++) {
        const startTime = stackTiming.start[i];
        const endTime = stackTiming.end[i];

        const x: CssPixels = startTime * containerWidth;
        const y: CssPixels =
          (maxStackDepth - depth - 1) * ROW_HEIGHT - viewportTop;
        const w: CssPixels = (endTime - startTime) * containerWidth;
        const h: CssPixels = ROW_HEIGHT - 1;

        if (w < 2) {
          // Skip sending draw calls for sufficiently small boxes.
          continue;
        }

        const callNodeIndex = stackTiming.callNode[i];
        const funcIndex = callNodeTable.func[callNodeIndex];
        const funcName = thread.stringTable.getString(
          thread.funcTable.name[funcIndex]
        );

        const color = assignColor(depth, funcName);
        const isHovered =
          hoveredItem &&
          depth === hoveredItem.depth &&
          i === hoveredItem.flameGraphTimingIndex;

        ctx.fillStyle = isHovered ? 'Highlight' : color;
        ctx.fillRect(x, y, w, h);
        // Ensure spacing between blocks.
        ctx.clearRect(x, y, 1, h);

        // TODO - L10N RTL.
        // Constrain the x coordinate to the leftmost area.
        const x2: CssPixels = Math.max(x, 0) + TEXT_OFFSET_START;
        const w2: CssPixels = Math.max(0, w - (x2 - x));

        if (w2 > textMeasurement.minWidth) {
          const fittedText = textMeasurement.getFittedText(funcName, w2);
          if (fittedText) {
            ctx.fillStyle = isHovered ? 'HighlightText' : '#000000';
            ctx.fillText(fittedText, x2, y + TEXT_OFFSET_TOP);
          }
        }
      }
    }
  }

  _getHoveredStackInfo({
    depth,
    flameGraphTimingIndex,
  }: HoveredStackTiming): React.Node {
    const {
      thread,
      flameGraphTiming,
      callNodeInfo: { callNodeTable },
    } = this.props;
    const stackTiming = flameGraphTiming[depth];

    const duration =
      stackTiming.end[flameGraphTimingIndex] -
      stackTiming.start[flameGraphTimingIndex];

    const callNodeIndex = stackTiming.callNode[flameGraphTimingIndex];
    const funcIndex = callNodeTable.func[callNodeIndex];
    const funcName = thread.stringTable.getString(
      thread.funcTable.name[funcIndex]
    );

    return (
      <div className="flameGraphCanvasTooltip">
        <div className="tooltipOneLine">
          <div className="tooltipTiming">
            {(100 * duration).toFixed(2)}%
          </div>
          <div className="tooltipTitle">
            {funcName}
          </div>
        </div>
      </div>
    );
  }

  _hitTest(x: CssPixels, y: CssPixels): HoveredStackTiming | null {
    const {
      viewportTop,
      containerWidth,
      flameGraphTiming,
      maxStackDepth,
    } = this.props;
    const pos = x / containerWidth;
    const depth = Math.floor(maxStackDepth - (y + viewportTop) / ROW_HEIGHT);
    const stackTiming = flameGraphTiming[depth];

    if (!stackTiming) {
      return null;
    }

    for (let i = 0; i < stackTiming.length; i++) {
      const start = stackTiming.start[i];
      const end = stackTiming.end[i];
      if (start < pos && end > pos) {
        return { depth, flameGraphTimingIndex: i };
      }
    }

    return null;
  }

  _noOp = () => {};

  render() {
    const { containerWidth, containerHeight, isDragging } = this.props;

    return (
      <ChartCanvas
        className="flameGraphCanvas"
        containerWidth={containerWidth}
        containerHeight={containerHeight}
        isDragging={isDragging}
        onDoubleClickItem={this._noOp}
        getHoveredItemInfo={this._getHoveredStackInfo}
        drawCanvas={this._drawCanvas}
        hitTest={this._hitTest}
      />
    );
  }
}

export default withChartViewport(FlameGraphCanvas);
