/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import { unserializeProfileOfArbitraryFormat } from '../profile-logic/process-profile';
import { getCallTree } from '../profile-logic/profile-tree';
import {
  getFuncStackInfo,
  getFriendlyThreadName,
} from '../profile-logic/profile-data';

import type { Profile, Thread } from '../types/profile';
import type { FuncStackInfo } from '../types/profile-derived';
import type { ImplementationFilter } from '../types/actions';
import type { ProfileTreeClass as ProfileTree } from '../profile-logic/profile-tree';

type CallTreeOptions = {
  invert?: boolean,
  funcStackInfo?: FuncStackInfo,
  implementationFilter?: ImplementationFilter,
};

function getCallTreePublic(
  profile: Profile,
  thread: Thread,
  options?: CallTreeOptions = {}
): ProfileTree {
  return getCallTree(
    thread,
    profile.meta.interval,
    options.funcStackInfo ||
      getFuncStackInfo(thread.stackTable, thread.frameTable, thread.funcTable),
    options.implementationFilter || 'combined',
    options.invert || false
  );
}

export {
  unserializeProfileOfArbitraryFormat as processProfile,
  getCallTreePublic as getCallTree,
  getFriendlyThreadName,
};
