// @flow
import React, { PureComponent } from 'react';
import ButtonWithPanel from '../components/ButtonWithPanel';
import ArrowPanel from '../components/ArrowPanel';
import { selectedThreadSelectors } from '../reducers/profile-view';
import { getPruneFunctionsList, getPruneSubtreeList, getSelectedThreadIndex } from '../reducers/url-state';
import { connect } from 'react-redux';
import {
  pruneFunction,
  unpruneFunction,
  pruneSubtree,
  unpruneSubtree,
} from '../actions/profile-view';

import type { State } from '../reducers/types';
import type { Thread, ThreadIndex, IndexIntoFuncTable } from '../../common/types/profile';

import './CallTreeFilters.css';

const PRUNE_FUNCTION_LABEL = 'prune function';
const PRUNE_SUBTREE_LABEL = 'prune subtree';
const REMOVE_FILTER_LABEL = 'remove this filter';

type Props = {
  pruneFunction: IndexIntoFuncTable => {},
  unpruneFunction: IndexIntoFuncTable => {},
  pruneSubtree: IndexIntoFuncTable => {},
  unpruneSubtree: IndexIntoFuncTable => {},
  pruneFunctionsList: IndexIntoFuncTable[],
  pruneSubtreeList: IndexIntoFuncTable[],
  thread: Thread,
  threadIndex: ThreadIndex,
}

class CallTreeFilters extends PureComponent {

  props: Props;

  constructor(props: Props) {
    super(props);
    (this: any)._renderItem = this._renderItem.bind(this);
  }

  _renderItem({id, name, type}) {
    return (
      <tr className='callTreeFiltersRow'
           key={type + id}>
         <td className='callTreeFiltersCell callTreeFiltersType'>
           {type}
           <select className='callTreeFiltersSelect'
                   value={type}
                   onChange={(event: SyntheticInputEvent) => (
                     this._changeFilterType(id, type, event.target.value)
                   )}>
             <option>{PRUNE_FUNCTION_LABEL}</option>
             <option>{PRUNE_SUBTREE_LABEL}</option>
             <option>{REMOVE_FILTER_LABEL}</option>
           </select>
         </td>
         <td className='callTreeFiltersCell callTreeFiltersAppliedWhere'>
            Entire Thread
         </td>
        <td className='callTreeFiltersCell callTreeFiltersListItemName' title={name}>
          {name}
        </td>
      </tr>
    );
  }

  _changeFilterType(funcIndex, oldType, newType) {
    const {
      unpruneFunction, pruneSubtree, unpruneSubtree, threadIndex,
    } = this.props;
    switch (oldType) {
      case PRUNE_FUNCTION_LABEL:
        unpruneFunction(funcIndex, threadIndex);
        break;
      case PRUNE_SUBTREE_LABEL:
        unpruneSubtree(funcIndex, threadIndex);
        break;
    }

    switch (newType) {
      case PRUNE_FUNCTION_LABEL:
        pruneFunction(funcIndex, threadIndex);
        this.props.pruneFunction(funcIndex, threadIndex);
        break;
      case PRUNE_SUBTREE_LABEL:
        pruneSubtree(funcIndex, threadIndex);
        break;
    }
  }

  _parseFilters() {
    const { pruneFunctionsList, pruneSubtreeList, thread } = this.props;
    const funcIdToName = funcIndex => {
      return thread.stringTable.getString(thread.funcTable.name[funcIndex]);
    };

    return [
      ...pruneFunctionsList.map(id => ({
        id,
        name: funcIdToName(id),
        type: PRUNE_FUNCTION_LABEL,
      })),
      ...pruneSubtreeList.map(id => ({
        id,
        name: funcIdToName(id),
        type: PRUNE_SUBTREE_LABEL,
      })),
    ].sort((a, b) => a.name.localeCompare(b.name));
  }

  render() {
    const filters = this._parseFilters();

    return (
      <ButtonWithPanel className='callTreeFilters'
                       label='Filter'
                       panel={
        <ArrowPanel className='callTreeFiltersPanel'
                    title='Pruned functions and subtrees'
                    offsetDirection='left'>
          <div className='callTreeFiltersScroller'>
            <table className='callTreeFiltersTable'>
              <thead>
                <tr>
                  <th className='callTreeFiltersCellHeader'>Filter</th>
                  <th className='callTreeFiltersCellHeader'>Where</th>
                  <th className='callTreeFiltersCellHeader'>Function</th>
                </tr>
              </thead>
              <tbody>
                {
                  filters.length > 0
                    ? filters.map(this._renderItem)
                    : <tr>
                        <td colSpan={3} className='callTreeFiltersEmpty'>
                          <p className='callTreeFiltersEmptyP'>
                            No filters are currently active. Right click on the call tree,
                            and prune away individual functions or entire subtrees of the
                            call tree. These filters help to hide away noisy functions that
                            get in the way of performance analysis.
                          </p>
                        </td>
                      </tr>
                }
              </tbody>
            </table>
          </div>
        </ArrowPanel>
      }/>
    );
  }
}

export default connect(
  (state: State) => {
    const threadIndex = getSelectedThreadIndex(state);
    return {
      thread: selectedThreadSelectors.getThread(state),
      threadIndex,
      pruneFunctionsList: getPruneFunctionsList(state, threadIndex),
      pruneSubtreeList: getPruneSubtreeList(state, threadIndex),
    };
  },
  {
    pruneFunction,
    unpruneFunction,
    pruneSubtree,
    unpruneSubtree,
  }
)(CallTreeFilters);
