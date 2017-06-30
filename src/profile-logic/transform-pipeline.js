/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow
import type { TransformPipeline } from '../types/reducers';

const transformCode = {
  RANGE_FILTER: 'RF',
};

const isValidNumber = /^[1-9]\d*$/;

export function transformPipelineToString(transforms: TransformPipeline): string {
  const parts = transforms.map(transform => {
    switch (transform.type) {
      case 'RANGE_FILTER': {
        const { start, end } = transform;
        return `${transformCode.RANGE_FILTER}-${Math.round(start)}-${Math.round(end)}`;
      }
    }
    throw new Error('Unhandled transform type.');
  });

  return parts.join('~');
}

export function transformPipelineFromString(string: string): TransformPipeline {
  const stringParts = string.split('~');
  const transforms = [];
  for (const transformString of stringParts) {
    const transformParts = transformString.split('-');
    const code = transformParts[0];
    switch (code) {
      case transformCode.RANGE_FILTER: {
        const [, start, end] = transformParts;
        if (isValidNumber.test(start) && isValidNumber.test(end)) {
          transforms.push({type: 'RANGE_FILTER', start: Number(start), end: Number(end) });
        }
      }
    }
  }
  return transforms;
}
