import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import { timeCode } from '../../common/time-code';
import { getSampleFuncStacks } from '../profile-data';

class FlameChart extends Component {

  constructor(props) {
    super(props);
    this._requestedAnimationFrame = false;
  }

  _scheduleDraw() {
    if (!this._requestedAnimationFrame) {
      this._requestedAnimationFrame = true;
      window.requestAnimationFrame(() => {
        this._requestedAnimationFrame = false;
        if (this.refs.canvas) {
          timeCode('FlameChart render', () => {
            this.drawCanvas(this.refs.canvas);
          });
        }
      });
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    return shallowCompare(this, nextProps, nextState);
  }

  drawCanvas(canvas) {
    const { thread, interval, rangeStart, rangeEnd, funcStackInfo,
            containerWidth, containerHeight, boundsLeft, boundsRight } = this.props;
    const boundsLength = boundsRight - boundsLeft;

    const width = Math.round(containerWidth * window.devicePixelRatio);
    const height = Math.round(containerHeight * window.devicePixelRatio);
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    let maxDepth = 0;
    const { funcStackTable, stackIndexToFuncStackIndex } = funcStackInfo;
    const sampleFuncStacks = getSampleFuncStacks(thread.samples, stackIndexToFuncStackIndex);
    for (let i = 0; i < funcStackTable.depth.length; i++) {
      if (funcStackTable.depth[i] > maxDepth) {
        maxDepth = funcStackTable.depth[i];
      }
    }
    const range = [rangeStart, rangeEnd];
    const rangeLength = range[1] - range[0];
    const yPixelsPerDepth = canvas.height / maxDepth;
    const unitInterval = interval / rangeLength;
    for (let i = 0; i < sampleFuncStacks.length; i++) {
      // Unit time is relative to a sample's time in the current range independent of
      // the viewport.
      const sampleUnitStartTime = (thread.samples.time[i] - range[0]) / rangeLength;

      // The ending sample time should be the next sample's start time, but fallback
      // to the unitInterval if it's the last sample.
      const nextSample = thread.samples.time[i + 1];
      const sampleUnitEndTime = nextSample
        ? (nextSample - range[0]) / rangeLength
        : sampleUnitStartTime + unitInterval;

      // Only draw samples that are in bounds.
      if (boundsLeft < sampleUnitEndTime && boundsRight > sampleUnitStartTime) {
        const funcStack = sampleFuncStacks[i];
        const sampleHeight = funcStackTable.depth[funcStack] * yPixelsPerDepth;
        const startY = canvas.height - sampleHeight;
        ctx.fillStyle = '#7990c8';

        ctx.fillRect(
          (sampleUnitStartTime - boundsLeft) * width / boundsLength,
          startY,
          Math.ceil((sampleUnitEndTime - sampleUnitStartTime) * width / boundsLength),
          sampleHeight);
      }
    }
  }

  render() {
    this._scheduleDraw();
    return <canvas className={this.props.className} ref='canvas'/>;
  }

}

FlameChart.propTypes = {
  thread: PropTypes.shape({
    samples: PropTypes.object.isRequired,
  }).isRequired,
  interval: PropTypes.number.isRequired,
  rangeStart: PropTypes.number.isRequired,
  rangeEnd: PropTypes.number.isRequired,
  funcStackInfo: PropTypes.shape({
    funcStackTable: PropTypes.object.isRequired,
    stackIndexToFuncStackIndex: PropTypes.any.isRequired,
  }).isRequired,
  className: PropTypes.string,
  containerWidth: PropTypes.number,
  containerHeight: PropTypes.number,
  boundsLeft: PropTypes.number,
  boundsRight: PropTypes.number,
};

export default FlameChart;
