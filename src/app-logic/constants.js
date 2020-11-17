"use strict";
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
exports.__esModule = true;
exports.INTERVAL_END = exports.INTERVAL_START = exports.INTERVAL = exports.INSTANT = exports.PROFILER_SERVER_ORIGIN = exports.GOOGLE_STORAGE_BUCKET = exports.ACTIVE_TAB_TIMELINE_RESOURCES_HEADER_HEIGHT = exports.TRACK_VISUAL_PROGRESS_LINE_WIDTH = exports.TRACK_VISUAL_PROGRESS_HEIGHT = exports.JS_TRACER_MAXIMUM_CHART_ZOOM = exports.TIMELINE_RULER_HEIGHT = exports.TRACK_PROCESS_BLANK_HEIGHT = exports.TRACK_IPC_HEIGHT = exports.TRACK_IPC_MARKERS_HEIGHT = exports.TRACK_EVENT_DELAY_LINE_WIDTH = exports.TRACK_EVENT_DELAY_HEIGHT = exports.TRACK_MEMORY_LINE_WIDTH = exports.TRACK_MEMORY_HEIGHT = exports.TRACK_MEMORY_MARKERS_HEIGHT = exports.TRACK_MEMORY_GRAPH_HEIGHT = exports.TRACK_NETWORK_HEIGHT = exports.TRACK_NETWORK_ROW_REPEAT = exports.TRACK_NETWORK_ROW_HEIGHT = exports.ACTIVE_TAB_TRACK_SCREENSHOT_HEIGHT = exports.FULL_TRACK_SCREENSHOT_HEIGHT = exports.TIMELINE_SETTINGS_HEIGHT = exports.ACTIVE_TAB_TIMELINE_MARGIN_LEFT = exports.TIMELINE_MARGIN_LEFT = exports.TIMELINE_MARGIN_RIGHT = exports.PROCESSED_PROFILE_VERSION = exports.GECKO_PROFILE_VERSION = void 0;
// The current version of the Gecko profile format.
exports.GECKO_PROFILE_VERSION = 22;
// The current version of the "processed" profile format.
exports.PROCESSED_PROFILE_VERSION = 33;
// The following are the margin sizes for the left and right of the timeline. Independent
// components need to share these values.
exports.TIMELINE_MARGIN_RIGHT = 15;
exports.TIMELINE_MARGIN_LEFT = 150;
exports.ACTIVE_TAB_TIMELINE_MARGIN_LEFT = 0;
exports.TIMELINE_SETTINGS_HEIGHT = 26;
// Export the value for tests, and for computing the max height of the timeline
// for the splitter.
exports.FULL_TRACK_SCREENSHOT_HEIGHT = 50;
exports.ACTIVE_TAB_TRACK_SCREENSHOT_HEIGHT = 30;
// The following values are for network track.
exports.TRACK_NETWORK_ROW_HEIGHT = 5;
exports.TRACK_NETWORK_ROW_REPEAT = 7;
exports.TRACK_NETWORK_HEIGHT = exports.TRACK_NETWORK_ROW_HEIGHT * exports.TRACK_NETWORK_ROW_REPEAT;
// The following values are for memory track.
exports.TRACK_MEMORY_GRAPH_HEIGHT = 25;
exports.TRACK_MEMORY_MARKERS_HEIGHT = 15;
exports.TRACK_MEMORY_HEIGHT = exports.TRACK_MEMORY_GRAPH_HEIGHT + exports.TRACK_MEMORY_MARKERS_HEIGHT;
exports.TRACK_MEMORY_LINE_WIDTH = 2;
// The following values are for experimental event delay track.
exports.TRACK_EVENT_DELAY_HEIGHT = 40;
exports.TRACK_EVENT_DELAY_LINE_WIDTH = 2;
// The following values are for IPC track.
exports.TRACK_IPC_MARKERS_HEIGHT = 25;
exports.TRACK_IPC_HEIGHT = exports.TRACK_IPC_MARKERS_HEIGHT;
// Height of the blank area in process track.
exports.TRACK_PROCESS_BLANK_HEIGHT = 30;
// Height of timeline ruler.
exports.TIMELINE_RULER_HEIGHT = 20;
// JS Tracer has very high fidelity information, and needs a more fine-grained zoom.
exports.JS_TRACER_MAXIMUM_CHART_ZOOM = 0.001;
// The following values are for the visual progress tracks.
exports.TRACK_VISUAL_PROGRESS_HEIGHT = 40;
exports.TRACK_VISUAL_PROGRESS_LINE_WIDTH = 2;
// Height of the active tab resources panel header.
exports.ACTIVE_TAB_TIMELINE_RESOURCES_HEADER_HEIGHT = 20;
// =============================================================================
// Storage and server-related constants
// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// For the 2 values GOOGLE_STORAGE_BUCKET and PROFILER_SERVER_ORIGIN, several
// values are possible, so that you can easily switch between existing server
// (both local or remote).
//
// GOOGLE_STORAGE_BUCKET
// ---------------------
// This defines which bucket we fetch profile data at load time.
// Google storage bucket, where production profile data is stored:
exports.GOOGLE_STORAGE_BUCKET = 'profile-store';
// You can also use one of the following values instead:
// To use the bucket used by the server deployment for the main branch:
// export const GOOGLE_STORAGE_BUCKET = 'moz-fx-dev-firefoxprofiler-bucket';
// To use the bucket developers usually use on their local working copy:
// export const GOOGLE_STORAGE_BUCKET = 'profile-store-julien-dev';
// PROFILER_SERVER_ORIGIN
// ----------------------
// This defines our server-side endpoint. This is currently used to publish
// profiles and manage shortlinks.
// This is the production server:
exports.PROFILER_SERVER_ORIGIN = 'https://api.profiler.firefox.com';
// This is the deployment from the main branch:
// export const PROFILER_SERVER_ORIGIN = 'https://dev.firefoxprofiler.nonprod.cloudops.mozgcp.net';
// This is your local server:
// export const PROFILER_SERVER_ORIGIN = 'http://localhost:5252';
// See the MarkerPhase type for more information.
exports.INSTANT = 0;
exports.INTERVAL = 1;
exports.INTERVAL_START = 2;
exports.INTERVAL_END = 3;
