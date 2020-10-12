/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { stripIndent } from 'common-tags';
import { GetState, Dispatch } from '../types/store';
import { selectorsForConsole } from 'firefox-profiler/selectors';
import actions from '../actions';

// Despite providing a good libdef for Object.defineProperty, Flow still
// special-cases the `value` property: if it's missing it throws an error. Using
// this indirection seems to work around this issue.
// See https://github.com/facebook/flow/issues/285
const defineProperty = Object.defineProperty;

/**
 * This function adds various values from the Redux Store to the window object so that
 * people can access useful things.
 */
export function addDataToWindowObject(
  getState: GetState,
  dispatch: Dispatch,
  target: any = window
) {
  defineProperty(target, 'profile', {
    enumerable: true,
    get() {
      return selectorsForConsole.profile.getProfile(getState());
    },
  });

  defineProperty(target, 'filteredThread', {
    enumerable: true,
    get() {
      return selectorsForConsole.selectedThread.getPreviewFilteredThread(
        getState()
      );
    },
  });

  defineProperty(target, 'callTree', {
    enumerable: true,
    get() {
      return selectorsForConsole.selectedThread.getCallTree(getState());
    },
  });

  defineProperty(target, 'filteredMarkers', {
    enumerable: true,
    get() {
      const state = getState();
      const getMarker = selectorsForConsole.selectedThread.getMarkerGetter(
        state
      );
      const markerIndexes = selectorsForConsole.selectedThread.getPreviewFilteredMarkerIndexes(
        state
      );
      return markerIndexes.map(getMarker);
    },
  });

  target.getState = getState;
  target.selectors = selectorsForConsole;
  target.dispatch = dispatch;
  target.actions = actions;
}

export function logFriendlyPreamble() {
  /**
   * Provide a friendly message to the end user to notify them that they can access certain
   * values from the global window object. These variables are set in an ad-hoc fashion
   * throughout the code.
   */
  const intro = `font-size: 130%;`;
  const bold = `font-weight: bold;`;
  const link = `font-style: italic; text-decoration: underline;`;
  const reset = '';
  console.log(
    // This is gratuitous, I know:
    [
      '%c  __ _           __                                  ',
      ' / _(_)         / _|                                 ',
      '| |_ _ _ __ ___| |_ _____  __                        ',
      "|  _| | '__/ _ \\  _/ _ \\ \\/ /                        ",
      '| | | | | |  __/ || (_) >  <       __ _ _            ',
      '|_| |_|_|  \\___|_| \\___/_/\\_\\     / _(_) |           ',
      '    ,.       ,.   _ __  _ __ ___ | |_ _| | ___ _ _   ',
      "    | \\     / |  | '_ \\| '__/ _ \\|  _| | |/ _ \\ '_|  ",
      '    |/ \\ _ / \\|  | |_) | | | (_) | | | | |  __/ |    ',
      '    |         |  | .__/|_|  \\___/|_| |_|_|\\___|_|    ',
      '    /  -    - \\  |_|                                     ',
      '  ,-    V__V   -.                                     ',
      ' -=  __-  * - .,=-                                    ',
      '  `\\_    -   _/                                       ',
      "      `-----'                                         ",
    ].join('\n'),
    'font-family: Menlo, monospace;'
  );

  console.log(
    stripIndent`
      %cThe following profiler information is available via the console:%c

      %cwindow.profile%c - The currently loaded profile
      %cwindow.filteredThread%c - The current filtered thread
      %cwindow.filteredMarkers%c - The current filtered and processed markers
      %cwindow.callTree%c - The call tree of the current filtered thread
      %cwindow.getState%c - The function that returns the current Redux state.
      %cwindow.selectors%c - All the selectors that are used to get data from the Redux state.
      %cwindow.dispatch%c - The function to dispatch a Redux action to change the state.
      %cwindow.actions%c - All the actions that can be dispatched to change the state.

      The profile format is documented here:
      %chttps://github.com/firefox-devtools/profiler/blob/master/docs-developer/processed-profile-format.md%c

      The CallTree class's source code is available here:
      %chttps://github.com/firefox-devtools/profiler/blob/master/src/profile-logic/call-tree.js%c
    `, // "The following profiler..."
    intro,
    reset, // "window.profile"
    bold,
    reset, // "window.filteredThread"
    bold,
    reset, // "window.filteredMarkers"
    bold,
    reset, // "window.callTree"
    bold,
    reset, // "window.getState"
    bold,
    reset, // "window.selectors"
    bold,
    reset, // "window.dispatch"
    bold,
    reset, // "window.actions"
    bold,
    reset, // "processed-profile-format.md"
    link,
    reset, // "call-tree.js"
    link,
    reset
  );
}
