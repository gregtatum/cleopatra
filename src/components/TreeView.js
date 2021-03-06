import React, { Component, PropTypes } from 'react';
import shallowCompare from 'react-addons-shallow-compare';
import VirtualList from './VirtualList';

const TreeViewHeader = ({ fixedColumns, mainColumn }) => (
  <div className='treeViewHeader'>
    {
      fixedColumns.map(col =>
        <span className={`treeViewHeaderColumn treeViewFixedColumn ${col.propName}`}
              key={col.propName}>
          { col.title }
        </span>)
    }
    <span className={`treeViewHeaderColumn treeViewMainColumn ${mainColumn.propName}`}>
      { mainColumn.title }
    </span>
  </div>
);

TreeViewHeader.propTypes = {
  fixedColumns: PropTypes.arrayOf(PropTypes.shape({
    propName: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
  })).isRequired,
  mainColumn: PropTypes.shape({
    propName: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
  }).isRequired,
};

class TreeViewRow extends Component {

  constructor(props) {
    super(props);
    this._onClick = this._onClick.bind(this);
  }

  shouldComponentUpdate(nextProps, nextState) {
    return shallowCompare(this, nextProps, nextState);
  }

  _onClick(event) {
    const { nodeId, isExpanded, onToggle, onClick } = this.props;
    if (event.target.classList.contains('treeRowToggleButton')) {
      onToggle(nodeId, !isExpanded, event.altKey === true);
    } else {
      onClick(nodeId, event);
    }
  }

  render() {
    const { node, depth, fixedColumns, mainColumn, index, canBeExpanded, isExpanded, selected } = this.props;
    const evenOddClassName = (index % 2) === 0 ? 'even' : 'odd';
    return (
      <div className={`treeViewRow ${evenOddClassName} ${selected ? 'selected' : ''}`} style={{height: '16px'}} onClick={this._onClick}>
        {
          fixedColumns.map(col =>
            <span className={`treeViewRowColumn treeViewFixedColumn ${col.propName}`}
                  key={col.propName}>
              { node[col.propName] }
            </span>)
        }
        <span className='treeRowIndentSpacer' style={{ width: `${depth * 10}px` }}/>
        <span className={`treeRowToggleButton ${isExpanded ? 'expanded' : 'collapsed'} ${canBeExpanded ? 'canBeExpanded' : 'leaf'}`} />
        <span className={`treeViewRowColumn treeViewMainColumn ${mainColumn.propName}`}>
          { node[mainColumn.propName] }
        </span>
      </div>
    );
  }
}

TreeViewRow.propTypes = {
  node: PropTypes.object.isRequired,
  nodeId: PropTypes.number.isRequired,
  depth: PropTypes.number.isRequired,
  fixedColumns: PropTypes.arrayOf(PropTypes.shape({
    propName: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
  })).isRequired,
  mainColumn: PropTypes.shape({
    propName: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
  }).isRequired,
  index: PropTypes.number.isRequired,
  canBeExpanded: PropTypes.bool.isRequired,
  isExpanded: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  selected: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

class TreeView extends Component {

  constructor(props) {
    super(props);
    this._renderRow = this._renderRow.bind(this);
    this._toggle = this._toggle.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onRowClicked = this._onRowClicked.bind(this);
    this._specialItems = [];
    this._visibleRows = [];
  }

  scrollSelectionIntoView() {
    if (this.refs.list) {
      const { selectedNodeId, tree } = this.props;
      const rowIndex = this._visibleRows.indexOf(selectedNodeId);
      const depth = tree.getDepth(selectedNodeId);
      this.refs.list.scrollItemIntoView(rowIndex, depth * 10);
    }

  }

  shouldComponentUpdate(nextProps, nextState) {
    return shallowCompare(this, nextProps, nextState);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.selectedNodeId !== this.props.selectedNodeId) {
      this._specialItems = [nextProps.selectedNodeId];
    }
    if (nextProps.tree !== this.props.tree ||
        nextProps.expandedNodeIds !== this.props.expandedNodeIds) {
      this._visibleRows = this._getAllVisibleRows(nextProps);
    }
  }

  _renderRow(nodeId, index) {
    const { tree, expandedNodeIds, fixedColumns, mainColumn, selectedNodeId } = this.props;
    const node = tree.getNode(nodeId);
    const canBeExpanded = tree.hasChildren(nodeId);
    const isExpanded = expandedNodeIds.includes(nodeId);
    return (
      <TreeViewRow node={node}
                   fixedColumns={fixedColumns}
                   mainColumn={mainColumn}
                   depth={tree.getDepth(nodeId)}
                   nodeId={nodeId}
                   index={index}
                   canBeExpanded={canBeExpanded}
                   isExpanded={isExpanded}
                   onToggle={this._toggle}
                   selected={nodeId === selectedNodeId}
                   onClick={this._onRowClicked}/>
    );
  }

  _addVisibleRowsFromNode(props, arr, nodeId, depth) {
    arr.push(nodeId);
    if (!props.expandedNodeIds.includes(nodeId)) {
      return;
    }
    const children = props.tree.getChildren(nodeId);
    for (let i = 0; i < children.length; i++) {
      this._addVisibleRowsFromNode(props, arr, children[i], depth + 1);
    }
  }

  _getAllVisibleRows(props) {
    const roots = props.tree.getRoots();
    const allRows = [];
    for (let i = 0; i < roots.length; i++) {
      this._addVisibleRowsFromNode(props, allRows, roots[i], 0);
    }
    return allRows;
  }

  _isCollapsed(nodeId) {
    return !this.props.expandedNodeIds.includes(nodeId);
  }

  _addAllDescendants(newSet, nodeId) {
    this.props.tree.getChildren(nodeId).forEach(childId => {
      newSet.add(childId);
      this._addAllDescendants(newSet, childId);
    });
  }

  _toggle(nodeId, newExpanded = this._isCollapsed(nodeId), toggleAll = false) {
    const newSet = new Set(this.props.expandedNodeIds);
    if (newExpanded) {
      newSet.add(nodeId);
      if (toggleAll) {
        this._addAllDescendants(newSet, nodeId);
      }
    } else {
      newSet.delete(nodeId);
    }
    this.props.onExpandedNodesChange(Array.from(newSet.values()));
  }

  _toggleAll(nodeId, newExpanded = this._isCollapsed(nodeId)) {
    this._toggle(nodeId, newExpanded, true);
  }

  _select(nodeId) {
    this.props.onSelectionChange(nodeId);
  }

  _onRowClicked(nodeId, event) {
    this._select(nodeId);
    if (event.detail === 2) { // double click
      this._toggle(nodeId);
    }
  }

  _onKeyDown(event) {
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    if (event.keyCode < 37 || event.keyCode > 40) {
      if (event.keyCode !== 0 ||
          String.fromCharCode(event.charCode) !== '*') {
        return;
      }
    }
    event.stopPropagation();
    event.preventDefault();

    const selected = this.props.selectedNodeId;
    const visibleRows = this._getAllVisibleRows(this.props);
    const selectedRowIndex = visibleRows.findIndex((nodeId) => nodeId === selected);

    if (selectedRowIndex === -1) {
      this._select(visibleRows[0]);
      return;
    }

    if (event.keyCode === 37) { // KEY_LEFT
      const isCollapsed = this._isCollapsed(selected);
      if (!isCollapsed) {
        this._toggle(selected);
      } else {
        const parent = this.props.tree.getParent(selected); 
        if (parent !== -1) {
          this._select(parent);
        }
      }
    } else if (event.keyCode === 38) { // KEY_UP
      if (selectedRowIndex > 0) {
        this._select(visibleRows[selectedRowIndex - 1]);
      }
    } else if (event.keyCode === 39) { // KEY_RIGHT
      const isCollapsed = this._isCollapsed(selected);
      if (isCollapsed) {
        this._toggle(selected);
      } else {
        // Do KEY_DOWN only if the next element is a child
        if (this.props.tree.hasChildren(selected)) {
          this._select(this.props.tree.getChildren(selected)[0]);
        }
      }
    } else if (event.keyCode === 40) { // KEY_DOWN
      if (selectedRowIndex < visibleRows.length - 1) {
        this._select(visibleRows[selectedRowIndex + 1]);
      }
    } else if (String.fromCharCode(event.charCode) === '*') {
      this._toggleAll(selected);
    }
  }

  focus() {
    this.refs.list.focus();
  }

  render() {
    const { fixedColumns, mainColumn } = this.props;
    return (
      <div className='treeView'>
        <TreeViewHeader fixedColumns={fixedColumns}
                         mainColumn={mainColumn}/>
        <VirtualList className='treeViewBody'
                     items={this._visibleRows}
                     renderItem={this._renderRow}
                     itemHeight={16}
                     focusable={true}
                     onKeyDown={this._onKeyDown}
                     specialItems={this._specialItems}
                     ref='list'/>
      </div>
    );
  }

}

TreeView.propTypes = {
  fixedColumns: PropTypes.arrayOf(PropTypes.shape({
    propName: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
  })).isRequired,
  mainColumn: PropTypes.shape({
    propName: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
  }).isRequired,
  tree: PropTypes.object.isRequired,
  expandedNodeIds: PropTypes.arrayOf(PropTypes.number).isRequired,
  selectedNodeId: PropTypes.number,
  onExpandedNodesChange: PropTypes.func.isRequired,
  onSelectionChange: PropTypes.func.isRequired,
};

export default TreeView;
