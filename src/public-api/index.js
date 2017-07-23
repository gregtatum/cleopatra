/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import { unserializeProfileOfArbitraryFormat as processProfile } from '../profile-logic/process-profile';
import { getCallTree } from '../profile-logic/profile-tree';

export { processProfile, getCallTree };
