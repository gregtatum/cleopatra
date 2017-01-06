import React, { Component, PropTypes } from 'react';
import { connect } from 'react-redux';
import FlameChartViewport from '../components/FlameChartViewport';
import { selectorsForThread, getSelectedThreadIndex, selectedThreadSelectors, getDisplayRange, getProfileInterval } from '../selectors/';
import * as actions from '../actions';

require('./FlameChartView.css');

class FlameChartView extends Component {

  render() {
    return <FlameChartViewport connectedProps={this.props} />;
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
    maxStackDepth: selectedThreadSelectors.getFuncStackMaxDepth(state),
    stackTimingByDepth: selectedThreadSelectors.getStackTimingByDepth(state),
    isSelected: true,
    timeRange: getDisplayRange(state),
    threadIndex: getSelectedThreadIndex(state),
    interval: getProfileInterval(state),
  };
}, actions)(FlameChartView);
