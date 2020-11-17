"use strict";
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.__esModule = true;
exports.symbolicateProfile = exports.applySymbolicationStep = exports.getContainingLibrary = void 0;
var data_structures_1 = require("./data-structures");
var errors_1 = require("./errors");
IndexIntoResourceTable,
    // The set of funcs for this lib in this thread.
    allFuncsForThisLib;
Set < IndexIntoFuncTable > ,
    // All frames for this lib in this thread.
    allFramesForThisLib;
Array < IndexIntoFrameTable > ,
    // All addresses for frames for this lib in this thread, as lib-relative offsets.
    frameAddresses;
Array < Address > ,
;
;
ThreadLibSymbolicationInfo,
    resultsForLib;
Map < Address, AddressResult > ,
;
;
/**
 * Return the library object that contains the address such that
 * rv.start <= address < rv.end, or null if no such lib object exists.
 * The libs array needs to be sorted in ascending address order, and the address
 * ranges of the libraries need to be non-overlapping.
 */
function getContainingLibrary(libs, address) {
    if (isNaN(address)) {
        return null;
    }
    var left = 0;
    var right = libs.length - 1;
    while (left <= right) {
        var mid = ((left + right) / 2) | 0;
        if (address >= libs[mid].end) {
            left = mid + 1;
        }
        else if (address < libs[mid].start) {
            right = mid - 1;
        }
        else {
            return libs[mid];
        }
    }
    return null;
}
exports.getContainingLibrary = getContainingLibrary;
/**
 * Like `new Map(iterableOfEntryPairs)`: Creates a map from an iterable of
 * [key, value] pairs. The difference to new Map(...) is what happens if the
 * same key is present multiple times: makeConsensusMap will only contain an
 * entry for a key if the key has the same value in all its uses.
 * In other words, "divergent" entries are removed from the map.
 * Examples:
 *   makeConsensusMap([[1, "hello"], [2, "world"]]) -> 2 entries
 *   makeConsensusMap([[1, "hello"], [2, "world"], [1, "hello"]]) -> 2 entries
 *   makeConsensusMap([[1, "hello"], [2, "world"], [1, "bye"]]) -> 1 entry
 */
function makeConsensusMap(iterableOfEntryPairs) {
    var consensusMap = new Map();
    var divergentKeys = new Set();
    for (var _i = 0, iterableOfEntryPairs_1 = iterableOfEntryPairs; _i < iterableOfEntryPairs_1.length; _i++) {
        var _a = iterableOfEntryPairs_1[_i], key = _a[0], value = _a[1];
        if (divergentKeys.has(key)) {
            continue;
        }
        var previousValue = consensusMap.get(key);
        if (previousValue === undefined) {
            consensusMap.set(key, value);
            continue;
        }
        if (previousValue !== value) {
            consensusMap["delete"](key);
            divergentKeys.add(key);
        }
    }
    return consensusMap;
}
/**
 * Gather the symbols needed in this thread, and some auxiliary information that
 * allows the symbol substitation step at the end to work efficiently.
 * Returns a map with one entry for each library resource.
 */
function getThreadSymbolicationInfo(thread) {
    var libs = thread.libs, frameTable = thread.frameTable, funcTable = thread.funcTable, resourceTable = thread.resourceTable;
    var map = new Map();
    for (var resourceIndex = 0; resourceIndex < resourceTable.length; resourceIndex++) {
        var resourceType = resourceTable.type[resourceIndex];
        if (resourceType !== data_structures_1.resourceTypes.library) {
            continue;
        }
        var libIndex = resourceTable.lib[resourceIndex];
        if (libIndex === null || libIndex === undefined || libIndex === -1) {
            // We can get here if we have pre-symbolicated "funcName (in LibraryName)"
            // frames. Those get resourceTypes.library but no libIndex.
            continue;
        }
        var lib = libs[libIndex];
        if (lib === undefined) {
            throw new Error('Did not find a lib.');
        }
        // Collect the set of funcs for this library in this thread.
        var allFuncsForThisLib = new Set();
        for (var funcIndex = 0; funcIndex < funcTable.length; funcIndex++) {
            if (funcTable.resource[funcIndex] !== resourceIndex) {
                continue;
            }
            allFuncsForThisLib.add(funcIndex);
        }
        // Collect the sets of frames and addresses for this library.
        var allFramesForThisLib = [];
        var frameAddresses = [];
        for (var frameIndex = 0; frameIndex < frameTable.length; frameIndex++) {
            var funcIndex = frameTable.func[frameIndex];
            if (funcTable.resource[funcIndex] !== resourceIndex) {
                continue;
            }
            allFramesForThisLib.push(frameIndex);
            frameAddresses.push(frameTable.address[frameIndex]);
        }
        var libKey = lib.debugName + "/" + lib.breakpadId;
        map.set(libKey, {
            resourceIndex: resourceIndex,
            allFuncsForThisLib: allFuncsForThisLib,
            allFramesForThisLib: allFramesForThisLib,
            frameAddresses: frameAddresses
        });
    }
    return map;
}
// Go through all the threads to gather up the addresses we need to symbolicate
// for each library.
function buildLibSymbolicationRequestsForAllThreads(symbolicationInfo) {
    var libKeyToAddressesMap = new Map();
    for (var _i = 0, symbolicationInfo_1 = symbolicationInfo; _i < symbolicationInfo_1.length; _i++) {
        var threadSymbolicationInfo = symbolicationInfo_1[_i];
        for (var _a = 0, threadSymbolicationInfo_1 = threadSymbolicationInfo; _a < threadSymbolicationInfo_1.length; _a++) {
            var _b = threadSymbolicationInfo_1[_a], libKey = _b[0], frameAddresses = _b[1].frameAddresses;
            var addressSet = libKeyToAddressesMap.get(libKey);
            if (addressSet === undefined) {
                addressSet = new Set();
                libKeyToAddressesMap.set(libKey, addressSet);
            }
            for (var _c = 0, frameAddresses_1 = frameAddresses; _c < frameAddresses_1.length; _c++) {
                var frameAddress = frameAddresses_1[_c];
                addressSet.add(frameAddress);
            }
        }
    }
    return Array.from(libKeyToAddressesMap).map(function (_a) {
        var libKey = _a[0], addresses = _a[1];
        var _b = libKey.split('/'), debugName = _b[0], breakpadId = _b[1];
        var lib = { debugName: debugName, breakpadId: breakpadId };
        return { lib: lib, addresses: addresses };
    });
}
// With the symbolication results for the library given by libKey, call
// symbolicationStepCallback for each thread. Those calls will
// ensure that the symbolication information eventually makes it into the thread.
// This function leaves all the actual work to applySymbolicationStep.
function finishSymbolicationForLib(profile, symbolicationInfo, resultsForLib, libKey, symbolicationStepCallback) {
    var threads = profile.threads;
    for (var threadIndex = 0; threadIndex < threads.length; threadIndex++) {
        var threadSymbolicationInfo = symbolicationInfo[threadIndex];
        var threadLibSymbolicationInfo = threadSymbolicationInfo.get(libKey);
        if (threadLibSymbolicationInfo === undefined) {
            continue;
        }
        var symbolicationStep = { threadLibSymbolicationInfo: threadLibSymbolicationInfo, resultsForLib: resultsForLib };
        symbolicationStepCallback(threadIndex, symbolicationStep);
    }
}
/**
 * Apply symbolication to the thread, based on the information that was prepared
 * in symbolicationStepInfo. This involves updating the funcTable to contain the
 * right symbol string and funcAddress, and updating the frameTable to assign
 * frames to the right funcs. When multiple frames are merged into one func,
 * some funcs can become orphaned; they remain in the funcTable.
 * oldFuncToNewFuncMap is mutated to include the new mappings that result from
 * this symbolication step. oldFuncToNewFuncMap is allowed to contain existing
 * content; the existing entries are assumed to be for other libs, i.e. they're
 * expected to have no overlap with allFuncsForThisLib.
 */
function applySymbolicationStep(thread, symbolicationStepInfo, oldFuncToNewFuncMap) {
    var oldFrameTable = thread.frameTable, oldFuncTable = thread.funcTable, stringTable = thread.stringTable;
    var threadLibSymbolicationInfo = symbolicationStepInfo.threadLibSymbolicationInfo, resultsForLib = symbolicationStepInfo.resultsForLib;
    var resourceIndex = threadLibSymbolicationInfo.resourceIndex, allFramesForThisLib = threadLibSymbolicationInfo.allFramesForThisLib, allFuncsForThisLib = threadLibSymbolicationInfo.allFuncsForThisLib;
    var availableFuncs = new Set(allFuncsForThisLib);
    var frameToFuncAddressMap = new Map();
    var funcAddressToSymbolNameMap = new Map();
    var funcAddressToCanonicalFuncIndexMap = new Map();
    // We want to group frames into funcs, and give each func a name.
    // We group frames to the same func if the addresses for these frames resolve
    // to the same funcAddress.
    // We obtain the funcAddress from the symbolication information in resultsForLib:
    // resultsForLib does not only contain the name of the function; it also contains,
    // for each address, the functionOffset:
    // functionOffset = frameAddress - funcAddress.
    // So we can do the inverse calculation: funcAddress = frameAddress - functionOffset.
    // All frames with the same funcAddress are grouped into the same function.
    for (var _i = 0, allFramesForThisLib_1 = allFramesForThisLib; _i < allFramesForThisLib_1.length; _i++) {
        var frameIndex = allFramesForThisLib_1[_i];
        var oldFrameFunc = oldFrameTable.func[frameIndex];
        var address = oldFrameTable.address[frameIndex];
        var addressResult = resultsForLib.get(address);
        if (addressResult === undefined) {
            var oldSymbol = stringTable.getString(oldFuncTable.name[oldFrameFunc]);
            addressResult = {
                functionOffset: oldFrameTable.address[frameIndex] -
                    oldFuncTable.address[oldFrameFunc],
                name: oldSymbol
            };
        }
        // |address| is the original frame address that we found during
        // stackwalking, as a library-relative offset.
        // |addressResult.functionOffset| is the offset between the start of
        // the function and |address|.
        // |funcAddress| is the start of the function, as a library-relative
        // offset.
        var funcAddress = address - addressResult.functionOffset;
        frameToFuncAddressMap.set(frameIndex, funcAddress);
        funcAddressToSymbolNameMap.set(funcAddress, addressResult.name);
        // Opportunistically match up funcAddress with oldFrameFunc.
        if (!funcAddressToCanonicalFuncIndexMap.has(funcAddress)) {
            if (availableFuncs.has(oldFrameFunc)) {
                // Use the frame's old func as the canonical func for this funcAddress.
                // This case is hit for all frames if this is the initial symbolication,
                // because in the initial symbolication scenario, each frame has a
                // distinct func which is available to be designated as a canonical func.
                var newFrameFunc = oldFrameFunc;
                availableFuncs["delete"](newFrameFunc);
                funcAddressToCanonicalFuncIndexMap.set(funcAddress, newFrameFunc);
            }
            else {
                // oldFrameFunc has already been used as the canonical func for a
                // different funcAddress. This can happen during re-symbolication.
                // For now, funcAddressToCanonicalFuncIndexMap will not contain an
                // entry for this funcAddress.
                // But that state will be resolved eventually:
                // Either in the course of the rest of this loop (when another frame
                // will donate its oldFrameFunc), or further down in this function.
            }
        }
    }
    // We now have the funcAddress for every frame, in frameToFuncAddressMap.
    // We have also assigned a subset of funcAddresses to canonical funcs.
    // These funcs have been removed from availableFuncs; availableFuncs
    // contains the subset of existing funcs in the thread that do not have a
    // funcAddress yet.
    // If this is the initial symbolication, all funcAddresses will have funcs,
    // because each frame had a distinct oldFrameFunc which was available to
    // be designated as a canonical func.
    // If this is a re-symbolication, then some funcAddresses may not have
    // a canonical func yet, because oldFrameFunc might already have become
    // the canonical func for a different funcAddress.
    // Build oldFuncToFuncAddressMap.
    // If (oldFunc, funcAddress) is in oldFuncToFuncAddressMap, this means
    // that all frames that used to belong to oldFunc have been resolved to
    // the same funcAddress.
    var oldFuncToFuncAddressEntries = [];
    for (var _a = 0, frameToFuncAddressMap_1 = frameToFuncAddressMap; _a < frameToFuncAddressMap_1.length; _a++) {
        var _b = frameToFuncAddressMap_1[_a], frameIndex = _b[0], funcAddress = _b[1];
        var oldFrameFunc = oldFrameTable.func[frameIndex];
        oldFuncToFuncAddressEntries.push([oldFrameFunc, funcAddress]);
    }
    var oldFuncToFuncAddressMap = makeConsensusMap(oldFuncToFuncAddressEntries);
    // We need to do the following:
    //  - Find a canonical func for every funcAddress
    //  - give funcs the new symbols and the funcAddress as their address
    //  - assign frames to new funcs
    // Find a canonical funcIndex for any funcAddress that doesn't have one yet,
    // and give the canonical func the right address and symbol.
    var availableFuncIterator = availableFuncs.values();
    var funcTable = data_structures_1.shallowCloneFuncTable(oldFuncTable);
    for (var _c = 0, funcAddressToSymbolNameMap_1 = funcAddressToSymbolNameMap; _c < funcAddressToSymbolNameMap_1.length; _c++) {
        var _d = funcAddressToSymbolNameMap_1[_c], funcAddress = _d[0], funcSymbolName = _d[1];
        var symbolStringIndex = stringTable.indexForString(funcSymbolName);
        var funcIndex = funcAddressToCanonicalFuncIndexMap.get(funcAddress);
        if (funcIndex === undefined) {
            // Repurpose a func from availableFuncs as the canonical func for this
            // funcAddress.
            funcIndex = availableFuncIterator.next().value;
            if (funcIndex === undefined) {
                // We ran out of funcs. Add a new func with the right properties.
                funcIndex = funcTable.length;
                funcTable.isJS[funcIndex] = false;
                funcTable.relevantForJS[funcIndex] = false;
                funcTable.resource[funcIndex] = resourceIndex;
                funcTable.fileName[funcIndex] = null;
                funcTable.lineNumber[funcIndex] = null;
                funcTable.columnNumber[funcIndex] = null;
                funcTable.length++;
            }
            funcAddressToCanonicalFuncIndexMap.set(funcAddress, funcIndex);
        }
        // Update the func properties.
        funcTable.address[funcIndex] = funcAddress;
        funcTable.name[funcIndex] = symbolStringIndex;
    }
    // Now we have a canonical func for every funcAddress, so we have enough
    // information to build the oldFuncToNewFuncMap.
    // If (oldFunc, newFunc) is in oldFuncToNewFuncMap, this means that all
    // frames that used to belong to oldFunc or newFunc have been resolved to
    // the same funcAddress, and that newFunc has been chosen as the canonical
    // func for that funcAddress.
    for (var _e = 0, oldFuncToFuncAddressMap_1 = oldFuncToFuncAddressMap; _e < oldFuncToFuncAddressMap_1.length; _e++) {
        var _f = oldFuncToFuncAddressMap_1[_e], oldFunc = _f[0], funcAddress = _f[1];
        var newFunc = funcAddressToCanonicalFuncIndexMap.get(funcAddress);
        if (newFunc === undefined) {
            throw new Error('Impossible, all funcAddresses have a canonical func index at this point.');
        }
        if (oldFuncToFuncAddressMap.get(newFunc) === funcAddress) {
            oldFuncToNewFuncMap.set(oldFunc, newFunc);
        }
    }
    // Make a new frameTable with the updated frame -> func assignments.
    var newFrameTableFuncColumn = oldFrameTable.func.slice();
    for (var _g = 0, frameToFuncAddressMap_2 = frameToFuncAddressMap; _g < frameToFuncAddressMap_2.length; _g++) {
        var _h = frameToFuncAddressMap_2[_g], frameIndex = _h[0], funcAddress = _h[1];
        var funcIndex = funcAddressToCanonicalFuncIndexMap.get(funcAddress);
        if (funcIndex === undefined) {
            throw new Error('Impossible, all funcAddresses have a canonical func index at this point.');
        }
        newFrameTableFuncColumn[frameIndex] = funcIndex;
    }
    var frameTable = __assign(__assign({}, oldFrameTable), { func: newFrameTableFuncColumn });
    return __assign(__assign({}, thread), { frameTable: frameTable, funcTable: funcTable, stringTable: stringTable });
}
exports.applySymbolicationStep = applySymbolicationStep;
/**
 * Symbolicates the profile. Symbols are obtained from the symbolStore.
 * This function performs steps II-IV (see the comment at the beginning of
 * this file); step V is outsourced to symbolicationStepCallback
 * which can call applySymbolicationStep to complete step V.
 */
function symbolicateProfile(profile, symbolStore, symbolicationStepCallback) {
    return __awaiter(this, void 0, void 0, function () {
        var symbolicationInfo, libSymbolicationRequests;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    symbolicationInfo = profile.threads.map(getThreadSymbolicationInfo);
                    libSymbolicationRequests = buildLibSymbolicationRequestsForAllThreads(symbolicationInfo);
                    return [4 /*yield*/, symbolStore.getSymbols(libSymbolicationRequests, function (request, results) {
                            var _a = request.lib, debugName = _a.debugName, breakpadId = _a.breakpadId;
                            var libKey = debugName + "/" + breakpadId;
                            finishSymbolicationForLib(profile, symbolicationInfo, results, libKey, symbolicationStepCallback);
                        }, function (request, error) {
                            if (!(error instanceof errors_1.SymbolsNotFoundError)) {
                                // rethrow JavaScript programming error
                                throw error;
                            }
                            // We could not find symbols for this library.
                            console.warn(error);
                        })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.symbolicateProfile = symbolicateProfile;
