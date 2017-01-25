import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import { timeCode } from '../../common/time-code';
import { getSampleFuncStacks } from '../profile-data';
import TextMeasurement from '../../common/text-measurement';

const ROW_HEIGHT = 16;

class FlameChartCanvas extends Component {

  constructor(props) {
    super(props);
    this._requestedAnimationFrame = false;
    this._devicePixelRatio = 1;
    this._textWidthsCache = {};
  }

  _scheduleDraw() {
    if (!this._requestedAnimationFrame) {
      this._requestedAnimationFrame = true;
      window.requestAnimationFrame(() => {
        this._requestedAnimationFrame = false;
        if (this.refs.canvas) {
          timeCode('FlameChartCanvas render', () => {
            this.drawCanvas(this.refs.canvas);
          });
        }
      });
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    return shallowCompare(this, nextProps, nextState);
  }

  componentDidMount() {
    this._textMeasurement = new TextMeasurement(this.refs.canvas.getContext('2d'));
  }

  _prepCanvas() {
    const {canvas} = this.refs;
    const {containerWidth, containerHeight} = this.props;
    const {devicePixelRatio} = window;
    const pixelWidth = containerWidth * devicePixelRatio;
    const pixelHeight = containerHeight * devicePixelRatio;
    if (!this._ctx) {
      this._ctx = canvas.getContext('2d');
    }
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      this._ctx.scale(this._devicePixelRatio, this._devicePixelRatio);
    }
    if (this._devicePixelRatio !== devicePixelRatio) {
      // Make sure and multiply by the inverse of the previous ratio, as the scaling
      // operates off of the previous set scale.
      const scale = (1 / this._devicePixelRatio) * devicePixelRatio;
      this._ctx.scale(scale, scale);
      console.log('setting scale to ' + scale);
      this._devicePixelRatio = devicePixelRatio;
    }
    return this._ctx;
  }

  /**
   * Draw the canvas.
   *
   * Note that most of the units are not absolute values, but unit intervals ranged from
   * 0 - 1. This was done to make the calculations easier for computing various zoomed
   * and translated views independent of any particular scale. See FlameChartViewport.js
   * for a diagram detailing the various components of this set-up.
   * @param {HTMLCanvasElement} canvas - The current canvas.
   * @returns {undefined}
   */
  drawCanvas(canvas) {
    const { thread, interval, rangeStart, rangeEnd, containerWidth,
            containerHeight, maxStackDepth, stackTimingByDepth, rowHeight,
            viewportLeft, viewportRight, viewportTop, viewportBottom } = this.props;

    const ctx = this._prepCanvas();
    ctx.clearRect(0, 0, containerWidth, containerHeight);

    const rangeLength = rangeEnd - rangeStart;
    const viewportLength = viewportRight - viewportLeft;
    let drawCount = 0;

    // Only draw the stack frames that are vertically within view.
    const startDepth = Math.floor(viewportTop / rowHeight);
    const endDepth = Math.ceil(viewportBottom / rowHeight);
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

      // Decide which samples to actually draw
      const timeAtViewportLeft = rangeStart + rangeLength * viewportLeft;
      const timeAtViewportRight = rangeStart + rangeLength * viewportRight;

      for (let i = 0; i < stackTiming.length; i++) {
        // Only draw samples that are in bounds.
        if (stackTiming.end[i] > timeAtViewportLeft && stackTiming.start[i] < timeAtViewportRight) {
          drawCount++;
          const stackIndex = stackTiming.stack[i];
          let name, isJS, implementation;
          if (stackIndex === -1) {
            name = 'Gecko';
            isJS = false;
          } else {
            const frameIndex = thread.stackTable.frame[stackIndex];
            const funcIndex = thread.frameTable.func[frameIndex];
            const implementationIndex = thread.frameTable.implementation[frameIndex];
            implementation = implementationIndex ? thread.stringTable.getString(implementationIndex) : null;
            name = thread.stringTable.getString(thread.funcTable.name[funcIndex]);
            isJS = thread.funcTable.isJS[funcIndex];
          }
          if (implementation) {
            ctx.fillStyle = implementation === 'baseline' ? 'rgb(255, 128, 150)' : 'rgb(128, 255, 150)';
          } else {
            ctx.fillStyle = isJS ? 'rgb(100, 100, 100)' : 'rgb(240, 240, 240)';
          }
          const unitStartTime = (stackTiming.start[i] - rangeStart) / rangeLength;
          const unitEndTime = (stackTiming.end[i] - rangeStart) / rangeLength;

          const x = ((unitStartTime - viewportLeft) * containerWidth / viewportLength);
          const y = depth * ROW_HEIGHT - viewportTop;
          const w = ((unitEndTime - unitStartTime) * containerWidth / viewportLength);
          const h = ROW_HEIGHT - 1;

          ctx.fillRect(x, y, w, h);

          // Constrain the x coordinate to the leftmost area.
          const x2 = Math.max(x, 0);
          const w2 = w - (x2 - x);

          const text = this._textMeasurement.getFittedText(name, w2);
          if (text) {
            ctx.fillStyle = 'rgb(0, 0, 0)';
            ctx.fillText(text, x2, y + 11);
          }
        }
      }
    }
    console.log(`Drew ${drawCount} samples`);
  }

  render() {
    this._scheduleDraw();
    return <canvas className='flameChartCanvas' ref='canvas'/>;
  }
}

FlameChartCanvas.propTypes = {
  thread: PropTypes.shape({
    samples: PropTypes.object.isRequired,
  }).isRequired,
  interval: PropTypes.number.isRequired,
  rangeStart: PropTypes.number.isRequired,
  rangeEnd: PropTypes.number.isRequired,
  className: PropTypes.string,
  containerWidth: PropTypes.number,
  containerHeight: PropTypes.number,
  viewportLeft: PropTypes.number,
  viewportRight: PropTypes.number,
  maxStackDepth: PropTypes.number,
  stackTimingByDepth: PropTypes.array,
  rowHeight: PropTypes.number.isRequired,
};

export default FlameChartCanvas;
