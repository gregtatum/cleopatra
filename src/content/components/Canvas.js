/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import React, { Component, PropTypes } from 'react';

class Canvas extends Component {
  displayName: "Canvas",

  getInitialState() {
    return {};
  },

  componentDidMount() {
    const { treeMap } = this.props;
    if (treeMap && treeMap.report) {
      this._startVisualization();
    }
  },

  shouldComponentUpdate(nextProps) {
    const oldTreeMap = this.props.treeMap;
    const newTreeMap = nextProps.treeMap;
    return oldTreeMap !== newTreeMap;
  },

  componentDidUpdate(prevProps) {
    this._stopVisualization();

    if (this.props.treeMap && this.props.treeMap.report) {
      this._startVisualization();
    }
  },

  componentWillUnmount() {
    if (this.state.stopVisualization) {
      this.state.stopVisualization();
    }
  },

  _stopVisualization() {
    if (this.state.stopVisualization) {
      this.state.stopVisualization();
      this.setState({ stopVisualization: null });
    }
  },

  _startVisualization() {
    const { container } = this.refs;
    const { report } = this.props.treeMap;
    const stopVisualization = startVisualization(container, report);
    this.setState({ stopVisualization });
  },

  render() {
    const {setDrawingContext} = this.props;

    return <canvas
      ref={el => setContext(el.getContext('2d')) />
  }
});

Canvas.propTypes = {
  value: PropTypes.any,
  onMove: PropTypes.func.isRequired,
  children: PropTypes.node,
};
