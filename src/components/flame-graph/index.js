/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import * as React from 'react';
import { connect } from 'react-redux';
import FlameGraphCanvas from './Canvas';
import {
  selectedThreadSelectors,
  getDisplayRange,
  getProfileViewOptions,
} from '../../reducers/profile-view';
import FlameGraphSettings from './Settings';

import type { Thread } from '../../types/profile';
import type { Milliseconds } from '../../types/units';
import type { FlameGraphTiming } from '../../profile-logic/flame-graph';
import type { ProfileSelection } from '../../types/actions';
import type { CallNodeInfo } from '../../types/profile-derived';

require('./index.css');

const STACK_FRAME_HEIGHT = 16;

type Props = {
  thread: Thread,
  maxStackDepth: number,
  flameGraphTiming: FlameGraphTiming,
  callNodeInfo: CallNodeInfo,
  timeRange: { start: Milliseconds, end: Milliseconds },
  threadIndex: number,
  selection: ProfileSelection,
  threadName: string,
  processDetails: string,
};

class FlameGraph extends React.PureComponent<Props> {
  _noOp = () => {};

  render() {
    const {
      thread,
      maxStackDepth,
      flameGraphTiming,
      callNodeInfo,
      timeRange,
      selection,
      threadName,
      processDetails,
    } = this.props;

    const maxViewportHeight = maxStackDepth * STACK_FRAME_HEIGHT;

    return (
      <div className="flameGraph">
        <FlameGraphSettings />
        <div className="flameGraphContent">
          <div title={processDetails} className="flameGraphLabels grippy">
            <span>
              {threadName}
            </span>
          </div>
          <FlameGraphCanvas
            // ChartViewport props
            timeRange={timeRange}
            maxViewportHeight={maxViewportHeight}
            startsAtBottom={true}
            maximumZoom={1}
            selection={selection}
            updateProfileSelection={this._noOp}
            viewportNeedsUpdate={viewportNeedsUpdate}
            // FlameGraphCanvas props
            thread={thread}
            flameGraphTiming={flameGraphTiming}
            callNodeInfo={callNodeInfo}
            maxStackDepth={maxStackDepth}
            stackFrameHeight={STACK_FRAME_HEIGHT}
          />
        </div>
      </div>
    );
  }
}

export default connect(state => {
  const flameGraphTiming = selectedThreadSelectors.getFlameGraphTiming(state);

  return {
    thread: selectedThreadSelectors.getThread(state),
    maxStackDepth: selectedThreadSelectors.getCallNodeMaxDepthForFlameGraph(
      state
    ),
    flameGraphTiming,
    timeRange: getDisplayRange(state),
    selection: getProfileViewOptions(state).selection,
    threadName: selectedThreadSelectors.getFriendlyThreadName(state),
    processDetails: selectedThreadSelectors.getThreadProcessDetails(state),
    callNodeInfo: selectedThreadSelectors.getCallNodeInfo(state),
  };
})(FlameGraph);

function viewportNeedsUpdate(prevProps, newProps) {
  return prevProps.flameGraphTiming !== newProps.flameGraphTiming;
}
