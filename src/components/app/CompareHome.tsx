/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import React, { PureComponent } from 'react';

import { changeProfilesToCompare } from '../../actions/app';
import explicitConnect from '../../utils/connect';
import type { ConnectedProps } from '../../utils/connect';

import './CompareHome.css';

type DispatchProps = {|
  +changeProfilesToCompare: typeof changeProfilesToCompare,
|};

type Props = ConnectedProps<{||}, {||}, DispatchProps>;

type State = {|
  profile1: string,
  profile2: string,
|};

class CompareHome extends PureComponent<Props, State> {
  state = { profile1: '', profile2: '' };

  handleInputChange = (event: SyntheticInputEvent<>) => {
    const { name, value } = event.target;
    this.setState({ [name]: value });
  };

  handleFormSubmit = (e: SyntheticEvent<>) => {
    e.preventDefault();
    const { profile1, profile2 } = this.state;
    const { changeProfilesToCompare } = this.props;
    changeProfilesToCompare([profile1, profile2]);
  };

  render() {
    const { profile1, profile2 } = this.state;

    return (
      <main className="compareHome">
        <h1 className="compareHomeTitle">
          Enter the profile URLs that you’d like to compare
        </h1>
        <p>
          The tool will extract the data from the selected track and range for
          each profile, and put them both on the same view to make them easy to
          compare.
        </p>
        <form className="compareHomeForm" onSubmit={this.handleFormSubmit}>
          <label className="compareHomeFormLabel" htmlFor="compareHomeProfile1">
            Profile 1:
          </label>
          <input
            name="profile1"
            id="compareHomeProfile1"
            className="photon-input"
            type="url"
            required
            placeholder="http://"
            onChange={this.handleInputChange}
            value={profile1}
          />
          <label className="compareHomeFormLabel" htmlFor="compareHomeProfile2">
            Profile 2:
          </label>
          <input
            name="profile2"
            id="compareHomeProfile2"
            className="photon-input"
            type="url"
            required
            placeholder="http://"
            onChange={this.handleInputChange}
            value={profile2}
          />
          <input
            className="compareHomeSubmitButton"
            type="submit"
            value="Retrieve profiles"
          />
        </form>
      </main>
    );
  }
}

export default explicitConnect<{||}, {||}, DispatchProps>({
  mapDispatchToProps: { changeProfilesToCompare },
  component: CompareHome,
});
