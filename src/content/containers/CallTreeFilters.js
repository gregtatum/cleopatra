import React, { PureComponent } from 'react';
import ButtonWithPanel from '../components/ButtonWithPanel';
import ArrowPanel from '../components/ArrowPanel';
import Reorderable from '../components/Reorderable';
import classNames from 'classnames';

import './CallTreeFilters.css';

class CallTreeFilters extends PureComponent {
  render() {
    return (
      <ButtonWithPanel className='callTreeFilters'
                       label='Filter'
                       panel={
        <ArrowPanel className='callTreeFiltersPanel'
                    title={'Active Filters'}>
          <Reorderable tagName='div'
                       className='callTreeFiltersList'
                       order={[0, 1, 2, 3]}
                       orient='vertical'
                       onChangeOrder={() => {}}>
            {[
              [
                'Hide "CFEqual"',
                'only',
                true,
              ],
              [
                'Hide "_DPSNextEvent"',
                'and descendants',
                false,
              ],
              [
                'Hide "PVsync::Msg_Notify"',
                'only',
                true,
              ],
              [
                'Hide "PTexture::Msg___delete__"',
                'and descendants',
                true,
              ],
            ].map(([name, type, active]) => (
              <div className={classNames('callTreeFiltersListItem', active ? 'active' : null)}>
                <input className='callTreeFiltersCheckbox' type='checkbox' checked={active} />
                <span className='callTreeFiltersListItemName'>{name}</span>
                <span className='callTreeFiltersSelectWrapper'>
                  {type}
                  <select className='callTreeFiltersSelect'>
                    <option>{type}</option>
                  </select>
                </span>
              </div>
            ))}
          </Reorderable>
        </ArrowPanel>
      }/>
    );
  }
}

export default CallTreeFilters;
