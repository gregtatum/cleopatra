/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @flow
import queryString from 'query-string';
import { parseLegacyRangeFilters } from './profile-logic/range-filters';
import { stringifyCallTreeFilters, parseCallTreeFilters } from './profile-logic/call-tree-filters';
import { transformPipelineToString, transformPipelineFromString } from './profile-logic/transform-pipeline';
import type { URLState } from './types/reducers';
import type { DataSource } from './types/actions';

// {
//   // general:
//   dataSource: 'from-addon', 'from-file', 'local', 'public',
//   hash: '' or 'aoeurschsaoeuch',
//   selectedTab: 'summary' or 'calltree' or ...,
//   rangeFilters: [] or [{ start, end }, ...],
//   selectedThread: 0 or 1 or ...,
//
//   // only when selectedTab === 'calltree':
//   callTreeSearchString: '' or '::RunScript' or ...,
//   callTreeFilters: [[], [{type:'prefix', matchJSOnly:true, prefixFuncs:[1,3,7]}, {}, ...], ...], // one per thread
//   jsOnly: false or true,
//   invertCallstack: false or true,
// }

function dataSourceDirs(urlState: URLState) {
  const { dataSource } = urlState;
  switch (dataSource) {
    case 'from-addon':
      return ['from-addon'];
    case 'from-file':
      return ['from-file'];
    case 'local':
      return ['local', urlState.hash];
    case 'public':
      return ['public', urlState.hash];
    case 'from-url':
      return ['from-url', encodeURIComponent(urlState.profileURL)];
    default:
      return [];
  }
}

export function urlFromState(urlState: URLState) {
  const { dataSource } = urlState;
  if (dataSource === 'none') {
    return '/';
  }
  const pathname = '/' + [
    ...dataSourceDirs(urlState),
    urlState.selectedTab,
  ].join('/') + '/';

  // Start with the query parameters that are shown regardless of the active tab.
  const query: Object = {
    transforms: urlState.transformPipeline.length > 0
      ? transformPipelineToString(urlState.transformPipeline)
      : undefined,
    thread: `${urlState.selectedThread}`,
    threadOrder: urlState.threadOrder.join('-'),
    hiddenThreads: urlState.hiddenThreads.join('-'),
  };

  if (process.env.NODE_ENV === 'development') {
    /* eslint-disable camelcase */
    query.react_perf = null;
    /* eslint-enable camelcase */
  }

  // Depending on which tab is active, also show tab-specific query parameters.
  switch (urlState.selectedTab) {
    case 'calltree':
      query.search = urlState.callTreeSearchString || undefined;
      query.invertCallstack = urlState.invertCallstack ? null : undefined;
      query.implementation = urlState.implementation === 'combined'
        ? undefined
        : urlState.implementation;
      query.callTreeFilters = stringifyCallTreeFilters(urlState.callTreeFilters[urlState.selectedThread]) || undefined;
      break;
    case 'timeline':
      query.search = urlState.callTreeSearchString || undefined;
      query.invertCallstack = urlState.invertCallstack ? null : undefined;
      query.hidePlatformDetails = urlState.hidePlatformDetails ? null : undefined;
      break;
  }
  const qString = queryString.stringify(query);
  return pathname + (qString ? '?' + qString : '');
}

function toDataSourceEnum(str: string): DataSource {
  // With this switch, flow is able to understand that we return a valid value
  switch (str) {
    case 'none':
    case 'from-addon':
    case 'from-file':
    case 'local':
    case 'public':
    case 'from-url':
      return str;
  }

  throw new Error('unexpected data source');
}

/**
 * Define only the properties of the window.location object that the function uses
 * so that it can be mocked in tests.
 */
type Location = {
  pathname: string,
  search: string,
  hash: string,
};

export function stateFromLocation(location: Location): URLState {
  const pathname = location.pathname;
  const qString = location.search.substr(1);
  const hash = location.hash;
  const query = queryString.parse(qString);

  if (pathname === '/') {
    const legacyQuery = Object.assign({}, query, queryString.parse(hash));
    if ('report' in legacyQuery) {
      if ('filter' in legacyQuery) {
        const filters = JSON.parse(legacyQuery.filter);
        // We can't convert these parameters to the new URL parameters here
        // because they're relative to different things - the legacy range
        // filters were relative to profile.meta.startTime, and the new
        // rangeFilters param is relative to
        // getTimeRangeIncludingAllThreads(profile).start.
        // So we stuff this information into a global here, and then later,
        // once we have the profile, we convert that information into URL params
        // again. This is not pretty.
        window.legacyRangeFilters =
          filters.filter(f => f.type === 'RangeSampleFilter').map(({ start, end }) => ({ start, end }));
      }
      return {
        dataSource: 'public',
        hash: legacyQuery.report,
        profileURL: '',
        selectedTab: 'calltree',
        transformPipeline: [],
        selectedThread: 0,
        callTreeSearchString: '',
        callTreeFilters: {},
        implementation: 'combined',
        invertCallstack: false,
        hidePlatformDetails: false,
        threadOrder: [],
        hiddenThreads: [],
      };
    }
  }

  const dirs = pathname.split('/').filter(d => d);
  const dataSource = toDataSourceEnum(dirs[0] || 'none');

  const needHash = ['local', 'public'].includes(dataSource);
  const needProfileURL = ['from-url'].includes(dataSource);
  const selectedThread = query.thread !== undefined ? +query.thread : 0;

  let implementation = 'combined';
  if (query.implementation === 'js' || query.implementation === 'cpp') {
    implementation = query.implementation;
  } else if (query.jsOnly !== undefined) {
    // Support the old URL structure that had a jsOnly flag.
    implementation = 'js';
  }

  let transformPipeline = [];
  // Check for legacy range filters, and convert them to a transform pipeline.
  if (query.range) {
    const rangeFilters = parseLegacyRangeFilters(query.range);
    transformPipeline = rangeFilters.map(range => Object.assign({}, range, { type: 'RANGE_FILTER' }));
  } else if (query.transform) {
    transformPipeline = transformPipelineFromString(query.transform);
  }

  return {
    dataSource,
    hash: needHash ? dirs[1] : '',
    profileURL: needProfileURL ? decodeURIComponent(dirs[1]) : '',
    selectedTab: ((needHash || needProfileURL) ? dirs[2] : dirs[1]) || 'calltree',
    transformPipeline,
    selectedThread: selectedThread,
    callTreeSearchString: query.search || '',
    callTreeFilters: {
      [selectedThread]: query.callTreeFilters ? parseCallTreeFilters(query.callTreeFilters) : [],
    },
    implementation,
    invertCallstack: query.invertCallstack !== undefined,
    hidePlatformDetails: query.hidePlatformDetails !== undefined,
    hiddenThreads: query.hiddenThreads
      ? query.hiddenThreads.split('-').map(index => Number(index))
      : [],
    threadOrder: query.threadOrder
      ? query.threadOrder.split('-').map(index => Number(index))
      : [],
  };
}
