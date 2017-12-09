/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import React, { PureComponent } from 'react';
import { connect } from 'react-redux';
import { changeInvertCallstack } from '../../actions/profile-view';
import { getInvertCallstack } from '../../reducers/url-state';
import StackSearchField from '../shared/StackSearchField';

import './Settings.css';

type Props = {|
  +hidePlatformDetails: boolean,
  +invertCallstack: boolean,
  +changeInvertCallstack: boolean => void,
|};

class FlameGraphSettings extends PureComponent<Props> {
  constructor(props) {
    super(props);
    (this: any)._onInvertCallstackClick = this._onInvertCallstackClick.bind(
      this
    );
  }

  _onInvertCallstackClick(e: SyntheticMouseEvent<HTMLInputElement>) {
    this.props.changeInvertCallstack(e.currentTarget.checked);
  }

  render() {
    const { invertCallstack } = this.props;
    return (
      <div className="flameGraphSettings">
        <ul className="flameGraphSettingsList">
          <li className="flameGraphSettingsListItem">
            <label className="flameGraphSettingsLabel">
              <input
                type="checkbox"
                className="flameGraphSettingsCheckbox"
                onChange={this._onInvertCallstackClick}
                checked={invertCallstack}
              />
              {' Invert call stack'}
            </label>
          </li>
        </ul>
        <StackSearchField className="flameGraphSettingsSearchField" />
      </div>
    );
  }
}

export default connect(
  state => ({
    invertCallstack: getInvertCallstack(state),
  }),
  {
    changeInvertCallstack,
  }
)(FlameGraphSettings);
