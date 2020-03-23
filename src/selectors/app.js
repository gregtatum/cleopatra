/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import { createSelector } from 'reselect';

import { getDataSource, getSelectedTab, getShowTabOnly } from './url-state';
import {
  getGlobalTracks,
  getLocalTracksByPid,
  getComputedHiddenGlobalTracks,
  getComputedHiddenLocalTracksByPid,
  getActiveTabGlobalTracks,
  getActiveTabResourceTracks,
} from './profile';
import { getZipFileState } from './zipped-profiles.js';
import { assertExhaustiveCheck, ensureExists } from '../utils/flow';
import {
  TRACK_SCREENSHOT_HEIGHT,
  TRACK_ACTIVE_TAB_SCREENSHOT_HEIGHT,
  TRACK_NETWORK_HEIGHT,
  TRACK_MEMORY_HEIGHT,
  TRACK_IPC_HEIGHT,
  TRACK_PROCESS_BLANK_HEIGHT,
  TIMELINE_RULER_HEIGHT,
  TIMELINE_SETTINGS_HEIGHT,
  TRACK_VISUAL_PROGRESS_HEIGHT,
} from '../app-logic/constants';

import type { TabSlug } from '../app-logic/tabs-handling';
import type { AppState, AppViewState, UrlSetupPhase } from '../types/state';
import type { Selector } from '../types/store';
import type { CssPixels } from '../types/units';
import type { ThreadIndex } from '../types/profile';

/**
 * Simple selectors into the app state.
 */
export const getApp: Selector<AppState> = state => state.app;
export const getView: Selector<AppViewState> = state => getApp(state).view;
export const getUrlSetupPhase: Selector<UrlSetupPhase> = state =>
  getApp(state).urlSetupPhase;
export const getHasZoomedViaMousewheel: Selector<boolean> = state => {
  return getApp(state).hasZoomedViaMousewheel;
};
export const getIsSidebarOpen: Selector<boolean> = state =>
  getApp(state).isSidebarOpenPerPanel[getSelectedTab(state)];
export const getPanelLayoutGeneration: Selector<number> = state =>
  getApp(state).panelLayoutGeneration;
export const getLastVisibleThreadTabSlug: Selector<TabSlug> = state =>
  getApp(state).lastVisibleThreadTabSlug;
export const getTrackThreadHeights: Selector<
  Array<ThreadIndex | void>
> = state => getApp(state).trackThreadHeights;
export const getIsNewlyPublished: Selector<boolean> = state =>
  getApp(state).isNewlyPublished;

export const getIsDragAndDropDragging: Selector<boolean> = state =>
  getApp(state).isDragAndDropDragging;
export const getIsDragAndDropOverlayRegistered: Selector<boolean> = state =>
  getApp(state).isDragAndDropOverlayRegistered;

/**
 * This selector takes all of the tracks, and deduces the height in CssPixels
 * of the timeline. This is here to calculate the max-height of the timeline
 * for the splitter component.
 *
 * The height of the component is determined by the sizing of each track in the list.
 * Most sizes are pretty static, and are set through values in the component. The only
 * tricky value to determine is the thread track. These values get reported to the store
 * and get added in here.
 */
export const getTimelineHeight: Selector<null | CssPixels> = createSelector(
  getGlobalTracks,
  getLocalTracksByPid,
  getActiveTabGlobalTracks,
  getActiveTabResourceTracks,
  getComputedHiddenGlobalTracks,
  getComputedHiddenLocalTracksByPid,
  getTrackThreadHeights,
  getShowTabOnly,
  (
    globalTracks,
    localTracksByPid,
    activeTabGlobalTracks,
    activeTabResourceTracks,
    hiddenGlobalTracks,
    hiddenLocalTracksByPid,
    trackThreadHeights,
    showTabOnly
  ) => {
    let height = TIMELINE_RULER_HEIGHT;
    let effectiveGlobalTracks;
    if (showTabOnly === null) {
      effectiveGlobalTracks = globalTracks;
      height += TIMELINE_SETTINGS_HEIGHT;
    } else {
      effectiveGlobalTracks = activeTabGlobalTracks;
    }
    const border = 1;

    for (const [trackIndex, globalTrack] of effectiveGlobalTracks.entries()) {
      if (!hiddenGlobalTracks.has(trackIndex)) {
        switch (globalTrack.type) {
          case 'screenshots':
            if (showTabOnly === null) {
              height += TRACK_SCREENSHOT_HEIGHT + border;
            } else {
              height += TRACK_ACTIVE_TAB_SCREENSHOT_HEIGHT + border;
            }
            break;
          case 'visual-progress':
          case 'perceptual-visual-progress':
          case 'contentful-visual-progress':
            height += TRACK_VISUAL_PROGRESS_HEIGHT;
            break;
          case 'process':
            {
              // The thread tracks have enough complexity that it warrants measuring
              // them rather than statically using a value like the other tracks.
              const { mainThreadIndex } = globalTrack;
              if (mainThreadIndex === null) {
                height += TRACK_PROCESS_BLANK_HEIGHT + border;
              } else {
                const trackThreadHeight = trackThreadHeights[mainThreadIndex];
                if (trackThreadHeight === undefined) {
                  // The height isn't computed yet, return.
                  return null;
                }
                height += trackThreadHeight + border;
              }
            }
            break;
          default:
            throw assertExhaustiveCheck(globalTrack);
        }
      }
    }

    // Figure out which PIDs are hidden.
    const hiddenPids = new Set();
    for (const trackIndex of hiddenGlobalTracks) {
      const globalTrack = globalTracks[trackIndex];
      if (globalTrack.type === 'process') {
        hiddenPids.add(globalTrack.pid);
      }
    }

    if (showTabOnly === null) {
      for (const [pid, localTracks] of localTracksByPid) {
        if (hiddenPids.has(pid)) {
          // This track is hidden already.
          continue;
        }
        for (const [trackIndex, localTrack] of localTracks.entries()) {
          const hiddenLocalTracks = ensureExists(
            hiddenLocalTracksByPid.get(pid),
            'Could not look up the hidden local tracks from the given PID'
          );
          if (!hiddenLocalTracks.has(trackIndex)) {
            switch (localTrack.type) {
              case 'thread':
                {
                  // The thread tracks have enough complexity that it warrants measuring
                  // them rather than statically using a value like the other tracks.
                  const trackThreadHeight =
                    trackThreadHeights[localTrack.threadIndex];
                  if (trackThreadHeight === undefined) {
                    // The height isn't computed yet, return.
                    return null;
                  }
                  height += trackThreadHeight + border;
                }

                break;
              case 'network':
                if (!showTabOnly) {
                  height += TRACK_NETWORK_HEIGHT + border;
                }
                break;
              case 'memory':
                if (!showTabOnly) {
                  height += TRACK_MEMORY_HEIGHT + border;
                }
                break;
              case 'ipc':
                if (!showTabOnly) {
                  height += TRACK_IPC_HEIGHT + border;
                }
                break;
              default:
                throw assertExhaustiveCheck(localTrack);
            }
          }
        }
      }
    } else {
      if (activeTabResourceTracks.length > 0) {
        // FIXME: this is height of resources
        height += 20;
      }
      for (const resourceTrack of activeTabResourceTracks) {
        switch (resourceTrack.type) {
          case 'thread':
            {
              // The thread tracks have enough complexity that it warrants measuring
              // them rather than statically using a value like the other tracks.
              const trackThreadHeight =
                trackThreadHeights[resourceTrack.threadIndex];
              if (trackThreadHeight === undefined) {
                // The height isn't computed yet, return.
                console.log('CANOVA: no height for thread');
                return null;
              }
              height += trackThreadHeight + border;
            }
            break;
          case 'network':
          case 'memory':
          case 'ipc':
            break;
          default:
            throw assertExhaustiveCheck(resourceTrack);
        }
      }
    }

    return height;
  }
);

/**
 * This selector lets us know if it is safe to load a new profile. If
 * the app is already busy loading a profile, this selector returns
 * false.
 *
 * Used by the drag and drop component in order to determine if it can
 * load a dropped profile file.
 */
export const getIsNewProfileLoadAllowed: Selector<boolean> = createSelector(
  getView,
  getDataSource,
  getZipFileState,
  (view, dataSource, zipFileState) => {
    const appPhase = view.phase;
    const zipPhase = zipFileState.phase;
    const isLoading =
      (appPhase === 'INITIALIZING' && dataSource !== 'none') ||
      zipPhase === 'PROCESS_PROFILE_FROM_ZIP_FILE';
    return !isLoading;
  }
);
