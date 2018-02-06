/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
// @flow

/**
 * This definition was built from a combination of:
 * - https://stuk.github.io/jszip/documentation
 * - The source code
 * - And observing the console.
 *
 * It is not meant to be exhaustive, but just enough to be useful for how the unzipping
 * functionality is used. The interface is really funky with a function that is also
 * an object, so just export a function, and an object, then coerce the usage into
 * the proper version.
 *
 * e.g.
 *
 * import JSZip from 'jszip';
 * const zip = (JSZip: InitJSZip)();
 * const zip = (JSZip: StaticJSZip).loadAsync();
 */
type ZipFile = {
  async: (key: 'string') => Promise<string>,
};

type ZipEntries = {
  files: {| [fileName: string]: ZipFile |},
};

declare module 'jszip' {
  declare type InitJSZip = () => {
    file: (fileName: string, contents: string) => void,
    generateAsync: ({ type: 'uint8array' }) => Promise<Uint8Array>,
  };

  declare type StaticJSZip = {
    loadAsync: (data: ArrayBuffer) => Promise<ZipEntries>,
  };

  // Coerce the imported value.
  declare module.exports: any;
}
