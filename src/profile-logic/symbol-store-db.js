"use strict";
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
exports.__esModule = true;
var errors_1 = require("./errors");
string,
    breakpadId;
string,
    addrs;
Uint32Array,
    index;
Uint32Array,
    buffer;
Uint8Array,
    lastUsedDate;
Date,
;
;
var kTwoWeeksInMilliseconds = 2 * 7 * 24 * 60 * 60 * 1000;
/**
 * A wrapper around an IndexedDB table that stores symbol tables.
 * @class SymbolStoreDB
 * @classdesc Where does this description show up?
 */
var SymbolStoreDB = /** @class */ (function () {
    /**
     * @param {string} dbName   The name of the indexedDB database that's used
     *                          to store the symbol tables.
     * @param {number} maxCount The maximum number of symbol tables to have in
     *                          storage at the same time.
     * @param {number} maxAge   The maximum age, in milliseconds, before stored
     *                          symbol tables should get evicted.
     */
    function SymbolStoreDB(dbName, maxCount, maxAge) {
        if (maxCount === void 0) { maxCount = 200; }
        if (maxAge === void 0) { maxAge = kTwoWeeksInMilliseconds; }
        this._dbPromise = this._setupDB(dbName);
        this._maxCount = maxCount;
        this._maxAge = maxAge;
    }
    SymbolStoreDB.prototype._getDB = function () {
        if (this._dbPromise) {
            return this._dbPromise;
        }
        return Promise.reject(new Error('The database is closed.'));
    };
    SymbolStoreDB.prototype._setupDB = function (dbName) {
        var _this = this;
        var indexedDB = window.indexedDB;
        if (!indexedDB) {
            throw new Error('Could not find indexedDB on the window object.');
        }
        return new Promise(function (resolve, reject) {
            var openReq = indexedDB.open(dbName, 2);
            openReq.onerror = function () {
                if (openReq.error.name === 'VersionError') {
                    // This error fires if the database already exists, and the existing
                    // database has a higher version than what we requested. So either
                    // this version of profiler.firefox.com is outdated, or somebody briefly tried
                    // to change this database format (and increased the version number)
                    // and then downgraded to a version of profiler.firefox.com without those
                    // changes.
                    // We delete the database and try again.
                    var deleteDBReq_1 = indexedDB.deleteDatabase(dbName);
                    deleteDBReq_1.onerror = function () { return reject(deleteDBReq_1.error); };
                    deleteDBReq_1.onsuccess = function () {
                        // Try to open the database again.
                        _this._setupDB(dbName).then(resolve, reject);
                    };
                }
                else {
                    reject(openReq.error);
                }
            };
            openReq.onupgradeneeded = function (_a) {
                var oldVersion = _a.oldVersion;
                var db = openReq.result;
                db.onerror = reject;
                if (oldVersion === 1) {
                    db.deleteObjectStore('symbol-tables');
                }
                var store = db.createObjectStore('symbol-tables', {
                    keyPath: ['debugName', 'breakpadId']
                });
                store.createIndex('lastUsedDate', 'lastUsedDate');
            };
            openReq.onblocked = function () {
                reject(new Error('The symbol store database could not be upgraded because it is ' +
                    'open in another tab. Please close all your other profiler.firefox.com ' +
                    'tabs and refresh.'));
            };
            openReq.onsuccess = function () {
                var db = openReq.result;
                db.onversionchange = function () {
                    db.close();
                };
                resolve(db);
                _this._deleteAllBeforeDate(db, new Date(+new Date() - _this._maxAge))["catch"](function (e) {
                    console.error('Encountered error while cleaning out database:', e);
                });
            };
        });
    };
    /**
     * Store the symbol table for a given library.
     * @param {string}      The debugName of the library.
     * @param {string}      The breakpadId of the library.
     * @param {symbolTable} The symbol table, in SymbolTableAsTuple format.
     * @return              A promise that resolves (with nothing) once storage
     *                      has succeeded.
     */
    SymbolStoreDB.prototype.storeSymbolTable = function (debugName, breakpadId, _a) {
        var _this = this;
        var addrs = _a[0], index = _a[1], buffer = _a[2];
        return this._getDB().then(function (db) {
            return new Promise(function (resolve, reject) {
                var transaction = db.transaction('symbol-tables', 'readwrite');
                transaction.onerror = function () { return reject(transaction.error); };
                var store = transaction.objectStore('symbol-tables');
                _this._deleteLeastRecentlyUsedUntilCountIsNoMoreThanN(store, _this._maxCount - 1, function () {
                    var lastUsedDate = new Date();
                    var addReq = store.add({
                        debugName: debugName,
                        breakpadId: breakpadId,
                        addrs: addrs,
                        index: index,
                        buffer: buffer,
                        lastUsedDate: lastUsedDate
                    });
                    addReq.onsuccess = function () { return resolve(); };
                });
            });
        });
    };
    /**
     * Retrieve the symbol table for the given library.
     * @param {string}      The debugName of the library.
     * @param {string}      The breakpadId of the library.
     * @return              A promise that resolves with the symbol table (in
     *                      SymbolTableAsTuple format), or fails if we couldn't
     *                      find a symbol table for the requested library.
     */
    SymbolStoreDB.prototype.getSymbolTable = function (debugName, breakpadId) {
        return this._getDB().then(function (db) {
            return new Promise(function (resolve, reject) {
                var transaction = db.transaction('symbol-tables', 'readwrite');
                transaction.onerror = function () { return reject(transaction.error); };
                var store = transaction.objectStore('symbol-tables');
                var req = store.openCursor([debugName, breakpadId]);
                req.onsuccess = function () {
                    var cursor = req.result;
                    if (cursor) {
                        var value = cursor.value;
                        value.lastUsedDate = new Date();
                        var updateDateReq = cursor.update(value);
                        var addrs_1 = value.addrs, index_1 = value.index, buffer_1 = value.buffer;
                        updateDateReq.onsuccess = function () { return resolve([addrs_1, index_1, buffer_1]); };
                    }
                    else {
                        reject(new errors_1.SymbolsNotFoundError('The requested library does not exist in the database.', { debugName: debugName, breakpadId: breakpadId }));
                    }
                };
            });
        });
    };
    SymbolStoreDB.prototype.close = function () {
        var _this = this;
        // Close the database and make all methods uncallable.
        return this._getDB().then(function (db) {
            db.close();
            _this._dbPromise = null;
        });
    };
    // Many of the utility functions below use callback functions instead of
    // promises. That's because IndexedDB transactions auto-close at the end of
    // the current event tick if there hasn't been a new request after the last
    // success event. So we need to synchronously add more work inside the
    // onsuccess handler, and we do that by calling the callback function.
    // Resolving a promise only calls any then() callback at the next microtask,
    // and by that time the transaction will already have closed.
    // We don't propagate errors because those will be caught by the onerror
    // handler of the transaction that we got `store` from.
    SymbolStoreDB.prototype._deleteAllBeforeDate = function (db, beforeDate) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var transaction = db.transaction('symbol-tables', 'readwrite');
            transaction.onerror = function () { return reject(transaction.error); };
            var store = transaction.objectStore('symbol-tables');
            _this._deleteRecordsLastUsedBeforeDate(store, beforeDate, resolve);
        });
    };
    SymbolStoreDB.prototype._deleteRecordsLastUsedBeforeDate = function (store, beforeDate, callback) {
        var lastUsedDateIndex = store.index('lastUsedDate');
        // Get a cursor that walks all records whose lastUsedDate is less than beforeDate.
        var range = window.IDBKeyRange.upperBound(beforeDate, true);
        var cursorReq = lastUsedDateIndex.openCursor(function (range) {
            return ;
        });
        // Iterate over all records in this cursor and delete them.
        cursorReq.onsuccess = function () {
            var cursor = cursorReq.result;
            if (cursor) {
                cursor["delete"]().onsuccess = function () {
                    cursor["continue"]();
                };
            }
            else {
                callback();
            }
        };
    };
    SymbolStoreDB.prototype._deleteNLeastRecentlyUsedRecords = function (store, n, callback) {
        // Get a cursor that walks the records from oldest to newest
        // lastUsedDate.
        var lastUsedDateIndex = store.index('lastUsedDate');
        var cursorReq = lastUsedDateIndex.openCursor();
        var deletedCount = 0;
        cursorReq.onsuccess = function () {
            var cursor = cursorReq.result;
            if (cursor) {
                var deleteReq = cursor["delete"]();
                deleteReq.onsuccess = function () {
                    deletedCount++;
                    if (deletedCount < n) {
                        cursor["continue"]();
                    }
                    else {
                        callback();
                    }
                };
            }
            else {
                callback();
            }
        };
    };
    SymbolStoreDB.prototype._count = function (store, callback, ) {
        var countReq = store.count();
        countReq.onsuccess = function () { return callback(countReq.result); };
    };
    SymbolStoreDB.prototype._deleteLeastRecentlyUsedUntilCountIsNoMoreThanN = function (store, n, callback) {
        var _this = this;
        this._count(store, function (symbolTableCount) {
            if (symbolTableCount > n) {
                // We'll need to remove at least one symbol table.
                var needToRemoveCount = symbolTableCount - n;
                _this._deleteNLeastRecentlyUsedRecords(store, needToRemoveCount, callback);
            }
            else {
                callback();
            }
        });
    };
    return SymbolStoreDB;
}());
exports["default"] = SymbolStoreDB;
