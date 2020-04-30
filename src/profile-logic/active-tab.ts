/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


import { getThreadSelectors } from "../selectors/per-thread";
import { assertExhaustiveCheck } from "../utils/flow";
import { isMainThread } from "./tracks";

import { State } from "../types/state";
import { ThreadIndex, Pid, Profile, InnerWindowID, Page, Thread } from "../types/profile";
import { GlobalTrack, ActiveTabGlobalTrack, LocalTrack, TrackIndex } from "../types/profile-derived";
import { ScreenshotPayload } from "../types/markers";

const ACTIVE_TAB_GLOBAL_TRACK_INDEX_ORDER = {
  screenshots: 0,
  tab: 1
};

/**
 * Take the global tracks and decide which one to hide during the active tab view.
 * Some global tracks are allowed, some tracks are not, and we have to do some
 * computations for some('process' type specifically).
 */
export function computeActiveTabHiddenGlobalTracks(globalTracks: GlobalTrack[], state: State): Set<TrackIndex> {
  const activeTabHiddenGlobalTracks = new Set();

  for (let trackIndex = 0; trackIndex < globalTracks.length; trackIndex++) {
    const globalTrack: GlobalTrack = globalTracks[trackIndex];
    const trackType = globalTrack.type;

    switch (trackType) {
      case 'screenshots':
        // Do not hide screenshots.
        break;
      case 'visual-progress':case 'perceptual-visual-progress':case 'contentful-visual-progress':
        // Hide those global track types because we want to hide as much as
        // possible from web developers for now.
        activeTabHiddenGlobalTracks.add(trackIndex);
        break;
      case 'process':
        {
          // Do not display empty tracks if the tab filtered thread is empty.
          if (globalTrack.mainThreadIndex !== undefined && globalTrack.mainThreadIndex !== null && isTabFilteredThreadEmpty(globalTrack.mainThreadIndex, state)) {
            // Thread is empty and we should hide it.
            activeTabHiddenGlobalTracks.add(trackIndex);
          }
          break;
        }
      default:
        throw assertExhaustiveCheck(trackType, `Unhandled GlobalTrack type.`);

    }
  }

  return activeTabHiddenGlobalTracks;
}

/**
 * Take the local tracks and decide which one to hide during the active tab view.
 * Some tracks are not allowed, and we have to do some computations for some('thread' type specifically).
 */
export function computeActiveTabHiddenLocalTracksByPid(localTracksByPid: Map<Pid, LocalTrack[]>, state: State): Map<Pid, Set<TrackIndex>> {
  const activeTabHiddenLocalTracksByPid = new Map();

  for (const [pid, localTracks] of localTracksByPid) {
    // Pre-put the new Set here, because we should keep the whole processes even though they are empty.
    const currentLocalTracks = new Set();
    activeTabHiddenLocalTracksByPid.set(pid, currentLocalTracks);
    for (let trackIndex = 0; trackIndex < localTracks.length; trackIndex++) {
      const localTrack = localTracks[trackIndex];
      const trackType = localTrack.type;

      switch (trackType) {
        case 'network':case 'memory':case 'ipc':
          {
            // Hide those global track types because we want to hide as much as
            // possible from web developers for now.
            currentLocalTracks.add(trackIndex);
            break;
          }
        case 'thread':
          {
            // We don't want to display empty tracks if the tab filtered thread is empty.
            if (localTrack.threadIndex !== undefined && localTrack.threadIndex !== null && isTabFilteredThreadEmpty(localTrack.threadIndex, state)) {
              // Thread is empty and we should hide it.
              currentLocalTracks.add(trackIndex);
            }
            break;
          }
        default:
          throw assertExhaustiveCheck(trackType, `Unhandled LocalTrack type.`);

      }
    }
  }

  return activeTabHiddenLocalTracksByPid;
}

/**
 * Checks whether the tab filtered thread is empty or not.
 * We take a look at the sample and marker data to determine that.
 */
function isTabFilteredThreadEmpty(threadIndex: ThreadIndex, state: State): boolean {
  // Have to get the thread selectors to look if the thread is empty or not.
  const threadSelectors = getThreadSelectors(threadIndex);
  const tabFilteredThread = threadSelectors.getActiveTabFilteredThread(state);
  // Check the samples first to see if they are all empty or not.
  for (const stackIndex of tabFilteredThread.samples.stack) {
    if (stackIndex !== null) {
      // Samples are not empty. Do not hide that thread.
      // We don't have to look at the markers because samples are not empty.
      return false;
    }
  }

  const tabFilteredMarkers = threadSelectors.getActiveTabFilteredMarkerIndexesWithoutGlobals(state);
  if (tabFilteredMarkers.length > 0) {
    // Thread has some markers in it. Don't hide and skip to the next global track.
    return false;
  }

  return true;
}

/**
 * Take a profile and figure out what active tab GlobalTracks it contains.
 * The returned array should contain only one thread and screenshot tracks
 */
export function computeActiveTabTracks(profile: Profile, relevantPages: Page[], state: State): {globalTracks: ActiveTabGlobalTrack[];resourceTracks: LocalTrack[];} {
  // Global tracks that are certainly global tracks.
  const globalTracks: ActiveTabGlobalTrack[] = [];
  const resourceTracks = [];
  const topmostInnerWindowIDs = getTopmostInnerWindowIDs(relevantPages);

  for (let threadIndex = 0; threadIndex < profile.threads.length; threadIndex++) {
    const thread = profile.threads[threadIndex];
    const {
      markers,
      stringTable
    } = thread;

    if (isMainThread(thread)) {
      // This is a main thread, there is a possibility that it can be a global
      // track, check if the thread contains active tab data and add it to candidates if it does.

      if (isTopmostThread(thread, topmostInnerWindowIDs)) {
        // This is a topmost thread, add it to global tracks.
        globalTracks.push({
          type: 'tab',
          threadIndex: threadIndex
        });
      } else {
        if (!isTabFilteredThreadEmpty(threadIndex, state)) {
          resourceTracks.push({ type: 'thread', threadIndex });
        }
      }
    } else {
      // This is not a main thread, it's not possible that this can be a global
      // track. Find out if that thread contains the active tab data, and add it
      // as a resource track if it does.
      if (!isTabFilteredThreadEmpty(threadIndex, state)) {
        resourceTracks.push({ type: 'thread', threadIndex });
      }
    }

    // Check for screenshots.
    const windowIDs: Set<string> = new Set();
    if (stringTable.hasString('CompositorScreenshot')) {
      const screenshotNameIndex = stringTable.indexForString('CompositorScreenshot');
      for (let markerIndex = 0; markerIndex < markers.length; markerIndex++) {
        if (markers.name[markerIndex] === screenshotNameIndex) {
          // Coerce the payload to a screenshot one. Don't do a runtime check that
          // this is correct.
          const data: ScreenshotPayload = (markers.data[markerIndex] as any);
          windowIDs.add(data.windowID);
        }
      }
      for (const id of windowIDs) {
        globalTracks.push({ type: 'screenshots', id, threadIndex });
      }
    }
  }

  // When adding a new track type, this sort ensures that the newer tracks are added
  // at the end so that the global track indexes are stable and backwards compatible.
  globalTracks.sort( // In place sort!
  (a, b) => ACTIVE_TAB_GLOBAL_TRACK_INDEX_ORDER[a.type] - ACTIVE_TAB_GLOBAL_TRACK_INDEX_ORDER[b.type]);

  return { globalTracks, resourceTracks };
}

/**
 * Gets the relevant pages and returns a set of InnerWindowIDs of topmost frames.
 */
function getTopmostInnerWindowIDs(relevantPages: Page[]): Set<InnerWindowID> {
  const topmostInnerWindowIDs = [];

  for (const page of relevantPages) {
    if (page.embedderInnerWindowID === 0) {
      topmostInnerWindowIDs.push(page.innerWindowID);
    }
  }

  return new Set(topmostInnerWindowIDs);
}

/**
 * Check if the thread is a topmost thread or not.
 * Topmost thread means the thread that belongs to the browser tab itself and not the iframe.
 */
function isTopmostThread(thread: Thread, topmostInnerWindowIDs: Set<InnerWindowID>): boolean {
  const {
    frameTable,
    markers
  } = thread;
  for (let frameIndex = 0; frameIndex < frameTable.length; frameIndex++) {
    const innerWindowID = frameTable.innerWindowID[frameIndex];
    if (innerWindowID !== null && topmostInnerWindowIDs.has(innerWindowID)) {
      return true;
    }
  }

  for (let markerIndex = 0; markerIndex < markers.length; markerIndex++) {
    const data = markers.data[markerIndex];
    if (data && data.innerWindowID && topmostInnerWindowIDs.has(data.innerWindowID)) {
      return true;
    }
  }

  return false;
}