/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import React, { PureComponent } from 'react';
import { ContextMenu, MenuItem, SubMenu } from 'react-contextmenu';
import actions from '../actions';
import { connect } from 'react-redux';
import { selectedThreadSelectors } from '../reducers/profile-view';
import { getSelectedThreadIndex } from '../reducers/url-state';
import copy from 'copy-to-clipboard';

import type { IndexIntoFuncStackTable, FuncStackInfo } from '../../common/types/profile-derived';
import type { Thread, ThreadIndex, IndexIntoFuncTable } from '../../common/types/profile';

type Props = {
  thread: Thread,
  threadIndex: ThreadIndex,
  funcStackInfo: FuncStackInfo,
  selectedFuncStack: IndexIntoFuncStackTable,
  pruneFunction: IndexIntoFuncTable => {},
  pruneSubtree: IndexIntoFuncTable => {},
};

require('./ProfileCallTreeContextMenu.css');

class ProfileCallTreeContextMenu extends PureComponent {

  constructor(props: Props) {
    super(props);
    (this: any).copyFunctionName = this.copyFunctionName.bind(this);
    (this: any).copyStack = this.copyStack.bind(this);
    (this: any).pruneFunction = this.pruneFunction.bind(this);
    (this: any).pruneSubtree = this.pruneSubtree.bind(this);
  }

  getSelectedFuncIndex(): IndexIntoFuncTable {
    const {
      selectedFuncStack,
      funcStackInfo: { funcStackTable },
    } = this.props;

    return funcStackTable.func[selectedFuncStack];
  }

  copyFunctionName(): void {
    const {
      selectedFuncStack,
      thread: { stringTable, funcTable },
      funcStackInfo: { funcStackTable },
    } = this.props;

    const funcIndex = funcStackTable.func[selectedFuncStack];
    const stringIndex = funcTable.name[funcIndex];
    const name = stringTable.getString(stringIndex);
    copy(name);
  }

  copyStack(): void {
    const {
      selectedFuncStack,
      thread: { stringTable, funcTable },
      funcStackInfo: { funcStackTable },
    } = this.props;

    let stack = '';
    let funcStackIndex = selectedFuncStack;

    do {
      const funcIndex = funcStackTable.func[funcStackIndex];
      const stringIndex = funcTable.name[funcIndex];
      stack += stringTable.getString(stringIndex) + '\n';
      funcStackIndex = funcStackTable.prefix[funcStackIndex];
    } while (funcStackIndex !== -1);

    copy(stack);
  }

  pruneFunction(): void {
    const { threadIndex } = this.props;
    this.props.pruneFunction(this.getSelectedFuncIndex(), threadIndex);
  }

  pruneSubtree(): void {
    const { threadIndex } = this.props;
    this.props.pruneSubtree(this.getSelectedFuncIndex(), threadIndex);
  }

  render() {
    return (
      <ContextMenu id={'ProfileCallTreeContextMenu'}>
        <SubMenu title='Copy' hoverDelay={200}>
          <MenuItem onClick={this.copyFunctionName}>Function Name</MenuItem>
          <MenuItem onClick={this.copyStack}>Stack</MenuItem>
        </SubMenu>
        <SubMenu title='Prune' hoverDelay={200}>
          <MenuItem onClick={this.pruneFunction}>
            This function <span className='profileCallTreeContextMenuLabel'>entire thread</span>
          </MenuItem>
          <MenuItem onClick={this.pruneSubtree}>
            This subtree <span className='profileCallTreeContextMenuLabel'>entire thread</span>
          </MenuItem>
        </SubMenu>
        <SubMenu title='Focus' hoverDelay={200}>
          <MenuItem>Calls made by this function</MenuItem>
        </SubMenu>
      </ContextMenu>
    );
  }
}

export default connect(state => {
  const threadIndex = getSelectedThreadIndex(state);
  return {
    threadIndex,
    thread: selectedThreadSelectors.getFilteredThread(state),
    funcStackInfo: selectedThreadSelectors.getFuncStackInfo(state),
    selectedFuncStack: selectedThreadSelectors.getSelectedFuncStack(state),
  };
}, actions)(ProfileCallTreeContextMenu);
