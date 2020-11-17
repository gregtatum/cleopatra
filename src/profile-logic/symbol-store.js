"use strict";
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
exports.__esModule = true;
exports.SymbolStore = exports.readSymbolsFromSymbolTable = void 0;
var symbol_store_db_1 = require("./symbol-store-db");
var errors_1 = require("./errors");
var bisect_1 = require("firefox-profiler/utils/bisect");
string,
    // The offset (in bytes) between the start of the function and the address.
    functionOffset;
number,
;
;
 > ;
void ,
    errorCb;
(function (LibSymbolicationRequest, Error) { return void ; });
Promise();
// Look up the symbols for the given addresses in the symbol table.
// The symbol table is given in the [addrs, index, buffer] format.
// This format is documented at the SymbolTableAsTuple flow type definition.
function readSymbolsFromSymbolTable(addresses, symbolTable, demangleCallback, string) {
    var symbolTableAddrs = symbolTable[0], symbolTableIndex = symbolTable[1], symbolTableBuffer = symbolTable[2];
    var addressArray = Uint32Array.from(addresses);
    addressArray.sort();
    // Iterate over all addresses in addressArray and look them up in the
    // symbolTableAddrs array. The index at which a match is found can be used
    // to obtain the start and end position of its string in the buffer, using
    // the symbolTableIndex array.
    // Both addressArray and symbolTableAddrs are sorted in ascending order.
    var decoder = new TextDecoder();
    var results = new Map();
    var currentSymbolIndex = undefined;
    var currentSymbol = '';
    for (var i = 0; i < addressArray.length; i++) {
        var address = addressArray[i];
        // Look up address in symbolTableAddrs. symbolTableAddrs is sorted, so we
        // can do the lookup using bisection. And address is >= the previously
        // looked up address, so we can use the last found index as a lower bound
        // during the bisection.
        // We're not looking for an exact match here. We're looking for the
        // largest symbolIndex for which symbolTableAddrs[symbolIndex] <= address.
        // bisection() returns the insertion index, which is one position after
        // the index that we consider the match, so we need to subtract 1 from the
        // result.
        var symbolIndex = bisect_1.bisectionRight(symbolTableAddrs, address, currentSymbolIndex) - 1;
        if (symbolIndex >= 0) {
            if (symbolIndex !== currentSymbolIndex) {
                // Get the corresponding string from symbolTableBuffer. The start and
                // end positions are recorded in symbolTableIndex.
                var startOffset = symbolTableIndex[symbolIndex];
                var endOffset = symbolTableIndex[symbolIndex + 1];
                var subarray = symbolTableBuffer.subarray(startOffset, endOffset);
                // C++ or rust symbols in the symbol table may have mangled names.
                // Demangle them here.
                currentSymbol = demangleCallback(decoder.decode(subarray));
                currentSymbolIndex = symbolIndex;
            }
            results.set(address, {
                functionOffset: address - symbolTableAddrs[symbolIndex],
                name: currentSymbol
            });
        }
        else {
            results.set(address, {
                functionOffset: address,
                name: '<before first symbol>'
            });
        }
    }
    return results;
}
exports.readSymbolsFromSymbolTable = readSymbolsFromSymbolTable;
// Partition the array into "chunks".
// Every element in the array is assigned a numeric value using the computeValue
// callback function. The chunks are chosen in such a way that the accumulated
// value in each chunk does not exceed maxValue, if possible.
// In other words, for each chunk, the following will hold:
// sum(chunk.map(computeValue)) <= maxValue or chunk.length == 1.
// The array is allowed to contain elements which are larger than the maximum
// value on their own; such elements will get a single chunk for themselves.
function _partitionIntoChunksOfMaxValue(array, maxValue, computeValue, number) {
    var chunks = [];
    var _loop_1 = function (element) {
        var elementValue = computeValue(element);
        // Find an existing chunk that still has enough "value space" left to
        // accomodate this element.
        var chunk = chunks.find(function (_a) {
            var value = _a.value;
            return value + elementValue <= maxValue;
        });
        if (chunk === undefined) {
            // If no chunk was found, create a new chunk.
            chunk = { value: 0, elements: [] };
            chunks.push(chunk);
        }
        chunk.elements.push(element);
        chunk.value += elementValue;
    };
    for (var _i = 0, array_1 = array; _i < array_1.length; _i++) {
        var element = array_1[_i];
        _loop_1(element);
    }
    return chunks.map(function (_a) {
        var elements = _a.elements;
        return elements;
    });
}
string;
/**
 * This function returns a function that can demangle function name using a
 * WebAssembly module, but falls back on the identity function if the
 * WebAssembly module isn't available for some reason.
 */
function _getDemangleCallback() {
    return __awaiter(this, void 0, void 0, function () {
        var demangleModule, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, Promise.resolve().then(function () { return require('gecko-profiler-demangle'); })];
                case 1:
                    demangleModule = _a.sent();
                    return [2 /*return*/, demangleModule.demangle_any];
                case 2:
                    error_1 = _a.sent();
                    // Module loading can fail (for example in browsers without WebAssembly
                    // support, or due to bad server configuration), so we will fall back
                    // to a pass-through function if that happens.
                    console.error('Demangling module could not be imported.', error_1);
                    return [2 /*return*/, function (mangledString) { return mangledString; }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * The SymbolStore implements efficient lookup of symbols for a set of addresses.
 * It consults multiple sources of symbol information and caches some results.
 * It only implements one public method: getSymbols.
 * @class SymbolStore
 */
var SymbolStore = /** @class */ (function () {
    function SymbolStore(dbNamePrefix, symbolProvider) {
        this._symbolProvider = symbolProvider;
        this._db = new symbol_store_db_1["default"](dbNamePrefix + "-symbol-tables");
    }
    SymbolStore.prototype.closeDb = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this._db.close()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // Store a symbol table in the database. This is only used for symbol tables
    // and not for partial symbol results. Symbol tables are generated by the
    // geckoProfiler WebExtension API, so these are symbol tables we get from the
    // add-on.
    // We do not store results from the Mozilla symbolication API, because those
    // only contain the symbols we requested and not all the symbols of a given
    // library.
    SymbolStore.prototype._storeSymbolTableInDB = function (lib, symbolTable) {
        return this._db
            .storeSymbolTable(lib.debugName, lib.breakpadId, symbolTable)["catch"](function (error) {
            console.log("Failed to store the symbol table for " + lib.debugName + " in the database:", error);
        });
    };
    return SymbolStore;
}());
exports.SymbolStore = SymbolStore;
 > ;
void ,
    errorCb;
(function (LibSymbolicationRequest, Error) { return void ; });
Promise < void  > {
    // For each library, we have three options to obtain symbol information for
    // it. We try all options in order, advancing to the next option on failure.
    // Option 1: Symbol tables cached in the database, this._db.
    // Option 2: Obtain symbols from the symbol server.
    // Option 3: Obtain symbol tables from the add-on.
    // Check requests for validity first.
    requests: requests,
    // First, try option 1 for all libraries and partition them by whether it
    // was successful.
    "const": requestsForNonCachedLibs = [],
    "const": requestsForCachedLibs = [],
    await: Promise.all(requests.map(function (request) { return __awaiter(void 0, void 0, void 0, function () {
        var _a, debugName, breakpadId, symbolTable, e_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = request.lib, debugName = _a.debugName, breakpadId = _a.breakpadId;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, this._db.getSymbolTable(debugName, breakpadId)];
                case 2:
                    symbolTable = _b.sent();
                    // Did not throw, option 1 was successful!
                    requestsForCachedLibs.push({
                        request: request,
                        symbolTable: symbolTable
                    });
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _b.sent();
                    if (!(e_1 instanceof errors_1.SymbolsNotFoundError)) {
                        // rethrow JavaScript programming error
                        throw e_1;
                    }
                    requestsForNonCachedLibs.push(request);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); })),
    // First phase of option 2:
    // Try to service requestsForNonCachedLibs using the symbolication API,
    // requesting chunks of max 10000 addresses each. In reality, this usually
    // means that all addresses for libxul get processed in one chunk, and the
    // addresses from all other libraries get processed in a second chunk.
    // The driving idea behind this is to minimize latency: If symbolication for
    // all libraries is blocked on getting symbols for libxul, latency suffers.
    // On the other hand, if we fire off a separate request for each library,
    // latency also suffers because of per-request overhead and pipelining limits.
    "const": chunks = _partitionIntoChunksOfMaxValue(requestsForNonCachedLibs, 10000, function (_a) {
        var addresses = _a.addresses;
        return addresses.size;
    }),
    // Kick off the requests to the symbolication API, and create a flattened
    // list of promises, one promise per library. Even for libraries that are
    // handled within the same request to the symbolication API, each library's
    // promise can fail independently if the symbol server does not have symbols
    // for this library.
    "const": libraryPromiseChunks = chunks.map(function (requests) {
        return _this._symbolProvider
            .requestSymbolsFromServer(requests)
            .map(function (resultsPromise, i) { return ({
            request: requests[i],
            resultsPromise: resultsPromise
        }); });
    }),
    "const": libraryPromises = [].concat.apply([], libraryPromiseChunks),
    // Finalize requests for which option 1 was successful:
    // Now that the requests to the server have been kicked off, process
    // symbolication for the libraries for which we found symbol tables in the
    // database. This is delayed until after the request has been kicked off
    // because it can take some time.
    // We also need a demangling function for this, which is in an async module.
    "const": demangleCallback = await _getDemangleCallback(),
    "for": function (, _a, of, requestsForCachedLibs) {
        var request = _a.request, symbolTable = _a.symbolTable;
        successCb(request, readSymbolsFromSymbolTable(request.addresses, symbolTable, demangleCallback));
    }
    // Process the results from the symbolication API request, as they arrive.
    // For each library that was not successfully symbolicated, fall back to
    // requesting a whole symbol table from the add-on. The add-on will attempt
    // to dump symbols from the binary.
    ,
    // Process the results from the symbolication API request, as they arrive.
    // For each library that was not successfully symbolicated, fall back to
    // requesting a whole symbol table from the add-on. The add-on will attempt
    // to dump symbols from the binary.
    await: Promise.all(libraryPromises.map(function (_a) {
        var request = _a.request, resultsPromise = _a.resultsPromise;
        return __awaiter(void 0, void 0, void 0, function () {
            var results, error1_1, lib, addresses, symbolTable, error2_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 8]);
                        return [4 /*yield*/, resultsPromise];
                    case 1:
                        results = _b.sent();
                        // Did not throw, option 2 was successful!
                        successCb(request, results);
                        return [3 /*break*/, 8];
                    case 2:
                        error1_1 = _b.sent();
                        lib = request.lib, addresses = request.addresses;
                        _b.label = 3;
                    case 3:
                        _b.trys.push([3, 6, , 7]);
                        return [4 /*yield*/, this._symbolProvider.requestSymbolTableFromAddon(lib)];
                    case 4:
                        symbolTable = _b.sent();
                        // Did not throw, option 3 was successful!
                        successCb(request, readSymbolsFromSymbolTable(addresses, symbolTable, demangleCallback));
                        // Store the symbol table in the database.
                        return [4 /*yield*/, this._storeSymbolTableInDB(lib, symbolTable)];
                    case 5:
                        // Store the symbol table in the database.
                        _b.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        error2_1 = _b.sent();
                        // None of the symbolication methods were successful.
                        // Call the error callback.
                        errorCb(request, new errors_1.SymbolsNotFoundError("Could not obtain symbols for " + lib.debugName + "/" + lib.breakpadId + ".", lib, error1_1, error2_1));
                        return [3 /*break*/, 7];
                    case 7: return [3 /*break*/, 8];
                    case 8: return [2 /*return*/];
                }
            });
        });
    }))
};
;
