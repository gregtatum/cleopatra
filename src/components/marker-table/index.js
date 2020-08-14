/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import React, { PureComponent } from 'react';
import memoize from 'memoize-immutable';

import explicitConnect from '../../utils/connect';
import TreeView from '../shared/TreeView';
import MarkerTableEmptyReasons from './MarkerTableEmptyReasons';
import {
  getZeroAt,
  getScrollToSelectionGeneration,
} from '../../selectors/profile';
import { selectedThreadSelectors } from '../../selectors/per-thread';
import { getFirstSelectedThreadIndex } from '../../selectors/url-state';
import {
  changeSelectedMarker,
  changeRightClickedMarker,
} from '../../actions/profile-view';
import MarkerSettings from '../shared/MarkerSettings';
import { formatSeconds, formatTimestamp } from '../../utils/format-numbers';
import {
  getMarkerFullDescription,
  getMarkerCategory,
} from '../../profile-logic/marker-data';

import './index.css';

import type {
  ThreadIndex,
  Marker,
  MarkerIndex,
  Milliseconds,
} from 'firefox-profiler/types';

import type { ConnectedProps } from '../../utils/connect';

type MarkerDisplayData = {|
  start: string,
  duration: string | null,
  name: string,
  category: string,
|};

class MarkerTree {
  _getMarker: MarkerIndex => Marker;
  _markerIndexes: MarkerIndex[];
  _zeroAt: Milliseconds;
  _displayDataByIndex: Map<MarkerIndex, MarkerDisplayData>;

  constructor(
    getMarker: MarkerIndex => Marker,
    markerIndexes: MarkerIndex[],
    zeroAt: Milliseconds
  ) {
    this._getMarker = getMarker;
    this._markerIndexes = markerIndexes;
    this._zeroAt = zeroAt;
    this._displayDataByIndex = new Map();
  }

  getRoots(): MarkerIndex[] {
    return this._markerIndexes;
  }

  getChildren(markerIndex: MarkerIndex): MarkerIndex[] {
    return markerIndex === -1 ? this.getRoots() : [];
  }

  hasChildren(_markerIndex: MarkerIndex): boolean {
    return false;
  }

  getAllDescendants() {
    return new Set();
  }

  getParent(): MarkerIndex {
    // -1 isn't used, but needs to be compatible with the call tree.
    return -1;
  }

  getDepth() {
    return 0;
  }

  hasSameNodeIds(tree) {
    return this._markerIndexes === tree._markerIndexes;
  }

  getDisplayData(markerIndex: MarkerIndex): MarkerDisplayData {
    let displayData = this._displayDataByIndex.get(markerIndex);
    if (displayData === undefined) {
      const marker = this._getMarker(markerIndex);
      const name = getMarkerFullDescription(marker);
      const category = getMarkerCategory(marker);

      let duration = null;
      if (marker.incomplete) {
        duration = 'unknown';
      } else if (marker.end !== null) {
        duration = formatTimestamp(marker.end - marker.start);
      }

      displayData = {
        start: _formatStart(marker.start, this._zeroAt),
        duration,
        name,
        category,
      };
      this._displayDataByIndex.set(markerIndex, displayData);
    }
    return displayData;
  }
}

function _formatStart(start: number, zeroAt) {
  return formatSeconds(start - zeroAt);
}

type StateProps = {|
  +threadIndex: ThreadIndex,
  +getMarker: MarkerIndex => Marker,
  +markerIndexes: MarkerIndex[],
  +selectedMarker: MarkerIndex | null,
  +rightClickedMarkerIndex: MarkerIndex | null,
  +zeroAt: Milliseconds,
  +scrollToSelectionGeneration: number,
|};

type DispatchProps = {|
  +changeSelectedMarker: typeof changeSelectedMarker,
  +changeRightClickedMarker: typeof changeRightClickedMarker,
|};

type Props = ConnectedProps<{||}, StateProps, DispatchProps>;

class MarkerTable extends PureComponent<Props> {
  _fixedColumns = [
    { propName: 'start', title: 'Start' },
    { propName: 'duration', title: 'Duration' },
    { propName: 'category', title: 'Category' },
  ];
  _mainColumn = { propName: 'name', title: 'Description' };
  _expandedNodeIds: Array<MarkerIndex | null> = [];
  _onExpandedNodeIdsChange = () => {};
  _treeView: ?TreeView<MarkerDisplayData>;
  _takeTreeViewRef = treeView => (this._treeView = treeView);

  getMarkerTree = memoize((...args) => new MarkerTree(...args), { limit: 1 });

  componentDidMount() {
    this.focus();
  }

  componentDidUpdate(prevProps) {
    if (
      this.props.scrollToSelectionGeneration >
      prevProps.scrollToSelectionGeneration
    ) {
      if (this._treeView) {
        this._treeView.scrollSelectionIntoView();
      }
    }
  }

  focus() {
    const treeView = this._treeView;
    if (treeView) {
      treeView.focus();
    }
  }

  _onSelectionChange = (selectedMarker: MarkerIndex) => {
    const { threadIndex, changeSelectedMarker } = this.props;
    changeSelectedMarker(threadIndex, selectedMarker);
  };

  _onRightClickSelection = (selectedMarker: MarkerIndex) => {
    const { threadIndex, changeRightClickedMarker } = this.props;
    changeRightClickedMarker(threadIndex, selectedMarker);
  };

  render() {
    const {
      getMarker,
      markerIndexes,
      zeroAt,
      selectedMarker,
      rightClickedMarkerIndex,
    } = this.props;
    const tree = this.getMarkerTree(getMarker, markerIndexes, zeroAt);
    return (
      <div
        className="markerTable"
        id="marker-table-tab"
        role="tabpanel"
        aria-labelledby="marker-table-tab-button"
      >
        <MarkerSettings />
        {markerIndexes.length === 0 ? (
          <MarkerTableEmptyReasons />
        ) : (
          <TreeView
            maxNodeDepth={0}
            tree={tree}
            fixedColumns={this._fixedColumns}
            mainColumn={this._mainColumn}
            onSelectionChange={this._onSelectionChange}
            onRightClickSelection={this._onRightClickSelection}
            onExpandedNodesChange={this._onExpandedNodeIdsChange}
            selectedNodeId={selectedMarker}
            rightClickedNodeId={rightClickedMarkerIndex}
            expandedNodeIds={this._expandedNodeIds}
            ref={this._takeTreeViewRef}
            contextMenuId="MarkerContextMenu"
            rowHeight={16}
            indentWidth={10}
          />
        )}
      </div>
    );
  }
}

export default explicitConnect<{||}, StateProps, DispatchProps>({
  mapStateToProps: state => ({
    threadIndex: getFirstSelectedThreadIndex(state),
    scrollToSelectionGeneration: getScrollToSelectionGeneration(state),
    getMarker: selectedThreadSelectors.getMarkerGetter(state),
    markerIndexes: selectedThreadSelectors.getPreviewFilteredMarkerIndexes(
      state
    ),
    selectedMarker: selectedThreadSelectors.getSelectedMarkerIndex(state),
    rightClickedMarkerIndex: selectedThreadSelectors.getRightClickedMarkerIndex(
      state
    ),
    zeroAt: getZeroAt(state),
  }),
  mapDispatchToProps: { changeSelectedMarker, changeRightClickedMarker },
  component: MarkerTable,
});
