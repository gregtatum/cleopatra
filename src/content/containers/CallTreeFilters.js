// @flow
import React, { PureComponent } from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import ButtonWithPanel from '../components/ButtonWithPanel';
import ArrowPanel from '../components/ArrowPanel';
import { selectedThreadSelectors, getLastAddedFilter } from '../reducers/profile-view';
import { getPruneFunctionsList, getPruneSubtreeList, getSelectedThreadIndex } from '../reducers/url-state';
import { connect } from 'react-redux';
import {
  pruneFunction,
  unpruneFunction,
  pruneSubtree,
  unpruneSubtree,
} from '../actions/profile-view';

import type { State, LastAddedFilter } from '../reducers/types';
import type { Thread, ThreadIndex, IndexIntoFuncTable } from '../../common/types/profile';

import './CallTreeFilters.css';

const PRUNE_FUNCTION_LABEL = 'prune function';
const PRUNE_SUBTREE_LABEL = 'prune subtree';
const REMOVE_FILTER_LABEL = 'remove this filter';
const HINT_ENTER_TIMEOUT = 1000;
const HINT_LEAVE_TIMEOUT = 300;
const HINT_ON_DECK_TIMEOUT = 2500;

type Props = {
  pruneFunction: typeof pruneFunction,
  unpruneFunction: typeof unpruneFunction,
  pruneSubtree: typeof pruneSubtree,
  unpruneSubtree: typeof unpruneSubtree,
  pruneFunctionsList: IndexIntoFuncTable[],
  pruneSubtreeList: IndexIntoFuncTable[],
  thread: Thread,
  threadIndex: ThreadIndex,
  lastAddedFilter: LastAddedFilter,
}

class CallTreeFilters extends PureComponent {

  props: Props;

  state: {
    lastAddedFunc: string | null,
  };

  _timeoutID: number;

  constructor(props: Props) {
    super(props);
    (this: any)._renderItem = this._renderItem.bind(this);
    this._timeoutID = 0;

    this.state = {
      lastAddedFunc: null,
    };
  }

  componentWillReceiveProps(nextProps: Props) {
    const { threadIndex, lastAddedFilter } = nextProps;
    if (this.props.lastAddedFilter !== nextProps.lastAddedFilter) {
      if (lastAddedFilter && threadIndex === lastAddedFilter.threadIndex) {
        this.setState({
          lastAddedFunc: this._funcIndexToName(lastAddedFilter.funcIndex),
        });
        this._timeoutID++;
        const timeoutID = this._timeoutID;
        setTimeout(() => {
          if (timeoutID === this._timeoutID) {
            this.setState({ lastAddedFunc: null });
          }
        }, HINT_ON_DECK_TIMEOUT);
      }
    }
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

  _changeFilterType(funcIndex: IndexIntoFuncTable, oldType: string, newType: string) {
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

  _funcIndexToName(funcIndex: IndexIntoFuncTable) {
    const { thread } = this.props;
    return thread.stringTable.getString(thread.funcTable.name[funcIndex]);
  }

  _parseFilters() {
    const { pruneFunctionsList, pruneSubtreeList } = this.props;

    return [
      ...pruneFunctionsList.map(id => ({
        id,
        name: this._funcIndexToName(id),
        type: PRUNE_FUNCTION_LABEL,
      })),
      ...pruneSubtreeList.map(id => ({
        id,
        name: this._funcIndexToName(id),
        type: PRUNE_SUBTREE_LABEL,
      })),
    ].sort((a, b) => a.name.localeCompare(b.name));
  }

  render() {
    const filters = this._parseFilters();
    const { lastAddedFunc } = this.state;

    return (
      <div>
        <ReactCSSTransitionGroup transitionName='callTreeFiltersTransition'
                                 transitionEnterTimeout={HINT_ENTER_TIMEOUT}
                                 transitionLeaveTimeout={HINT_LEAVE_TIMEOUT}
                                 component='div'
                                 className='callTreeFiltersTransitionGroup'>
          {lastAddedFunc
            ? <div className='callTreeFiltersFilterHint' key={lastAddedFunc}>
                {lastAddedFunc}
              </div>
            : null
          }
        </ReactCSSTransitionGroup>
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
      </div>
    );
  }
}

export default connect(
  (state: State) => {
    const threadIndex = getSelectedThreadIndex(state);
    return {
      thread: selectedThreadSelectors.getThread(state),
      threadIndex,
      lastAddedFilter: getLastAddedFilter(state),
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
