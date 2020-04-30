/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


import { createSelector } from "reselect";

import { getProfileViewOptions } from "./profile";

import { ThreadIndex } from "../types/profile";
import { CallNodePath } from "../types/profile-derived";
import { Selector } from "../types/store";

export type RightClickedCallNodeInfo = {
  readonly threadIndex: ThreadIndex;
  readonly callNodePath: CallNodePath;
};

export const getRightClickedCallNodeInfo: Selector<RightClickedCallNodeInfo | null> = createSelector(getProfileViewOptions, viewOptions => viewOptions.rightClickedCallNode);