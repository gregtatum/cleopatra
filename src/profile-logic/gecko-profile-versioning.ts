/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This file deals with old versions of the Gecko profile format, i.e. the
 * format that the Gecko profiler platform outputs. We want to be able to
 * run profiler.firefox.com on non-Nightly versions of Firefox, and we want
 * to be able to load old saved profiles, so this file upgrades old profiles
 * to the current format.
 */
import {
  upgradeGCMinorMarker,
  upgradeGCMajorMarker_Gecko8To9,
} from './convert-markers';
import { UniqueStringArray } from '../utils/unique-string-array';
import { GECKO_PROFILE_VERSION } from '../app-logic/constants';

// Gecko profiles before version 1 did not have a profile.meta.version field.
// Treat those as version zero.
const UNANNOTATED_VERSION = 0;

/**
 * Upgrades the supplied profile to the current version, by mutating |profile|.
 * Throws an exception if the profile is too new.
 * @param {object} profile The profile in the "Gecko profile" format.
 */
export function upgradeGeckoProfileToCurrentVersion(profile: {
  [name: string]: any,
}) {
  const profileVersion = profile.meta.version || UNANNOTATED_VERSION;
  if (profileVersion === GECKO_PROFILE_VERSION) {
    return;
  }

  if (profileVersion > GECKO_PROFILE_VERSION) {
    throw new Error(
      `Unable to parse a Gecko profile of version ${profileVersion}, most likely profiler.firefox.com needs to be refreshed. ` +
        `The most recent version understood by this version of profiler.firefox.com is version ${GECKO_PROFILE_VERSION}.\n` +
        'You can try refreshing this page in case profiler.firefox.com has updated in the meantime.'
    );
  }

  // Convert to GECKO_PROFILE_VERSION, one step at a time.
  for (
    let destVersion = profileVersion + 1;
    destVersion <= GECKO_PROFILE_VERSION;
    destVersion++
  ) {
    if (destVersion in _upgraders) {
      _upgraders[destVersion](profile);
    }
  }

  profile.meta.version = GECKO_PROFILE_VERSION;
}

function _archFromAbi(abi) {
  if (abi === 'x86_64-gcc3') {
    return 'x86_64';
  }
  return abi;
}

// _upgraders[i] converts from version i - 1 to version i.
// Every "upgrader" takes the profile as its single argument and mutates it.

/* eslint-disable no-useless-computed-key */
const _upgraders = {
  [1]: () => {
    throw new Error(
      'Gecko profiles without version numbers are very old and no conversion code has been written for that version of the profile format.'
    );
  },
  [2]: () => {
    throw new Error(
      'Gecko profile version 1 is very old and no conversion code has been written for that version of the profile format.'
    );
  },
  [3]: () => {
    throw new Error(
      'Gecko profile version 2 is very old and no conversion code has been written for that version of the profile format.'
    );
  },
  [4]: profile => {
    function convertToVersionFourRecursive(p) {
      // In version < 3, p.libs was a JSON string.
      // Starting with version 4, libs is an actual array, each lib has
      // "debugName", "debugPath", "breakpadId" and "path" fields, and the
      // array is sorted by start address.
      p.libs = JSON.parse(p.libs)
        .map(lib => {
          if ('breakpadId' in lib) {
            lib.debugName = lib.name.substr(lib.name.lastIndexOf('/') + 1);
          } else {
            lib.debugName = lib.pdbName;
            const pdbSig = lib.pdbSignature.replace(/[{}-]/g, '').toUpperCase();
            lib.breakpadId = pdbSig + lib.pdbAge;
          }
          delete lib.pdbName;
          delete lib.pdbAge;
          delete lib.pdbSignature;
          lib.path = lib.name;
          lib.name = lib.debugName.endsWith('.pdb')
            ? lib.debugName.substr(0, lib.debugName.length - 4)
            : lib.debugName;
          lib.arch = _archFromAbi(p.meta.abi);
          lib.debugPath = '';
          return lib;
        })
        .sort((a, b) => a.start - b.start);

      for (let threadIndex = 0; threadIndex < p.threads.length; threadIndex++) {
        if (typeof p.threads[threadIndex] === 'string') {
          // Also do the modification to embedded subprocess profiles.
          const subprocessProfile = JSON.parse(p.threads[threadIndex]);
          convertToVersionFourRecursive(subprocessProfile);
          p.threads[threadIndex] = JSON.stringify(subprocessProfile);
        } else {
          // At the beginning of format version 3, the thread name for any
          // threads in a "tab" process was "Content", and the processType
          // field did not exist. When this was changed, the version was not
          // updated, so we handle both cases here.
          const thread = p.threads[threadIndex];
          if (!('processType' in thread)) {
            if (thread.name === 'Content') {
              thread.processType = 'tab';
              thread.name = 'GeckoMain';
            } else if (thread.name === 'Plugin') {
              thread.processType = 'plugin';
            } else {
              thread.processType = 'default';
            }
          }
        }
      }

      p.meta.version = 4;
    }
    convertToVersionFourRecursive(profile);
  },
  [5]: profile => {
    // In version 4, profiles from other processes were embedded as JSON
    // strings in the threads array. Version 5 breaks those out into a
    // separate "processes" array and no longer stringifies them.
    function convertToVersionFiveRecursive(p) {
      const allThreadsAndProcesses = p.threads.map(threadOrProcess => {
        if (typeof threadOrProcess === 'string') {
          const processProfile = JSON.parse(threadOrProcess);
          convertToVersionFiveRecursive(processProfile);
          return {
            type: 'process',
            data: processProfile,
          };
        }
        return {
          type: 'thread',
          data: threadOrProcess,
        };
      });
      p.processes = allThreadsAndProcesses
        .filter(x => x.type === 'process')
        .map(p => p.data);
      p.threads = allThreadsAndProcesses
        .filter(x => x.type === 'thread')
        .map(t => t.data);
      p.meta.version = 5;
    }
    convertToVersionFiveRecursive(profile);
  },
  [6]: profile => {
    // The frameNumber column was removed from the samples table.
    function convertToVersionSixRecursive(p) {
      for (const thread of p.threads) {
        delete thread.samples.schema.frameNumber;
        for (
          let sampleIndex = 0;
          sampleIndex < thread.samples.data.length;
          sampleIndex++
        ) {
          // Truncate the array to a maximum length of 5.
          // The frameNumber used to be the last item, at index 5.
          thread.samples.data[sampleIndex].splice(5);
        }
      }
      for (const subprocessProfile of p.processes) {
        convertToVersionSixRecursive(subprocessProfile);
      }
    }
    convertToVersionSixRecursive(profile);
  },
  [7]: profile => {
    // The type field for DOMEventMarkerPayload was renamed to eventType.
    function convertToVersionSevenRecursive(p) {
      for (const thread of p.threads) {
        const stringTable = new UniqueStringArray(thread.stringTable);
        const nameIndex = thread.markers.schema.name;
        const dataIndex = thread.markers.schema.data;
        for (let i = 0; i < thread.markers.data.length; i++) {
          const name = stringTable.getString(thread.markers.data[i][nameIndex]);
          if (name === 'DOMEvent') {
            const data = thread.markers.data[i][dataIndex];
            data.eventType = data.type;
            data.type = 'DOMEvent';
          }
        }
      }
      for (const subprocessProfile of p.processes) {
        convertToVersionSevenRecursive(subprocessProfile);
      }
    }
    convertToVersionSevenRecursive(profile);
  },
  [8]: profile => {
    // Profiles have the following new attributes:
    //  - meta.shutdownTime: null if the process is still running, otherwise
    //    the shutdown time of the process in milliseconds relative to
    //    meta.startTime
    //  - pausedRanges: an array of
    //    { startTime: number | null, endTime: number | null, reason: string }
    // Each thread has the following new attributes:
    //  - registerTime: The time this thread was registered with the profiler,
    //    in milliseconds since meta.startTime
    //  - unregisterTime: The time this thread was unregistered from the
    //    profiler, in milliseconds since meta.startTime, or null
    function convertToVersionEightRecursive(p) {
      // We can't invent missing data, so just initialize everything with some
      // kind of empty value.

      // "The profiler was never paused during the recorded range, and we never
      // collected a profile."
      p.pausedRanges = [];

      // "All processes were still alive by the time the profile was captured."
      p.meta.shutdownTime = null;

      for (const thread of p.threads) {
        // "All threads were registered instantly at process startup."
        thread.registerTime = 0;

        // "All threads were still alive by the time the profile was captured."
        thread.unregisterTime = null;
      }
      for (const subprocessProfile of p.processes) {
        convertToVersionEightRecursive(subprocessProfile);
      }
    }
    convertToVersionEightRecursive(profile);
  },
  [9]: profile => {
    function convertToVersionNineRecursive(p) {
      for (const thread of p.threads) {
        //const stringTable = new UniqueStringArray(thread.stringTable);
        //const nameIndex = thread.markers.schema.name;
        const dataIndex = thread.markers.schema.data;
        for (let i = 0; i < thread.markers.data.length; i++) {
          let marker = thread.markers.data[i][dataIndex];
          if (marker) {
            switch (marker.type) {
              case 'GCMinor':
                marker = upgradeGCMinorMarker(marker);
                break;
              case 'GCMajor':
                marker = upgradeGCMajorMarker_Gecko8To9(marker);
                break;
              default:
                break;
            }
            thread.markers.data[i][dataIndex] = marker;
          }
        }
      }
      for (const subprocessProfile of p.processes) {
        convertToVersionNineRecursive(subprocessProfile);
      }
    }
    convertToVersionNineRecursive(profile);
  },
  [10]: profile => {
    // Removed the startDate and endDate from DOMEventMarkerPayload and
    // made it a tracing marker instead. DOMEventMarkerPayload is no longer a
    // single marker, it requires a start and an end marker. Therefore, we have
    // to change the old DOMEvent marker and also create an end marker for each
    // DOMEvent.
    function convertToVersionTenRecursive(p) {
      for (const thread of p.threads) {
        const { markers } = thread;
        const stringTable = new UniqueStringArray(thread.stringTable);
        const nameIndex = markers.schema.name;
        const dataIndex = markers.schema.data;
        const timeIndex = markers.schema.time;
        const extraMarkers = [];
        for (let i = 0; i < markers.data.length; i++) {
          const marker = markers.data[i];
          const name = stringTable.getString(marker[nameIndex]);
          const data = marker[dataIndex];
          if (name === 'DOMEvent' && data.type !== 'tracing') {
            const endMarker = [];
            endMarker[dataIndex] = {
              type: 'tracing',
              category: 'DOMEvent',
              timeStamp: data.timeStamp,
              interval: 'end',
              eventType: data.eventType,
              phase: data.phase,
            };
            endMarker[timeIndex] = data.endTime;
            endMarker[nameIndex] = marker[nameIndex];
            extraMarkers.push(endMarker);

            marker[timeIndex] = data.startTime;
            marker[dataIndex] = {
              type: 'tracing',
              category: 'DOMEvent',
              timeStamp: data.timeStamp,
              interval: 'start',
              eventType: data.eventType,
              phase: data.phase,
            };
          }
        }

        // Add all extraMarkers to the end of the markers array. In the Gecko
        // profile format, markers don't need to be sorted by time.
        markers.data = markers.data.concat(extraMarkers);
      }
      for (const subprocessProfile of p.processes) {
        convertToVersionTenRecursive(subprocessProfile);
      }
    }
    convertToVersionTenRecursive(profile);
  },
  [11]: profile => {
    // Ensure there is always a pid in the profile meta AND upgrade
    // profile.meta categories.

    // This first upgrader ensures there is always a PID. The PID has been included
    // in the Gecko profile version for quite a while, but there has never been
    // an upgrader ensuring that one exists. This pid upgrader is piggy-backing on
    // version 11, but is unrelated to the actual version bump. If no pid number exists,
    // then a unique string label is created.
    let unknownPid = 0;
    function ensurePidsRecursive(p) {
      for (const thread of p.threads) {
        if (thread.pid === null || thread.pid === undefined) {
          thread.pid = `Unknown Process ${++unknownPid}`;
        }
      }
      for (const subprocessProfile of p.processes) {
        ensurePidsRecursive(subprocessProfile);
      }
    }
    ensurePidsRecursive(profile);

    // profile.meta has a new property called "categories", which contains a
    // list of categories, which are objects with "name" and "color" properties.
    // The "category" column in the frameTable now refers to elements in this
    // list.
    //
    // Old category list:
    // https://searchfox.org/mozilla-central/rev/5a744713370ec47969595e369fd5125f123e6d24/js/public/ProfilingStack.h#193-201
    // New category list:
    // [To be inserted once the Gecko change lands in mozilla-central]
    const categories = [
      {
        name: 'Idle',
        color: 'transparent',
      },
      {
        name: 'Other',
        color: 'grey',
      },
      {
        name: 'JavaScript',
        color: 'yellow',
      },
      {
        name: 'Layout',
        color: 'purple',
      },
      {
        name: 'Graphics',
        color: 'green',
      },
      {
        name: 'DOM',
        color: 'blue',
      },
      {
        name: 'GC / CC',
        color: 'orange',
      },
      {
        name: 'Network',
        color: 'lightblue',
      },
    ];
    const oldCategoryToNewCategory = {
      [1 << 4]:
        /* OTHER */
        1,
      /* Other */
      [1 << 5]:
        /* CSS */
        3,
      /* Layout */
      [1 << 6]:
        /* JS */
        2,
      /* JavaScript */
      [1 << 7]:
        /* GC */
        6,
      /* GC / CC */
      [1 << 8]:
        /* CC */
        6,
      /* GC / CC */
      [1 << 9]:
        /* NETWORK */
        7,
      /* Network */
      [1 << 10]:
        /* GRAPHICS */
        4,
      /* Graphics */
      [1 << 11]:
        /* STORAGE */
        1,
      /* Other */
      [1 << 12]:
        /* EVENTS */
        1,
      /* Other */
    };
    function convertToVersionElevenRecursive(p) {
      p.meta.categories = categories;
      for (const thread of p.threads) {
        const schemaIndexCategory = thread.frameTable.schema.category;
        for (const frame of thread.frameTable.data) {
          if (schemaIndexCategory in frame) {
            if (frame[schemaIndexCategory] !== null) {
              if (frame[schemaIndexCategory] in oldCategoryToNewCategory) {
                frame[schemaIndexCategory] =
                  oldCategoryToNewCategory[frame[schemaIndexCategory]];
              } else {
                frame[schemaIndexCategory] = 1;
                /* Other*/
              }
            }
          }
        }
      }
      for (const subprocessProfile of p.processes) {
        convertToVersionElevenRecursive(subprocessProfile);
      }
    }
    convertToVersionElevenRecursive(profile);
  },
  [12]: profile => {
    // This version will add column numbers to the JS functions and scripts.
    // There is also a new property in the frameTable called "column" which
    // swaps positions with the "category" property.  The new value for
    // "category" in the frameTable schema will be 5.
    const oldSchemaCategoryIndex = 4;
    const newSchemaCategoryIndex = 5;
    function convertToVersionTwelveRecursive(p) {
      for (const thread of p.threads) {
        const schemaIndexCategory = thread.frameTable.schema.category;
        for (const frame of thread.frameTable.data) {
          // The following eslint rule is disabled, as it's not worth updating the
          // linting on upgraders, as they are "write once and forget" code.

          /* eslint-disable-next-line no-prototype-builtins */
          if (frame.hasOwnProperty(schemaIndexCategory)) {
            frame[newSchemaCategoryIndex] = frame[oldSchemaCategoryIndex];
            frame[oldSchemaCategoryIndex] = null;
          }
        }
        thread.frameTable.schema.category = newSchemaCategoryIndex;
        thread.frameTable.schema.column = oldSchemaCategoryIndex;
      }
      for (const subprocessProfile of p.processes) {
        convertToVersionTwelveRecursive(subprocessProfile);
      }
    }
    convertToVersionTwelveRecursive(profile);
  },
  [13]: profile => {
    // The type field on some markers were missing. Renamed category field of
    // VsyncTimestamp and LayerTranslation marker payloads to type and added
    // a type field to Screenshot marker payload.
    function convertToVersionThirteenRecursive(p) {
      for (const thread of p.threads) {
        const stringTable = new UniqueStringArray(thread.stringTable);
        const nameIndex = thread.markers.schema.name;
        const dataIndex = thread.markers.schema.data;
        for (let i = 0; i < thread.markers.data.length; i++) {
          const name = stringTable.getString(thread.markers.data[i][nameIndex]);
          const data = thread.markers.data[i][dataIndex];
          switch (name) {
            case 'VsyncTimestamp':
            case 'LayerTranslation':
            case 'CompositorScreenshot':
              data.type = name;
              delete data.category;
              break;
            default:
              break;
          }
        }
      }
      for (const subprocessProfile of p.processes) {
        convertToVersionThirteenRecursive(subprocessProfile);
      }
    }
    convertToVersionThirteenRecursive(profile);
  },
  [14]: profile => {
    // Profiles now have a relevantForJS property in the frameTable.
    // This column is false on C++ and JS frames, and true on label frames that
    // are entry and exit points to JS.
    // The upgrader below tries to detect existing JS entry and exit points
    // based on the string name of the label frame.
    // Existing entry points in old profiles are label frames with the string
    // "AutoEntryScript <some entry reason>"
    // and existing exit points in old profiles are label frames for WebIDL
    // APIs, which have one of four forms: constructor, method, getter or setter.
    // Examples:
    // StructuredCloneHolder constructor
    // Node.appendChild
    // get Element.scrollTop
    // set CSS2Properties.height
    const domCallRegex = /^(get |set )?\w+(\.\w+| constructor)$/;
    function convertToVersionFourteenRecursive(p) {
      for (const thread of p.threads) {
        thread.frameTable.schema = {
          location: 0,
          relevantForJS: 1,
          implementation: 2,
          optimizations: 3,
          line: 4,
          column: 5,
          category: 6,
        };
        const locationIndex = thread.frameTable.schema.location;
        const relevantForJSIndex = thread.frameTable.schema.relevantForJS;
        const stringTable = new UniqueStringArray(thread.stringTable);
        for (let i = 0; i < thread.frameTable.data.length; i++) {
          const frameData = thread.frameTable.data[i];
          frameData.splice(relevantForJSIndex, 0, false);

          const location = stringTable.getString(frameData[locationIndex]);
          if (location.startsWith('AutoEntryScript ')) {
            frameData[relevantForJSIndex] = true;
            frameData[locationIndex] = stringTable.indexForString(
              location.substring('AutoEntryScript '.length)
            );
          } else {
            frameData[relevantForJSIndex] = domCallRegex.test(location);
          }
        }
        thread.stringTable = stringTable.serializeToArray();
      }
      for (const subprocessProfile of p.processes) {
        convertToVersionFourteenRecursive(subprocessProfile);
      }
    }
    convertToVersionFourteenRecursive(profile);
  },
  [15]: profile => {
    // The type field for DOMEventMarkerPayload was renamed to eventType.
    function convertToVersion15Recursive(p) {
      for (const thread of p.threads) {
        if (thread.stringTable.indexOf('DiskIO') === -1) {
          // There are no DiskIO markers.
          continue;
        }

        let fileIoStringIndex = thread.stringTable.indexOf('FileIO');
        if (fileIoStringIndex === -1) {
          fileIoStringIndex = thread.stringTable.length;
          thread.stringTable.push('FileIO');
        }

        const nameIndex = thread.markers.schema.name;
        const dataIndex = thread.markers.schema.data;
        for (let i = 0; i < thread.markers.data.length; i++) {
          const markerData = thread.markers.data[i];
          const payload = markerData[dataIndex];
          if (payload && payload.type === 'DiskIO') {
            markerData[nameIndex] = fileIoStringIndex;
            payload.type = 'FileIO';
          }
        }
      }
      for (const subprocessProfile of p.processes) {
        convertToVersion15Recursive(subprocessProfile);
      }
    }
    convertToVersion15Recursive(profile);
  },
  [16]: profile => {
    // profile.meta.categories now has a subcategories property on each element,
    // with an array of subcategories for that category.
    // And the frameTable has another column, subcategory.
    function convertToVersion16Recursive(p) {
      for (const category of p.meta.categories) {
        category.subcategories = ['Other'];
      }
      for (const thread of p.threads) {
        const { frameTable } = thread;
        frameTable.schema.subcategory = 7;
        for (
          let frameIndex = 0;
          frameIndex < frameTable.data.length;
          frameIndex++
        ) {
          // Set a non-null subcategory on every frame that has a non-null category.
          // The subcategory is going to be subcategory 0, the "Other" subcategory.
          const category =
            frameTable.data[frameIndex][frameTable.schema.category];
          if (category) {
            frameTable.data[frameIndex][frameTable.schema.subcategory] = 0;
          }
        }
      }
      for (const subprocessProfile of p.processes) {
        convertToVersion16Recursive(subprocessProfile);
      }
    }
    convertToVersion16Recursive(profile);

    // -------------------------------------------------------------------------
    // Retro-actively upgrade Gecko profiles that don't have marker categories.
    // This happened sometime before version 16.

    // [key, categoryName]
    const keyToCategoryName = [
      ['DOMEvent', 'DOM'],
      ['Navigation::DOMComplete', 'DOM'],
      ['Navigation::DOMInteractive', 'DOM'],
      ['Navigation::Start', 'DOM'],
      ['UserTiming', 'DOM'],
      ['CC', 'GC / CC'],
      ['GCMajor', 'GC / CC'],
      ['GCMinor', 'GC / CC'],
      ['GCSlice', 'GC / CC'],
      ['Paint', 'Graphics'],
      ['VsyncTimestamp', 'Graphics'],
      ['CompositorScreenshot', 'Graphics'],
      ['JS allocation', 'JavaScript'],
      ['Styles', 'Layout'],
      ['nsRefreshDriver::Tick waiting for paint', 'Layout'],
      ['Navigation', 'Network'],
      ['Network', 'Network'], // Explicitly 'Other'
      ['firstLoadURI', 'Other'],
      ['IPC', 'Other'],
      ['Text', 'Other'],
      ['MainThreadLongTask', 'Other'],
      ['FileIO', 'Other'],
      ['Log', 'Other'],
      ['PreferenceRead', 'Other'],
      ['BHR-detected hang', 'Other'],
      ['MainThreadLongTask', 'Other'],
    ];

    // Make sure the default categories are present since we may want to refer them.
    for (const defaultCategory of [
      { name: 'Idle', color: 'transparent', subcategories: ['Other'] },
      { name: 'Other', color: 'grey', subcategories: ['Other'] },
      { name: 'Layout', color: 'purple', subcategories: ['Other'] },
      { name: 'JavaScript', color: 'yellow', subcategories: ['Other'] },
      { name: 'GC / CC', color: 'orange', subcategories: ['Other'] },
      { name: 'Network', color: 'lightblue', subcategories: ['Other'] },
      { name: 'Graphics', color: 'green', subcategories: ['Other'] },
      { name: 'DOM', color: 'blue', subcategories: ['Other'] },
    ]) {
      const index = profile.meta.categories.findIndex(
        category => category.name === defaultCategory.name
      );
      if (index === -1) {
        // Add on any unknown categories.
        profile.meta.categories.push(defaultCategory);
      }
    }

    const otherCategory = profile.meta.categories.findIndex(
      category => category.name === 'Other'
    );

    const keyToCategoryIndex: Map<string, number> = new Map(
      keyToCategoryName.map(([key, categoryName]) => {
        const index = profile.meta.categories.findIndex(
          category => category.name === categoryName
        );
        if (index === -1) {
          throw new Error('Could not find a category index to map to.');
        }
        return [key, index];
      })
    );

    function addMarkerCategoriesRecursively(p) {
      for (const thread of p.threads) {
        const { markers, stringTable } = thread;
        if (markers.schema.category !== undefined) {
          // There is nothing to upgrade, do not continue.
          return;
        }
        markers.schema.category = 3;
        for (
          let markerIndex = 0;
          markerIndex < markers.data.length;
          markerIndex++
        ) {
          const nameIndex = markers.data[markerIndex][markers.schema.name];
          const data = markers.data[markerIndex][markers.schema.data];

          let key: string = stringTable[nameIndex];
          if (data && data.type) {
            key = data.type === 'tracing' ? data.category : data.type;
          }
          let categoryIndex = keyToCategoryIndex.get(key);
          if (categoryIndex === undefined) {
            categoryIndex = otherCategory;
          }

          markers.data[markerIndex][markers.schema.category] = categoryIndex;
        }
      }
      for (const subprocessProfile of p.processes) {
        addMarkerCategoriesRecursively(subprocessProfile);
      }
    }
    addMarkerCategoriesRecursively(profile);
  },
  [17]: profile => {
    // Previously, we had DocShell ID and DocShell History ID in the page object
    // to identify a specific page. We changed these IDs in the gecko side to
    // Browsing Context ID and Inner Window ID. Inner Window ID is enough to
    // identify a specific frame now. We were keeping two field in marker
    // payloads, but now we are only keeping innerWindowID. Browsing Context IDs
    // are necessary to identify which frame belongs to which tab. Browsing
    // Contexts doesn't change after a navigation.
    let browsingContextID = 1;
    let innerWindowID = 1;
    function convertToVersion17Recursive(p) {
      if (p.pages && p.pages.length > 0) {
        // It's not possible to have a marker belongs to a different DocShell in
        // different processes currently(pre-fission). It's not necessary to put
        // those maps outside of the function.
        const oldKeysToNewKey: Map<string, number> = new Map();
        const docShellIDtoBrowsingContextID: Map<string, number> = new Map();

        for (const page of p.pages) {
          // Constructing our old keys to new key map so we can use it for markers.
          oldKeysToNewKey.set(
            `d${page.docshellId}h${page.historyId}`,
            innerWindowID
          );

          // There are multiple pages with same DocShell IDs. We are checking to
          // see if we assigned a Browsing Context ID to that DocShell ID
          // before. Otherwise assigning one.
          let currentBrowsingContextID = docShellIDtoBrowsingContextID.get(
            page.docshellId
          );
          if (!currentBrowsingContextID) {
            currentBrowsingContextID = browsingContextID++;
            docShellIDtoBrowsingContextID.set(
              page.docshellId,
              currentBrowsingContextID
            );
          }

          // Putting DocShell ID to this field. It fully doesn't correspond to a
          // Browsing Context ID but that's the closest we have right now.
          page.browsingContextID = currentBrowsingContextID;
          // Putting a unique Inner Window ID to each page.
          page.innerWindowID = innerWindowID;
          // This information is new. We had isSubFrame field but that's not
          // useful for us to determine the embedders. Therefore setting older
          // pages to 0 which means null.
          page.embedderInnerWindowID = 0;

          innerWindowID++;
          delete page.docshellId;
          delete page.historyId;
          delete page.isSubFrame;
        }

        for (const thread of p.threads) {
          const { markers } = thread;
          const dataIndex = markers.schema.data;
          for (let i = 0; i < thread.markers.data.length; i++) {
            const markerData = thread.markers.data[i];
            const payload = markerData[dataIndex];

            if (
              payload &&
              payload.docShellId !== undefined &&
              payload.docshellHistoryId !== undefined
            ) {
              const newKey = oldKeysToNewKey.get(
                `d${payload.docShellId}h${payload.docshellHistoryId}`
              );
              if (newKey === undefined) {
                console.error(
                  'No page found with given docShellId and historyId'
                );
              } else {
                // We don't need to add the browsingContextID here because we
                // only need innerWindowID since it's unique for each page.
                payload.innerWindowID = newKey;
              }

              delete payload.docShellId;
              delete payload.docshellHistoryId;
            }
          }
        }
      }

      for (const subprocessProfile of p.processes) {
        convertToVersion17Recursive(subprocessProfile);
      }
    }
    convertToVersion17Recursive(profile);
  },
  [18]: profile => {
    // Due to a bug in gecko side, we were keeping the sample_group inside an
    // object instead of an array. Usually there is only one sample group, that's
    // why it wasn't a problem before. To future proof it, we are fixing it by
    // moving it inside an array. See: https://bugzilla.mozilla.org/show_bug.cgi?id=1584190
    function convertToVersion18Recursive(p) {
      if (p.counters && p.counters.length > 0) {
        for (const counter of p.counters) {
          // It's possible to have an empty sample_groups object due to gecko bug.
          // Remove it if that's the case.
          if ('samples' in counter.sample_groups) {
            counter.sample_groups = [counter.sample_groups];
          } else {
            counter.sample_groups = [];
          }
        }
      }
      for (const subprocessProfile of p.processes) {
        convertToVersion18Recursive(subprocessProfile);
      }
    }
    convertToVersion18Recursive(profile);
  },
  [19]: profile => {
    // Profiles now have an innerWindowID property in the frameTable.
    // We are filling this array with 0 values because we have no idea what that value might be.
    function convertToVersion19Recursive(p) {
      for (const thread of p.threads) {
        const { frameTable } = thread;
        frameTable.schema = {
          location: 0,
          relevantForJS: 1,
          innerWindowID: 2,
          implementation: 3,
          optimizations: 4,
          line: 5,
          column: 6,
          category: 7,
          subcategory: 8,
        };
        for (
          let frameIndex = 0;
          frameIndex < frameTable.data.length;
          frameIndex++
        ) {
          // Adding 0 for every frame.
          const innerWindowIDIndex = frameTable.schema.innerWindowID;
          frameTable.data[frameIndex].splice(innerWindowIDIndex, 0, 0);
        }
      }
      for (const subprocessProfile of p.processes) {
        convertToVersion19Recursive(subprocessProfile);
      }
    }
    convertToVersion19Recursive(profile);
  },
};
/* eslint-enable no-useless-computed-key */
