/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */



import { RequestedLib } from "../types/actions";

// Used during the symbolication process to express that we couldn't find
// symbols for a specific library
export class SymbolsNotFoundError extends Error {

  library: RequestedLib;
  error: Error | null | undefined;

  constructor(message: string, library: RequestedLib, error?: Error) {
    super(message);
    // Workaround for a babel issue when extending Errors
    (this as any).__proto__ = SymbolsNotFoundError.prototype;
    this.name = 'SymbolsNotFoundError';
    this.library = library;
    this.error = error;
  }
}