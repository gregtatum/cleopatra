/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow

import type { MarkerSlug } from '../types/markers';
import type { MarkersTable, MarkersTableByType } from '../types/profile';
import type { UniqueStringArray } from '../utils/unique-string-array';

export function filterMarkersToType<T: MarkerSlug, Payload: { type: T }>(
  stringTable: UniqueStringArray,
  markers: MarkersTable,
  type: T
): MarkersTableByType<Payload> {
  const newMarkers: MarkersTableByType<Payload> = {
    time: [],
    duration: [],
    type: [],
    name: [],
    title: [],
    data: [],
    length: 0,
  };

  const typeStringIndex = stringTable.indexForString(type);
  for (let markerIndex = 0; markerIndex < markers.length; markerIndex++) {
    if (markers.type[markerIndex] === typeStringIndex) {
      // Flow isn't really able to refine this better, so help it along.
      const data = ((markers.data[markerIndex]: any): Payload);

      newMarkers.time.push(markers.time[markerIndex]);
      newMarkers.duration.push(markers.duration[markerIndex]);
      newMarkers.type.push(markers.type[markerIndex]);
      newMarkers.name.push(markers.name[markerIndex]);
      newMarkers.title.push(markers.title[markerIndex]);
      newMarkers.data.push(data);
      newMarkers.length++;
    }
  }
  return newMarkers;
}

export function filterMarkersForMarkerChart(
  stringTable: UniqueStringArray,
  markers: MarkersTable
): MarkersTableByType<*> {
  const newMarkers: MarkersTableByType<*> = {
    time: [],
    duration: [],
    type: [],
    name: [],
    title: [],
    data: [],
    length: 0,
  };

  const typeStringIndex = stringTable.indexForString('Network');
  for (let markerIndex = 0; markerIndex < markers.length; markerIndex++) {
    if (markers.type[markerIndex] === typeStringIndex) {
      newMarkers.time.push(markers.time[markerIndex]);
      newMarkers.duration.push(markers.duration[markerIndex]);
      newMarkers.type.push(markers.type[markerIndex]);
      newMarkers.name.push(markers.name[markerIndex]);
      newMarkers.title.push(markers.title[markerIndex]);

      const data = markers.data[markerIndex];
      if (data === null || data.type === 'Network') {
        newMarkers.data.push(null);
      } else {
        newMarkers.data.push(data);
      }
      newMarkers.length++;
    }
  }
  return newMarkers;
}

export function filterMarkersToRange<Payload>(
  markers: MarkersTableByType<Payload>,
  rangeStart: number,
  rangeEnd: number
): MarkersTableByType<Payload> {
  const newMarkers: MarkersTableByType<*> = {
    time: [],
    duration: [],
    type: [],
    name: [],
    title: [],
    data: [],
    length: 0,
  };

  for (let markerIndex = 0; markerIndex < markers.length; markerIndex++) {
    const time = markers.time[markerIndex];
    const duration = markers.duration[markerIndex];

    if (time < rangeEnd && time + duration >= rangeStart) {
      newMarkers.time.push(time);
      newMarkers.duration.push(duration);
      newMarkers.type.push(markers.type[markerIndex]);
      newMarkers.name.push(markers.name[markerIndex]);
      newMarkers.title.push(markers.title[markerIndex]);
      newMarkers.data.push(markers.data[markerIndex]);
      newMarkers.length++;
    }
  }
  return newMarkers;
}
