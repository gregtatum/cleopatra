/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


import * as React from 'react';
import { ProfileName } from '../../components/app/ProfileName';
import { storeWithProfile } from '../fixtures/stores';
import { getProfileFromTextSamples } from '../fixtures/profiles/processed-profile';
import { render, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { getProfileNameFromUrl } from 'firefox-profiler/selectors';
import { changeProfileName } from 'firefox-profiler/actions/profile-view';

describe('ProfileName', function() {
  const defaultName = 'Firefox – macOS 10.14';

  function setup(profileName?: string) {
    const { profile } = getProfileFromTextSamples('A');
    Object.assign(profile.meta, {
      oscpu: 'Intel Mac OS X 10.14',
      platform: 'Macintosh',
      toolkit: 'cocoa',
    });

    const store = storeWithProfile(profile);
    if (profileName) {
      store.dispatch(changeProfileName(profileName));
    }
    const renderResult = render(
      <Provider store={store}>
        <ProfileName />
      </Provider>
    );
    return { ...store, ...renderResult };
  }

  it('matches the snapshot', function() {
    const { container } = setup();
    expect(container).toMatchSnapshot();
  });

  it('has a default name', function() {
    const { getByText } = setup();
    expect(getByText(defaultName)).toBeTruthy();
  });

  it('can edit the name', function() {
    const { getByText, queryByText, getByDisplayValue, getState } = setup();
    const button = getByText(defaultName);

    // Test the default state.
    expect(getByText(defaultName)).toBeTruthy();
    expect(getProfileNameFromUrl(getState())).toBe(null);

    // Click the button to activate it.
    button.click();
    const input = getByDisplayValue(defaultName);

    expect(queryByText('Custom name')).toBeFalsy();

    // Change the input, and blur it.
    fireEvent.change(input, { target: { value: 'Custom name' } });
    fireEvent.blur(input);

    expect(getByText('Custom name')).toBeTruthy();
    expect(getProfileNameFromUrl(getState())).toBe('Custom name');
  });

  it('will use a url-provided profile name', function() {
    const { getByText } = setup('Custom name from URL');

    expect(getByText('Custom name from URL')).toBeTruthy();
  });
});
