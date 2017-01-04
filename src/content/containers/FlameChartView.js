import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import FlameChart from '../components/FlameChart';
import { selectorsForThread, getSelectedThreadIndex, selectedThreadSelectors, getDisplayRange, getProfileInterval } from '../selectors/';
import { getSampleIndexClosestToTime, getStackAsFuncArray } from '../profile-data';
import * as actions from '../actions';

const LINE_SCROLL_MODE = 1;
const SCROLL_LINE_SIZE = 15;

require('./FlameChartView.css');

/**
 * Viewport terminology:
 *
 *
 *                 <------ e.g. 1000px ------>         0.7 - Sample's unit time
 *                 ___________________________          |    (relative to current profile range)
 *         _______|___________________________|_________|______________________
 *        |       |                           |         v                      |
 * |<-------------|---------------------------|---------*------- Total profile samples ------>|
 *        |       |                           |                                |
 *        |       |      Screen Viewport      |                                |
 *        |       |                           |         Current profile range  |
 *        |_______|___________________________|________________________________|
 *                |___________________________|
 *        ^       ^                           ^                                ^
 *        0.0     0.1                         0.6                              1.0
 *
 *
 * boundsLeft = 0.1
 * boundsRight = 0.6
 * boundsLength = boundsRight - boundsLeft
 * screenWidth = 1000
 * unitPixel = boundsLength / screenWidth
 * boundsRight += mouseMoveDelta * unitPixel
 * boundsLeft += mouseMoveDelta * unitPixel
 **/
class FlameChartView extends Component {

  constructor(props) {
    super(props);

    this._mouseWheelListener = this._mouseWheelListener.bind(this);
    this._mouseDownListener = this._mouseDownListener.bind(this);
    this._setSize = this._setSize.bind(this);

    this.state = {
      containerWidth: 0,
      containerHeight: 0,
      boundsLeft: 0,
      boundsRight: 1,
    };
  }

  _setSize() {
    const rect = this.refs.container.getBoundingClientRect();
    if (this.state.width !== rect.width || this.state.height !== rect.height) {
      this.setState({
        containerWidth: rect.width,
        containerHeight: rect.height,
      });
    }
  }

  _mouseWheelListener(event) {
    event.preventDefault();

    const deltaY = event.deltaMode === LINE_SCROLL_MODE
      ? event.deltaY * SCROLL_LINE_SIZE
      : event.deltaY;

    const { boundsLeft, boundsRight } = this.state;
    const boundsLength = boundsRight - boundsLeft;
    const scale = boundsLength - boundsLength / (1 + deltaY * 0.001);
    const newBoundsLeft = clamp(0, 1, boundsLeft - scale / 2);
    const newBoundsRight = clamp(0, 1, boundsRight + scale / 2);

    if (newBoundsLeft === 0 && newBoundsRight === 1) {
      if (boundsLeft === 0 && boundsRight === 1) {
        // Do not update if at the maximum bounds.
        return;
      }
    }
    this.setState({
      boundsLeft: newBoundsLeft,
      boundsRight: newBoundsRight,
    });
  }

  _mouseDownListener() {

  }

  _mouseMoveListener() {

  }

  _mouseUpListener() {

  }

  componentDidMount() {
    window.addEventListener('resize', this._setSize);
    this._setSize();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this._resizeListener);
  }

  render() {
    const { thread, interval, timeRange, funcStackInfo, isSelected, style } = this.props;
    const { containerWidth, containerHeight, boundsLeft, boundsRight } = this.state;
    console.log(boundsLeft.toFixed(3), (1 - boundsRight).toFixed(3));
    return (
      <div className='flameChartView'
           onWheel={this._mouseWheelListener}
           onMouseDown={this._mouseDownListener}
           ref='container'>
        <FlameChart interval={interval}
                    thread={thread}
                    className='flameChart'
                    rangeStart={timeRange.start}
                    rangeEnd={timeRange.end}
                    funcStackInfo={funcStackInfo}
                    containerWidth={containerWidth}
                    containerHeight={containerHeight}
                    boundsLeft={boundsLeft}
                    boundsRight={boundsRight} />
        </div>
    );
  }
}

FlameChartView.propTypes = {
  threadIndex: PropTypes.number.isRequired,
  thread: PropTypes.object.isRequired,
  funcStackInfo: PropTypes.object.isRequired,
  interval: PropTypes.number.isRequired,
  timeRange: PropTypes.object.isRequired,
  isSelected: PropTypes.bool.isRequired,
  style: PropTypes.object,
};

export default connect((state, props) => {
  return {
    thread: selectedThreadSelectors.getFilteredThread(state),
    funcStackInfo: selectedThreadSelectors.getFuncStackInfo(state),
    isSelected: true,
    timeRange: getDisplayRange(state),
    threadIndex: getSelectedThreadIndex(state),
    interval: getProfileInterval(state),
  };
}, actions)(FlameChartView);

function clamp(min, max, value) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a * (1 - t) + b * t;
}
